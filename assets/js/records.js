// ============================================================
// SFFL - Records Page JavaScript
// ============================================================

let allData = null;

document.addEventListener('DOMContentLoaded', async () => {
  allData = await loadData();
  if (!allData) return;

  buildRecordCallouts(allData);
  buildScoringRecords(allData);
  buildBlowouts(allData);
  buildWoodsheds(allData);
  buildSeasonRecords(allData);
  buildStreaks(allData);
  buildMilestones(allData);
  buildDivisionalRecords(allData);
  setLastUpdated(allData);
});

// ============================================================
// RECORD CALLOUTS
// ============================================================

function buildRecordCallouts(data) {
  const el = document.getElementById('record-callouts');
  if (!el) return;

  const highScore = data.records.highest_scores[0];
  const lowScore = data.records.lowest_scores[0];
  const blowout = data.records.biggest_blowouts[0];
  const bigWoodshed = data.woodsheds.top10[0];
  const winStreak = data.streaks.top_win_streaks[0];
  const lossStreak = data.streaks.top_loss_streaks[0];

  // Best single-season record
  const seasonRecords = [];
  Object.values(data.owners).forEach(owner => {
    owner.seasons.forEach(s => {
      const total = s.wins + s.losses + s.ties;
      if (total > 0) seasonRecords.push({ owner: owner.name, season: s.season, wins: s.wins, losses: s.losses, winPct: s.wins / total });
    });
  });
  const bestSeason = [...seasonRecords].sort((a, b) => b.winPct - a.winPct)[0];
  const highSeason = Object.values(data.owners)
    .flatMap(o => o.seasons.map(s => ({ owner: o.name, season: s.season, points: s.points_for })))
    .sort((a, b) => b.points - a.points)[0];

  // Most woodsheds given
  const topGiver = Object.entries(data.woodsheds.by_owner)
    .sort((a, b) => b[1].given - a[1].given)[0];

  const callouts = [
    {
      icon: '📈',
      label: 'Highest Single Game Score',
      value: highScore.Points.toFixed(1),
      detail: `${highScore.Manager}`,
      sub: `vs ${highScore.Opponent} — Wk ${highScore.Week}, ${highScore.Season}`,
      color: 'var(--secondary)'
    },
    {
      icon: '📉',
      label: 'Lowest Single Game Score',
      value: lowScore.Points.toFixed(1),
      detail: `${lowScore.Manager}`,
      sub: `vs ${lowScore.Opponent} — Wk ${lowScore.Week}, ${lowScore.Season}`,
      color: 'var(--danger)'
    },
    {
      icon: '💥',
      label: 'Biggest Blowout',
      value: `+${blowout.Diff.toFixed(1)}`,
      detail: `${blowout.Manager}`,
      sub: `vs ${blowout.Opponent} — Wk ${blowout.Week}, ${blowout.Season}`,
      color: 'var(--secondary)'
    },
    {
      icon: '🪵',
      label: 'Biggest Woodshed',
      value: `+${bigWoodshed.margin.toFixed(1)}`,
      detail: `${bigWoodshed.manager}`,
      sub: `vs ${bigWoodshed.opponent} — Wk ${bigWoodshed.week}, ${bigWoodshed.season}`,
      color: 'var(--secondary)'
    },
    {
      icon: '🪵',
      label: 'Most Woodsheds Given',
      value: topGiver[1].given,
      detail: topGiver[0],
      sub: `${topGiver[1].received} received`,
      color: 'var(--secondary)'
    },
    {
      icon: '🔥',
      label: 'Longest Win Streak',
      value: `${winStreak.length} wins`,
      detail: winStreak.owner,
      sub: `${winStreak.start_season} Wk ${winStreak.start_week} – ${winStreak.end_season} Wk ${winStreak.end_week}`,
      color: 'var(--success)'
    },
    {
      icon: '💀',
      label: 'Longest Loss Streak',
      value: `${lossStreak.length} losses`,
      detail: lossStreak.owner,
      sub: `${lossStreak.start_season} Wk ${lossStreak.start_week} – ${lossStreak.end_season} Wk ${lossStreak.end_week}`,
      color: 'var(--danger)'
    },
    {
      icon: '🏅',
      label: 'Best Single Season',
      value: `${bestSeason.wins}-${bestSeason.losses}`,
      detail: bestSeason.owner,
      sub: `${bestSeason.season} Season — ${(bestSeason.winPct * 100).toFixed(1)}% win rate`,
      color: 'var(--secondary)'
    },
    {
      icon: '💰',
      label: 'Highest Scoring Season',
      value: highSeason.points.toLocaleString(),
      detail: highSeason.owner,
      sub: `${highSeason.season} Season`,
      color: 'var(--secondary)'
    }
  ];

  el.innerHTML = callouts.map(c => `
    <div class="record-callout-card">
      <div class="rcc-icon">${c.icon}</div>
      <div class="rcc-label">${c.label}</div>
      <div class="rcc-value" style="color:${c.color}">${c.value}</div>
      <div class="rcc-detail">${c.detail}</div>
      <div class="rcc-sub">${c.sub}</div>
    </div>
  `).join('');
}

