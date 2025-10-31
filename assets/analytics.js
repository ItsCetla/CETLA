// Analytics page state and charts
const state = {
  seasons: [],
  seasonIndex: 0,
  currentRace: null, // null = all races, number = through race X
  maxRaces: 11,
  playInterval: null,
  charts: {
    points: null,
    pointsGap: null,
    positionChange: null,
    podium: null,
    trend: null,
    h2h: null,
    fastestLap: null
  },
  driverById: new Map(),
  teamById: new Map()
};

const els = {
  navToggle: document.querySelector('.nav-toggle'),
  nav: document.getElementById('primary-nav'),
  seasonSelect: document.getElementById('season-select'),
  seasonPills: document.getElementById('season-pills'),
  timelineSlider: document.getElementById('timeline-slider'),
  timelineValue: document.getElementById('timeline-value'),
  timelineTicks: document.getElementById('timeline-ticks'),
  timelinePlay: document.getElementById('timeline-play'),
  timelineReset: document.getElementById('timeline-reset'),
  toggleDrivers: document.getElementById('toggle-drivers'),
  toggleTeams: document.getElementById('toggle-teams'),
  heatmapSort: document.getElementById('heatmap-sort'),
  heatmapContainer: document.getElementById('heatmap-container'),
  podiumFilter: document.getElementById('podium-filter'),
  h2hDriver1: document.getElementById('h2h-driver1'),
  h2hDriver2: document.getElementById('h2h-driver2'),
  h2hSummary: document.getElementById('h2h-summary'),
  fastestLapStats: document.getElementById('fastest-lap-stats'),
  footerYear: document.getElementById('footer-year')
};

// Chart.js default config
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.2)';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

// Distinct color palette for charts
const chartColors = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#a855f7'  // Violet
];

async function init() {
  attachUIHandlers();
  await loadData();
  updateFooter();

  if (!state.seasons.length) {
    console.warn('No seasons loaded from data file.');
    return;
  }

  populateSeasonControls();
  setSeason(0);
}

function attachUIHandlers() {
  // Nav toggle
  els.navToggle?.addEventListener('click', () => {
    const expanded = els.navToggle.getAttribute('aria-expanded') === 'true';
    els.navToggle.setAttribute('aria-expanded', String(!expanded));
    els.nav?.classList.toggle('is-open', !expanded);
  });

  // Season selection
  els.seasonSelect?.addEventListener('change', event => {
    const id = event.target.value;
    const index = state.seasons.findIndex(season => season.id === id);
    if (index >= 0) setSeason(index);
  });

  // Timeline controls
  els.timelineSlider?.addEventListener('input', handleTimelineChange);
  els.timelinePlay?.addEventListener('click', togglePlayback);
  els.timelineReset?.addEventListener('click', resetTimeline);

  // Chart controls
  els.toggleDrivers?.addEventListener('change', updatePointsChart);
  els.toggleTeams?.addEventListener('change', updatePointsChart);
  els.heatmapSort?.addEventListener('change', renderHeatmap);
  els.podiumFilter?.addEventListener('change', renderPodiumChart);
  els.h2hDriver1?.addEventListener('change', renderH2HChart);
  els.h2hDriver2?.addEventListener('change', renderH2HChart);
}

