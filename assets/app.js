const state = {
  seasons: [],
  seasonIndex: 0,
  raceIndex: 0,
  seasonPills: [],
  driverById: new Map(),
  driverByName: new Map(),
  teamById: new Map(),
  latestSeasonIndex: 0,
  scheduleRendered: false,
  // Inline Chart.js charts (homepage + mobile stats)
  _statCharts: [],
  _chartJsConfigured: false,
  // Embedded analytics (full dashboard on stats section)
  analytics: {
    mounted: false,
    currentRace: null, // through race N
    maxRaces: 0,
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
    els: {}
  },
  // Mobile analytics (mobile stats view)
  mobileAnalytics: {
    mounted: false,
    currentRace: null,
    maxRaces: 0,
    charts: {
      points: null,
      pointsGap: null,
      position: null,
      podium: null,
      trend: null,
      h2h: null,
      fastestLap: null
    },
    els: {}
  },
  // Performance helpers
  _seasonRenderKey: '',
  _rendered: {
    drivers: false,
    teams: false,
    stats: false
  },
  _teamStandingsCache: null,
  _observersReady: false,
  isMobile: false,
  mobileView: 'home',
  mobileStandingsMode: 'drivers'
};

// Robust scroll locking for modals (prevents iOS "background scroll").
const scrollLock = {
  locked: false,
  x: 0,
  y: 0,
  scrollbarGap: 0,
  touchX: 0,
  touchY: 0,
  handlersAttached: false
};

function getModalPanelFromEventTarget(target) {
  if (!(target instanceof Element)) return null;
  return target.closest('.modal__panel');
}

function isPanXAllowedTarget(target) {
  if (!(target instanceof Element)) return false;
  // Allow horizontal swiping in explicit horizontal scrollers (ex: modal tables).
  return Boolean(target.closest('.table-wrapper'));
}

function modalScrollGuardWheel(event) {
  if (!scrollLock.locked) return;

  const panel = getModalPanelFromEventTarget(event.target);
  if (!panel) {
    event.preventDefault();
    return;
  }

  // Prevent scroll chaining at the panel boundaries.
  const deltaY = typeof event.deltaY === 'number' ? event.deltaY : 0;
  if (deltaY === 0) return;
  const atTop = panel.scrollTop <= 0;
  const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1;
  if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
    event.preventDefault();
  }
}

function modalScrollGuardTouchStart(event) {
  if (!scrollLock.locked) return;
  if (!event.touches || event.touches.length !== 1) return;
  scrollLock.touchX = event.touches[0].clientX;
  scrollLock.touchY = event.touches[0].clientY;
}

function modalScrollGuardTouchMove(event) {
  if (!scrollLock.locked) return;
  if (!event.touches || event.touches.length !== 1) return;

  const panel = getModalPanelFromEventTarget(event.target);
  if (!panel) {
    // Block background scroll (especially iOS rubber-banding).
    event.preventDefault();
    return;
  }

  const currentX = event.touches[0].clientX;
  const currentY = event.touches[0].clientY;
  const deltaX = currentX - scrollLock.touchX;
  const deltaY = currentY - scrollLock.touchY;
  scrollLock.touchX = currentX;
  scrollLock.touchY = currentY;

  // If the gesture is primarily horizontal and it's not an allowed horizontal scroller,
  // block it so the report feels "locked" left/right.
  if (!isPanXAllowedTarget(event.target) && Math.abs(deltaX) > Math.abs(deltaY) + 2) {
    event.preventDefault();
    return;
  }

  // Prevent scroll chaining at the panel boundaries.
  const atTop = panel.scrollTop <= 0;
  const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1;
  if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
    event.preventDefault();
  }
}

function attachModalScrollGuards() {
  if (scrollLock.handlersAttached) return;
  // Capture + non-passive so we can preventDefault on iOS/Safari.
  document.addEventListener('wheel', modalScrollGuardWheel, { passive: false, capture: true });
  document.addEventListener('touchstart', modalScrollGuardTouchStart, { passive: false, capture: true });
  document.addEventListener('touchmove', modalScrollGuardTouchMove, { passive: false, capture: true });
  scrollLock.handlersAttached = true;
}

function detachModalScrollGuards() {
  if (!scrollLock.handlersAttached) return;
  document.removeEventListener('wheel', modalScrollGuardWheel, true);
  document.removeEventListener('touchstart', modalScrollGuardTouchStart, true);
  document.removeEventListener('touchmove', modalScrollGuardTouchMove, true);
  scrollLock.handlersAttached = false;
}

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

const elsMobile = {
  app: document.getElementById('m-app'),
  seasonSelect: document.getElementById('m-season-select'),
  hero: document.getElementById('m-hero'),
  standingsList: document.getElementById('m-standings-list'),
  standingsTabs: Array.from(document.querySelectorAll('[data-m-standings]')),
  raceSelect: document.getElementById('m-race-select'),
  raceCard: document.getElementById('m-race-card'),
  raceResults: document.getElementById('m-race-results'),
  statsGrid: document.getElementById('m-stats-grid'),
  seasonList: document.getElementById('m-season-list'),
  viewTriggers: Array.from(document.querySelectorAll('[data-m-view]')),
  navButtons: Array.from(document.querySelectorAll('.m-bottom-nav .m-nav-btn[data-m-view]')),
  openSchedule: document.getElementById('m-open-schedule')
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
    car: "GT-R GT500 '16",
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

const STORAGE_KEY = 'cetla.seasons.cache.v1';

function scheduleIdle(work) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => work(), { timeout: 800 });
    return;
  }
  window.setTimeout(work, 1);
}

function getActiveStandingsTab() {
  const active = document.querySelector('.tabs__button.is-active');
  const key = active?.dataset?.tab;
  return key === 'teams' ? 'teams' : 'drivers';
}

function getSeasonRenderKey(season) {
  // Keep this cheap: ID + race count is enough to avoid redundant rerenders.
  const id = season?.id ?? '';
  const rounds = season?.races?.length ?? 0;
  return `${id}::${rounds}`;
}

function loadCachedSeasons() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!cached || !cached.payload || !Array.isArray(cached.payload.seasons)) return false;
    state.seasons = cached.payload.seasons;
    state.latestSeasonIndex = getLatestSeasonIndex();
    return Boolean(state.seasons.length);
  } catch {
    return false;
  }
}

function persistCachedSeasons(payload, headers) {
  try {
    const etag = headers?.get?.('etag') ?? null;
    const lastModified = headers?.get?.('last-modified') ?? null;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        etag,
        lastModified,
        savedAt: Date.now(),
        payload
      })
    );
  } catch {
    // ignore storage quota / serialization errors
  }
}

function getCachedValidators() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { etag: null, lastModified: null };
    const cached = JSON.parse(raw);
    return {
      etag: cached?.etag ?? null,
      lastModified: cached?.lastModified ?? null
    };
  } catch {
    return { etag: null, lastModified: null };
  }
}

async function init() {
  attachUIHandlers();
  updateFooter();
  state.isMobile = Boolean(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
  syncAriaForMobile();

  const usedCache = loadCachedSeasons();

  if (!usedCache) {
    await loadData();
  } else {
    // Refresh in background (ETag / Last-Modified) without blocking first paint.
    refreshDataInBackground();
  }

  if (!state.seasons.length) {
    console.warn('No seasons loaded from data file.');
    return;
  }

  populateSeasonControls();
  const initialIndex = Number.isInteger(state.latestSeasonIndex) ? state.latestSeasonIndex : 0;
  setSeason(initialIndex);
  setupSectionObservers();
}

function syncAriaForMobile() {
  const desktopMain = document.querySelector('main#top');
  const desktopHeader = document.querySelector('.site-header');
  const desktopFooter = document.querySelector('.site-footer');
  const value = state.isMobile ? 'true' : 'false';
  desktopMain?.setAttribute('aria-hidden', value);
  desktopHeader?.setAttribute('aria-hidden', value);
  desktopFooter?.setAttribute('aria-hidden', value);
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

  // Desktop standings: click a driver row to open driver report
  els.driverTableBody?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest('[data-driver-id]');
    const driverId = row?.getAttribute('data-driver-id');
    if (!driverId) return;
    openDriverReportModal(driverId);
  });

  // Mobile standings: click a driver row to open driver report
  elsMobile.standingsList?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest('[data-driver-id]');
    const driverId = row?.getAttribute('data-driver-id');
    if (!driverId) return;
    openDriverReportModal(driverId);
  });

  els.scheduleButton?.addEventListener('click', openScheduleModal);
  elsMobile.openSchedule?.addEventListener('click', openScheduleModal);

  // Mobile nav
  elsMobile.viewTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.mView;
      if (!view) return;
      setMobileView(view);
    });
  });

  // Mobile season selector
  elsMobile.seasonSelect?.addEventListener('change', event => {
    const id = event.target.value;
    const index = state.seasons.findIndex(season => season.id === id);
    if (index >= 0) setSeason(index);
  });

  // Mobile standings mode toggle
  elsMobile.standingsTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mStandings;
      if (!mode) return;
      state.mobileStandingsMode = mode === 'teams' ? 'teams' : 'drivers';
      updateMobileStandingsTabs();
      renderMobileStandings(state.seasons[state.seasonIndex]);
    });
  });

  // Mobile race selector
  elsMobile.raceSelect?.addEventListener('change', event => {
    state.raceIndex = Number(event.target.value) || 0;
    renderMobileRace();
  });

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
    const validators = getCachedValidators();
    const headers = {};
    if (validators.etag) headers['If-None-Match'] = validators.etag;
    if (validators.lastModified) headers['If-Modified-Since'] = validators.lastModified;

    // `no-cache` allows the browser to reuse cache but revalidate when needed.
    const response = await fetch('data/seasons.json', { cache: 'no-cache', headers });
    if (response.status === 304) {
      // Cached payload is already in memory (from loadCachedSeasons) or will be refetched next time.
      if (!state.seasons.length) loadCachedSeasons();
      state.latestSeasonIndex = getLatestSeasonIndex();
      return false;
    }
    if (!response.ok) throw new Error(`Failed to load seasons.json (${response.status})`);

    const payload = await response.json();
    state.seasons = Array.isArray(payload.seasons) ? payload.seasons : [];
    state.latestSeasonIndex = getLatestSeasonIndex();
    persistCachedSeasons(payload, response.headers);
    return true;
  } catch (error) {
    console.error('Unable to load season data:', error);
    return false;
  }
}

