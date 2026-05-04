/* =========================================================
   news.js — a live-feeling global news feed. Every country
   and capital gets a steady stream of procedurally-generated
   headlines driven by simulation state, time-of-day, and
   culture. Feels like scrolling BBC News while the world
   turns, without a single network call.
   ========================================================= */

const News = (() => {
    let world = null;

    /* A big pool of templates. Each template is a function (ctx) => string
       where ctx = { country, capital, culture, state, localHour, event }.
       Templates choose whether to fire based on ctx (returning null to skip). */

    let lastRefresh = 0;
    let world_tab = 'gaia';    // 'gaia' | 'terra'

    /* ============================================================
       TERRA — LIVE. GDELT for articles (keyless, CORS-ok),
       Reddit r/worldnews for an extra trend signal, YouTube live
       embeds of real broadcast channels. Per-country filters so
       Denmark, Kenya, Peru, etc. all get their own feed.
       ============================================================ */

    // Curated location chips — 'world' + a useful spread of nations.
    // `q` is the GDELT query string: source country (FIPS) OR mentions
    // of the country name + capital + major cities.
    /* Country queries. Kept short — GDELT's DOC API becomes finicky past a
       few hundred chars. 3-4 flagship outlets + sourcecountry FIPS is
       enough to surface strong local coverage. `sourcelang` is intentionally
       omitted so native-language articles (e.g. Danish DR) come through. */
    const TERRA_LOCATIONS = [
        { id:'world', name:'World', flag:'🌍', q:'(domain:reuters.com OR domain:apnews.com OR domain:bbc.com OR domain:aljazeera.com OR domain:theguardian.com OR domain:france24.com OR domain:dw.com OR domain:npr.org)' },
        { id:'840', name:'United States',   flag:'🇺🇸', fips:'US', domains:['nytimes.com','washingtonpost.com','cnn.com','apnews.com','reuters.com'] },
        { id:'826', name:'United Kingdom',  flag:'🇬🇧', fips:'UK', domains:['bbc.co.uk','theguardian.com','thetimes.co.uk','telegraph.co.uk','ft.com'] },
        { id:'276', name:'Germany',         flag:'🇩🇪', fips:'GM', domains:['spiegel.de','tagesschau.de','zeit.de','dw.com'] },
        { id:'250', name:'France',          flag:'🇫🇷', fips:'FR', domains:['lemonde.fr','lefigaro.fr','france24.com','francetvinfo.fr'] },
        { id:'380', name:'Italy',           flag:'🇮🇹', fips:'IT', domains:['corriere.it','repubblica.it','ansa.it','rai.it'] },
        { id:'724', name:'Spain',           flag:'🇪🇸', fips:'SP', domains:['elpais.com','elmundo.es','rtve.es','lavanguardia.com'] },
        { id:'620', name:'Portugal',        flag:'🇵🇹', fips:'PO', domains:['publico.pt','rtp.pt','expresso.pt'] },
        { id:'528', name:'Netherlands',     flag:'🇳🇱', fips:'NL', domains:['nos.nl','nrc.nl','volkskrant.nl','dutchnews.nl'] },
        { id:'056', name:'Belgium',         flag:'🇧🇪', fips:'BE', domains:['vrt.be','rtbf.be','brusselstimes.com'] },
        { id:'756', name:'Switzerland',     flag:'🇨🇭', fips:'SZ', domains:['srf.ch','nzz.ch','swissinfo.ch'] },
        { id:'040', name:'Austria',         flag:'🇦🇹', fips:'AU', domains:['orf.at','derstandard.at','diepresse.com'] },
        { id:'372', name:'Ireland',         flag:'🇮🇪', fips:'EI', domains:['rte.ie','irishtimes.com','thejournal.ie'] },
        { id:'208', name:'Denmark',         flag:'🇩🇰', fips:'DA', domains:['dr.dk','tv2.dk','politiken.dk','berlingske.dk','jyllands-posten.dk','cphpost.dk'] },
        { id:'578', name:'Norway',          flag:'🇳🇴', fips:'NO', domains:['nrk.no','vg.no','aftenposten.no','tv2.no'] },
        { id:'752', name:'Sweden',          flag:'🇸🇪', fips:'SW', domains:['svt.se','dn.se','aftonbladet.se','expressen.se'] },
        { id:'246', name:'Finland',         flag:'🇫🇮', fips:'FI', domains:['yle.fi','hs.fi','is.fi'] },
        { id:'352', name:'Iceland',         flag:'🇮🇸', fips:'IC', domains:['ruv.is','mbl.is','visir.is'] },
        { id:'616', name:'Poland',          flag:'🇵🇱', fips:'PL', domains:['tvn24.pl','onet.pl','wp.pl','rp.pl'] },
        { id:'203', name:'Czechia',         flag:'🇨🇿', fips:'EZ', domains:['idnes.cz','novinky.cz','seznamzpravy.cz'] },
        { id:'348', name:'Hungary',         flag:'🇭🇺', fips:'HU', domains:['index.hu','telex.hu','24.hu'] },
        { id:'300', name:'Greece',          flag:'🇬🇷', fips:'GR', domains:['kathimerini.gr','ekathimerini.com','ert.gr'] },
        { id:'792', name:'Turkey',          flag:'🇹🇷', fips:'TU', domains:['hurriyetdailynews.com','dailysabah.com','trtworld.com'] },
        { id:'643', name:'Russia',          flag:'🇷🇺', fips:'RS', domains:['tass.com','ria.ru','meduza.io','rt.com'] },
        { id:'804', name:'Ukraine',         flag:'🇺🇦', fips:'UP', domains:['ukrinform.net','pravda.com.ua','kyivindependent.com','suspilne.media'] },
        { id:'124', name:'Canada',          flag:'🇨🇦', fips:'CA', domains:['cbc.ca','ctvnews.ca','globalnews.ca','theglobeandmail.com'] },
        { id:'484', name:'Mexico',          flag:'🇲🇽', fips:'MX', domains:['eluniversal.com.mx','milenio.com','jornada.com.mx'] },
        { id:'076', name:'Brazil',          flag:'🇧🇷', fips:'BR', domains:['globo.com','folha.uol.com.br','estadao.com.br','uol.com.br'] },
        { id:'032', name:'Argentina',       flag:'🇦🇷', fips:'AR', domains:['clarin.com','lanacion.com.ar','infobae.com'] },
        { id:'152', name:'Chile',           flag:'🇨🇱', fips:'CI', domains:['latercera.com','emol.com','biobiochile.cl'] },
        { id:'170', name:'Colombia',        flag:'🇨🇴', fips:'CO', domains:['eltiempo.com','semana.com','elespectador.com'] },
        { id:'604', name:'Peru',            flag:'🇵🇪', fips:'PE', domains:['elcomercio.pe','larepublica.pe'] },
        { id:'862', name:'Venezuela',       flag:'🇻🇪', fips:'VE', domains:['el-nacional.com','telesurtv.net'] },
        { id:'156', name:'China',           flag:'🇨🇳', fips:'CH', domains:['xinhuanet.com','chinadaily.com.cn','scmp.com','cgtn.com'] },
        { id:'392', name:'Japan',           flag:'🇯🇵', fips:'JA', domains:['nhk.or.jp','asahi.com','japantimes.co.jp','nikkei.com'] },
        { id:'410', name:'South Korea',     flag:'🇰🇷', fips:'KS', domains:['koreaherald.com','koreatimes.co.kr','yna.co.kr'] },
        { id:'408', name:'North Korea',     flag:'🇰🇵', fips:null, domains:[], q:'("North Korea" OR Pyongyang OR "Kim Jong")' },
        { id:'158', name:'Taiwan',          flag:'🇹🇼', fips:'TW', domains:['taipeitimes.com','focustaiwan.tw','taiwannews.com.tw'] },
        { id:'356', name:'India',           flag:'🇮🇳', fips:'IN', domains:['ndtv.com','thehindu.com','hindustantimes.com','indianexpress.com'] },
        { id:'586', name:'Pakistan',        flag:'🇵🇰', fips:'PK', domains:['dawn.com','geo.tv','tribune.com.pk'] },
        { id:'050', name:'Bangladesh',      flag:'🇧🇩', fips:'BG', domains:['thedailystar.net','prothomalo.com','bdnews24.com'] },
        { id:'360', name:'Indonesia',       flag:'🇮🇩', fips:'ID', domains:['kompas.com','detik.com','tempo.co','jakartapost.com'] },
        { id:'608', name:'Philippines',     flag:'🇵🇭', fips:'RP', domains:['inquirer.net','rappler.com','gmanetwork.com'] },
        { id:'764', name:'Thailand',        flag:'🇹🇭', fips:'TH', domains:['bangkokpost.com','nationthailand.com'] },
        { id:'704', name:'Vietnam',         flag:'🇻🇳', fips:'VM', domains:['vnexpress.net','vietnamnews.vn'] },
        { id:'458', name:'Malaysia',        flag:'🇲🇾', fips:'MY', domains:['thestar.com.my','malaymail.com','freemalaysiatoday.com'] },
        { id:'702', name:'Singapore',       flag:'🇸🇬', fips:'SN', domains:['straitstimes.com','channelnewsasia.com','todayonline.com'] },
        { id:'036', name:'Australia',       flag:'🇦🇺', fips:'AS', domains:['abc.net.au','smh.com.au','theage.com.au','news.com.au'] },
        { id:'554', name:'New Zealand',     flag:'🇳🇿', fips:'NZ', domains:['rnz.co.nz','stuff.co.nz','nzherald.co.nz'] },
        { id:'818', name:'Egypt',           flag:'🇪🇬', fips:'EG', domains:['ahram.org.eg','egyptindependent.com'] },
        { id:'682', name:'Saudi Arabia',    flag:'🇸🇦', fips:'SA', domains:['arabnews.com','saudigazette.com.sa','alarabiya.net'] },
        { id:'784', name:'UAE',             flag:'🇦🇪', fips:'AE', domains:['thenationalnews.com','gulfnews.com','khaleejtimes.com'] },
        { id:'376', name:'Israel',          flag:'🇮🇱', fips:'IS', domains:['haaretz.com','timesofisrael.com','jpost.com','ynetnews.com'] },
        { id:'364', name:'Iran',            flag:'🇮🇷', fips:'IR', domains:['presstv.ir','tehrantimes.com'] },
        { id:'368', name:'Iraq',            flag:'🇮🇶', fips:'IZ', domains:['rudaw.net'] },
        { id:'710', name:'South Africa',    flag:'🇿🇦', fips:'SF', domains:['news24.com','iol.co.za','dailymaverick.co.za','mg.co.za'] },
        { id:'566', name:'Nigeria',         flag:'🇳🇬', fips:'NI', domains:['vanguardngr.com','punchng.com','premiumtimesng.com'] },
        { id:'404', name:'Kenya',           flag:'🇰🇪', fips:'KE', domains:['nation.africa','standardmedia.co.ke','the-star.co.ke'] },
        { id:'231', name:'Ethiopia',        flag:'🇪🇹', fips:'ET', domains:['addisstandard.com','ena.et'] },
        { id:'504', name:'Morocco',         flag:'🇲🇦', fips:'MO', domains:['moroccoworldnews.com','yabiladi.com'] },
    ];

    /* Build a compact GDELT query from a location config. If `q` is set,
       use it directly. Otherwise OR together 3-4 domains and sourcecountry. */
    function locationQuery(loc) {
        if (loc.q) return loc.q;
        const parts = [];
        (loc.domains || []).forEach(d => parts.push('domain:' + d));
        if (loc.fips) parts.push('sourcecountry:' + loc.fips);
        return '(' + parts.join(' OR ') + ')';
    }

    // Real 24/7 live news channels on YouTube.
    const TV_CHANNELS = [
        { id:'UC16niRr50-MSBwiO3YDb3RA', name:'BBC News',            flag:'🇬🇧', home:'London' },
        { id:'UCQfwfsi5VrQ8yKZ-UWmAEFg', name:'France 24 English',   flag:'🇫🇷', home:'Paris' },
        { id:'UCknLrEdhRCp1aegoMqRaCZg', name:'DW News',             flag:'🇩🇪', home:'Berlin' },
        { id:'UCNye-wNBqNL5ZzHSJj3l8Bg', name:'Al Jazeera English',  flag:'🇶🇦', home:'Doha' },
        { id:'UCoMdktPbSTixAyNGwb-UYkQ', name:'Sky News',            flag:'🇬🇧', home:'London' },
        { id:'UCIALMKvObZNtJ6AmdCLP7Lg', name:'Bloomberg TV',        flag:'🇺🇸', home:'New York' },
        { id:'UC_eq_g42VFIzUQwI9YKE4Bw', name:'Bloomberg Quicktake', flag:'🇺🇸', home:'New York' },
        { id:'UCVgO39Bk5sMo66-6o6Spn6Q', name:'ABC News Australia',  flag:'🇦🇺', home:'Sydney' },
        { id:'UC7fWeaHhqgM4Ry-RMpM2YYw', name:'TRT World',           flag:'🇹🇷', home:'Istanbul' },
        { id:'UC_gUM8rL-Lrg6O3adPW9K1g', name:'WION',                flag:'🇮🇳', home:'Delhi' },
    ];

    // Terra state
    let terraActiveSection = 'wire';        // 'wire' | 'frontline' | 'trending' | 'tv'
    let terraActiveLocation = 'world';
    let terraActiveChannel = null;
    const terraCache = { wire: {}, frontline: {}, trending: { items:[], fetchedAt:0, loading:false, error:null } };

    function activeLocation() { return TERRA_LOCATIONS.find(l => l.id === terraActiveLocation) || TERRA_LOCATIONS[0]; }

    async function fetchGdelt(query) {
        const url = 'https://api.gdeltproject.org/api/v2/doc/doc?' + new URLSearchParams({
            query, mode:'artlist', format:'json', maxrecords:'60', sort:'datedesc', timespan:'24h',
        });
        const res = await fetch(url);
        if (!res.ok) throw new Error('GDELT ' + res.status);
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { return []; }
        if (!data.articles) return [];
        return data.articles.map(art => {
            const a2 = FIPS_TO_A2[art.sourcecountry] || art.sourcecountry;
            return {
                id: art.url,
                text: decodeHtml(art.title || ''),
                url: art.url,
                domain: art.domain || '',
                cid: ISO_A2_TO_NUM[a2] || null,
                sourceCountry: art.sourcecountry,
                time: parseGdeltTime(art.seendate),
            };
        }).filter(x => x.text);
    }

    async function fetchReddit(sub, limit) {
        const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/.json?limit=${limit || 25}&raw_json=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Reddit ' + res.status);
        const data = await res.json();
        const kids = data?.data?.children || [];
        return kids.map(k => k.data).filter(p => p && p.title).map(p => ({
            id: 'rd_' + p.id,
            text: decodeHtml(p.title),
            url: p.url_overridden_by_dest || ('https://reddit.com' + p.permalink),
            domain: 'r/' + (p.subreddit || sub),
            cid: null,
            time: (p.created_utc || 0) * 1000,
            score: p.score || 0,
            source: 'reddit',
        }));
    }

    async function ensureTerraData(section, locId) {
        if (section === 'tv') return; // no fetch needed
        if (section === 'trending') return ensureTrending();
        const bucket = terraCache[section];
        if (!bucket[locId]) bucket[locId] = { items:[], fetchedAt:0, loading:false, error:null };
        const e = bucket[locId];
        const now = Date.now();
        if (e.loading) return;
        if (e.fetchedAt && now - e.fetchedAt < 180000) return; // 3 min cache
        e.loading = true; e.error = null;
        render();
        try {
            const loc = TERRA_LOCATIONS.find(l => l.id === locId) || TERRA_LOCATIONS[0];
            const q = section === 'frontline' ? conflictQuery(loc) : locationQuery(loc);
            let items = [];
            try {
                items = await fetchGdelt(q);
            } catch (errPrimary) {
                // Query failed — fall back to the simplest possible form:
                // just sourcecountry for country feeds, or sourcelang:eng globally.
                const fallback = loc.fips ? `sourcecountry:${loc.fips}` : 'sourcelang:eng';
                console.warn('GDELT primary failed, retrying simpler query:', errPrimary?.message);
                items = await fetchGdelt(fallback);
            }
            e.items = items;
            e.fetchedAt = now;
        } catch (err) {
            e.error = err.message || 'offline';
        } finally {
            e.loading = false;
            render();
            // Poke the top ticker when the default world-wire finishes fetching
            // so the headlines appear as soon as they land.
            if (section === 'wire' && locId === 'world' && typeof Ticker !== 'undefined') {
                try { Ticker.refresh(); } catch (_) {}
            }
        }
    }

    async function ensureTrending() {
        const e = terraCache.trending;
        const now = Date.now();
        if (e.loading) return;
        if (e.fetchedAt && now - e.fetchedAt < 180000) return;
        e.loading = true; e.error = null;
        render();
        const results = await Promise.allSettled([
            fetchReddit('worldnews', 25),
            fetchReddit('geopolitics', 15),
            fetchReddit('popular', 15),
        ]);
        const combined = [];
        for (const r of results) if (r.status === 'fulfilled') combined.push(...r.value);
        if (combined.length === 0) {
            e.error = 'couldn\'t reach the social wire (Reddit rate-limit?)';
        }
        combined.sort((a,b) => (b.score||0) - (a.score||0));
        e.items = combined.slice(0, 60);
        e.fetchedAt = now;
        e.loading = false;
        render();
    }

    function conflictQuery(loc) {
        const conflict = '(war OR conflict OR military OR strike OR ceasefire OR missile OR invasion OR troops)';
        if (loc.id === 'world') return `${conflict} sourcelang:eng`;
        const base = locationQuery(loc).replace(/\s*sourcelang:eng\s*$/, '').trim();
        if (!base) return `${conflict} sourcelang:eng`;
        return `${base} ${conflict}`;
    }

    function decodeHtml(s) {
        const t = document.createElement('textarea');
        t.innerHTML = s || '';
        return t.value;
    }
    function parseGdeltTime(s) {
        if (!s || s.length < 15) return Date.now();
        const y = +s.slice(0,4), mo = +s.slice(4,6)-1, d = +s.slice(6,8);
        const h = +s.slice(9,11), mi = +s.slice(11,13), sec = +s.slice(13,15);
        return Date.UTC(y, mo, d, h, mi, sec);
    }
    function timeAgo(t) {
        const diff = Math.max(0, Date.now() - t);
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return m + 'm ago';
        const h = Math.floor(m / 60);
        if (h < 24) return h + 'h ago';
        return Math.floor(h / 24) + 'd ago';
    }
    function nowStampFor(cid) {
        const c = COUNTRIES[cid]; if (!c) return '';
        const d = new Date();
        const utcH = d.getUTCHours() + d.getUTCMinutes()/60;
        const lh = ((utcH + c.tz) % 24 + 24) % 24;
        const h = Math.floor(lh);
        const m = Math.floor((lh - h) * 60);
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function init(worldRef) {
        world = worldRef;
        // The procedural sandbox news generator is gone. The site is now
        // strictly the live wire (Gaia) plus the history explorer.
    }

    function tick(_dt) { /* no-op — live data refreshes on its own timer */ }


    function render() {
        const modal = document.getElementById('newsModal');
        if (!modal || modal.classList.contains('hidden')) return;

        // Sync world attribute on modal (drives per-world CSS visibility).
        modal.dataset.world = world_tab;
        modal.dataset.section = terraActiveSection;

        // Swap visible tab/chip groups
        syncTabsUI();

        // Rebuild the country chip bar when Terra wire/frontline is active, so
        // search input changes filter the country list live.
        if (world_tab === 'terra' && (terraActiveSection === 'wire' || terraActiveSection === 'frontline')) {
            ensureLocChipBar();
        }

        if (world_tab === 'terra' && terraActiveSection === 'tv') {
            renderTv();
            return;
        }

        const panel = document.getElementById('newsList');
        if (!panel) return;

        // Always live (Terra) — the procedural feed is gone.
        return renderTerraList(panel);
    }

    function renderTerraList(panel) {
        const q = document.getElementById('newsSearch')?.value?.trim().toLowerCase() || '';
        let entry;
        if (terraActiveSection === 'trending') entry = terraCache.trending;
        else entry = terraCache[terraActiveSection]?.[terraActiveLocation];

        // First-load state: no cached items yet
        if (!entry || (entry.loading && (!entry.items || entry.items.length === 0))) {
            panel.innerHTML = '<li class="news-loading">📡 tuning into the live wire…</li>';
            return;
        }
        if (entry.error && (!entry.items || entry.items.length === 0)) {
            panel.innerHTML = `<li class="news-error">${entry.error}. <button class="news-retry">retry</button></li>`;
            panel.querySelector('.news-retry')?.addEventListener('click', () => {
                if (terraActiveSection === 'trending') ensureTrending();
                else {
                    if (terraCache[terraActiveSection][terraActiveLocation]) terraCache[terraActiveSection][terraActiveLocation].fetchedAt = 0;
                    ensureTerraData(terraActiveSection, terraActiveLocation);
                }
            });
            return;
        }
        const list = (entry.items || []).filter(it => !q || it.text.toLowerCase().includes(q));
        if (list.length === 0) { panel.innerHTML = '<li class="news-empty">nothing on the wire matches.</li>'; return; }
        const frag = document.createDocumentFragment();
        for (const it of list.slice(0, 80)) frag.appendChild(renderTerraItem(it));
        panel.innerHTML = '';
        panel.appendChild(frag);
    }

    function renderTerraItem(it) {
        const li = document.createElement('li');
        li.className = 'news-item terra-item';
        const flag = it.cid ? flagEmoji(it.cid) : '🌐';
        const label = it.domain || (it.cid && COUNTRIES[it.cid]?.name) || 'Earth';
        li.innerHTML = `
            <div class="news-head">
                <span class="news-flag">${flag}</span>
                <span class="news-city">${escapeHtml(label)}</span>
                <span class="news-stamp">${timeAgo(it.time)}</span>
            </div>
            <div class="news-body">${escapeHtml(it.text)}</div>
        `;
        if (it.url) {
            li.addEventListener('click', () => window.open(it.url, '_blank', 'noopener,noreferrer'));
        }
        return li;
    }

    function escapeHtml(s) {
        const t = document.createElement('div');
        t.textContent = s == null ? '' : String(s);
        return t.innerHTML;
    }

    function renderTv() {
        const stage = document.getElementById('tvStage');
        const grid  = document.getElementById('tvGrid');
        if (!stage || !grid) return;
        if (!terraActiveChannel) terraActiveChannel = TV_CHANNELS[0];
        let frame = document.getElementById('tvFrame');
        const desired = `https://www.youtube.com/embed/live_stream?channel=${terraActiveChannel.id}&autoplay=1&mute=1`;
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = 'tvFrame';
            frame.allow = 'autoplay; encrypted-media; picture-in-picture';
            frame.setAttribute('allowfullscreen', '');
            frame.referrerPolicy = 'no-referrer-when-downgrade';
            stage.querySelector('.tv-frame-wrap')?.appendChild(frame);
        }
        if (frame.src !== desired) frame.src = desired;
        const nameEl = document.getElementById('tvNowName');
        if (nameEl) nameEl.textContent = `${terraActiveChannel.flag} ${terraActiveChannel.name} · ${terraActiveChannel.home}`;
        // build channel grid lazily
        if (grid.childElementCount !== TV_CHANNELS.length) {
            grid.innerHTML = '';
            for (const ch of TV_CHANNELS) {
                const b = document.createElement('button');
                b.className = 'tv-ch';
                b.dataset.id = ch.id;
                b.innerHTML = `<span class="tv-ch-flag">${ch.flag}</span><span class="tv-ch-name">${ch.name}</span>`;
                b.addEventListener('click', () => { terraActiveChannel = ch; renderTv(); });
                grid.appendChild(b);
            }
        }
        for (const child of grid.children) {
            child.classList.toggle('active', child.dataset.id === terraActiveChannel.id);
        }
    }

    function stopTv() {
        const f = document.getElementById('tvFrame');
        if (f) f.src = 'about:blank';
    }

    function syncTabsUI() {
        // Show Gaia tabs vs Terra sections based on world
        const gaiaTabs  = document.querySelectorAll('.news-tab.gaia-tab');
        const terraTabs = document.querySelectorAll('.news-tab.terra-tab');
        gaiaTabs.forEach(t => t.style.display  = world_tab === 'gaia'  ? '' : 'none');
        terraTabs.forEach(t => t.style.display = world_tab === 'terra' ? '' : 'none');
        // Active section marker for Terra
        terraTabs.forEach(t => t.classList.toggle('active', t.dataset.section === terraActiveSection));
        // Location chip bar visible only for wire/frontline
        const chipBar = document.getElementById('newsLocBar');
        if (chipBar) chipBar.style.display =
            (world_tab === 'terra' && (terraActiveSection === 'wire' || terraActiveSection === 'frontline')) ? 'flex' : 'none';
        // TV stage visibility
        const stage = document.getElementById('tvStage');
        const list  = document.getElementById('newsList');
        if (stage && list) {
            const showTv = world_tab === 'terra' && terraActiveSection === 'tv';
            stage.style.display = showTv ? 'flex' : 'none';
            list.style.display  = showTv ? 'none' : '';
            if (!showTv) stopTv();
        }
        // Location chip highlight
        document.querySelectorAll('.news-loc-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.loc === terraActiveLocation);
        });
    }

    function open() {
        const m = document.getElementById('newsModal');
        if (m) m.classList.remove('hidden');
        render();
    }
    function close() {
        document.getElementById('newsModal')?.classList.add('hidden');
        stopTv();
    }

    function setTab(cat) {
        // Gaia category tab
        document.querySelectorAll('.news-tab.gaia-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.cat === cat);
        });
        render();
    }

    function setWorld(w) {
        world_tab = w === 'terra' ? 'terra' : 'gaia';
        document.querySelectorAll('.news-world').forEach(t => {
            t.classList.toggle('active', t.dataset.world === world_tab);
        });
        const modal = document.getElementById('newsModal');
        if (modal) modal.dataset.world = world_tab;
        if (world_tab === 'terra') {
            ensureLocChipBar();
            // kick off a fetch if needed
            if (terraActiveSection !== 'tv' && terraActiveSection !== 'trending')
                ensureTerraData(terraActiveSection, terraActiveLocation);
            if (terraActiveSection === 'trending') ensureTrending();
        }
        render();
    }

    function setSection(section) {
        terraActiveSection = section;
        if (section === 'wire' || section === 'frontline') ensureTerraData(section, terraActiveLocation);
        if (section === 'trending') ensureTrending();
        render();
    }

    function setLocation(locId) {
        terraActiveLocation = locId;
        if (terraActiveSection === 'wire' || terraActiveSection === 'frontline')
            ensureTerraData(terraActiveSection, locId);
        render();
    }

    function setTvChannel(chId) {
        const ch = TV_CHANNELS.find(c => c.id === chId);
        if (ch) { terraActiveChannel = ch; renderTv(); }
    }

    /* Build the country chip bar with World first, the rest alphabetically.
       When the user types into the search box we re-filter the chips so only
       the matching countries remain visible — easy to isolate e.g. Denmark. */
    function ensureLocChipBar() {
        const bar = document.getElementById('newsLocBar');
        if (!bar) return;
        const q = (document.getElementById('newsSearch')?.value || '').trim().toLowerCase();
        bar.innerHTML = '';
        // World always first
        const world = TERRA_LOCATIONS.find(l => l.id === 'world');
        const rest  = TERRA_LOCATIONS.filter(l => l.id !== 'world')
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
        const ordered = world ? [world, ...rest] : rest;
        const matches = ordered.filter(loc => !q || loc.name.toLowerCase().includes(q));
        // If there's a query and only one match, auto-select it.
        if (q && matches.length === 1 && matches[0].id !== terraActiveLocation) {
            setLocation(matches[0].id);
        }
        for (const loc of matches) {
            const b = document.createElement('button');
            b.className = 'news-loc-chip' + (loc.id === terraActiveLocation ? ' active' : '');
            b.dataset.loc = loc.id;
            b.innerHTML = `<span>${loc.flag}</span> <span>${escapeHtml(loc.name)}</span>`;
            b.addEventListener('click', () => setLocation(loc.id));
            bar.appendChild(b);
        }
        if (matches.length === 0) {
            const hint = document.createElement('span');
            hint.className = 'news-loc-empty';
            hint.textContent = 'no matching country';
            bar.appendChild(hint);
        }
    }

    function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    /* Live headlines (GDELT wire for the world view) — used by the top ticker
       when the site is in Gaia (live) mode. Returns up to N items, most
       recent first. Falls back to an empty list if nothing fetched yet. */
    function getLiveHeadlines(n) {
        const wire = terraCache.wire?.['world'];
        if (!wire || !wire.items) return [];
        return wire.items.slice(0, n || 20);
    }

    return { init, tick, open, close, setTab, setWorld, setSection, setLocation, setTvChannel, render, getLiveHeadlines };
})();