async function loadData() {
  try {
    const response = await fetch('data/seasons.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load seasons.json (${response.status})`);
    const payload = await response.json();
    state.seasons = Array.isArray(payload.seasons) ? payload.seasons : [];
  } catch (error) {
    console.error('Unable to load season data:', error);
  }
}

function populateSeasonControls() {
  if (!els.seasonSelect || !els.seasonPills) return;
  els.seasonSelect.innerHTML = '';
  els.seasonPills.innerHTML = '';

  const fragmentOptions = document.createDocumentFragment();
  const fragmentPills = document.createDocumentFragment();

  state.seasons.forEach((season, index) => {
    const option = document.createElement('option');
    option.value = season.id;
    option.textContent = season.year ? `${season.year} · ${season.label}` : season.label;
    fragmentOptions.appendChild(option);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'season-pill';
    button.textContent = season.label;
    button.dataset.seasonId = season.id;
    button.addEventListener('click', () => setSeason(index));
    fragmentPills.appendChild(button);
  });

  els.seasonSelect.appendChild(fragmentOptions);
  els.seasonPills.appendChild(fragmentPills);
}

function setSeason(index) {
  const season = state.seasons[index];
  if (!season) return;

  state.seasonIndex = index;
  state.driverById = new Map();
  state.teamById = new Map();

  season.drivers?.forEach(driver => {
    state.driverById.set(driver.id, driver);
  });

  season.teams?.forEach(team => {
    state.teamById.set(team.id, team);
  });

  // Update max races and reset timeline
  state.maxRaces = (season.races?.length ?? 0);
  state.currentRace = state.maxRaces;

  if (els.timelineSlider) {
    els.timelineSlider.max = state.maxRaces;
    els.timelineSlider.value = state.maxRaces;
  }

  // Destroy all existing charts to prevent data carryover
  Object.keys(state.charts).forEach(key => {
    if (state.charts[key]) {
      state.charts[key].destroy();
      state.charts[key] = null;
    }
  });

  // Update UI
  highlightSeasonControls(season.id);
  renderTimeline(season);
  updateTimelineDisplay();
  renderAllCharts(season);
}

function highlightSeasonControls(seasonId) {
  if (els.seasonSelect) {
    els.seasonSelect.value = seasonId;
  }
  document.querySelectorAll('.season-pill').forEach(button => {
    button.classList.toggle('is-active', button.dataset.seasonId === seasonId);
  });
}

// Timeline functions
function renderTimeline(season) {
  if (!els.timelineTicks) return;
  els.timelineTicks.innerHTML = '';

  const races = season.races ?? [];
  const fragment = document.createDocumentFragment();

  races.forEach((race, index) => {
    const tick = document.createElement('div');
    tick.className = 'timeline-tick';
    tick.innerHTML = `
      <div class="timeline-tick__mark"></div>
      <div class="timeline-tick__label">R${index + 1}</div>
    `;
    fragment.appendChild(tick);
  });

  els.timelineTicks.appendChild(fragment);
}

function handleTimelineChange(event) {
  const value = parseInt(event.target.value);
  state.currentRace = value;
  updateTimelineDisplay();
  updateSliderProgress();
  renderAllCharts(state.seasons[state.seasonIndex]);
}

function updateTimelineDisplay() {
  if (!els.timelineValue) return;
  if (state.currentRace === state.maxRaces) {
    els.timelineValue.textContent = 'All Races';
  } else {
    els.timelineValue.textContent = `${state.currentRace} / ${state.maxRaces}`;
  }
}

function updateSliderProgress() {
  if (!els.timelineSlider) return;
  const progress = (state.currentRace / state.maxRaces) * 100;
  els.timelineSlider.style.setProperty('--slider-progress', `${progress}%`);
}

function togglePlayback() {
  if (state.playInterval) {
    // Stop playback
    clearInterval(state.playInterval);
    state.playInterval = null;
    els.timelinePlay.querySelector('.play-icon').style.display = '';
    els.timelinePlay.querySelector('.pause-icon').style.display = 'none';
  } else {
    // Start playback
    if (state.currentRace >= state.maxRaces) {
      state.currentRace = 0;
    }

    state.playInterval = setInterval(() => {
      state.currentRace++;

      if (state.currentRace > state.maxRaces) {
        togglePlayback(); // Stop at end
        return;
      }

      if (els.timelineSlider) {
        els.timelineSlider.value = state.currentRace;
      }
      updateTimelineDisplay();
      updateSliderProgress();
      renderAllCharts(state.seasons[state.seasonIndex]);
    }, 1000);

    els.timelinePlay.querySelector('.play-icon').style.display = 'none';
    els.timelinePlay.querySelector('.pause-icon').style.display = '';
  }
}

function resetTimeline() {
  if (state.playInterval) {
    togglePlayback();
  }
  state.currentRace = state.maxRaces;
  if (els.timelineSlider) {
    els.timelineSlider.value = state.maxRaces;
  }
  updateTimelineDisplay();
  updateSliderProgress();
  renderAllCharts(state.seasons[state.seasonIndex]);
}

// Chart rendering
function renderAllCharts(season) {
  updatePointsChart();
  renderPointsGapChart();
  renderPositionChangeChart();
  renderHeatmap();
  renderPodiumChart();
  renderTrendChart();
  renderFastestLapChart();
  renderH2HChart();
  populateH2HDrivers();
}

function getDriversByPoints(season) {
  return [...(season?.drivers ?? [])]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
}

function computeCumulativePoints(season, races) {
  const cumulative = new Map();

  (season?.drivers ?? []).forEach(driver => {
    let sum = 0;
    const totals = [];

    races.forEach(race => {
      const result = race.results?.find(r => r.driverId === driver.id);
      sum += result?.points ?? 0;
      totals.push(sum);
    });

    cumulative.set(driver.id, totals);
  });

  return cumulative;
}

function updatePointsChart() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const showDrivers = els.toggleDrivers?.checked ?? true;
  const showTeams = els.toggleTeams?.checked ?? false;

  const canvas = document.getElementById('points-chart');
  if (!canvas) return;

  const races = season.races?.slice(0, state.currentRace) ?? [];
  const labels = races.map((_, i) => `R${i + 1}`);

  const datasets = [];

  // Driver datasets
  if (showDrivers) {
    const topDrivers = getDriversByPoints(season).slice(0, 8);

    topDrivers.forEach((driver, index) => {
      const cumulativePoints = [];
      let sum = 0;

      races.forEach(race => {
        const result = race.results?.find(r => r.driverId === driver.id);
        sum += result?.points ?? 0;
        cumulativePoints.push(sum);
      });

      // Use distinct chart colors, fallback to driver color
      const color = chartColors[index % chartColors.length];

      datasets.push({
        label: driver.name,
        data: cumulativePoints,
        borderColor: color,
        backgroundColor: `${color}33`,
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      });
    });
  }

  // Team datasets
  if (showTeams) {
    const teams = computeTeamStandings(season);
    const topTeams = teams.slice(0, 5);

    topTeams.forEach(team => {
      const cumulativePoints = [];
      let sum = 0;

      races.forEach(race => {
        let racePoints = 0;
        race.results?.forEach(result => {
          const driver = state.driverById.get(result.driverId);
          if (driver?.teamId === team.id) {
            racePoints += result.points ?? 0;
          }
        });
        sum += racePoints;
        cumulativePoints.push(sum);
      });

      datasets.push({
        label: `${team.name} (Team)`,
        data: cumulativePoints,
        borderColor: team.color || '#94a3b8',
        backgroundColor: `${team.color || '#94a3b8'}33`,
        borderWidth: 3,
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointStyle: 'rect'
      });
    });
  }

  // Update existing chart or create new one
  if (state.charts.points) {
    state.charts.points.data.labels = labels;
    state.charts.points.data.datasets = datasets;
    state.charts.points.update({
      duration: 400,
      easing: 'easeOutQuart',
      mode: 'default'
    });
  } else {
    const ctx = canvas.getContext('2d');
    state.charts.points = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart',
          x: {
            type: 'number',
            easing: 'linear',
            duration: 400,
            from: NaN,
            delay(ctx) {
              if (ctx.type !== 'data' || ctx.xStarted) {
                return 0;
              }
              ctx.xStarted = true;
              return ctx.index * 40;
            }
          },
          y: {
            type: 'number',
            easing: 'easeOutQuart',
            duration: 400,
            from: (ctx) => {
              if (ctx.type === 'data') {
                if (ctx.mode === 'default' && !ctx.dropped) {
                  ctx.dropped = true;
                  return 0;
                }
              }
            },
            delay(ctx) {
              if (ctx.type !== 'data' || ctx.yStarted) {
                return 0;
              }
              ctx.yStarted = true;
              return ctx.index * 40;
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 12,
              usePointStyle: true,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 12 },
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }
}

function renderPointsGapChart() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const canvas = document.getElementById('points-gap-chart');
  if (!canvas) return;

  const races = season.races?.slice(0, state.currentRace) ?? [];
  const labels = races.map((_, i) => `R${i + 1}`);

  const cumulativePoints = computeCumulativePoints(season, races);

  const leaderPointsByRace = races.map((_, raceIndex) => {
    let leaderPoints = 0;
    cumulativePoints.forEach(points => {
      const value = points[raceIndex] ?? 0;
      if (value > leaderPoints) leaderPoints = value;
    });
    return leaderPoints;
  });

  const drivers = getDriversByPoints(season);
  const datasets = drivers.map((driver, index) => {
    const driverPoints = cumulativePoints.get(driver.id) ?? [];
    const gaps = labels.map((_, raceIndex) => {
      const leader = leaderPointsByRace[raceIndex] ?? 0;
      const driverValue = driverPoints[raceIndex] ?? 0;
      return Math.max(leader - driverValue, 0);
    });

    const color = chartColors[index % chartColors.length];

    return {
      label: driver.name,
      data: gaps,
      borderColor: color,
      backgroundColor: `${color}33`,
      borderWidth: 2.5,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: false
    };
  });

  if (state.charts.pointsGap) {
    state.charts.pointsGap.data.labels = labels;
    state.charts.pointsGap.data.datasets = datasets;
    state.charts.pointsGap.update({
      duration: 400,
      easing: 'easeOutQuart'
    });
  } else {
    const ctx = canvas.getContext('2d');
    state.charts.pointsGap = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: context => {
                const label = context.dataset.label || '';
                const value = context.parsed.y ?? 0;
                return `${label}: ${value.toFixed(0)} pts`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              font: { size: 11 },
              callback: value => `${value} pts`
            }
          }
        }
      }
    });
  }
}

