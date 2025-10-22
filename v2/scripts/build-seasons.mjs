#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const seasonsConfig = [
  {
    id: 'session3',
    label: 'Multi-Car',
    description: 'Friendly multi-class season featuring 11 rounds.',
    primaryColor: '#4C1D95',
    dataPath: 'session3'
  },
  {
    id: 'session4',
    label: 'Road Cars',
    description: 'Road car sprint season with mixed manufacturer grids.',
    primaryColor: '#0F766E',
    dataPath: 'session4'
  },
  {
    id: 'session4html',
    label: 'People Pick',
    description: 'Community-voted car selection season.',
    primaryColor: '#BE185D',
    dataPath: 'session4html/session4'
  }
];

const driverAliasConfig = {
  session3: {
    KickStart: ['KickstartMyKart'],
    TheSlayter: ['TheSlayterr-TV'],
    Santi: ['HdzSanti'],
    TrapVis: ['Trapvis']
  },
  session4html: {
    TrapVis: ['Trapvis'],
    KickStart: ['KickStart - Sub = FleshTorpedo']
  }
};

const teamOverrides = {
  session4html: {
    KickStart: 'Team Fuck Yeah'
  }
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseRaceDate(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  const parts = cleaned.split(',');
  if (parts.length < 2) return null;
  const datePart = parts[0].trim();
  const timePart = parts.slice(1).join(',').trim();
  const candidate = `${datePart} ${timePart}`;
  const parsed = Date.parse(candidate);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function extractTrackName(raceName) {
  if (!raceName) return null;
  const pieces = raceName.split(':');
  if (pieces.length > 1) {
    return pieces.slice(1).join(':').trim();
  }
  return raceName.trim();
}

async function buildSeason(config) {
  const seasonPath = path.join(projectRoot, config.dataPath);
  const [driversJson, teamsJson, racesJson] = await Promise.all([
    fs.readFile(path.join(seasonPath, 'drivers.json'), 'utf8'),
    fs.readFile(path.join(seasonPath, 'teams.json'), 'utf8'),
    fs.readFile(path.join(seasonPath, 'race_results.json'), 'utf8')
  ]);

  const teamsRaw = JSON.parse(teamsJson);
  const driversRaw = JSON.parse(driversJson);
  const racesRaw = JSON.parse(racesJson);

  const aliasConfig = driverAliasConfig[config.id] ?? {};
  const aliasLookup = Object.entries(aliasConfig).reduce((acc, [canonical, aliases]) => {
    aliases.forEach(alias => {
      acc[alias.toLowerCase()] = canonical;
    });
    return acc;
  }, {});

  const teams = teamsRaw.map(team => {
    const id = slugify(team.name);
    return {
      id,
      name: team.name,
      color: team.color ?? null,
      points: team.points ?? null
    };
  });

  const teamByColor = new Map(
    teams.map(team => [String(team.color ?? '').toLowerCase(), team.id])
  );

  const teamByName = new Map(teams.map(team => [team.name, team.id]));

  const drivers = driversRaw.map(driver => {
    const id = slugify(driver.name);
    const overrideTeamName = teamOverrides[config.id]?.[driver.name];
    let teamId = null;
    if (overrideTeamName) {
      teamId = teamByName.get(overrideTeamName) ?? null;
    } else {
      const normalizedColor = String(driver.color ?? '').toLowerCase();
      teamId = teamByColor.get(normalizedColor) ?? null;
    }

    return {
      id,
      name: driver.name,
      teamId,
      color: driver.color ?? null,
      points: driver.points ?? 0,
      aliases: aliasConfig[driver.name] ?? []
    };
  });

  const driverByName = new Map(
    drivers.map(driver => [driver.name.toLowerCase(), driver])
  );

  const races = racesRaw.map((race, index) => {
    return {
      id: race.race_id ?? slugify(`${config.id}-${index + 1}`),
      round: index + 1,
      name: race.race_name ?? `Race ${index + 1}`,
      trackImage: race.track_image ?? null,
      schedule: {
        date: parseRaceDate(race.settings?.other_settings),
        venue: extractTrackName(race.race_name) ?? null
      },
      settings: {
        carClass: race.settings?.car ?? null,
        weather: race.settings?.weather ?? null,
        laps: race.settings?.laps ? Number(race.settings.laps) : null,
        notes: race.settings?.other_settings ?? null
      },
      results: (race.results ?? []).map(result => {
        const rawName = String(result.driver ?? '').trim();
        const aliasKey = rawName.toLowerCase();
        const canonicalName = driverByName.has(aliasKey)
          ? driverByName.get(aliasKey).name
          : aliasLookup[aliasKey] ?? null;

        const driverRecord =
          canonicalName && driverByName.get(canonicalName.toLowerCase());

        const resolvedName = driverRecord?.name ?? canonicalName ?? rawName;
        const driverId = driverRecord?.id ?? null;

        return {
          position: result.position ?? null,
          driver: resolvedName,
          driverId,
          entrant: rawName !== resolvedName ? rawName : null,
          car: result.car ?? null,
          totalTime: result.total_time || null,
          gap: result.gap || null,
          fastestLap: result.fastest_lap || null,
          points: result.points ?? null,
          isGuest: driverId === null
        };
      })
    };
  });

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    primaryColor: config.primaryColor,
    drivers,
    teams,
    races
  };
}

async function main() {
  const seasons = [];
  for (const config of seasonsConfig) {
    const season = await buildSeason(config);
    seasons.push(season);
  }

  const outputPath = path.join(projectRoot, 'v2', 'data', 'seasons.json');
  const payload = JSON.stringify({ seasons }, null, 2);
  await fs.writeFile(outputPath, payload, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
