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
