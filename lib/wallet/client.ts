// Wallet helper stubs — wallet support removed.
export function isMetaMaskInstalled(): boolean {
  return false;
}

export function getEthereumProvider() {
  return null;
}

export async function requestAccounts(): Promise<string[]> {
  throw new Error('Wallet support removed');
}

export async function getAccounts(): Promise<string[]> {
  return [];
}

export async function getCurrentChainId(): Promise<string | null> {
  return null;
}

export async function switchAccount(): Promise<string> {
  throw new Error('Wallet support removed');
}

export function addProviderListeners() {
  return () => {};
}
