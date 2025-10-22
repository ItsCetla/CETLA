# CETLA Racing League v2

This directory houses the refreshed single-page app for the CETLA Racing League site.  
Goals for this iteration:

- Unify all legacy session data into a single schema so updating points or adding races means editing one file.
- Deliver a modern, mobile-first layout that reuses components (cards, tables, tabs) across sections.
- Keep the stack simple (vanilla HTML/CSS/JS) so the site can still be hosted statically on GitHub Pages.

## Data Model

All seasons live in `data/seasons.json`. Edit this file directly to add seasons, races, or update points.

```jsonc
{
  "seasons": [
    {
      "id": "session3",
      "label": "Multi-Car",
      "description": "11 race friendly season",
      "brandColor": "#5B21B6",
      "drivers": [
        {
          "id": "rambo",
          "name": "Rambo",
          "teamId": "team-romero",
          "color": "#7C3AED",
          "points": 248
        }
      ],
      "teams": [
        {
          "id": "team-romero",
          "name": "Team Romero",
          "color": "#7C3AED"
        }
      ],
      "races": [
        {
          "id": "race1",
          "name": "Race 1: Blue Moon Bay Infield B",
          "track": "Blue Moon Bay Speedway Infield B",
          "carClass": "Grade 3 (Gr.3)",
          "weather": "Night & Clear",
          "laps": 30,
          "notes": "Friendly Season Opener",
          "trackImage": "https://static.wikia.nocookie.net/gran-turismo/images/c/cd/Blue_Moon_Bay_Speedway_-_Infield_B.jpg/revision/latest?cb=20180301025958",
          "results": [
            { "position": 1, "driverId": "rambo", "points": 25, "car": "Toyota GR Supra '18", "fastestLap": "1:21.234" }
          ]
        }
      ]
    }
  ]
}
```

### Why this shape?

- `driverId` links results back to the driver roster, so standings can be re-used across tables without relying on matching color strings.
- Storing dates in ISO-8601 makes it easy to format locally (e.g. `Intl.DateTimeFormat`) and helps future automation.
- Individual `notes` fields cover special race context without forcing a rigid structure.

> Tip: when adding a new race, duplicate an existing race object inside the appropriate season, update the `id`, `round`, `name`, and `results` array.

## App Structure

```
v2/
├── data/
│   └── seasons.json          # unified data for every season
├── assets/
│   ├── styles.css            # mobile-first design system
│   ├── analytics.css         # analytics page styles
│   └── app.js                # data fetching + view controllers
├── index.html                # main site entry point
└── analytics.html            # analytics dashboard
```

### Key Screens

1. **Hero Overview** – surfaces the latest season snapshot plus the most recent race podium (with track/date callouts) alongside quick navigation.
2. **Season Overview** – tabs for Drivers / Teams / Race Results / Stats, driven by the same data payload.
3. **Race Drawer** – select a race to view results, settings, and track artwork.

Navigation collapses into a hamburger menu for devices `< 768px`, while cards/tables stack vertically using CSS Grid—no horizontal swiping needed on phones.

## Adding Data

1. **New Season**: Add a season object to the `seasons` array in `data/seasons.json`
2. **New Race**: Add a race object to the appropriate season's `races` array
3. **Update Points**: Modify driver `points` values in the season's `drivers` array
4. **Changes are immediate**: Refresh the browser to see updates
