/* =========================================================
   ticker.js — scrolling headline ticker at the bottom. Draws
   from active events, country stats extremes, and ambient
   flavor.
   ========================================================= */

const Ticker = (() => {
    let el = null;
    let track = null;
    let world = null;
    let items = [];
    let lastRefresh = 0;

    function init(worldRef) {
        world = worldRef;
        el = document.getElementById('ticker');
        track = document.getElementById('tickerTrack');
        refresh();
    }

    const AMBIENT = [
        "Weather stations across {country} report quiet skies.",
        "Traders in {country} log another steady day.",
        "Students in {country} sit their exams at dawn.",
        "{country} observes an official moment of silence.",
        "Satellites pass overhead — {country} waves up.",
        "A wedding procession closes the main street in {country}.",
        "Night fishermen return to port in {country} with full nets.",
        "A viral video from {country} captures hearts worldwide.",
        "Streetlights in {country} flicker on as dusk falls.",
        "Local papers in {country} print a hopeful editorial.",
    ];

    function refresh() {
        items = [];

        // update label to reflect mode
        const labelEl = document.getElementById('tickerLabel');
        if (labelEl) {
            labelEl.textContent = document.body.classList.contains('mode-gaia')
                ? 'GAIA · LIVE' : 'HISTORY · SIM';
        }

        // GAIA mode: real headlines from GDELT (via News module's live cache).
        if (document.body.classList.contains('mode-gaia') && typeof News !== 'undefined' && News.getLiveHeadlines) {
            const live = News.getLiveHeadlines(25);
            if (live && live.length) {
                for (const h of live) {
                    const flag = h.cid ? (flagEmoji(h.cid) + ' ') : '';
                    const label = h.domain ? `<em>${escapeT(h.domain)}</em> — ` : '';
                    items.push({ text: flag + label + escapeT(h.text), mood: /war|attack|strike|dead|killed|crisis|protest/i.test(h.text) ? 'warn' : 'info' });
                }
                render();
                return;
            }
            // If live feed not ready yet, fall through to a minimal placeholder.
            items.push({ text:'📡 tuning into the live wire…', mood:'info' });
            render();
            return;
        }

        // HISTORY mode: procedural sim-based ticker.
        for (const ev of Events.active) {
            items.push({ text: Narrator.headline(ev), mood: ev.mood });
        }
        // extremes
        const ids = ALL_COUNTRY_IDS;
        let topHappy = null, botHappy = null;
        let topEcon = null, botPeace = null, topHealth = null;
        for (const id of ids) {
            const cs = world.countryState[id]; if (!cs) continue;
            if (!topHappy || cs.happy > topHappy.v) topHappy = { id, v: cs.happy };
            if (!botHappy || cs.happy < botHappy.v) botHappy = { id, v: cs.happy };
            if (!topEcon  || cs.econ  > topEcon.v ) topEcon  = { id, v: cs.econ };
            if (!botPeace || cs.peace < botPeace.v) botPeace = { id, v: cs.peace };
            if (!topHealth|| cs.health> topHealth.v)topHealth= { id, v: cs.health };
        }
        if (topHappy)  items.push({ text:`Happiness peaks in <b>${COUNTRIES[topHappy.id].name}</b> (${Math.round(topHappy.v*100)}%).`, mood:'good' });
        if (botHappy)  items.push({ text:`Lowest mood right now: <b>${COUNTRIES[botHappy.id].name}</b> (${Math.round(botHappy.v*100)}%).`, mood:'warn' });
        if (topEcon)   items.push({ text:`Markets strongest in <b>${COUNTRIES[topEcon.id].name}</b>.`, mood:'good' });
        if (botPeace)  items.push({ text:`Tensions run highest in <b>${COUNTRIES[botPeace.id].name}</b>.`, mood:'warn' });
        if (topHealth) items.push({ text:`Healthiest nation: <b>${COUNTRIES[topHealth.id].name}</b>.`, mood:'good' });

        // ambient flavor
        for (let i = 0; i < 6; i++) {
            const ids = ALL_COUNTRY_IDS;
            const c = COUNTRIES[ids[Math.floor(Math.random() * ids.length)]];
            const text = AMBIENT[Math.floor(Math.random() * AMBIENT.length)].replace('{country}', `<b>${c.name}</b>`);
            items.push({ text, mood:'info' });
        }

        render();
    }

    function render() {
        if (!track) return;
        track.innerHTML = '';
        // duplicate for seamless loop
        const html = items.map(it => {
            const dot = it.mood === 'good' ? '🟢' : it.mood === 'bad' ? '🔴' : it.mood === 'warn' ? '🟡' : '🔵';
            return `<span class="ticker-item mood-${it.mood}">${dot} ${it.text}</span>`;
        }).join('<span class="ticker-sep">·</span>');
        track.innerHTML = html + '<span class="ticker-sep">·</span>' + html;
    }

    function tick(dt) {
        lastRefresh += dt;
        // In Gaia mode refresh ~every 60s (real headlines change slowly);
        // in History mode keep the lively ~10s cadence.
        const iv = document.body.classList.contains('mode-gaia') ? 60000 : 10000;
        if (lastRefresh > iv) { lastRefresh = 0; refresh(); }
    }

    function escapeT(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    return { init, refresh, tick };
})();