async function refreshDataInBackground() {
  try {
    const beforeId = state.seasons[state.seasonIndex]?.id ?? null;
    const updated = await loadData();
    if (!updated) return;
    if (!state.seasons.length) return;

    // If the season list changed, keep current season by ID if possible.
    const matchIndex = beforeId ? state.seasons.findIndex(season => season.id === beforeId) : -1;
    const nextIndex = matchIndex >= 0 ? matchIndex : (Number.isInteger(state.latestSeasonIndex) ? state.latestSeasonIndex : 0);

    populateSeasonControls();
    setSeason(nextIndex);
  } catch {
    // ignore background refresh failures
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

  // Mobile: season select + list
  if (elsMobile.seasonSelect) {
    elsMobile.seasonSelect.innerHTML = '';
    const frag = document.createDocumentFragment();
    state.seasons.forEach(season => {
      const opt = document.createElement('option');
      opt.value = season.id;
      opt.textContent = season.year ? `${season.year} · ${season.label}` : season.label;
      frag.appendChild(opt);
    });
    elsMobile.seasonSelect.appendChild(frag);
  }

  if (elsMobile.seasonList) {
    elsMobile.seasonList.innerHTML = '';
    const frag = document.createDocumentFragment();
    state.seasons.forEach((season, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'season-pill';
      btn.textContent = season.year ? `${season.year} · ${season.label}` : season.label;
      btn.addEventListener('click', () => {
        setSeason(index);
        setMobileView('home');
      });
      frag.appendChild(btn);
    });
    elsMobile.seasonList.appendChild(frag);
  }
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
  state._teamStandingsCache = null;

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
  state._seasonRenderKey = getSeasonRenderKey(season);
  state._rendered = { drivers: false, teams: false, stats: false };
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

  if (elsMobile.seasonSelect) {
    elsMobile.seasonSelect.value = seasonId;
  }
}

function renderSeason(season) {
  renderHero(season);
  renderSeasonCard(season);
  populateRaceSelect(season);
  renderRace();

  // Lightweight placeholders to avoid blank sections while we defer work.
  if (els.driverTableBody) els.driverTableBody.innerHTML = '<tr><td colspan="4">Loading standings…</td></tr>';
  if (els.teamTableBody) els.teamTableBody.innerHTML = '<tr><td colspan="4">Loading standings…</td></tr>';
  if (els.statsWins) els.statsWins.innerHTML = '<p class="stat-empty">Loading stats…</p>';
  if (els.statsPodiums) els.statsPodiums.innerHTML = '';
  if (els.statsAveragePoints) els.statsAveragePoints.innerHTML = '';
  if (els.statsAveragePlacement) els.statsAveragePlacement.innerHTML = '';
  destroyEmbeddedAnalyticsCharts();
  setEmbeddedAnalyticsSeason(season);

  // Defer expensive work until after first paint / when section is visible.
  scheduleIdle(() => renderDeferredSectionsIfVisible());

  if (state.isMobile) {
    renderMobile(season);
  }
}

function setMobileView(view) {
  state.mobileView = view;
  // Mark active view
  document.querySelectorAll('.m-view').forEach(section => {
    section.classList.toggle('is-active', section.dataset.view === view);
  });
  // Mark active nav buttons
  elsMobile.navButtons.forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mView === view);
  });

  const season = state.seasons[state.seasonIndex];
  if (!season) return;
  if (view === 'standings') renderMobileStandings(season);
  if (view === 'race') renderMobileRace();
  if (view === 'stats') renderMobileStats(season);
}

