# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CETLA Racing League is a Gran Turismo 7 racing league website with two active versions:

1. **Legacy version** (root directory) - Multi-season racing league site with separate JSON data files per season
2. **v2** (v2/ directory) - Modern single-page application with unified data model

The v2 architecture consolidates all seasons into a single `seasons.json` file for easier maintenance and updates.

## Project Structure

```
CETLA/
├── v2/                          # New unified single-page app
│   ├── index.html               # Single entry point
│   ├── assets/
│   │   ├── app.js              # Core data loading & rendering logic
│   │   └── styles.css          # Mobile-first responsive design
│   ├── data/
│   │   └── seasons.json        # Unified data for all seasons
│   └── scripts/
│       └── build-seasons.mjs   # Node.js script to generate seasons.json
├── session3/                    # Legacy: Multi-Car season data
├── session4/                    # Legacy: Road Cars season data
├── session4html/               # Legacy: People Pick season data
├── index.html                  # Legacy home page
├── script.js                   # Legacy JavaScript
└── style.css                   # Legacy styles
```

## Development Commands

### Building v2 Data
```bash
# From project root - regenerate seasons.json from legacy session folders
node v2/scripts/build-seasons.mjs
```

This script consolidates drivers.json, teams.json, and race_results.json from each legacy session folder into the unified v2/data/seasons.json.

### Running Locally
This is a static site - open `v2/index.html` directly in a browser, or use a local server:
```bash
# Python 3
python -m http.server 8000

# Node.js (if http-server is installed)
npx http-server .
```

### Deployment
The site is hosted on GitHub Pages from the repository: https://github.com/ItsCetla/CETLA.git

Push changes to the main branch to deploy automatically.

## Data Architecture

### v2 Unified Model (seasons.json)

The v2 data model uses **relational linking** via IDs:

- **Seasons** contain arrays of drivers, teams, and races
- **Drivers** link to teams via `teamId`
- **Race results** link to drivers via `driverId`
- **Driver aliases** map alternative names to canonical driver records

Key design decisions:
- ISO-8601 dates for race scheduling
- Separate `entrant` field when guest drivers participate under another driver's name
- `isGuest` flag marks drivers not in the season roster
- Points are stored at both driver level (season totals) and result level (per-race)

### Legacy Model

Each season has three separate files:
- `drivers.json` - Driver roster with colors and total points
- `teams.json` - Team roster with colors
- `race_results.json` - Array of race objects with settings and results

**Color-based team matching**: Legacy system matches drivers to teams by matching the `color` field.

## Critical Implementation Details

### Data Build Script (build-seasons.mjs)

**Driver Name Resolution:**
- Handles aliases via `driverAliasConfig` (e.g., "KickstartMyKart" → "KickStart")
- Resolves guest/substitute drivers as entrants
- Marks unmatched drivers as guests with `isGuest: true`

**Team Assignment:**
- Primary method: Match driver.color to team.color
- Override: `teamOverrides` object for manual team assignment (e.g., session4html KickStart)

**Race Date Parsing:**
- Parses dates from `settings.other_settings` field
- Format: "February 4th, 8:00 PM EST"
- Strips ordinal suffixes (st/nd/rd/th) before Date.parse()

### Frontend State Management (v2/assets/app.js)

**Global State Object:**
```javascript
state = {
  seasons: [],           // All loaded seasons
  seasonIndex: 0,        // Currently selected season index
  raceIndex: 0,         // Currently selected race index
  driverById: Map(),    // Fast driver lookup
  driverByName: Map(),  // Name-based driver lookup (includes aliases)
  teamById: Map()       // Fast team lookup
}
```

**Rendering Flow:**
1. `loadData()` fetches seasons.json
2. `setSeason(index)` populates Maps for current season
3. Individual render functions update DOM sections:
   - `renderHero()` - Top hero cards with latest season/race
   - `renderDriverStandings()` - Sorted driver table
   - `renderTeamStandings()` - Teams with aggregated driver points
   - `renderRace()` - Selected race details and results
   - `renderStats()` - Wins, podiums, averages (min 3 races to qualify)

**Statistics Eligibility:**
Only drivers with 3+ races appear in stats sections. This prevents skewing averages with guest appearances.

### Mobile-First Responsive Design

- Tables convert to card layout < 640px using `data-label` attributes
- Navigation collapses to hamburger menu < 900px
- Grid layouts stack/expand at 768px and 1024px breakpoints
- All sizing uses `clamp()` for fluid typography

## Common Workflows

### Adding a New Race to a Season

1. Edit the appropriate legacy JSON file (e.g., `session3/race_results.json`)
2. Add race object with all required fields:
   ```json
   {
     "race_id": "race12",
     "race_name": "Race 12: Spa-Francorchamps",
     "track_image": "https://example.com/track.png",
     "settings": {
       "car": "Gr.3",
       "weather": "Clear",
       "laps": 20,
       "other_settings": "April 22nd, 8:00 PM EST"
     },
     "results": [
       { "position": 1, "driver": "TheSlayter", "car": "...", "points": 25 }
     ]
   }
   ```
3. Update driver totals in `session3/drivers.json`
4. Rebuild: `node v2/scripts/build-seasons.mjs`
5. Refresh browser to see changes

### Adding a New Season

1. Create new folder with three JSON files: `drivers.json`, `teams.json`, `race_results.json`
2. Edit `v2/scripts/build-seasons.mjs`:
   - Add season config to `seasonsConfig` array
   - Add driver aliases to `driverAliasConfig` if needed
   - Add team overrides to `teamOverrides` if needed
3. Rebuild: `node v2/scripts/build-seasons.mjs`

### Updating Driver Points

1. Edit `session[X]/drivers.json` directly
2. Rebuild: `node v2/scripts/build-seasons.mjs`
3. Changes reflect immediately in all standings tables

## Styling Conventions

- CSS custom properties defined in `:root` for theming
- All colors use rgba() with alpha for layering effects
- Border radius: `--radius-lg` (18px), `--radius-md` (14px), `--radius-sm` (10px)
- Shadows: `--shadow-lg` for cards, `--shadow-md` for elevated elements
- Driver/team colors rendered as inline styles via `sanitizeColor()` function

## Important Notes

- The v2 site does **not** require a build step for deployment - it's pure HTML/CSS/JS
- `build-seasons.mjs` is only needed when updating data files
- Legacy pages (index.html, race_results.html) still use old architecture
- All dates stored in ISO-8601 format but displayed via `Intl.DateTimeFormat`
- Track images are external URLs, not stored in repository
