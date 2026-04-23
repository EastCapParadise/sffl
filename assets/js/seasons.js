// ============================================================
// SFFL - Seasons Page JavaScript
// ============================================================

let currentSeason = null;
let allData = null;

document.addEventListener('DOMContentLoaded', async () => {
  allData = await loadData();
  if (!allData) return;

  buildSeasonDropdown(allData);
  setLastUpdated(allData);

  // Default to most recent season
  const seasons = Object.keys(allData.seasons).map(Number).sort((a, b) => b - a);
  currentSeason = seasons[0];
  document.getElementById('season-select').value = currentSeason;
  loadSeason(currentSeason);

  // Season change handler
  document.getElementById('season-select').addEventListener('change', (e) => {
    currentSeason = parseInt(e.target.value);
    loadSeason(currentSeason);
  });
});

// ============================================================
// BUILD SEASON DROPDOWN
// ============================================================

function buildSeasonDropdown(data) {
  const select = document.getElementById('season-select');
  const seasons = Object.keys(data.seasons).map(Number).sort((a, b) => b - a);

  select.innerHTML = seasons.map(s => `
    <option value="${s}">${s} Season</option>
  `).join('');
}

// ============================================================
// LOAD SEASON
// ============================================================

function loadSeason(season) {
  const data = allData.seasons[season];
  if (!data) return;

  buildChampionCallout(data);
  buildSeasonStandings(data);
  buildPlayoffResults(data);
  buildWeekDropdown(data);
  loadWeek(data, data.weeks[0]?.week || 1);
}

// ============================================================
// CHAMPION CALLOUT
// ============================================================

function buildChampionCallout(data) {
  const el = document.getElementById('season-champion');
  if (!el) return;

  const champ = data.standings.find(s => s.champion);
  if (!champ) {
    el.innerHTML = `<div class="season-champion-label">Season In Progress</div>`;
    return;
  }

  const ppg = (champ.points_for / (champ.wins + champ.losses + champ.ties)).toFixed(1);

  el.innerHTML = `
    <div class="season-champion-trophy">🏆</div>
    <div class="season-champion-label">${data.season} Champion</div>
    <div class="season-champion-name">${champ.owner}</div>
    <div class="season-champion-record">${champ.wins}-${champ.losses}${champ.ties > 0 ? `-${champ.ties}` : ''}</div>
    <div class="season-champion-pts">${champ.points_for.toLocaleString()} pts &nbsp;|&nbsp; ${ppg} PPG</div>
  `;
}

// ============================================================
// SEASON STANDINGS
// ============================================================

function buildSeasonStandings(data) {
  const tbody = document.getElementById('season-standings-body');
  if (!tbody) return;

  const standings = [...data.standings].sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    return b.wins - a.wins;
  });

  tbody.innerHTML = standings.map(s => {
    const total = s.wins + s.losses + s.ties;
    const ppg = total > 0 ? (s.points_for / total).toFixed(1) : '0.0';
    const playoffBadge = s.champion
      ? `<span class="badge badge-gold">🏆 Champ</span>`
      : s.playoff
        ? `<span class="badge" style="background:rgba(201,168,76,0.15);color:var(--secondary);border:1px solid var(--secondary)">Playoffs</span>`
        : '—';

    return `
      <tr>
        <td><strong>${s.rank || '—'}</strong></td>
        <td>${s.owner}</td>
        <td>${s.wins}</td>
        <td>${s.losses}</td>
        <td>${s.ties}</td>
        <td>${s.points_for.toLocaleString()}</td>
        <td>${s.points_against.toLocaleString()}</td>
        <td>${ppg}</td>
        <td>${playoffBadge}</td>
      </tr>
    `;
  }).join('');

  makeSortable(tbody.closest('table'));
}

// ============================================================
// PLAYOFF RESULTS
// ============================================================