function updateMobileStandingsTabs() {
  elsMobile.standingsTabs.forEach(btn => {
    const mode = btn.dataset.mStandings === 'teams' ? 'teams' : 'drivers';
    const active = mode === state.mobileStandingsMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function renderMobile(season) {
  renderMobileHero(season);
  populateMobileRaceSelect(season);
  updateMobileStandingsTabs();
  // Render only what’s needed for current view (fast)
  if (state.mobileView === 'standings') renderMobileStandings(season);
  if (state.mobileView === 'race') renderMobileRace();
  if (state.mobileView === 'stats') renderMobileStats(season);
}

function renderMobileHero(season) {
  if (!elsMobile.hero) return;
  const rounds = season.races?.length ?? 0;
  const sortedDrivers = [...(season.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const leader = sortedDrivers[0];
  const teams = computeTeamStandings(season);
  const topTeam = teams[0];
  const latestRace = getLatestRace(season);
  const raceLabel = latestRace ? (deriveRaceLabel(latestRace) || latestRace.name || 'Race') : 'No races yet';
  const seasonAccent = season.primaryColor && season.primaryColor.startsWith('#') ? season.primaryColor : '#38bdf8';

  elsMobile.hero.innerHTML = `
    <div class="m-hero__top">
      <span class="m-pill" style="background:${withAlpha(seasonAccent, 0.16)}; border-color:${withAlpha(seasonAccent, 0.32)}; color:${seasonAccent};">
        ${escapeHtml(season.year ?? 'Season')}
      </span>
      <h1>${escapeHtml(season.label ?? 'Season')}</h1>
    </div>
    <div class="m-hero__meta">
      <div class="m-meta">
        <div class="m-meta__k">Rounds</div>
        <div class="m-meta__v">${rounds ? `${rounds}` : '—'}</div>
      </div>
      <div class="m-meta">
        <div class="m-meta__k">Top driver</div>
        <div class="m-meta__v">
          ${leader ? `<span class="m-dot" style="background:${sanitizeColor(leader.color)};"></span>${escapeHtml(leader.name)} <span class="m-soft">(${leader.points ?? 0})</span>` : '—'}
        </div>
      </div>
      <div class="m-meta">
        <div class="m-meta__k">Top team</div>
        <div class="m-meta__v">
          ${topTeam ? `<span class="m-dot" style="background:${sanitizeColor(topTeam.color)};"></span>${escapeHtml(topTeam.name)} <span class="m-soft">(${topTeam.points ?? 0})</span>` : '—'}
        </div>
      </div>
      <div class="m-meta">
        <div class="m-meta__k">Latest race</div>
        <div class="m-meta__v">${escapeHtml(latestRace ? raceLabel : '—')}</div>
      </div>
    </div>
  `;
}

function populateMobileRaceSelect(season) {
  if (!elsMobile.raceSelect) return;
  elsMobile.raceSelect.innerHTML = '';
  const races = season.races ?? [];
  races.forEach((race, index) => {
    const opt = document.createElement('option');
    opt.value = index.toString();
    opt.textContent = `R${race.round ?? index + 1} · ${deriveRaceLabel(race)}`;
    elsMobile.raceSelect.appendChild(opt);
  });
  elsMobile.raceSelect.disabled = races.length === 0;
  if (races.length) {
    const selectedIndex = Math.min(state.raceIndex, races.length - 1);
    state.raceIndex = selectedIndex;
    elsMobile.raceSelect.value = selectedIndex.toString();
  }
}

function renderMobileStandings(season) {
  if (!elsMobile.standingsList) return;
  if (state.mobileStandingsMode === 'teams') {
    const teams = computeTeamStandings(season);
    elsMobile.standingsList.innerHTML = teams.slice(0, 12).map((team, idx) => {
      const drivers = (team.drivers ?? []).map(d => d.name).join(' · ');
      return `
        <div class="m-row">
          <div class="m-row__left">
            <div class="m-row__title">
              <span class="m-rank">${idx + 1}</span>
              <span class="m-dot" style="background:${sanitizeColor(team.color)};"></span>
              ${escapeHtml(team.name ?? 'Team')}
            </div>
            <div class="m-row__sub">${escapeHtml(drivers || '—')}</div>
          </div>
          <div class="m-row__right">
            <span class="m-chip m-chip--pts">${team.points ?? 0} pts</span>
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  const drivers = [...(season.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  elsMobile.standingsList.innerHTML = drivers.slice(0, 15).map((driver, idx) => {
    const team = driver.teamId ? state.teamById.get(driver.teamId) : null;
    return `
      <button type="button" class="m-row m-row--clickable" data-driver-id="${driver.id}" aria-label="Open ${escapeHtml(driver.name)} report">
        <div class="m-row__left">
          <div class="m-row__title">
            <span class="m-rank">${idx + 1}</span>
            <span class="m-dot" style="background:${sanitizeColor(driver.color)};"></span>
            ${escapeHtml(driver.name ?? 'Driver')}
          </div>
          <div class="m-row__sub">
            ${team ? `<span class="m-dot m-dot--sm" style="background:${sanitizeColor(team.color)};"></span>${escapeHtml(team.name)}` : '—'}
          </div>
        </div>
        <div class="m-row__right">
          <span class="m-chip m-chip--pts">${driver.points ?? 0} pts</span>
        </div>
      </button>
    `;
  }).join('');
}

function renderMobileRace() {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;
  const races = season.races ?? [];
  const race = races[state.raceIndex] ?? races[0];
  if (!elsMobile.raceCard || !elsMobile.raceResults) return;

  if (!race) {
    elsMobile.raceCard.innerHTML = '<p class="m-muted">No races yet.</p>';
    elsMobile.raceResults.innerHTML = '';
    return;
  }

  const meta = formatRaceMeta(race);
  const notes = race.settings?.notes ?? '';
  elsMobile.raceCard.innerHTML = `
    <div class="m-row" style="margin:0; border:none; background:transparent; padding:0;">
      <div class="m-row__left">
        <div class="m-row__title">${escapeHtml(race.name ?? 'Race')}</div>
        <div class="m-row__sub">${meta}</div>
      </div>
      <div class="m-row__right">
        <span class="m-chip">R${race.round ?? state.raceIndex + 1}</span>
      </div>
    </div>
    <p class="m-muted" style="margin:0.75rem 0 0;">${escapeHtml(notes || (race.settings?.carClass ? `Car: ${race.settings.carClass}` : ''))}</p>
  `;

  const results = (race.results ?? []).slice().sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  elsMobile.raceResults.innerHTML = results.map(result => {
    const name = result.driver ?? 'Unknown';
    const pts = typeof result.points === 'number' ? `${result.points} pts` : '—';
    const car = result.car ? `• ${result.car}` : '';
    const driverRecord = result.driverId
      ? state.driverById.get(result.driverId)
      : state.driverByName.get(name.toLowerCase());
    const dot = sanitizeColor(driverRecord?.color);
    return `
      <div class="m-row">
        <div class="m-row__left">
          <div class="m-row__title">
            <span class="m-rank">${result.position ?? '—'}</span>
            <span class="m-dot" style="background:${dot};"></span>
            ${escapeHtml(name)}
          </div>
          <div class="m-row__sub">${escapeHtml(result.fastestLap ? `FL: ${result.fastestLap}` : '')} ${escapeHtml(car)}</div>
        </div>
        <div class="m-row__right">
          <span class="m-chip m-chip--pts">${pts}</span>
        </div>
      </div>
    `;
  }).join('') || '<p class="m-muted">No results yet.</p>';
}

function renderMobileStats(season) {
  if (!elsMobile.statsGrid) return;
  const all = computeStatsRaw(season);
  const cards = [
    { key: 'wins', title: 'Most Wins', driverEntries: all.wins, teamEntries: all.teams.wins, format: (v) => `${v} wins` },
    { key: 'podiums', title: 'Most Podiums', driverEntries: all.podiums, teamEntries: all.teams.podiums, format: (v) => `${v} podiums` },
    { key: 'avgPoints', title: 'Avg Points', driverEntries: all.avgPoints, teamEntries: all.teams.avgPoints, format: (v) => `${v.toFixed(1)} pts` },
    { key: 'avgPlacement', title: 'Avg Finish', driverEntries: all.avgPlacement, teamEntries: all.teams.avgPlacement, format: (v) => v.toFixed(1) }
  ];

  elsMobile.statsGrid.innerHTML = cards.map(card => {
    const topDrivers = card.driverEntries.slice(0, 3).map(([id, value]) => {
      const driver = state.driverById.get(id);
      if (!driver) return '';
      return `<div class="m-row m-row--tight">
        <div class="m-row__left">
          <div class="m-row__title">
            <span class="m-dot" style="background:${sanitizeColor(driver.color)};"></span>
            ${escapeHtml(driver.name)}
          </div>
        </div>
        <div class="m-row__right">
          <span class="m-chip">${escapeHtml(card.format(value))}</span>
        </div>
      </div>`;
    }).join('') || `<p class="m-muted">Need more races.</p>`;

    const topTeams = card.teamEntries.slice(0, 3).map(([id, value]) => {
      const team = state.teamById.get(id);
      if (!team) return '';
      return `<div class="m-row m-row--tight">
        <div class="m-row__left">
          <div class="m-row__title">
            <span class="m-dot" style="background:${sanitizeColor(team.color)};"></span>
            ${escapeHtml(team.name)}
          </div>
        </div>
        <div class="m-row__right">
          <span class="m-chip">${escapeHtml(card.format(value))}</span>
        </div>
      </div>`;
    }).join('') || `<p class="m-muted">Need more races.</p>`;

    return `
      <button class="m-stat" type="button" data-stat="${card.key}" aria-label="Open ${card.title}">
        <div class="m-stat__title">${card.title}</div>
        <div class="m-stat__section">
          <div class="m-stat__label">Drivers</div>
          ${topDrivers}
          <div class="stat-chart stat-chart--mobile">
            <canvas id="m-stat-chart-${card.key}-drivers" aria-label="${escapeHtml(card.title)} drivers chart"></canvas>
          </div>
        </div>
        <div class="m-stat__section">
          <div class="m-stat__label">Teams</div>
          ${topTeams}
          <div class="stat-chart stat-chart--mobile">
            <canvas id="m-stat-chart-${card.key}-teams" aria-label="${escapeHtml(card.title)} teams chart"></canvas>
          </div>
        </div>
      </button>
    `;
  }).join('');

  renderInlineStatChartsMobile(cards);

  // Hook stat buttons to existing modal behavior
  elsMobile.statsGrid.querySelectorAll('.m-stat[data-stat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.stat;
      if (!key) return;
      const title = btn.querySelector('.m-stat__title')?.textContent || 'Stats';
      openStatModal(key, title);
    }, { once: true });
  });

  // Render mobile analytics charts
  renderMobileAnalytics(season);
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

function getLatestRaceResultsContext(season) {
  const races = season.races ?? [];
  const entries = races
    .map((race, index) => ({ race, index }))
    .filter(({ race }) => Array.isArray(race?.results) && race.results.length);

  if (!entries.length) {
    return { latest: null, hasPrevious: false };
  }

  const entriesWithDates = entries.filter(entry => entry.race.schedule?.date);
  const sorted = (entriesWithDates.length ? entriesWithDates : entries)
    .slice()
    .sort((a, b) => {
      if (entriesWithDates.length) {
        return new Date(a.race.schedule.date) - new Date(b.race.schedule.date);
      }
      return a.index - b.index;
    });

  return {
    latest: sorted.at(-1) ?? null,
    hasPrevious: entries.length >= 2
  };
}

function getPointsByDriverFromRace(race) {
  const map = new Map();
  if (!race?.results) return map;
  race.results.forEach(result => {
    if (!result || !result.driverId) return;
    const earned = typeof result.points === 'number' ? result.points : 0;
    map.set(result.driverId, (map.get(result.driverId) ?? 0) + earned);
  });
  return map;
}

function compareStandingEntries(a, b, pointsKey) {
  const diff = (b[pointsKey] ?? 0) - (a[pointsKey] ?? 0);
  if (diff !== 0) return diff;
  return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
}

function renderPositionDelta(change, hasPrevious) {
  if (!hasPrevious || change === null || Number.isNaN(change)) {
    return '<span class="standing-delta standing-delta--none">—</span>';
  }
  if (change === 0) {
    return '<span class="standing-delta standing-delta--steady">0</span>';
  }
  const direction = change > 0 ? 'up' : 'down';
  const sign = change > 0 ? '+' : '';
  return `<span class="standing-delta standing-delta--${direction}">${sign}${change}</span>`;
}

function renderDriverStandings(season) {
  if (!els.driverTableBody) return;

  const drivers = season.drivers ?? [];
  const { latest, hasPrevious } = getLatestRaceResultsContext(season);
  const lastRacePoints = latest ? getPointsByDriverFromRace(latest.race) : new Map();
  const showDelta = Boolean(hasPrevious && latest);

  const driverEntries = drivers.map(driver => {
    const currentPoints = driver.points ?? 0;
    const racePoints = lastRacePoints.get(driver.id) ?? 0;
    const previousPoints = Math.max(currentPoints - racePoints, 0);
    const team = driver.teamId ? state.teamById.get(driver.teamId) : null;
    return {
      driver,
      name: driver.name ?? '',
      team,
      currentPoints,
      previousPoints
    };
  });

  const previousRankMap = new Map();
  if (showDelta) {
    driverEntries
      .slice()
      .sort((a, b) => compareStandingEntries(a, b, 'previousPoints'))
      .forEach((entry, index) => {
        previousRankMap.set(entry.driver.id, index + 1);
      });
  }

  const rows = driverEntries
    .slice()
    .sort((a, b) => compareStandingEntries(a, b, 'currentPoints'))
    .map((entry, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankMap.get(entry.driver.id);
      const change = typeof previousRank === 'number' ? previousRank - currentRank : null;
      const deltaMarkup = renderPositionDelta(change, showDelta);
      const teamName = entry.team?.name ?? '—';
      return `
        <tr data-driver-id="${entry.driver.id}">
          <td class="column--delta" data-label="Change">${deltaMarkup}</td>
          <td data-label="Driver">
            <div class="driver-cell">
              <span class="driver-color" style="background:${sanitizeColor(entry.driver.color)};"></span>
              <span>${entry.driver.name}</span>
            </div>
          </td>
          <td data-label="Team">${teamName}</td>
          <td class="column--points" data-label="Points">${entry.currentPoints}</td>
        </tr>
      `;
    })
    .join('');

  els.driverTableBody.innerHTML = rows || `
    <tr><td colspan="4">No driver data yet. Add drivers to <code>data/seasons.json</code>.</td></tr>
  `;
}

function renderTeamStandings(season) {
  if (!els.teamTableBody) return;

  const teams = computeTeamStandings(season);
  const { latest, hasPrevious } = getLatestRaceResultsContext(season);
  const lastRacePoints = latest ? getPointsByDriverFromRace(latest.race) : new Map();
  const showDelta = Boolean(hasPrevious && latest);

  const driverPreviousPoints = new Map();
  (season.drivers ?? []).forEach(driver => {
    const currentPoints = driver.points ?? 0;
    const racePoints = lastRacePoints.get(driver.id) ?? 0;
    const previousPoints = Math.max(currentPoints - racePoints, 0);
    driverPreviousPoints.set(driver.id, previousPoints);
  });

  const teamEntries = teams.map(team => {
    const previousPoints = showDelta
      ? team.drivers.reduce((total, driver) => {
          const previous = driverPreviousPoints.get(driver.id);
          return total + (previous ?? Math.max(driver.points ?? 0, 0));
        }, 0)
      : team.points ?? 0;

    return {
      team,
      name: team.name ?? '',
      currentPoints: team.points ?? 0,
      previousPoints
    };
  });

  const previousRankMap = new Map();
  if (showDelta) {
    teamEntries
      .slice()
      .sort((a, b) => compareStandingEntries(a, b, 'previousPoints'))
      .forEach((entry, index) => {
        previousRankMap.set(entry.team.id, index + 1);
      });
  }

  const rows = teamEntries
    .slice()
    .sort((a, b) => compareStandingEntries(a, b, 'currentPoints'))
    .map((entry, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankMap.get(entry.team.id);
      const change = typeof previousRank === 'number' ? previousRank - currentRank : null;
      const deltaMarkup = renderPositionDelta(change, showDelta);
      const driverList = entry.team.drivers.map(driver => `<span class="team-chip">${driver.name}</span>`).join('');
      return `
        <tr>
          <td class="column--delta" data-label="Change">${deltaMarkup}</td>
          <td data-label="Team">
            <span class="team-color" style="background:${sanitizeColor(entry.team.color)};"></span>
            ${entry.team.name}
          </td>
          <td data-label="Drivers"><div class="team-driver-list">${driverList}</div></td>
          <td class="column--points" data-label="Points">${entry.currentPoints}</td>
        </tr>
      `;
    })
    .join('');

  els.teamTableBody.innerHTML = rows || `
    <tr><td colspan="4">No team data yet. Update the season entry in <code>data/seasons.json</code>.</td></tr>
  `;
}

function computeTeamStandings(season) {
  if (state._teamStandingsCache && state._teamStandingsCache.key === state._seasonRenderKey) {
    return state._teamStandingsCache.value;
  }
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

  const computed = Array.from(teamMap.values())
    .map(team => ({
      ...team,
      points: team.calcPoints !== undefined ? team.calcPoints : (team.points ?? 0)
    }))
    .sort((a, b) => b.points - a.points);

  state._teamStandingsCache = { key: state._seasonRenderKey, value: computed };
  return computed;
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
  els.statsWins.innerHTML = `
    ${renderStatList(stats.wins, 'wins')}
    <div class="stat-chart"><canvas id="stat-chart-wins" aria-label="Wins chart"></canvas></div>
  `;
  els.statsPodiums.innerHTML = `
    ${renderStatList(stats.podiums, 'podiums')}
    <div class="stat-chart"><canvas id="stat-chart-podiums" aria-label="Podiums chart"></canvas></div>
  `;
  els.statsAveragePoints.innerHTML = `
    ${renderStatList(stats.avgPoints, 'pts', value => `${value.toFixed(1)} pts`)}
    <div class="stat-chart"><canvas id="stat-chart-avgPoints" aria-label="Average points chart"></canvas></div>
  `;
  els.statsAveragePlacement.innerHTML = `
    ${renderPlacementColumns(stats.avgPlacement)}
    <div class="stat-chart"><canvas id="stat-chart-avgPlacement" aria-label="Average finish chart"></canvas></div>
  `;

  renderInlineStatChartsDesktop(stats);
  renderEmbeddedAnalytics(season);
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
      if (!driverId) return;

      const driver = state.driverById.get(driverId);
      const teamId = driver?.teamId;

      // Wins: count for all drivers/teams (matches homepage behavior)
      if (result.position === 1) {
        base.wins.set(driverId, (base.wins.get(driverId) ?? 0) + 1);
        if (teamId) base.teamWins.set(teamId, (base.teamWins.get(teamId) ?? 0) + 1);
      }

      // Other stats: only eligible drivers (3+ races)
      if (!eligibleDrivers.has(driverId)) return;

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
      if (!driverId) return;

      // Count wins for ALL drivers (no eligibility filter)
      if (result.position === 1) {
        stats.wins.set(driverId, (stats.wins.get(driverId) ?? 0) + 1);
      }

      // For other stats, only include eligible drivers (3+ races)
      if (!eligibleDrivers.has(driverId)) return;

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
    wins: sortStatMap(stats.wins, false, 999), // Show all winners
    podiums: sortStatMap(stats.podiums, false, 5), // Top 5
    avgPoints: sortStatMap(avgPointsFinal, false, 5), // Top 5
    avgPlacement: sortStatMap(avgPlacementFinal, true, 5) // Top 5
  };
}

function sortStatMap(statMap, ascending = false, limit = 5) {
  return Array.from(statMap.entries())
    .sort(([, a], [, b]) => ascending ? a - b : b - a)
    .slice(0, limit);
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

const CHART_COLORS = [
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

function ensureChartJsConfigured() {
  if (state._chartJsConfigured) return true;
  if (typeof Chart === 'undefined') return false;

  // Match analytics page defaults.
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.2)';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  state._chartJsConfigured = true;
  return true;
}

function destroyInlineStatCharts() {
  state._statCharts.forEach(chart => {
    try {
      chart?.destroy?.();
    } catch {
      // ignore
    }
  });
  state._statCharts = [];
}

function buildInlineBarChart(canvas, labels, values, { reverseY = false } = {}) {
  if (!ensureChartJsConfigured()) return null;
  if (!canvas) return null;

  const colors = labels.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]);
  const bg = colors.map(c => `${c}55`); // ~33% alpha

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: bg,
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 8,
          barPercentage: 0.72,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 450 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false }
        },
        y: {
          beginAtZero: true,
          reverse: Boolean(reverseY),
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { display: false }
        }
      }
    }
  });

  return chart;
}

function renderInlineStatChartsDesktop(stats) {
  destroyInlineStatCharts();
  if (!ensureChartJsConfigured()) return;

  const make = (canvasId, entries, { reverseY = false } = {}) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const labels = (entries ?? []).map(([id]) => state.driverById.get(id)?.name ?? id);
    const values = (entries ?? []).map(([, v]) => (typeof v === 'number' ? v : 0));
    const chart = buildInlineBarChart(canvas, labels, values, { reverseY });
    if (chart) state._statCharts.push(chart);
  };

  make('stat-chart-wins', stats.wins, { reverseY: false });
  make('stat-chart-podiums', stats.podiums, { reverseY: false });
  make('stat-chart-avgPoints', stats.avgPoints, { reverseY: false });
  // Avg finish is "lower is better" → reverse axis so better values trend upward visually.
  make('stat-chart-avgPlacement', stats.avgPlacement, { reverseY: true });
}

function renderInlineStatChartsMobile(cards) {
  destroyInlineStatCharts();
  if (!ensureChartJsConfigured()) return;

  cards.forEach(card => {
    const driverCanvas = document.getElementById(`m-stat-chart-${card.key}-drivers`);
    const teamCanvas = document.getElementById(`m-stat-chart-${card.key}-teams`);

    const driverLabels = (card.driverEntries ?? []).slice(0, 6).map(([id]) => state.driverById.get(id)?.name ?? id);
    const driverValues = (card.driverEntries ?? []).slice(0, 6).map(([, v]) => (typeof v === 'number' ? v : 0));
    const teamLabels = (card.teamEntries ?? []).slice(0, 6).map(([id]) => state.teamById.get(id)?.name ?? id);
    const teamValues = (card.teamEntries ?? []).slice(0, 6).map(([, v]) => (typeof v === 'number' ? v : 0));

    const reverse = card.key === 'avgPlacement';

    const dChart = buildInlineBarChart(driverCanvas, driverLabels, driverValues, { reverseY: reverse });
    const tChart = buildInlineBarChart(teamCanvas, teamLabels, teamValues, { reverseY: reverse });
    if (dChart) state._statCharts.push(dChart);
    if (tChart) state._statCharts.push(tChart);
  });
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

function escapeHtml(value) {
  const str = String(value ?? '');
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ---------------------------------------------------------------------------
// Mobile Analytics (Mobile Stats view)
// ---------------------------------------------------------------------------

const MOBILE_CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'
];

// Shared mobile chart options for speed
const MOBILE_CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 0,
  animation: { duration: 120 },
  interaction: { intersect: false, mode: 'index' },
  layout: {
    padding: { left: 0, right: 0, top: 0, bottom: 0 }
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { padding: 4, usePointStyle: true, font: { size: 8 }, boxWidth: 6 }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(11, 18, 32, 0.95)',
      padding: 6,
      titleFont: { size: 9 },
      bodyFont: { size: 8 },
      borderColor: 'rgba(148, 163, 184, 0.2)',
      borderWidth: 1
    }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 0, padding: 2 } },
    y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.06)' }, ticks: { font: { size: 7 }, padding: 2 } }
  }
};

function mountMobileAnalytics() {
  if (!state.isMobile) return;
  if (state.mobileAnalytics.mounted) return;

  state.mobileAnalytics.els = {
    timelineSlider: document.getElementById('m-timeline-slider'),
    timelineValue: document.getElementById('m-timeline-value'),
    heatmapContainer: document.getElementById('m-heatmap-container'),
    h2hDriver1: document.getElementById('m-h2h-driver1'),
    h2hDriver2: document.getElementById('m-h2h-driver2'),
    h2hSummary: document.getElementById('m-h2h-summary'),
    fastestLapStats: document.getElementById('m-fastest-lap-stats')
  };

  const elsM = state.mobileAnalytics.els;

  elsM.timelineSlider?.addEventListener('input', (event) => {
    const value = parseInt(event.target.value, 10);
    state.mobileAnalytics.currentRace = value;
    updateMobileTimelineDisplay();
    // Debounce heavy re-renders
    clearTimeout(state.mobileAnalytics._sliderTimeout);
    state.mobileAnalytics._sliderTimeout = setTimeout(() => {
      renderMobileAnalyticsCharts(state.seasons[state.seasonIndex]);
    }, 80);
  });

  elsM.h2hDriver1?.addEventListener('change', () => {
    renderMobileH2HChart(state.seasons[state.seasonIndex]);
  });

  elsM.h2hDriver2?.addEventListener('change', () => {
    renderMobileH2HChart(state.seasons[state.seasonIndex]);
  });

  // Setup lazy loading for chart cards
  setupMobileChartObservers();

  state.mobileAnalytics.mounted = true;
}

function setupMobileChartObservers() {
  if (!('IntersectionObserver' in window)) return;

  const cards = document.querySelectorAll('.m-analytics__card[data-chart]');
  if (!cards.length) return;

  state.mobileAnalytics._visibleCharts = new Set();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const chartId = entry.target.dataset.chart;
      if (entry.isIntersecting) {
        state.mobileAnalytics._visibleCharts.add(chartId);
        entry.target.removeAttribute('data-loading');
        renderMobileChartById(chartId, state.seasons[state.seasonIndex]);
        // Force resize after render to fit container
        requestAnimationFrame(() => {
          const chart = state.mobileAnalytics.charts[chartId.replace('-', '')];
          if (chart && typeof chart.resize === 'function') {
            chart.resize();
          }
        });
      }
    });
  }, { rootMargin: '50px 0px', threshold: 0.01 });

  cards.forEach(card => {
    card.setAttribute('data-loading', 'true');
    observer.observe(card);
  });

  state.mobileAnalytics._observer = observer;
}

function destroyMobileAnalyticsCharts() {
  const charts = state.mobileAnalytics.charts;
  Object.keys(charts).forEach(key => {
    const chart = charts[key];
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
      charts[key] = null;
    }
  });
}

function updateMobileTimelineDisplay() {
  const elsM = state.mobileAnalytics.els;
  if (!elsM.timelineValue) return;

  const current = state.mobileAnalytics.currentRace;
  const max = state.mobileAnalytics.maxRaces;

  if (current === max) elsM.timelineValue.textContent = 'All Races';
  else elsM.timelineValue.textContent = `${current} / ${max}`;
}

function renderMobileAnalytics(season) {
  if (!state.isMobile) return;
  if (typeof Chart === 'undefined') return;

  mountMobileAnalytics();
  if (!state.mobileAnalytics.mounted) return;

  const maxRaces = season?.races?.length ?? 0;
  if (state.mobileAnalytics.maxRaces !== maxRaces) {
    state.mobileAnalytics.maxRaces = maxRaces;
    state.mobileAnalytics.currentRace = maxRaces;

    const slider = state.mobileAnalytics.els.timelineSlider;
    if (slider) {
      slider.max = String(maxRaces);
      slider.value = String(maxRaces);
    }
    updateMobileTimelineDisplay();
  }

  // Populate H2H dropdowns (light operation)
  populateMobileH2HDrivers(season);

  // Render only visible charts (lazy loading handles the rest)
  renderMobileAnalyticsCharts(season);
}

function renderMobileAnalyticsCharts(season) {
  const visible = state.mobileAnalytics._visibleCharts;
  if (!visible || visible.size === 0) {
    // Fallback: render all if observer not set up
    renderMobilePointsChart(season);
    renderMobilePointsGapChart(season);
    renderMobilePositionChart(season);
    renderMobileHeatmap(season);
    renderMobilePodiumChart(season);
    renderMobileTrendChart(season);
    renderMobileFastestLapChart(season);
    renderMobileH2HChart(season);
    return;
  }

  // Only render charts that are visible
  visible.forEach(chartId => {
    renderMobileChartById(chartId, season);
  });
}

function renderMobileChartById(chartId, season) {
  switch (chartId) {
    case 'points': renderMobilePointsChart(season); break;
    case 'points-gap': renderMobilePointsGapChart(season); break;
    case 'position': renderMobilePositionChart(season); break;
    case 'heatmap': renderMobileHeatmap(season); break;
    case 'podium': renderMobilePodiumChart(season); break;
    case 'trend': renderMobileTrendChart(season); break;
    case 'fastest-lap': renderMobileFastestLapChart(season); break;
    case 'h2h': renderMobileH2HChart(season); break;
  }
}

function getMobileRacesSlice(season) {
  const races = season?.races ?? [];
  const max = Math.min(state.mobileAnalytics.currentRace ?? races.length, races.length);
  return races.slice(0, max);
}

function getMobileDriversByPoints(season) {
  return [...(season?.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
}

function renderMobilePointsChart(season) {
  const canvas = document.getElementById('m-points-chart');
  if (!canvas) return;

  const races = getMobileRacesSlice(season);
  const labels = races.map((_, i) => `R${i + 1}`);
  const topDrivers = getMobileDriversByPoints(season).slice(0, 5);

  const datasets = topDrivers.map((driver, index) => {
    let sum = 0;
    const data = races.map(race => {
      const result = race.results?.find(r => r.driverId === driver.id);
      sum += result?.points ?? 0;
      return sum;
    });

    const color = MOBILE_CHART_COLORS[index % MOBILE_CHART_COLORS.length];
    return {
      label: driver.name.length > 10 ? driver.name.slice(0, 9) + '…' : driver.name,
      data,
      borderColor: color,
      backgroundColor: `${color}22`,
      borderWidth: 1.5,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 4
    };
  });

  if (state.mobileAnalytics.charts.points) {
    state.mobileAnalytics.charts.points.data.labels = labels;
    state.mobileAnalytics.charts.points.data.datasets = datasets;
    state.mobileAnalytics.charts.points.update('none');
    return;
  }

  state.mobileAnalytics.charts.points = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: { ...MOBILE_CHART_DEFAULTS }
  });
}

function renderMobilePointsGapChart(season) {
  const canvas = document.getElementById('m-points-gap-chart');
  if (!canvas) return;

  const races = getMobileRacesSlice(season);
  const labels = races.map((_, i) => `R${i + 1}`);
  const drivers = getMobileDriversByPoints(season).slice(0, 5);

  // Compute cumulative points
  const cumulative = new Map();
  drivers.forEach(driver => {
    let sum = 0;
    cumulative.set(driver.id, races.map(race => {
      const result = race.results?.find(r => r.driverId === driver.id);
      sum += result?.points ?? 0;
      return sum;
    }));
  });

  // Find leader at each race
  const leaderPoints = races.map((_, raceIndex) => {
    let max = 0;
    cumulative.forEach(points => {
      if ((points[raceIndex] ?? 0) > max) max = points[raceIndex];
    });
    return max;
  });

  const datasets = drivers.map((driver, index) => {
    const driverPoints = cumulative.get(driver.id) ?? [];
    const gaps = labels.map((_, raceIndex) => Math.max(leaderPoints[raceIndex] - (driverPoints[raceIndex] ?? 0), 0));
    const color = MOBILE_CHART_COLORS[index % MOBILE_CHART_COLORS.length];
    return {
      label: driver.name.length > 10 ? driver.name.slice(0, 9) + '…' : driver.name,
      data: gaps,
      borderColor: color,
      backgroundColor: `${color}22`,
      borderWidth: 1.5,
      tension: 0.35,
      pointRadius: 2
    };
  });

  if (state.mobileAnalytics.charts.pointsGap) {
    state.mobileAnalytics.charts.pointsGap.data.labels = labels;
    state.mobileAnalytics.charts.pointsGap.data.datasets = datasets;
    state.mobileAnalytics.charts.pointsGap.update('none');
    return;
  }

  state.mobileAnalytics.charts.pointsGap = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: { ...MOBILE_CHART_DEFAULTS }
  });
}

function renderMobilePositionChart(season) {
  const canvas = document.getElementById('m-position-chart');
  if (!canvas) return;

  const races = getMobileRacesSlice(season);
  const labels = races.map((_, i) => `R${i + 1}`);
  const drivers = getMobileDriversByPoints(season).slice(0, 5);

  // Compute cumulative points for standings
  const cumulative = new Map();
  drivers.forEach(driver => {
    let sum = 0;
    cumulative.set(driver.id, races.map(race => {
      const result = race.results?.find(r => r.driverId === driver.id);
      sum += result?.points ?? 0;
      return sum;
    }));
  });

  // Calculate standings position after each race
  const standingsByRace = races.map((_, raceIndex) => {
    const standings = drivers.map(d => ({
      id: d.id,
      points: (cumulative.get(d.id) ?? [])[raceIndex] ?? 0
    })).sort((a, b) => b.points - a.points);

    const rankMap = new Map();
    standings.forEach((entry, idx) => rankMap.set(entry.id, idx + 1));
    return rankMap;
  });

  const datasets = drivers.map((driver, index) => {
    const positions = labels.map((_, raceIndex) => standingsByRace[raceIndex]?.get(driver.id) ?? null);
    const color = MOBILE_CHART_COLORS[index % MOBILE_CHART_COLORS.length];
    return {
      label: driver.name.length > 10 ? driver.name.slice(0, 9) + '…' : driver.name,
      data: positions,
      borderColor: color,
      backgroundColor: `${color}22`,
      borderWidth: 1.5,
      tension: 0.35,
      pointRadius: 2,
      spanGaps: true
    };
  });

  if (state.mobileAnalytics.charts.position) {
    state.mobileAnalytics.charts.position.data.labels = labels;
    state.mobileAnalytics.charts.position.data.datasets = datasets;
    state.mobileAnalytics.charts.position.update('none');
    return;
  }

  state.mobileAnalytics.charts.position = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...MOBILE_CHART_DEFAULTS,
      scales: {
        ...MOBILE_CHART_DEFAULTS.scales,
        y: {
          reverse: true,
          beginAtZero: false,
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { stepSize: 1, font: { size: 10 }, callback: v => `P${v}` }
        }
      }
    }
  });
}

function renderMobileHeatmap(season) {
  const container = state.mobileAnalytics.els.heatmapContainer;
  if (!container) return;

  const races = getMobileRacesSlice(season);
  let drivers = [...(season?.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  let html = '<div class="heatmap-grid">';
  html += '<div class="heatmap-row">';
  html += '<div class="heatmap-cell heatmap-cell--header">Driver</div>';
  races.forEach((_, i) => {
    html += `<div class="heatmap-cell heatmap-cell--header">R${i + 1}</div>`;
  });
  html += '</div>';

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
  container.innerHTML = html;
}

function renderMobilePodiumChart(season) {
  const canvas = document.getElementById('m-podium-chart');
  if (!canvas) return;

  const races = getMobileRacesSlice(season);
  const drivers = getMobileDriversByPoints(season).slice(0, 8);
  const labels = drivers.map(d => d.name);

  const firstPlaces = [], secondPlaces = [], thirdPlaces = [], topTen = [];

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
    { label: '1st', data: firstPlaces, backgroundColor: 'rgba(250, 204, 21, 0.7)', borderColor: '#fbbf24', borderWidth: 1 },
    { label: '2nd', data: secondPlaces, backgroundColor: 'rgba(203, 213, 225, 0.6)', borderColor: '#cbd5e1', borderWidth: 1 },
    { label: '3rd', data: thirdPlaces, backgroundColor: 'rgba(249, 115, 22, 0.6)', borderColor: '#fb923c', borderWidth: 1 },
    { label: '4-10', data: topTen, backgroundColor: 'rgba(100, 116, 139, 0.4)', borderColor: '#64748b', borderWidth: 1 }
  ];

  if (state.mobileAnalytics.charts.podium) {
    state.mobileAnalytics.charts.podium.data.labels = labels;
    state.mobileAnalytics.charts.podium.data.datasets = datasets;
    state.mobileAnalytics.charts.podium.update({ duration: 300 });
    return;
  }

  state.mobileAnalytics.charts.podium = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 8, font: { size: 10 }, usePointStyle: true } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 } } },
        y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { stepSize: 1, font: { size: 10 } } }
      }
    }
  });
}

function renderMobileTrendChart(season) {
  const canvas = document.getElementById('m-trend-chart');
  if (!canvas) return;

  const races = getMobileRacesSlice(season);
  if (races.length < 3) {
    if (state.mobileAnalytics.charts.trend) {
      state.mobileAnalytics.charts.trend.data.labels = [];
      state.mobileAnalytics.charts.trend.data.datasets = [];
      state.mobileAnalytics.charts.trend.update();
    }
    return;
  }

  const topDrivers = getMobileDriversByPoints(season).slice(0, 6);
  const labels = races.slice(2).map((_, i) => `R${i + 3}`);

  const datasets = topDrivers.map((driver, index) => {
    const rollingAvg = [];
    for (let i = 2; i < races.length; i++) {
      const last3 = races.slice(i - 2, i + 1);
      let sum = 0, count = 0;
      last3.forEach(race => {
        const result = race.results?.find(r => r.driverId === driver.id);
        if (result?.position) { sum += result.position; count++; }
      });
      rollingAvg.push(count > 0 ? sum / count : null);
    }

    const color = MOBILE_CHART_COLORS[index % MOBILE_CHART_COLORS.length];
    return {
      label: driver.name,
      data: rollingAvg,
      borderColor: color,
      backgroundColor: `${color}33`,
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 3,
      spanGaps: true
    };
  });

  if (state.mobileAnalytics.charts.trend) {
    state.mobileAnalytics.charts.trend.data.labels = labels;
    state.mobileAnalytics.charts.trend.data.datasets = datasets;
    state.mobileAnalytics.charts.trend.update({ duration: 300 });
    return;
  }

  state.mobileAnalytics.charts.trend = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...MOBILE_CHART_DEFAULTS,
      scales: {
        x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 9 } } },
        y: { reverse: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { stepSize: 1, font: { size: 10 }, callback: v => `P${v}` } }
      }
    }
  });
}

function renderMobileFastestLapChart(season) {
  const canvas = document.getElementById('m-fastest-lap-chart');
  if (!canvas) return;

  const races = getMobileRacesSlice(season);

  function lapTimeToSeconds(lapTime) {
    if (!lapTime || lapTime === '-') return Infinity;
    const parts = lapTime.split(':');
    if (parts.length === 2) {
      return (parseInt(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
    }
    return Infinity;
  }

  const driverLapPositions = new Map();

  races.forEach(race => {
    const driverLapTimes = new Map();
    race.results?.forEach(result => {
      const lapTime = lapTimeToSeconds(result.fastestLap);
      if (lapTime < Infinity && result.driverId) {
        if (!driverLapTimes.has(result.driverId) || lapTime < driverLapTimes.get(result.driverId)) {
          driverLapTimes.set(result.driverId, lapTime);
        }
      }
    });

    const sorted = Array.from(driverLapTimes.entries())
      .map(([driverId, time]) => ({ driverId, time }))
      .sort((a, b) => a.time - b.time);

    sorted.forEach((entry, index) => {
      const position = index + 1;
      if (!driverLapPositions.has(entry.driverId)) {
        driverLapPositions.set(entry.driverId, { total: 0, count: 0, best: Infinity });
      }
      const data = driverLapPositions.get(entry.driverId);
      data.total += position;
      data.count++;
      data.best = Math.min(data.best, position);
    });
  });

  const driverStats = Array.from(driverLapPositions.entries())
    .map(([driverId, data]) => ({
      driverId,
      driver: state.driverById.get(driverId),
      avgPos: data.total / data.count,
      count: data.count,
      best: data.best
    }))
    .filter(s => s.driver)
    .sort((a, b) => a.avgPos - b.avgPos);

  const labels = driverStats.map(s => s.driver.name);
  const avgPositions = driverStats.map(s => s.avgPos);
  const colors = driverStats.map((_, i) => MOBILE_CHART_COLORS[i % MOBILE_CHART_COLORS.length]);

  const datasets = [{
    label: 'Avg Lap Position',
    data: avgPositions,
    backgroundColor: colors.map(c => `${c}99`),
    borderColor: colors,
    borderWidth: 1
  }];

  if (state.mobileAnalytics.charts.fastestLap) {
    state.mobileAnalytics.charts.fastestLap.data.labels = labels;
    state.mobileAnalytics.charts.fastestLap.data.datasets = datasets;
    state.mobileAnalytics.charts.fastestLap.update({ duration: 300 });
  } else {
    state.mobileAnalytics.charts.fastestLap = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { reverse: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 10 }, callback: v => `P${v}` } },
          y: { grid: { display: false }, ticks: { font: { size: 9 } } }
        }
      }
    });
  }

  // Update stats panel
  const statsEl = state.mobileAnalytics.els.fastestLapStats;
  if (statsEl && driverStats.length > 0) {
    const best = driverStats[0];
    statsEl.innerHTML = `
      <div class="h2h-stats">
        <div class="h2h-stat">
          <div class="h2h-stat__label">Best Avg Position</div>
          <div class="h2h-stat__value h2h-stat__value--winner">${best.driver.name} (P${best.avgPos.toFixed(2)})</div>
        </div>
      </div>
    `;
  }
}

function populateMobileH2HDrivers(season) {
  const elsM = state.mobileAnalytics.els;
  if (!season || !elsM.h2hDriver1 || !elsM.h2hDriver2) return;

  const drivers = getMobileDriversByPoints(season);

  const frag1 = document.createDocumentFragment();
  const frag2 = document.createDocumentFragment();

  drivers.forEach((driver, index) => {
    const opt1 = document.createElement('option');
    opt1.value = driver.id;
    opt1.textContent = driver.name;
    if (index === 0) opt1.selected = true;
    frag1.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = driver.id;
    opt2.textContent = driver.name;
    if (index === 1) opt2.selected = true;
    frag2.appendChild(opt2);
  });

  elsM.h2hDriver1.innerHTML = '';
  elsM.h2hDriver2.innerHTML = '';
  elsM.h2hDriver1.appendChild(frag1);
  elsM.h2hDriver2.appendChild(frag2);
}

function renderMobileH2HChart(season) {
  const elsM = state.mobileAnalytics.els;
  if (!season || !elsM.h2hDriver1 || !elsM.h2hDriver2) return;

  const driver1Id = elsM.h2hDriver1.value;
  const driver2Id = elsM.h2hDriver2.value;
  const driver1 = state.driverById.get(driver1Id);
  const driver2 = state.driverById.get(driver2Id);

  if (!driver1 || !driver2) return;

  const canvas = document.getElementById('m-h2h-chart');
  if (!canvas) return;

  const races = getMobileRacesSlice(season);
  const labels = races.map((_, i) => `R${i + 1}`);

  const driver1Positions = [], driver2Positions = [];
  let driver1Wins = 0, driver2Wins = 0, driver1Points = 0, driver2Points = 0;

  races.forEach(race => {
    const result1 = race.results?.find(r => r.driverId === driver1Id);
    const result2 = race.results?.find(r => r.driverId === driver2Id);

    driver1Positions.push(result1?.position ?? null);
    driver2Positions.push(result2?.position ?? null);

    const pos1 = result1?.position;
    const pos2 = result2?.position;

    if (pos1 && pos2) {
      if (pos1 < pos2) driver1Wins++;
      else if (pos2 < pos1) driver2Wins++;
    } else if (pos1 && !pos2) {
      driver1Wins++;
    } else if (!pos1 && pos2) {
      driver2Wins++;
    }

    driver1Points += result1?.points ?? 0;
    driver2Points += result2?.points ?? 0;
  });

  const datasets = [
    {
      label: driver1.name,
      data: driver1Positions,
      borderColor: driver1.color || '#38bdf8',
      backgroundColor: `${driver1.color || '#38bdf8'}33`,
      borderWidth: 2.5,
      tension: 0.3,
      pointRadius: 4,
      spanGaps: true
    },
    {
      label: driver2.name,
      data: driver2Positions,
      borderColor: driver2.color || '#f97316',
      backgroundColor: `${driver2.color || '#f97316'}33`,
      borderWidth: 2.5,
      tension: 0.3,
      pointRadius: 4,
      spanGaps: true
    }
  ];

  if (state.mobileAnalytics.charts.h2h) {
    state.mobileAnalytics.charts.h2h.data.labels = labels;
    state.mobileAnalytics.charts.h2h.data.datasets = datasets;
    state.mobileAnalytics.charts.h2h.update({ duration: 300 });
  } else {
    state.mobileAnalytics.charts.h2h = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 8, font: { size: 10 }, usePointStyle: true } }
        },
        scales: {
          x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 9 } } },
          y: { reverse: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { stepSize: 1, font: { size: 10 }, callback: v => `P${v}` } }
        }
      }
    });
  }

  // Update summary
  if (elsM.h2hSummary) {
    const winnerName = driver1Wins > driver2Wins ? driver1.name : driver2Wins > driver1Wins ? driver2.name : 'Tied';
    const winnerClass = driver1Wins !== driver2Wins ? 'h2h-stat__value--winner' : '';

    elsM.h2hSummary.innerHTML = `
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
          <div class="h2h-stat__label">Winner</div>
          <div class="h2h-stat__value ${winnerClass}">${winnerName}</div>
        </div>
      </div>
    `;
  }
}

// getMobileChartOptions replaced by MOBILE_CHART_DEFAULTS constant

// ---------------------------------------------------------------------------
// Embedded Analytics (Stats section)
// ---------------------------------------------------------------------------

const ANALYTICS_CHART_COLORS = [
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

function mountEmbeddedAnalytics() {
  if (state.isMobile) return;
  if (state.analytics.mounted) return;

  const root = document.getElementById('embed-analytics');
  if (!root) return;

  state.analytics.els = {
    root,
    timelineSlider: document.getElementById('embed-timeline-slider'),
    timelineValue: document.getElementById('embed-timeline-value'),
    timelineTicks: document.getElementById('embed-timeline-ticks'),
    timelinePlay: document.getElementById('embed-timeline-play'),
    timelineReset: document.getElementById('embed-timeline-reset'),
    toggleDrivers: document.getElementById('embed-toggle-drivers'),
    toggleTeams: document.getElementById('embed-toggle-teams'),
    heatmapSort: document.getElementById('embed-heatmap-sort'),
    heatmapContainer: document.getElementById('embed-heatmap-container'),
    podiumFilter: document.getElementById('embed-podium-filter'),
    h2hDriver1: document.getElementById('embed-h2h-driver1'),
    h2hDriver2: document.getElementById('embed-h2h-driver2'),
    h2hSummary: document.getElementById('embed-h2h-summary'),
    fastestLapStats: document.getElementById('embed-fastest-lap-stats')
  };

  const elsA = state.analytics.els;

  elsA.timelineSlider?.addEventListener('input', (event) => {
    const value = parseInt(event.target.value, 10);
    state.analytics.currentRace = value;
    updateEmbeddedTimelineDisplay();
    updateEmbeddedSliderProgress();
    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedAnalytics(season);
  });

  elsA.timelinePlay?.addEventListener('click', toggleEmbeddedPlayback);
  elsA.timelineReset?.addEventListener('click', resetEmbeddedTimeline);

  elsA.toggleDrivers?.addEventListener('change', () => {
    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedAnalytics(season);
  });
  elsA.toggleTeams?.addEventListener('change', () => {
    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedAnalytics(season);
  });

  elsA.heatmapSort?.addEventListener('change', () => {
    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedHeatmap(season);
  });

  elsA.podiumFilter?.addEventListener('change', () => {
    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedPodiumChart(season);
  });

  elsA.h2hDriver1?.addEventListener('change', () => {
    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedH2HChart(season);
  });
  elsA.h2hDriver2?.addEventListener('change', () => {
    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedH2HChart(season);
  });

  state.analytics.mounted = true;
}

function destroyEmbeddedAnalyticsCharts() {
  const charts = state.analytics.charts;
  Object.keys(charts).forEach(key => {
    const chart = charts[key];
    if (chart) {
      try {
        chart.destroy();
      } catch {
        // ignore
      }
      charts[key] = null;
    }
  });
}

function setEmbeddedAnalyticsSeason(season) {
  mountEmbeddedAnalytics();
  if (!state.analytics.mounted) return;

  state.analytics.maxRaces = (season?.races?.length ?? 0);
  state.analytics.currentRace = state.analytics.maxRaces;

  const elsA = state.analytics.els;
  if (elsA.timelineSlider) {
    elsA.timelineSlider.max = String(state.analytics.maxRaces);
    elsA.timelineSlider.value = String(state.analytics.maxRaces);
    updateEmbeddedSliderProgress();
  }

  renderEmbeddedTimelineTicks(season);
  updateEmbeddedTimelineDisplay();
  populateEmbeddedH2HDrivers(season);
}

function updateEmbeddedTimelineDisplay() {
  const elsA = state.analytics.els;
  if (!elsA.timelineValue) return;

  const current = state.analytics.currentRace;
  const max = state.analytics.maxRaces;

  if (current === max) elsA.timelineValue.textContent = 'All Races';
  else elsA.timelineValue.textContent = `${current} / ${max}`;
}

function updateEmbeddedSliderProgress() {
  const slider = state.analytics.els.timelineSlider;
  if (!slider) return;
  const max = Math.max(state.analytics.maxRaces, 1);
  const current = Math.min(Math.max(state.analytics.currentRace ?? max, 0), max);
  const progress = (current / max) * 100;
  slider.style.setProperty('--slider-progress', `${progress}%`);
}

function renderEmbeddedTimelineTicks(season) {
  const elsA = state.analytics.els;
  if (!elsA.timelineTicks) return;
  elsA.timelineTicks.innerHTML = '';

  const races = season?.races ?? [];
  const fragment = document.createDocumentFragment();
  races.forEach((_, index) => {
    const tick = document.createElement('div');
    tick.className = 'timeline-tick';
    tick.innerHTML = `
      <div class="timeline-tick__mark"></div>
      <div class="timeline-tick__label">R${index + 1}</div>
    `;
    fragment.appendChild(tick);
  });
  elsA.timelineTicks.appendChild(fragment);
}

function toggleEmbeddedPlayback() {
  const elsA = state.analytics.els;
  if (!elsA.timelinePlay) return;

  if (state.analytics.playInterval) {
    clearInterval(state.analytics.playInterval);
    state.analytics.playInterval = null;
    elsA.timelinePlay.querySelector('.play-icon').style.display = '';
    elsA.timelinePlay.querySelector('.pause-icon').style.display = 'none';
    return;
  }

  if (state.analytics.currentRace >= state.analytics.maxRaces) {
    state.analytics.currentRace = 0;
  }

  state.analytics.playInterval = setInterval(() => {
    state.analytics.currentRace++;

    if (state.analytics.currentRace > state.analytics.maxRaces) {
      toggleEmbeddedPlayback();
      return;
    }

    if (elsA.timelineSlider) elsA.timelineSlider.value = String(state.analytics.currentRace);
    updateEmbeddedTimelineDisplay();
    updateEmbeddedSliderProgress();

    const season = state.seasons[state.seasonIndex];
    if (season) renderEmbeddedAnalytics(season);
  }, 1000);

  elsA.timelinePlay.querySelector('.play-icon').style.display = 'none';
  elsA.timelinePlay.querySelector('.pause-icon').style.display = '';
}

function resetEmbeddedTimeline() {
  if (state.analytics.playInterval) toggleEmbeddedPlayback();
  state.analytics.currentRace = state.analytics.maxRaces;
  const slider = state.analytics.els.timelineSlider;
  if (slider) slider.value = String(state.analytics.maxRaces);
  updateEmbeddedTimelineDisplay();
  updateEmbeddedSliderProgress();
  const season = state.seasons[state.seasonIndex];
  if (season) renderEmbeddedAnalytics(season);
}

function renderEmbeddedAnalytics(season) {
  if (state.isMobile) return;
  mountEmbeddedAnalytics();
  if (!state.analytics.mounted) return;
  if (typeof Chart === 'undefined') return;

  // Ensure timeline is in sync with current season.
  if (state.analytics.maxRaces !== (season?.races?.length ?? 0)) {
    setEmbeddedAnalyticsSeason(season);
  }

  renderEmbeddedPointsChart(season);
  renderEmbeddedPointsGapChart(season);
  renderEmbeddedPositionChangeChart(season);
  renderEmbeddedHeatmap(season);
  renderEmbeddedPodiumChart(season);
  renderEmbeddedTrendChart(season);
  renderEmbeddedFastestLapChart(season);
  renderEmbeddedH2HChart(season);
}

function getEmbeddedRacesSlice(season) {
  const races = season?.races ?? [];
  const max = Math.min(state.analytics.currentRace ?? races.length, races.length);
  return races.slice(0, max);
}

function getDriversByPoints(season) {
  return [...(season?.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
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

function renderEmbeddedPointsChart(season) {
  const canvas = document.getElementById('embed-points-chart');
  if (!canvas) return;

  const races = getEmbeddedRacesSlice(season);
  const labels = races.map((_, i) => `R${i + 1}`);

  const showDrivers = state.analytics.els.toggleDrivers?.checked ?? true;
  const showTeams = state.analytics.els.toggleTeams?.checked ?? false;
  const datasets = [];

  if (showDrivers) {
    getDriversByPoints(season).slice(0, 8).forEach((driver, index) => {
      let sum = 0;
      const cumulativePoints = [];
      races.forEach(race => {
        const result = race.results?.find(r => r.driverId === driver.id);
        sum += result?.points ?? 0;
        cumulativePoints.push(sum);
      });

      const color = ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length];
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

  if (showTeams) {
    const teams = computeTeamStandings(season).slice(0, 5);
    teams.forEach(team => {
      let sum = 0;
      const cumulativePoints = [];
      races.forEach(race => {
        let racePoints = 0;
        race.results?.forEach(result => {
          const driver = state.driverById.get(result.driverId);
          if (driver?.teamId === team.id) racePoints += result.points ?? 0;
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

  if (state.analytics.charts.points) {
    state.analytics.charts.points.data.labels = labels;
    state.analytics.charts.points.data.datasets = datasets;
    state.analytics.charts.points.update({ duration: 400, easing: 'easeOutQuart', mode: 'default' });
    return;
  }

  const ctx = canvas.getContext('2d');
  state.analytics.charts.points = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
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
        x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderEmbeddedPointsGapChart(season) {
  const canvas = document.getElementById('embed-points-gap-chart');
  if (!canvas) return;

  const races = getEmbeddedRacesSlice(season);
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
    const color = ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length];
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

  if (state.analytics.charts.pointsGap) {
    state.analytics.charts.pointsGap.data.labels = labels;
    state.analytics.charts.pointsGap.data.datasets = datasets;
    state.analytics.charts.pointsGap.update({ duration: 400, easing: 'easeOutQuart' });
    return;
  }

  const ctx = canvas.getContext('2d');
  state.analytics.charts.pointsGap = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
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
        x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 11 } } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { font: { size: 11 }, callback: value => `${value} pts` }
        }
      }
    }
  });
}

function renderEmbeddedPositionChangeChart(season) {
  const canvas = document.getElementById('embed-position-change-chart');
  if (!canvas) return;

  const races = getEmbeddedRacesSlice(season);
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
    standings.forEach((entry, index) => rankMap.set(entry.driverId, index + 1));
    return rankMap;
  });

  const datasets = drivers.map((driver, index) => {
    const positions = labels.map((_, raceIndex) => {
      const ranks = standingsByRace[raceIndex];
      return ranks ? ranks.get(driver.id) ?? null : null;
    });
    const color = ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length];
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

  if (state.analytics.charts.positionChange) {
    state.analytics.charts.positionChange.data.labels = labels;
    state.analytics.charts.positionChange.data.datasets = datasets;
    state.analytics.charts.positionChange.update({ duration: 400, easing: 'easeOutQuart' });
    return;
  }

  const ctx = canvas.getContext('2d');
  state.analytics.charts.positionChange = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
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
        x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 11 } } },
        y: {
          reverse: true,
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { stepSize: 1, font: { size: 11 }, callback: value => `P${value}` }
        }
      }
    }
  });
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

function renderEmbeddedHeatmap(season) {
  const container = state.analytics.els.heatmapContainer;
  if (!container) return;

  const sortBy = state.analytics.els.heatmapSort?.value ?? 'points';
  const races = getEmbeddedRacesSlice(season);

  let drivers = [...(season.drivers ?? [])];
  if (sortBy === 'points') {
    drivers.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  } else if (sortBy === 'avg') {
    drivers.sort((a, b) => calculateAvgPosition(a.id, races) - calculateAvgPosition(b.id, races));
  } else {
    drivers.sort((a, b) => a.name.localeCompare(b.name));
  }

  let html = '<div class="heatmap-grid">';
  html += '<div class="heatmap-row">';
  html += '<div class="heatmap-cell heatmap-cell--header">Driver</div>';
  races.forEach((_, i) => { html += `<div class="heatmap-cell heatmap-cell--header">R${i + 1}</div>`; });
  html += '</div>';

  drivers.forEach(driver => {
    html += '<div class="heatmap-row">';
    html += `<div class="heatmap-cell heatmap-cell--driver" style="border-left: 3px solid ${driver.color || '#94a3b8'}">${escapeHtml(driver.name)}</div>`;
    races.forEach(race => {
      const result = race.results?.find(r => r.driverId === driver.id);
      const position = result?.position;
      if (position) html += `<div class="heatmap-cell heatmap-cell--position" data-position="${position}">${position}</div>`;
      else html += '<div class="heatmap-cell heatmap-cell--dnf">—</div>';
    });
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderEmbeddedPodiumChart(season) {
  const canvas = document.getElementById('embed-podium-chart');
  if (!canvas) return;

  const races = getEmbeddedRacesSlice(season);
  const filterValue = state.analytics.els.podiumFilter?.value ?? '10';
  const limit = filterValue === 'all' ? 999 : parseInt(filterValue, 10);

  const drivers = [...(season.drivers ?? [])]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, limit);

  const labels = drivers.map(d => d.name);
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
    { label: '1st Place', data: firstPlaces, backgroundColor: 'rgba(250, 204, 21, 0.7)', borderColor: '#fbbf24', borderWidth: 2 },
    { label: '2nd Place', data: secondPlaces, backgroundColor: 'rgba(203, 213, 225, 0.6)', borderColor: '#cbd5e1', borderWidth: 2 },
    { label: '3rd Place', data: thirdPlaces, backgroundColor: 'rgba(249, 115, 22, 0.6)', borderColor: '#fb923c', borderWidth: 2 },
    { label: '4th-10th', data: topTen, backgroundColor: 'rgba(100, 116, 139, 0.4)', borderColor: '#64748b', borderWidth: 2 }
  ];

  if (state.analytics.charts.podium) {
    state.analytics.charts.podium.data.labels = labels;
    state.analytics.charts.podium.data.datasets = datasets;
    state.analytics.charts.podium.update({ duration: 400, easing: 'easeOutQuart' });
    return;
  }

  const ctx = canvas.getContext('2d');
  state.analytics.charts.podium = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
        tooltip: {
          backgroundColor: 'rgba(11, 18, 32, 0.95)',
          padding: 12,
          borderColor: 'rgba(148, 163, 184, 0.3)',
          borderWidth: 1
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { stepSize: 1, font: { size: 11 } } }
      }
    }
  });
}

function renderEmbeddedTrendChart(season) {
  const canvas = document.getElementById('embed-trend-chart');
  if (!canvas) return;

  const races = getEmbeddedRacesSlice(season);

  if (races.length < 3) {
    if (!state.analytics.charts.trend) {
      const ctx = canvas.getContext('2d');
      state.analytics.charts.trend = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Need at least 3 races for rolling average', color: '#94a3b8' } }
        }
      });
    }
    return;
  }

  const topDrivers = [...(season.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 6);
  const labels = races.slice(2).map((_, i) => `After R${i + 3}`);
  const datasets = [];

  topDrivers.forEach((driver, index) => {
    const rollingAvg = [];
    for (let i = 2; i < races.length; i++) {
      const last3 = races.slice(i - 2, i + 1);
      let sum = 0;
      let count = 0;
      last3.forEach(race => {
        const result = race.results?.find(r => r.driverId === driver.id);
        if (result?.position) { sum += result.position; count++; }
      });
      rollingAvg.push(count > 0 ? sum / count : null);
    }
    const color = ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length];
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

  if (state.analytics.charts.trend) {
    state.analytics.charts.trend.data.labels = labels;
    state.analytics.charts.trend.data.datasets = datasets;
    if (state.analytics.charts.trend.options.plugins?.title) state.analytics.charts.trend.options.plugins.title.display = false;
    state.analytics.charts.trend.update({ duration: 400, easing: 'easeOutQuart' });
    return;
  }

  const ctx = canvas.getContext('2d');
  state.analytics.charts.trend = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
        tooltip: {
          backgroundColor: 'rgba(11, 18, 32, 0.95)',
          padding: 12,
          borderColor: 'rgba(148, 163, 184, 0.3)',
          borderWidth: 1,
          callbacks: { label: context => `${context.dataset.label || ''}: ${context.parsed.y ? context.parsed.y.toFixed(2) : 'N/A'}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 10 } } },
        y: {
          reverse: true,
          beginAtZero: false,
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { stepSize: 1, font: { size: 11 }, callback: value => `P${value}` }
        }
      }
    }
  });
}

function renderEmbeddedFastestLapChart(season) {
  const canvas = document.getElementById('embed-fastest-lap-chart');
  if (!canvas) return;

  const allRaces = season?.races ?? [];
  const maxRaceIndex = Math.min(state.analytics.currentRace ?? allRaces.length, allRaces.length);
  const races = allRaces.slice(0, maxRaceIndex);

  function lapTimeToSeconds(lapTime) {
    if (!lapTime || lapTime === '-' || lapTime === '—') return Infinity;
    const parts = String(lapTime).split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return Infinity;
  }

  const driverLapPositions = new Map();
  races.forEach(race => {
    const driverLapTimes = new Map();
    (race.results ?? []).forEach(result => {
      const lapTime = lapTimeToSeconds(result.fastestLap);
      if (lapTime < Infinity && result.driverId) {
        if (!driverLapTimes.has(result.driverId) || lapTime < driverLapTimes.get(result.driverId)) {
          driverLapTimes.set(result.driverId, lapTime);
        }
      }
    });

    const lapTimes = Array.from(driverLapTimes.entries())
      .map(([driverId, time]) => ({ driverId, time }))
      .sort((a, b) => a.time - b.time);

    lapTimes.forEach((entry, index) => {
      const position = index + 1;
      if (!driverLapPositions.has(entry.driverId)) {
        driverLapPositions.set(entry.driverId, { totalPosition: 0, count: 0, positions: [], bestPosition: Infinity, worstPosition: 0 });
      }
      const data = driverLapPositions.get(entry.driverId);
      data.totalPosition += position;
      data.count++;
      data.positions.push(position);
      data.bestPosition = Math.min(data.bestPosition, position);
      data.worstPosition = Math.max(data.worstPosition, position);
    });
  });

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
    .filter(stat => stat.driver)
    .sort((a, b) => a.avgLapPosition - b.avgLapPosition);

  const labels = driverStats.map(stat => stat.driver.name);
  const avgPositions = driverStats.map(stat => stat.avgLapPosition);
  const colors = driverStats.map((_, index) => ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length]);
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

  if (state.analytics.charts.fastestLap) {
    state.analytics.charts.fastestLap.data.labels = labels;
    state.analytics.charts.fastestLap.data.datasets = datasets;
    state.analytics.charts.fastestLap.update({ duration: 400, easing: 'easeOutQuart' });
  } else {
    const ctx = canvas.getContext('2d');
    state.analytics.charts.fastestLap = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            padding: 12,
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const stat = driverStats[context.dataIndex];
                if (!stat) return '';
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
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: false,
            reverse: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { size: 11 }, callback: value => `P${value}` },
            title: { display: true, text: 'Fastest Lap Position (Lower = Better)', font: { size: 11 } }
          }
        }
      }
    });
  }

  if (state.analytics.els.fastestLapStats && driverStats.length > 0) {
    const bestDriver = driverStats[0];
    const mostP1s = driverStats.reduce((best, current) => {
      const currentP1s = current.positions.filter(p => p === 1).length;
      const bestP1s = best.positions.filter(p => p === 1).length;
      return currentP1s > bestP1s ? current : best;
    }, driverStats[0]);
    const p1Count = mostP1s.positions.filter(p => p === 1).length;
    const completeDataDrivers = driverStats.filter(d => d.raceCount === races.length).length;
    const incompleteDataDrivers = driverStats.length - completeDataDrivers;

    state.analytics.els.fastestLapStats.innerHTML = `
      <div class="h2h-stats">
        <div class="h2h-stat">
          <div class="h2h-stat__label">Best Avg Lap Time Position</div>
          <div class="h2h-stat__value h2h-stat__value--winner">${escapeHtml(bestDriver.driver.name)} (P${bestDriver.avgLapPosition.toFixed(2)})</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Most Fastest Laps</div>
          <div class="h2h-stat__value">${escapeHtml(mostP1s.driver.name)} (${p1Count})</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Data Coverage</div>
          <div class="h2h-stat__value">${completeDataDrivers} complete / ${incompleteDataDrivers} partial</div>
        </div>
      </div>
    `;
  }
}