function renderPositionChangeChart() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const canvas = document.getElementById('position-change-chart');
  if (!canvas) return;

  const races = season.races?.slice(0, state.currentRace) ?? [];
  const labels = races.map((_, i) => `R${i + 1}`);

  const cumulativePoints = computeCumulativePoints(season, races);
  const drivers = getDriversByPoints(season);

  const standingsByRace = races.map((_, raceIndex) => {
    const standings = drivers.map(driver => {
      const pointsArray = cumulativePoints.get(driver.id) ?? [];
      return {
        driverId: driver.id,
        points: pointsArray[raceIndex] ?? 0,
        seasonPoints: driver.points ?? 0,
        name: driver.name ?? driver.id
      };
    });

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
      return a.name.localeCompare(b.name);
    });

    const rankMap = new Map();
    standings.forEach((entry, index) => {
      rankMap.set(entry.driverId, index + 1);
    });
    return rankMap;
  });

  const datasets = drivers.map((driver, index) => {
    const positions = labels.map((_, raceIndex) => {
      const ranks = standingsByRace[raceIndex];
      return ranks ? ranks.get(driver.id) ?? null : null;
    });

    const color = chartColors[index % chartColors.length];

    return {
      label: driver.name,
      data: positions,
      borderColor: color,
      backgroundColor: `${color}33`,
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true
    };
  });

  if (state.charts.positionChange) {
    state.charts.positionChange.data.labels = labels;
    state.charts.positionChange.data.datasets = datasets;
    state.charts.positionChange.update({
      duration: 400,
      easing: 'easeOutQuart'
    });
  } else {
    const ctx = canvas.getContext('2d');
    state.charts.positionChange = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: context => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return value ? `${label}: P${value}` : `${label}: N/A`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { size: 11 } }
          },
          y: {
            reverse: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              callback: value => `P${value}`
            }
          }
        }
      }
    });
  }
}

