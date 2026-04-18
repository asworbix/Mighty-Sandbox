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
    async function start() {
        const bootEl = (msg, p) => {
            if (typeof UI !== 'undefined' && UI.boot) UI.boot(msg, p);
            else {
                const b = document.getElementById('bootStatus'); if (b) b.textContent = msg;
                const bar = document.querySelector('.boot-bar-fill'); if (bar && typeof p === 'number') bar.style.width = p + '%';
            }
        };
        bootEl('loading cultures and countries…', 10);
        Achievements.load();

        // world state
        bootEl('seeding ~4,200 souls…', 25);
        seedCountryState();
        Population.init();

        bootEl('drawing continents…', 55);
        await MapView.init(world);

        bootEl('calling forth the weather…', 75);
        Weather.init();

        // hook up UI
        bootEl('assembling the HUD…', 90);
        UI.init(world);
        Ticker.init(world);

        // dismiss boot
        bootEl('ready.', 100);
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
        Arcs.tick(dt);
        Ticker.tick(dt);
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
            snapshotHistory();
            statsTimer = 0;
            // refresh country detail if open
            const id = MapView.clickedId;
            if (id && !document.getElementById('countryDetail').classList.contains('hidden')) {
                UI.showCountryDetail(id);
            }
        }

        // ambient: occasional small weather events and trade arcs
        ambientTimer += dt;
        if (ambientTimer > 9000 && world.speed > 0) {
            ambientTimer = 0;
            if (Math.random() < 0.5) spawnAmbientWeather();
        }
        if (world.speed > 0 && Math.random() < 0.02 * (dt/16)) {
            Arcs.spawnAmbientTrade();
        }
        if (Math.random() < 0.0012 * (dt/16)) spawnShootingStar();

        requestAnimationFrame(loop);
    }

    /* Prevent extreme drift over time: each country slowly returns toward its era baseline.
       Also apply simple demographic drift: healthy/peaceful countries grow; troubled shrink. */
    function driftToBaseline(dt) {
        const era = History.eraAt(world.clock.getUTCFullYear());
        const b = era.base;
        const rate = 0.00005 * dt;
        const popRate = 0.0000008 * dt * Math.max(1, world.speed);
        for (const id of ALL_COUNTRY_IDS) {
            const s = world.countryState[id];
            s.happy   += (b.happy   - s.happy)   * rate;
            s.econ    += (b.econ    - s.econ)    * rate;
            s.peace   += (b.peace   - s.peace)   * rate;
            s.health  += (b.health  - s.health)  * rate;
            s.climate += (b.climate - s.climate) * rate;

            // demographics: a country's pop shifts toward health*peace
            const target = COUNTRIES[id].pop * b.pop * (0.4 + s.health * 0.5 + s.peace * 0.2);
            s.pop += (target - s.pop) * popRate;
            if (s.pop < 0.01) s.pop = 0.01;
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
        if (parsed.type === 'greet') {
            UI.log('Gaia hears you. She tilts her head, gently curious.', 'good');
            UI.log('<em>Say the word and I will make it rain, or burn, or bloom.</em>', 'info');
            return;
        }
        if (parsed.type === 'introspect') {
            introspect();
            return;
        }
        if (parsed.type === 'easter') {
            runEasterEgg(parsed.which);
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
        Arcs.onEvent(ev);
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
            if (c) MapView.zoomTo(c.lat, c.lon, MapView.mode === 'globe' ? 330 : 560);
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
        Arcs.clear();
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

    /* Gaia's self-introspection. Long-form report of current state. */
    function introspect() {
        const ids = ALL_COUNTRY_IDS;
        let total = 0, hSum = 0, eSum = 0, pSum = 0, hlSum = 0, clSum = 0, w = 0;
        let rich = null, poor = null, happy = null, sad = null, peace = null, war = null, sick = null, healthy = null;
        for (const id of ids) {
            const cs = world.countryState[id]; if (!cs) continue;
            total += cs.pop;
            const weight = cs.pop;
            hSum += cs.happy * weight; eSum += cs.econ * weight; pSum += cs.peace * weight;
            hlSum += cs.health * weight; clSum += cs.climate * weight; w += weight;
            if (!rich  || cs.econ  > rich.v)  rich  = { id, v: cs.econ };
            if (!poor  || cs.econ  < poor.v)  poor  = { id, v: cs.econ };
            if (!happy || cs.happy > happy.v) happy = { id, v: cs.happy };
            if (!sad   || cs.happy < sad.v)   sad   = { id, v: cs.happy };
            if (!peace || cs.peace > peace.v) peace = { id, v: cs.peace };
            if (!war   || cs.peace < war.v)   war   = { id, v: cs.peace };
            if (!healthy|| cs.health> healthy.v) healthy = { id, v: cs.health };
            if (!sick  || cs.health < sick.v) sick  = { id, v: cs.health };
        }
        const era = History.eraAt(world.clock.getUTCFullYear());
        const y = world.clock.getUTCFullYear();
        const yearStr = y < 0 ? Math.abs(y) + ' BCE' : y;

        UI.log(`<b>Gaia whispers a report —</b> ${yearStr}, the <b>${era.name}</b>.`, 'info');
        UI.log(`Earth holds <b>${formatPopB(total)}</b> souls. Average mood <b>${Math.round(hSum/w*100)}%</b>, peace <b>${Math.round(pSum/w*100)}%</b>.`, 'info');
        if (happy) UI.log(`Happiness is brightest in <b>${COUNTRIES[happy.id].name}</b>, dimmest in <b>${COUNTRIES[sad.id].name}</b>.`, 'info');
        if (rich)  UI.log(`Wealth gathers in <b>${COUNTRIES[rich.id].name}</b>; is thin in <b>${COUNTRIES[poor.id].name}</b>.`, 'info');
        if (peace) UI.log(`Quietest country: <b>${COUNTRIES[peace.id].name}</b>. Most tense: <b>${COUNTRIES[war.id].name}</b>.`, 'info');
        if (healthy)UI.log(`Healthiest: <b>${COUNTRIES[healthy.id].name}</b>. Most troubled health: <b>${COUNTRIES[sick.id].name}</b>.`, 'info');

        const active = Events.active;
        if (active.length) {
            UI.log(`<b>${active.length}</b> active event${active.length===1?'':'s'} ripple${active.length===1?'s':''} through the world:`, 'info');
            for (const ev of active.slice(0, 4)) {
                UI.log('&nbsp;&nbsp;' + Narrator.headline(ev), moodClass(ev.mood));
            }
        } else {
            UI.log('For this moment, the world is quiet.', 'info');
        }
    }

    function formatPopB(m) {
        if (m >= 1000) return (m/1000).toFixed(2) + 'B';
        if (m >= 1) return m.toFixed(0) + 'M';
        return (m*1000).toFixed(0) + 'K';
    }
    function pickRandom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

    function spawnShootingStar() {
        const s = document.createElement('div');
        s.className = 'shooting-star';
        s.style.top = (5 + Math.random() * 40) + '%';
        s.style.left = -10 + 'vw';
        s.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 3200);
    }

    /* Easter eggs */
    function runEasterEgg(which) {
        if (which === 'god') {
            UI.log('<b>GOD MODE.</b> All achievements unlocked. The world glows.', 'good');
            for (const a of Achievements.LIST) Achievements.unlock(a.id);
            // global blessing
            fireEvent({
                type:'event', kind:'miracle', severity:1, duration:45, mood:'good',
                label:'Divine Attention', emoji:'🌟', targets: ALL_COUNTRY_IDS.slice(),
                locationLabel:'worldwide',
            }, {});
        }
        if (which === 'thanos') {
            UI.log('<em>Perfectly balanced, as all things should be.</em>', 'warn');
            // halve population everywhere
            for (const id of ALL_COUNTRY_IDS) world.countryState[id].pop *= 0.5;
            fireEvent({
                type:'event', kind:'migration', severity:1, duration:60, mood:'bad',
                label:'The Snap', emoji:'🫰', targets: ALL_COUNTRY_IDS.slice(),
                locationLabel:'worldwide',
            }, {});
        }
        if (which === 'wakanda') {
            UI.log('Wakanda forever.', 'good');
            fireEvent({
                type:'event', kind:'innovation', severity:1, duration:60, mood:'good',
                label:'Vibranium Discovered', emoji:'⚡', targets: ['716','710','566'],
                locationLabel:'in southern Africa',
            }, {});
        }
        if (which === 'king') {
            UI.log('Long live the king.', 'info');
            fireEvent({
                type:'event', kind:'festival', severity:0.9, duration:40, mood:'good',
                label:'A New Monarch', emoji:'👑', targets: [pickRandom(ALL_COUNTRY_IDS)],
                locationLabel:'somewhere in the kingdoms',
            }, {});
        }
        if (which === 'apocalypse') {
            UI.log('<b>The sky darkens.</b> Listen carefully…', 'bad');
            fireEvent({
                type:'event', kind:'meteor', severity:1, duration:40, mood:'bad', shake:true,
                label:'Apocalypse', emoji:'☄', targets: ALL_COUNTRY_IDS.slice(),
                locationLabel:'worldwide',
            }, {});
            setTimeout(() => fireEvent({
                type:'event', kind:'plague', severity:1, duration:120, mood:'bad',
                label:'Four Horsemen Ride', emoji:'☠', targets: ALL_COUNTRY_IDS.slice(),
                locationLabel:'worldwide',
            }, {}), 2000);
        }
        if (which === 'love') {
            UI.log('Kindness ripples out from you across the Earth.', 'good');
            fireEvent({
                type:'event', kind:'peace', severity:0.8, duration:90, mood:'good',
                label:'A Wave of Love', emoji:'💚', targets: ALL_COUNTRY_IDS.slice(),
                locationLabel:'worldwide',
            }, {});
        }
    }

    function resetWorld() {
        Events.clear();
        Arcs.clear();
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
