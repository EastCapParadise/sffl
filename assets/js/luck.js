// ============================================================
// SFFL - Luck Page JavaScript
// ============================================================

let luckData = null;
let seasonChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  luckData = await loadData();
  if (!luckData || !luckData.luck) {
    document.querySelector('.page-header').insertAdjacentHTML('afterend',
      '<section class="section"><div class="container"><p style="color:var(--text-muted)">Luck data not available. Run build_data.py to generate it.</p></div></section>'
    );
    return;
  }

  buildLuckTiles(luckData);
  buildLuckCharts(luckData);
  buildOwnerSection(luckData);
  buildGameLog(luckData);
  setLastUpdated(luckData);
});

// ============================================================
// UTILITIES
// ============================================================

function fmt(val) {
  const v = parseFloat(val);
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

function luckColor(val) {
  return val >= 0 ? '#22c55e' : '#ef4444';
}

function luckBadge(val) {
  const cls = val >= 0 ? 'lucky' : 'unlucky';
  const label = val >= 0 ? 'Lucky' : 'Unlucky';
  return `<span class="luck-badge ${cls}">${label} ${fmt(val)}</span>`;
}

function setLastUpdated(data) {
  const el = document.getElementById('last-updated');
  if (el && data.meta) el.textContent = data.meta.last_updated;
}

function sortedOwners(summary) {
  return Object.entries(summary)
    .sort((a, b) => b[1].net_luck_per_game - a[1].net_luck_per_game);
}

// ============================================================
// SECTION 1 — METRIC TILES
// ============================================================

function buildLuckTiles(data) {
  const summary = data.luck.luck_summary;
  const log = data.luck.luck_game_log;

  const sorted = sortedOwners(summary);
  const [luckiestName, luckiestStats] = sorted[0];
  const [unluckiestName, unluckiestStats] = sorted[sorted.length - 1];

  const bestGame = log.reduce((a, b) => b.net_luck > a.net_luck ? b : a);
  const worstGame = log.reduce((a, b) => b.net_luck < a.net_luck ? b : a);

  const tiles = [
    {
      emoji: '🍀',
      label: 'Luckiest All Time',
      value: luckiestName,
      sub: `${fmt(luckiestStats.net_luck_per_game)} pts/game`
    },
    {
      emoji: '🌧️',
      label: 'Unluckiest All Time',
      value: unluckiestName,
      sub: `${fmt(unluckiestStats.net_luck_per_game)} pts/game`
    },
    {
      emoji: '⭐',
      label: 'Best Single-Game Luck',
      value: fmt(bestGame.net_luck),
      sub: `${bestGame.team_display} vs ${bestGame.opp_display} — ${bestGame.year} Wk ${bestGame.week}`
    },
    {
      emoji: '💀',
      label: 'Worst Single-Game Luck',
      value: fmt(worstGame.net_luck),
      sub: `${worstGame.team_display} vs ${worstGame.opp_display} — ${worstGame.year} Wk ${worstGame.week}`
    }
  ];

  const container = document.getElementById('luck-tiles');
  if (!container) return;

  container.innerHTML = tiles.map(t => `
    <div class="luck-tile">
      <div class="luck-tile-emoji">${t.emoji}</div>
      <div class="luck-tile-value">${t.value}</div>
      <div class="luck-tile-label">${t.label}</div>
      <div class="luck-tile-sub">${t.sub}</div>
    </div>
  `).join('');
}

// ============================================================
// SECTION 2 — ALL-TIME CHARTS
// ============================================================

function buildLuckCharts(data) {
  buildDivergingBar(data);
  buildScatterPlot(data);
}

function buildDivergingBar(data) {
  const summary = data.luck.luck_summary;
  const sorted = sortedOwners(summary).reverse(); // worst to best for bottom-to-top display

  const labels = sorted.map(([name]) => name);
  const values = sorted.map(([, s]) => s.net_luck_per_game);
  const colors = values.map(v => v >= 0 ? 'rgba(34, 197, 94, 0.75)' : 'rgba(239, 68, 68, 0.75)');
  const borders = values.map(v => v >= 0 ? '#22c55e' : '#ef4444');

  const ctx = document.getElementById('luck-bar-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmt(ctx.parsed.x)} pts/game`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#94a3b8', callback: v => fmt(v) },
          border: { color: 'rgba(255,255,255,0.15)' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#e2e8f0', font: { family: 'Oswald', size: 13 } },
          border: { color: 'rgba(255,255,255,0.15)' }
        }
      }
    }
  });
}

