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
    const TEMPLATES = [
        // --- MARKETS / ECONOMICS ---
        c => c.state.econ > 0.7 ? `${c.capital} — ${c.a2} markets notch fresh highs as tech and industry rally.` : null,
        c => c.state.econ < 0.3 ? `${c.capital} — ${c.country.name}'s central bank signals emergency measures as markets slide.` : null,
        c => c.state.econ > 0.8 ? `${c.capital} — foreign investors pile in as confidence in ${c.country.name} hits a record.` : null,
        c => c.state.econ > 0.6 ? `${c.capital} — ${random(['tech','finance','manufacturing','tourism','shipping'])} sector posts a strong quarter.` : null,
        c => c.state.econ < 0.4 ? `${c.capital} — unemployment rises as ${random(['factories','mines','ports','airports'])} scale back.` : null,
        c => `${c.capital} — ${c.country.name}'s currency trades at ${(0.7 + c.state.econ * 0.6).toFixed(3)} against the benchmark.`,

        // --- POLITICS / PEACE / CONFLICT ---
        c => c.state.peace > 0.75 ? `${c.capital} — ${c.country.name} opens a new cultural exchange with neighbors.` : null,
        c => c.state.peace < 0.3  ? `${c.capital} — protests swell in ${c.country.name}'s main squares as tensions rise.` : null,
        c => c.state.peace < 0.2  ? `${c.capital} — state of emergency declared across ${c.country.name}.` : null,
        c => c.state.peace > 0.85 ? `${c.capital} — parliament passes landmark legislation with broad cross-party support.` : null,
        c => c.state.peace < 0.4  ? `${c.capital} — opposition calls for early elections.` : null,
        c => c.state.peace > 0.65 ? `${c.capital} — diplomats from ${c.country.name} mediate a regional dispute.` : null,

        // --- CULTURE / DAILY LIFE ---
        c => c.localHour >= 5 && c.localHour < 10  ? `${c.capital} — rush-hour commuters pack the metro under a ${c.state.climate > 0.5 ? 'clear' : 'grey'} sky.` : null,
        c => c.localHour >= 11 && c.localHour < 14 ? `${c.capital} — lunch-hour crowds spill into ${random(['cafés','food courts','plazas','street markets'])}.` : null,
        c => c.localHour >= 18 && c.localHour < 22 ? `${c.capital} — nightlife lights up the ${random(['old town','riverfront','main boulevard','harbor'])}.` : null,
        c => c.localHour >= 22 || c.localHour < 4  ? `${c.capital} — city sleeps; only ${random(['taxis','delivery scooters','night-shift crews','street cleaners'])} moving.` : null,
        c => c.state.happy > 0.75 ? `${c.capital} — national mood survey puts happiness at a multi-year high.` : null,
        c => c.state.happy < 0.3  ? `${c.capital} — mental-health charities report a surge in calls.` : null,
        c => `${c.capital} — ${c.culture.name} ${random(['poets','filmmakers','musicians','chefs','designers'])} unveil a new ${random(['festival','series','exhibition','collection','tour'])}.`,
        c => `${c.capital} — ${c.country.name}'s ${random(['football','cricket','basketball','handball','rugby'])} team ${random(['wins an upset','draws 1-1','tops the league','signs a new coach','heads into finals'])}.`,

        // --- SCIENCE / TECHNOLOGY ---
        c => c.state.econ > 0.7 ? `${c.capital} — researchers at a ${c.country.name} university publish breakthrough in ${random(['quantum','materials','AI','genomics','fusion','robotics','biotech'])}.` : null,
        c => c.state.econ > 0.65 ? `${c.capital} — ${c.country.name} satellite ${random(['launches','docks','begins operations','transmits first images'])}.` : null,
        c => c.state.econ > 0.6 ? `${c.capital} — a ${c.country.name}-based startup closes a ${random(['Series A','Series B','Series C','mega-round'])} at ${Math.floor(20 + Math.random()*400)}M.` : null,

        // --- HEALTH / CLIMATE ---
        c => c.state.health < 0.4 ? `${c.capital} — hospitals in ${c.country.name} stretched as ${random(['respiratory illnesses','heat-related cases','food-borne outbreaks'])} spike.` : null,
        c => c.state.health > 0.8 ? `${c.capital} — ${c.country.name} posts record life-expectancy gains.` : null,
        c => c.state.climate < 0.3 ? `${c.capital} — air quality alert issued; residents advised to stay indoors.` : null,
        c => c.state.climate < 0.35 ? `${c.capital} — reservoirs across ${c.country.name} hit historic lows.` : null,
        c => c.state.climate > 0.75 ? `${c.capital} — green corridors expand as ${c.country.name} hits climate targets early.` : null,

        // --- TRENDING / SOCIAL ---
        c => `${c.capital} — #${random(['CapitalSunset','MondayMood','LocalEats','NightDrive','Rooftops','MorningRun','SubwayLife','StreetArt','OneMoreSong','GoodNewsDay'])} is trending on ${c.country.name}'s social feeds.`,
        c => `${c.capital} — viral clip of ${random(['a dancing grandmother','a chess-playing cat','a rooftop violinist','an old-town busker','a fire-juggling monk'])} racks up millions of views.`,
        c => `${c.capital} — ${random(['bakery','bookshop','noodle stall','vinyl store','arcade'])} in the old quarter goes viral.`,

        // --- TRAVEL / TOURISM ---
        c => c.state.peace > 0.6 && c.state.econ > 0.5 ? `${c.capital} — ${c.country.name} sees record tourist arrivals this ${random(['quarter','season','month'])}.` : null,
        c => c.state.peace < 0.4 ? `${c.capital} — several embassies issue travel advisories for ${c.country.name}.` : null,

        // --- CULTURAL (culture-driven) ---
        c => `${c.capital} — ${c.culture.signature} ${random(['tea shops','coffee houses','night markets','corner stores','bathhouses'])} see brisk business.`,

        // --- LOCAL TIME FLAVOR ---
        c => c.localHour === 12 ? `${c.capital} — church / mosque / temple bells mark noon across ${c.country.name}.` : null,
        c => c.localHour === 6  ? `${c.capital} — the ${c.country.name} dawn service goes live; birds outside the studio.` : null,
        c => c.localHour === 0  ? `${c.capital} — fireworks for no reason at midnight; no one complains.` : null,
    ];

    const EVENT_HEADLINES = {
        earthquake: c => `BREAKING — ${c.capital}: seismographs just jolted across ${c.country.name}. Aftershocks expected.`,
        tsunami:    c => `BREAKING — ${c.capital}: coastal alerts sound, ${c.country.name} evacuates low-lying districts.`,
        volcano:    c => `BREAKING — ${c.capital}: ash column rises over ${c.country.name}; flights rerouted.`,
        flood:      c => `BREAKING — ${c.capital}: rivers break their banks across ${c.country.name}.`,
        drought:    c => `${c.capital}: ${c.country.name}'s farmers call on the government as drought deepens.`,
        hurricane:  c => `BREAKING — ${c.capital}: ${c.country.name} braces as the storm makes landfall.`,
        tornado:    c => `BREAKING — ${c.capital}: tornado warning across ${c.country.name}.`,
        wildfire:   c => `BREAKING — ${c.capital}: smoke blankets ${c.country.name} as crews battle flames.`,
        blizzard:   c => `${c.capital}: ${c.country.name} shuts down as a blizzard buries roads.`,
        storm:      c => `${c.capital}: severe weather warnings across ${c.country.name}.`,
        meteor:     c => `UNCONFIRMED — ${c.capital}: streak of fire reported over ${c.country.name}.`,
        prosperity: c => `${c.capital}: ${c.country.name}'s markets lead the region — optimism at multi-year highs.`,
        peace:      c => `${c.capital}: peace deal signed — ${c.country.name} lifts restrictions.`,
        healing:    c => `${c.capital}: ${c.country.name} health ministry reports steep drop in cases.`,
        miracle:    c => `${c.capital}: "miraculous" event in ${c.country.name} draws scholars and pilgrims.`,
        festival:   c => `LIVE — ${c.capital}: ${c.country.name}'s streets are packed for the festival.`,
        harvest:    c => `${c.capital}: ${c.country.name}'s farmers report a record harvest.`,
        innovation: c => `${c.capital}: ${c.country.name} researchers announce a breakthrough.`,
        baby_boom:  c => `${c.capital}: ${c.country.name}'s hospitals report a sharp rise in births.`,
        war:        c => `BREAKING — ${c.capital}: ${c.country.name} is at war.`,
        revolution: c => `BREAKING — ${c.capital}: crowds pour into ${c.country.name}'s central square.`,
        protest:    c => `${c.capital}: ${c.country.name} sees its largest protest in a generation.`,
        migration:  c => `${c.capital}: ${c.country.name} braces for a wave of arrivals.`,
        plague:     c => `BREAKING — ${c.capital}: ${c.country.name}'s health system battles a fast-moving outbreak.`,
        aurora:     c => `${c.capital}: skies above ${c.country.name} turn green and purple — aurora alert.`,
        eclipse:    c => `${c.capital}: eclipse passes over ${c.country.name}; crowds gather to watch.`,
        ufo:        c => `UNCONFIRMED — ${c.capital}: multiple ${c.country.name} residents film an unidentified craft.`,
        zombies:    c => `${c.capital}: ${c.country.name} issues containment orders amid an unexplained outbreak.`,
        dragons:    c => `${c.capital}: enormous winged shapes photographed over ${c.country.name}. Experts baffled.`,
        dance:      c => `LIVE — ${c.capital}: impromptu street dance erupts across ${c.country.name}.`,
    };

    const CATEGORIES = {
        breaking:  item => item.priority >= 0.85,
        politics:  item => /parliament|elections|peace|war|protest|revolution|embass|emergency|opposition/i.test(item.text),
        markets:   item => /market|currency|investors|sector|unemployment|startup|M\b|quarter/i.test(item.text),
        culture:   item => /festival|musicians|chefs|designers|filmmakers|viral|trend|bakery|bookshop/i.test(item.text),
        science:   item => /research|satellite|breakthrough|quantum|AI|genomics|fusion/i.test(item.text),
        climate:   item => /climate|air quality|reservoirs|drought|heat|storm|aurora|eclipse/i.test(item.text),
        life:      item => /commuters|lunch|nightlife|metro|midnight|dawn|birds|bells|rooftop/i.test(item.text),
        sports:    item => /football|cricket|basketball|handball|rugby|league|finals|coach/i.test(item.text),
    };

    const items = [];          // Gaia feed — live from simulation
    const MAX_ITEMS = 220;
    let lastRefresh = 0;
    let world_tab = 'gaia';    // 'gaia' | 'terra'

    /* Terra = baseline real-world dispatches. These are curated
       headlines reflecting the actual state of Earth in April 2026.
       Independent of sim time, so you always see "home" when you
       want a break from your own cataclysms. */
    const TERRA_ITEMS = [
        // breaking-ish global axes
        { cid:'840', tag:'politics', text:"Washington — U.S. election-season noise dominates cable news, with immigration and inflation the dominant themes." },
        { cid:'804', tag:'politics', text:"Kyiv — Ukrainian forces hold the line along the Dnipro; Western aid packages debated in capitals." },
        { cid:'643', tag:'politics', text:"Moscow — Kremlin briefings insist the 'special operation' remains on schedule as sanctions bite." },
        { cid:'376', tag:'politics', text:"Jerusalem — fragile ceasefire holds across parts of Gaza; hostages, reconstruction, and a two-state future dominate talks." },
        { cid:'156', tag:'politics', text:"Beijing — Politburo signals steady growth targets; property sector still the big unknown." },
        { cid:'356', tag:'politics', text:"New Delhi — India pushes past 1.44 billion people; coalition politics dominate the legislative agenda." },
        { cid:'826', tag:'politics', text:"London — Labour government juggles NHS reform and housing pressures." },
        { cid:'250', tag:'politics', text:"Paris — legislative deadlock continues; pension reform debates flare." },
        { cid:'276', tag:'politics', text:"Berlin — coalition tensions over defense budgets and energy policy." },
        { cid:'392', tag:'politics', text:"Tokyo — LDP factions jockey ahead of a summer election." },
        { cid:'076', tag:'politics', text:"Brasília — Amazon protections debated as deforestation figures drop but remain high." },

        // markets / economy
        { cid:'840', tag:'markets', text:"New York — S&P nudges record territory as AI megacaps lift the index." },
        { cid:'392', tag:'markets', text:"Tokyo — Nikkei tests 40,000 amid a weaker yen." },
        { cid:'156', tag:'markets', text:"Shanghai — consumer confidence soft; property developers issue new bonds." },
        { cid:'276', tag:'markets', text:"Frankfurt — ECB maintains cautious rate path; core inflation easing." },
        { cid:'826', tag:'markets', text:"London — FTSE 100 hits fresh highs on commodity strength." },
        { cid:'724', tag:'markets', text:"Madrid — tourism surge drives a strong quarter for Spanish hoteliers." },
        { cid:'410', tag:'markets', text:"Seoul — chip exports rebound; Samsung and SK Hynix pace gains." },
        { cid:'784', tag:'markets', text:"Dubai — free-zone announcements push AI and fintech listings." },

        // science / tech
        { cid:'840', tag:'science', text:"San Francisco — next-gen foundation models push reasoning and multimodal benchmarks higher." },
        { cid:'156', tag:'science', text:"Hefei — Chinese team reports record-duration plasma in a fusion tokamak." },
        { cid:'826', tag:'science', text:"Cambridge — DeepMind paper claims progress on protein design beyond AlphaFold." },
        { cid:'392', tag:'science', text:"Tsukuba — Japanese humanoid robot completes a multi-hour factory shift autonomously." },
        { cid:'356', tag:'science', text:"Bengaluru — ISRO readies next Chandrayaan mission; Gaganyaan crewed tests continue." },
        { cid:'250', tag:'science', text:"Paris — European fusion consortium hits milestone on net-energy pathway." },
        { cid:'840', tag:'science', text:"Hawthorne — SpaceX Starship program eyes the next full-stack orbital attempt." },

        // climate
        { cid:'036', tag:'climate', text:"Canberra — record marine heatwave bleaches more of the Great Barrier Reef." },
        { cid:'076', tag:'climate', text:"Brasília — Amazon rainfall erratic; scientists warn of tipping-point thresholds." },
        { cid:'840', tag:'climate', text:"Washington — NOAA confirms another year among the warmest on record." },
        { cid:'826', tag:'climate', text:"London — Thames Barrier closures break long-term averages." },
        { cid:'364', tag:'climate', text:"Tehran — heatwave pushes temperatures past 50°C across the Persian Gulf." },
        { cid:'352', tag:'climate', text:"Reykjavík — glacier retreats leave new lakes on maps." },
        { cid:'554', tag:'climate', text:"Wellington — Antarctic sea ice hits another record-low maximum." },

        // culture
        { cid:'410', tag:'culture', text:"Seoul — K-pop's fourth generation sells out global stadiums; HYBE posts another strong quarter." },
        { cid:'076', tag:'culture', text:"Rio de Janeiro — Carnaval returns at full scale; samba schools compete at the Sambódromo." },
        { cid:'380', tag:'culture', text:"Milan — Design Week draws the world; furniture and architecture take center stage." },
        { cid:'250', tag:'culture', text:"Paris — the louvre extends hours as a record number of visitors file past the Mona Lisa." },
        { cid:'356', tag:'culture', text:"Mumbai — Bollywood's biggest stars cross into global streaming dramas." },
        { cid:'392', tag:'culture', text:"Kyoto — cherry blossoms peak a few days early; parks overflow with visitors." },
        { cid:'484', tag:'culture', text:"Mexico City — Día de los Muertos celebrations draw millions downtown." },

        // sports
        { cid:'840', tag:'sports', text:"Los Angeles — LA28 Olympic venue plans finalize, with new events including flag football." },
        { cid:'250', tag:'sports', text:"Paris — clubs test VAR changes after a dramatic Champions League upset." },
        { cid:'032', tag:'sports', text:"Buenos Aires — Argentina's national team tunes up for Copa América." },
        { cid:'826', tag:'sports', text:"Manchester — Premier League title race goes down to the final matchday." },

        // life / daily
        { cid:'156', tag:'life', text:"Beijing — morning commute moves more than 10 million people through the metro." },
        { cid:'356', tag:'life', text:"Delhi — chai vendors set up across the capital's sidewalks as offices open." },
        { cid:'840', tag:'life', text:"Brooklyn — a new generation packs vinyl stores and film photography studios." },
        { cid:'392', tag:'life', text:"Tokyo — 24-hour conbini culture continues to fuel the city through midnight." },
        { cid:'032', tag:'life', text:"Buenos Aires — the mate thermos is everywhere as the afternoon unfolds." },
        { cid:'764', tag:'life', text:"Bangkok — night markets spill out across Ratchada and Chinatown." },
    ];

    function nowStampFor(cid) {
        const c = COUNTRIES[cid]; if (!c || !world) return '';
        const d = new Date();
        const utcH = d.getUTCHours() + d.getUTCMinutes()/60;
        const lh = ((utcH + c.tz) % 24 + 24) % 24;
        const h = Math.floor(lh);
        const m = Math.floor((lh - h) * 60);
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function init(worldRef) {
        world = worldRef;
        // seed with a first batch
        for (let i = 0; i < 36; i++) tickOnce(true);
        render();
    }

    /* Run every frame; actually emits a few items per second. */
    function tick(dt) {
        lastRefresh += dt;
        if (lastRefresh < 180) return;
        lastRefresh = 0;
        for (let i = 0; i < 3; i++) tickOnce(false);
        render();
    }

    function tickOnce(initial) {
        const ctx = sampleCountry();
        if (!ctx) return;
        let text = null;
        let priority = 0.4;
        if (ctx.event) {
            const fn = EVENT_HEADLINES[ctx.event.kind];
            if (fn) { text = fn(ctx); priority = 0.85 + Math.random()*0.15; }
        }
        if (!text) {
            const pool = TEMPLATES.slice().sort(() => Math.random() - 0.5);
            for (const fn of pool) {
                try { text = fn(ctx); } catch(e) { text = null; }
                if (text) break;
            }
        }
        if (!text) return;
        const stamp = formatLocalStamp(ctx);
        items.unshift({
            id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            text,
            priority,
            stamp,
            country: ctx.country,
            capital: ctx.capital,
            cid: ctx.cid,
            time: initial ? Date.now() - Math.random() * 9e5 : Date.now(),
        });
        if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
    }

    function sampleCountry() {
        // weight by population so bigger countries produce more news
        const ids = ALL_COUNTRY_IDS;
        let total = 0;
        const weights = ids.map(id => {
            const s = world.countryState[id];
            const w = s ? Math.sqrt(s.pop) + 0.4 : 0.4;
            total += w;
            return w;
        });
        let roll = Math.random() * total;
        let cid = ids[0];
        for (let i = 0; i < ids.length; i++) {
            roll -= weights[i];
            if (roll <= 0) { cid = ids[i]; break; }
        }
        const country = COUNTRIES[cid];
        if (!country) return null;
        const state = world.countryState[cid];
        const capital = CAPITALS[cid] || country.name;
        const culture = CULTURES[country.culture];
        const a2 = ISO_NUM_TO_A2[cid] || '';

        const utcH = world.clock.getUTCHours() + world.clock.getUTCMinutes()/60;
        let localHour = Math.floor(((utcH + country.tz) % 24 + 24) % 24);

        // Is there a live event in this country?
        let event = null;
        for (const ev of Events.active) {
            if (ev.targets && ev.targets.includes(cid)) { event = ev; break; }
        }

        return { cid, country, capital, culture, state, localHour, event, a2 };
    }

    function formatLocalStamp(ctx) {
        const utcH = world.clock.getUTCHours() + world.clock.getUTCMinutes()/60;
        const lh = ((utcH + ctx.country.tz) % 24 + 24) % 24;
        const h = Math.floor(lh);
        const m = Math.floor((lh - h) * 60);
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    /* Produce the unified feed for the active world-tab. */
    function currentFeed() {
        if (world_tab === 'terra') {
            return TERRA_ITEMS.map(it => {
                const country = COUNTRIES[it.cid] || { name: 'Earth', tz: 0 };
                const capital = CAPITALS[it.cid] || country.name;
                return {
                    id: 'terra_' + it.cid + '_' + it.text.slice(0, 20),
                    text: it.text,
                    country,
                    capital,
                    cid: it.cid,
                    stamp: nowStampFor(it.cid),
                    priority: /breaking|war|ceasefire|record/i.test(it.text) ? 0.9 : 0.6,
                    _tag: it.tag,
                };
            });
        }
        return items;
    }

    function render() {
        const panel = document.getElementById('newsList');
        if (!panel || panel.offsetParent === null) return; // invisible, skip
        const active = document.querySelector('.news-tab.active');
        const cat = active?.dataset.cat || 'all';
        const q = document.getElementById('newsSearch')?.value?.trim().toLowerCase() || '';
        const feed = currentFeed();
        const filter = cat === 'all' ? null :
            (item) => item._tag ? item._tag === cat : (CATEGORIES[cat] && CATEGORIES[cat](item));
        const frag = document.createDocumentFragment();
        let shown = 0;
        for (const item of feed) {
            if (filter && !filter(item)) continue;
            if (q) {
                const hay = (item.text + ' ' + (item.country?.name || '') + ' ' + (item.capital || '')).toLowerCase();
                if (!hay.includes(q)) continue;
            }
            if (shown >= 90) break;
            frag.appendChild(renderItem(item));
            shown++;
        }
        panel.innerHTML = '';
        panel.appendChild(frag);
        if (shown === 0) {
            panel.innerHTML = '<li class="news-empty">no dispatches match your filter.</li>';
        }
    }

    function renderItem(item) {
        const li = document.createElement('li');
        li.className = 'news-item' + (item.priority >= 0.85 ? ' breaking' : '');
        li.innerHTML = `
            <div class="news-head">
                <span class="news-flag">${flagEmoji(item.cid)}</span>
                <span class="news-city">${item.capital}</span>
                <span class="news-stamp">${item.stamp} local</span>
            </div>
            <div class="news-body">${item.text}</div>
        `;
        li.addEventListener('click', () => Main.travelTo && Main.travelTo(world.clock.getUTCFullYear()) && 0 /* no-op; expose hook later */ );
        return li;
    }

    function open() {
        const m = document.getElementById('newsModal');
        if (m) m.classList.remove('hidden');
        render();
    }
    function close() {
        document.getElementById('newsModal')?.classList.add('hidden');
    }

    function setTab(cat) {
        document.querySelectorAll('.news-tab').forEach(t => {
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
        render();
    }

    function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    return { init, tick, open, close, setTab, setWorld, render };
})();
