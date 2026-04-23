// ============================================================
// SFFL - Playoffs Page JavaScript
// ============================================================

let allData = null;

document.addEventListener('DOMContentLoaded', async () => {
  allData = await loadData();
  if (!allData) return;

  buildChampionshipHistory(allData);
  buildPlayoffRecordsTable(allData);
  buildBracketDropdown(allData);
  buildFBLeaderboard(allData);
  buildFBSeasonDropdown(allData);
  setLastUpdated(allData);

  document.getElementById('bracket-season-select').addEventListener('change', (e) => {
    loadBracket(parseInt(e.target.value));
  });

  document.getElementById('fb-season-select').addEventListener('change', (e) => {
    loadFBSeason(parseInt(e.target.value));
  });
});

// ============================================================
// CHAMPIONSHIP HISTORY
// ============================================================

function buildChampionshipHistory(data) {
  const grid = document.getElementById('champ-history-grid');

  const championships = [];
  Object.values(data.seasons).forEach(season => {
    const champ = season.standings.find(s => s.champion);
    if (champ) {
      championships.push({
        season: season.season,
        owner: champ.owner,
        wins: champ.wins,
        losses: champ.losses,
        ties: champ.ties
      });
    }
  });

  championships.sort((a, b) => b.season - a.season);

  grid.innerHTML = championships.map(c => `
    <div class="championship-card">
      <div class="championship-trophy">🏆</div>
      <div class="championship-year">${c.season}</div>
      <div class="championship-winner">${c.owner}</div>
      <div class="championship-record">
        ${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''}
      </div>
    </div>
  `).join('');
}

// ============================================================
// ALL TIME PLAYOFF RECORDS TABLE
// ============================================================

function buildPlayoffRecordsTable(data) {
  const tbody = document.getElementById('playoff-records-body');

  const owners = Object.values(data.owners).sort((a, b) => {
    if (b.career.championships !== a.career.championships)
      return b.career.championships - a.career.championships;
    return b.career.playoff_appearances - a.career.playoff_appearances;
  });

  tbody.innerHTML = owners.map(owner => {
    const c = owner.career;
    const total = c.playoff_wins + c.playoff_losses;
    const winPct = total > 0
      ? ((c.playoff_wins / total) * 100).toFixed(1) + '%'
      : '—';
    const champBadge = c.championships > 0
      ? `<span class="badge badge-gold">🏆 ${c.championships}</span>`
      : '—';
    const divBadge = c.division_titles > 0
      ? `<span class="badge" style="background:rgba(201,168,76,0.15);color:var(--secondary);border:1px solid var(--secondary)">${c.division_titles}</span>`
      : '—';

    return `
      <tr>
        <td><strong>${owner.name}</strong></td>
        <td>${c.playoff_appearances}</td>
        <td>${c.playoff_wins}</td>
        <td>${c.playoff_losses}</td>
        <td>${winPct}</td>
        <td>${champBadge}</td>
        <td>${divBadge}</td>
      </tr>
    `;
  }).join('');

  makeSortable(tbody.closest('table'));
}

// ============================================================
// BRACKET DROPDOWN
// ============================================================

function buildBracketDropdown(data) {
  const select = document.getElementById('bracket-season-select');
  const seasons = Object.keys(data.seasons).map(Number).sort((a, b) => b - a);

  select.innerHTML = seasons.map(s =>
    `<option value="${s}">${s} Season</option>`
  ).join('');

  loadBracket(seasons[0]);
}

// ============================================================
// LOAD BRACKET
// ============================================================

