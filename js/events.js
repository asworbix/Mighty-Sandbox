/* =========================================================
   events.js — active-event manager. Applies ongoing effects
   to country state (happiness / economy / peace / health /
   climate / population) and spawns visual effects via weather.
   ========================================================= */

const Events = (() => {
    let active = [];  // {kind, targets, severity, duration, age, mood, label, emoji, locationLabel, ...}
    let idSeq = 1;

    const PASSIVE_FX = {
        earthquake: { health:-0.25, peace:-0.2, pop:-0.002, econ:-0.35, happy:-0.3 },
        tsunami:    { health:-0.3,  peace:-0.1, pop:-0.003, econ:-0.4,  happy:-0.35 },
        volcano:    { health:-0.2,  climate:-0.2, pop:-0.002,econ:-0.25,happy:-0.2 },
        flood:      { health:-0.18, econ:-0.2,  happy:-0.2, climate:-0.1 },
        drought:    { health:-0.12, econ:-0.15, happy:-0.15,climate:-0.2 },
        hurricane:  { health:-0.2,  econ:-0.3,  happy:-0.25,climate:-0.1, pop:-0.001 },
        tornado:    { health:-0.15, econ:-0.2,  happy:-0.2 },
        wildfire:   { health:-0.15, econ:-0.2,  happy:-0.18,climate:-0.25 },
        blizzard:   { health:-0.15, econ:-0.15, happy:-0.18,climate:-0.05 },
        storm:      { happy:-0.1,  econ:-0.05, climate:-0.05 },
        meteor:     { health:-0.4,  econ:-0.5,  peace:-0.2, pop:-0.01, climate:-0.3, happy:-0.45 },

        prosperity: { happy:0.3, econ:0.35, health:0.15, peace:0.1 },
        peace:      { peace:0.5, happy:0.25, health:0.1 },
        healing:    { health:0.45, happy:0.2 },
        miracle:    { happy:0.5, health:0.2, peace:0.3, econ:0.2 },
        festival:   { happy:0.4, peace:0.1, econ:0.1 },
        harvest:    { econ:0.25, happy:0.2, health:0.1 },
        innovation: { econ:0.35, happy:0.2, health:0.2 },
        baby_boom:  { pop:0.02, happy:0.2 },

        war:        { peace:-0.6, happy:-0.35, econ:-0.3, health:-0.25, pop:-0.005 },
        revolution: { peace:-0.35,happy:-0.1, econ:-0.2 },
        protest:    { peace:-0.15,happy:-0.05, econ:-0.05 },
        migration:  { pop:-0.005, happy:-0.1, econ:-0.05 },

        plague:     { health:-0.5, happy:-0.3, econ:-0.25, pop:-0.008 },

        rain:       { climate:0.05, happy:-0.03 },
        snow:       { climate:0.04, happy:0.02 },
        sunshine:   { happy:0.15, climate:0.05 },
        rainbow:    { happy:0.1 },
        fog:        { happy:-0.03 },

        aurora:     { happy:0.2 },
        eclipse:    { happy:-0.05 },
        ufo:        { happy:0.05 },
        zombies:    { health:-0.4, peace:-0.5, pop:-0.01, happy:-0.4 },
        dragons:    { peace:-0.3, happy:0.1 },
        dance:      { happy:0.3, peace:0.1 },
        nightfall:  {},
        sunrise:    { happy:0.1 },
    };

    /* visual effect spawner per kind */
    function spawnVisuals(ev, world) {
        let ids = ev.targets || [];
        // cap visual emitters for world-scale events (effects still apply to state)
        if (ids.length > 10) {
            const sorted = ids.slice().sort((a, b) => (COUNTRIES[b]?.pop || 0) - (COUNTRIES[a]?.pop || 0));
            ids = sorted.slice(0, 10);
        }
        for (const id of ids) {
            const c = COUNTRIES[id];
            if (!c) continue;
            switch (ev.kind) {
                case 'earthquake': case 'tsunami': case 'volcano':
                    Weather.stormOver(c.lat, c.lon, 0.8);
                    Weather.emit(c.lat, c.lon, 'smoke', 6, Math.min(300, ev.duration*16));
                    if (ev.kind === 'volcano') Weather.emit(c.lat, c.lon, 'ember', 12, Math.min(400, ev.duration*16));
                    if (ev.kind === 'tsunami') Weather.emit(c.lat, c.lon, 'rain', 14, 200);
                    break;
                case 'flood':
                case 'rain':
                case 'storm':
                case 'hurricane':
                case 'tornado':
                    Weather.stormOver(c.lat, c.lon, ev.severity);
                    Weather.emit(c.lat, c.lon, 'rain', ev.kind === 'hurricane' ? 18 : 10, Math.min(400, ev.duration*16));
                    break;
                case 'blizzard':
                case 'snow':
                    Weather.emit(c.lat, c.lon, 'snow', 14, Math.min(400, ev.duration*16));
                    break;
                case 'wildfire':
                    Weather.emit(c.lat, c.lon, 'ember', 10, Math.min(400, ev.duration*16));
                    Weather.emit(c.lat, c.lon, 'smoke', 5, Math.min(400, ev.duration*16));
                    break;
                case 'meteor':
                    Weather.emit(c.lat, c.lon, 'ember', 20, 120);
                    Weather.emit(c.lat, c.lon, 'smoke', 10, 300);
                    Weather.stormOver(c.lat, c.lon, 1);
                    break;
                case 'drought':
                    Weather.emit(c.lat, c.lon, 'ash', 3, Math.min(400, ev.duration*16));
                    break;
                case 'festival':
                case 'dance':
                    Weather.emit(c.lat, c.lon, 'spark', 10, Math.min(300, ev.duration*16));
                    Weather.emit(c.lat, c.lon, 'blossom', 8, Math.min(300, ev.duration*16));
                    break;
                case 'prosperity':
                case 'harvest':
                case 'innovation':
                    Weather.emit(c.lat, c.lon, 'spark', 6, Math.min(300, ev.duration*16));
                    break;
                case 'peace':
                case 'healing':
                case 'miracle':
                    Weather.emit(c.lat, c.lon, 'heart', 4, Math.min(300, ev.duration*16));
                    break;
                case 'aurora':
                    Weather.emit(c.lat, c.lon, 'aurora', 8, Math.min(400, ev.duration*16));
                    break;
                case 'ufo':
                case 'zombies':
                case 'dragons':
                    Weather.emit(c.lat, c.lon, 'spark', 5, Math.min(200, ev.duration*16));
                    break;
                case 'plague':
                    Weather.emit(c.lat, c.lon, 'smoke', 4, Math.min(500, ev.duration*16));
                    break;
                case 'baby_boom':
                    Weather.emit(c.lat, c.lon, 'heart', 5, 200);
                    break;
                case 'war':
                case 'revolution':
                    Weather.emit(c.lat, c.lon, 'ember', 7, Math.min(400, ev.duration*16));
                    Weather.emit(c.lat, c.lon, 'smoke', 4, Math.min(400, ev.duration*16));
                    break;
                case 'sunshine':
                case 'sunrise':
                case 'rainbow':
                    Weather.emit(c.lat, c.lon, 'spark', 3, 120);
                    break;
                case 'fog':
                    Weather.stormOver(c.lat, c.lon, 0.3);
                    break;
            }
        }
    }

    function addEvent(ev, world) {
        const rec = Object.assign({ id: idSeq++, age: 0 }, ev);
        active.push(rec);
        spawnVisuals(rec, world);
        return rec;
    }

    function applyPassive(ev, world, dt) {
        const fx = PASSIVE_FX[ev.kind];
        if (!fx) return;
        const ids = ev.targets || [];
        // fade influence over event life
        const t = ev.age / ev.duration;
        const bell = Math.sin(Math.min(1, t) * Math.PI); // peaks in middle
        const factor = dt * 0.008 * ev.severity * bell;
        for (const id of ids) {
            const cs = world.countryState[id];
            if (!cs) continue;
            if (fx.happy   != null) cs.happy   = clamp01(cs.happy   + fx.happy   * factor);
            if (fx.econ    != null) cs.econ    = clamp01(cs.econ    + fx.econ    * factor);
            if (fx.peace   != null) cs.peace   = clamp01(cs.peace   + fx.peace   * factor);
            if (fx.health  != null) cs.health  = clamp01(cs.health  + fx.health  * factor);
            if (fx.climate != null) cs.climate = clamp01(cs.climate + fx.climate * factor);
            if (fx.pop     != null) cs.pop = Math.max(0, cs.pop * (1 + fx.pop * factor));
        }
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    function tick(world, dt) {
        for (let i = active.length - 1; i >= 0; i--) {
            const ev = active[i];
            ev.age += dt;
            applyPassive(ev, world, dt);
            if (ev.age >= ev.duration) active.splice(i, 1);
        }
    }

    function renderLabels(ctx, projection) {
        ctx.save();
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const ev of active) {
            const cap = ev.targets.length > 20 ? 6 : Math.min(4, ev.targets.length);
            const sortedForLabels = ev.targets.length > 20
                ? ev.targets.slice().sort((a,b) => (COUNTRIES[b]?.pop||0) - (COUNTRIES[a]?.pop||0)).slice(0, cap)
                : ev.targets.slice(0, cap);
            for (const id of sortedForLabels) {
                const c = COUNTRIES[id];
                if (!c) continue;
                const p = projection([c.lon, c.lat]);
                if (!p) continue;
                const [x, y] = p;
                const t = ev.age / ev.duration;
                const alpha = t < 0.1 ? t*10 : (t > 0.9 ? (1-t)*10 : 1);
                ctx.globalAlpha = alpha;
                // halo
                const color =
                    ev.mood === 'good' ? 'rgba(120, 255, 180, 0.9)' :
                    ev.mood === 'bad'  ? 'rgba(255, 90, 120, 0.9)' :
                    ev.mood === 'warn' ? 'rgba(255, 210, 100, 0.9)' :
                    'rgba(140, 200, 255, 0.9)';
                ctx.fillStyle = color;
                ctx.fillText(ev.emoji, x, y - 14);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillText(ev.label, x, y + 2);
            }
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    return {
        add: addEvent,
        tick,
        renderLabels,
        get active() { return active; },
        countActive() { return active.length; },
        clear() { active = []; },
        PASSIVE_FX,
    };
})();
