# GAIA — a living Earth

A single-page, browser-only simulation of a miniature Earth. Thousands of culturally-distinct people rise, work, celebrate and sleep across the continents in real time. You can shape their world — or travel through history to see how the real world has shaped itself — with natural-language prompts.

Live on GitHub Pages. No server, no tracking, no keys.

---

## What you can do

**Shape the world** — type anything into the prompt at the bottom:

- **Disasters** — `earthquake in Japan`, `massive tsunami off Indonesia`, `wildfires across Australia`, `meteor strike on Siberia`, `drought across the Sahel`
- **Blessings** — `bless the world with prosperity`, `peace in the Middle East`, `miracle in Jerusalem`, `healing wave over Africa`, `renaissance in Italy`
- **Society** — `festival in Rio`, `revolution in France`, `baby boom in India`, `protest in Hong Kong`, `exodus from Venezuela`
- **Weather** — `rain over Sahara`, `blizzard in Canada`, `aurora over Norway`, `sunshine worldwide`, `rainbow in Ireland`
- **Wonder** — `alien contact over New York`, `dragons return to Scandinavia`, `zombie outbreak in Florida`, `eclipse over Egypt`

**Travel through time** — the timeline at the bottom-left scrubs from 3000 BCE to 2300 CE. You can also type:

- `travel to 1969` — watch Apollo 11 land
- `travel to 1347` — witness the Black Death
- `travel to the renaissance`
- `go to year 1492`
- `take me to the industrial revolution`
- `travel to 2150` — glimpse a plausible future

Jumping eras reseeds the world's baseline population, health, peace and prosperity to match — and triggers the real historical events that happened at that moment.

**Explore** — click any country for a live snapshot: local time, mood, health, and what a random citizen is doing *right now*. The day-night terminator follows the real sun. The city lights only come on at night.

**Controls**

| Key | Action |
| --- | --- |
| `/` | focus the prompt |
| `↑` / `↓` | browse prompt history |
| `space` | pause / resume |
| `h` | help |
| `r` | reset camera |
| `esc` | close panels |
| mouse-wheel | zoom |
| drag on map | pan (flat) · rotate (globe) |
| click the clock | copy a shareable time-travel link |

**Buttons in the bottom-right**

- 🌐 switch between a flat map and a spinning globe
- ◎ cycle the data layer (mood / happy / peace / econ / health / climate / pop)
- 🏆 open the achievements drawer
- ? open help

---

## Running locally

No build step. Just serve the folder over HTTP:

```bash
# any static file server works:
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` via `file://` may fail on some browsers because the world-atlas topojson is fetched from a CDN and D3 requires CORS — use a local server.

## Deploying to GitHub Pages

In the repository settings, under **Pages**, point the source at this branch's root. A `.nojekyll` file is included so your JS module paths are served as-is.

### Custom domain

Once the site is live, you can point a domain at it so the URL reads `https://gaia.yourdomain.com/` instead of `asworbix.github.io/Mighty-Sandbox/`:

1. Create a file named `CNAME` in the repo root with a single line — your domain (e.g. `gaia.yourdomain.com`).
2. In your DNS provider, add a `CNAME` record: `gaia` → `asworbix.github.io` (or apex `A` records to GitHub's IPs if using the root).
3. Back in **Settings → Pages**, set the custom domain and tick **Enforce HTTPS**.

A few cheap/available TLDs that look great here: `.earth`, `.world`, `.live`, `.so`, `.studio`, `.space`, `.one`.

## Architecture

Everything runs in the browser. No frameworks.

```
index.html                     top-level page + HUD skeleton
styles.css                     glassmorphic HUD styles
js/
  cultures.js                  16 cultural profiles (names, activities, colors)
  countries.js                 ~130 countries, aliases, regions, flag mapping
  parser.js                    natural-language prompt → event / travel / command
  history.js                   14 eras + ~130 curated historical events
  weather.js                   clouds, storms, particles, day/night math
  events.js                    active-event manager + passive state effects
  population.js                ~4,200 dots distributed by country population
  map.js                       D3 + TopoJSON Earth on canvas (flat + globe)
  arcs.js                      animated arcs for trade, migration, war, blessing
  ticker.js                    breaking-news strip across the top
  narrator.js                  Gaia's voice — turns events into short prose
  achievements.js              unlockables, localStorage-persisted
  quests.js                    rotating objectives for new players
  ui.js                        HUD controller, tooltip, timeline, modals
  main.js                      orchestrator + game loop + time travel
```

## Features

- **Natural-language prompt parser** that covers disasters, blessings, wars, plagues, weather, society, wonder, and special cases. Intensity and duration modifiers are supported ("massive earthquake", "war for 3 days").
- **Time travel** with a draggable timeline (3000 BCE → 2300 CE), 14 baseline eras, and ~130 real historical events that trigger when you arrive near them. Shareable `?y=YEAR` URLs.
- **Two projections**: flat Natural Earth or a spinning orthographic globe. Auto-rotates when idle on the globe; drag to rotate.
- **Day-night terminator** that follows the real sun position. City lights come on only at night.
- **Seven data layers** you can cycle with the ◎ button: composite mood, happiness, peace, prosperity, health, climate, population.
- **Live chronicle log** narrating every event in one-sentence prose.
- **Breaking news ticker** showing the strongest and weakest countries on each metric, refreshed with every event.
- **Per-country detail panel** with live stats, a random citizen's current activity, and a recent-trend sparkline.
- **Animated arcs** connecting countries for trade (ambient), migration, war, and blessings.
- **Weather system** with drifting clouds, storms, rain / snow / embers / aurora / sparks particles, and screen-shake on large disasters.
- **Achievements** saved in localStorage.
- **Rotating objectives** to guide new players through the mechanics.
- **Ten+ easter eggs** — try phrases like "god mode", "thanos", "apocalypse", "long live the king".

Built with [D3](https://d3js.org/) and [world-atlas](https://github.com/topojson/world-atlas) for the map, and your imagination for everything else.

## License

MIT.
