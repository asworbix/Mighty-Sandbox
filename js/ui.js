/* =========================================================
   ui.js — HUD controller. Stats panel, event log, tooltip,
   country detail, prompt chips, help / achievements modals,
   timeline scrubber, era banner, speed controls.
   ========================================================= */

const UI = (() => {
    const el = {};
    let world = null;

    /* timeline constants defined inline in the Timeline section below */

    function $(id) { return document.getElementById(id); }

    function init(worldRef) {
        world = worldRef;

        // cache elements
        [
            'clock','clockDate','clockTime',
            'statsPanel','statsPill','pillPop','pillHappy',
            'statPop','statPopBar','statHappy','statHappyBar',
            'statEcon','statEconBar','statPeace','statPeaceBar',
            'statHealth','statHealthBar','statClimate','statClimateBar',
            'activeEventsCount','logList','clearLog',
            'tooltip','countryDetail','cdName','cdPop','cdCulture',
            'cdHappy','cdEcon','cdHealth','cdPeace','cdTime','cdActivity','cdClose',
            'promptForm','promptInput','promptChips','promptHint',
            'helpBtn','helpClose','helpModal',
            'achvBtn','achvClose','achvModal','achvList',
            'eraBanner','eraYear','eraName','eraMood',
            'timelineWrap','timelineYear','timelineHandle','timelineRail','timelineMarks','timelineEras','timelineNow',
            'bootStatus',
        ].forEach(id => el[id] = $(id));

        // mobile stats pill ⇄ expanded stats panel
        if (el.statsPill) {
            el.statsPill.addEventListener('click', () => {
                el.statsPanel.classList.add('expanded');
                el.statsPill.classList.add('hidden');
            });
        }
        if (el.statsPanel) {
            el.statsPanel.addEventListener('click', (e) => {
                // tap the panel header or outside its interactive content to collapse (mobile only)
                if (window.matchMedia('(max-width: 620px)').matches) {
                    el.statsPanel.classList.remove('expanded');
                    el.statsPill.classList.remove('hidden');
                }
            });
        }
        // auto-collapse when rotating to desktop size
        window.addEventListener('resize', () => {
            if (!window.matchMedia('(max-width: 620px)').matches) {
                el.statsPanel.classList.remove('expanded');
                if (el.statsPill) el.statsPill.classList.remove('hidden');
            }
        });

        // time controls
        document.querySelectorAll('.tc').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tc').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                world.speed = parseInt(btn.dataset.speed);
                if (world.speed === 0) log('paused','info');
            });
        });

        // prompt + history
        const promptHistory = [];
        let historyIndex = -1;
        el.promptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const v = el.promptInput.value.trim();
            if (!v) return;
            if (promptHistory[promptHistory.length - 1] !== v) {
                promptHistory.push(v);
                if (promptHistory.length > 40) promptHistory.shift();
            }
            historyIndex = promptHistory.length;
            Main.handlePrompt(v);
            el.promptInput.value = '';
        });
        el.promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (promptHistory.length === 0) return;
                historyIndex = Math.max(0, historyIndex - 1);
                el.promptInput.value = promptHistory[historyIndex] || '';
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (promptHistory.length === 0) return;
                historyIndex = Math.min(promptHistory.length, historyIndex + 1);
                el.promptInput.value = promptHistory[historyIndex] || '';
            }
        });
        document.querySelectorAll('.chip').forEach(c => {
            c.addEventListener('click', () => {
                el.promptInput.value = c.dataset.cmd;
                el.promptForm.dispatchEvent(new Event('submit'));
            });
        });

        // help
        el.helpBtn.addEventListener('click', () => el.helpModal.classList.remove('hidden'));
        el.helpClose.addEventListener('click', () => el.helpModal.classList.add('hidden'));
        el.helpModal.addEventListener('click', (e) => { if (e.target === el.helpModal) el.helpModal.classList.add('hidden'); });

        // projection toggle
        const projBtn = $('projBtn');
        if (projBtn) projBtn.addEventListener('click', () => {
            const next = MapView.toggleMode();
            projBtn.textContent = next === 'globe' ? '🗺' : '🌐';
            UI.log(next === 'globe' ? 'Gaia curves into a sphere. Drag to rotate.' : 'Gaia unrolls flat again.', 'info');
            if (next === 'globe') Quests.trigger(null, { kind:'globe' });
        });

        // data layer cycle
        const layerBtn = $('layerBtn');
        const layerLabel = $('layerLabel');
        if (layerBtn) layerBtn.addEventListener('click', () => {
            const next = MapView.cycleLayer();
            if (layerLabel) layerLabel.textContent = next;
            MapView.invalidateFills();
        });

        // current / news modal
        const newsBtn = $('newsBtn');
        const newsModal = $('newsModal');
        const newsClose = $('newsClose');
        if (newsBtn) newsBtn.addEventListener('click', () => {
            newsModal?.classList.remove('hidden');
            News.render();
        });
        if (newsClose) newsClose.addEventListener('click', () => newsModal?.classList.add('hidden'));
        if (newsModal) newsModal.addEventListener('click', e => {
            if (e.target === newsModal) newsModal.classList.add('hidden');
        });
        document.querySelectorAll('.news-tab.gaia-tab').forEach(b => {
            b.addEventListener('click', () => News.setTab(b.dataset.cat));
        });
        document.querySelectorAll('.news-tab.terra-tab').forEach(b => {
            b.addEventListener('click', () => News.setSection(b.dataset.section));
        });
        document.querySelectorAll('.news-world').forEach(b => {
            b.addEventListener('click', () => News.setWorld(b.dataset.world));
        });
        const newsSearch = $('newsSearch');
        if (newsSearch) newsSearch.addEventListener('input', () => News.render());

        // achievements
        el.achvBtn.addEventListener('click', () => openAchievements());
        el.achvClose.addEventListener('click', () => el.achvModal.classList.add('hidden'));
        el.achvModal.addEventListener('click', (e) => { if (e.target === el.achvModal) el.achvModal.classList.add('hidden'); });

        // log clear
        el.clearLog.addEventListener('click', () => { el.logList.innerHTML = ''; });

        // country detail close
        el.cdClose.addEventListener('click', () => {
            el.countryDetail.classList.add('hidden');
            MapView.setClicked(null);
        });

        // timeline
        initTimeline();
        el.timelineNow.addEventListener('click', () => Main.travelTo(new Date().getUTCFullYear()));

        // click clock to copy a share URL at current year
        if (el.clock) {
            el.clock.style.cursor = 'pointer';
            el.clock.title = 'Click to copy a shareable link at this moment';
            el.clock.addEventListener('click', copyShareLink);
        }

        // tooltip tracking
        MapView.onHover((id, pos) => {
            if (!id || !COUNTRIES[id]) {
                el.tooltip.classList.add('hidden');
                return;
            }
            showTooltip(id, pos.x, pos.y);
        });
        MapView.onClick((id) => {
            if (!COUNTRIES[id]) return;
            showCountryDetail(id);
            Achievements.noteClick(id);
            if (Achievements.counters.countriesClicked.size >= 20) {
                Quests.trigger(null, { kind:'click_tour' });
            }
            el.tooltip.classList.add('hidden');
        });

        // keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.key === ' ') {
                e.preventDefault();
                // toggle pause / 1x
                const current = world.speed;
                world.speed = current === 0 ? 1 : 0;
                document.querySelectorAll('.tc').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.speed) === world.speed);
                });
            }
            if (e.key === '/' && document.activeElement !== el.promptInput) {
                e.preventDefault();
                el.promptInput.focus();
            }
            if (e.key === 'Escape') {
                el.helpModal.classList.add('hidden');
                el.achvModal.classList.add('hidden');
                el.countryDetail.classList.add('hidden');
                MapView.setClicked(null);
            }
            if (e.key === 'h' || e.key === 'H') el.helpModal.classList.toggle('hidden');
            if (e.key === 'r' || e.key === 'R') MapView.resetView();
        });

        // random rotating prompt hints
        rotateHints();

        // first-load onboarding: pulse the prompt, focus it after a beat
        const formEl = document.querySelector('.prompt');
        if (formEl) formEl.classList.add('first-pulse');
        setTimeout(() => el.promptInput.focus({ preventScroll: true }), 1200);
        setTimeout(() => formEl?.classList.remove('first-pulse'), 6000);
    }

    /* ---------- Stats ---------- */

    function updateStats() {
        const ids = ALL_COUNTRY_IDS;
        let totalPop = 0, happy = 0, econ = 0, peace = 0, health = 0, climate = 0, w = 0;
        for (const id of ids) {
            const cs = world.countryState[id];
            if (!cs) continue;
            const weight = cs.pop;
            totalPop += cs.pop;
            happy   += cs.happy   * weight;
            econ    += cs.econ    * weight;
            peace   += cs.peace   * weight;
            health  += cs.health  * weight;
            climate += cs.climate * weight;
            w += weight;
        }
        const norm = w > 0 ? w : 1;
        const hN = happy/norm, eN = econ/norm, pN = peace/norm, hlN = health/norm, clN = climate/norm;

        el.statPop.textContent    = formatPop(totalPop);
        el.statHappy.textContent  = pct(hN);
        el.statEcon.textContent   = pct(eN);
        el.statPeace.textContent  = pct(pN);
        el.statHealth.textContent = pct(hlN);
        el.statClimate.textContent= pct(clN);

        el.statPopBar.style.width   = Math.min(100, totalPop / 10000 * 100) + '%';
        el.statHappyBar.style.width = (hN*100) + '%';
        el.statEconBar.style.width  = (eN*100) + '%';
        el.statPeaceBar.style.width = (pN*100) + '%';
        el.statHealthBar.style.width= (hlN*100) + '%';
        el.statClimateBar.style.width = (clN*100) + '%';

        // mobile pill
        if (el.pillPop)   el.pillPop.textContent   = '🌍 ' + formatPop(totalPop);
        if (el.pillHappy) el.pillHappy.textContent = '☺ ' + Math.round(hN*100) + '%';

        el.activeEventsCount.textContent = Events.countActive();
    }

    function formatPop(m) {
        if (m >= 1000) return (m / 1000).toFixed(2) + 'B';
        if (m >= 100)  return m.toFixed(0) + 'M';
        if (m >= 1)    return m.toFixed(1) + 'M';
        return (m*1000).toFixed(0) + 'K';
    }
    function pct(v) { return Math.round(v * 100) + '%'; }

    /* ---------- Clock ---------- */

    function updateClock() {
        const d = world.clock;
        const yr = d.getUTCFullYear();
        const yearStr = yr < 0 ? Math.abs(yr) + ' BCE' : yr;
        const dateStr = new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'UTC' });
        el.clockDate.textContent = yearStr + ' · ' + dateStr;
        el.clockTime.textContent = d.toISOString().slice(11, 16) + ' UTC';
        el.timelineYear.textContent = yearStr;
        updateTimelineHandle();
    }

    /* ---------- Tooltip ---------- */

    function showTooltip(id, x, y) {
        const c = COUNTRIES[id];
        const cs = world.countryState[id];
        if (!c) { el.tooltip.classList.add('hidden'); return; }
        const flag = flagEmoji(id);
        el.tooltip.innerHTML = `
            <div class="tt-name">${flag ? flag + ' ' : ''}${c.name}</div>
            <div class="tt-row"><span>Population</span><b>${formatPop(cs.pop)}</b></div>
            <div class="tt-row"><span>Culture</span><b>${CULTURES[c.culture].name}</b></div>
            <div class="tt-row"><span>Happiness</span><b>${pct(cs.happy)}</b></div>
            <div class="tt-row"><span>Peace</span><b>${pct(cs.peace)}</b></div>
        `;
        el.tooltip.style.left = x + 'px';
        el.tooltip.style.top = y + 'px';
        el.tooltip.classList.remove('hidden');
    }

    /* ---------- Country detail ---------- */

    function showCountryDetail(id) {
        const c = COUNTRIES[id];
        const cs = world.countryState[id];
        if (!c || !cs) return;
        const flag = flagEmoji(id);
        el.cdName.textContent = (flag ? flag + '  ' : '') + c.name;
        el.cdPop.textContent = formatPop(cs.pop);
        el.cdCulture.textContent = CULTURES[c.culture].name + ' · ' + CULTURES[c.culture].signature;
        el.cdHappy.textContent = pct(cs.happy);
        el.cdEcon.textContent = pct(cs.econ);
        el.cdHealth.textContent = pct(cs.health);
        el.cdPeace.textContent = pct(cs.peace);

        // local time
        const utcH = world.clock.getUTCHours() + world.clock.getUTCMinutes()/60;
        let lh = (utcH + c.tz) % 24;
        if (lh < 0) lh += 24;
        const h = Math.floor(lh);
        const m = Math.floor((lh - h) * 60);
        el.cdTime.textContent = pad2(h) + ':' + pad2(m);

        // a sampled person doing something
        const person = Population.randomInCountry(id);
        if (person) {
            const cultureGreet = CULTURES[c.culture].greeting;
            el.cdActivity.textContent = `"${cultureGreet}," says ${person.name}, ${person.activity}.`;
        } else {
            el.cdActivity.textContent = '—';
        }

        // sparkline
        renderSparkline(cs.history || []);

        el.countryDetail.classList.remove('hidden');
    }

    function renderSparkline(history) {
        const svg = document.getElementById('cdSpark');
        if (!svg) return;
        svg.innerHTML = '';
        if (!history.length) return;
        const w = 220, h = 46;
        const step = w / Math.max(1, history.length - 1);
        const pathFor = (key, color) => {
            let d = '';
            history.forEach((pt, i) => {
                const v = pt[key];
                const x = i * step;
                const y = h - (v * (h - 4)) - 2;
                d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
            });
            return `<path d="${d}" stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
        };
        svg.innerHTML =
            `<line x1="0" y1="${h-2}" x2="${w}" y2="${h-2}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>` +
            `<line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="rgba(255,255,255,0.03)" stroke-width="1" stroke-dasharray="2 3"/>` +
            pathFor('h', '#6bf1a0') +
            pathFor('p', '#7aa2ff') +
            pathFor('e', '#ffd36b');
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    /* ---------- Log ---------- */

    const MAX_LOG = 50;
    function log(text, mood = 'info') {
        const item = document.createElement('li');
        item.className = 'log-entry ' + mood;
        const time = new Date(world.clock).toISOString().slice(0, 16).replace('T',' ');
        item.innerHTML = `<div class="log-time">${time}</div><div class="log-text">${text}</div>`;
        el.logList.prepend(item);
        while (el.logList.children.length > MAX_LOG) el.logList.lastChild.remove();
    }

    /* ---------- Achievements modal ---------- */

    function openAchievements() {
        el.achvList.innerHTML = '';
        for (const a of Achievements.LIST) {
            const got = Achievements.has(a.id);
            const li = document.createElement('li');
            li.className = 'achv-item' + (got ? '' : ' locked');
            li.innerHTML = `
                <div class="achv-ic">${got ? '🏆' : '🔒'}</div>
                <div class="achv-text">
                    <div class="achv-t">${a.title}</div>
                    <div class="achv-d">${a.desc}</div>
                </div>
            `;
            el.achvList.appendChild(li);
        }
        el.achvModal.classList.remove('hidden');
    }

    /* ---------- Timeline ----------
       The timeline uses a *dynamic* window: the visible span is
       narrow when focused on recent years, wide for deep past.
       The window recenters around the handle whenever the user
       releases a drag or travels programmatically, which makes
       event titles spread out and stop overlapping.
    */

    const TL_MIN_YEAR = -3000;
    const TL_MAX_YEAR = 2300;
    const TL_NOW      = 2026;
    const TL_ZOOM_DEADZONE = 14;   // px of upward motion before zoom starts
    const TL_ZOOM_RANGE    = 150;  // px of upward motion for full zoom-out
    const ERA_SHORT = {
        bronze:'Bronze', antiquity:'Antiquity', medieval:'Medieval',
        plague:'Black Death', renaissance:'Renaissance', colonial:'Exploration',
        industrial:'Industrial', ww1:'WWI', interwar:'Interwar', ww2:'WWII',
        coldwar:'Cold War', digital:'Digital', modern:'Modern',
        near:'Near Future', far:'Far Future',
    };
    let   tlWindow      = null;
    let   tlDragWindow  = null;
    let   tlDragging    = false;
    let   tlDragBase    = null;     // { startX, startY, baseWindow }
    let   tlZoomOut     = 0;        // 0..1 — live zoom amount during drag
    // cached DOM for ticks / labels / marks (built once, laid out many times)
    const tlItems = { eras: [], marks: [] };

    function windowFor(year) {
        const dist = Math.abs(TL_NOW - year);
        const halfW = Math.max(60, Math.min(3400, 60 + dist * 0.75));
        let W_past = halfW * 1.6;
        let W_future = halfW * 0.4;
        let start = year - W_past;
        let end   = year + W_future;
        if (start < TL_MIN_YEAR) { end += (TL_MIN_YEAR - start); start = TL_MIN_YEAR; }
        if (end   > TL_MAX_YEAR) { start -= (end - TL_MAX_YEAR); end = TL_MAX_YEAR; }
        start = Math.max(TL_MIN_YEAR, start);
        end   = Math.min(TL_MAX_YEAR, end);
        return { start, end };
    }

    function activeWindow() {
        return tlDragging ? (tlDragWindow || tlWindow) : tlWindow;
    }

    function pctFromYear(y) {
        const w = activeWindow();
        if (!w) return 0;
        return ((y - w.start) / (w.end - w.start)) * 100;
    }

    function yearFromU(u) {
        const w = activeWindow();
        if (!w) return TL_NOW;
        return Math.round(w.start + u * (w.end - w.start));
    }

    function initTimeline() {
        tlWindow = windowFor(world.clock.getUTCFullYear());
        buildTimelineElements();
        layoutTimeline();
        updateTimelineHandle();

        const rail = el.timelineRail;
        let lastDragYear = null;

        function yearAtClient(clientX) {
            const rect = rail.getBoundingClientRect();
            const u = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            return yearFromU(u);
        }
        function startDrag(clientX, clientY) {
            tlDragging = true;
            tlDragBase = {
                startX: clientX, startY: clientY,
                baseWindow: { ...tlWindow },
            };
            tlDragWindow = { ...tlWindow };
            tlZoomOut = 0;
            el.timelineWrap?.classList.add('dragging');
            updateDrag(clientX, clientY);
        }
        function updateDrag(clientX, clientY) {
            if (!tlDragging || !tlDragBase) return;
            // vertical lift → interpolate toward full-range window
            const dy = Math.max(0, tlDragBase.startY - clientY - TL_ZOOM_DEADZONE);
            const raw = Math.max(0, Math.min(1, dy / TL_ZOOM_RANGE));
            const eased = raw * raw * (3 - 2 * raw);
            tlZoomOut = eased;
            const base = tlDragBase.baseWindow;
            tlDragWindow = {
                start: base.start + (TL_MIN_YEAR - base.start) * eased,
                end:   base.end   + (TL_MAX_YEAR - base.end)   * eased,
            };
            // year under the finger within the current (possibly zoomed) window
            const year = yearAtClient(clientX);
            lastDragYear = year;
            Main.travelTo(year, true);
            layoutTimeline();
            updateTimelineHandle();
            updateZoomChip();
        }
        function endDrag() {
            if (!tlDragging) return;
            tlDragging = false;
            tlDragWindow = null;
            tlDragBase = null;
            tlZoomOut = 0;
            el.timelineWrap?.classList.remove('dragging');
            hideZoomChip();
            if (lastDragYear != null) Main.travelTo(lastDragYear); // loud → rebuilds + animates
            lastDragYear = null;
        }

        // mouse
        rail.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
        window.addEventListener('mousemove', e => { if (tlDragging) updateDrag(e.clientX, e.clientY); });
        window.addEventListener('mouseup', endDrag);

        // touch
        rail.addEventListener('touchstart', e => {
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchmove', e => {
            if (!tlDragging) return;
            e.preventDefault();
            const t = e.touches[0];
            updateDrag(t.clientX, t.clientY);
        }, { passive: false });
        window.addEventListener('touchend', endDrag);
        window.addEventListener('touchcancel', endDrag);
    }

    /* Build every era tick/label and every significant event mark once —
       we only reposition them after that, which keeps the drag interaction
       buttery even while the window continuously changes shape. */
    function buildTimelineElements() {
        const eraWrap = el.timelineEras;
        const marks   = el.timelineMarks;
        if (!eraWrap || !marks) return;
        eraWrap.innerHTML = '';
        marks.innerHTML = '';
        tlItems.eras = [];
        tlItems.marks = [];

        for (const era of History.ERAS) {
            const tick = document.createElement('div');
            tick.className = 'timeline-era-tick';
            eraWrap.appendChild(tick);
            const label = document.createElement('div');
            label.className = 'timeline-era-label';
            label.textContent = ERA_SHORT[era.id] || era.name;
            eraWrap.appendChild(label);
            tlItems.eras.push({ tick, label, year: era.year });
        }

        for (const he of History.HISTORICAL_EVENTS) {
            if (he.severity < 0.55) continue;
            const m = document.createElement('div');
            m.className = 'timeline-mark';
            m.title = markTitle(he);
            m.addEventListener('click', e => {
                e.stopPropagation();
                Main.travelTo(he.year);
            });
            marks.appendChild(m);
            tlItems.marks.push({ el: m, year: he.year, severity: he.severity });
        }
    }

    /* Apply the current active window to every element. Called on init,
       on travel, and on every drag frame. */
    function layoutTimeline() {
        const w = activeWindow();
        if (!w) return;
        const span = w.end - w.start;
        const sevThreshold = span <= 400 ? 0.55 : span <= 1500 ? 0.7 : 0.82;

        // pass 1: position era ticks and default label visibility
        const visible = [];
        for (const it of tlItems.eras) {
            const pct = ((it.year - w.start) / span) * 100;
            if (pct < -2 || pct > 102) {
                it.tick.style.display = 'none';
                it.label.style.display = 'none';
            } else {
                it.tick.style.display = '';
                it.tick.style.left = pct + '%';
                it.label.style.left = pct + '%';
                it.label.style.display = ''; // may hide in pass 2
                visible.push({ it, pct });
            }
        }
        // pass 2: thin labels so none overlap
        visible.sort((a, b) => a.pct - b.pct);
        const MIN_LABEL_GAP_PCT = 13;
        let lastLabelPct = -Infinity;
        for (const { it, pct } of visible) {
            if (pct < 0 || pct > 100 || pct - lastLabelPct < MIN_LABEL_GAP_PCT) {
                it.label.style.display = 'none';
            } else {
                lastLabelPct = pct;
            }
        }

        // marks
        const positions = [];
        for (const m of tlItems.marks) {
            const pct = ((m.year - w.start) / span) * 100;
            if (pct < 0 || pct > 100 || m.severity < sevThreshold) {
                m.el.style.display = 'none';
                continue;
            }
            const clash = positions.find(p => Math.abs(p.pct - pct) < 0.9);
            if (clash) {
                if (m.severity > clash.sev) {
                    // replace clash with the stronger event
                    clash.el.style.display = 'none';
                    clash.pct = pct; clash.sev = m.severity; clash.el = m.el;
                    m.el.style.display = ''; m.el.style.left = pct + '%';
                } else {
                    m.el.style.display = 'none';
                }
                continue;
            }
            m.el.style.display = '';
            m.el.style.left = pct + '%';
            positions.push({ pct, sev: m.severity, el: m.el });
        }
    }

    /* Re-anchor the window around the current year (called on non-silent travel). */
    function rebuildTimeline() {
        if (!el.timelineEras || !el.timelineMarks) return;
        if (!tlItems.eras.length) buildTimelineElements();
        tlWindow = windowFor(world.clock.getUTCFullYear());
        layoutTimeline();
        updateTimelineHandle();
    }

    function markTitle(he) {
        const y = he.year < 0 ? Math.abs(he.year) + ' BCE' : he.year;
        return `${y} · ${he.label}`;
    }

    function updateTimelineHandle() {
        if (!el.timelineHandle) return;
        const y = world.clock.getUTCFullYear();
        const w = activeWindow();
        if (!w) return;
        if (!tlDragging && (y < w.start || y > w.end)) {
            rebuildTimeline();
            return;
        }
        el.timelineHandle.style.left = Math.max(0, Math.min(100, pctFromYear(y))) + '%';
    }

    /* Small zoom-state chip above the rail while dragging. */
    function updateZoomChip() {
        let chip = el.timelineZoomChip;
        if (!chip) {
            chip = document.createElement('div');
            chip.className = 'timeline-zoom-chip';
            el.timelineWrap?.appendChild(chip);
            el.timelineZoomChip = chip;
        }
        const w = activeWindow();
        if (!w) return;
        const span = w.end - w.start;
        let label;
        if (span > 4000)      label = 'all of history';
        else if (span > 1500) label = 'era view';
        else if (span > 400)  label = 'zoomed in';
        else                  label = 'focused';
        chip.textContent = (tlZoomOut > 0.02 ? '↕ ' : '') + label;
        chip.classList.toggle('big', tlZoomOut > 0.3);
        chip.style.opacity = '1';
    }
    function hideZoomChip() {
        if (el.timelineZoomChip) el.timelineZoomChip.style.opacity = '0';
    }

    /* ---------- Era banner ---------- */

    function showEraBanner(era, year) {
        el.eraYear.textContent = year < 0 ? Math.abs(year) + ' BCE' : year;
        el.eraName.textContent = era.name;
        el.eraMood.textContent = era.mood;
        el.eraBanner.classList.remove('hidden');
        // reflow to restart animation
        void el.eraBanner.offsetWidth;
        el.eraBanner.style.animation = 'none';
        void el.eraBanner.offsetWidth;
        el.eraBanner.style.animation = '';
        setTimeout(() => el.eraBanner.classList.add('hidden'), 4600);
    }

    /* ---------- Prompt hints rotation ---------- */

    const HINTS = [
        'earthquake in Japan · bless the world with prosperity · festival in Rio · peace across Europe',
        'travel to 1969 · volcano over Indonesia · plague in medieval Europe · rain over Sahara',
        'baby boom in India · alien contact over New York · aurora over Norway · miracle in Jerusalem',
        'war in Mesopotamia · wildfire in Australia · dragons return to Scandinavia · zombie outbreak in Florida',
        'go to year 1492 · travel to the black death · prosperity in Africa · sunshine worldwide',
    ];
    function rotateHints() {
        let i = 0;
        setInterval(() => {
            i = (i + 1) % HINTS.length;
            el.promptHint.innerHTML = 'Try: ' + HINTS[i].split(' · ').map(s => `<em>${s}</em>`).join(' · ');
        }, 6000);
    }

    function copyShareLink() {
        const y = world.clock.getUTCFullYear();
        const url = new URL(window.location.href);
        url.searchParams.set('y', y);
        const s = url.toString();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(s).then(() => {
                log(`Shareable link copied — jumps to <b>${y < 0 ? Math.abs(y)+' BCE' : y}</b>.`, 'good');
            }).catch(() => log('Could not access clipboard.', 'warn'));
        } else {
            log(`Share this URL: <em>${s}</em>`, 'info');
        }
    }

    function boot(msg, progress) {
        if (el.bootStatus) el.bootStatus.textContent = msg;
        const bar = document.querySelector('.boot-bar-fill');
        if (bar && typeof progress === 'number') bar.style.width = progress + '%';
    }

    return {
        init,
        updateStats,
        updateClock,
        log,
        showCountryDetail,
        showEraBanner,
        boot,
        rebuildTimeline,
    };
})();
