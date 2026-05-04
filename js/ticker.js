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

        // HISTORY mode: surface a sample of major historical events, weighted
        // toward whatever year the timeline handle is currently parked at.
        const y = world?.clock?.getUTCFullYear?.() ?? 2026;
        const near = (typeof History !== 'undefined' && History.eventsNear)
            ? History.eventsNear(y, 30) : [];
        const sorted = near.slice().sort((a, b) => (b.severity || 0) - (a.severity || 0));
        for (const he of sorted.slice(0, 16)) {
            const yy = he.year < 0 ? Math.abs(he.year) + ' BCE' : he.year;
            items.push({ text: `<b>${yy}</b> · ${he.emoji || '•'} ${he.label}`, mood: 'info' });
        }
        if (items.length === 0) items.push({ text: '— scrub the timeline to explore history —', mood: 'info' });

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
        // If the ticker is currently showing the "tuning…" placeholder (no
        // real items yet), poll every 1s so we pick up the GDELT fetch the
        // moment it lands. Once we have real items, relax to 90s (Gaia) or
        // 18s (History) so the CSS scroll animation completes a cycle
        // between DOM rebuilds instead of jumping.
        const hasReal = items.length > 0 && items[0].text && !items[0].text.includes('tuning into');
        let iv;
        if (!hasReal) iv = 1000;
        else if (document.body.classList.contains('mode-gaia')) iv = 90000;
        else iv = 18000;
        if (lastRefresh > iv) { lastRefresh = 0; refresh(); }
    }

    function escapeT(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    return { init, refresh, tick };
})();
