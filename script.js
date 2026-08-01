/**
 * The Short Demonlist - Dynamic Application Logic (JSON Powered)
 */

// Global State Variables to hold loaded JSON data
let levelsData = [];
let playersData = [];
let selectedLevelId = null;

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  loadListData(); // Fetch JSON files first
});

/**
 * Fetch levels.json and players.json from the server
 */
async function loadListData() {
  try {
    // Fetch both JSON files concurrently
    const [levelsResponse, playersResponse] = await Promise.all([
      fetch('levels.json'),
      fetch('players.json')
    ]);

    // Parse JSON data
    levelsData = await levelsResponse.json();
    playersData = await playersResponse.json();

    // Set initial selected level to the #1 ranked level
    if (levelsData.length > 0) {
      // Sort to guarantee #1 is selected first
      const sorted = [...levelsData].sort((a, b) => a.rank - b.rank);
      selectedLevelId = sorted[0].id;
    }

    // Render components once data is ready
    renderLevelSidebar();
    renderLevelDetails(selectedLevelId);
    renderLeaderboard();

  } catch (error) {
    console.error("Error loading JSON list data:", error);
    const detailsPanel = document.getElementById("level-details-panel");
    if (detailsPanel) {
      detailsPanel.innerHTML = `<div class="placeholder-msg" style="color: var(--primary-red);">Failed to load list data. Make sure levels.json and players.json exist!</div>`;
    }
  }
}

/* --- 1. Tiered Point Calculation Formula --- */
function calculatePoints(rank) {
  if (!rank || rank < 1) return 0;

  if (rank === 1) return 500;

  if (rank >= 2 && rank <= 5) {
    return 450 - ((50 / 3) * (rank - 2));
  }

  if (rank >= 6 && rank <= 10) {
    return 390 - (28.75 * (rank - 6));
  }

  if (rank >= 11 && rank <= 30) {
    return 250 - ((100 / 19) * (rank - 11));
  }

  return 0;
}

/* --- 2. Single Page Navigation Mechanics --- */
function initNavigation() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      tabButtons.forEach(btn => btn.classList.remove("active"));
      tabContents.forEach(content => content.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
    });
  });
}

/* --- 3. Main List Rendering --- */
function renderLevelSidebar() {
  const sidebarContainer = document.getElementById("level-list-sidebar");
  sidebarContainer.innerHTML = "";

  const sortedLevels = [...levelsData].sort((a, b) => a.rank - b.rank);

  sortedLevels.forEach(level => {
    const card = document.createElement("div");
    card.className = `level-card ${level.id === selectedLevelId ? "active" : ""}`;
    card.innerHTML = `<span class="rank">#${level.rank}</span> <span class="name">${level.name}</span>`;
    
    card.addEventListener("click", () => {
      selectedLevelId = level.id;
      document.querySelectorAll(".level-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      renderLevelDetails(level.id);
    });

    sidebarContainer.appendChild(card);
  });
}

function renderLevelDetails(levelId) {
  const detailsPanel = document.getElementById("level-details-panel");
  const level = levelsData.find(l => l.id === levelId);

  if (!level) {
    detailsPanel.innerHTML = `<div class="placeholder-msg">Select a level to view details</div>`;
    return;
  }

  const verifiedRecords = playersData.filter(player => 
    player.completions.some(c => c.level_id === level.id)
  );

  let recordsHTML = "";
  if (verifiedRecords.length > 0) {
    recordsHTML = verifiedRecords.map(player => {
      const record = player.completions.find(c => c.level_id === level.id);
      return `
        <li>
          <span>${player.name}</span>
          <a href="${record.video_link}" target="_blank" rel="noopener noreferrer">100% Proof</a>
        </li>
      `;
    }).join("");
  } else {
    recordsHTML = `<li><span style="color: var(--text-muted)">No verified completions yet.</span></li>`;
  }

  detailsPanel.innerHTML = `
    <div class="level-header">
      <h2>#${level.rank} - ${level.name}</h2>
      <div class="level-meta">
        Created by <strong>${level.creator}</strong> | Verified by <strong>${level.verifier}</strong>
      </div>
    </div>
    
    <p><strong>Enjoyment Rating:</strong> ${level.enjoyment}</p>
    <p><strong>In-game ID:</strong> ${level.level_id}</p>
    <p><strong>Point Value:</strong> ${calculatePoints(level.rank).toFixed(1)} pts</p>

    <div class="video-wrapper">
      <iframe src="${level.video}" title="${level.name} Verification" frameborder="0" allowfullscreen></iframe>
    </div>

    <div class="records-section">
      <h3>Records Verified (${verifiedRecords.length})</h3>
      <ul class="records-list">
        ${recordsHTML}
      </ul>
    </div>
  `;
}

/* --- 4. Leaderboard Logic & Sorting --- */
function renderLeaderboard() {
  const tbody = document.getElementById("leaderboard-body");
  tbody.innerHTML = "";

  const leaderboardData = playersData.map(player => {
    let totalPoints = 0;

    player.completions.forEach(completion => {
      const level = levelsData.find(l => l.id === completion.level_id);
      if (level) {
        totalPoints += calculatePoints(level.rank);
      }
    });

    return {
      name: player.name,
      completionsCount: player.completions.length,
      totalPoints: totalPoints
    };
  });

  leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

  leaderboardData.forEach((player, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="font-weight: 700; color: var(--primary-red);">#${index + 1}</td>
      <td style="font-weight: 600;">${player.name}</td>
      <td>${player.completionsCount}</td>
      <td style="font-weight: 700;">${player.totalPoints.toFixed(1)}</td>
    `;
    tbody.appendChild(row);
  });
}