const claims = [
  {
    text: "GenLayer’s Optimistic Democracy layer is live on mainnet and resolving disputes 24/7.",
    category: "GenLayer",
    verdict: "trust",
    detail: "Audit logs and validator monitors show the GenLayer layer actively publishes dispute results on-chain.",
  },
  {
    text: "An NFT drop that mints only to wallets with EthCC 2024 badges can still be replicated with a voucher system.",
    category: "Web3",
    verdict: "trust",
    detail: "Operator-authenticated voucher minting bypasses drop restrictions, so badge-only claims can be spoofed.",
  },
  {
    text: "Liquidity mining on a new GenLayer-backed AMM will net 12% APY with zero impermanent loss.",
    category: "Finance",
    verdict: "doubt",
    detail: "Market exposure still carries impermanent loss risk; the GenLayer-design merely caps downside but can’t eliminate it.",
  },
  {
    text: "A GenLayer community vote just added a new validator set without any appeal needed.",
    category: "Governance",
    verdict: "trust",
    detail: "The Optimistic Democracy mechanic resolved within the fast lane, and the appeal quorum wasn’t triggered.",
  },
  {
    text: "Layer-2 rollups with on-demand zk proofs will replace every GenLayer consensus vote.",
    category: "Predictions",
    verdict: "doubt",
    detail: "GenLayer’s hybrid proof-of-stake/hybrid agents still provide value even with zk rollups by enabling dispute narratives.",
  },
  {
    text: "A web3 art challenge claiming a portrait ‘contains explicit GenLayer secrets’ is likely fabricated.",
    category: "Culture",
    verdict: "doubt",
    detail: "Inspecting the IPFS upload shows no steganographic payloads that would embed GenLayer secrets.",
  },
  {
    text: "A new memecoin minted on a GenLayer-integrated chain can mint unlimited supply without validators flagging it.",
    category: "Crypto",
    verdict: "doubt",
    detail: "GenLayer’s validators enforce supply rules, so an unlimited mint would trigger optimistic disputes and likely be halted.",
  },
  {
    text: "The latest decentralized exchange on GenLayer uses miner extractable value (MEV) bundles to fund Optimistic Democracy rewards.",
    category: "DeFi",
    verdict: "trust",
    detail: "MEV revenue sharing is already documented in the exchange’s GenLayer lean protocol whitepaper.",
  },
  {
    text: "Airdrops announced exclusively via on-chain governance proposals are the most reliable way to earn tokens.",
    category: "Web3 Trends",
    verdict: "doubt",
    detail: "While governance proposals add legitimacy, many airdrops still rely on off-chain signals or snapshot-based criteria.",
  },
  {
    text: "Cross-chain bridges with GenLayer-certified proofs no longer need manual monitoring.",
    category: "Infrastructure",
    verdict: "trust",
    detail: "GenLayer-certified proofs auto-validate bridge state transitions and alert validators whenever anomalies appear.",
  },
];

const TOTAL_ROUNDS = 5;
const STORAGE_KEY = "trustOrDoubtResults";

const elements = {
  xp: document.getElementById("xp"),
  accuracy: document.getElementById("accuracy"),
  trusts: document.getElementById("trusts"),
  doubts: document.getElementById("doubts"),
  claimText: document.getElementById("claim-text"),
  claimCategory: document.getElementById("claim-category"),
  claimDetail: document.getElementById("claim-detail"),
  roundLabel: document.getElementById("round"),
  totalRounds: document.getElementById("total-rounds"),
  appealLevel: document.getElementById("appeal-level"),
  appealBtn: document.getElementById("appeal-btn"),
  trustBtn: document.getElementById("trust-btn"),
  doubtBtn: document.getElementById("doubt-btn"),
  validatorStatus: document.getElementById("validator-status"),
  verdictTitle: document.getElementById("verdict-title"),
  verdictDetail: document.getElementById("verdict-detail"),
  nextBtn: document.getElementById("next-btn"),
  viewLeaderboardBtn: document.getElementById("view-leaderboard-btn"),
};

const state = {
  round: 0,
  xp: 0,
  correct: 0,
  correctTrusts: 0,
  correctDoubts: 0,
  appealsWon: 0,
  claimsQueue: [],
  currentClaim: null,
  playerChoice: null,
  appealActive: false,
};

function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function updateScoreboard() {
  elements.xp.textContent = state.xp;
  const played = Math.min(state.round, TOTAL_ROUNDS);
  const accuracy = played ? Math.round((state.correct / played) * 100) : 0;
  elements.accuracy.textContent = `${accuracy}%`;
  elements.trusts.textContent = state.correctTrusts;
  elements.doubts.textContent = state.correctDoubts;
}

function updateRoundDisplay() {
  elements.roundLabel.textContent = `Round ${Math.min(state.round + 1, TOTAL_ROUNDS)}`;
  elements.totalRounds.textContent = `/ ${TOTAL_ROUNDS}`;
}

function setChoiceButtons(disabled) {
  elements.trustBtn.disabled = disabled;
  elements.doubtBtn.disabled = disabled;
}

function setAppealMeter(level) {
  const width = Math.min(Math.max(level, 0), 100);
  elements.appealLevel.style.width = `${width}%`;
}

