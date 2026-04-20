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

    /* ============================================================
       TERRA — LIVE. GDELT for articles (keyless, CORS-ok),
       Reddit r/worldnews for an extra trend signal, YouTube live
       embeds of real broadcast channels. Per-country filters so
       Denmark, Kenya, Peru, etc. all get their own feed.
       ============================================================ */

    // Curated location chips — 'world' + a useful spread of nations.
    // `q` is the GDELT query string: source country (FIPS) OR mentions
    // of the country name + capital + major cities.
    const TERRA_LOCATIONS = [
        { id:'world', name:'World', flag:'🌍', q:'sourcelang:eng' },
        { id:'840', name:'United States',   flag:'🇺🇸', q:'(sourcecountry:US OR "United States" OR "New York" OR Washington OR "Los Angeles" OR Chicago OR Boston) sourcelang:eng' },
        { id:'826', name:'United Kingdom',  flag:'🇬🇧', q:'(sourcecountry:UK OR Britain OR London OR Manchester OR Edinburgh) sourcelang:eng' },
        { id:'276', name:'Germany',         flag:'🇩🇪', q:'(sourcecountry:GM OR Germany OR Berlin OR Munich OR Hamburg OR Frankfurt) sourcelang:eng' },
        { id:'250', name:'France',          flag:'🇫🇷', q:'(sourcecountry:FR OR France OR Paris OR Lyon OR Marseille) sourcelang:eng' },
        { id:'380', name:'Italy',           flag:'🇮🇹', q:'(sourcecountry:IT OR Italy OR Rome OR Milan OR Naples) sourcelang:eng' },
        { id:'724', name:'Spain',           flag:'🇪🇸', q:'(sourcecountry:SP OR Spain OR Madrid OR Barcelona) sourcelang:eng' },
        { id:'620', name:'Portugal',        flag:'🇵🇹', q:'(sourcecountry:PO OR Portugal OR Lisbon OR Porto) sourcelang:eng' },
        { id:'528', name:'Netherlands',     flag:'🇳🇱', q:'(sourcecountry:NL OR Netherlands OR Amsterdam OR Rotterdam) sourcelang:eng' },
        { id:'056', name:'Belgium',         flag:'🇧🇪', q:'(sourcecountry:BE OR Belgium OR Brussels OR Antwerp) sourcelang:eng' },
        { id:'756', name:'Switzerland',     flag:'🇨🇭', q:'(sourcecountry:SZ OR Switzerland OR Zurich OR Geneva OR Bern) sourcelang:eng' },
        { id:'040', name:'Austria',         flag:'🇦🇹', q:'(sourcecountry:AU OR Austria OR Vienna) sourcelang:eng' },
        { id:'372', name:'Ireland',         flag:'🇮🇪', q:'(sourcecountry:EI OR Ireland OR Dublin) sourcelang:eng' },
        { id:'208', name:'Denmark',         flag:'🇩🇰', q:'(sourcecountry:DA OR Denmark OR Copenhagen OR Aarhus) sourcelang:eng' },
        { id:'578', name:'Norway',          flag:'🇳🇴', q:'(sourcecountry:NO OR Norway OR Oslo OR Bergen) sourcelang:eng' },
        { id:'752', name:'Sweden',          flag:'🇸🇪', q:'(sourcecountry:SW OR Sweden OR Stockholm OR Gothenburg) sourcelang:eng' },
        { id:'246', name:'Finland',         flag:'🇫🇮', q:'(sourcecountry:FI OR Finland OR Helsinki) sourcelang:eng' },
        { id:'352', name:'Iceland',         flag:'🇮🇸', q:'(sourcecountry:IC OR Iceland OR Reykjavik) sourcelang:eng' },
        { id:'616', name:'Poland',          flag:'🇵🇱', q:'(sourcecountry:PL OR Poland OR Warsaw OR Krakow) sourcelang:eng' },
        { id:'203', name:'Czechia',         flag:'🇨🇿', q:'(sourcecountry:EZ OR Czech OR Prague) sourcelang:eng' },
        { id:'348', name:'Hungary',         flag:'🇭🇺', q:'(sourcecountry:HU OR Hungary OR Budapest) sourcelang:eng' },
        { id:'300', name:'Greece',          flag:'🇬🇷', q:'(sourcecountry:GR OR Greece OR Athens) sourcelang:eng' },
        { id:'792', name:'Turkey',          flag:'🇹🇷', q:'(sourcecountry:TU OR Turkey OR Istanbul OR Ankara) sourcelang:eng' },
        { id:'643', name:'Russia',          flag:'🇷🇺', q:'(sourcecountry:RS OR Russia OR Moscow OR "Saint Petersburg") sourcelang:eng' },
        { id:'804', name:'Ukraine',         flag:'🇺🇦', q:'(sourcecountry:UP OR Ukraine OR Kyiv OR Kharkiv OR Lviv OR Odesa) sourcelang:eng' },
        { id:'124', name:'Canada',          flag:'🇨🇦', q:'(sourcecountry:CA OR Canada OR Toronto OR Vancouver OR Montreal) sourcelang:eng' },
        { id:'484', name:'Mexico',          flag:'🇲🇽', q:'(sourcecountry:MX OR Mexico OR "Mexico City" OR Guadalajara) sourcelang:eng' },
        { id:'076', name:'Brazil',          flag:'🇧🇷', q:'(sourcecountry:BR OR Brazil OR "São Paulo" OR "Rio de Janeiro" OR Brasilia) sourcelang:eng' },
        { id:'032', name:'Argentina',       flag:'🇦🇷', q:'(sourcecountry:AR OR Argentina OR "Buenos Aires") sourcelang:eng' },
        { id:'152', name:'Chile',           flag:'🇨🇱', q:'(sourcecountry:CI OR Chile OR Santiago) sourcelang:eng' },
        { id:'170', name:'Colombia',        flag:'🇨🇴', q:'(sourcecountry:CO OR Colombia OR Bogota) sourcelang:eng' },
        { id:'604', name:'Peru',            flag:'🇵🇪', q:'(sourcecountry:PE OR Peru OR Lima) sourcelang:eng' },
        { id:'862', name:'Venezuela',       flag:'🇻🇪', q:'(sourcecountry:VE OR Venezuela OR Caracas) sourcelang:eng' },
        { id:'156', name:'China',           flag:'🇨🇳', q:'(sourcecountry:CH OR China OR Beijing OR Shanghai OR "Hong Kong" OR Shenzhen) sourcelang:eng' },
        { id:'392', name:'Japan',           flag:'🇯🇵', q:'(sourcecountry:JA OR Japan OR Tokyo OR Osaka OR Kyoto) sourcelang:eng' },
        { id:'410', name:'South Korea',     flag:'🇰🇷', q:'(sourcecountry:KS OR "South Korea" OR Seoul OR Busan) sourcelang:eng' },
        { id:'408', name:'North Korea',     flag:'🇰🇵', q:'("North Korea" OR Pyongyang OR "Kim Jong") sourcelang:eng' },
        { id:'158', name:'Taiwan',          flag:'🇹🇼', q:'(sourcecountry:TW OR Taiwan OR Taipei) sourcelang:eng' },
        { id:'356', name:'India',           flag:'🇮🇳', q:'(sourcecountry:IN OR India OR Mumbai OR Delhi OR Bengaluru OR Chennai OR Kolkata) sourcelang:eng' },
        { id:'586', name:'Pakistan',        flag:'🇵🇰', q:'(sourcecountry:PK OR Pakistan OR Karachi OR Islamabad OR Lahore) sourcelang:eng' },
        { id:'050', name:'Bangladesh',      flag:'🇧🇩', q:'(sourcecountry:BG OR Bangladesh OR Dhaka) sourcelang:eng' },
        { id:'360', name:'Indonesia',       flag:'🇮🇩', q:'(sourcecountry:ID OR Indonesia OR Jakarta OR Bali) sourcelang:eng' },
        { id:'608', name:'Philippines',     flag:'🇵🇭', q:'(sourcecountry:RP OR Philippines OR Manila) sourcelang:eng' },
        { id:'764', name:'Thailand',        flag:'🇹🇭', q:'(sourcecountry:TH OR Thailand OR Bangkok) sourcelang:eng' },
        { id:'704', name:'Vietnam',         flag:'🇻🇳', q:'(sourcecountry:VM OR Vietnam OR Hanoi OR "Ho Chi Minh") sourcelang:eng' },
        { id:'458', name:'Malaysia',        flag:'🇲🇾', q:'(sourcecountry:MY OR Malaysia OR "Kuala Lumpur") sourcelang:eng' },
        { id:'702', name:'Singapore',       flag:'🇸🇬', q:'(sourcecountry:SN OR Singapore) sourcelang:eng' },
        { id:'036', name:'Australia',       flag:'🇦🇺', q:'(sourcecountry:AS OR Australia OR Sydney OR Melbourne OR Brisbane) sourcelang:eng' },
        { id:'554', name:'New Zealand',     flag:'🇳🇿', q:'(sourcecountry:NZ OR "New Zealand" OR Auckland OR Wellington) sourcelang:eng' },
        { id:'818', name:'Egypt',           flag:'🇪🇬', q:'(sourcecountry:EG OR Egypt OR Cairo) sourcelang:eng' },
        { id:'682', name:'Saudi Arabia',    flag:'🇸🇦', q:'(sourcecountry:SA OR "Saudi Arabia" OR Riyadh OR Jeddah) sourcelang:eng' },
        { id:'784', name:'UAE',             flag:'🇦🇪', q:'(sourcecountry:AE OR Emirates OR Dubai OR "Abu Dhabi") sourcelang:eng' },
        { id:'376', name:'Israel',          flag:'🇮🇱', q:'(sourcecountry:IS OR Israel OR Jerusalem OR "Tel Aviv") sourcelang:eng' },
        { id:'364', name:'Iran',            flag:'🇮🇷', q:'(sourcecountry:IR OR Iran OR Tehran) sourcelang:eng' },
        { id:'368', name:'Iraq',            flag:'🇮🇶', q:'(sourcecountry:IZ OR Iraq OR Baghdad) sourcelang:eng' },
        { id:'710', name:'South Africa',    flag:'🇿🇦', q:'(sourcecountry:SF OR "South Africa" OR Johannesburg OR "Cape Town") sourcelang:eng' },
        { id:'566', name:'Nigeria',         flag:'🇳🇬', q:'(sourcecountry:NI OR Nigeria OR Lagos OR Abuja) sourcelang:eng' },
        { id:'404', name:'Kenya',           flag:'🇰🇪', q:'(sourcecountry:KE OR Kenya OR Nairobi) sourcelang:eng' },
        { id:'231', name:'Ethiopia',        flag:'🇪🇹', q:'(sourcecountry:ET OR Ethiopia OR "Addis Ababa") sourcelang:eng' },
        { id:'504', name:'Morocco',         flag:'🇲🇦', q:'(sourcecountry:MO OR Morocco OR Rabat OR Casablanca) sourcelang:eng' },
    ];

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
            const q = section === 'frontline'
                ? conflictQuery(loc)
                : loc.q;
            e.items = await fetchGdelt(q);
            e.fetchedAt = now;
        } catch (err) {
            e.error = err.message || 'offline';
        } finally {
            e.loading = false;
            render();
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
        const conflict = '(war OR conflict OR military OR strike OR attack OR ceasefire OR offensive OR missile OR drone OR invasion OR troops OR siege OR sanction)';
        const base = (loc.q || '').replace(/\s*sourcelang:eng\s*$/, '').trim();
        if (!base) return `${conflict} sourcelang:eng`;
        return `${base} ${conflict} sourcelang:eng`;
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
        // seed with a first batch
        for (let i = 0; i < 36; i++) tickOnce(true);
        render();
    }

    /* Run every frame; actually emits a few items per second. Only
       re-renders when the Gaia world is visible — Terra doesn't mutate
       every 180ms. */
    function tick(dt) {
        lastRefresh += dt;
        if (lastRefresh < 180) return;
        lastRefresh = 0;
        for (let i = 0; i < 3; i++) tickOnce(false);
        if (world_tab === 'gaia') render();
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

    function render() {
        const modal = document.getElementById('newsModal');
        if (!modal || modal.classList.contains('hidden')) return;

        // Sync world attribute on modal (drives per-world CSS visibility).
        modal.dataset.world = world_tab;
        modal.dataset.section = terraActiveSection;

        // Swap visible tab/chip groups
        syncTabsUI();

        if (world_tab === 'terra' && terraActiveSection === 'tv') {
            renderTv();
            return;
        }

        const panel = document.getElementById('newsList');
        if (!panel) return;

        if (world_tab === 'terra') {
            return renderTerraList(panel);
        }

        // GAIA
        const active = document.querySelector('.news-tab.gaia-tab.active');
        const cat = active?.dataset.cat || 'all';
        const q = document.getElementById('newsSearch')?.value?.trim().toLowerCase() || '';
        const filter = cat === 'all' ? null :
            (item) => (CATEGORIES[cat] && CATEGORIES[cat](item));
        const frag = document.createDocumentFragment();
        let shown = 0;
        for (const item of items) {
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
        if (shown === 0) panel.innerHTML = '<li class="news-empty">no dispatches match your filter.</li>';
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

    /* Build the country chip bar once; then only `syncTabsUI` updates the
       active highlight. */
    function ensureLocChipBar() {
        const bar = document.getElementById('newsLocBar');
        if (!bar || bar.childElementCount > 0) return;
        for (const loc of TERRA_LOCATIONS) {
            const b = document.createElement('button');
            b.className = 'news-loc-chip';
            b.dataset.loc = loc.id;
            b.innerHTML = `<span>${loc.flag}</span> <span>${loc.name}</span>`;
            b.addEventListener('click', () => setLocation(loc.id));
            bar.appendChild(b);
        }
    }

    function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    return { init, tick, open, close, setTab, setWorld, setSection, setLocation, setTvChannel, render };
})();