function loadBracket(season) {
  const el = document.getElementById('bracket-results');
  const data = allData.seasons[season];

  if (!data || !data.playoffs || data.playoffs.length === 0) {
    el.innerHTML = `
      <p style="color:var(--text-muted)">
        No playoff data available for ${season}.
      </p>
    `;
    return;
  }

  const rounds = {};
  data.playoffs.forEach(game => {
    if (!rounds[game.round]) rounds[game.round] = [];
    rounds[game.round].push(game);
  });

  const roundOrder = ['Quarters', 'Semis', 'Championship'];

  el.innerHTML = roundOrder
    .filter(r => rounds[r])
    .map(round => {
      const games = rounds[round];
      const matchups = [];
      const seen = new Set();

      games.forEach(game => {
        const key = [game.manager, game.opponent].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          const opponent = games.find(
            g => g.manager === game.opponent && g.opponent === game.manager
          );
          if (opponent) matchups.push([game, opponent]);
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
                    <span class="playoff-team-name">
                      ${team1.manager} ${t1wins ? '✓' : ''}
                    </span>
                    <span class="playoff-team-score">
                      ${team1.points.toFixed(1)}
                    </span>
                  </div>
                  <div class="playoff-team ${t2wins ? 'winner' : ''}">
                    <span class="playoff-team-name">
                      ${team2.manager} ${t2wins ? '✓' : ''}
                    </span>
                    <span class="playoff-team-score">
                      ${team2.points.toFixed(1)}
                    </span>
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
// FOUNDING BROTHERS LEADERBOARD
// ============================================================

function buildFBLeaderboard(data) {
  const el = document.getElementById('fb-leaderboard');
  if (!data.founding_brothers) {
    el.innerHTML = '<p style="color:var(--text-muted)">Founding Brothers data unavailable.</p>';
    return;
  }
  const founders = ['David', 'Russell', 'Watty', 'BR'];

  // Count wins per founder
  const wins = {};
  founders.forEach(f => wins[f] = 0);

  Object.values(data.founding_brothers).forEach(season => {
    season.winner.forEach(w => {
      if (wins[w] !== undefined) wins[w]++;
    });
  });

  const maxWins = Math.max(...Object.values(wins));

  const sorted = founders.sort((a, b) => wins[b] - wins[a]);

  el.innerHTML = sorted.map(f => `
    <div class="fb-leader-card ${wins[f] === maxWins ? 'top' : ''}">
      <div class="fb-leader-initial">${f.charAt(0)}</div>
      <div class="fb-leader-name">${f}</div>
      <div class="fb-leader-wins">${wins[f]}</div>
      <div class="fb-leader-label">Cup Win${wins[f] !== 1 ? 's' : ''}</div>
      ${wins[f] === maxWins ? '<div style="margin-top:8px"><span class="badge badge-gold">👑 Leader</span></div>' : ''}
    </div>
  `).join('');
}

// ============================================================
// FOUNDING BROTHERS SEASON DROPDOWN
// ============================================================

function buildFBSeasonDropdown(data) {
  const select = document.getElementById('fb-season-select');
  if (!data.founding_brothers) return;
  const seasons = Object.keys(data.founding_brothers).map(Number).sort((a, b) => b - a);

  select.innerHTML = seasons.map(s =>
    `<option value="${s}">${s} Season</option>`
  ).join('');

  loadFBSeason(seasons[0]);
}

// ============================================================
// LOAD FOUNDING BROTHERS SEASON
// ============================================================

function loadFBSeason(season) {
  const el = document.getElementById('fb-season-results');
  const fb = allData.founding_brothers[season];
  if (!fb) return;

  const winners = fb.winner.join(' & ');
  const standings = [...fb.standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.points - a.points;
  });

  el.innerHTML = `
    <div class="fb-season-card">
      <div class="fb-season-winner">
        <span class="fb-season-winner-label">🏆 ${season} Winner</span>
        <span class="fb-season-winner-name">${winners}</span>
      </div>
      <div class="fb-season-standings">
        <table class="data-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Wins vs Founders</th>
              <th>Points vs Founders</th>
              <th>Playoff Wins vs Founders</th>
            </tr>
          </thead>
          <tbody>
            ${standings.map((s, i) => `
              <tr>
                <td>
                  <strong style="color:${i === 0 ? 'var(--secondary)' : 'var(--text)'}">
                    ${s.owner} ${i === 0 ? '🏆' : ''}
                  </strong>
                </td>
                <td>${s.wins}</td>
                <td>${s.points.toLocaleString()}</td>
                <td>${s.playoff_wins}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const fbTable = el.querySelector('table.data-table');
  if (fbTable) makeSortable(fbTable);
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