/* =========================================================
   parser.js — natural-language parser that turns free-form
   text prompts into simulation actions (events).
   No server; fully rule-based with rich keyword coverage.
   ========================================================= */

const EVENT_LIB = {
    // --- Natural disasters (negative) ---
    earthquake:  { kind:'earthquake',  severity:0.7, mood:'bad',  duration:15, label:'Earthquake',    emoji:'🌐', shake:true,  keywords:['earthquake','quake','tremor','seismic'] },
    tsunami:     { kind:'tsunami',     severity:0.8, mood:'bad',  duration:20, label:'Tsunami',       emoji:'🌊', shake:true,  keywords:['tsunami','tidal wave'] },
    volcano:     { kind:'volcano',     severity:0.7, mood:'bad',  duration:25, label:'Volcanic eruption', emoji:'🌋', shake:true, keywords:['volcano','volcanic','eruption','lava','magma'] },
    flood:       { kind:'flood',       severity:0.5, mood:'bad',  duration:30, label:'Flooding',      emoji:'🌧', keywords:['flood','flooding','deluge'] },
    drought:     { kind:'drought',     severity:0.5, mood:'bad',  duration:60, label:'Drought',       emoji:'🏜', keywords:['drought','dry spell','parched'] },
    hurricane:   { kind:'hurricane',   severity:0.7, mood:'bad',  duration:20, label:'Hurricane',     emoji:'🌀', shake:true,  keywords:['hurricane','typhoon','cyclone','storm surge'] },
    tornado:     { kind:'tornado',     severity:0.6, mood:'bad',  duration:10, label:'Tornado',       emoji:'🌪', keywords:['tornado','twister'] },
    wildfire:    { kind:'wildfire',    severity:0.6, mood:'bad',  duration:40, label:'Wildfire',      emoji:'🔥', keywords:['wildfire','forest fire','bushfire','firestorm'] },
    blizzard:    { kind:'blizzard',    severity:0.5, mood:'bad',  duration:30, label:'Blizzard',      emoji:'❄', keywords:['blizzard','snowstorm','whiteout'] },
    meteor:      { kind:'meteor',      severity:0.9, mood:'bad',  duration:5,  label:'Meteor strike', emoji:'☄', shake:true,  keywords:['meteor','asteroid','meteorite','comet strike','nuclear','nuke','atomic'] },

    // --- Blessings / positives ---
    prosperity:  { kind:'prosperity',  severity:0.6, mood:'good', duration:60, label:'Era of prosperity', emoji:'✨', keywords:['prosperity','wealth','bless','blessing','golden age','renaissance','boom','silk road','trade route'] },
    peace:       { kind:'peace',       severity:0.6, mood:'good', duration:90, label:'Wave of peace',     emoji:'🕊', keywords:['peace','harmony','ceasefire','reconciliation'] },
    healing:     { kind:'healing',     severity:0.6, mood:'good', duration:30, label:'Healing wave',      emoji:'💚', keywords:['healing','heal','cure','remedy','panacea','vaccine'] },
    miracle:     { kind:'miracle',     severity:0.9, mood:'good', duration:20, label:'Miracle',           emoji:'🌟', keywords:['miracle','miraculous','divine'] },
    festival:    { kind:'festival',    severity:0.5, mood:'good', duration:20, label:'Festival',          emoji:'🎉', keywords:['festival','celebration','carnival','party','parade','new year','olympics','olympic games','wedding','carnaval','mardi gras','holi','diwali','christmas','chanukah','eid'] },
    harvest:     { kind:'harvest',     severity:0.5, mood:'good', duration:30, label:'Bountiful harvest', emoji:'🌾', keywords:['harvest','bountiful','abundance'] },
    innovation:  { kind:'innovation',  severity:0.7, mood:'good', duration:60, label:'Breakthrough',      emoji:'💡', keywords:['innovation','breakthrough','invention','discovery','eureka','technology leap','ai breakthrough','space race','moon landing','genius','scientific revolution','industrial revolution'] },
    baby_boom:   { kind:'baby_boom',   severity:0.7, mood:'good', duration:60, label:'Baby boom',         emoji:'👶', keywords:['baby boom','birth rate','fertility','population boom','baby'] },

    // --- Social / unrest ---
    war:         { kind:'war',         severity:0.8, mood:'bad',  duration:90, label:'War',             emoji:'⚔', keywords:['war','invasion','battle','combat','conflict','crusade','crusades','conquest','skirmish'] },
    revolution:  { kind:'revolution',  severity:0.7, mood:'warn', duration:40, label:'Revolution',      emoji:'🔥', keywords:['revolution','uprising','revolt','rebellion','coup'] },
    protest:     { kind:'protest',     severity:0.4, mood:'warn', duration:20, label:'Protest',         emoji:'✊', keywords:['protest','march','demonstration','strike','riot','election','vote'] },
    migration:   { kind:'migration',   severity:0.5, mood:'warn', duration:40, label:'Migration',       emoji:'👣', keywords:['migration','exodus','refugees','diaspora'] },

    // --- Health ---
    plague:      { kind:'plague',      severity:0.8, mood:'bad',  duration:60, label:'Plague',          emoji:'☠', keywords:['plague','pandemic','epidemic','pestilence','outbreak','disease'] },

    // --- Weather ---   (minimal — just the atmospheric extremes, no everyday rain/fog)
    storm:       { kind:'storm',       severity:0.4, mood:'warn', duration:15, label:'Storm',           emoji:'⛈', keywords:['storm','thunderstorm','lightning','rain','rainfall','downpour','monsoon','blizzard','snowstorm'] },
    aurora:      { kind:'aurora',      severity:0.5, mood:'good', duration:30, label:'Aurora',          emoji:'🌌', keywords:['aurora','northern lights','southern lights'] },
    eclipse:     { kind:'eclipse',     severity:0.6, mood:'info', duration:10, label:'Eclipse',         emoji:'🌑', keywords:['eclipse','solar eclipse','lunar eclipse'] },
    ufo:         { kind:'ufo',         severity:0.8, mood:'info', duration:15, label:'UFO sighting',    emoji:'🛸', keywords:['ufo','alien','aliens','extraterrestrial','flying saucer','first contact','alien contact','alien invasion'] },
    zombies:     { kind:'zombies',     severity:0.9, mood:'bad',  duration:40, label:'Zombie outbreak', emoji:'🧟', keywords:['zombie','zombies','undead','walking dead'] },
    dragons:     { kind:'dragons',     severity:0.8, mood:'warn', duration:25, label:'Dragons return',  emoji:'🐉', keywords:['dragon','dragons','wyrm'] },
    dance:       { kind:'dance',       severity:0.4, mood:'good', duration:15, label:'Street dance',    emoji:'💃', keywords:['dance','dancing','flash mob'] },
    nightfall:   { kind:'nightfall',   severity:0.4, mood:'info', duration:10, label:'Night falls',     emoji:'🌙', keywords:['night','nightfall','midnight'] },
    sunrise:     { kind:'sunrise',     severity:0.4, mood:'good', duration:10, label:'Sunrise',         emoji:'🌅', keywords:['sunrise','dawn','daybreak'] },
};

