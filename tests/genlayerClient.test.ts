// tests/genlayerClient.test.ts

beforeEach(() => {
  jest.resetModules();
  delete process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS;

  // Provide a base mock for the ESM-only `genlayer-js` package so Jest's CJS runtime
  // doesn't try to load its ESM sources from node_modules. Individual tests may
  // override this mock with more specific behavior.
  jest.doMock('genlayer-js', () => ({
    createClient: () => ({
      readContract: jest.fn(),
      writeContract: jest.fn(),
      waitForTransactionReceipt: jest.fn(),
    }),
    createAccount: jest.fn(),
  }), { virtual: true });

  // Mock the `genlayer-js/chains` ESM entry which Jest can't parse from node_modules
  jest.doMock('genlayer-js/chains', () => ({
    studionet: {},
  }), { virtual: true });
});

describe('genlayerClient.submitFinalScore & waitForTransactionConfirmation', () => {
  test('mock mode returns immediate confirmed result', async () => {
    process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS = 'mock';

    const { submitFinalScore } = await import('../utils/genlayerClient');

    const res = await submitFinalScore('0xabc', 'Alice', 80, 5, 5);

    expect(res).toBeDefined();
    expect(res?.confirmed).toBe(true);
    expect(typeof res?.hash).toBe('string');
    expect(res?.hash).toMatch(/^0x/);
  });

  test('contract mode returns hash immediately and confirms via waiter', async () => {
    process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS = 'contract';

    const fakeReceipt = { hash: '0xdeadbeef', status: 'FINALIZED' };
    const writeContract = jest.fn().mockResolvedValue('0xdeadbeef');
    const waitForTransactionReceipt = jest.fn().mockResolvedValue(fakeReceipt);

    jest.mock('genlayer-js', () => ({
      createClient: () => ({
        writeContract,
        waitForTransactionReceipt,
      }),
      createAccount: jest.fn(),
      studionet: {},
    }));

    const { submitFinalScore, waitForTransactionConfirmation, checkTransactionStatus } = await import('../utils/genlayerClient');

    const res = await submitFinalScore('0xabc', 'Bob', 100, 5, 5);

    expect(res).toBeDefined();
    expect(res?.confirmed).toBe(false);
    expect(res?.hash).toBe('0xdeadbeef');

    const receipt = await waitForTransactionConfirmation('0xdeadbeef');
    expect(receipt).toEqual(fakeReceipt);

    // checkTransactionStatus (single check) should also return the receipt
    const single = await checkTransactionStatus('0xdeadbeef');
    expect(single).toEqual(fakeReceipt);

    // Now test waitForConfirmation=true for submitFinalScore
    const res2 = await submitFinalScore('0xabc', 'Bob', 100, 5, 5, true);
    expect(res2?.confirmed).toBe(true);
    expect(res2?.hash).toBe('0xdeadbeef');

    // Ensure the underlying mocked functions were called
    expect(writeContract).toHaveBeenCalled();
    expect(waitForTransactionReceipt).toHaveBeenCalled();
  });

  test('waitForTransactionConfirmation rejects when waiter fails', async () => {
    process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS = 'contract';

    const writeContract = jest.fn().mockResolvedValue('0xdeadbeef');
    const waitForTransactionReceipt = jest.fn().mockRejectedValue(new Error('timeout'));

    jest.mock('genlayer-js', () => ({
      createClient: () => ({
        writeContract,
        waitForTransactionReceipt,
      }),
      createAccount: jest.fn(),
      studionet: {},
    }));

    const { submitFinalScore, waitForTransactionConfirmation } = await import('../utils/genlayerClient');

    const res = await submitFinalScore('0xabc', 'Eve', 20, 1, 5);
    expect(res?.hash).toBe('0xdeadbeef');

    await expect(waitForTransactionConfirmation('0xdeadbeef')).rejects.toThrow('timeout');
  });
});
