/* =========================================================
   arcs.js — animated great-circle arcs connecting countries.
   Used for ambient trade, migration, war, alliances.
   ========================================================= */

const Arcs = (() => {
    const MAX = 80;
    let arcs = [];   // {a:[lon,lat], b:[lon,lat], color, age, life, speed, kind}
    let seed = 7;
    function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

    const STYLE = {
        trade:    { color:'rgba(120, 200, 255, 0.45)', life:260, speed:1.2, glow:'#6ad2ff' },
        migration:{ color:'rgba(255, 170, 100, 0.6)',  life:360, speed:0.6, glow:'#ffb070' },
        war:      { color:'rgba(255, 90, 110, 0.65)',  life:420, speed:1.4, glow:'#ff5a6e' },
        blessing: { color:'rgba(150, 255, 200, 0.55)', life:200, speed:1.8, glow:'#7dffb5' },
    };

    function add(fromId, toId, kind = 'trade') {
        if (!COUNTRIES[fromId] || !COUNTRIES[toId] || fromId === toId) return;
        if (arcs.length >= MAX) arcs.shift();
        const a = COUNTRIES[fromId];
        const b = COUNTRIES[toId];
        arcs.push({
            a:[a.lon, a.lat], b:[b.lon, b.lat],
            kind,
            age: 0,
            life: STYLE[kind].life + rng()*80,
            speed: STYLE[kind].speed + rng()*0.4,
            phase: rng(),
        });
    }

    function spawnAmbientTrade() {
        const ids = ALL_COUNTRY_IDS;
        // pick two well-populated countries
        let pool = ids.filter(id => COUNTRIES[id].pop > 20);
        if (pool.length < 2) pool = ids;
        const a = pool[Math.floor(Math.random() * pool.length)];
        let b = pool[Math.floor(Math.random() * pool.length)];
        let tries = 0;
        while (b === a && tries++ < 4) b = pool[Math.floor(Math.random() * pool.length)];
        add(a, b, 'trade');
    }

    function onEvent(ev) {
        if (!ev.targets || ev.targets.length < 1) return;
        if (ev.kind === 'war' || ev.kind === 'revolution') {
            // arcs between pairs of target countries, if any
            if (ev.targets.length >= 2) {
                for (let i = 0; i < Math.min(4, ev.targets.length); i++) {
                    const a = ev.targets[Math.floor(Math.random() * ev.targets.length)];
                    const b = ev.targets[Math.floor(Math.random() * ev.targets.length)];
                    add(a, b, 'war');
                }
            } else {
                // pick neighbors
                const origin = ev.targets[0];
                for (let i = 0; i < 3; i++) {
                    const n = nearestNeighbor(origin, i);
                    if (n) add(origin, n, 'war');
                }
            }
        }
        if (ev.kind === 'migration') {
            const origin = ev.targets[0];
            for (let i = 0; i < 3; i++) {
                const n = randomNeighbor(origin, 30);
                if (n) add(origin, n, 'migration');
            }
        }
        if (['prosperity','peace','healing','miracle','festival','innovation'].includes(ev.kind) && ev.targets.length > 1) {
            for (let i = 0; i < Math.min(6, ev.targets.length); i++) {
                const a = ev.targets[Math.floor(Math.random() * ev.targets.length)];
                const b = ev.targets[Math.floor(Math.random() * ev.targets.length)];
                add(a, b, 'blessing');
            }
        }
    }

    function nearestNeighbor(id, rank = 0) {
        const c = COUNTRIES[id]; if (!c) return null;
        const arr = ALL_COUNTRY_IDS.filter(x => x !== id).map(x => {
            const o = COUNTRIES[x];
            const d = Math.hypot(o.lat - c.lat, o.lon - c.lon);
            return { x, d };
        }).sort((a,b) => a.d - b.d);
        return arr[rank]?.x || null;
    }
    function randomNeighbor(id, radiusDeg = 40) {
        const c = COUNTRIES[id]; if (!c) return null;
        const pool = ALL_COUNTRY_IDS.filter(x => {
            if (x === id) return false;
            const o = COUNTRIES[x];
            return Math.hypot(o.lat - c.lat, o.lon - c.lon) < radiusDeg;
        });
        if (!pool.length) return nearestNeighbor(id, 0);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function tick(dt) {
        for (let i = arcs.length - 1; i >= 0; i--) {
            arcs[i].age += dt / 16 * arcs[i].speed;
            if (arcs[i].age > arcs[i].life) arcs.splice(i, 1);
        }
    }

    function render(ctx, projection) {
        ctx.save();
        for (const arc of arcs) {
            const t = arc.age / arc.life;
            const st = STYLE[arc.kind];
            drawArc(ctx, projection, arc.a, arc.b, t, st);
        }
        ctx.restore();
    }

    /* Draw great-circle arc (approx) as a bezier with bulge, plus a moving pulse. */
    function drawArc(ctx, projection, a, b, t, st) {
        const pa = projection(a), pb = projection(b);
        if (!pa || !pb) return;
        const mx = (pa[0] + pb[0]) / 2;
        const my = (pa[1] + pb[1]) / 2;
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1];
        const len = Math.hypot(dx, dy);
        const bulge = Math.min(120, len * 0.22);
        const nx = -dy / (len || 1), ny = dx / (len || 1);
        const cx = mx + nx * bulge, cy = my - Math.abs(ny) * bulge - bulge*0.25;
        // trail
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = Math.min(1, Math.sin(Math.min(1, t) * Math.PI) * 1.2);
        ctx.shadowBlur = 6;
        ctx.shadowColor = st.glow;
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.quadraticCurveTo(cx, cy, pb[0], pb[1]);
        ctx.stroke();
        // pulse along the arc
        const u = (t * 1.4) % 1;
        const bx = (1-u)*(1-u)*pa[0] + 2*(1-u)*u*cx + u*u*pb[0];
        const by = (1-u)*(1-u)*pa[1] + 2*(1-u)*u*cy + u*u*pb[1];
        ctx.fillStyle = st.glow;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function clear() { arcs = []; }

    return { add, onEvent, spawnAmbientTrade, tick, render, clear };
})();