function buildPlayoffResults(data) {
  const el = document.getElementById('playoff-results');
  if (!el) return;

  if (!data.playoffs || data.playoffs.length === 0) {
    el.innerHTML = `<p style="color: var(--text-muted)">No playoff data available for this season.</p>`;
    return;
  }

  // Group by round
  const rounds = {};
  data.playoffs.forEach(game => {
    if (!rounds[game.round]) rounds[game.round] = [];
    rounds[game.round].push(game);
  });

  // Round order
  const roundOrder = ['Quarters', 'Semis', 'Championship'];

  el.innerHTML = roundOrder
    .filter(r => rounds[r])
    .map(round => {
      const games = rounds[round];

      // Pair up games (each matchup has 2 entries)
      const matchups = [];
      const seen = new Set();
      games.forEach(game => {
        const key = [game.manager, game.opponent].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          const opponent = games.find(g => g.manager === game.opponent && g.opponent === game.manager);
          if (opponent) {
            matchups.push([game, opponent]);
          }
        }
      });

      return `
        <div class="playoff-round">
          <div class="playoff-round-title">${round}</div>
          <div class="playoff-matchups">
            ${matchups.map(([team1, team2]) => {
              const t1wins = team1.outcome === 'W';
              const t2wins = team2.outcome === 'W';
              return `
                <div class="playoff-matchup">
                  <div class="playoff-team ${t1wins ? 'winner' : ''}">
                    <span class="playoff-team-name">${team1.manager} ${t1wins ? '✓' : ''}</span>
                    <span class="playoff-team-score">${team1.points.toFixed(1)}</span>
                  </div>
                  <div class="playoff-team ${t2wins ? 'winner' : ''}">
                    <span class="playoff-team-name">${team2.manager} ${t2wins ? '✓' : ''}</span>
                    <span class="playoff-team-score">${team2.points.toFixed(1)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
}

// ============================================================
// WEEK DROPDOWN
// ============================================================

function buildWeekDropdown(data) {
  const select = document.getElementById('week-select');
  if (!select) return;

  select.innerHTML = data.weeks.map(w => `
    <option value="${w.week}">Week ${w.week}</option>
  `).join('');

  select.removeEventListener('change', weekChangeHandler);
  select.addEventListener('change', weekChangeHandler);
}

function weekChangeHandler(e) {
  const week = parseInt(e.target.value);
  const data = allData.seasons[currentSeason];
  loadWeek(data, week);
}

// ============================================================
// WEEK MATCHUPS
// ============================================================

function loadWeek(seasonData, weekNum) {
  const el = document.getElementById('week-matchups');
  if (!el) return;

  const weekData = seasonData.weeks.find(w => w.week === weekNum);
  if (!weekData) return;

  // Calculate records going INTO this week
  const records = calculateRecordsBeforeWeek(seasonData, weekNum);

  el.innerHTML = weekData.matchups.map(m => {
    const r1 = records[m.team1] || { wins: 0, losses: 0, ties: 0 };
    const r2 = records[m.team2] || { wins: 0, losses: 0, ties: 0 };
    const team1wins = m.score1 > m.score2;
    const team2wins = m.score2 > m.score1;

    return `
      <div class="matchup-card">
        <div class="matchup-team ${team1wins ? 'winner' : ''}">
          <div class="matchup-team-info">
            <span class="matchup-team-name">${m.team1}</span>
            <span class="matchup-team-record">${r1.wins}-${r1.losses}${r1.ties > 0 ? `-${r1.ties}` : ''}</span>
          </div>
          <span class="matchup-score">${m.score1.toFixed(1)}</span>
        </div>
        <div class="matchup-team ${team2wins ? 'winner' : ''}">
          <div class="matchup-team-info">
            <span class="matchup-team-name">${m.team2}</span>
            <span class="matchup-team-record">${r2.wins}-${r2.losses}${r2.ties > 0 ? `-${r2.ties}` : ''}</span>
          </div>
          <span class="matchup-score">${m.score2.toFixed(1)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// CALCULATE RECORDS BEFORE A GIVEN WEEK
// ============================================================

function calculateRecordsBeforeWeek(seasonData, weekNum) {
  const records = {};

  seasonData.weeks
    .filter(w => w.week < weekNum)
    .forEach(w => {
      w.matchups.forEach(m => {
        if (!records[m.team1]) records[m.team1] = { wins: 0, losses: 0, ties: 0 };
        if (!records[m.team2]) records[m.team2] = { wins: 0, losses: 0, ties: 0 };

        if (m.score1 > m.score2) {
          records[m.team1].wins++;
          records[m.team2].losses++;
        } else if (m.score2 > m.score1) {
          records[m.team2].wins++;
          records[m.team1].losses++;
        } else {
          records[m.team1].ties++;
          records[m.team2].ties++;
        }
      });
    });

  return records;
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