function populateEmbeddedH2HDrivers(season) {
  const elsA = state.analytics.els;
  if (!season || !elsA.h2hDriver1 || !elsA.h2hDriver2) return;

  const drivers = [...(season.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  const frag1 = document.createDocumentFragment();
  const frag2 = document.createDocumentFragment();

  drivers.forEach((driver, index) => {
    const option1 = document.createElement('option');
    option1.value = driver.id;
    option1.textContent = driver.name;
    if (index === 0) option1.selected = true;
    frag1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = driver.id;
    option2.textContent = driver.name;
    if (index === 1) option2.selected = true;
    frag2.appendChild(option2);
  });

  elsA.h2hDriver1.innerHTML = '';
  elsA.h2hDriver2.innerHTML = '';
  elsA.h2hDriver1.appendChild(frag1);
  elsA.h2hDriver2.appendChild(frag2);
}

function renderEmbeddedH2HChart(season) {
  const elsA = state.analytics.els;
  if (!season || !elsA.h2hDriver1 || !elsA.h2hDriver2) return;

  const driver1Id = elsA.h2hDriver1.value;
  const driver2Id = elsA.h2hDriver2.value;
  const driver1 = state.driverById.get(driver1Id);
  const driver2 = state.driverById.get(driver2Id);
  if (!driver1 || !driver2) return;

  const canvas = document.getElementById('embed-h2h-chart');
  if (!canvas) return;

  const races = getEmbeddedRacesSlice(season);
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

    const pos1 = result1?.position;
    const pos2 = result2?.position;
    if (pos1 && pos2) {
      if (pos1 < pos2) driver1Wins++;
      else if (pos2 < pos1) driver2Wins++;
    } else if (pos1 && !pos2) driver1Wins++;
    else if (!pos1 && pos2) driver2Wins++;

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

  if (state.analytics.charts.h2h) {
    state.analytics.charts.h2h.data.labels = labels;
    state.analytics.charts.h2h.data.datasets = datasets;
    state.analytics.charts.h2h.update({ duration: 400, easing: 'easeOutQuart' });
  } else {
    const ctx = canvas.getContext('2d');
    state.analytics.charts.h2h = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 12, weight: '600' } } },
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
          x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { font: { size: 11 } } },
          y: { reverse: true, beginAtZero: false, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { stepSize: 1, font: { size: 11 }, callback: value => `P${value}` } }
        }
      }
    });
  }

  if (elsA.h2hSummary) {
    const winnerName = driver1Wins > driver2Wins ? driver1.name : driver2Wins > driver1Wins ? driver2.name : 'Tied';
    const winnerClass = driver1Wins !== driver2Wins ? 'h2h-stat__value--winner' : '';
    elsA.h2hSummary.innerHTML = `
      <div class="h2h-stats">
        <div class="h2h-stat">
          <div class="h2h-stat__label">Races Won</div>
          <div class="h2h-stat__value">${escapeHtml(driver1.name)}: ${driver1Wins} | ${escapeHtml(driver2.name)}: ${driver2Wins}</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Total Points</div>
          <div class="h2h-stat__value">${escapeHtml(driver1.name)}: ${driver1Points} | ${escapeHtml(driver2.name)}: ${driver2Points}</div>
        </div>
        <div class="h2h-stat">
          <div class="h2h-stat__label">Battle Winner</div>
          <div class="h2h-stat__value ${winnerClass}">${escapeHtml(winnerName)}</div>
        </div>
      </div>
    `;
  }
}