function loadRound() {
  if (state.round >= TOTAL_ROUNDS) {
    endGame();
    return;
  }
  state.currentClaim = state.claimsQueue[state.round];
  elements.claimCategory.textContent = state.currentClaim.category;
  elements.claimText.textContent = state.currentClaim.text;
  elements.claimDetail.textContent = "";
  elements.validatorStatus.textContent = "Validators: waiting for consensus...";
  elements.verdictTitle.textContent = "Awaiting verdict...";
  elements.verdictDetail.textContent = "";
  elements.nextBtn.disabled = true;
  elements.viewLeaderboardBtn.disabled = true;
  setChoiceButtons(false);
  setAppealMeter(0);
  elements.appealBtn.disabled = true;
  elements.viewLeaderboardBtn.textContent = "View Final Leaderboard";
  state.playerChoice = null;
  state.appealActive = false;
  updateRoundDisplay();
}

function startGame() {
  state.round = 0;
  state.xp = 0;
  state.correct = 0;
  state.correctTrusts = 0;
  state.correctDoubts = 0;
  state.appealsWon = 0;
  state.claimsQueue = shuffle(claims).slice(0, TOTAL_ROUNDS);
  loadRound();
  updateScoreboard();
}

function handleChoice(choice) {
  if (state.playerChoice) return;
  state.playerChoice = choice;
  setChoiceButtons(true);
  elements.validatorStatus.textContent = "Validators: 5 AI nodes reviewing the claim...";
  const consensus = state.currentClaim.verdict;
  const correct = choice === consensus;
  state.round += 1;
  if (correct) {
    state.xp += 10;
    state.correct += 1;
    if (choice === "trust") state.correctTrusts += 1;
    else state.correctDoubts += 1;
  }
  const meterLevel = correct ? 32 : 72;
  setAppealMeter(meterLevel);
  setVerdict(
    consensus,
    correct
      ? "Validators converged quickly?your intuition matched the AI consensus."
      : "The validators pushed a different answer, but you can trigger an appeal.",
    correct
  );
  if (!correct) {
    elements.appealBtn.disabled = false;
    elements.appealBtn.textContent = "Appeal (request more validators)";
  }
  updateScoreboard();
}

function setVerdict(verdict, detail, correct) {
  elements.verdictTitle.textContent = verdict === "trust" ? "Trust confirmed" : "Doubt confirmed";
  elements.verdictDetail.textContent = detail;
  elements.nextBtn.disabled = false;
  elements.nextBtn.textContent = state.round >= TOTAL_ROUNDS ? "Show Final Results" : "Next Round";
}

function resolveAppeal() {
  if (state.appealActive || state.playerChoice === null) return;
  state.appealActive = true;
  elements.appealBtn.textContent = "Appeal in progress...";
  elements.appealBtn.disabled = true;
  elements.validatorStatus.textContent = "Validators: 50+ nodes debating the appeal...";
  const successChance = 0.3 + Math.min(elements.appealLevel.offsetWidth / 300, 0.3);
  setTimeout(() => {
    const overturned = Math.random() < successChance;
    if (overturned) {
      state.xp += 5;
      state.appealsWon += 1;
      state.correct += 1;
      if (state.playerChoice === "trust") state.correctTrusts += 1;
      else state.correctDoubts += 1;
      elements.verdictTitle.textContent = "Appeal succeeded";
      elements.verdictDetail.textContent = "More validators converged on your position; consensus shifted.";
      elements.validatorStatus.textContent = "Validators: additional consensus reached.";
      setAppealMeter(100);
    } else {
      elements.verdictTitle.textContent = "Appeal denied";
      elements.verdictDetail.textContent = "Additional validators confirmed the original consensus.";
      elements.validatorStatus.textContent = "Validators: appeal round complete.";
    }
    updateScoreboard();
    elements.nextBtn.disabled = false;
  }, 900);
}

function endGame() {
  const accuracy = state.round > 0 ? Math.round((state.correct / state.round) * 100) : 0;
  const payload = {
    xp: state.xp,
    accuracy,
    correctTrusts: state.correctTrusts,
    correctDoubts: state.correctDoubts,
    appealsWon: state.appealsWon,
    roundsPlayed: state.round,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  elements.verdictDetail.textContent = "Game over ? view the leaderboard to compare XP and appeal wins.";
  elements.validatorStatus.textContent = "Validators: game complete.";
  elements.nextBtn.disabled = true;
  elements.viewLeaderboardBtn.disabled = false;
  elements.viewLeaderboardBtn.textContent = "View Final Leaderboard";
  setChoiceButtons(true);
  updateScoreboard();
}

function loadNextRound() {
  if (state.round >= TOTAL_ROUNDS) {
    endGame();
    return;
  }
  loadRound();
}

elements.nextBtn.addEventListener("click", loadNextRound);
elements.trustBtn.addEventListener("click", () => handleChoice("trust"));
elements.doubtBtn.addEventListener("click", () => handleChoice("doubt"));
elements.appealBtn.addEventListener("click", resolveAppeal);
elements.viewLeaderboardBtn.addEventListener("click", () => {
  window.location.href = "leaderboard.html";
});

document.addEventListener("DOMContentLoaded", startGame);
