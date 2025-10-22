const state = {
  seasons: [],
  seasonIndex: 0,
  raceIndex: 0,
  seasonPills: [],
  driverById: new Map(),
  driverByName: new Map(),
  teamById: new Map(),
  latestSeasonIndex: 0,
  scheduleRendered: false
};

const els = {
  navToggle: document.querySelector('.nav-toggle'),
  nav: document.getElementById('primary-nav'),
  seasonSelect: document.getElementById('season-select'),
  seasonPills: document.getElementById('season-pills'),
  seasonCard: document.getElementById('season-card'),
  seasonCardYear: document.getElementById('season-card-year'),
  seasonCardTitle: document.getElementById('season-card-title'),
  seasonCardDescription: document.getElementById('season-card-description'),
  seasonCardRounds: document.getElementById('season-card-rounds'),
  heroSeasonTitle: document.getElementById('hero-season-title'),
  heroSeasonLabel: document.getElementById('hero-season-label'),
  heroSeasonRounds: document.getElementById('hero-season-rounds'),
  heroSeasonLeader: document.getElementById('hero-season-leader'),
  heroTeamLeader: document.getElementById('hero-team-leader'),
  heroRaceTitle: document.getElementById('hero-race-title'),
  heroRaceMeta: document.getElementById('hero-race-meta'),
  heroPodium: document.getElementById('hero-podium'),
  heroCta: document.getElementById('cta-season'),
  driverTableBody: document.getElementById('driver-table-body'),
  teamTableBody: document.getElementById('team-table-body'),
  raceSelect: document.getElementById('race-select'),
  raceRoundLabel: document.getElementById('race-round-label'),
  raceTitle: document.getElementById('race-title'),
  raceDate: document.getElementById('race-date'),
  raceVenue: document.getElementById('race-venue'),
  raceCar: document.getElementById('race-car'),
  raceWeather: document.getElementById('race-weather'),
  raceLaps: document.getElementById('race-laps'),
  raceNotes: document.getElementById('race-notes'),
  raceTrackImage: document.getElementById('race-track-image'),
  raceResultsBody: document.getElementById('race-results-body'),
  statsWins: document.getElementById('stats-wins'),
  statsPodiums: document.getElementById('stats-podiums'),
  statsAveragePoints: document.getElementById('stats-average-points'),
  statsAveragePlacement: document.getElementById('stats-average-placement'),
  footerYear: document.getElementById('footer-year'),
  // Modal elements
  modal: document.getElementById('stats-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalList: document.getElementById('modal-list'),
  scheduleButton: document.getElementById('open-fall-schedule'),
  scheduleModal: document.getElementById('schedule-modal'),
  scheduleList: document.getElementById('schedule-list'),
  scheduleRules: document.getElementById('schedule-rules')
};

const tabButtons = document.querySelectorAll('.tabs__button');
const tabPanels = document.querySelectorAll('.tab-panel');

const intlDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const scheduleDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
  timeZoneName: 'short'
});

const FALL_2025_RULES = [
  '2× tire wear · 2× fuel consumption',
  'Weather: Random',
  'Mandatory compound change each race (unless it rains)',
  'Reverse grid based on season standings',
  'Damage: Light',
  'Boost: None'
];