function getDriverRaceHistory(season, driverId) {
  const history = [];
  (season?.races ?? []).forEach((race, index) => {
    const results = race?.results ?? [];
    const match = results.find(result => result?.driverId === driverId);
    if (!match) return;
    history.push({
      race,
      index,
      round: race.round ?? index + 1,
      label: deriveRaceLabel(race) || race.name || `Race ${index + 1}`,
      date: race.schedule?.date ? new Date(race.schedule.date) : null,
      venue: race.schedule?.venue ?? '',
      position: typeof match.position === 'number' ? match.position : null,
      points: typeof match.points === 'number' ? match.points : null,
      car: match.car ?? '',
      fastestLap: match.fastestLap ?? '',
      isGuest: Boolean(match.isGuest),
      entrant: match.entrant ?? ''
    });
  });

  // Stable sort by round/index
  history.sort((a, b) => (a.round ?? a.index) - (b.round ?? b.index));
  return history;
}

function computeDriverSummary(season, driverId) {
  const driver = state.driverById.get(driverId);
  const team = driver?.teamId ? state.teamById.get(driver.teamId) : null;
  const history = getDriverRaceHistory(season, driverId);

  let wins = 0;
  let podiums = 0;
  let finishSum = 0;
  let finishCount = 0;
  let pointsSum = 0;
  let pointsCount = 0;
  let bestFinish = null;
  let worstFinish = null;
  let fastestLapCount = 0;

  history.forEach(entry => {
    const pos = entry.position;
    if (typeof pos === 'number') {
      if (pos === 1) wins += 1;
      if (pos >= 1 && pos <= 3) podiums += 1;
      finishSum += pos;
      finishCount += 1;
      bestFinish = bestFinish === null ? pos : Math.min(bestFinish, pos);
      worstFinish = worstFinish === null ? pos : Math.max(worstFinish, pos);
    }
    if (typeof entry.points === 'number') {
      pointsSum += entry.points;
      pointsCount += 1;
    }
    if (entry.fastestLap) fastestLapCount += 1;
  });

  const avgFinish = finishCount ? finishSum / finishCount : null;
  const avgPoints = pointsCount ? pointsSum / pointsCount : null;

  return {
    driver,
    team,
    history,
    races: history.length,
    wins,
    podiums,
    bestFinish,
    worstFinish,
    avgFinish,
    avgPoints,
    pointsFromResults: pointsSum,
    fastestLapCount
  };
}

