# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CETLA Racing League is a Gran Turismo 7 racing league website. The site is a modern single-page application with a unified data model that consolidates all seasons into a single `seasons.json` file for easier maintenance and updates.

## Project Structures

```
CETLA/
└── v2/                          # Single-page application
    ├── index.html               # Single entry point
    ├── analytics.html           # Analytics dashboard
    ├── assets/
    │   ├── app.js              # Core data loading & rendering logic
    │   ├── styles.css          # Mobile-first responsive design
    │   └── analytics.css       # Analytics page styles
    └── data/
        └── seasons.json        # Unified data for all seasons
```

## Development Commands

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

### Data Model (seasons.json)

The data model uses **relational linking** via IDs:

- **Seasons** contain arrays of drivers, teams, and races
- **Drivers** link to teams via `teamId`
- **Race results** link to drivers via `driverId`
- **Driver aliases** map alternative names to canonical driver records

Key design decisions:
- ISO-8601 dates for race scheduling
- Separate `entrant` field when guest drivers participate under another driver's name
- `isGuest` flag marks drivers not in the season roster
- Points are stored at both driver level (season totals) and result level (per-race)

## Critical Implementation Details

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

1. Edit `v2/data/seasons.json` directly
2. Find the appropriate season in the `seasons` array
3. Add a new race object to the season's `races` array:
   ```json
   {
     "id": "race12",
     "round": 12,
     "name": "Race 12: Spa-Francorchamps",
     "trackImage": "https://example.com/track.png",
     "schedule": {
       "date": "2024-04-22T20:00:00-05:00",
       "venue": "Spa-Francorchamps"
     },
     "settings": {
       "carClass": "Gr.3",
       "weather": "Clear",
       "laps": 20,
       "notes": "Special notes about the race"
     },
     "results": [
       {
         "position": 1,
         "driver": "TheSlayter",
         "driverId": "theslayter",
         "car": "Car Model",
         "points": 25,
         "fastestLap": "1:23.456"
       }
     ]
   }
   ```
4. Update driver points in the same season's `drivers` array
5. Refresh browser to see changes

### Adding a New Season

1. Edit `v2/data/seasons.json` directly
2. Add a new season object to the `seasons` array:
   ```json
   {
     "id": "session5",
     "label": "New Season Name",
     "description": "Description of the new season",
     "primaryColor": "#your-hex-color",
     "drivers": [],
     "teams": [],
     "races": []
   }
   ```
3. Populate the `drivers`, `teams`, and `races` arrays with your season data
4. Refresh browser to see the new season

### Updating Driver Points

1. Edit `v2/data/seasons.json` directly
2. Find the driver in the appropriate season's `drivers` array
3. Update the `points` field
4. Refresh browser to see changes immediately

## Styling Conventions

- CSS custom properties defined in `:root` for theming
- All colors use rgba() with alpha for layering effects
- Border radius: `--radius-lg` (18px), `--radius-md` (14px), `--radius-sm` (10px)
- Shadows: `--shadow-lg` for cards, `--shadow-md` for elevated elements
- Driver/team colors rendered as inline styles via `sanitizeColor()` function

## Important Notes

- The site does **not** require a build step for deployment - it's pure HTML/CSS/JS
- All data is stored in `v2/data/seasons.json` - edit this file directly to make changes
- All dates stored in ISO-8601 format but displayed via `Intl.DateTimeFormat`
- Track images are external URLs, not stored in repository
- The site automatically displays the latest season in hero cards
- Statistics require drivers to have participated in at least 3 races
