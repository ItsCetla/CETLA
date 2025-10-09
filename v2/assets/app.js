const state = {
  seasons: [],
  seasonIndex: 0,
  raceIndex: 0,
  seasonPills: [],
  driverById: new Map(),
  driverByName: new Map(),
  teamById: new Map()
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
  heroCycle: document.getElementById('hero-cycle'),
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
  footerYear: document.getElementById('footer-year')
};

const tabButtons = document.querySelectorAll('.tabs__button');
const tabPanels = document.querySelectorAll('.tab-panel');

const intlDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

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
  setSeason(0);
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

  els.heroCycle?.addEventListener('click', () => {
    if (!state.seasons.length) return;
    const nextIndex = (state.seasonIndex + 1) % state.seasons.length;
    setSeason(nextIndex);
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
    option.textContent = `${season.year} · ${season.label}`;
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

function setSeason(index) {
  const season = state.seasons[index];
  if (!season) return;
  state.seasonIndex = index;
  state.raceIndex = 0;
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
  const { heroSeasonTitle, heroSeasonLabel, heroSeasonRounds, heroSeasonLeader, heroTeamLeader } = els;
  heroSeasonTitle.textContent = `${season.label} • ${season.year}`;
  heroSeasonLabel.textContent = season.label;
  heroSeasonRounds.textContent = `${season.races?.length ?? 0} races`;

  const sortedDrivers = [...(season.drivers ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const topDriver = sortedDrivers[0];
  heroSeasonLeader.textContent = topDriver ? `${topDriver.name} · ${topDriver.points} pts` : '—';

  const teams = computeTeamStandings(season);
  const topTeam = teams[0];
  heroTeamLeader.textContent = topTeam ? `${topTeam.name} · ${topTeam.points} pts` : '—';
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
          <td>
            <div class="driver-cell">
              <span class="driver-color" style="background:${color};"></span>
              <span>${driver.name}</span>
            </div>
          </td>
          <td>${teamName}</td>
          <td class="column--points">${driver.points ?? 0}</td>
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
          <td>
            <span class="team-color" style="background:${sanitizeColor(team.color)};"></span>
            ${team.name}
          </td>
          <td><div class="team-driver-list">${driverList}</div></td>
          <td class="column--points">${team.points}</td>
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
    els.raceSelect.value = '0';
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
  els.raceDate.textContent = race.schedule?.date ? intlDate.format(new Date(race.schedule.date)) : 'Date —';
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
        <td>${result.position ?? '—'}</td>
        <td>
          <div class="driver-cell">
            <span class="driver-color" style="background:${color};"></span>
            <div>
              <span>${displayName}</span>
              ${note}
            </div>
          </div>
        </td>
        <td>${result.points ?? '—'}</td>
        <td class="column--hide-sm">${result.car ?? '—'}</td>
        <td class="column--hide-sm">${result.fastestLap ?? '—'}</td>
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