const FALL_2025_SCHEDULE = [
  {
    type: 'race',
    date: '2025-10-09T20:00:00-04:00',
    track: 'Blue Moon Bay Speedway – Infield B',
    car: 'Corvette Gr.3',
    laps: 15
  },
  {
    type: 'race',
    date: '2025-10-16T20:00:00-04:00',
    track: 'Daytona International Speedway – 24h Layout',
    car: 'Mustang Gr.3',
    laps: 13
  },
  {
    type: 'race',
    date: '2025-10-23T20:00:00-04:00',
    track: 'Trial Mountain Circuit',
    car: "Huracán GT3 '15",
    laps: 12
  },
  {
    type: 'race',
    date: '2025-10-30T20:00:00-04:00',
    track: 'Autodrome Lago Maggiore',
    car: "Mercedes-AMG GT3 '16",
    laps: 13
  },
  {
    type: 'race',
    date: '2025-11-06T20:00:00-05:00',
    track: 'Watkins Glen Short Course',
    car: "GT-T GT500 '16",
    laps: 18
  },
  {
    type: 'race',
    date: '2025-11-13T20:00:00-05:00',
    track: 'Tokyo Expressway – East Clockwise',
    car: "NSX GT500 '08",
    laps: 10
  },
  {
    type: 'race',
    date: '2025-11-20T20:00:00-05:00',
    track: 'WeatherTech Raceway Laguna Seca',
    car: 'Garage RCR Civic',
    laps: 14
  },
  {
    type: 'race',
    date: '2025-11-28T20:00:00-05:00',
    track: 'Suzuka Circuit – Short Course',
    car: 'FT-1 VGT',
    laps: 14
  },
  {
    type: 'race',
    date: '2025-12-04T20:00:00-05:00',
    track: 'Michelin Raceway Road Atlanta',
    car: 'WRX Gr.3',
    laps: 16
  },
  {
    type: 'race',
    date: '2025-12-11T20:00:00-05:00',
    track: 'Kyoto Driving Park – Yamagiwa',
    car: "R8 LMS '15",
    laps: 14
  },
  {
    type: 'race',
    date: '2025-12-18T20:00:00-05:00',
    track: 'Deep Forest Raceway',
    car: 'Dragon Trial',
    laps: 14
  },
  {
    type: 'break',
    title: 'Christmas Break',
    description: 'No race scheduled. Enjoy the holidays!'
  },
  {
    type: 'race',
    date: '2026-01-08T20:00:00-05:00',
    track: 'Brands Hatch Grand Prix Circuit',
    car: "SR3 SL '13",
    laps: 14
  },
  {
    type: 'race',
    date: '2026-01-15T20:00:00-05:00',
    track: 'Autodromo Nazionale Monza',
    car: "458 Italia GT3 '13",
    laps: 12
  },
  {
    type: 'race',
    date: '2026-01-22T20:00:00-05:00',
    track: 'Red Bull Ring',
    car: "M6 GT3 Sprint Model '16",
    laps: 12
  },
  {
    type: 'race',
    date: '2026-01-29T20:00:00-05:00',
    track: 'Circuit de la Sarthe',
    car: 'Ford GT LM Race Car Spec II',
    laps: 10
  }
];

function withAlpha(hex, alpha = 0.35) {
  if (!hex || !hex.startsWith('#')) return hex;
  const value = hex.replace('#', '');
  if (value.length === 3) {
    const [r, g, b] = value.split('').map(char => parseInt(char + char, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function init() {
  attachUIHandlers();
  await loadData();
  updateFooter();

  if (!state.seasons.length) {
    console.warn('No seasons loaded from data file.');
    return;
  }

  populateSeasonControls();
  const initialIndex = Number.isInteger(state.latestSeasonIndex) ? state.latestSeasonIndex : 0;
  setSeason(initialIndex);
}

function attachUIHandlers() {
  document.querySelectorAll('a[data-scroll], button[data-scroll]').forEach(el => {
    el.addEventListener('click', event => {
      const selector = el.getAttribute('href') || el.dataset.scroll;
      if (selector && selector.startsWith('#')) {
        event.preventDefault();
        document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
        closeNav();
      }
    });
  });

  els.navToggle?.addEventListener('click', () => {
    const expanded = els.navToggle.getAttribute('aria-expanded') === 'true';
    els.navToggle.setAttribute('aria-expanded', String(!expanded));
    els.nav?.classList.toggle('is-open', !expanded);
  });

  els.heroCta?.addEventListener('click', () => {
    document.getElementById('season-picker')?.scrollIntoView({ behavior: 'smooth' });
  });

  els.seasonSelect?.addEventListener('change', event => {
    const id = event.target.value;
    const index = state.seasons.findIndex(season => season.id === id);
    if (index >= 0) setSeason(index);
  });

  els.raceSelect?.addEventListener('change', event => {
    state.raceIndex = Number(event.target.value) || 0;
    renderRace();
  });

  tabButtons.forEach(button => {
    button.addEventListener('click', () => changeTab(button));
  });

  // Stat cards -> open modal with full list
  document.querySelectorAll('.stat-card--clickable').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.stat;
      if (!key) return;
      openStatModal(key, card.querySelector('h3')?.textContent || 'Stats');
    });
  });

  els.scheduleButton?.addEventListener('click', openScheduleModal);

  document.querySelectorAll('[data-schedule-close]').forEach(el => {
    el.addEventListener('click', closeScheduleModal);
  });

  // Modal close handlers
  document.querySelectorAll('[data-modal-close]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.modal?.getAttribute('aria-hidden') === 'false') closeModal();
      if (els.scheduleModal?.getAttribute('aria-hidden') === 'false') closeScheduleModal();
    }
  });
}

function closeNav() {
  if (!els.navToggle) return;
  els.navToggle.setAttribute('aria-expanded', 'false');
  els.nav?.classList.remove('is-open');
}