function renderHeatmap() {
  const season = state.seasons[state.seasonIndex];
  if (!season || !els.heatmapContainer) return;

  const sortBy = els.heatmapSort?.value ?? 'points';
  const races = season.races?.slice(0, state.currentRace) ?? [];

  let drivers = [...(season.drivers ?? [])];

  // Sort drivers
  if (sortBy === 'points') {
    drivers.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  } else if (sortBy === 'avg') {
    drivers.sort((a, b) => {
      const avgA = calculateAvgPosition(a.id, races);
      const avgB = calculateAvgPosition(b.id, races);
      return avgA - avgB;
    });
  } else {
    drivers.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Build heatmap HTML
  let html = '<div class="heatmap-grid">';

  // Header row
  html += '<div class="heatmap-row">';
  html += '<div class="heatmap-cell heatmap-cell--header">Driver</div>';
  races.forEach((_, i) => {
    html += `<div class="heatmap-cell heatmap-cell--header">R${i + 1}</div>`;
  });
  html += '</div>';

  // Driver rows
  drivers.forEach(driver => {
    html += '<div class="heatmap-row">';
    html += `<div class="heatmap-cell heatmap-cell--driver" style="border-left: 3px solid ${driver.color || '#94a3b8'}">${driver.name}</div>`;

    races.forEach(race => {
      const result = race.results?.find(r => r.driverId === driver.id);
      const position = result?.position;

      if (position) {
        html += `<div class="heatmap-cell heatmap-cell--position" data-position="${position}">${position}</div>`;
      } else {
        html += '<div class="heatmap-cell heatmap-cell--dnf">—</div>';
      }
    });

    html += '</div>';
  });

  html += '</div>';
  els.heatmapContainer.innerHTML = html;
}

function renderPodiumChart() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const canvas = document.getElementById('podium-chart');
  if (!canvas) return;

  const races = season.races?.slice(0, state.currentRace) ?? [];
  const filterValue = els.podiumFilter?.value ?? '10';
  const limit = filterValue === 'all' ? 999 : parseInt(filterValue);

  const drivers = [...(season.drivers ?? [])]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, limit);

  const labels = drivers.map(d => d.name);

  // Count finishes by position ranges
  const firstPlaces = [];
  const secondPlaces = [];
  const thirdPlaces = [];
  const topTen = [];

  drivers.forEach(driver => {
    let p1 = 0, p2 = 0, p3 = 0, p410 = 0;

    races.forEach(race => {
      const result = race.results?.find(r => r.driverId === driver.id);
      const pos = result?.position;

      if (pos === 1) p1++;
      else if (pos === 2) p2++;
      else if (pos === 3) p3++;
      else if (pos >= 4 && pos <= 10) p410++;
    });

    firstPlaces.push(p1);
    secondPlaces.push(p2);
    thirdPlaces.push(p3);
    topTen.push(p410);
  });

  const datasets = [
    {
      label: '1st Place',
      data: firstPlaces,
      backgroundColor: 'rgba(250, 204, 21, 0.7)',
      borderColor: '#fbbf24',
      borderWidth: 2
    },
    {
      label: '2nd Place',
      data: secondPlaces,
      backgroundColor: 'rgba(203, 213, 225, 0.6)',
      borderColor: '#cbd5e1',
      borderWidth: 2
    },
    {
      label: '3rd Place',
      data: thirdPlaces,
      backgroundColor: 'rgba(249, 115, 22, 0.6)',
      borderColor: '#fb923c',
      borderWidth: 2
    },
    {
      label: '4th-10th',
      data: topTen,
      backgroundColor: 'rgba(100, 116, 139, 0.4)',
      borderColor: '#64748b',
      borderWidth: 2
    }
  ];

  // Update existing chart or create new one
  if (state.charts.podium) {
    state.charts.podium.data.labels = labels;
    state.charts.podium.data.datasets = datasets;
    state.charts.podium.update({
      duration: 400,
      easing: 'easeOutQuart'
    });
  } else {
    const ctx = canvas.getContext('2d');
    state.charts.podium = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { size: 10 } }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { stepSize: 1, font: { size: 11 } }
          }
        }
      }
    });
  }
}