function buildScatterPlot(data) {
  const summary = data.luck.luck_summary;
  const owners = data.owners;

  const points = Object.entries(summary).map(([name, s]) => {
    const owner = owners[name];
    const winPct = owner ? owner.career.win_pct : null;
    return winPct !== null ? { x: s.net_luck_per_game, y: winPct, name } : null;
  }).filter(Boolean);

  const ctx = document.getElementById('luck-scatter-chart').getContext('2d');
  new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        data: points.map(p => ({ x: p.x, y: p.y })),
        backgroundColor: points.map(p => p.x >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
        borderColor: points.map(p => p.x >= 0 ? '#22c55e' : '#ef4444'),
        borderWidth: 1,
        pointRadius: 8,
        pointHoverRadius: 10,
        label: 'Owner'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pt = points[ctx.dataIndex];
              return `${pt.name}: luck ${fmt(pt.x)}, win% ${(pt.y * 100).toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Luck Index (pts/game)', color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#94a3b8', callback: v => fmt(v) },
          border: { color: 'rgba(255,255,255,0.15)' }
        },
        y: {
          title: { display: true, text: 'Win %', color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#94a3b8', callback: v => (v * 100).toFixed(0) + '%' },
          border: { color: 'rgba(255,255,255,0.15)' }
        }
      }
    }
  });
}

// ============================================================
// SECTION 3 — PER-OWNER VIEW
// ============================================================

function buildOwnerSection(data) {
  const summary = data.luck.luck_summary;
  const owners = Object.keys(summary).sort();

  const select = document.getElementById('luck-owner-select');
  select.innerHTML = owners.map(o => `<option value="${o}">${o}</option>`).join('');

  renderOwnerView(data, owners[0]);

  select.addEventListener('change', () => renderOwnerView(data, select.value));
}

function renderOwnerView(data, owner) {
  renderHeatmap(data, owner);
  renderSeasonChart(data, owner);
}

function renderHeatmap(data, owner) {
  const matchup = data.luck.luck_by_matchup[owner] || {};
  const container = document.getElementById('luck-heatmap-container');
  if (!container) return;

  const opponents = Object.keys(matchup).sort();
  if (!opponents.length) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:16px">No matchup data.</p>';
    return;
  }

  const rows = opponents.map(opp => {
    const { avg_luck, games } = matchup[opp];
    const bg = luckCellBg(avg_luck);
    const textColor = avg_luck >= 0 ? '#22c55e' : '#ef4444';
    return `
      <tr>
        <td style="text-align:left;padding:8px 12px;color:var(--text);font-family:'Oswald',sans-serif;font-size:0.9rem">${opp}</td>
        <td style="background:${bg};text-align:center;padding:8px 12px;border-radius:4px">
          <span style="color:${textColor};font-weight:700;font-size:0.9rem">${fmt(avg_luck)}</span>
          <span style="display:block;color:var(--text-muted);font-size:0.72rem">${games}g</span>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="luck-heatmap-table">
      <thead>
        <tr>
          <th style="text-align:left">Opponent</th>
          <th>Avg Luck</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function luckCellBg(val) {
  const intensity = Math.min(Math.abs(val) / 20, 1);
  if (val >= 0) return `rgba(34, 197, 94, ${0.08 + intensity * 0.25})`;
  return `rgba(239, 68, 68, ${0.08 + intensity * 0.25})`;
}

function renderSeasonChart(data, owner) {
  const bySeasonAll = data.luck.luck_by_season[owner] || {};
  const years = Object.keys(bySeasonAll).map(Number).sort();
  const values = years.map(y => bySeasonAll[y].net_luck);

  if (seasonChartInstance) {
    seasonChartInstance.destroy();
    seasonChartInstance = null;
  }

  const ctx = document.getElementById('luck-season-chart').getContext('2d');
  seasonChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{
        label: 'Net Luck',
        data: values,
        backgroundColor: values.map(v => v >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
        borderColor: values.map(v => v >= 0 ? '#22c55e' : '#ef4444'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmt(ctx.parsed.y)} pts total luck`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#94a3b8' },
          border: { color: 'rgba(255,255,255,0.15)' }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#94a3b8', callback: v => fmt(v) },
          border: { color: 'rgba(255,255,255,0.15)' }
        }
      }
    }
  });
}

// ============================================================
// SECTION 4 — GAME LOG TABLE
// ============================================================

let fullLog = [];

function buildGameLog(data) {
  fullLog = data.luck.luck_game_log || [];
  const owners = [...new Set(fullLog.map(r => r.team))].sort();

  const logFilter = document.getElementById('luck-log-filter');
  owners.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    logFilter.appendChild(opt);
  });

  renderLogTable('all');

  logFilter.addEventListener('change', () => renderLogTable(logFilter.value));
}

function renderLogTable(owner) {
  const rows = owner === 'all' ? fullLog : fullLog.filter(r => r.team === owner);
  const tbody = document.getElementById('luck-log-body');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">No games found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.year}</td>
      <td>${r.week}</td>
      <td>${r.team_display}</td>
      <td>${r.opp_display}</td>
      <td>${r.score.toFixed(2)}</td>
      <td>${r.opp_score.toFixed(2)}</td>
      <td style="color:${luckColor(r.team_deviation)}">${fmt(r.team_deviation)}</td>
      <td style="color:${luckColor(-r.opp_deviation)}">${fmt(r.opp_deviation)}</td>
      <td>${luckBadge(r.net_luck)}</td>
    </tr>`).join('');
}
