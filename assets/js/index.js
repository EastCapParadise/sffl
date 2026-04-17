// ============================================================
// SFFL - Homepage JavaScript
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadData();
  if (!data) return;

  buildStandingsTable(data);
  buildChampionshipGrid(data);
  buildRecordsStrip(data);
  setLastUpdated(data);
});

// ============================================================
// ALL TIME STANDINGS TABLE
// ============================================================

function buildStandingsTable(data) {
  const tbody = document.getElementById('standings-body');
  if (!tbody) return;

  // Sort owners by win percentage descending
  const owners = Object.values(data.owners).sort((a, b) => {
    return b.career.win_pct - a.career.win_pct;
  });

  tbody.innerHTML = owners.map((owner, index) => {
    const c = owner.career;
    const isActive = owner.active;
    const champBadge = c.championships > 0
      ? `<span class="badge badge-gold">🏆 ${c.championships}</span>`
      : '—';
    const activeBadge = isActive
      ? `<span class="badge badge-active">Active</span>`
      : `<span style="color: var(--text-muted); font-size: 0.8rem;">Alumni</span>`;

    return `
      <tr>
        <td>
          <strong>${owner.name}</strong>
          <br/>${activeBadge}
        </td>
        <td>${c.wins}</td>
        <td>${c.losses}</td>
        <td>${c.ties}</td>
        <td>${(c.win_pct * 100).toFixed(1)}%</td>
        <td>${c.points_for.toLocaleString()}</td>
        <td>${c.points_against.toLocaleString()}</td>
        <td>${c.points_per_game.toFixed(1)}</td>
        <td>${champBadge}</td>
        <td>${c.playoff_appearances}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// CHAMPIONSHIP HISTORY GRID
// ============================================================

function buildChampionshipGrid(data) {
  const grid = document.getElementById('championship-grid');
  if (!grid) return;

  // Find champion for each season
  const championships = [];
  Object.values(data.seasons).forEach(season => {
    const champ = season.standings.find(s => s.champion);
    if (champ) {
      championships.push({
        season: season.season,
        owner: champ.owner,
        wins: champ.wins,
        losses: champ.losses
      });
    }
  });

  // Sort newest first
  championships.sort((a, b) => b.season - a.season);

  grid.innerHTML = championships.map(c => `
    <div class="championship-card">
      <div class="championship-trophy">🏆</div>
      <div class="championship-year">${c.season}</div>
      <div class="championship-winner">${c.owner}</div>
      <div class="championship-record">${c.wins}-${c.losses}</div>
    </div>
  `).join('');
}

// ============================================================
// ALL TIME RECORDS STRIP
// ============================================================

function buildRecordsStrip(data) {
  const strip = document.getElementById('records-strip');
  if (!strip) return;

  const records = data.records;

  const highScore = records.highest_scores[0];
  const lowScore = records.lowest_scores[0];
  const blowout = records.biggest_blowouts[0];

  // Count total seasons and games
  const totalSeasons = Object.keys(data.seasons).length;
  const totalGames = Object.values(data.owners)
    .reduce((sum, o) => sum + o.career.wins + o.career.losses + o.career.ties, 0) / 2;

  // Most championships
  const mostChamps = Object.values(data.owners)
    .sort((a, b) => b.career.championships - a.career.championships)[0];

  strip.innerHTML = `
    <div class="record-card">
      <div class="record-label">Highest Single Game Score</div>
      <div class="record-value">${highScore.Points.toFixed(1)}</div>
      <div class="record-detail">${highScore.Manager} vs ${highScore.Opponent} — Week ${highScore.Week}, ${highScore.Season}</div>
    </div>
    <div class="record-card">
      <div class="record-label">Lowest Single Game Score</div>
      <div class="record-value">${lowScore.Points.toFixed(1)}</div>
      <div class="record-detail">${lowScore.Manager} vs ${lowScore.Opponent} — Week ${lowScore.Week}, ${lowScore.Season}</div>
    </div>
    <div class="record-card">
      <div class="record-label">Biggest Blowout (Margin)</div>
      <div class="record-value">+${blowout.Diff.toFixed(1)}</div>
      <div class="record-detail">${blowout.Manager} vs ${blowout.Opponent} — Week ${blowout.Week}, ${blowout.Season}</div>
    </div>
    <div class="record-card">
      <div class="record-label">Most Championships</div>
      <div class="record-value">${mostChamps.career.championships}</div>
      <div class="record-detail">${mostChamps.name}</div>
    </div>
    <div class="record-card">
      <div class="record-label">Total Seasons</div>
      <div class="record-value">${totalSeasons}</div>
      <div class="record-detail">Est. 2013</div>
    </div>
    <div class="record-card">
      <div class="record-label">Total Games Played</div>
      <div class="record-value">${Math.round(totalGames).toLocaleString()}</div>
      <div class="record-detail">Regular season only</div>
    </div>
  `;
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