// ============================================================
// SCORING RECORDS
// ============================================================

function buildScoringRecords(data) {
  const highest = document.getElementById('highest-scores-body');
  const lowest = document.getElementById('lowest-scores-body');

  highest.innerHTML = data.records.highest_scores.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.Manager}</strong></td>
      <td style="color:var(--secondary);font-family:'Oswald',sans-serif;font-size:1.1rem">
        ${r.Points.toFixed(1)}
      </td>
      <td>${r.Opponent}</td>
      <td>${r.Season}</td>
      <td>${r.Week}</td>
    </tr>
  `).join('');
  makeSortable(highest.closest('table'));

  lowest.innerHTML = data.records.lowest_scores.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.Manager}</strong></td>
      <td style="color:var(--danger);font-family:'Oswald',sans-serif;font-size:1.1rem">
        ${r.Points.toFixed(1)}
      </td>
      <td>${r.Opponent}</td>
      <td>${r.Season}</td>
      <td>${r.Week}</td>
    </tr>
  `).join('');
  makeSortable(lowest.closest('table'));
}

// ============================================================
// BIGGEST BLOWOUTS
// ============================================================

function buildBlowouts(data) {
  const tbody = document.getElementById('blowouts-body');

  tbody.innerHTML = data.records.biggest_blowouts.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong style="color:var(--secondary)">${r.Manager}</strong></td>
      <td>${r.Points.toFixed(1)}</td>
      <td>${r.Opponent}</td>
      <td>${(r.Points - r.Diff).toFixed(1)}</td>
      <td style="color:var(--secondary);font-family:'Oswald',sans-serif">
        +${r.Diff.toFixed(1)}
      </td>
      <td>${r.Season}</td>
      <td>${r.Week}</td>
    </tr>
  `).join('');
  makeSortable(tbody.closest('table'));
}

// ============================================================
// WOODSHEDS
// ============================================================

function buildWoodsheds(data) {
  const top10 = document.getElementById('woodsheds-top10-body');
  const givenBody = document.getElementById('woodsheds-given-body');
  const receivedBody = document.getElementById('woodsheds-received-body');

  // Top 10
  top10.innerHTML = data.woodsheds.top10.map((r, i) => {
    const typeBadge = r.type === 'playoff'
      ? `<span class="type-badge type-playoff">Playoff</span>`
      : `<span class="type-badge type-regular">Regular</span>`;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong style="color:var(--secondary)">${r.manager}</strong></td>
        <td>${r.points.toFixed(1)}</td>
        <td>${r.opponent}</td>
        <td>${r.opp_score.toFixed(1)}</td>
        <td style="color:var(--secondary);font-family:'Oswald',sans-serif">
          +${r.margin.toFixed(1)}
        </td>
        <td>${r.season}</td>
        <td>${r.week}</td>
        <td>${typeBadge}</td>
      </tr>
    `;
  }).join('');
  makeSortable(top10.closest('table'));

  // By owner - given
  const byOwner = data.woodsheds.by_owner;
  const sortedGiven = Object.entries(byOwner)
    .sort((a, b) => b[1].given - a[1].given);
  const sortedReceived = Object.entries(byOwner)
    .sort((a, b) => b[1].received - a[1].received);

  givenBody.innerHTML = sortedGiven.map(([owner, stats]) => `
    <tr>
      <td><strong>${owner}</strong></td>
      <td style="color:var(--secondary);font-family:'Oswald',sans-serif;font-size:1.1rem">
        ${stats.given}
      </td>
      <td style="color:var(--text-muted)">${stats.received}</td>
    </tr>
  `).join('');
  makeSortable(givenBody.closest('table'));

  receivedBody.innerHTML = sortedReceived.map(([owner, stats]) => `
    <tr>
      <td><strong>${owner}</strong></td>
      <td style="color:var(--danger);font-family:'Oswald',sans-serif;font-size:1.1rem">
        ${stats.received}
      </td>
      <td style="color:var(--text-muted)">${stats.given}</td>
    </tr>
  `).join('');
  makeSortable(receivedBody.closest('table'));
}

