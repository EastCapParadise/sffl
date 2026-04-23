// ============================================================
// SFFL - Head to Head Page JavaScript
// ============================================================

let allData = null;
let currentMatchups = [];
let currentOwner1 = '';
let currentOwner2 = '';

document.addEventListener('DOMContentLoaded', async () => {
  allData = await loadData();
  if (!allData) return;

  buildOwnerDropdowns(allData);
  setLastUpdated(allData);

  document.getElementById('owner1-select').addEventListener('change', checkAndLoad);
  document.getElementById('owner2-select').addEventListener('change', checkAndLoad);
  document.getElementById('season-filter').addEventListener('change', () => {
    if (!currentOwner1 || !currentOwner2) return;
    const val = document.getElementById('season-filter').value;
    const filtered = val
      ? currentMatchups.filter(m => String(m.season) === val)
      : currentMatchups;
    buildMatchupHistory(currentOwner1, currentOwner2, filtered);
  });
});

// ============================================================
// BUILD DROPDOWNS
// ============================================================

function buildOwnerDropdowns(data) {
  const owners = Object.keys(data.owners).sort();
  const options = owners.map(o => `<option value="${o}">${o}</option>`).join('');

  document.getElementById('owner1-select').innerHTML =
    `<option value="">Select Owner</option>` + options;
  document.getElementById('owner2-select').innerHTML =
    `<option value="">Select Owner</option>` + options;
}

// ============================================================
// CHECK AND LOAD
// ============================================================

function checkAndLoad() {
  const owner1 = document.getElementById('owner1-select').value;
  const owner2 = document.getElementById('owner2-select').value;

  // Reset season filter when either owner changes
  document.getElementById('season-filter').value = '';

  if (!owner1 || !owner2 || owner1 === owner2) {
    document.getElementById('h2h-prompt').style.display = 'block';
    document.getElementById('h2h-results').style.display = 'none';
    document.getElementById('season-filter-row').style.display = 'none';
    return;
  }

  document.getElementById('h2h-prompt').style.display = 'none';
  document.getElementById('h2h-results').style.display = 'block';
  loadRivalry(owner1, owner2);
}

// ============================================================
// LOAD RIVALRY
// ============================================================

function loadRivalry(owner1, owner2) {
  currentOwner1 = owner1;
  currentOwner2 = owner2;
  const matchups = getMatchupHistory(owner1, owner2);
  currentMatchups = matchups;
  buildRivalryCard(owner1, owner2, matchups);
  populateSeasonFilter(matchups);
  buildMatchupHistory(owner1, owner2, matchups);
}

function populateSeasonFilter(matchups) {
  const sel = document.getElementById('season-filter');
  const row = document.getElementById('season-filter-row');
  const seasons = [...new Set(matchups.map(m => m.season))].sort((a, b) => b - a);
  sel.innerHTML = `<option value="">All Seasons</option>` +
    seasons.map(s => `<option value="${s}">${s}</option>`).join('');
  row.style.display = matchups.length > 0 ? '' : 'none';
}

// ============================================================
// GET MATCHUP HISTORY
// ============================================================

function getMatchupHistory(owner1, owner2) {
  const matchups = [];

  // Regular season
  Object.values(allData.seasons).forEach(season => {
    season.weeks.forEach(week => {
      week.matchups.forEach(m => {
        const involves1 = m.team1 === owner1 || m.team2 === owner1;
        const involves2 = m.team1 === owner2 || m.team2 === owner2;
        if (involves1 && involves2) {
          const o1score = m.team1 === owner1 ? m.score1 : m.score2;
          const o2score = m.team1 === owner2 ? m.score1 : m.score2;
          matchups.push({
            season: season.season,
            week: `Week ${week.week}`,
            type: 'regular',
            owner1score: o1score,
            owner2score: o2score,
            winner: o1score > o2score ? owner1 : o1score < o2score ? owner2 : 'Tie',
            margin: Math.abs(o1score - o2score).toFixed(1)
          });
        }
      });
    });

    // Playoffs
    if (season.playoffs && season.playoffs.length > 0) {
      const seen = new Set();
      season.playoffs.forEach(game => {
        if (game.manager === owner1 && game.opponent === owner2) {
          const key = `${season.season}-${game.round}`;
          if (!seen.has(key)) {
            seen.add(key);
            const o2game = season.playoffs.find(
              g => g.manager === owner2 && g.opponent === owner1 && g.round === game.round
            );
            if (o2game) {
              const o1score = game.points;
              const o2score = o2game.points;
              matchups.push({
                season: season.season,
                week: game.round,
                type: 'playoff',
                owner1score: o1score,
                owner2score: o2score,
                winner: o1score > o2score ? owner1 : o1score < o2score ? owner2 : 'Tie',
                margin: Math.abs(o1score - o2score).toFixed(1)
              });
            }
          }
        }
      });
    }
  });

  return matchups.sort((a, b) => b.season - a.season);
}

// ============================================================
// BUILD RIVALRY CARD
// ============================================================

