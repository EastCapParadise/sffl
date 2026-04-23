// ============================================================
// SFFL - Owners Page JavaScript
// ============================================================

let allData = null;
let finishChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  allData = await loadData();
  if (!allData) return;

  buildOwnerCards(allData);
  setLastUpdated(allData);

  document.getElementById('back-btn').addEventListener('click', () => {
    showLanding();
  });
});

// ============================================================
// BUILD OWNER CARDS LANDING
// ============================================================

function buildOwnerCards(data) {
  const activeGrid = document.getElementById('active-owner-cards');
  const alumniGrid = document.getElementById('alumni-owner-cards');

  const activeOwners = ['Brian', 'Watty', 'Russell', 'Charles', 'Brent',
    'Michael', 'Mark', 'Matt', 'David', 'Emily',
    'BR', 'Arnold', 'Grayson', 'Jordan'];

  const owners = Object.values(data.owners);

  const active = owners.filter(o => activeOwners.includes(o.name));
  const alumni = owners.filter(o => !activeOwners.includes(o.name));

  activeGrid.innerHTML = active.map(o => ownerCardHTML(o)).join('');
  alumniGrid.innerHTML = alumni.map(o => ownerCardHTML(o)).join('');

  // Add click handlers
  document.querySelectorAll('.owner-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.owner;
      showOwnerProfile(name);
    });
  });
}

function ownerCardHTML(owner) {
  const c = owner.career;
  const years = owner.seasons.map(s => s.season);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;
  const winPct = (c.win_pct * 100).toFixed(1);

  const champBadge = c.championships > 0
    ? `<span class="badge badge-gold">🏆 ${c.championships}x Champ</span>`
    : '';
  const activeBadge = owner.active
    ? `<span class="badge badge-active">Active</span>`
    : `<span style="color:var(--text-muted);font-size:0.75rem;">Alumni</span>`;

  return `
    <div class="owner-card" data-owner="${owner.name}">
      <div class="owner-card-initial">${owner.name.charAt(0)}</div>
      <div class="owner-card-name">${owner.name}</div>
      <div class="owner-card-years">${yearRange} &nbsp;|&nbsp; ${years.length} seasons</div>
      <div class="owner-card-record">${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''} &nbsp;(${winPct}%)</div>
      <div class="owner-card-badges">
        ${champBadge}
        ${activeBadge}
      </div>
    </div>
  `;
}

// ============================================================
// SHOW / HIDE LANDING VS PROFILE
// ============================================================

