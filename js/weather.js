/* =========================================================
   weather.js — atmospheric layer. Clouds drift, storms form,
   rain / snow / sparkles fall, and the sun terminator moves
   across the map in real time.
   ========================================================= */

const Weather = (() => {
    const MAX_CLOUDS = 36;
    const MAX_PARTICLES = 700;
    const clouds = [];
    const particles = [];
    let particleEmitters = []; // {lat, lon, type, life, rate}
    let seed = Date.now();

    /* ---------- Clouds ---------- */

    function rng() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    function spawnCloud(lat, lon, size = 1) {
        if (clouds.length >= MAX_CLOUDS) clouds.shift();
        clouds.push({
            lat: lat ?? -60 + rng() * 140,
            lon: lon ?? -180 + rng() * 360,
            size: 20 + rng() * 40 * size,
            opacity: 0.12 + rng() * 0.14,
            drift: 0.02 + rng() * 0.04,
            puffs: 3 + Math.floor(rng() * 4),
            age: 0,
            life: 600 + rng() * 1200,
        });
    }

    function init() {
        for (let i = 0; i < MAX_CLOUDS * 0.7; i++) spawnCloud();
    }

    function tickClouds(dt) {
        for (let i = clouds.length - 1; i >= 0; i--) {
            const c = clouds[i];
            c.lon += c.drift * dt;
            if (c.lon > 180) c.lon -= 360;
            c.age += dt;
            if (c.age > c.life) clouds.splice(i, 1);
        }
        // maintain coverage
        while (clouds.length < MAX_CLOUDS * 0.7 + Math.sin(Date.now()/60000) * 4) {
            spawnCloud();
        }
    }

    function renderClouds(ctx, projection) {
        ctx.save();
        for (const c of clouds) {
            const p = projection([c.lon, c.lat]);
            if (!p) continue;
            const [x, y] = p;
            // fade in/out
            let a = c.opacity;
            if (c.age < 60) a *= c.age / 60;
            if (c.life - c.age < 120) a *= (c.life - c.age) / 120;
            ctx.globalAlpha = Math.max(0, a);
            // draw cluster of soft puffs
            for (let i = 0; i < c.puffs; i++) {
                const ox = (i - c.puffs/2) * c.size * 0.35;
                const oy = Math.sin(i * 1.7) * c.size * 0.15;
                const r = c.size * (0.6 + 0.3 * Math.cos(i));
                const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
                g.addColorStop(0, 'rgba(240, 246, 255, 0.7)');
                g.addColorStop(0.6, 'rgba(220, 230, 245, 0.4)');
                g.addColorStop(1, 'rgba(200, 210, 230, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /* ---------- Storm clusters over a region ---------- */

    function stormOver(lat, lon, severity = 0.6) {
        const n = 3 + Math.floor(severity * 6);
        for (let i = 0; i < n; i++) {
            const dx = (rng() - 0.5) * 12;
            const dy = (rng() - 0.5) * 8;
            const c = {
                lat: lat + dy,
                lon: lon + dx,
                size: 25 + rng() * 30,
                opacity: 0.3 + rng() * 0.2,
                drift: -0.02 + rng() * 0.04,
                puffs: 4 + Math.floor(rng() * 4),
                age: 0,
                life: 180 + rng() * 200,
                dark: true,
            };
            clouds.push(c);
        }
    }

    /* ---------- Particles (rain, snow, embers, blossoms, sparks) ---------- */

    const TYPE_STYLES = {
        rain:    { color:'rgba(160,200,255,0.8)', len:6,  size:1,   gravity:2,   wind:0.2, fade:true },
        snow:    { color:'rgba(235,245,255,0.95)',len:0,  size:1.5, gravity:0.4, wind:0.6, spin:true },
        ember:   { color:'rgba(255,180,80,0.9)',  len:2,  size:1.4, gravity:-0.3,wind:0.3, glow:true },
        smoke:   { color:'rgba(80,80,90,0.4)',    len:0,  size:6,   gravity:-0.4,wind:0.1, fade:true },
        blossom: { color:'rgba(255,180,220,0.9)', len:0,  size:2,   gravity:0.3, wind:0.8, spin:true },
        spark:   { color:'rgba(255,240,120,1)',   len:0,  size:1.6, gravity:-0.1,wind:0.2, glow:true, fade:true },
        ash:     { color:'rgba(70,70,80,0.7)',    len:0,  size:2,   gravity:0.5, wind:0.4, fade:true },
        aurora:  { color:'rgba(120,255,200,0.8)', len:0,  size:3,   gravity:-0.1,wind:0.1, glow:true, aurora:true },
        heart:   { color:'rgba(255,120,160,0.95)',len:0,  size:3,   gravity:-0.2,wind:0.1, glow:true },
    };

    function emit(lat, lon, type, rate = 10, life = 200) {
        particleEmitters.push({ lat, lon, type, rate, life, age: 0 });
    }

    function spawnParticle(lat, lon, type) {
        if (particles.length >= MAX_PARTICLES) particles.shift();
        particles.push({
            lat: lat + (rng() - 0.5) * 6,
            lon: lon + (rng() - 0.5) * 8,
            vx: (rng() - 0.5) * 0.6,
            vy: (rng() - 0.5) * 0.4,
            age: 0,
            life: 40 + rng() * 80,
            type,
            spin: rng() * Math.PI * 2,
        });
    }

    function tickEmitters(dt) {
        for (let i = particleEmitters.length - 1; i >= 0; i--) {
            const e = particleEmitters[i];
            e.age += dt;
            const n = Math.min(8, Math.floor(e.rate * dt / 16));
            for (let k = 0; k < n; k++) spawnParticle(e.lat, e.lon, e.type);
            if (e.age > e.life) particleEmitters.splice(i, 1);
        }
    }

    function tickParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const s = TYPE_STYLES[p.type] || TYPE_STYLES.rain;
            p.age += dt / 16;
            p.lat -= s.gravity * 0.08;
            p.lon += s.wind * 0.04 * (p.vx);
            if (s.spin) p.spin += 0.08;
            if (p.age > p.life) particles.splice(i, 1);
        }
    }

    function renderParticles(ctx, projection) {
        ctx.save();
        for (const p of particles) {
            const s = TYPE_STYLES[p.type] || TYPE_STYLES.rain;
            const pt = projection([p.lon, p.lat]);
            if (!pt) continue;
            const [x, y] = pt;
            let a = 1;
            if (s.fade) a = Math.max(0, 1 - p.age / p.life);
            ctx.globalAlpha = a;
            if (s.glow) ctx.shadowBlur = 8, ctx.shadowColor = s.color;
            else ctx.shadowBlur = 0;
            ctx.fillStyle = s.color;
            if (s.len > 0) {
                ctx.strokeStyle = s.color;
                ctx.lineWidth = s.size;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + s.wind * 2, y + s.len);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(x, y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    /* ---------- Sun position (day/night terminator) ---------- */

    /* given a Date, compute the subsolar point (lat, lon) in degrees */
    function subsolarPoint(date) {
        const d = new Date(date);
        const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
        const lon = -(utcHours - 12) * 15;

        // day of year
        const start = Date.UTC(d.getUTCFullYear(), 0, 0);
        const diff = d - start;
        const dayOfYear = Math.floor(diff / 86400000);
        // declination (simple): 23.44 * sin(360/365 * (dayOfYear - 81))
        const rad = Math.PI / 180;
        const decl = 23.44 * Math.sin((360 / 365) * (dayOfYear - 81) * rad);
        return { lat: decl, lon };
    }

    /* intensity (0..1) of sunlight at (lat,lon) given subsolar point */
    function sunIntensity(lat, lon, sun) {
        const rad = Math.PI / 180;
        const cosZ = Math.sin(sun.lat * rad) * Math.sin(lat * rad) +
                     Math.cos(sun.lat * rad) * Math.cos(lat * rad) * Math.cos((sun.lon - lon) * rad);
        // smooth terminator
        return Math.max(0, Math.min(1, 0.5 + cosZ * 2.5));
    }

    /* ---------- public API ---------- */

    return {
        init,
        clouds,
        particles,
        tick(dt) {
            tickClouds(dt);
            tickEmitters(dt);
            tickParticles(dt);
        },
        renderClouds,
        renderParticles,
        spawnCloud,
        stormOver,
        emit,
        subsolarPoint,
        sunIntensity,
        clearAll() { clouds.length = 0; particles.length = 0; particleEmitters.length = 0; },
    };
})();
