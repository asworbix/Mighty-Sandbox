/* =========================================================
   population.js — thousands of simulated people, distributed
   by country population. Each person has a culture, a daily
   rhythm, and a current activity that responds to events.
   ========================================================= */

const Population = (() => {
    const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const TARGET_COUNT = IS_MOBILE ? 1800 : 4200;   // total dots on the map
    const POP_SCALE_POWER = 0.55;

    let people = [];        // {lat, lon, cid, country, mood, activity, age, phase}
    let cityPoints = [];    // {lat, lon, cid, country, glow}
    let seed = 12345;

    function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

    /* --- Procedurally distribute people within countries using
          lat/lon clusters (avoid spawning in oceans by using
          country centroid + local jitter; larger countries get more dots). */

    function init() {
        people = [];
        cityPoints = [];

        const totalPop = Object.values(COUNTRIES).reduce((s,c) => s + Math.pow(c.pop, POP_SCALE_POWER), 0);

        for (const id of Object.keys(COUNTRIES)) {
            const c = COUNTRIES[id];
            const weight = Math.pow(c.pop, POP_SCALE_POWER) / totalPop;
            const count = Math.max(2, Math.round(TARGET_COUNT * weight));

            // scatter radius ~ sqrt(area proxy from pop) in degrees, capped
            const scatter = Math.min(14, 2 + Math.sqrt(c.pop) * 0.55);

            for (let i = 0; i < count; i++) {
                // gaussian-ish scatter
                const r = Math.sqrt(rng()) * scatter;
                const a = rng() * Math.PI * 2;
                const lat = c.lat + Math.sin(a) * r * 0.6;
                const lon = c.lon + Math.cos(a) * r * 0.9;
                people.push({
                    lat, lon,
                    cid: id,
                    country: c,
                    culture: CULTURES[c.culture],
                    phase: rng(),       // personal offset so rhythms vary
                    mood: 0.5 + rng()*0.3,
                    activity: 'resting',
                    age: Math.floor(rng() * 80),
                    speedJitter: (rng()-0.5)*0.6,
                    name: randomName(CULTURES[c.culture]),
                    blink: rng() * 6.28,
                });
            }

            // a few "city" glow points near centroid for night lights
            const cityCount = Math.min(5, Math.max(1, Math.round(Math.sqrt(c.pop) / 3)));
            for (let i = 0; i < cityCount; i++) {
                const r = Math.sqrt(rng()) * scatter * 0.5;
                const a = rng() * Math.PI * 2;
                cityPoints.push({
                    lat: c.lat + Math.sin(a) * r * 0.6,
                    lon: c.lon + Math.cos(a) * r * 0.9,
                    cid: id,
                    glow: 0.4 + rng()*0.6,
                    size: 1 + rng()*2.4,
                });
            }
        }
    }

    function randomName(culture) {
        if (!culture) return 'Someone';
        const f = culture.firstNames[Math.floor(rng() * culture.firstNames.length)];
        const l = culture.lastNames[Math.floor(rng() * culture.lastNames.length)];
        return f + ' ' + l;
    }

    /* --- Choose an activity based on local hour, culture, and world events. */

    function activityFor(person, localHour, eventMood) {
        const c = person.culture;
        if (!c) return 'resting';
        let slot;
        if (localHour >= 5 && localHour < 11) slot = 'morning';
        else if (localHour >= 11 && localHour < 16) slot = 'midday';
        else if (localHour >= 16 && localHour < 22) slot = 'evening';
        else slot = 'night';

        const list = c.activities[slot];
        let act = list[Math.floor((person.phase + localHour/24) * list.length) % list.length];

        if (eventMood === 'bad' && Math.random() < 0.4) {
            act = pick(['sheltering','huddling with family','whispering prayers','trying to stay calm','calling loved ones','searching for safety','mourning the losses','bracing against the wind']);
        } else if (eventMood === 'good' && Math.random() < 0.3) {
            act = pick(['celebrating in the streets','laughing with strangers','throwing petals in the air','dancing without reason','sharing food with neighbors','writing a love letter','singing old songs']);
        } else if (eventMood === 'warn' && Math.random() < 0.3) {
            act = pick(['watching the news','gathering in the square','debating loudly','keeping an eye on the horizon']);
        }
        return act;
    }

    function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

    /* --- Tick: advance each person's activity based on world time. */

    function tick(world, dt) {
        const worldDate = world.clock;
        for (const p of people) {
            // pseudo-local hour:
            const c = p.country;
            const utcHours = worldDate.getUTCHours() + worldDate.getUTCMinutes()/60;
            let localHour = (utcHours + c.tz) % 24;
            if (localHour < 0) localHour += 24;
            // derive country mood
            const cs = world.countryState[p.cid];
            const eventMood =
                cs.happy < 0.3 || cs.health < 0.3 ? 'bad' :
                cs.happy > 0.75 ? 'good' :
                cs.peace < 0.3 ? 'warn' : null;
            if (Math.random() < 0.01) {
                p.activity = activityFor(p, localHour, eventMood);
            }
            p.blink += dt * 0.004 + Math.abs(p.speedJitter)*0.01;
            p.mood = cs ? (cs.happy*0.6 + cs.health*0.4) : 0.5;
        }
    }

    /* --- Render the dots. Each pulses subtly and takes on country mood color. */

    const sunIntensityCache = {}; // cid → intensity, rebuilt each frame

    function render(ctx, projection, sun) {
        ctx.save();

        // precompute sun intensity per country — cheap way to avoid
        // one trig-heavy call per person per frame.
        for (const id in COUNTRIES) {
            const c = COUNTRIES[id];
            sunIntensityCache[id] = Weather.sunIntensity(c.lat, c.lon, sun);
        }

        // city lights on night side
        for (const city of cityPoints) {
            const s = sunIntensityCache[city.cid] ?? Weather.sunIntensity(city.lat, city.lon, sun);
            const night = 1 - s;
            if (night < 0.1) continue;
            const p = projection([city.lon, city.lat]);
            if (!p) continue;
            const [x, y] = p;
            const r = city.size * (1 + night * 0.4);
            ctx.globalAlpha = 0.55 * night * city.glow;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
            g.addColorStop(0, 'rgba(255, 220, 140, 1)');
            g.addColorStop(0.4, 'rgba(255, 160, 80, 0.45)');
            g.addColorStop(1, 'rgba(255, 120, 40, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.9 * night;
            ctx.fillStyle = 'rgba(255, 240, 200, 1)';
            ctx.beginPath();
            ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // people — grouped by culture color so we batch fillStyle changes.
        const byColor = {};
        for (const p of people) {
            const pt = projection([p.lon, p.lat]);
            if (!pt) continue;
            const s = sunIntensityCache[p.cid] ?? 0.5;
            const col = p.culture ? p.culture.color : '#7aa2ff';
            (byColor[col] = byColor[col] || []).push([pt[0], pt[1], s, p.blink]);
        }
        for (const col in byColor) {
            ctx.fillStyle = col;
            const list = byColor[col];
            // one alpha bucket is plenty — group by floor(alpha*10)
            const buckets = {};
            for (const [x, y, s, blink] of list) {
                const pulse = 0.7 + Math.sin(blink) * 0.3;
                const a = 0.45 + s * 0.45 + pulse * 0.15;
                const b = Math.min(9, Math.max(1, Math.floor(a * 10)));
                (buckets[b] = buckets[b] || []).push([x, y, pulse]);
            }
            for (const b in buckets) {
                ctx.globalAlpha = Number(b) / 10;
                ctx.beginPath();
                for (const [x, y, pulse] of buckets[b]) {
                    const r = 1.1 * pulse + 0.2;
                    ctx.moveTo(x + r, y);
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                }
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function mixColor(a, b, t) {
        const pa = parseHex(a), pb = parseHex(b);
        const r = Math.round(pa[0]*(1-t) + pb[0]*t);
        const g = Math.round(pa[1]*(1-t) + pb[1]*t);
        const bl = Math.round(pa[2]*(1-t) + pb[2]*t);
        return `rgb(${r},${g},${bl})`;
    }
    function parseHex(h) {
        if (h[0] === '#') h = h.slice(1);
        if (h.length === 3) h = h.split('').map(c => c+c).join('');
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }

    /* Pick a random person in a country for narration */
    function randomInCountry(id) {
        const pool = people.filter(p => p.cid === id);
        if (!pool.length) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /* Pick a random person anywhere */
    function randomPerson() {
        return people[Math.floor(Math.random() * people.length)] || null;
    }

    /* Apply a population scale (e.g., for historical eras) */
    function scaleTo(total) {
        const current = people.length;
        if (total > current) {
            // spawn more, weighted by current distribution
            const need = total - current;
            const totalPop = Object.values(COUNTRIES).reduce((s,c) => s + Math.pow(c.pop, POP_SCALE_POWER), 0);
            let added = 0;
            const ids = Object.keys(COUNTRIES);
            while (added < need) {
                for (const id of ids) {
                    const c = COUNTRIES[id];
                    const w = Math.pow(c.pop, POP_SCALE_POWER) / totalPop;
                    const n = Math.max(0, Math.round(w * need / ids.length));
                    for (let k = 0; k < n && added < need; k++) {
                        const scatter = Math.min(14, 2 + Math.sqrt(c.pop) * 0.55);
                        const r = Math.sqrt(rng()) * scatter;
                        const a = rng() * Math.PI * 2;
                        people.push({
                            lat: c.lat + Math.sin(a) * r * 0.6,
                            lon: c.lon + Math.cos(a) * r * 0.9,
                            cid: id, country: c, culture: CULTURES[c.culture],
                            phase: rng(), mood: 0.5, activity:'resting',
                            age: Math.floor(rng()*80),
                            speedJitter: (rng()-0.5)*0.6,
                            name: randomName(CULTURES[c.culture]),
                            blink: rng()*6.28,
                        });
                        added++;
                    }
                }
                if (added === 0) break;
            }
        } else if (total < current) {
            people.splice(total, current - total);
        }
    }

    return {
        init,
        tick,
        render,
        get people() { return people; },
        randomInCountry,
        randomPerson,
        scaleTo,
    };
})();
