export type ScenarioClaim = {
  id: string;
  text: string;
  category: string;
  verdict: 'trust' | 'doubt';
  detail: string;
};

const subjects = [
  'GenLayer protocol guardians',
  'Intelligent contracts',
  'Hybrid oracle nodes',
  'Optimistic democracy lanes',
  'Autonomous governance bots',
  'Proof readers',
  'Decentralized juries',
  'AI-assisted reviewers',
  'Zero-knowledge aggregators',
  'Cross-chain inspectors',
  'GenLayer doc analysts',
  'Consensus whisperers'
];

const verbs = [
  'accelerate',
  'debate',
  'validate',
  'audit',
  'escalate',
  'contextualize',
  'safeguard',
  'flag',
  'attenuate',
  'chronicle',
  'benchmark',
  'illuminate'
];

const objects = [
  'dispute narratives',
  'MEV bundle payouts',
  'liquidity ragged edges',
  'NFT provenance layers',
  'zk-rollup fallbacks',
  'EthCC badge drops',
  'cross-chain bridge proofing',
  'memecoin authenticity scans',
  'prediction market angle locks',
  'intelligent contract firmware',
  'real-time doc proofing',
  'Optimistic Democracy voting trails',
  'DAO treasury sweeps',
  'crypto compliance pulses'
];

const categories = ['GenLayer', 'Web3', 'Crypto', 'Governance', 'Security', 'Infrastructure', 'Predictions', 'Culture', 'Ethics', 'Research'];

function deterministicPick<T>(list: T[], index: number, offset: number) {
  return list[(index * offset) % list.length];
}

function buildDetail(subject: string, verb: string, object: string, category: string) {
  const cleanSubject = subject.toLowerCase();
  return `The ${cleanSubject} ${verb}s ${object} to keep ${category.toLowerCase()} flows coherent.`;
}

export const scenarioClaims: ScenarioClaim[] = Array.from({ length: 1000 }, (_, idx) => {
  const subject = deterministicPick(subjects, idx, 3);
  const verb = deterministicPick(verbs, idx, 5);
  const object = deterministicPick(objects, idx, 7);
  const category = deterministicPick(categories, idx, 11);
  const text = `${subject} ${verb} ${object}.`;
  const detail = buildDetail(subject, verb, object, category);
  const verdict = idx % 2 === 0 ? 'trust' : 'doubt';

  return {
    id: `claim-${idx + 1}`,
    text,
    category,
    verdict,
    detail
  };
});

function gcd(a: number, b: number) {
  while (b) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function hashSeed(seed: string) {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000_007;
  }
  return Math.abs(hash);
}

export function buildScenarioQueue(count: number, seed: string) {
  const sanitizedSeed = seed || 'neutral';
  const hash = hashSeed(sanitizedSeed);
  const len = scenarioClaims.length;
  const desired = Math.min(count, len);
  const start = hash % len;
  let step = (hash % (len - 1)) + 1;
  while (gcd(step, len) !== 1) {
    step = (step % (len - 1)) + 1;
  }

  const queue: ScenarioClaim[] = [];
  let index = start;
  for (let i = 0; i < desired; i += 1) {
    queue.push(scenarioClaims[index]);
    index = (index + step) % len;
  }
  return queue;
}

export const TOTAL_SCENARIOS = scenarioClaims.length;

export const getDailyScenario = (): ScenarioClaim => {
  const index = new Date().getUTCDate() % scenarioClaims.length;
  return scenarioClaims[index];
};
