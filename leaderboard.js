const storageKey = "trustOrDoubtResults";
const elements = {
  xp: document.getElementById("final-xp"),
  accuracy: document.getElementById("final-accuracy"),
  trusts: document.getElementById("final-trusts"),
  doubts: document.getElementById("final-doubts"),
  appeals: document.getElementById("final-appeals"),
  note: document.getElementById("leaderboard-note"),
};

function renderFallback() {
  elements.xp.textContent = "?";
  elements.accuracy.textContent = "?";
  elements.trusts.textContent = "?";
  elements.doubts.textContent = "?";
  elements.appeals.textContent = "?";
  elements.note.textContent = "No stored results yet. Play the game to populate this leaderboard.";
}

function renderResults(data) {
  elements.xp.textContent = data.xp ?? 0;
  elements.accuracy.textContent = ${data.accuracy ?? 0}%;
  elements.trusts.textContent = data.correctTrusts ?? 0;
  elements.doubts.textContent = data.correctDoubts ?? 0;
  elements.appeals.textContent = data.appealsWon ?? 0;
  elements.note.textContent = "Last session results are shown. Play again to update them.";
}

function refresh() {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) {
    renderFallback();
    return;
  }
  try {
    const data = JSON.parse(raw);
    renderResults(data);
  } catch (error) {
    console.error("Failed to parse stored leaderboard:", error);
    renderFallback();
  }
}

document.getElementById("clear-results").addEventListener("click", () => {
  sessionStorage.removeItem(storageKey);
  refresh();
});

refresh();