// ============================================================
// SEASON RECORDS
// ============================================================

function buildSeasonRecords(data) {
  const bestBody = document.getElementById('best-records-body');
  const worstBody = document.getElementById('worst-records-body');
  const highBody = document.getElementById('highest-season-body');
  const lowBody = document.getElementById('lowest-season-body');

  // Build season records from owner data
  const seasonRecords = [];
  Object.values(data.owners).forEach(owner => {
    owner.seasons.forEach(s => {
      const total = s.wins + s.losses + s.ties;
      const winPct = total > 0 ? s.wins / total : 0;
      const ppg = total > 0 ? s.points_for / total : 0;
      seasonRecords.push({
        owner: owner.name,
        season: s.season,
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        points: s.points_for,
        winPct,
        ppg
      });
    });
  });

  const best = [...seasonRecords].sort((a, b) => b.winPct - a.winPct).slice(0, 10);
  const worst = [...seasonRecords].sort((a, b) => a.winPct - b.winPct).slice(0, 10);
  const highest = [...seasonRecords].sort((a, b) => b.points - a.points).slice(0, 10);
  const lowest = [...seasonRecords].sort((a, b) => a.points - b.points).slice(0, 10);

  bestBody.innerHTML = best.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.owner}</strong></td>
      <td>${r.season}</td>
      <td>${r.wins}</td>
      <td>${r.losses}</td>
      <td style="color:var(--secondary)">${(r.winPct * 100).toFixed(1)}%</td>
    </tr>
  `).join('');
  makeSortable(bestBody.closest('table'));

  worstBody.innerHTML = worst.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.owner}</strong></td>
      <td>${r.season}</td>
      <td>${r.wins}</td>
      <td>${r.losses}</td>
      <td style="color:var(--danger)">${(r.winPct * 100).toFixed(1)}%</td>
    </tr>
  `).join('');
  makeSortable(worstBody.closest('table'));

  highBody.innerHTML = highest.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.owner}</strong></td>
      <td>${r.season}</td>
      <td style="color:var(--secondary)">${r.points.toLocaleString()}</td>
      <td>${r.ppg.toFixed(1)}</td>
    </tr>
  `).join('');
  makeSortable(highBody.closest('table'));

  lowBody.innerHTML = lowest.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.owner}</strong></td>
      <td>${r.season}</td>
      <td style="color:var(--danger)">${r.points.toLocaleString()}</td>
      <td>${r.ppg.toFixed(1)}</td>
    </tr>
  `).join('');
  makeSortable(lowBody.closest('table'));
}

// ============================================================
// STREAKS
// ============================================================

function buildStreaks(data) {
  const currentGrid = document.getElementById('current-streaks-grid');
  const winBody = document.getElementById('win-streaks-body');
  const lossBody = document.getElementById('loss-streaks-body');

  // Current active streaks
  const current = Object.values(data.streaks.current)
    .sort((a, b) => b.length - a.length);

  currentGrid.innerHTML = current.map(s => `
    <div class="streak-card ${s.streak_type === 'W' ? 'win' : 'loss'}">
      <div class="streak-owner">${s.owner}</div>
      <div class="streak-value">${s.length}</div>
      <div class="streak-label">${s.streak_type === 'W' ? 'Win' : 'Loss'} Streak</div>
    </div>
  `).join('');

  // Top 10 win streaks
  winBody.innerHTML = data.streaks.top_win_streaks.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${s.owner}</strong></td>
      <td style="color:var(--success);font-family:'Oswald',sans-serif;font-size:1.1rem">
        ${s.length}
      </td>
      <td>${s.start_season} Wk ${s.start_week}</td>
      <td>${s.end_season} Wk ${s.end_week}</td>
    </tr>
  `).join('');
  makeSortable(winBody.closest('table'));

  // Top 10 loss streaks
  lossBody.innerHTML = data.streaks.top_loss_streaks.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${s.owner}</strong></td>
      <td style="color:var(--danger);font-family:'Oswald',sans-serif;font-size:1.1rem">
        ${s.length}
      </td>
      <td>${s.start_season} Wk ${s.start_week}</td>
      <td>${s.end_season} Wk ${s.end_week}</td>
    </tr>
  `).join('');
  makeSortable(lossBody.closest('table'));
}

