/* =========================================================
   main.js — orchestrator. World state, game loop, prompt
   handling, time travel, ambient behavior.
   ========================================================= */

const Main = (() => {

    const world = {
        clock: new Date(Date.UTC(2026, 3, 18, 12, 0, 0)), // sim time, starts "now"
        speed: 1,               // 0=pause, 1,4,24,168 = sim minutes / real second
        countryState: {},       // id -> { pop, happy, econ, peace, health, climate }
        countriesGeo: null,     // populated by MapView.init
        currentEra: null,
        lastTravelYear: null,
        eventCooldown: 0,
    };

    /* Initialize each country's state. */
    function seedCountryState(eraBase) {
        const b = eraBase || History.eraAt(world.clock.getUTCFullYear()).base;
        for (const id of ALL_COUNTRY_IDS) {
            const c = COUNTRIES[id];
            world.countryState[id] = {
                pop: c.pop * b.pop,
                happy:   jitter(b.happy),
                econ:    jitter(b.econ),
                peace:   jitter(b.peace),
                health:  jitter(b.health),
                climate: jitter(b.climate),
                history: [],   // ring buffer of recent snapshots
            };
        }
    }

    /* snapshot per-country history for sparklines */
    function snapshotHistory() {
        for (const id of ALL_COUNTRY_IDS) {
            const cs = world.countryState[id]; if (!cs) continue;
            cs.history.push({ h: cs.happy, p: cs.peace, e: cs.econ, hl: cs.health });
            if (cs.history.length > 40) cs.history.shift();
        }
    }
    function jitter(v) { return Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.1)); }

    /* Bootstrap the whole app. */
    /* Poll News.getLiveHeadlines() every 150ms, resolving once at least one
       live item is available or the timeout fires — whichever comes first. */
    function waitForLiveNews(timeoutMs) {
        return new Promise(resolve => {
            const started = performance.now();
            const check = () => {
                try {
                    const h = (typeof News !== 'undefined' && News.getLiveHeadlines)
                        ? News.getLiveHeadlines(1) : [];
                    if (h && h.length) return resolve();
                } catch (_) {}
                if (performance.now() - started >= timeoutMs) return resolve();
                setTimeout(check, 150);
            };
            check();
        });
    }

    async function start() {
        const bootEl = (msg, p) => {
            if (typeof UI !== 'undefined' && UI.boot) UI.boot(msg, p);
            else {
                const b = document.getElementById('bootStatus'); if (b) b.textContent = msg;
                const bar = document.querySelector('.boot-bar-fill'); if (bar && typeof p === 'number') bar.style.width = p + '%';
            }
        };
        bootEl('loading countries and history…', 10);
        Achievements.load();

        // world state — kept minimal for History mode (per-country baselines
        // still drive the timeline tinting). The interactive sandbox
        // (population, prompts, simulated events) has been retired.
        bootEl('seeding country baselines…', 35);
        seedCountryState();

        bootEl('drawing continents…', 55);
        await MapView.init(world);

        // hook up UI
        bootEl('assembling the HUD…', 90);
        UI.init(world);
        Ticker.init(world);
        News.init(world);
        UI.initMode();   // default to Gaia (live) — kicks off the live wire fetch

        // Hold the boot screen until the live headlines flow in (or ~8s timeout).
        bootEl('tuning into the live wire…', 97);
        await waitForLiveNews(8000);

        // dismiss boot
        bootEl('ready.', 100);
        setTimeout(() => {
            document.getElementById('boot').classList.add('fade');
            setTimeout(() => { const b = document.getElementById('boot'); if (b) b.remove(); }, 1200);
            document.getElementById('app').classList.remove('hidden');
        }, 200);

        // game loop
        lastTime = performance.now();
        requestAnimationFrame(loop);

        // initial log (shown in History mode)
        UI.log('<b>Gaia is awake.</b> Tap <b>History</b> up top to shape any era.', 'good');
        UI.log('In Gaia mode you\'re looking at the real Earth — live.', 'info');

        // honor ?y=YEAR in the URL for shareable time-travel links
        try {
            const params = new URLSearchParams(window.location.search);
            const y = parseInt(params.get('y'));
            if (!isNaN(y)) {
                setTimeout(() => travelTo(y), 600);
            }
        } catch(e) {}
    }

    /* Main game loop. */
    let lastTime = 0;
    let statsTimer = 0;
    let ambientTimer = 0;
    let lastRenderTime = 0;
    function loop(now) {
        const dt = Math.min(100, now - lastTime);
        lastTime = now;

        // News ticker keeps refreshing live headlines; everything else
        // (population, ambient sim events, trade arcs) was sandbox stuff
        // that's been retired.
        Ticker.tick(dt);
        News.tick(dt);

        // Smart render: paint only when something actually changed
        // (camera moved, hover changed, country fill changed). The sim is
        // gone, so the map is fully event-driven now.
        const dirty = MapView.consumeRenderDirty();
        const needsPaint = dirty || (now - lastRenderTime >= 800);
        if (needsPaint) {
            MapView.render(world);
            lastRenderTime = now;
        }

        // HUD updates at ~3 Hz (clock primarily; the rest is no-op now)
        statsTimer += dt;
        if (statsTimer > 330) {
            UI.updateClock();
            statsTimer = 0;
        }

        requestAnimationFrame(loop);
    }

    function moodClass(m) {
        if (m === 'good') return 'good';
        if (m === 'bad')  return 'bad';
        if (m === 'warn') return 'warn';
        return 'info';
    }

    /* Time travel: jump the simulation clock to a given year, reseed state
       from the era baseline, trigger any historical events near that year. */
    let travelDebounce = null;
    function travelTo(year, silent = false) {
        year = Math.max(-3000, Math.min(2300, year));
        const current = world.clock.getUTCFullYear();
        // skip no-op silent travels (e.g., continuous drag within same year)
        if (silent && year === current) return;

        world.clock = new Date(Date.UTC(year, 5, 21, 12, 0, 0));
        const era = History.eraAt(year);
        world.currentEra = era;
        seedCountryState(era.base);
        Achievements.noteTravel(year);

        if (!silent) {
            if (typeof UI !== 'undefined' && UI.rebuildTimeline) UI.rebuildTimeline();
            UI.showEraBanner(era, year);
            // surface the most significant historical event near this year in
            // the new event-detail panel (Phase 2).
            clearTimeout(travelDebounce);
            travelDebounce = setTimeout(() => {
                const near = History.eventsNear(year, 2);
                if (near.length && UI.showEventDetail) {
                    // pick the most severe, fall back to first
                    const top = near.slice().sort((a,b) => (b.severity||0) - (a.severity||0))[0];
                    UI.showEventDetail(top);
                }
            }, 900);
        }
    }

    /* public */
    return {
        start,
        travelTo,
        get world() { return world; },
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    Main.start();
});