function buildRivalryCard(owner1, owner2, matchups) {
  const el = document.getElementById('rivalry-card');

  const regular = matchups.filter(m => m.type === 'regular');
  const playoffs = matchups.filter(m => m.type === 'playoff');

  const rsW1 = regular.filter(m => m.winner === owner1).length;
  const rsW2 = regular.filter(m => m.winner === owner2).length;
  const poW1 = playoffs.filter(m => m.winner === owner1).length;
  const poW2 = playoffs.filter(m => m.winner === owner2).length;
  const totW1 = rsW1 + poW1;
  const totW2 = rsW2 + poW2;

  const o1scores = matchups.map(m => m.owner1score);
  const o2scores = matchups.map(m => m.owner2score);
  const avg1 = matchups.length > 0
    ? (o1scores.reduce((a, b) => a + b, 0) / matchups.length).toFixed(1)
    : '—';
  const avg2 = matchups.length > 0
    ? (o2scores.reduce((a, b) => a + b, 0) / matchups.length).toFixed(1)
    : '—';

  // Biggest wins
  const o1wins = matchups.filter(m => m.winner === owner1);
  const o2wins = matchups.filter(m => m.winner === owner2);
  const biggestO1 = o1wins.length > 0
    ? o1wins.reduce((a, b) => parseFloat(a.margin) > parseFloat(b.margin) ? a : b)
    : null;
  const biggestO2 = o2wins.length > 0
    ? o2wins.reduce((a, b) => parseFloat(a.margin) > parseFloat(b.margin) ? a : b)
    : null;

  const recordLabel = (w1, w2, name1, name2) => {
    if (w1 === 0 && w2 === 0) return 'No matchups';
    if (w1 === w2) return 'All time tied';
    return `${w1 > w2 ? name1 : name2} leads`;
  };

  el.innerHTML = `
    <div class="rivalry-owners">
      <div class="rivalry-owner">
        <div class="rivalry-owner-initial">${owner1.charAt(0)}</div>
        <div class="rivalry-owner-name">${owner1}</div>
        <div class="rivalry-owner-avg">Avg: ${avg1} pts</div>
      </div>
      <div class="rivalry-divider">VS</div>
      <div class="rivalry-owner">
        <div class="rivalry-owner-initial">${owner2.charAt(0)}</div>
        <div class="rivalry-owner-name">${owner2}</div>
        <div class="rivalry-owner-avg">Avg: ${avg2} pts</div>
      </div>
    </div>

    <div class="rivalry-records">
      <div class="rivalry-record-row">
        <div class="rivalry-record-type">Regular Season</div>
        <div class="rivalry-record-score">${rsW1} – ${rsW2}</div>
        <div class="rivalry-record-leader">${recordLabel(rsW1, rsW2, owner1, owner2)}</div>
      </div>
      <div class="rivalry-record-row">
        <div class="rivalry-record-type">Playoffs</div>
        <div class="rivalry-record-score">${poW1} – ${poW2}</div>
        <div class="rivalry-record-leader">${recordLabel(poW1, poW2, owner1, owner2)}</div>
      </div>
      <div class="rivalry-record-row">
        <div class="rivalry-record-type">Total</div>
        <div class="rivalry-record-score">${totW1} – ${totW2}</div>
        <div class="rivalry-record-leader">${recordLabel(totW1, totW2, owner1, owner2)}</div>
      </div>
    </div>

    <div class="rivalry-best">
      <div class="rivalry-best-card">
        <div class="rivalry-best-label">${owner1}'s Biggest Win</div>
        ${biggestO1
          ? `<div class="rivalry-best-value">+${biggestO1.margin}</div>
             <div class="rivalry-best-detail">${biggestO1.season} ${biggestO1.week}</div>`
          : `<div class="rivalry-best-value">—</div>`
        }
      </div>
      <div class="rivalry-best-card">
        <div class="rivalry-best-label">${owner2}'s Biggest Win</div>
        ${biggestO2
          ? `<div class="rivalry-best-value">+${biggestO2.margin}</div>
             <div class="rivalry-best-detail">${biggestO2.season} ${biggestO2.week}</div>`
          : `<div class="rivalry-best-value">—</div>`
        }
      </div>
    </div>
  `;
}

// ============================================================
// BUILD MATCHUP HISTORY TABLE
// ============================================================

function buildMatchupHistory(owner1, owner2, matchups) {
  const tbody = document.getElementById('h2h-history-body');

  if (matchups.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">
          No matchups found between these two owners
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = matchups.map(m => {
    const isTie = m.winner === 'Tie';
    const winner = isTie ? '—' : m.winner;
    const loser = isTie ? '—' : (m.winner === owner1 ? owner2 : owner1);
    const winScore = isTie ? m.owner1score : (m.winner === owner1 ? m.owner1score : m.owner2score);
    const loseScore = isTie ? m.owner2score : (m.winner === owner1 ? m.owner2score : m.owner1score);
    const typeBadge = m.type === 'playoff'
      ? `<span class="type-badge type-playoff">Playoff</span>`
      : `<span class="type-badge type-regular">Regular</span>`;

    return `
      <tr>
        <td>${m.season}</td>
        <td>${m.week}</td>
        <td>${typeBadge}</td>
        <td><strong style="color:${isTie ? 'var(--text-muted)' : 'var(--secondary)'}">${isTie ? 'Tie' : winner}</strong></td>
        <td>${winScore.toFixed(1)}</td>
        <td>${loser}</td>
        <td>${loseScore.toFixed(1)}</td>
        <td>+${m.margin}</td>
      </tr>
    `;
  }).join('');

  makeSortable(tbody.closest('table'));
}

// ============================================================
// LAST UPDATED
// ============================================================

function setLastUpdated(data) {
  const el = document.getElementById('last-updated');
  if (el && data.meta && data.meta.last_updated) {
    el.textContent = data.meta.last_updated;
  }
}