async function loadData() {
  try {
    const response = await fetch('data/seasons.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load seasons.json (${response.status})`);
    const payload = await response.json();
    state.seasons = Array.isArray(payload.seasons) ? payload.seasons : [];
    state.latestSeasonIndex = getLatestSeasonIndex();
  } catch (error) {
    console.error('Unable to load season data:', error);
  }
}

function populateSeasonControls() {
  if (!els.seasonSelect || !els.seasonPills) return;
  els.seasonSelect.innerHTML = '';
  els.seasonPills.innerHTML = '';
  state.seasonPills = [];

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
    state.seasonPills.push(button);
  });

  els.seasonSelect.appendChild(fragmentOptions);
  els.seasonPills.appendChild(fragmentPills);
}

function getLatestSeasonIndex() {
  if (!state.seasons.length) return 0;
  return state.seasons.reduce((latestIndex, season, index) => {
    const latestSeason = state.seasons[latestIndex];
    if (!latestSeason) return index;
    if ((season.year ?? 0) > (latestSeason.year ?? 0)) return index;
    if ((season.year ?? 0) === (latestSeason.year ?? 0) && index > latestIndex) return index;
    return latestIndex;
  }, 0);
}

function setSeason(index) {
  const season = state.seasons[index];
  if (!season) return;
  state.seasonIndex = index;
  state.driverById = new Map();
  state.driverByName = new Map();
  state.teamById = new Map();

  season.drivers?.forEach(driver => {
    state.driverById.set(driver.id, driver);
    state.driverByName.set(driver.name.toLowerCase(), driver);
    (driver.aliases || []).forEach(alias => {
      state.driverByName.set(alias.toLowerCase(), driver);
    });
  });

  season.teams?.forEach(team => {
    state.teamById.set(team.id, team);
  });

  state.raceIndex = getLatestRaceIndex(season);
  highlightSeasonControls(season.id);
  renderSeason(season);
}

function highlightSeasonControls(seasonId) {
  if (els.seasonSelect) {
    els.seasonSelect.value = seasonId;
  }
  state.seasonPills.forEach(button => {
    button.classList.toggle('is-active', button.dataset.seasonId === seasonId);
  });
}

function renderSeason(season) {
  renderHero(season);
  renderSeasonCard(season);
  renderDriverStandings(season);
  renderTeamStandings(season);
  populateRaceSelect(season);
  renderRace();
  renderStats(season);
}

