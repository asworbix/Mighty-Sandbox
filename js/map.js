/* =========================================================
   map.js — the Earth. D3 projection + TopoJSON borders,
   rendered into a <canvas> for performance. Supports hover,
   click, zoom, smooth pan, and tinted country state.
   ========================================================= */

const MapView = (() => {
    let canvas, ctx, fx, fxCtx;
    let width = 0, height = 0;
    let projection, path, geoGen;
    let countriesGeo = null;     // GeoJSON features
    let graticule = null;
    let land = null;
    let hoverId = null;
    let clickedId = null;

    let scale = 260;            // projection scale
    let translate = [0, 0];
    let rotate = [-10, 0, 0];
    let onClickHandler = null;
    let onHoverHandler = null;
    let mode = 'flat';         // 'flat' | 'globe'
    let autoRotate = false;    // only for globe
    let dataLayer = 'mood';    // 'mood' | 'happy' | 'peace' | 'econ' | 'health' | 'climate' | 'pop'

    async function init(world) {
        canvas = document.getElementById('earth');
        ctx = canvas.getContext('2d');
        fx = document.getElementById('fx');
        fxCtx = fx.getContext('2d');

        resize();

        projection = makeProjection();
        path = d3.geoPath(projection, ctx);

        // interactions
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', () => { hoverId = null; if (onHoverHandler) onHoverHandler(null); });
        canvas.addEventListener('click', onClick);
        window.addEventListener('resize', () => { resize(); updateProjection(); });
        canvas.addEventListener('wheel', onWheel, { passive: false });

        // drag to pan (flat) / rotate (globe) — mouse + touch + pinch
        let drag = null;
        let pinch = null;

        function startDrag(x, y) {
            drag = {
                x, y,
                tx: translate[0], ty: translate[1],
                r0: rotate[0], r1: rotate[1],
            };
            autoRotate = false;
        }
        function moveDrag(x, y) {
            if (!drag) return;
            const dx = x - drag.x;
            const dy = y - drag.y;
            if (mode === 'globe') {
                const k = 0.4;
                rotate[0] = drag.r0 + dx * k;
                rotate[1] = Math.max(-89, Math.min(89, drag.r1 - dy * k));
            } else {
                translate[0] = drag.tx + dx;
                translate[1] = drag.ty + dy;
            }
            updateProjection();
        }

        // mouse
        canvas.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
        window.addEventListener('mouseup',   () => drag = null);
        window.addEventListener('mousemove', e => { if (drag) moveDrag(e.clientX, e.clientY); });

        // touch: single finger drag, two finger pinch
        canvas.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                const t = e.touches[0];
                startDrag(t.clientX, t.clientY);
                pinch = null;
            } else if (e.touches.length >= 2) {
                drag = null;
                const a = e.touches[0], b = e.touches[1];
                pinch = {
                    d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                    s: scale,
                    cx: (a.clientX + b.clientX) / 2,
                    cy: (a.clientY + b.clientY) / 2,
                    tx: translate[0], ty: translate[1],
                };
                autoRotate = false;
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', e => {
            if (e.touches.length === 1 && drag) {
                e.preventDefault();
                const t = e.touches[0];
                moveDrag(t.clientX, t.clientY);
            } else if (e.touches.length >= 2 && pinch) {
                e.preventDefault();
                const a = e.touches[0], b = e.touches[1];
                const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                const k = Math.max(0.2, Math.min(6, d / pinch.d));
                scale = Math.max(160, Math.min(3200, pinch.s * k));
                // keep the pinch midpoint roughly pinned
                const mx = (a.clientX + b.clientX) / 2;
                const my = (a.clientY + b.clientY) / 2;
                translate[0] = pinch.tx + (mx - pinch.cx);
                translate[1] = pinch.ty + (my - pinch.cy);
                updateProjection();
            }
        }, { passive: false });

        canvas.addEventListener('touchend', e => {
            if (e.touches.length === 0) {
                drag = null;
                pinch = null;
            } else if (e.touches.length === 1) {
                // transitioning from pinch → single-finger drag
                const t = e.touches[0];
                startDrag(t.clientX, t.clientY);
                pinch = null;
            }
        }, { passive: true });
        canvas.addEventListener('touchcancel', () => { drag = null; pinch = null; });

        // load world atlas (with CDN fallback)
        const CDNS = [
            'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
            'https://unpkg.com/world-atlas@2/countries-110m.json',
        ];
        let atlas = null;
        for (const url of CDNS) {
            try { atlas = await d3.json(url); if (atlas) break; }
            catch (e) { console.warn('atlas fetch failed:', url, e); }
        }
        if (!atlas) {
            const b = document.getElementById('bootStatus');
            if (b) b.textContent = 'could not load world atlas. check your connection.';
            throw new Error('atlas unavailable');
        }
        land = topojson.feature(atlas, atlas.objects.land);
        countriesGeo = topojson.feature(atlas, atlas.objects.countries).features;
        graticule = d3.geoGraticule10();
        world.countriesGeo = countriesGeo;
        // attach numeric id as string with leading zeros
        countriesGeo.forEach(f => { f.idStr = String(f.id).padStart(3, '0'); });
        updateProjection();
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        [canvas, fx].forEach(c => {
            c.width = width * dpr;
            c.height = height * dpr;
            c.style.width = width + 'px';
            c.style.height = height + 'px';
            c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        });
    }

    function makeProjection() {
        if (mode === 'globe') {
            return d3.geoOrthographic()
                .scale(Math.min(width, height) * 0.42)
                .translate([width/2 + translate[0], height/2 + translate[1]])
                .rotate(rotate)
                .clipAngle(90);
        }
        return d3.geoNaturalEarth1()
            .scale(scale)
            .translate([width/2 + translate[0], height/2 + translate[1]])
            .rotate(rotate);
    }

    function updateProjection() {
        if (mode === 'globe') {
            projection
                .scale(Math.min(width, height) * 0.42 * (scale / 260))
                .translate([width/2 + translate[0], height/2 + translate[1]])
                .rotate(rotate);
        } else {
            projection
                .scale(scale)
                .translate([width/2 + translate[0], height/2 + translate[1]])
                .rotate(rotate);
        }
        path = d3.geoPath(projection, ctx);
    }

    function toggleMode() {
        mode = mode === 'flat' ? 'globe' : 'flat';
        // reset camera so the switch always looks clean
        scale = 260;
        translate = [0, 0];
        if (mode === 'globe') rotate = [-10, -15, 0];
        projection = makeProjection();
        updateProjection();
        autoRotate = mode === 'globe';
        return mode;
    }

    function onWheel(e) {
        e.preventDefault();
        const prev = scale;
        scale *= e.deltaY < 0 ? 1.12 : 0.9;
        scale = Math.max(160, Math.min(2400, scale));
        updateProjection();
    }

    function onMouseMove(e) {
        const x = e.clientX, y = e.clientY;
        const geo = projection.invert([x, y]);
        if (!geo) { hoverId = null; if (onHoverHandler) onHoverHandler(null); return; }
        // find country containing [lon,lat]
        let found = null;
        for (const f of countriesGeo) {
            if (d3.geoContains(f, geo)) { found = f; break; }
        }
        hoverId = found ? found.idStr : null;
        if (onHoverHandler) onHoverHandler(hoverId, { x, y });
    }

    function onClick(e) {
        if (hoverId && onClickHandler) onClickHandler(hoverId);
        clickedId = hoverId;
    }

    function zoomTo(lat, lon, targetScale) {
        // animate rotate + scale
        const t0 = performance.now();
        const r0 = [...rotate];
        const s0 = scale;
        const r1 = [-lon, -lat, 0];
        const s1 = targetScale || Math.max(500, scale);
        const dur = 900;
        function step(now) {
            const u = Math.min(1, (now - t0)/dur);
            const e = u < 0.5 ? 2*u*u : -1 + (4 - 2*u)*u; // easeInOut
            rotate[0] = r0[0] + (r1[0] - r0[0]) * e;
            rotate[1] = r0[1] + (r1[1] - r0[1]) * e;
            scale = s0 + (s1 - s0) * e;
            updateProjection();
            if (u < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function resetView() {
        const t0 = performance.now();
        const r0 = [...rotate], s0 = scale;
        const dur = 700;
        function step(now) {
            const u = Math.min(1, (now - t0)/dur);
            const e = u < 0.5 ? 2*u*u : -1 + (4 - 2*u)*u;
            rotate[0] = r0[0] * (1-e) + -10 * e;
            rotate[1] = r0[1] * (1-e);
            scale = s0 * (1-e) + 260 * e;
            translate[0] *= (1-e);
            translate[1] *= (1-e);
            updateProjection();
            if (u < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ---------- render ---------- */

    function render(world) {
        const sun = Weather.subsolarPoint(world.clock);

        if (autoRotate) {
            rotate[0] = (rotate[0] - 0.08) % 360;
            updateProjection();
        }

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        // deep space + atmospheric halo
        const cx = width/2 + translate[0], cy = height/2 + translate[1];
        const haloR = scale * 1.25;
        const atm = ctx.createRadialGradient(cx, cy, haloR*0.7, cx, cy, haloR*1.3);
        atm.addColorStop(0, 'rgba(30, 80, 160, 0.0)');
        atm.addColorStop(0.6, 'rgba(30, 80, 160, 0.08)');
        atm.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = atm;
        ctx.fillRect(0, 0, width, height);

        // ocean sphere outline
        ctx.beginPath();
        path({ type: 'Sphere' });
        const oceanGrad = ctx.createRadialGradient(cx - scale*0.3, cy - scale*0.2, scale*0.1, cx, cy, scale*1.15);
        oceanGrad.addColorStop(0, '#0a1626');
        oceanGrad.addColorStop(0.7, '#05090f');
        oceanGrad.addColorStop(1, '#02040a');
        ctx.fillStyle = oceanGrad;
        ctx.fill();

        // graticule
        ctx.beginPath();
        path(graticule);
        ctx.strokeStyle = 'rgba(80, 130, 180, 0.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // land mass (solid underlay)
        ctx.beginPath();
        path(land);
        ctx.fillStyle = '#141a25';
        ctx.fill();

        // countries
        for (const f of countriesGeo) {
            const id = f.idStr;
            const cs = world.countryState[id];
            const country = COUNTRIES[id];
            let fill = '#1b2130';
            if (cs) fill = tintForLayer(cs);

            ctx.beginPath();
            path(f);
            // day/night tint: sample country centroid
            if (country) {
                const sInt = Weather.sunIntensity(country.lat, country.lon, sun);
                fill = tintByDaylight(fill, sInt);
            }
            if (id === hoverId) fill = brighten(fill, 0.4);
            if (id === clickedId) fill = brighten(fill, 0.65);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // clouds (under effects)
        Weather.renderClouds(ctx, projection);

        // arcs (trade / war / migration)
        Arcs.render(ctx, projection);

        // city lights + people
        Population.render(ctx, projection, sun);

        // event labels and particles
        ctx.restore();

        // fx layer
        fxCtx.clearRect(0, 0, width, height);
        Weather.renderParticles(fxCtx, projection);
        Events.renderLabels(fxCtx, projection);

        // night-side vignette overlay
        renderDayNightShade(sun);
    }

    /* darken pixels that are on the night side via a radial overlay */
    function renderDayNightShade(sun) {
        const cx = width/2 + translate[0];
        const cy = height/2 + translate[1];
        const sp = projection([sun.lon, sun.lat]);
        if (!sp) return;
        const [sx, sy] = sp;
        const r = scale * 1.2;
        const grad = fxCtx.createRadialGradient(sx, sy, r*0.15, sx, sy, r*1.3);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.35, 'rgba(0,0,0,0)');
        grad.addColorStop(0.65, 'rgba(0,0,0,0.35)');
        grad.addColorStop(1, 'rgba(0,0,0,0.55)');
        fxCtx.globalCompositeOperation = 'source-over';
        fxCtx.fillStyle = grad;
        fxCtx.fillRect(0, 0, width, height);

        // soft sun glow on the day side center
        const sunGlow = fxCtx.createRadialGradient(sx, sy, 0, sx, sy, r*0.4);
        sunGlow.addColorStop(0, 'rgba(255, 220, 140, 0.18)');
        sunGlow.addColorStop(1, 'rgba(255, 220, 140, 0)');
        fxCtx.fillStyle = sunGlow;
        fxCtx.fillRect(0, 0, width, height);
    }

    /* ---------- data layers → fill color ---------- */

    function tintForLayer(cs) {
        if (dataLayer === 'mood') {
            const green = Math.max(0, cs.happy - 0.5) * 2;
            const red   = Math.max(0, 0.5 - cs.happy) * 2;
            const gold  = Math.max(0, cs.econ - 0.5) * 2;
            let f = mix('#1b2130', [
                ['#2c4a36', green*0.6],
                ['#3a1824', red*0.6],
                ['#3a2d14', gold*0.3],
            ]);
            if (cs.peace < 0.3) f = mix(f, [['#441616', (0.3-cs.peace)*2]]);
            if (cs.health < 0.3) f = mix(f, [['#331f40', (0.3-cs.health)*2]]);
            return f;
        }
        if (dataLayer === 'happy')   return heat(cs.happy,   '#3a1824', '#2c4a36');
        if (dataLayer === 'peace')   return heat(cs.peace,   '#442a14', '#1f3a4a');
        if (dataLayer === 'econ')    return heat(cs.econ,    '#2a1a2a', '#4a3a14');
        if (dataLayer === 'health')  return heat(cs.health,  '#331f40', '#1f4a3a');
        if (dataLayer === 'climate') return heat(cs.climate, '#4a2a14', '#1b3a4a');
        if (dataLayer === 'pop')     {
            // relative popularity (log scale)
            const t = Math.min(1, Math.log10(Math.max(0.01, cs.pop)) / 3.2);
            return heat(t, '#151a24', '#3a5a1a');
        }
        return '#1b2130';
    }

    function heat(v, lo, hi) {
        const t = Math.max(0, Math.min(1, v));
        return lerpColor(lo, hi, t);
    }

    /* ---------- color helpers ---------- */

    function parseHex(h) {
        if (h[0] === '#') h = h.slice(1);
        if (h.length === 3) h = h.split('').map(c => c+c).join('');
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }
    function lerpColor(a, b, t) {
        const pa = parseHex(a), pb = parseHex(b);
        const r = pa[0]*(1-t) + pb[0]*t;
        const g = pa[1]*(1-t) + pb[1]*t;
        const bl = pa[2]*(1-t) + pb[2]*t;
        return `rgb(${r|0},${g|0},${bl|0})`;
    }
    function mix(base, layers) {
        let b = typeof base === 'string' ? parseHex(base) : base;
        for (const [col, t] of layers) {
            if (t <= 0) continue;
            const p = parseHex(col);
            b = [b[0]*(1-t)+p[0]*t, b[1]*(1-t)+p[1]*t, b[2]*(1-t)+p[2]*t];
        }
        return `rgb(${b[0]|0},${b[1]|0},${b[2]|0})`;
    }
    function brighten(col, t) {
        const p = col.startsWith('rgb') ? col.match(/\d+/g).map(Number) : parseHex(col);
        return `rgb(${Math.min(255, p[0]+255*t)|0},${Math.min(255, p[1]+255*t)|0},${Math.min(255, p[2]+255*t)|0})`;
    }
    function tintByDaylight(col, sInt) {
        // night side: darken 55% max; day side: slight warm tint
        const p = col.startsWith('rgb') ? col.match(/\d+/g).map(Number) : parseHex(col);
        if (sInt > 0.5) {
            const t = (sInt - 0.5) * 0.3;
            return `rgb(${Math.min(255, p[0]+30*t)|0},${Math.min(255, p[1]+22*t)|0},${Math.min(255, p[2]+12*t)|0})`;
        } else {
            const t = (0.5 - sInt);
            return `rgb(${p[0]*(1-t*0.7)|0},${p[1]*(1-t*0.7)|0},${p[2]*(1-t*0.5)|0})`;
        }
    }

    function countryAt(x, y) {
        const geo = projection.invert([x, y]);
        if (!geo) return null;
        for (const f of countriesGeo) {
            if (d3.geoContains(f, geo)) return f.idStr;
        }
        return null;
    }

    function setClicked(id) { clickedId = id; }
    function onClick2(fn) { onClickHandler = fn; }
    function onHover(fn) { onHoverHandler = fn; }
    function project(ll) { return projection(ll); }

    const LAYER_ORDER = ['mood','happy','peace','econ','health','climate','pop'];
    function cycleLayer() {
        const i = LAYER_ORDER.indexOf(dataLayer);
        dataLayer = LAYER_ORDER[(i + 1) % LAYER_ORDER.length];
        return dataLayer;
    }

    return {
        init, render,
        zoomTo, resetView,
        toggleMode,
        cycleLayer,
        setAutoRotate(v) { autoRotate = !!v; },
        onClick: onClick2, onHover,
        setClicked,
        countryAt,
        project,
        get mode() { return mode; },
        get dataLayer() { return dataLayer; },
        get hoverId() { return hoverId; },
        get clickedId() { return clickedId; },
    };
})();