function showLanding() {
  document.getElementById('owner-landing').style.display = 'block';
  document.getElementById('owner-profile').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showOwnerProfile(name) {
  document.getElementById('owner-landing').style.display = 'none';
  document.getElementById('owner-profile').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadOwnerProfile(name);
}

// ============================================================
// LOAD OWNER PROFILE
// ============================================================

function loadOwnerProfile(name) {
  const owner = allData.owners[name];
  if (!owner) return;

  buildProfileHeader(owner);
  buildProfileStats(owner);
  buildFinishChart(owner);
  buildSeasonHistory(owner);
  buildH2HTable(owner, name);
}

// ============================================================
// PROFILE HEADER
// ============================================================

function buildProfileHeader(owner) {
  const el = document.getElementById('profile-header');
  const c = owner.career;
  const years = owner.seasons.map(s => s.season);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;

  const champBadge = c.championships > 0
    ? `<span class="badge badge-gold">🏆 ${c.championships}x Champion</span>`
    : '';
  const activeBadge = owner.active
    ? `<span class="badge badge-active">Active Member</span>`
    : `<span class="badge" style="background:rgba(148,163,184,0.15);color:var(--text-muted);border:1px solid var(--text-muted)">Alumni</span>`;

  el.innerHTML = `
    <div class="profile-initial">${owner.name.charAt(0)}</div>
    <div class="profile-info">
      <h2>${owner.name}</h2>
      <p>${yearRange} &nbsp;|&nbsp; ${years.length} season${years.length !== 1 ? 's' : ''}</p>
      <div class="profile-badges">
        ${champBadge}
        ${activeBadge}
      </div>
    </div>
  `;
}

// ============================================================
// PROFILE STATS
// ============================================================

function buildProfileStats(owner) {
  const el = document.getElementById('profile-stats');
  const c = owner.career;
  const winPct = (c.win_pct * 100).toFixed(1);

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Career Record</div>
      <div class="stat-value">${c.wins}-${c.losses}</div>
      <div class="stat-sub">${winPct}% win rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Points Per Game</div>
      <div class="stat-value">${c.points_per_game}</div>
      <div class="stat-sub">career average</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Points For</div>
      <div class="stat-value">${c.points_for.toLocaleString()}</div>
      <div class="stat-sub">all time</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Points Against</div>
      <div class="stat-value">${c.points_against.toLocaleString()}</div>
      <div class="stat-sub">all time</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Championships</div>
      <div class="stat-value">${c.championships}</div>
      <div class="stat-sub">${c.playoff_appearances} playoff appearances</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Playoff Record</div>
      <div class="stat-value">${c.playoff_wins}-${c.playoff_losses}</div>
      <div class="stat-sub">all time playoffs</div>
    </div>
  `;
}

// ============================================================
// FINISH POSITION CHART
// ============================================================

function buildFinishChart(owner) {
  const section = document.getElementById('chart-section');
  const seasons = owner.seasons.filter(s => s.final_rank !== null);

  if (seasons.length < 3) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const labels = seasons.map(s => s.season.toString());
  const ranks = seasons.map(s => s.final_rank);
  const maxRank = Math.max(...ranks);

  if (finishChart) {
    finishChart.destroy();
  }

  const ctx = document.getElementById('finish-chart').getContext('2d');
  finishChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Final Finish Position',
        data: ranks,
        borderColor: '#c9a84c',
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#c9a84c',
        pointRadius: 5,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          reverse: true,
          min: 1,
          max: maxRank,
          ticks: {
            stepSize: 1,
            color: '#94a3b8',
            callback: (val) => {
              if (val === 1) return '🏆 1st';
              if (val === 2) return '2nd';
              if (val === 3) return '3rd';
              return `${val}th`;
            }
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const rank = ctx.raw;
              const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
              return `Finished ${rank}${suffix}`;
            }
          }
        }
      }
    }
  });
}

// ============================================================
// SEASON BY SEASON TABLE
// ============================================================

function buildSeasonHistory(owner) {
  const tbody = document.getElementById('season-history-body');

  tbody.innerHTML = [...owner.seasons].reverse().map(s => {
    const total = s.wins + s.losses + s.ties;
    const ppg = total > 0 ? (s.points_for / total).toFixed(1) : '—';
    const champCell = s.champion
      ? `<span class="badge badge-gold">🏆 Yes</span>`
      : '—';
    const playoffCell = s.playoff
      ? `<span class="badge" style="background:rgba(201,168,76,0.15);color:var(--secondary);border:1px solid var(--secondary)">Yes</span>`
      : '—';

    return `
      <tr>
        <td><strong>${s.season}</strong></td>
        <td>${s.wins}</td>
        <td>${s.losses}</td>
        <td>${s.ties}</td>
        <td>${s.points_for.toLocaleString()}</td>
        <td>${ppg}</td>
        <td>${s.final_rank || '—'}</td>
        <td>${playoffCell}</td>
        <td>${champCell}</td>
      </tr>
    `;
  }).join('');

  makeSortable(tbody.closest('table'));
}

// ============================================================
// HEAD TO HEAD TABLE
// ============================================================

function buildH2HTable(owner, name) {
  const tbody = document.getElementById('h2h-body');
  const h2h = allData.head_to_head[name] || {};
  const allOwners = Object.keys(allData.owners).filter(o => o !== name);

  tbody.innerHTML = allOwners.sort().map(opponent => {
    const record = h2h[opponent];
    if (!record || (record.wins === 0 && record.losses === 0 && record.ties === 0)) {
      return `
        <tr>
          <td>${opponent}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    }

    const total = record.wins + record.losses + record.ties;
    const winPct = total > 0 ? ((record.wins / total) * 100).toFixed(1) + '%' : '—';

    return `
      <tr>
        <td><strong>${opponent}</strong></td>
        <td>${record.wins}</td>
        <td>${record.losses}</td>
        <td>${record.ties}</td>
        <td>${winPct}</td>
        <td>${record.points_for.toLocaleString()}</td>
        <td>${record.points_against.toLocaleString()}</td>
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