function renderHero(season) {
  const {
    heroSeasonTitle,
    heroSeasonLabel,
    heroSeasonRounds,
    heroSeasonLeader,
    heroTeamLeader,
    heroRaceTitle,
    heroRaceMeta,
    heroPodium
  } = els;

  const rounds = season.races?.length ?? 0;
  const titleParts = [];
  if (season.label) titleParts.push(season.label);
  if (season.year) titleParts.push(season.year);
  heroSeasonTitle.textContent = titleParts.length ? titleParts.join(' • ') : 'Season Snapshot';

  const seasonLabelParts = [];
  if (season.year) seasonLabelParts.push(season.year);
  if (season.label) seasonLabelParts.push(season.label);
  heroSeasonLabel.textContent = seasonLabelParts.length ? seasonLabelParts.join(' · ') : '—';
  heroSeasonRounds.textContent = rounds === 1 ? '1 race' : `${rounds} races`;

  const sortedDrivers = [...(season.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const topDriver = sortedDrivers[0];
  heroSeasonLeader.textContent = topDriver ? `${topDriver.name} · ${topDriver.points ?? 0} pts` : '—';

  const teams = computeTeamStandings(season);
  const topTeam = teams[0];
  heroTeamLeader.textContent = topTeam ? `${topTeam.name} · ${topTeam.points ?? 0} pts` : '—';

  const latestRace = getLatestRace(season);
  if (!latestRace) {
    heroRaceTitle.textContent = 'Race Overview';
    heroRaceMeta.textContent = 'No races recorded yet.';
    heroPodium.innerHTML = '<p class="hero-podium__empty">Add a race to see the latest podium.</p>';
    return;
  }

  const raceLabel = deriveRaceLabel(latestRace) || latestRace.name || 'Race';
  heroRaceTitle.textContent = raceLabel;
  heroRaceMeta.textContent = formatRaceMeta(latestRace);
  heroPodium.innerHTML = renderPodium(latestRace);
}

function renderSeasonCard(season) {
  const { seasonCardYear, seasonCardTitle, seasonCardDescription, seasonCardRounds, seasonCard } = els;
  seasonCardYear.textContent = season.year ?? '—';
  seasonCardTitle.textContent = season.label ?? 'Season';
  seasonCardDescription.textContent = season.description ?? 'Season description coming soon.';
  const rounds = season.races?.length ?? 0;
  seasonCardRounds.textContent = rounds === 1 ? '1 race' : `${rounds} races`;

  if (season.primaryColor && season.primaryColor.startsWith('#')) {
    seasonCard.style.borderColor = withAlpha(season.primaryColor, 0.45);
    seasonCardRounds.style.background = withAlpha(season.primaryColor, 0.2);
    seasonCardRounds.style.color = season.primaryColor;
  } else {
    seasonCard.style.borderColor = 'var(--color-border)';
    seasonCardRounds.style.background = 'rgba(249, 115, 22, 0.2)';
    seasonCardRounds.style.color = 'var(--color-highlight)';
  }
}

function renderDriverStandings(season) {
  if (!els.driverTableBody) return;
  const driverRows = [...(season.drivers ?? [])]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .map(driver => {
      const team = driver.teamId ? state.teamById.get(driver.teamId) : null;
      const teamName = team?.name ?? '—';
      const color = sanitizeColor(driver.color);
      return `
        <tr>
          <td data-label="Driver">
            <div class="driver-cell">
              <span class="driver-color" style="background:${color};"></span>
              <span>${driver.name}</span>
            </div>
          </td>
          <td data-label="Team">${teamName}</td>
          <td class="column--points" data-label="Points">${driver.points ?? 0}</td>
        </tr>
      `;
    })
    .join('');

  els.driverTableBody.innerHTML = driverRows || `
    <tr><td colspan="3">No driver data yet. Add drivers to <code>data/seasons.json</code>.</td></tr>
  `;
}

function renderTeamStandings(season) {
  if (!els.teamTableBody) return;
  const teams = computeTeamStandings(season);
  const rows = teams
    .map(team => {
      const driverList = team.drivers.map(driver => `<span class="team-chip">${driver.name}</span>`).join('');
      return `
        <tr>
          <td data-label="Team">
            <span class="team-color" style="background:${sanitizeColor(team.color)};"></span>
            ${team.name}
          </td>
          <td data-label="Drivers"><div class="team-driver-list">${driverList}</div></td>
          <td class="column--points" data-label="Points">${team.points}</td>
        </tr>
      `;
    })
    .join('');

  els.teamTableBody.innerHTML = rows || `
    <tr><td colspan="3">No team data yet. Update the season entry in <code>data/seasons.json</code>.</td></tr>
  `;
}

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

function getLatestRace(season) {
  const races = season.races ?? [];
  if (!races.length) return null;

  const racesWithDates = races.filter(race => race?.schedule?.date);
  if (racesWithDates.length) {
    return racesWithDates
      .slice()
      .sort((a, b) => new Date(a.schedule.date) - new Date(b.schedule.date))
      .at(-1);
  }

  return races.at(-1) ?? null;
}

function getLatestRaceIndex(season) {
  const races = season.races ?? [];
  if (!races.length) return 0;
  const latestRace = getLatestRace(season);
  if (!latestRace) return 0;

  const matchIndex = races.findIndex(race => race === latestRace || (race.id && latestRace.id && race.id === latestRace.id));
  return matchIndex >= 0 ? matchIndex : Math.max(races.length - 1, 0);
}

function formatRaceMeta(race) {
  const dateText = race.schedule?.date
    ? intlDate.format(new Date(race.schedule.date))
    : 'Date TBD';
  const venue = race.schedule?.venue ?? 'Venue TBD';
  return `${dateText} • ${venue}`;
}

function renderPodium(race) {
  const podiumResults = (race.results ?? [])
    .filter(result => typeof result.position === 'number')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .slice(0, 3);

  if (!podiumResults.length) {
    return '<p class="hero-podium__empty">Add finishing positions to display the podium.</p>';
  }

  const podiumClasses = ['first', 'second', 'third'];
  return podiumResults.map((result, index) => {
    const rawName = result.driver ?? `Driver ${result.position ?? index + 1}`;
    const driverRecord = result.driverId
      ? state.driverById.get(result.driverId)
      : state.driverByName.get(rawName.toLowerCase());
    const color = sanitizeColor(driverRecord?.color);
    const points = typeof result.points === 'number' ? `${result.points} pts` : '— pts';
    const entrant = result.entrant && result.entrant !== rawName
      ? `<span class="podium__entrant">Entrant: ${result.entrant}</span>`
      : '';
    const guest = result.isGuest
      ? `<span class="podium__entrant">Guest driver</span>`
      : '';

    return `
      <div class="podium podium--${podiumClasses[index] ?? 'other'}">
        <span class="podium__rank">#${result.position ?? index + 1}</span>
        <div class="podium__meta">
          <span class="podium__name">
            <span class="podium__dot" style="background:${color};"></span>
            ${rawName}
          </span>
          <span class="podium__points">${points}</span>
          ${entrant}
          ${guest}
        </div>
      </div>
    `;
  }).join('');
}

function populateRaceSelect(season) {
  if (!els.raceSelect) return;
  els.raceSelect.innerHTML = '';
  const races = season.races ?? [];
  races.forEach((race, index) => {
    const option = document.createElement('option');
    option.value = index.toString();
    option.textContent = `Round ${race.round ?? index + 1}: ${deriveRaceLabel(race)}`;
    els.raceSelect.appendChild(option);
  });
  els.raceSelect.disabled = races.length === 0;
  if (races.length > 0) {
    const selectedIndex = Math.min(state.raceIndex, races.length - 1);
    state.raceIndex = selectedIndex;
    els.raceSelect.value = selectedIndex.toString();
  }
}

function renderRace() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const races = season.races ?? [];
  const race = races[state.raceIndex] ?? races[0];

  if (!race) {
    renderEmptyRace();
    return;
  }

  els.raceRoundLabel.textContent = `Round ${race.round ?? state.raceIndex + 1}`;
  els.raceTitle.textContent = race.name ?? 'Race';
  els.raceVenue.textContent = race.schedule?.venue ?? 'Venue —';
  els.raceDate.textContent = race.schedule?.date ? intlDate.format(new Date(race.schedule.date)) : 'Date TBD';
  els.raceCar.textContent = race.settings?.carClass ?? '—';
  els.raceWeather.textContent = race.settings?.weather ?? '—';
  els.raceLaps.textContent = race.settings?.laps ?? '—';
  els.raceNotes.textContent = race.settings?.notes ?? '—';

  if (race.trackImage) {
    els.raceTrackImage.src = race.trackImage;
    els.raceTrackImage.alt = `${race.name} track preview`;
  } else {
    els.raceTrackImage.removeAttribute('src');
    els.raceTrackImage.alt = 'Track preview unavailable';
  }

  renderRaceResults(race);
}

function renderEmptyRace() {
  els.raceRoundLabel.textContent = 'Round —';
  els.raceTitle.textContent = 'No races yet';
  els.raceVenue.textContent = 'Add a race to see the full breakdown.';
  els.raceDate.textContent = 'Date —';
  els.raceCar.textContent = '—';
  els.raceWeather.textContent = '—';
  els.raceLaps.textContent = '—';
  els.raceNotes.textContent = '—';
  els.raceTrackImage.removeAttribute('src');
  els.raceTrackImage.alt = 'Track preview unavailable';
  els.raceResultsBody.innerHTML = '<tr><td colspan="5">No race results yet.</td></tr>';
}

function renderRaceResults(race) {
  if (!els.raceResultsBody) return;
  const rows = (race.results ?? []).map(result => {
    const displayName = result.driver ?? 'Unknown';
    const driverRecord = result.driverId
      ? state.driverById.get(result.driverId)
      : state.driverByName.get(displayName.toLowerCase());
    const color = sanitizeColor(driverRecord?.color);
    const noteParts = [];
    if (result.entrant && result.entrant !== displayName) noteParts.push(`Entrant: ${result.entrant}`);
    if (result.isGuest) noteParts.push('Guest driver');
    const note = noteParts.length ? `<span class="driver-note">${noteParts.join(' • ')}</span>` : '';
    return `
      <tr>
        <td data-label="Pos">${result.position ?? '—'}</td>
        <td data-label="Driver">
          <div class="driver-cell">
            <span class="driver-color" style="background:${color};"></span>
            <div>
              <span>${displayName}</span>
              ${note}
            </div>
          </div>
        </td>
        <td data-label="Points">${result.points ?? '—'}</td>
        <td class="column--hide-sm" data-label="Car">${result.car ?? '—'}</td>
        <td class="column--hide-sm" data-label="Fastest Lap">${result.fastestLap ?? '—'}</td>
      </tr>
    `;
  }).join('');

  els.raceResultsBody.innerHTML = rows || '<tr><td colspan="5">No results recorded for this race.</td></tr>';
}

function renderStats(season) {
  const stats = computeStats(season);
  els.statsWins.innerHTML = renderStatList(stats.wins, 'wins');
  els.statsPodiums.innerHTML = renderStatList(stats.podiums, 'podiums');
  els.statsAveragePoints.innerHTML = renderStatList(stats.avgPoints, 'pts', value => `${value.toFixed(1)} pts`);
  els.statsAveragePlacement.innerHTML = renderPlacementColumns(stats.avgPlacement);
}

// Build full, unsliced stats for modal
function computeStatsRaw(season) {
  const base = {
    wins: new Map(),
    podiums: new Map(),
    avgPoints: new Map(),
    avgPlacement: new Map(),
    raceCount: new Map(),
    // team aggregates
    teamWins: new Map(),
    teamPodiums: new Map(),
    teamAvgPoints: new Map(), // teamId -> { total, races }
    teamAvgPlacement: new Map() // teamId -> { total, races }
  };

  (season.races ?? []).forEach(race => {
    (race.results ?? []).forEach(result => {
      if (!result.driverId) return;
      const driverId = result.driverId;
      base.raceCount.set(driverId, (base.raceCount.get(driverId) ?? 0) + 1);
    });
  });

  const eligibleDrivers = new Set(
    Array.from(base.raceCount.entries())
      .filter(([, count]) => count >= 3)
      .map(([driverId]) => driverId)
  );

  (season.races ?? []).forEach(race => {
    (race.results ?? []).forEach(result => {
      const driverId = result.driverId;
      if (!driverId || !eligibleDrivers.has(driverId)) return;

      const driver = state.driverById.get(driverId);
      const teamId = driver?.teamId;

      if (result.position === 1) {
        base.wins.set(driverId, (base.wins.get(driverId) ?? 0) + 1);
        if (teamId) base.teamWins.set(teamId, (base.teamWins.get(teamId) ?? 0) + 1);
      }
      if ((result.position ?? 0) > 0 && result.position <= 3) {
        base.podiums.set(driverId, (base.podiums.get(driverId) ?? 0) + 1);
        if (teamId) base.teamPodiums.set(teamId, (base.teamPodiums.get(teamId) ?? 0) + 1);
      }

      if (typeof result.points === 'number') {
        const current = base.avgPoints.get(driverId) ?? { total: 0, races: 0 };
        current.total += result.points;
        current.races += 1;
        base.avgPoints.set(driverId, current);

        if (teamId) {
          const t = base.teamAvgPoints.get(teamId) ?? { total: 0, races: 0 };
          t.total += result.points;
          t.races += 1;
          base.teamAvgPoints.set(teamId, t);
        }
      }

      if (typeof result.position === 'number') {
        const placement = base.avgPlacement.get(driverId) ?? { total: 0, races: 0 };
        placement.total += result.position;
        placement.races += 1;
        base.avgPlacement.set(driverId, placement);

        if (teamId) {
          const t = base.teamAvgPlacement.get(teamId) ?? { total: 0, races: 0 };
          t.total += result.position;
          t.races += 1;
          base.teamAvgPlacement.set(teamId, t);
        }
      }
    });
  });

  const avgPointsFinal = new Map();
  base.avgPoints.forEach((value, driverId) => {
    avgPointsFinal.set(driverId, value.races ? value.total / value.races : 0);
  });

  const avgPlacementFinal = new Map();
  base.avgPlacement.forEach((value, driverId) => {
    avgPlacementFinal.set(driverId, value.races ? value.total / value.races : 0);
  });

  const teamAvgPointsFinal = new Map();
  base.teamAvgPoints.forEach((value, teamId) => {
    teamAvgPointsFinal.set(teamId, value.races ? value.total / value.races : 0);
  });

  const teamAvgPlacementFinal = new Map();
  base.teamAvgPlacement.forEach((value, teamId) => {
    teamAvgPlacementFinal.set(teamId, value.races ? value.total / value.races : 0);
  });

  return {
    wins: sortStatMapFull(base.wins),
    podiums: sortStatMapFull(base.podiums),
    avgPoints: sortStatMapFull(avgPointsFinal),
    avgPlacement: sortStatMapFull(avgPlacementFinal, true),
    teams: {
      wins: sortStatMapFull(base.teamWins),
      podiums: sortStatMapFull(base.teamPodiums),
      avgPoints: sortStatMapFull(teamAvgPointsFinal),
      avgPlacement: sortStatMapFull(teamAvgPlacementFinal, true)
    }
  };
}

function computeStats(season) {
  const stats = {
    wins: new Map(),
    podiums: new Map(),
    avgPoints: new Map(),
    avgPlacement: new Map(),
    raceCount: new Map()
  };

  (season.races ?? []).forEach(race => {
    (race.results ?? []).forEach(result => {
      if (!result.driverId) return;
      const driverId = result.driverId;
      stats.raceCount.set(driverId, (stats.raceCount.get(driverId) ?? 0) + 1);
    });
  });

  const eligibleDrivers = new Set(
    Array.from(stats.raceCount.entries())
      .filter(([, count]) => count >= 3)
      .map(([driverId]) => driverId)
  );

  (season.races ?? []).forEach(race => {
    (race.results ?? []).forEach(result => {
      const driverId = result.driverId;
      if (!driverId || !eligibleDrivers.has(driverId)) return;

      if (result.position === 1) {
        stats.wins.set(driverId, (stats.wins.get(driverId) ?? 0) + 1);
      }
      if ((result.position ?? 0) > 0 && result.position <= 3) {
        stats.podiums.set(driverId, (stats.podiums.get(driverId) ?? 0) + 1);
      }

      if (typeof result.points === 'number') {
        const current = stats.avgPoints.get(driverId) ?? { total: 0, races: 0 };
        current.total += result.points;
        current.races += 1;
        stats.avgPoints.set(driverId, current);
      }

      if (typeof result.position === 'number') {
        const placement = stats.avgPlacement.get(driverId) ?? { total: 0, races: 0 };
        placement.total += result.position;
        placement.races += 1;
        stats.avgPlacement.set(driverId, placement);
      }
    });
  });

  const avgPointsFinal = new Map();
  stats.avgPoints.forEach((value, driverId) => {
    avgPointsFinal.set(driverId, value.races ? value.total / value.races : 0);
  });

  const avgPlacementFinal = new Map();
  stats.avgPlacement.forEach((value, driverId) => {
    avgPlacementFinal.set(driverId, value.races ? value.total / value.races : 0);
  });

  return {
    wins: sortStatMap(stats.wins),
    podiums: sortStatMap(stats.podiums),
    avgPoints: sortStatMap(avgPointsFinal),
    avgPlacement: sortStatMap(avgPlacementFinal, true)
  };
}

function sortStatMap(statMap, ascending = false) {
  return Array.from(statMap.entries())
    .sort(([, a], [, b]) => ascending ? a - b : b - a)
    .slice(0, 5);
}

function sortStatMapFull(statMap, ascending = false) {
  return Array.from(statMap.entries())
    .sort(([, a], [, b]) => ascending ? a - b : b - a);
}

function renderStatList(entries, suffix, formatValue) {
  if (!entries.length) {
    return '<p class="stat-empty">Need at least 3 races to generate stats.</p>';
  }

  return entries.map(([driverId, value]) => {
    const driver = state.driverById.get(driverId);
    if (!driver) return '';
    const displayValue = typeof formatValue === 'function' ? formatValue(value) : `${value} ${suffix}`;
    return `
      <div class="stat-item">
        <span class="stat-item__label">
          <span class="stat-dot" style="background:${sanitizeColor(driver.color)};"></span>
          ${driver.name}
        </span>
        <span class="stat-item__value">${displayValue}</span>
      </div>
    `;
  }).join('');
}

function renderPlacementColumns(entries) {
  if (!entries.length) {
    return '<p class="stat-empty">Placement stats unlock after 3 races per driver.</p>';
  }

  return `
    <div class="stat-columns">
      ${entries.map(([driverId, value]) => {
        const driver = state.driverById.get(driverId);
        if (!driver) return '';
        return `
          <div class="stat-item">
            <span class="stat-item__label">
              <span class="stat-dot" style="background:${sanitizeColor(driver.color)};"></span>
              ${driver.name}
            </span>
            <span class="stat-item__value">${value.toFixed(1)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function deriveRaceLabel(race) {
  if (!race?.name) return 'Untitled';
  const parts = race.name.split(':').map(part => part.trim());
  return parts.length > 1 ? parts.slice(1).join(': ') : parts[0];
}

function sanitizeColor(color) {
  if (!color) return 'rgba(148, 163, 184, 0.45)';
  return color;
}

function openStatModal(statKey, titleText) {
  const season = state.seasons[state.seasonIndex];
  if (!season || !els.modal || !els.modalTitle || !els.modalList) return;

  // Title
  els.modalTitle.textContent = titleText;

  // Build list contents from raw stats
  const all = computeStatsRaw(season);
  let driverEntries = [];
  let teamEntries = [];
  let formatter = (v) => v;
  let suffix = '';

  switch (statKey) {
    case 'wins':
      driverEntries = all.wins;
      teamEntries = all.teams.wins;
      suffix = 'wins';
      break;
    case 'podiums':
      driverEntries = all.podiums;
      teamEntries = all.teams.podiums;
      suffix = 'podiums';
      break;
    case 'avgPoints':
      driverEntries = all.avgPoints;
      teamEntries = all.teams.avgPoints;
      suffix = 'pts';
      formatter = (v) => `${v.toFixed(1)} pts`;
      break;
    case 'avgPlacement':
      driverEntries = all.avgPlacement;
      teamEntries = all.teams.avgPlacement;
      suffix = '';
      formatter = (v) => v.toFixed(1);
      break;
    default:
      driverEntries = [];
      teamEntries = [];
  }

  const driverTable = renderStatTable(driverEntries, 'driver', suffix, formatter);
  const teamTable = renderStatTable(teamEntries, 'team', suffix, formatter);

  els.modalList.innerHTML = `
    <div class="modal__grid">
      <section class="modal__section">
        <h4>Drivers</h4>
        ${driverTable}
      </section>
      <section class="modal__section">
        <h4>Teams</h4>
        ${teamTable}
      </section>
    </div>
  `;

  // Open
  els.modal.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
}

function closeModal() {
  if (!els.modal) return;
  els.modal.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
}

function openScheduleModal() {
  if (!els.scheduleModal) return;
  if (!state.scheduleRendered) {
    renderFallSchedule();
    state.scheduleRendered = true;
  }
  els.scheduleModal.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
}

function closeScheduleModal() {
  if (!els.scheduleModal) return;
  els.scheduleModal.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
}

function renderFallSchedule() {
  if (els.scheduleRules) {
    els.scheduleRules.innerHTML = FALL_2025_RULES.map(rule => `<li>${rule}</li>`).join('');
  }

  if (!els.scheduleList) return;

  let roundCounter = 0;
  const items = FALL_2025_SCHEDULE.map(event => {
    if (event.type === 'break') {
      const description = event.description ? `<p class="schedule-event__break-note">${event.description}</p>` : '';
      return `
        <li class="schedule-event schedule-event--break">
          <div class="schedule-event__break-title">${event.title}</div>
          ${description}
        </li>
      `;
    }

    roundCounter += 1;
    const date = event.date ? new Date(event.date) : null;
    const formattedDate = date ? scheduleDateFormatter.format(date) : '';
    const lapsText = typeof event.laps === 'number' ? `${event.laps} Laps` : event.laps;
    const datetimeAttr = event.date ?? '';

    return `
      <li class="schedule-event">
        <div class="schedule-event__header">
          <span class="schedule-event__round">Round ${roundCounter}</span>
          <time datetime="${datetimeAttr}">${formattedDate}</time>
        </div>
        <h4 class="schedule-event__track">${event.track}</h4>
        <ul class="schedule-event__meta">
          <li><span>Car</span>${event.car}</li>
          <li><span>Laps</span>${lapsText}</li>
        </ul>
      </li>
    `;
  }).join('');

  els.scheduleList.innerHTML = items;
}

function lockBodyScroll() {
  document.body.classList.add('is-modal-open');
}

function unlockBodyScroll() {
  if (!isAnyModalOpen()) {
    document.body.classList.remove('is-modal-open');
  }
}

function isAnyModalOpen() {
  const statsOpen = els.modal?.getAttribute('aria-hidden') === 'false';
  const scheduleOpen = els.scheduleModal?.getAttribute('aria-hidden') === 'false';
  return Boolean(statsOpen || scheduleOpen);
}

function renderStatTable(entries, kind, suffix, formatValue) {
  if (!entries.length) {
    return '<p class="stat-empty">No eligible data yet (need 3 races).</p>';
  }

  const headerName = kind === 'team' ? 'Team' : 'Driver';
  const rows = entries.map(([id, value], idx) => {
    if (kind === 'team') {
      const team = state.teamById.get(id);
      if (!team) return '';
      const valueText = typeof formatValue === 'function'
        ? formatValue(value)
        : (suffix ? `${value} ${suffix}` : String(value));
      return `
        <tr>
          <td class="col-rank">${idx + 1}</td>
          <td>
            <div class="driver-cell">
              <span class="team-color" style="background:${sanitizeColor(team.color)};"></span>
              ${team.name}
            </div>
          </td>
          <td class="column--points">${valueText}</td>
        </tr>
      `;
    } else {
      const driver = state.driverById.get(id);
      if (!driver) return '';
      const valueText = typeof formatValue === 'function'
        ? formatValue(value)
        : (suffix ? `${value} ${suffix}` : String(value));
      return `
        <tr>
          <td class="col-rank">${idx + 1}</td>
          <td>
            <div class="driver-cell">
              <span class="driver-color" style="background:${sanitizeColor(driver.color)};"></span>
              ${driver.name}
            </div>
          </td>
          <td class="column--points">${valueText}</td>
        </tr>
      `;
    }
  }).join('');

  return `
    <div class="table-wrapper">
      <table class="data-table modal-table" aria-label="${headerName} ${suffix || ''} stats">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">${headerName}</th>
            <th scope="col" class="column--points">${suffix || 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function changeTab(activeButton) {
  tabButtons.forEach(button => {
    button.classList.toggle('is-active', button === activeButton);
    button.setAttribute('aria-selected', button === activeButton ? 'true' : 'false');
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle('is-active', panel.id === `tab-${activeButton.dataset.tab}`);
  });
}

function updateFooter() {
  if (els.footerYear) {
    els.footerYear.textContent = new Date().getFullYear();
  }
}

init();