const EVENT_KIND_LIST = Object.keys(EVENT_LIB);

/* ---------- utilities ---------- */

function normalize(s) {
    return (s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findEventKind(text) {
    const t = ' ' + text + ' ';
    let best = null, bestLen = 0;
    for (const k of EVENT_KIND_LIST) {
        const entry = EVENT_LIB[k];
        for (const kw of entry.keywords) {
            if (t.includes(' ' + kw + ' ') || t.includes(kw)) {
                if (kw.length > bestLen) { best = k; bestLen = kw.length; }
            }
        }
    }
    return best;
}

function findLocation(text) {
    const t = ' ' + text + ' ';
    // explicit "worldwide / global / everywhere"
    if (/\b(worldwide|global|globally|everywhere|the world|earth|planet)\b/.test(t)) {
        return { kind:'world' };
    }
    // regions (longer first)
    const regionKeys = Object.keys(REGIONS).sort((a,b) => b.length - a.length);
    for (const r of regionKeys) {
        if (t.includes(' ' + r + ' ') || t.includes(' ' + r + ',') || t.endsWith(' ' + r)) {
            return { kind:'region', id:r };
        }
    }
    // continents
    for (const c of Object.keys(CONTINENTS)) {
        if (t.includes(' ' + c + ' ')) return { kind:'continent', id:c };
    }
    // countries — longest alias first
    const candidates = [];
    for (const id of Object.keys(COUNTRIES)) {
        for (const a of COUNTRIES[id].aliases) {
            candidates.push({ id, a });
        }
    }
    candidates.sort((x,y) => y.a.length - x.a.length);
    for (const c of candidates) {
        const a = c.a;
        if (a.length < 3) continue;
        const pat = new RegExp('(^|[^a-z])' + escapeRegex(a) + '([^a-z]|$)');
        if (pat.test(t)) return { kind:'country', id:c.id };
    }
    return null;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function resolveTargets(loc) {
    if (!loc) return { ids: randomCountries(1 + Math.floor(Math.random()*3)), label:'somewhere on Earth' };
    if (loc.kind === 'world')     return { ids: ALL_COUNTRY_IDS, label:'worldwide' };
    if (loc.kind === 'continent') return { ids: ALL_COUNTRY_IDS.filter(id => COUNTRIES[id].continent === loc.id), label: CONTINENTS[loc.id].label };
    if (loc.kind === 'region')    return { ids: REGIONS[loc.id].countries, label:'in the ' + loc.id };
    if (loc.kind === 'country')   return { ids: [loc.id], label:'in ' + COUNTRIES[loc.id].name };
    return { ids: [], label:'' };
}

function randomCountries(n) {
    const pool = ALL_COUNTRY_IDS.slice();
    const out = [];
    for (let i = 0; i < n && pool.length; i++) {
        out.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]);
    }
    return out;
}

/* severity modifiers */
function parseIntensity(text) {
    if (/\b(massive|catastrophic|devastating|apocalyptic|cataclysmic|epic|huge|extreme|giant|enormous|colossal)\b/.test(text)) return 1.4;
    if (/\b(mild|small|tiny|minor|slight|gentle|soft)\b/.test(text)) return 0.5;
    if (/\b(strong|major|severe|intense|big)\b/.test(text)) return 1.2;
    return 1.0;
}

function parseDuration(text) {
    // crude: "for 30 minutes", "for 2 hours", "for 3 days"
    const m = text.match(/for\s+(\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks)/);
    if (m) {
        const n = parseInt(m[1]);
        const unit = m[2];
        let secs = n;
        if (unit.startsWith('hour')) secs = n * 60;
        if (unit.startsWith('day')) secs = n * 1440;
        if (unit.startsWith('week')) secs = n * 10080;
        return Math.max(5, Math.min(600, secs / 10)); // cap at 600s
    }
    return null;
}

/* ---------- main entry point ---------- */

function parsePrompt(raw) {
    const text = normalize(raw);
    if (!text) return null;

    // "help", "what can I do" etc.
    if (/^(help|\?|what can i do|commands?)$/.test(text)) {
        return { type:'help' };
    }

    // Gaia introspection: "status", "how is the world", "summary", "report"
    if (/^(status|report|summary|summarise|summarize|how('s| is) (the )?world|how are things|state of the world|gaia\??|hi gaia|hello gaia)$/.test(text)) {
        return { type:'introspect' };
    }

    // Greetings to Gaia
    if (/^(hello|hi|hey|yo|sup|namaste|salaam|hola|bonjour|konnichiwa|howdy)\s*(gaia)?\s*[!.?]*$/.test(text)) {
        return { type:'greet' };
    }

    // Easter eggs
    if (/(konami|42|the answer|cheat|god mode)/.test(text)) return { type:'easter', which:'god' };
    if (/(thanos|snap|half the universe)/.test(text)) return { type:'easter', which:'thanos' };
    if (/(wakanda|bucket list|wakanda forever)/.test(text)) return { type:'easter', which:'wakanda' };
    if (/(long live the king|hail)/.test(text)) return { type:'easter', which:'king' };
    if (/(rapture|judgement day|end times|apocalypse|armageddon)/.test(text)) return { type:'easter', which:'apocalypse' };
    if (/(love|kindness everywhere|kind)/.test(text) && text.length < 30) return { type:'easter', which:'love' };

    // "pause", "resume"
    if (/^(pause|stop|freeze)$/.test(text)) return { type:'control', action:'pause' };
    if (/^(resume|play|unfreeze|continue)$/.test(text)) return { type:'control', action:'play' };
    if (/^(reset|restart|start over)$/.test(text)) return { type:'control', action:'reset' };

    // "zoom to X" / "fly to X" / "travel to X" (non-year/era → just focus)
    const zm = text.match(/^(zoom|go|fly|focus|show|travel|take me) (to|on|at|over) (.+)$/);
    if (zm) {
        const loc = findLocation(' ' + zm[3] + ' ');
        if (loc) return { type:'zoom', location: loc };
    }

    let kind = findEventKind(text);
    const loc = findLocation(text);
    const targets = resolveTargets(loc);

    if (!kind) {
        // fallback: try to interpret sentiment to produce something
        if (/\b(good|happy|joy|love|bless|hope)\b/.test(text))  kind = 'prosperity';
        else if (/\b(sad|angry|hate|destroy|ruin|doom)\b/.test(text)) kind = 'storm';
        else kind = pickRandom(['storm','festival','rain','aurora','sunshine']);
    }

    const lib = EVENT_LIB[kind];
    const intensity = parseIntensity(text);
    const duration = parseDuration(text) || lib.duration;

    return {
        type: 'event',
        kind,
        severity: Math.min(1, lib.severity * intensity),
        duration,
        mood: lib.mood,
        label: lib.label,
        emoji: lib.emoji,
        shake: !!lib.shake,
        targets: targets.ids,
        locationLabel: targets.label,
        rawPrompt: raw,
    };
}

function pickRandom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