// ============================================================
// OWNER MILESTONES
// ============================================================

function buildMilestones(data) {
  const tbody = document.getElementById('milestones-body');

  const owners = Object.values(data.owners).sort((a, b) =>
    b.career.wins - a.career.wins
  );

  tbody.innerHTML = owners.map(owner => {
    const c = owner.career;
    const woodsheds = data.woodsheds.by_owner[owner.name] || { given: 0, received: 0 };
    const champBadge = c.championships > 0
      ? `<span class="badge badge-gold">🏆 ${c.championships}</span>`
      : c.championships;

    return `
      <tr>
        <td><strong>${owner.name}</strong></td>
        <td>${c.wins}</td>
        <td>${(c.win_pct * 100).toFixed(1)}%</td>
        <td>${c.points_for.toLocaleString()}</td>
        <td>${c.points_per_game}</td>
        <td>${champBadge}</td>
        <td>${c.playoff_appearances}</td>
        <td>${c.division_titles}</td>
        <td style="color:var(--secondary)">${woodsheds.given}</td>
        <td style="color:var(--danger)">${woodsheds.received}</td>
      </tr>
    `;
  }).join('');

  makeSortable(tbody.closest('table'));
}

// ============================================================
// DIVISIONAL RECORDS
// ============================================================

function buildDivisionalRecords(data) {
  const summary = document.getElementById('divisional-summary');
  const tbody = document.getElementById('divisional-season-body');

  const allTime = data.divisional.all_time;
  const texW = allTime.TEXAROK.wins;
  const texL = allTime.TEXAROK.losses;
  const texPF = allTime.TEXAROK.points_for.toLocaleString();
  const akW = allTime.AKCOVA.wins;
  const akL = allTime.AKCOVA.losses;
  const akPF = allTime.AKCOVA.points_for.toLocaleString();
  const leader = texW > akW ? 'TEXAROK leads' : akW > texW ? 'AKCOVA leads' : 'All-time tied';

  summary.innerHTML = `
    <div class="rivalry-owner">
      <div class="div-summary-name">TEXAROK</div>
      <div class="div-summary-record">${texW}-${texL}</div>
      <div class="div-summary-pts">${texPF} pts</div>
    </div>
    <div class="div-summary-vs">
      VS<br>
      <span style="font-size:0.9rem;color:var(--text-muted)">${leader}</span>
    </div>
    <div class="rivalry-owner">
      <div class="div-summary-name">AKCOVA</div>
      <div class="div-summary-record">${akW}-${akL}</div>
      <div class="div-summary-pts">${akPF} pts</div>
    </div>
  `;

  // Season by season
  const seasons = Object.values(data.divisional.seasons)
    .sort((a, b) => b.season - a.season);

  tbody.innerHTML = seasons.map(s => {
    const texWins = s.TEXAROK.wins;
    const akWins = s.AKCOVA.wins;
    const winner = texWins > akWins ? 'TEXAROK' : akWins > texWins ? 'AKCOVA' : 'Tied';
    const winnerColor = winner === 'TEXAROK'
      ? 'var(--secondary)'
      : winner === 'AKCOVA'
        ? 'var(--secondary)'
        : 'var(--text-muted)';

    return `
      <tr>
        <td><strong>${s.season}</strong></td>
        <td>${s.TEXAROK.wins}</td>
        <td>${s.TEXAROK.losses}</td>
        <td>${s.TEXAROK.points_for.toLocaleString()}</td>
        <td>${s.AKCOVA.wins}</td>
        <td>${s.AKCOVA.losses}</td>
        <td>${s.AKCOVA.points_for.toLocaleString()}</td>
        <td style="color:${winnerColor};font-family:'Oswald',sans-serif">
          ${winner}
        </td>
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