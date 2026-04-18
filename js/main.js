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
            };
        }
    }
    function jitter(v) { return Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.1)); }

    /* Bootstrap the whole app. */
    async function start() {
        UI.boot('seeding 4,200 souls…');
        Achievements.load();

        // world state
        seedCountryState();
        Population.init();

        UI.boot('drawing continents…');
        await MapView.init(world);

        Weather.init();

        // hook up UI
        UI.init(world);

        // dismiss boot
        UI.boot('ready.');
        setTimeout(() => {
            document.getElementById('boot').classList.add('fade');
            setTimeout(() => document.getElementById('boot').remove(), 1200);
            document.getElementById('app').classList.remove('hidden');
        }, 400);

        // game loop
        lastTime = performance.now();
        requestAnimationFrame(loop);

        // initial log
        UI.log('<b>Gaia is awake.</b> Speak into the prompt to shape the world.', 'good');
        UI.log('Try <b>earthquake in Japan</b>, <b>travel to 1969</b>, or <b>festival in Rio</b>.', 'info');
    }

    /* Main game loop. */
    let lastTime = 0;
    let statsTimer = 0;
    let ambientTimer = 0;
    function loop(now) {
        const dt = Math.min(100, now - lastTime);
        lastTime = now;

        // advance sim clock
        if (world.speed > 0) {
            // speed = sim minutes per real second
            const simMinutes = world.speed * (dt / 1000);
            world.clock = new Date(world.clock.getTime() + simMinutes * 60 * 1000);
        }

        // tick simulation at ~30 FPS pace
        Weather.tick(dt);
        Events.tick(world, dt);
        Population.tick(world, dt * Math.max(1, world.speed / 4));

        // maybe trigger historical events as time passes
        maybeFireHistoricalEvents(dt);

        // ambient drift: states slowly move toward era baseline
        driftToBaseline(dt);

        // render
        MapView.render(world);

        // HUD updates at ~3 Hz
        statsTimer += dt;
        if (statsTimer > 330) {
            UI.updateStats();
            UI.updateClock();
            statsTimer = 0;
            // refresh country detail if open
            const id = MapView.clickedId;
            if (id && !document.getElementById('countryDetail').classList.contains('hidden')) {
                UI.showCountryDetail(id);
            }
        }

        // ambient: occasional small weather events (pure atmosphere)
        ambientTimer += dt;
        if (ambientTimer > 9000 && world.speed > 0) {
            ambientTimer = 0;
            if (Math.random() < 0.5) spawnAmbientWeather();
        }

        requestAnimationFrame(loop);
    }

    /* Prevent extreme drift over time: each country slowly returns toward its era baseline. */
    function driftToBaseline(dt) {
        const era = History.eraAt(world.clock.getUTCFullYear());
        const b = era.base;
        const rate = 0.00005 * dt;
        for (const id of ALL_COUNTRY_IDS) {
            const s = world.countryState[id];
            s.happy   += (b.happy   - s.happy)   * rate;
            s.econ    += (b.econ    - s.econ)    * rate;
            s.peace   += (b.peace   - s.peace)   * rate;
            s.health  += (b.health  - s.health)  * rate;
            s.climate += (b.climate - s.climate) * rate;
        }
    }

    /* Spawn a subtle weather event somewhere populated, for atmosphere. */
    function spawnAmbientWeather() {
        const ids = ['156','840','356','250','276','076','392','643','036','710','566','358','360'];
        const id = ids[Math.floor(Math.random()*ids.length)];
        const c = COUNTRIES[id]; if (!c) return;
        const kinds = ['rain','sunshine','fog','snow','storm'];
        const kind = kinds[Math.floor(Math.random()*kinds.length)];
        const lib = EVENT_LIB[kind];
        const ev = {
            kind, severity: 0.3, duration: 10 + Math.random()*15,
            mood: lib.mood, label: lib.label, emoji: lib.emoji,
            targets: [id], locationLabel: 'in ' + c.name,
        };
        Events.add(ev, world);
    }

    /* Given current date, fire near-date historical events if not yet triggered.
       This only happens during time travel scrubbing, or if speed is high. */
    let lastYearFired = null;
    function maybeFireHistoricalEvents(dt) {
        const y = world.clock.getUTCFullYear();
        if (y === lastYearFired) return;
        // only fire at year boundary for fast speeds (>= 24×)
        if (world.speed < 24) return;
        lastYearFired = y;
        const near = History.eventsNear(y, 0);
        for (const he of near) {
            const ev = History.buildEvent(he);
            fireEvent(ev, { skipAch: false, silent: false });
        }
    }

    /* Handle a prompt from the user. */
    function handlePrompt(raw) {
        Achievements.unlock('first');

        // time travel?
        const tt = History.parseTimeTravel(raw);
        if (tt) {
            travelTo(tt.year);
            return;
        }

        const parsed = parsePrompt(raw);
        if (!parsed) { UI.log('Gaia listens, but hears no command.', 'info'); return; }

        if (parsed.type === 'help') {
            document.getElementById('helpModal').classList.remove('hidden');
            return;
        }
        if (parsed.type === 'control') {
            if (parsed.action === 'pause') { world.speed = 0; UI.log('Time pauses.', 'info'); }
            else if (parsed.action === 'play') { world.speed = 1; UI.log('Time flows again.', 'good'); }
            else if (parsed.action === 'reset') { resetWorld(); UI.log('The world is reset.', 'info'); }
            document.querySelectorAll('.tc').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.speed) === world.speed);
            });
            return;
        }
        if (parsed.type === 'zoom') {
            const loc = parsed.location;
            if (loc.kind === 'country') {
                const c = COUNTRIES[loc.id];
                MapView.zoomTo(c.lat, c.lon, 700);
                UI.log(`Gaia turns her gaze toward <b>${c.name}</b>.`, 'info');
            } else if (loc.kind === 'continent') {
                const c = CONTINENTS[loc.id];
                MapView.zoomTo(c.lat, c.lon, 400);
                UI.log(`Gaia looks <b>${c.label}</b>.`, 'info');
            } else if (loc.kind === 'world') {
                MapView.resetView();
                UI.log('Gaia pulls back to see the whole world.', 'info');
            }
            return;
        }

        // event!
        fireEvent(parsed, { userInitiated: true });
    }

    /* Fire an event (from user, history, or ambient). */
    function fireEvent(ev, opts = {}) {
        const rec = Events.add(ev, world);
        // screen shake + flash
        if (ev.shake) {
            document.body.classList.remove('shake');
            void document.body.offsetWidth;
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 700);
            const flash = document.createElement('div');
            flash.className = 'flash-overlay';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 1000);
        }
        if (!opts.silent) {
            UI.log(Narrator.headline(ev), moodClass(ev.mood));
            setTimeout(() => UI.log(Narrator.narrate(ev), moodClass(ev.mood)), 400 + Math.random()*800);
            if (ev.note) setTimeout(() => UI.log('<em>' + ev.note + '</em>', 'info'), 1400);
        }
        // zoom to action if single-country user event
        if (opts.userInitiated && ev.targets && ev.targets.length === 1) {
            const c = COUNTRIES[ev.targets[0]];
            if (c) MapView.zoomTo(c.lat, c.lon, Math.max(MapView.scale || 400, 400));
        }
        Achievements.noteEvent(ev);
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
        if (year === current) return;

        world.clock = new Date(Date.UTC(year, 5, 21, 12, 0, 0));
        const era = History.eraAt(year);
        world.currentEra = era;
        seedCountryState(era.base);
        // scale the dot population to match era pop (cheaply, only if major jump)
        const targetDots = Math.round(4200 * Math.max(0.05, era.base.pop));
        Population.scaleTo(targetDots);
        Events.clear();
        Weather.clearAll();
        Weather.init();

        Achievements.noteTravel(year);

        if (!silent) {
            UI.showEraBanner(era, year);
            UI.log(`<b>${year < 0 ? Math.abs(year)+' BCE' : year}</b> — ${Narrator.eraIntro(era)}`, 'info');
            // fire immediate nearby events (within ±2 years)
            clearTimeout(travelDebounce);
            travelDebounce = setTimeout(() => {
                const near = History.eventsNear(year, 2);
                near.forEach((he, i) => {
                    setTimeout(() => {
                        const ev = History.buildEvent(he);
                        fireEvent(ev, { silent: false });
                    }, i * 600);
                });
            }, 900);
        }
    }

    function resetWorld() {
        Events.clear();
        Weather.clearAll();
        Weather.init();
        world.clock = new Date(Date.UTC(2026, 3, 18, 12, 0, 0));
        seedCountryState();
        Population.init();
    }

    /* public */
    return {
        start,
        handlePrompt,
        travelTo,
        fireEvent,
        get world() { return world; },
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    Main.start();
});