function renderTrendChart() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;

  const races = season.races?.slice(0, state.currentRace) ?? [];

  if (races.length < 3) {
    if (state.charts.trend) {
      state.charts.trend.data.labels = [];
      state.charts.trend.data.datasets = [];
      state.charts.trend.options.plugins.title = {
        display: true,
        text: 'Need at least 3 races for rolling average',
        color: '#94a3b8'
      };
      state.charts.trend.update('none');
    } else {
      const ctx = canvas.getContext('2d');
      state.charts.trend = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Need at least 3 races for rolling average',
              color: '#94a3b8'
            }
          }
        }
      });
    }
    return;
  }

  const topDrivers = [...(season.drivers ?? [])]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 6);

  const labels = races.slice(2).map((_, i) => `After R${i + 3}`);
  const datasets = [];

  topDrivers.forEach((driver, index) => {
    const rollingAvg = [];

    for (let i = 2; i < races.length; i++) {
      const last3Races = races.slice(i - 2, i + 1);
      let sum = 0;
      let count = 0;

      last3Races.forEach(race => {
        const result = race.results?.find(r => r.driverId === driver.id);
        if (result?.position) {
          sum += result.position;
          count++;
        }
      });

      rollingAvg.push(count > 0 ? sum / count : null);
    }

    // Use distinct chart colors
    const color = chartColors[index % chartColors.length];

    datasets.push({
      label: driver.name,
      data: rollingAvg,
      borderColor: color,
      backgroundColor: `${color}33`,
      borderWidth: 2.5,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true
    });
  });

  // Update existing chart or create new one
  if (state.charts.trend) {
    state.charts.trend.data.labels = labels;
    state.charts.trend.data.datasets = datasets;
    if (state.charts.trend.options.plugins.title) {
      state.charts.trend.options.plugins.title.display = false;
    }
    state.charts.trend.update({
      duration: 400,
      easing: 'easeOutQuart'
    });
  } else {
    const ctx = canvas.getContext('2d');
    state.charts.trend = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value ? value.toFixed(2) : 'N/A'}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { size: 10 } }
          },
          y: {
            reverse: true,
            beginAtZero: false,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              callback: (value) => `P${value}`
            }
          }
        }
      }
    });
  }
}

