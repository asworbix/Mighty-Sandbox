/* =========================================================
   ui.js — HUD controller. Stats panel, event log, tooltip,
   country detail, prompt chips, help / achievements modals,
   timeline scrubber, era banner, speed controls.
   ========================================================= */

const UI = (() => {
    const el = {};
    let world = null;

    /* timeline constants */
    const TL_MIN_YEAR = -3000;
    const TL_MAX_YEAR = 2300;

    function $(id) { return document.getElementById(id); }

    function init(worldRef) {
        world = worldRef;

        // cache elements
        [
            'clock','clockDate','clockTime',
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
            'timelineYear','timelineHandle','timelineRail','timelineMarks','timelineEras','timelineNow',
            'bootStatus',
        ].forEach(id => el[id] = $(id));

        // time controls
        document.querySelectorAll('.tc').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tc').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                world.speed = parseInt(btn.dataset.speed);
                if (world.speed === 0) log('paused','info');
            });
        });

        // prompt
        el.promptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const v = el.promptInput.value.trim();
            if (!v) return;
            Main.handlePrompt(v);
            el.promptInput.value = '';
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
        el.tooltip.innerHTML = `
            <div class="tt-name">${c.name}</div>
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
        el.cdName.textContent = c.name;
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

    /* ---------- Timeline ---------- */

    function initTimeline() {
        // eras
        const eraWrap = el.timelineEras;
        eraWrap.innerHTML = '';
        for (const era of History.ERAS) {
            const pos = pctFromYear(era.year);
            if (pos < 0 || pos > 100) continue;
            const tick = document.createElement('div');
            tick.className = 'timeline-era-tick';
            tick.style.left = pos + '%';
            eraWrap.appendChild(tick);
            const label = document.createElement('div');
            label.className = 'timeline-era-label';
            label.style.left = pos + '%';
            label.textContent = era.name.split(' ')[0];
            eraWrap.appendChild(label);
        }
        // marks for notable events
        const marks = el.timelineMarks;
        marks.innerHTML = '';
        const bigOnes = History.HISTORICAL_EVENTS.filter(e => e.severity >= 0.8);
        for (const he of bigOnes) {
            const pos = pctFromYear(he.year);
            if (pos < 0 || pos > 100) continue;
            const m = document.createElement('div');
            m.className = 'timeline-mark';
            m.style.left = pos + '%';
            m.title = `${he.year} — ${he.label}`;
            m.addEventListener('click', (e) => {
                e.stopPropagation();
                Main.travelTo(he.year);
            });
            marks.appendChild(m);
        }
        // drag
        let dragging = false;
        const rail = el.timelineRail;
        function toYear(e) {
            const rect = rail.getBoundingClientRect();
            const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            return Math.round(TL_MIN_YEAR + u * (TL_MAX_YEAR - TL_MIN_YEAR));
        }
        rail.addEventListener('mousedown', (e) => {
            dragging = true;
            Main.travelTo(toYear(e));
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            Main.travelTo(toYear(e), true);
        });
        window.addEventListener('mouseup', () => { dragging = false; });
        // touch
        rail.addEventListener('touchstart', (e) => {
            dragging = true;
            Main.travelTo(toYear(e.touches[0]));
        });
        window.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            Main.travelTo(toYear(e.touches[0]), true);
        });
        window.addEventListener('touchend', () => { dragging = false; });
    }

    function pctFromYear(y) {
        return ((y - TL_MIN_YEAR) / (TL_MAX_YEAR - TL_MIN_YEAR)) * 100;
    }

    function updateTimelineHandle() {
        const y = world.clock.getUTCFullYear();
        el.timelineHandle.style.left = Math.max(0, Math.min(100, pctFromYear(y))) + '%';
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

    function boot(msg) { el.bootStatus.textContent = msg; }

    return {
        init,
        updateStats,
        updateClock,
        log,
        showCountryDetail,
        showEraBanner,
        boot,
    };
})();
