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
| `space` | pause / resume |
| `h` | help |
| `r` | reset camera |
| `esc` | close panels |
| mouse-wheel | zoom |
| drag on globe | pan |

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

## Architecture

Everything runs in the browser. No frameworks.

```
index.html                     top-level page + HUD skeleton
styles.css                     glassmorphic HUD styles
js/
  cultures.js                  cultural profiles (names, activities, colors)
  countries.js                 ~130 countries w/ centroids + aliases
  parser.js                    natural-language prompt → event
  history.js                   eras + curated historical events; time travel
  weather.js                   clouds, storms, particles, day/night math
  events.js                    active-event manager + passive state effects
  population.js                ~4,200 dots distributed by country population
  map.js                       D3 + TopoJSON Earth rendered into <canvas>
  narrator.js                  Gaia's voice — turns events into prose
  achievements.js              unlockables, saved in localStorage
  ui.js                        HUD controller + timeline scrubber
  main.js                      orchestrator + game loop
```

Built with [D3](https://d3js.org/) and [world-atlas](https://github.com/topojson/world-atlas) for the map, and your imagination for everything else.

## License

MIT.