function renderFastestLapChart() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const canvas = document.getElementById('fastest-lap-chart');
  if (!canvas) return;

  // Get races for THIS season only, respecting timeline slider
  const allRacesInSeason = season.races ?? [];
  const maxRaceIndex = Math.min(state.currentRace, allRacesInSeason.length);
  const races = allRacesInSeason.slice(0, maxRaceIndex);
  
  console.log('Fastest Lap Chart - Season:', season.label, 'Total races:', allRacesInSeason.length, 'Showing:', races.length);

  // Helper function to parse lap time string to seconds
  function lapTimeToSeconds(lapTime) {
    if (!lapTime || lapTime === '-') return Infinity;
    const parts = lapTime.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return Infinity;
  }

  // For each race, rank all drivers by their fastest lap time
  const driverLapPositions = new Map(); // driverId -> { totalPosition, count, positions[] }

  races.forEach(race => {
    // Get all lap times and remove duplicates (use Map to ensure one entry per driver)
    const driverLapTimes = new Map();
    race.results?.forEach(result => {
      const lapTime = lapTimeToSeconds(result.fastestLap);
      if (lapTime < Infinity && result.driverId) {
        // Only keep the fastest lap if driver appears multiple times (shouldn't happen, but safeguard)
        if (!driverLapTimes.has(result.driverId) || lapTime < driverLapTimes.get(result.driverId)) {
          driverLapTimes.set(result.driverId, lapTime);
        }
      }
    });

    // Convert to array and sort by lap time (ascending - fastest first)
    const lapTimes = Array.from(driverLapTimes.entries())
      .map(([driverId, time]) => ({ driverId, time }))
      .sort((a, b) => a.time - b.time);

    // Assign positions based on lap time ranking
    lapTimes.forEach((entry, index) => {
      const position = index + 1; // Position 1 = fastest lap, 2 = second fastest, etc.
      
      if (!driverLapPositions.has(entry.driverId)) {
        driverLapPositions.set(entry.driverId, {
          totalPosition: 0,
          count: 0,
          positions: [],
          bestPosition: Infinity,
          worstPosition: 0
        });
      }
      
      const data = driverLapPositions.get(entry.driverId);
      data.totalPosition += position;
      data.count++;
      data.positions.push(position);
      data.bestPosition = Math.min(data.bestPosition, position);
      data.worstPosition = Math.max(data.worstPosition, position);
    });
  });

  // Calculate average lap position for all drivers
  const driverStats = Array.from(driverLapPositions.entries())
    .map(([driverId, data]) => ({
      driverId,
      driver: state.driverById.get(driverId),
      avgLapPosition: data.totalPosition / data.count,
      raceCount: data.count,
      bestPosition: data.bestPosition,
      worstPosition: data.worstPosition,
      positions: data.positions
    }))
    .filter(stat => stat.driver) // Only include drivers we know about
    .sort((a, b) => a.avgLapPosition - b.avgLapPosition); // Sort by best average lap position

  // Debug logging
  if (driverStats.length > 0) {
    console.log('Driver Stats Sample:', driverStats.slice(0, 3).map(d => ({
      name: d.driver.name,
      raceCount: d.raceCount,
      avgPos: d.avgLapPosition.toFixed(2)
    })));
  }

  const labels = driverStats.map(stat => stat.driver.name);
  const avgPositions = driverStats.map(stat => stat.avgLapPosition);
  const raceCounts = driverStats.map(stat => stat.raceCount);

  const colors = driverStats.map((stat, index) => 
    chartColors[index % chartColors.length]
  );

  const datasets = [
    {
      label: 'Avg. Fastest Lap Position',
      data: avgPositions,
      backgroundColor: colors.map(c => `${c}99`),
      borderColor: colors,
      borderWidth: 2,
      yAxisID: 'y'
    }
  ];

  // Update existing chart or create new one
  if (state.charts.fastestLap) {
    state.charts.fastestLap.data.labels = labels;
    state.charts.fastestLap.data.datasets = datasets;
    state.charts.fastestLap.update({
      duration: 400,
      easing: 'easeOutQuart'
    });
  } else {
    const ctx = canvas.getContext('2d');
    state.charts.fastestLap = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const stat = driverStats[context.dataIndex];
                return [
                  `Avg Position: P${stat.avgLapPosition.toFixed(2)}`,
                  `Best: P${stat.bestPosition}`,
                  `Worst: P${stat.worstPosition}`,
                  `Races: ${stat.raceCount}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: false,
            reverse: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              font: { size: 11 },
              callback: (value) => `P${value}`
            },
            title: {
              display: true,
              text: 'Fastest Lap Position (Lower = Better)',
              font: { size: 11 }
            }
          }
        }
      }
    });
  }

  // Update statistics panel
  if (els.fastestLapStats && driverStats.length > 0) {
    const bestDriver = driverStats[0];
    const mostP1s = driverStats.reduce((best, current) => {
      const currentP1s = current.positions.filter(p => p === 1).length;
      const bestP1s = best.positions.filter(p => p === 1).length;
      return currentP1s > bestP1s ? current : best;
    }, driverStats[0]);
    const p1Count = mostP1s.positions.filter(p => p === 1).length;
    
    // Count drivers with complete data
    const completeDataDrivers = driverStats.filter(d => d.raceCount === races.length).length;
    const incompleteDataDrivers = driverStats.length - completeDataDrivers;
    
    els.fastestLapStats.innerHTML = `
      <div class="h2h-stats">
        <div class="h2h-stat">
          <div class="h2h-stat__label">Best Avg Lap Time Position</div>
          <div class="h2h-stat__value h2h-stat__value--winner">${bestDriver.driver.name} (P${bestDriver.avgLapPosition.toFixed(2)})</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Most Fastest Laps</div>
          <div class="h2h-stat__value">${mostP1s.driver.name} (${p1Count})</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Data Coverage</div>
          <div class="h2h-stat__value">${completeDataDrivers} complete / ${incompleteDataDrivers} partial</div>
        </div>
      </div>
    `;
  }
}

function populateH2HDrivers() {
  const season = state.seasons[state.seasonIndex];
  if (!season || !els.h2hDriver1 || !els.h2hDriver2) return;

  const drivers = [...(season.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  const fragment1 = document.createDocumentFragment();
  const fragment2 = document.createDocumentFragment();

  drivers.forEach((driver, index) => {
    const option1 = document.createElement('option');
    option1.value = driver.id;
    option1.textContent = driver.name;
    if (index === 0) option1.selected = true;
    fragment1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = driver.id;
    option2.textContent = driver.name;
    if (index === 1) option2.selected = true;
    fragment2.appendChild(option2);
  });

  els.h2hDriver1.innerHTML = '';
  els.h2hDriver2.innerHTML = '';
  els.h2hDriver1.appendChild(fragment1);
  els.h2hDriver2.appendChild(fragment2);
}

function renderH2HChart() {
  const season = state.seasons[state.seasonIndex];
  if (!season || !els.h2hDriver1 || !els.h2hDriver2) return;

  const driver1Id = els.h2hDriver1.value;
  const driver2Id = els.h2hDriver2.value;

  const driver1 = state.driverById.get(driver1Id);
  const driver2 = state.driverById.get(driver2Id);

  if (!driver1 || !driver2) return;

  const canvas = document.getElementById('h2h-chart');
  if (!canvas) return;

  const races = season.races?.slice(0, state.currentRace) ?? [];
  const labels = races.map((_, i) => `R${i + 1}`);

  const driver1Positions = [];
  const driver2Positions = [];
  let driver1Wins = 0;
  let driver2Wins = 0;
  let driver1Points = 0;
  let driver2Points = 0;

  races.forEach(race => {
    const result1 = race.results?.find(r => r.driverId === driver1Id);
    const result2 = race.results?.find(r => r.driverId === driver2Id);

    driver1Positions.push(result1?.position ?? null);
    driver2Positions.push(result2?.position ?? null);

    // Count wins/losses - DNF counts as a loss
    const pos1 = result1?.position;
    const pos2 = result2?.position;

    if (pos1 && pos2) {
      // Both finished - compare positions
      if (pos1 < pos2) driver1Wins++;
      else if (pos2 < pos1) driver2Wins++;
    } else if (pos1 && !pos2) {
      // Driver 1 finished, Driver 2 DNF - Driver 1 wins
      driver1Wins++;
    } else if (!pos1 && pos2) {
      // Driver 2 finished, Driver 1 DNF - Driver 2 wins
      driver2Wins++;
    }
    // If both DNF, neither gets a win

    driver1Points += result1?.points ?? 0;
    driver2Points += result2?.points ?? 0;
  });

  const datasets = [
    {
      label: driver1.name,
      data: driver1Positions,
      borderColor: driver1.color || '#38bdf8',
      backgroundColor: `${driver1.color || '#38bdf8'}33`,
      borderWidth: 3,
      tension: 0.3,
      pointRadius: 5,
      pointHoverRadius: 7,
      spanGaps: true
    },
    {
      label: driver2.name,
      data: driver2Positions,
      borderColor: driver2.color || '#f97316',
      backgroundColor: `${driver2.color || '#f97316'}33`,
      borderWidth: 3,
      tension: 0.3,
      pointRadius: 5,
      pointHoverRadius: 7,
      spanGaps: true
    }
  ];

  // Update existing chart or create new one
  if (state.charts.h2h) {
    state.charts.h2h.data.labels = labels;
    state.charts.h2h.data.datasets = datasets;
    state.charts.h2h.update({
      duration: 400,
      easing: 'easeOutQuart'
    });
  } else {
    const ctx = canvas.getContext('2d');
    state.charts.h2h = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 12, weight: '600' } }
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return value ? `${label}: P${value}` : `${label}: DNF`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { size: 11 } }
          },
          y: {
            reverse: true,
            beginAtZero: false,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              callback: (value) => `P${value}`
            }
          }
        }
      }
    });
  }

  // Update summary
  if (els.h2hSummary) {
    const winnerName = driver1Wins > driver2Wins ? driver1.name : driver2Wins > driver1Wins ? driver2.name : 'Tied';
    const winnerClass = driver1Wins !== driver2Wins ? 'h2h-stat__value--winner' : '';

    els.h2hSummary.innerHTML = `
      <div class="h2h-stats">
        <div class="h2h-stat">
          <div class="h2h-stat__label">Races Won</div>
          <div class="h2h-stat__value">${driver1.name}: ${driver1Wins} | ${driver2.name}: ${driver2Wins}</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Total Points</div>
          <div class="h2h-stat__value">${driver1.name}: ${driver1Points} | ${driver2.name}: ${driver2Points}</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Battle Winner</div>
          <div class="h2h-stat__value ${winnerClass}">${winnerName}</div>
        </div>
      </div>
    `;
  }
}

// Helper functions
function computeTeamStandings(season) {
  const teamMap = new Map();
  (season.teams ?? []).forEach(team => {
    teamMap.set(team.id, {
      ...team,
      drivers: [],
      calcPoints: 0
    });
  });

  (season.drivers ?? []).forEach(driver => {
    if (!driver.teamId || !teamMap.has(driver.teamId)) return;
    const team = teamMap.get(driver.teamId);
    team.drivers.push(driver);
    team.calcPoints += driver.points ?? 0;
  });

  return Array.from(teamMap.values())
    .map(team => ({
      ...team,
      points: team.calcPoints !== undefined ? team.calcPoints : (team.points ?? 0)
    }))
    .sort((a, b) => b.points - a.points);
}

function calculateAvgPosition(driverId, races) {
  let sum = 0;
  let count = 0;

  races.forEach(race => {
    const result = race.results?.find(r => r.driverId === driverId);
    if (result?.position) {
      sum += result.position;
      count++;
    }
  });

  return count > 0 ? sum / count : 999;
}

function updateFooter() {
  if (els.footerYear) {
    els.footerYear.textContent = new Date().getFullYear();
  }
}

// Initialize
init();