function openDriverReportModal(driverId) {
  const season = state.seasons[state.seasonIndex];
  if (!season || !els.modal || !els.modalTitle || !els.modalList) return;

  const summary = computeDriverSummary(season, driverId);
  const driverName = summary.driver?.name ?? 'Driver';
  const driverColor = sanitizeColor(summary.driver?.color);
  const teamName = summary.team?.name ?? '—';
  const teamColor = sanitizeColor(summary.team?.color);

  const avgFinishText = summary.avgFinish === null ? '—' : summary.avgFinish.toFixed(1);
  const avgPointsText = summary.avgPoints === null ? '—' : `${summary.avgPoints.toFixed(1)}`;
  const bestText = summary.bestFinish === null ? '—' : `P${summary.bestFinish}`;
  const worstText = summary.worstFinish === null ? '—' : `P${summary.worstFinish}`;

  const racesList = summary.history.map(entry => {
    const dateText = entry.date ? intlDate.format(entry.date) : 'Date TBD';
    const posText = entry.position === null ? '—' : `P${entry.position}`;
    const ptsText = entry.points === null ? '—' : `${entry.points} pts`;
    const carText = entry.car ? `• ${entry.car}` : '';
    const flText = entry.fastestLap ? `• FL ${entry.fastestLap}` : '';
    const noteParts = [];
    if (entry.isGuest) noteParts.push('Guest');
    if (entry.entrant && entry.entrant !== (summary.driver?.name ?? '')) noteParts.push(`Entrant: ${entry.entrant}`);
    const note = noteParts.length ? ` • ${noteParts.join(' • ')}` : '';

    return `
      <div class="report-race">
        <div class="report-race__top">
          <div class="report-race__title">R${entry.round} · ${escapeHtml(entry.label)}</div>
          <div class="report-race__chips">
            <span class="report-chip">${posText}</span>
            <span class="report-chip report-chip--accent">${ptsText}</span>
          </div>
        </div>
        <div class="report-race__meta">${escapeHtml(dateText)}${entry.venue ? ` • ${escapeHtml(entry.venue)}` : ''}${escapeHtml(note)}</div>
        <div class="report-race__meta">${escapeHtml(`${carText} ${flText}`.trim())}</div>
      </div>
    `;
  }).join('') || `<p class="stat-empty">No race results found for this driver.</p>`;

  els.modalTitle.textContent = `${driverName} · Report`;
  els.modalList.innerHTML = `
    <div class="driver-report">
      <div class="driver-report__header">
        <div class="driver-report__name">
          <span class="driver-report__dot" style="background:${driverColor};"></span>
          <div>
            <div class="driver-report__title">${escapeHtml(driverName)}</div>
            <div class="driver-report__subtitle">
              <span class="driver-report__team-dot" style="background:${teamColor};"></span>
              ${escapeHtml(teamName)}
            </div>
          </div>
        </div>
        <div class="driver-report__points">${summary.driver?.points ?? 0} pts</div>
      </div>

      <div class="driver-report__grid">
        <div class="driver-report__kpi"><div class="k">Races</div><div class="v">${summary.races}</div></div>
        <div class="driver-report__kpi"><div class="k">Wins</div><div class="v">${summary.wins}</div></div>
        <div class="driver-report__kpi"><div class="k">Podiums</div><div class="v">${summary.podiums}</div></div>
        <div class="driver-report__kpi"><div class="k">Avg finish</div><div class="v">${avgFinishText}</div></div>
        <div class="driver-report__kpi"><div class="k">Avg points</div><div class="v">${avgPointsText}</div></div>
        <div class="driver-report__kpi"><div class="k">Best</div><div class="v">${bestText}</div></div>
        <div class="driver-report__kpi"><div class="k">Worst</div><div class="v">${worstText}</div></div>
        <div class="driver-report__kpi"><div class="k">Fastest laps</div><div class="v">${summary.fastestLapCount}</div></div>
      </div>

      <h4 class="driver-report__section-title">Race-by-race</h4>
      <div class="driver-report__races">
        ${racesList}
      </div>
    </div>
  `;

  els.modal.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
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
  if (scrollLock.locked) return;

  scrollLock.x = window.scrollX || 0;
  scrollLock.y = window.scrollY || 0;
  scrollLock.scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

  document.body.classList.add('is-modal-open');
  attachModalScrollGuards();

  // Freeze the page in place (works reliably across iOS/desktop browsers).
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollLock.y}px`;
  document.body.style.left = `-${scrollLock.x}px`;
  document.body.style.width = '100%';
  if (scrollLock.scrollbarGap) {
    document.body.style.paddingRight = `${scrollLock.scrollbarGap}px`;
  }

  scrollLock.locked = true;
}

function unlockBodyScroll() {
  if (isAnyModalOpen()) return;
  if (!scrollLock.locked) {
    document.body.classList.remove('is-modal-open');
    return;
  }

  document.body.classList.remove('is-modal-open');

  // Restore scroll position and remove fixed lock styles.
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';

  window.scrollTo(scrollLock.x, scrollLock.y);

  scrollLock.locked = false;
  detachModalScrollGuards();
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

  // On mobile, rendering both tables upfront is expensive. Render only when needed.
  const season = state.seasons[state.seasonIndex];
  if (!season) return;
  const key = activeButton.dataset.tab === 'teams' ? 'teams' : 'drivers';
  if (key === 'teams') ensureTeamStandingsRendered(season);
  else ensureDriverStandingsRendered(season);
}

function updateFooter() {
  if (els.footerYear) {
    els.footerYear.textContent = new Date().getFullYear();
  }
}

function setupSectionObservers() {
  if (state._observersReady) return;
  state._observersReady = true;

  if (state.isMobile) return;

  mountEmbeddedAnalytics();
  const standingsSection = document.getElementById('standings');
  const statsSection = document.getElementById('stats');

  if (!('IntersectionObserver' in window)) {
    // Fallback: just defer once.
    scheduleIdle(() => renderDeferredSectionsIfVisible(true));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        renderDeferredSectionsIfVisible();
      }
    },
    { root: null, threshold: 0.12 }
  );

  if (standingsSection) observer.observe(standingsSection);
  if (statsSection) observer.observe(statsSection);
}

function isElementOnScreen(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  // consider it "visible" if any meaningful portion is within viewport
  return rect.bottom >= 0 && rect.top <= vh * 1.1;
}

function ensureDriverStandingsRendered(season) {
  if (state._rendered.drivers) return;
  renderDriverStandings(season);
  state._rendered.drivers = true;
}

function ensureTeamStandingsRendered(season) {
  if (state._rendered.teams) return;
  renderTeamStandings(season);
  state._rendered.teams = true;
}

function ensureStatsRendered(season) {
  if (state._rendered.stats) return;
  renderStats(season);
  state._rendered.stats = true;
}

function renderDeferredSectionsIfVisible(force = false) {
  const season = state.seasons[state.seasonIndex];
  if (!season) return;

  const standingsSection = document.getElementById('standings');
  const statsSection = document.getElementById('stats');

  if (force || isElementOnScreen(standingsSection)) {
    const active = getActiveStandingsTab();
    if (active === 'teams') ensureTeamStandingsRendered(season);
    else ensureDriverStandingsRendered(season);
  }

  if (force || isElementOnScreen(statsSection)) {
    ensureStatsRendered(season);
  }
}

init();
