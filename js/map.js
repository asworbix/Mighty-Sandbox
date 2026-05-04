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
    let spotlightSet = null;       // Set of country IDs highlighted by event detail

    let scale = 260;            // projection scale
    let translate = [0, 0];
    let rotate = [-10, 0, 0];
    let onClickHandler = null;
    let onHoverHandler = null;
    let mode = 'flat';         // 'flat' | 'globe'
    let autoRotate = false;    // only for globe — off by default for perf
    let dataLayer = 'mood';    // 'mood' | 'happy' | 'peace' | 'econ' | 'health' | 'climate' | 'pop'

    /* Cached Path2D objects rebuilt only when the projection changes — this
       is the single biggest perf win. d3.geoPath is expensive (re-projects
       every coordinate); calling Path2D.fill / .stroke is essentially free. */
    const cachedPaths = {
        sphere: null,
        graticule: null,
        land: null,
        countries: [],     // [{ feature, p2d }]
        dirty: true,
    };
    /* Country fill cache — recomputed only when the world state ticks
       (~3 Hz via UI), not every frame. */
    const countryFillCache = {};
    /* Sun intensity per country, recomputed once at the start of every
       render — saves 130 trig calls per loop iteration. */
    const sunCountryCache = {};
    /* Throttle hover hit-testing to once per animation frame. */
    let pendingHoverEvent = null;
    let hoverScheduled = false;
    /* renderDirty: flipped true whenever the camera, a country fill, or
       hover state changes — lets main.js skip render frames while the
       scene is static. */
    let renderDirty = true;

    async function init(world) {
        canvas = document.getElementById('earth');
        ctx = canvas.getContext('2d');
        fx = document.getElementById('fx');
        fxCtx = fx.getContext('2d');

        resize();

        projection = makeProjection();
        path = d3.geoPath(projection, ctx);

        // interactions (mousemove handled by throttled processHover below)
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

        // touch: single finger drag, two finger pinch-to-zoom-toward-fingers
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
                    cx: (a.clientX + b.clientX) / 2,  // starting midpoint
                    cy: (a.clientY + b.clientY) / 2,
                    tx: translate[0], ty: translate[1],
                    r0: rotate[0], r1: rotate[1],
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
                const newScale = Math.max(160, Math.min(3200, pinch.s * k));
                const actualK = newScale / pinch.s;
                const mx = (a.clientX + b.clientX) / 2;
                const my = (a.clientY + b.clientY) / 2;

                if (mode !== 'globe') {
                    // Flat map: pinch-to-point. Keep the geo coord that was
                    // under the initial midpoint under the current midpoint.
                    const T0x = pinch.tx + width / 2;
                    const T0y = pinch.ty + height / 2;
                    const T1x = mx - actualK * (pinch.cx - T0x);
                    const T1y = my - actualK * (pinch.cy - T0y);
                    translate[0] = T1x - width / 2;
                    translate[1] = T1y - height / 2;
                } else {
                    // Globe: scale, and rotate the globe by the midpoint shift
                    // so whatever was under the fingers roughly stays there.
                    const deg = 0.4;
                    rotate[0] = pinch.r0 + (mx - pinch.cx) * deg;
                    rotate[1] = Math.max(-89, Math.min(89, pinch.r1 - (my - pinch.cy) * deg));
                }
                scale = newScale;
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

        // hover throttled via rAF
        canvas.addEventListener('mousemove', e => {
            pendingHoverEvent = { x: e.clientX, y: e.clientY };
            if (!hoverScheduled) {
                hoverScheduled = true;
                requestAnimationFrame(processHover);
            }
        }, { passive: true });

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

    let activeDpr = 1;
    function resize() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
        activeDpr = dpr;
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
        cachedPaths.dirty = true;
        renderDirty = true;
    }

    /* Build Path2D objects for sphere, graticule, land, and every country.
       Called on demand the next time render() runs after the projection
       changes. d3.geoPath() with no context returns SVG path-data strings
       which Path2D's constructor accepts directly. */
    function rebuildPaths() {
        if (!countriesGeo) return;
        const stringPath = d3.geoPath(projection);
        const sphereD = stringPath({ type: 'Sphere' });
        const gratD   = stringPath(graticule);
        const landD   = stringPath(land);
        cachedPaths.sphere    = sphereD ? new Path2D(sphereD) : null;
        cachedPaths.graticule = gratD   ? new Path2D(gratD)   : null;
        cachedPaths.land      = landD   ? new Path2D(landD)   : null;
        const list = [];
        for (const f of countriesGeo) {
            const d = stringPath(f);
            if (d) list.push({ feature: f, p2d: new Path2D(d) });
        }
        cachedPaths.countries = list;
        cachedPaths.dirty = false;
    }

    function toggleMode() {
        mode = mode === 'flat' ? 'globe' : 'flat';
        // reset camera so the switch always looks clean
        scale = 260;
        translate = [0, 0];
        if (mode === 'globe') rotate = [-10, -15, 0];
        projection = makeProjection();
        updateProjection();
        // auto-rotate stays off by default — user can click again to spin
        autoRotate = false;
        return mode;
    }

    /* Unified wheel handler: distinguishes trackpad pan, trackpad pinch,
       and mouse-wheel zoom. Uses exp-based factors for smooth continuous
       zoom rather than stepped 10% jumps.

         - ctrlKey present  → trackpad pinch (or Ctrl+wheel) → smooth zoom
         - deltaMode pixel + small magnitude → trackpad two-finger pan
         - anything else    → mouse wheel → smooth zoom */
    function onWheel(e) {
        e.preventDefault();
        const isPinch     = e.ctrlKey;
        const smallDelta  = e.deltaMode === 0 && Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50;
        const trackpadPan = !isPinch && smallDelta;
        if (trackpadPan) {
            panBy(e.deltaX, e.deltaY);
        } else {
            // pinch = very fine; wheel = coarser. Both use exp for smoothness.
            const k = isPinch ? 0.015 : 0.0035;
            zoomBy(Math.exp(-e.deltaY * k), e.clientX, e.clientY);
        }
    }

    function zoomBy(factor, cx, cy) {
        const prev = scale;
        const maxS = mode === 'globe' ? 1800 : 3200;
        const minS = 140;
        const newScale = Math.max(minS, Math.min(maxS, prev * factor));
        const actualK = newScale / prev;
        if (actualK === 1) return;
        if (mode !== 'globe') {
            // flat: keep the point under cursor pinned
            const T0x = translate[0] + width / 2;
            const T0y = translate[1] + height / 2;
            const T1x = cx - actualK * (cx - T0x);
            const T1y = cy - actualK * (cy - T0y);
            translate[0] = T1x - width / 2;
            translate[1] = T1y - height / 2;
        }
        scale = newScale;
        updateProjection();
    }

    function panBy(dx, dy) {
        // Trackpad two-finger pan — follow finger direction (opposite of drag).
        if (mode === 'globe') {
            rotate[0] -= dx * 0.28;
            rotate[1] = Math.max(-89, Math.min(89, rotate[1] + dy * 0.28));
            autoRotate = false;
        } else {
            translate[0] -= dx;
            translate[1] -= dy;
        }
        updateProjection();
    }

    /* Hit-test using cached Path2D objects + ctx.isPointInPath, which is
       orders of magnitude faster than projection.invert + d3.geoContains
       loops. Throttled to one test per animation frame. */
    function processHover() {
        hoverScheduled = false;
        const e = pendingHoverEvent;
        pendingHoverEvent = null;
        if (!e) return;
        if (cachedPaths.dirty) rebuildPaths();
        // isPointInPath tests against the TRANSFORMED path coords. Since we
        // set ctx.setTransform(dpr, 0, 0, dpr, 0, 0) on resize, we must scale
        // the mouse (CSS) coordinates by dpr to match the path's transformed
        // position. Without this the hit test was offset by ~2x on HiDPI
        // screens — mouse over Africa returned USA, etc.
        const hx = e.x * activeDpr;
        const hy = e.y * activeDpr;
        let found = null;
        for (const cp of cachedPaths.countries) {
            if (ctx.isPointInPath(cp.p2d, hx, hy)) { found = cp.feature; break; }
        }
        const newId = found ? found.idStr : null;
        if (newId !== hoverId) {
            hoverId = newId;
            renderDirty = true; // hover highlights a country → repaint needed
            if (onHoverHandler) onHoverHandler(hoverId, e);
        } else if (onHoverHandler && hoverId) {
            onHoverHandler(hoverId, e); // still fire so tooltip follows cursor
        }
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

    /* Subsolar-point math (formerly in weather.js) so the night-side
       terminator still tracks the real sun. */
    function subsolarPoint(date) {
        const d = new Date(date);
        const utcHours = d.getUTCHours() + d.getUTCMinutes()/60 + d.getUTCSeconds()/3600;
        const lon = -(utcHours - 12) * 15;
        const start = Date.UTC(d.getUTCFullYear(), 0, 0);
        const dayOfYear = Math.floor((d - start) / 86400000);
        const rad = Math.PI / 180;
        const decl = 23.44 * Math.sin((360 / 365) * (dayOfYear - 81) * rad);
        return { lat: decl, lon };
    }
    function sunIntensity(lat, lon, sun) {
        const rad = Math.PI / 180;
        const cosZ = Math.sin(sun.lat * rad) * Math.sin(lat * rad) +
                     Math.cos(sun.lat * rad) * Math.cos(lat * rad) * Math.cos((sun.lon - lon) * rad);
        return Math.max(0, Math.min(1, 0.5 + cosZ * 2.5));
    }

    function render(world) {
        const sun = subsolarPoint(world.clock);

        if (autoRotate) {
            rotate[0] = (rotate[0] - 0.05) % 360;
            updateProjection();
        }

        if (cachedPaths.dirty) rebuildPaths();

        // refresh sun cache once per frame
        for (const id in COUNTRIES) {
            const c = COUNTRIES[id];
            sunCountryCache[id] = sunIntensity(c.lat, c.lon, sun);
        }

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        const cx = width/2 + translate[0], cy = height/2 + translate[1];
        const haloR = scale * 1.25;
        const atm = ctx.createRadialGradient(cx, cy, haloR*0.7, cx, cy, haloR*1.3);
        atm.addColorStop(0, 'rgba(30, 80, 160, 0.0)');
        atm.addColorStop(0.6, 'rgba(30, 80, 160, 0.08)');
        atm.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = atm;
        ctx.fillRect(0, 0, width, height);

        // ocean sphere
        if (cachedPaths.sphere) {
            const oceanGrad = ctx.createRadialGradient(cx - scale*0.3, cy - scale*0.2, scale*0.1, cx, cy, scale*1.15);
            oceanGrad.addColorStop(0, '#0a1626');
            oceanGrad.addColorStop(0.7, '#05090f');
            oceanGrad.addColorStop(1, '#02040a');
            ctx.fillStyle = oceanGrad;
            ctx.fill(cachedPaths.sphere);
        }

        // graticule
        if (cachedPaths.graticule) {
            ctx.strokeStyle = 'rgba(80, 130, 180, 0.06)';
            ctx.lineWidth = 0.5;
            ctx.stroke(cachedPaths.graticule);
        }

        // land
        if (cachedPaths.land) {
            ctx.fillStyle = '#141a25';
            ctx.fill(cachedPaths.land);
        }

        // countries — Path2D cached, fill cached as RGB triples
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        for (const cp of cachedPaths.countries) {
            const id = cp.feature.idStr;
            const cs = world.countryState[id];
            let baseRgb = countryFillCache[id];
            if (!baseRgb) {
                baseRgb = cs ? tintForLayer(cs) : HEX_BASE.slice();
                countryFillCache[id] = baseRgb;
            }
            const sInt = sunCountryCache[id];
            let rgb = sInt !== undefined ? applyDaylight(baseRgb, sInt) : baseRgb;
            if (id === hoverId)   rgb = brightenRgb(rgb, 0.4);
            if (id === clickedId) rgb = brightenRgb(rgb, 0.65);
            if (spotlightSet && spotlightSet.has(id)) rgb = mixRgb(rgb, [255, 211, 107], 0.55);
            ctx.fillStyle = rgbStr(rgb[0], rgb[1], rgb[2]);
            ctx.fill(cp.p2d);
            ctx.stroke(cp.p2d);
        }

        ctx.restore();

        // fx layer (cleared so any leftovers from the old sandbox vanish)
        fxCtx.clearRect(0, 0, width, height);

        // night-side vignette overlay
        renderDayNightShade(sun);
    }

    /* Public — call when any country state changes (UI does this every ~330ms). */
    function invalidateFills() {
        for (const k in countryFillCache) delete countryFillCache[k];
        renderDirty = true;
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

    /* ---------- data layers → fill color ----------
       All color helpers below operate on [r,g,b] triples. The render loop
       allocates exactly one rgb() string per country per frame, instead of
       parsing several strings via regex on every paint. */

    const HEX_BASE     = parseHex('#1b2130');
    const HEX_GREEN    = parseHex('#2c4a36');
    const HEX_RED      = parseHex('#3a1824');
    const HEX_GOLD     = parseHex('#3a2d14');
    const HEX_DARK_R   = parseHex('#441616');
    const HEX_DARK_PUR = parseHex('#331f40');

    function tintForLayer(cs) {
        if (dataLayer === 'mood') {
            const green = Math.max(0, cs.happy - 0.5) * 2;
            const red   = Math.max(0, 0.5 - cs.happy) * 2;
            const gold  = Math.max(0, cs.econ  - 0.5) * 2;
            let rgb = HEX_BASE.slice();
            rgb = mixRgb(rgb, HEX_GREEN, green*0.6);
            rgb = mixRgb(rgb, HEX_RED,   red*0.6);
            rgb = mixRgb(rgb, HEX_GOLD,  gold*0.3);
            if (cs.peace  < 0.3) rgb = mixRgb(rgb, HEX_DARK_R,   (0.3-cs.peace)*2);
            if (cs.health < 0.3) rgb = mixRgb(rgb, HEX_DARK_PUR, (0.3-cs.health)*2);
            return rgb;
        }
        if (dataLayer === 'happy')   return heatRgb(cs.happy,   HEX_RED,    HEX_GREEN);
        if (dataLayer === 'peace')   return heatRgb(cs.peace,   parseHex('#442a14'), parseHex('#1f3a4a'));
        if (dataLayer === 'econ')    return heatRgb(cs.econ,    parseHex('#2a1a2a'), parseHex('#4a3a14'));
        if (dataLayer === 'health')  return heatRgb(cs.health,  parseHex('#331f40'), parseHex('#1f4a3a'));
        if (dataLayer === 'climate') return heatRgb(cs.climate, parseHex('#4a2a14'), parseHex('#1b3a4a'));
        if (dataLayer === 'pop')     {
            const t = Math.min(1, Math.log10(Math.max(0.01, cs.pop)) / 3.2);
            return heatRgb(t, parseHex('#151a24'), parseHex('#3a5a1a'));
        }
        return HEX_BASE.slice();
    }

    function mixRgb(base, layer, t) {
        if (t <= 0) return base;
        const u = 1 - t;
        return [base[0]*u + layer[0]*t, base[1]*u + layer[1]*t, base[2]*u + layer[2]*t];
    }
    function heatRgb(v, lo, hi) {
        const t = Math.max(0, Math.min(1, v));
        const u = 1 - t;
        return [lo[0]*u + hi[0]*t, lo[1]*u + hi[1]*t, lo[2]*u + hi[2]*t];
    }
    function applyDaylight(rgb, sInt) {
        if (sInt > 0.5) {
            const t = (sInt - 0.5) * 0.3;
            return [Math.min(255, rgb[0]+30*t), Math.min(255, rgb[1]+22*t), Math.min(255, rgb[2]+12*t)];
        } else {
            const t = (0.5 - sInt);
            return [rgb[0]*(1-t*0.7), rgb[1]*(1-t*0.7), rgb[2]*(1-t*0.5)];
        }
    }
    function brightenRgb(rgb, t) {
        return [Math.min(255, rgb[0]+255*t), Math.min(255, rgb[1]+255*t), Math.min(255, rgb[2]+255*t)];
    }
    function rgbStr(r, g, b) { return 'rgb(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ')'; }

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

    function setClicked(id) { clickedId = id; renderDirty = true; }
    function spotlight(ids) {
        spotlightSet = (ids && ids.length) ? new Set(ids) : null;
        renderDirty = true;
    }
    function onClick2(fn) { onClickHandler = fn; }
    function onHover(fn) { onHoverHandler = fn; }
    function project(ll) { return projection(ll); }

    const LAYER_ORDER = ['mood','happy','peace','econ','health','climate','pop'];
    function cycleLayer() {
        const i = LAYER_ORDER.indexOf(dataLayer);
        dataLayer = LAYER_ORDER[(i + 1) % LAYER_ORDER.length];
        return dataLayer;
    }

    /* Atomic read+clear of the dirty flag. main.js's loop calls this each
       frame to decide whether to actually paint. */
    function consumeRenderDirty() {
        const d = renderDirty || autoRotate;
        renderDirty = false;
        return d;
    }

    return {
        init, render,
        zoomTo, resetView,
        toggleMode,
        cycleLayer,
        invalidateFills,
        consumeRenderDirty,
        spotlight,
        setAutoRotate(v) { autoRotate = !!v; renderDirty = true; },
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
