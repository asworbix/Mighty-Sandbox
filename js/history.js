/* =========================================================
   history.js — time travel. A curated database of historical
   events with dates, locations, and effects. Also defines
   broad "eras" that shape the baseline state of the world
   (population, health, peace, technology) when you jump in
   time.
   ========================================================= */

const History = (() => {

    /* ---------- Eras ----------
       Each era has a baseline multiplier for world population and
       rough happiness/health/peace/econ/climate values. When the
       user jumps to a year, the world is reseeded to that baseline,
       then relevant historical events get queued up around that time.
    */
    const ERAS = [
        { id:'bronze',    year:-3000, end:-1200, name:'Bronze Age',
          base:{ pop:0.012, happy:0.5, health:0.35, peace:0.45, econ:0.15, climate:0.75 },
          mood:'Cities rise along the Nile, Euphrates, and Indus. Writing is being invented.' },
        { id:'antiquity', year:-1200, end:476,   name:'Classical Antiquity',
          base:{ pop:0.03,  happy:0.52, health:0.38, peace:0.45, econ:0.22, climate:0.7 },
          mood:'Greek philosophers, Roman legions, Qin emperors, Maya astronomers.' },
        { id:'medieval',  year:476,   end:1300,  name:'Middle Ages',
          base:{ pop:0.08,  happy:0.48, health:0.35, peace:0.4, econ:0.22, climate:0.7 },
          mood:'Cathedrals, caravans, and the slow spread of empires.' },
        { id:'plague',    year:1346,  end:1355,  name:'The Black Death',
          base:{ pop:0.07,  happy:0.25, health:0.1, peace:0.35, econ:0.15, climate:0.65 },
          mood:'Europe is gripped by pestilence. A third of the continent perishes.' },
        { id:'renaissance',year:1400, end:1600,  name:'Renaissance',
          base:{ pop:0.11,  happy:0.6, health:0.45, peace:0.5, econ:0.35, climate:0.7 },
          mood:'Art, exploration, and the printing press reshape minds and maps.' },
        { id:'colonial',  year:1600,  end:1760,  name:'Age of Exploration',
          base:{ pop:0.13,  happy:0.5, health:0.45, peace:0.4, econ:0.4, climate:0.68 },
          mood:'Fleets cross oceans; empires rise as others fall.' },
        { id:'industrial',year:1760,  end:1914,  name:'Industrial Revolution',
          base:{ pop:0.22,  happy:0.55, health:0.5, peace:0.55, econ:0.55, climate:0.55 },
          mood:'Steam, steel, and smokestacks transform every skyline.' },
        { id:'ww1',       year:1914,  end:1918,  name:'The Great War',
          base:{ pop:0.23,  happy:0.2, health:0.35, peace:0.1, econ:0.35, climate:0.5 },
          mood:'Trenches scar the continent. Empires break apart.' },
        { id:'interwar',  year:1919,  end:1939,  name:'Interwar Years',
          base:{ pop:0.26,  happy:0.5, health:0.5, peace:0.55, econ:0.4, climate:0.5 },
          mood:'Jazz, flappers, skyscrapers — and a shadow gathering in Europe.' },
        { id:'ww2',       year:1939,  end:1945,  name:'Second World War',
          base:{ pop:0.29,  happy:0.15, health:0.3, peace:0.05, econ:0.35, climate:0.45 },
          mood:'The world is at war from the Atlantic to the Pacific.' },
        { id:'coldwar',   year:1946,  end:1991,  name:'Cold War Era',
          base:{ pop:0.45,  happy:0.55, health:0.65, peace:0.45, econ:0.6, climate:0.4 },
          mood:'Two superpowers shape every conflict on Earth.' },
        { id:'digital',   year:1991,  end:2010,  name:'Digital Age',
          base:{ pop:0.7,   happy:0.65, health:0.75, peace:0.6, econ:0.7, climate:0.35 },
          mood:'The internet weaves itself into every continent.' },
        { id:'modern',    year:2010,  end:2026,  name:'Modern Era',
          base:{ pop:1.0,   happy:0.6, health:0.8, peace:0.55, econ:0.72, climate:0.3 },
          mood:'Eight billion people, warming seas, dizzying change.' },
        { id:'near',      year:2026,  end:2060,  name:'Near Future',
          base:{ pop:1.05,  happy:0.65, health:0.85, peace:0.6, econ:0.78, climate:0.35 },
          mood:'Orbital cities and machine minds are whispered about.' },
        { id:'far',       year:2060,  end:2300,  name:'Far Future',
          base:{ pop:1.2,   happy:0.7, health:0.9, peace:0.65, econ:0.88, climate:0.5 },
          mood:'Humanity steps off the homeworld.' },
    ];

    function eraAt(year) {
        for (const e of ERAS) if (year >= e.year && year < e.end) return e;
        return ERAS[ERAS.length - 1];
    }

    /* ---------- Historical events ----------
       Curated list. Each entry:
         year, (optional) month, (optional) day
         target: country id array OR region name OR 'world'
         kind:   event kind from EVENT_LIB
         severity: 0..1
         duration: seconds (sim time)
         label:  display name
         emoji, mood
         note:   short narrator hint
    */
    const HISTORICAL_EVENTS = [
        // --- Antiquity ---
        { year:-2560, target:['818'],           kind:'innovation', severity:0.7, duration:30, label:'Great Pyramid of Giza', emoji:'🔺', note:'A tomb taller than any building for four thousand years.' },
        { year:-753,  target:['380'],           kind:'prosperity', severity:0.6, duration:30, label:'Founding of Rome', emoji:'🏛' },
        { year:-563,  target:['356'],           kind:'miracle',    severity:0.6, duration:25, label:'The Buddha is born', emoji:'🪷' },
        { year:-490,  target:['300'],           kind:'war',        severity:0.6, duration:25, label:'Battle of Marathon', emoji:'⚔' },
        { year:-332,  target:'middle east',     kind:'war',        severity:0.7, duration:30, label:'Alexander conquers Persia', emoji:'⚔' },
        { year:-221,  target:['156'],           kind:'prosperity', severity:0.8, duration:40, label:'China is unified under Qin', emoji:'🐉' },
        { year:-44,   target:['380'],           kind:'revolution', severity:0.7, duration:20, label:'Julius Caesar is assassinated', emoji:'🗡' },
        { year:79,    target:['380'],           kind:'volcano',    severity:0.9, duration:30, label:'Vesuvius erupts over Pompeii', emoji:'🌋' },
        { year:476,   target:['380'],           kind:'revolution', severity:0.8, duration:40, label:'Fall of the Western Roman Empire', emoji:'🏛' },

        // --- Medieval ---
        { year:632,   target:'middle east',     kind:'prosperity', severity:0.8, duration:40, label:'Rise of the Islamic Caliphate', emoji:'☪' },
        { year:800,   target:['250','276'],     kind:'prosperity', severity:0.6, duration:35, label:'Charlemagne crowned Emperor', emoji:'👑' },
        { year:1066,  target:['826'],           kind:'war',        severity:0.6, duration:25, label:'Norman Conquest of England', emoji:'⚔' },
        { year:1206,  target:['496'],           kind:'war',        severity:0.9, duration:60, label:'Genghis Khan unites the steppes', emoji:'🏹', note:'The largest contiguous empire in history begins to form.' },
        { year:1271,  target:['156','380'],     kind:'innovation', severity:0.5, duration:25, label:'Marco Polo leaves for Asia', emoji:'🧭' },
        { year:1337,  target:['250','826'],     kind:'war',        severity:0.6, duration:60, label:'The Hundred Years\' War begins', emoji:'⚔' },
        { year:1347,  target:'europe',          kind:'plague',     severity:1.0, duration:180,label:'The Black Death', emoji:'☠', note:'A third of Europe will not see the next decade.' },

        // --- Renaissance ---
        { year:1440,  target:['276'],           kind:'innovation', severity:0.9, duration:60, label:'Gutenberg invents the printing press', emoji:'📜' },
        { year:1453,  target:['792'],           kind:'war',        severity:0.8, duration:30, label:'Fall of Constantinople', emoji:'🏰' },
        { year:1492,  target:['724'],           kind:'innovation', severity:0.8, duration:40, label:'Columbus reaches the Americas', emoji:'⛵' },
        { year:1517,  target:['276'],           kind:'revolution', severity:0.7, duration:60, label:'Luther nails his 95 Theses', emoji:'✝' },
        { year:1519,  target:['484'],           kind:'war',        severity:0.9, duration:50, label:'Cortés invades the Aztec Empire', emoji:'⚔' },
        { year:1543,  target:['616'],           kind:'innovation', severity:0.7, duration:40, label:'Copernicus: Earth orbits the Sun', emoji:'☀' },
        { year:1588,  target:['826','724'],     kind:'war',        severity:0.7, duration:30, label:'Defeat of the Spanish Armada', emoji:'⛵' },

        // --- Colonial / early modern ---
        { year:1607,  target:['840'],           kind:'migration',  severity:0.5, duration:40, label:'Jamestown settled', emoji:'🏘' },
        { year:1620,  target:['840'],           kind:'migration',  severity:0.5, duration:30, label:'The Mayflower lands', emoji:'⛵' },
        { year:1666,  target:['826'],           kind:'wildfire',   severity:0.7, duration:25, label:'Great Fire of London', emoji:'🔥' },
        { year:1687,  target:['826'],           kind:'innovation', severity:0.9, duration:40, label:'Newton publishes Principia', emoji:'🍎' },
        { year:1755,  target:['620'],           kind:'earthquake', severity:1.0, duration:30, label:'Lisbon earthquake', emoji:'🌐', note:'A city unmade in minutes.' },
        { year:1769,  target:['826'],           kind:'innovation', severity:0.8, duration:40, label:'Watt improves the steam engine', emoji:'⚙' },
        { year:1776,  target:['840'],           kind:'revolution', severity:0.9, duration:60, label:'American independence declared', emoji:'🗽' },
        { year:1789,  target:['250'],           kind:'revolution', severity:0.9, duration:60, label:'French Revolution begins', emoji:'🎭' },
        { year:1804,  target:'europe',          kind:'war',        severity:0.8, duration:90, label:'Napoleonic Wars', emoji:'⚔' },
        { year:1815,  target:['528'],           kind:'volcano',    severity:1.0, duration:60, label:'Tambora erupts — "year without summer"', emoji:'🌋' },

        // --- Industrial / 19th century ---
        { year:1825,  target:['826'],           kind:'innovation', severity:0.6, duration:30, label:'First passenger railway', emoji:'🚂' },
        { year:1848,  target:'europe',          kind:'revolution', severity:0.6, duration:40, label:'Revolutions sweep Europe', emoji:'🔥' },
        { year:1859,  target:['826'],           kind:'innovation', severity:0.9, duration:40, label:'Darwin publishes On the Origin of Species', emoji:'🧬' },
        { year:1861,  target:['840'],           kind:'war',        severity:0.9, duration:80, label:'American Civil War', emoji:'⚔' },
        { year:1865,  target:['840'],           kind:'peace',      severity:0.7, duration:40, label:'Slavery abolished in the USA', emoji:'🕊' },
        { year:1879,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'Edison\'s lightbulb glows', emoji:'💡' },
        { year:1883,  target:['360'],           kind:'volcano',    severity:1.0, duration:40, label:'Krakatoa explodes', emoji:'🌋' },
        { year:1889,  target:['250'],           kind:'festival',   severity:0.6, duration:30, label:'Eiffel Tower opens', emoji:'🗼' },
        { year:1896,  target:['300'],           kind:'festival',   severity:0.6, duration:25, label:'First modern Olympics, Athens', emoji:'🏅' },

        // --- 20th century ---
        { year:1903,  target:['840'],           kind:'innovation', severity:0.8, duration:30, label:'Wright brothers fly', emoji:'✈' },
        { year:1905,  target:'europe',          kind:'innovation', severity:0.9, duration:40, label:'Einstein publishes relativity', emoji:'🧠' },
        { year:1906,  target:['840'],           kind:'earthquake', severity:1.0, duration:30, label:'San Francisco earthquake', emoji:'🌐' },
        { year:1912,  target:'world',           kind:'storm',      severity:0.7, duration:20, label:'RMS Titanic sinks', emoji:'🚢' },
        { year:1914,  target:'europe',          kind:'war',        severity:1.0, duration:150, label:'The First World War', emoji:'⚔', note:'A generation marches off to mud and trenches.' },
        { year:1918,  target:'world',           kind:'plague',     severity:1.0, duration:120, label:'Spanish flu pandemic', emoji:'☠' },
        { year:1917,  target:['643'],           kind:'revolution', severity:1.0, duration:60, label:'Russian Revolution', emoji:'🔥' },
        { year:1920,  target:['840'],           kind:'festival',   severity:0.6, duration:30, label:'The Roaring Twenties begin', emoji:'🎷' },
        { year:1929,  target:'world',           kind:'drought',    severity:0.8, duration:80, label:'Wall Street Crash — Great Depression', emoji:'📉' },
        { year:1939,  target:'world',           kind:'war',        severity:1.0, duration:200, label:'The Second World War', emoji:'⚔', note:'The deadliest conflict in human history.' },
        { year:1945,  target:['392'],           kind:'meteor',     severity:1.0, duration:30, label:'Atomic bombs fall on Hiroshima and Nagasaki', emoji:'☢' },
        { year:1947,  target:['356','586'],     kind:'migration',  severity:0.9, duration:60, label:'Partition of India and Pakistan', emoji:'👣' },
        { year:1948,  target:['376'],           kind:'prosperity', severity:0.6, duration:30, label:'State of Israel declared', emoji:'🕊' },
        { year:1949,  target:['156'],           kind:'revolution', severity:0.9, duration:50, label:'People\'s Republic of China founded', emoji:'🚩' },
        { year:1957,  target:['643'],           kind:'innovation', severity:0.8, duration:30, label:'Sputnik — the Space Age begins', emoji:'🛰' },
        { year:1961,  target:['643'],           kind:'innovation', severity:0.8, duration:30, label:'Yuri Gagarin orbits Earth', emoji:'🚀' },
        { year:1963,  target:['840'],           kind:'protest',    severity:0.7, duration:30, label:'MLK: "I have a dream"', emoji:'✊' },
        { year:1969,  target:['840'],           kind:'miracle',    severity:0.9, duration:30, label:'Apollo 11 lands on the Moon', emoji:'🌕', note:'One small step for a man…' },
        { year:1971,  target:['704'],           kind:'war',        severity:0.7, duration:40, label:'Vietnam War in full swing', emoji:'⚔' },
        { year:1980,  target:['840'],           kind:'volcano',    severity:0.8, duration:20, label:'Mount St. Helens erupts', emoji:'🌋' },
        { year:1986,  target:['804'],           kind:'meteor',     severity:0.9, duration:60, label:'Chernobyl disaster', emoji:'☢' },
        { year:1989,  target:['276'],           kind:'peace',      severity:0.9, duration:40, label:'The Berlin Wall falls', emoji:'🕊', note:'A continent exhales.' },
        { year:1991,  target:['643'],           kind:'revolution', severity:0.8, duration:40, label:'Soviet Union dissolves', emoji:'🚩' },
        { year:1994,  target:['710'],           kind:'peace',      severity:0.8, duration:30, label:'Mandela elected President of South Africa', emoji:'🕊' },
        { year:1997,  target:['826'],           kind:'innovation', severity:0.6, duration:30, label:'Dolly the sheep is cloned', emoji:'🐑' },

        // --- 21st century ---
        { year:2001,  target:['840'],           kind:'war',        severity:0.9, duration:30, label:'September 11 attacks', emoji:'🏙' },
        { year:2004,  target:'southeast asia',  kind:'tsunami',    severity:1.0, duration:40, label:'Indian Ocean tsunami', emoji:'🌊' },
        { year:2007,  target:['840'],           kind:'innovation', severity:0.8, duration:30, label:'Apple unveils the iPhone', emoji:'📱' },
        { year:2008,  target:'world',           kind:'drought',    severity:0.7, duration:50, label:'Global financial crisis', emoji:'📉' },
        { year:2010,  target:['332'],           kind:'earthquake', severity:0.9, duration:30, label:'Haiti earthquake', emoji:'🌐' },
        { year:2011,  target:['392'],           kind:'tsunami',    severity:0.95,duration:30, label:'Tōhoku earthquake and tsunami', emoji:'🌊' },
        { year:2011,  target:'middle east',     kind:'revolution', severity:0.8, duration:60, label:'The Arab Spring', emoji:'🔥' },
        { year:2016,  target:'world',           kind:'innovation', severity:0.7, duration:30, label:'AlphaGo defeats Lee Sedol', emoji:'🧠' },
        { year:2019,  target:'world',           kind:'plague',     severity:1.0, duration:120,label:'COVID-19 pandemic', emoji:'🦠' },
        { year:2022,  target:['804','643'],     kind:'war',        severity:0.95,duration:100,label:'War in Ukraine begins', emoji:'⚔' },
        { year:2023,  target:'world',           kind:'innovation', severity:0.85,duration:40, label:'Generative AI reshapes every industry', emoji:'🧠' },
        { year:2024,  target:'world',           kind:'drought',    severity:0.6, duration:40, label:'Record-breaking heatwaves', emoji:'🌡' },

        // --- Speculative future (optional, for time-travel play) ---
        { year:2030,  target:'world',           kind:'innovation', severity:0.8, duration:60, label:'First human on Mars', emoji:'🚀' },
        { year:2045,  target:'world',           kind:'innovation', severity:0.9, duration:60, label:'The Singularity', emoji:'🧠' },
        { year:2087,  target:'world',           kind:'miracle',    severity:0.7, duration:40, label:'Fusion energy powers Earth', emoji:'✨' },
        { year:2150,  target:'world',           kind:'peace',      severity:0.8, duration:60, label:'Unified Earth Congress', emoji:'🕊' },
    ];

    /* Resolve a target spec (array of ids, region name, continent, or 'world') to ids. */
    function resolveHistTarget(t) {
        if (!t) return [];
        if (t === 'world') return ALL_COUNTRY_IDS.slice();
        if (Array.isArray(t)) return t;
        if (REGIONS[t]) return REGIONS[t].countries;
        if (CONTINENTS[t]) return ALL_COUNTRY_IDS.filter(id => COUNTRIES[id].continent === t);
        return [];
    }

    /* Find historical events within ±windowYears of `year`. */
    function eventsNear(year, windowYears = 4) {
        return HISTORICAL_EVENTS.filter(e => Math.abs(e.year - year) <= windowYears);
    }

    /* Build a sim event from a historical entry. */
    function buildEvent(he) {
        const targets = resolveHistTarget(he.target);
        const lib = EVENT_LIB[he.kind] || EVENT_LIB.storm;
        return {
            type:'event',
            kind: he.kind,
            severity: he.severity,
            duration: he.duration,
            mood: lib.mood,
            label: he.label,
            emoji: he.emoji || lib.emoji,
            shake: !!lib.shake,
            targets,
            locationLabel: he.locationLabel || 'somewhere in history',
            historical: true,
            year: he.year,
            note: he.note,
        };
    }

    /* Parse "travel to 1969", "go to year 1492", "take me to the black death" */
    function parseTimeTravel(text) {
        const t = (text || '').toLowerCase();
        if (!/(travel|go|jump|take me|warp|rewind|fast forward|year|back to|forward to)/.test(t)) return null;

        // explicit year (possibly BC)
        const bce = t.match(/(\d{1,4})\s*(bc|bce)/);
        if (bce) return { type:'travel', year: -parseInt(bce[1]) };
        const m = t.match(/(1[0-9]{3}|2[0-9]{3}|[1-9][0-9]{0,3})/);
        if (m) {
            let y = parseInt(m[1]);
            // heuristic: "travel to 45" probably means 1945
            if (y < 100 && /travel|go|jump/.test(t)) y += 1900;
            return { type:'travel', year:y };
        }
        // named eras
        for (const e of ERAS) {
            if (t.includes(e.name.toLowerCase()) || t.includes(e.id)) return { type:'travel', year: e.year };
        }
        // named events
        for (const he of HISTORICAL_EVENTS) {
            const n = he.label.toLowerCase();
            if (n && t.includes(n.split(' ').slice(0, 3).join(' '))) return { type:'travel', year: he.year };
        }
        return null;
    }

    return {
        ERAS,
        HISTORICAL_EVENTS,
        eraAt,
        eventsNear,
        buildEvent,
        parseTimeTravel,
        resolveHistTarget,
    };
})();
