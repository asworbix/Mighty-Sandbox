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

        // --- Additional deep-history and non-Western events ---
        { year:-2100, target:['368'],           kind:'innovation', severity:0.6, duration:30, label:'Epic of Gilgamesh composed', emoji:'📖' },
        { year:-1750, target:['368'],           kind:'innovation', severity:0.6, duration:30, label:'Code of Hammurabi', emoji:'⚖' },
        { year:-1200, target:'middle east',     kind:'revolution', severity:0.7, duration:40, label:'Bronze Age collapse', emoji:'🏺' },
        { year:-1046, target:['156'],           kind:'revolution', severity:0.6, duration:30, label:'Zhou dynasty overthrows Shang', emoji:'🀄' },
        { year:-776,  target:['300'],           kind:'festival',   severity:0.6, duration:20, label:'First ancient Olympics', emoji:'🏅' },
        { year:-500,  target:['356'],           kind:'innovation', severity:0.7, duration:40, label:'Upanishads composed', emoji:'🕉' },
        { year:-399,  target:['300'],           kind:'revolution', severity:0.5, duration:20, label:'Trial of Socrates', emoji:'🧠' },
        { year:-268,  target:['356'],           kind:'peace',      severity:0.6, duration:30, label:'Ashoka embraces Buddhism', emoji:'🪷' },
        { year:-146,  target:['788'],           kind:'war',        severity:0.8, duration:30, label:'Rome destroys Carthage', emoji:'⚔' },
        { year:-100,  target:['156','792'],     kind:'prosperity', severity:0.7, duration:60, label:'The Silk Road flourishes', emoji:'🐫' },
        { year:105,   target:['156'],           kind:'innovation', severity:0.7, duration:30, label:'Cai Lun improves paper', emoji:'📜' },
        { year:570,   target:['682'],           kind:'miracle',    severity:0.6, duration:25, label:'Muhammad is born in Mecca', emoji:'☪' },
        { year:618,   target:['156'],           kind:'prosperity', severity:0.8, duration:60, label:'Tang Dynasty ascendant', emoji:'🐉' },
        { year:800,   target:'west africa',     kind:'prosperity', severity:0.6, duration:50, label:'Empire of Ghana trades gold for salt', emoji:'🏛' },
        { year:1054,  target:'europe',          kind:'revolution', severity:0.6, duration:30, label:'The Great Schism', emoji:'✝' },
        { year:1095,  target:'middle east',     kind:'war',        severity:0.7, duration:60, label:'The Crusades begin', emoji:'⚔' },
        { year:1235,  target:'west africa',     kind:'prosperity', severity:0.7, duration:60, label:'Mali Empire founded by Sundiata', emoji:'👑' },
        { year:1324,  target:['466','504','682'],kind:'prosperity',severity:0.7, duration:40, label:'Mansa Musa\'s golden pilgrimage', emoji:'✨' },
        { year:1368,  target:['156'],           kind:'revolution', severity:0.6, duration:30, label:'Ming Dynasty begins', emoji:'🐲' },
        { year:1433,  target:['156'],           kind:'innovation', severity:0.6, duration:30, label:'Zheng He\'s treasure fleet returns', emoji:'⛵' },
        { year:1526,  target:['356'],           kind:'prosperity', severity:0.8, duration:60, label:'Mughal Empire founded', emoji:'🕌' },
        { year:1603,  target:['392'],           kind:'prosperity', severity:0.7, duration:60, label:'Edo Period begins in Japan', emoji:'⛩' },
        { year:1648,  target:'europe',          kind:'peace',      severity:0.8, duration:40, label:'Peace of Westphalia', emoji:'🕊' },
        { year:1776,  target:['840'],           kind:'revolution', severity:0.9, duration:60, label:'Declaration of Independence', emoji:'📜' },
        { year:1804,  target:['332'],           kind:'revolution', severity:0.8, duration:40, label:'Haitian Revolution succeeds', emoji:'✊' },
        { year:1847,  target:['430'],           kind:'prosperity', severity:0.5, duration:30, label:'Liberia declares independence', emoji:'🕊' },
        { year:1853,  target:['392'],           kind:'migration',  severity:0.6, duration:30, label:'Perry opens Japan to the world', emoji:'⛵' },
        { year:1869,  target:['818'],           kind:'innovation', severity:0.7, duration:30, label:'Suez Canal opens', emoji:'🚢' },
        { year:1876,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'Bell patents the telephone', emoji:'📞' },
        { year:1894,  target:['156','392'],     kind:'war',        severity:0.7, duration:30, label:'First Sino-Japanese War', emoji:'⚔' },
        { year:1911,  target:['156'],           kind:'revolution', severity:0.8, duration:40, label:'Xinhai Revolution ends Qing dynasty', emoji:'🔥' },
        { year:1928,  target:['826'],           kind:'innovation', severity:0.9, duration:30, label:'Fleming discovers penicillin', emoji:'💊' },
        { year:1936,  target:['724'],           kind:'war',        severity:0.7, duration:40, label:'Spanish Civil War', emoji:'⚔' },
        { year:1947,  target:['356'],           kind:'peace',      severity:0.8, duration:30, label:'India wins independence', emoji:'🕊' },
        { year:1950,  target:['408','410'],     kind:'war',        severity:0.8, duration:60, label:'Korean War', emoji:'⚔' },
        { year:1955,  target:['360','356'],     kind:'peace',      severity:0.5, duration:30, label:'Bandung Conference', emoji:'🕊' },
        { year:1959,  target:['192'],           kind:'revolution', severity:0.7, duration:40, label:'Cuban Revolution', emoji:'🔥' },
        { year:1960,  target:'africa',          kind:'peace',      severity:0.7, duration:50, label:'The Year of Africa — 17 nations independent', emoji:'🌍' },
        { year:1967,  target:'middle east',     kind:'war',        severity:0.6, duration:20, label:'Six-Day War', emoji:'⚔' },
        { year:1973,  target:'world',           kind:'drought',    severity:0.7, duration:40, label:'Oil crisis shocks the world', emoji:'🛢' },
        { year:1978,  target:['156'],           kind:'innovation', severity:0.8, duration:50, label:'China begins reform and opening-up', emoji:'🏗' },
        { year:1979,  target:['364'],           kind:'revolution', severity:0.8, duration:40, label:'Iranian Revolution', emoji:'🔥' },
        { year:1981,  target:'world',           kind:'plague',     severity:0.8, duration:80, label:'AIDS crisis begins', emoji:'🧬' },
        { year:1989,  target:['156'],           kind:'protest',    severity:0.8, duration:25, label:'Tiananmen Square protests', emoji:'✊' },
        { year:1990,  target:['710'],           kind:'peace',      severity:0.8, duration:30, label:'Nelson Mandela is freed', emoji:'🕊' },
        { year:1992,  target:['076'],           kind:'festival',   severity:0.6, duration:30, label:'Earth Summit in Rio', emoji:'🌳' },
        { year:1994,  target:['646'],           kind:'war',        severity:1.0, duration:30, label:'Rwandan genocide', emoji:'☠' },
        { year:1999,  target:'europe',          kind:'prosperity', severity:0.6, duration:40, label:'Euro launches', emoji:'💶' },
        { year:2003,  target:['368'],           kind:'war',        severity:0.8, duration:60, label:'Iraq War begins', emoji:'⚔' },
        { year:2009,  target:'world',           kind:'innovation', severity:0.7, duration:30, label:'Bitcoin whitepaper implemented', emoji:'₿' },
        { year:2014,  target:['804'],           kind:'war',        severity:0.7, duration:40, label:'Crimea annexed', emoji:'⚔' },
        { year:2015,  target:'europe',          kind:'migration',  severity:0.8, duration:60, label:'European migrant crisis', emoji:'👣' },
        { year:2016,  target:['826'],           kind:'revolution', severity:0.6, duration:30, label:'Brexit referendum', emoji:'🗳' },
        { year:2020,  target:'world',           kind:'protest',    severity:0.8, duration:40, label:'Global Black Lives Matter protests', emoji:'✊' },
        { year:2021,  target:['004'],           kind:'revolution', severity:0.8, duration:40, label:'Taliban retake Afghanistan', emoji:'🚩' },

        // --- Future tech & wonder ---
        { year:2035,  target:'world',           kind:'innovation', severity:0.8, duration:40, label:'Quantum networks go public', emoji:'🔗' },
        { year:2040,  target:'world',           kind:'healing',    severity:0.8, duration:40, label:'Aging is officially slowed', emoji:'💊' },
        { year:2055,  target:'world',           kind:'migration',  severity:0.7, duration:60, label:'First Mars colony expands', emoji:'🚀' },
        { year:2071,  target:'world',           kind:'innovation', severity:0.9, duration:60, label:'First contact confirmed', emoji:'👽' },
        { year:2099,  target:'world',           kind:'festival',   severity:0.8, duration:30, label:'End of the 21st century celebrations', emoji:'🎆' },
        { year:2200,  target:'world',           kind:'prosperity', severity:0.8, duration:60, label:'Interstellar trade begins', emoji:'✨' },

        /* ============================================================
           EXPANDED HISTORICAL LIBRARY — wars, inventions, discoveries,
           empires, philosophies, arts. Everything that built our world.
           ============================================================ */

        // --- Deep antiquity & stone-to-bronze transition ---
        { year:-9500, target:['792'],           kind:'innovation', severity:0.9, duration:40, label:'Göbekli Tepe built', emoji:'🗿' },
        { year:-8000, target:'middle east',     kind:'innovation', severity:0.9, duration:50, label:'Agriculture emerges in the Fertile Crescent', emoji:'🌾' },
        { year:-7000, target:['156'],           kind:'innovation', severity:0.7, duration:40, label:'Rice cultivation spreads through the Yangtze valley', emoji:'🌾' },
        { year:-6500, target:['792'],           kind:'innovation', severity:0.6, duration:30, label:'Çatalhöyük — one of the first true cities', emoji:'🏘' },
        { year:-5500, target:['368'],           kind:'innovation', severity:0.7, duration:30, label:'Copper smelting in Mesopotamia', emoji:'⚒' },
        { year:-3500, target:['368'],           kind:'innovation', severity:0.9, duration:40, label:'Wheel and sail invented in Sumer', emoji:'🛞' },
        { year:-3200, target:['368'],           kind:'innovation', severity:0.9, duration:40, label:'Cuneiform — first writing', emoji:'📜' },
        { year:-3100, target:['818'],           kind:'revolution', severity:0.8, duration:30, label:'Egypt unified under Menes', emoji:'👑' },
        { year:-3000, target:'south asia',      kind:'prosperity', severity:0.8, duration:50, label:'Indus Valley civilization flourishes', emoji:'🏛' },
        { year:-2700, target:['826'],           kind:'innovation', severity:0.7, duration:30, label:'Stonehenge construction begins', emoji:'🗿' },
        { year:-2334, target:['368'],           kind:'war',        severity:0.8, duration:40, label:'Sargon forges the Akkadian Empire', emoji:'⚔' },
        { year:-2000, target:['250'],           kind:'innovation', severity:0.5, duration:30, label:'Minoan civilization rises on Crete', emoji:'🏛' },
        { year:-1800, target:['368'],           kind:'innovation', severity:0.7, duration:30, label:'First horse-drawn chariots', emoji:'🐎' },
        { year:-1600, target:['300'],           kind:'volcano',    severity:1.0, duration:35, label:'Thera erupts, ending Minoan Crete', emoji:'🌋' },
        { year:-1500, target:['818'],           kind:'prosperity', severity:0.8, duration:50, label:'New Kingdom — Egypt at its zenith', emoji:'👑' },
        { year:-1353, target:['818'],           kind:'revolution', severity:0.6, duration:30, label:'Akhenaten\'s monotheism experiment', emoji:'☀' },
        { year:-1279, target:['818'],           kind:'prosperity', severity:0.7, duration:40, label:'Ramesses II\'s long reign begins', emoji:'👑' },
        { year:-1274, target:'middle east',     kind:'war',        severity:0.7, duration:25, label:'Battle of Kadesh — first recorded peace treaty', emoji:'📜' },
        { year:-1100, target:['250'],           kind:'innovation', severity:0.7, duration:30, label:'Iron Age reaches Europe', emoji:'⚒' },
        { year:-800,  target:['300'],           kind:'festival',   severity:0.6, duration:25, label:'Homer composes the Iliad and Odyssey', emoji:'📖' },
        { year:-722,  target:['368'],           kind:'war',        severity:0.8, duration:30, label:'Assyrian Empire conquers Israel', emoji:'⚔' },
        { year:-586,  target:['368'],           kind:'war',        severity:0.9, duration:30, label:'Babylon destroys the First Temple', emoji:'🔥' },
        { year:-551,  target:['156'],           kind:'innovation', severity:0.8, duration:40, label:'Confucius is born', emoji:'🧠' },
        { year:-509,  target:['380'],           kind:'revolution', severity:0.7, duration:30, label:'Roman Republic founded', emoji:'🏛' },
        { year:-480,  target:['300'],           kind:'war',        severity:0.8, duration:25, label:'Battle of Thermopylae and Salamis', emoji:'⚔' },
        { year:-431,  target:['300'],           kind:'war',        severity:0.8, duration:50, label:'Peloponnesian War', emoji:'⚔' },
        { year:-384,  target:['300'],           kind:'innovation', severity:0.9, duration:40, label:'Aristotle is born', emoji:'🧠' },
        { year:-323,  target:'middle east',     kind:'revolution', severity:0.8, duration:30, label:'Alexander the Great dies in Babylon', emoji:'👑' },
        { year:-300,  target:['818'],           kind:'innovation', severity:0.9, duration:40, label:'Library of Alexandria founded', emoji:'📚' },
        { year:-250,  target:['300'],           kind:'innovation', severity:0.8, duration:30, label:'Archimedes — levers, pulleys, pi', emoji:'🧪' },
        { year:-218,  target:['380'],           kind:'war',        severity:0.9, duration:40, label:'Hannibal crosses the Alps', emoji:'🐘' },
        { year:-202,  target:['156'],           kind:'revolution', severity:0.8, duration:40, label:'Han dynasty begins — China reunified', emoji:'🐉' },
        { year:-200,  target:['380'],           kind:'innovation', severity:0.6, duration:30, label:'Concrete invented in Rome', emoji:'🏗' },
        { year:-150,  target:['300'],           kind:'innovation', severity:0.7, duration:30, label:'Antikythera mechanism — ancient analog computer', emoji:'⚙' },
        { year:-50,   target:['250'],           kind:'war',        severity:0.8, duration:40, label:'Caesar\'s conquest of Gaul', emoji:'⚔' },
        { year:-31,   target:['380'],           kind:'war',        severity:0.7, duration:25, label:'Battle of Actium — Roman Empire begins', emoji:'⚔' },
        { year:-4,    target:['376'],           kind:'miracle',    severity:0.7, duration:30, label:'Traditional date: Jesus of Nazareth is born', emoji:'⭐' },

        // --- Classical (0 – 500 CE) ---
        { year:30,    target:['376'],           kind:'revolution', severity:0.8, duration:30, label:'Christianity begins to spread', emoji:'✝' },
        { year:70,    target:['376'],           kind:'war',        severity:0.9, duration:30, label:'Roman siege of Jerusalem', emoji:'🔥' },
        { year:117,   target:'europe',          kind:'prosperity', severity:0.8, duration:60, label:'Roman Empire reaches its greatest extent under Trajan', emoji:'🏛' },
        { year:125,   target:['380'],           kind:'innovation', severity:0.6, duration:30, label:'The Pantheon is completed', emoji:'🏛' },
        { year:165,   target:'europe',          kind:'plague',     severity:0.9, duration:80, label:'Antonine Plague sweeps the Roman world', emoji:'☠' },
        { year:250,   target:['484'],           kind:'prosperity', severity:0.7, duration:50, label:'Maya classic period flourishes', emoji:'🏛' },
        { year:285,   target:'europe',          kind:'revolution', severity:0.6, duration:30, label:'Diocletian splits the Roman Empire', emoji:'⚖' },
        { year:313,   target:'europe',          kind:'peace',      severity:0.8, duration:30, label:'Edict of Milan legalizes Christianity', emoji:'✝' },
        { year:330,   target:['792'],           kind:'prosperity', severity:0.8, duration:40, label:'Constantinople founded as New Rome', emoji:'🏛' },
        { year:380,   target:'europe',          kind:'revolution', severity:0.7, duration:30, label:'Christianity becomes Rome\'s state religion', emoji:'✝' },
        { year:410,   target:['380'],           kind:'war',        severity:0.9, duration:30, label:'Visigoths sack Rome', emoji:'🔥' },
        { year:450,   target:'europe',          kind:'war',        severity:0.8, duration:40, label:'Attila the Hun terrorizes Europe', emoji:'🏹' },

        // --- Medieval (500 – 1400) ---
        { year:527,   target:['792'],           kind:'prosperity', severity:0.7, duration:50, label:'Justinian rebuilds the Eastern Roman Empire', emoji:'🏛' },
        { year:529,   target:['380'],           kind:'innovation', severity:0.6, duration:30, label:'Rule of Saint Benedict — birth of Western monasticism', emoji:'✝' },
        { year:537,   target:['792'],           kind:'innovation', severity:0.8, duration:30, label:'Hagia Sophia completed in Constantinople', emoji:'🏛' },
        { year:541,   target:'europe',          kind:'plague',     severity:0.95,duration:80, label:'Plague of Justinian', emoji:'☠' },
        { year:610,   target:['682'],           kind:'miracle',    severity:0.8, duration:30, label:'Muhammad receives the first revelations', emoji:'📖' },
        { year:622,   target:['682'],           kind:'migration',  severity:0.8, duration:30, label:'The Hijra — Islamic calendar begins', emoji:'🕌' },
        { year:636,   target:'middle east',     kind:'war',        severity:0.8, duration:30, label:'Arab conquest of the Levant', emoji:'⚔' },
        { year:711,   target:['724'],           kind:'war',        severity:0.8, duration:40, label:'Moors cross into Iberia', emoji:'⚔' },
        { year:732,   target:['250'],           kind:'war',        severity:0.7, duration:25, label:'Battle of Tours halts Umayyad expansion', emoji:'⚔' },
        { year:751,   target:'central asia',    kind:'war',        severity:0.7, duration:25, label:'Battle of Talas — paper spreads west', emoji:'📜' },
        { year:762,   target:['368'],           kind:'prosperity', severity:0.9, duration:50, label:'Baghdad founded — Islamic Golden Age begins', emoji:'🏛' },
        { year:793,   target:['826'],           kind:'war',        severity:0.7, duration:40, label:'Vikings raid Lindisfarne', emoji:'⚔' },
        { year:820,   target:['368'],           kind:'innovation', severity:0.9, duration:40, label:'Al-Khwarizmi — algebra is born', emoji:'🧮' },
        { year:874,   target:['352'],           kind:'migration',  severity:0.5, duration:30, label:'Norse settle Iceland', emoji:'⛵' },
        { year:900,   target:['484'],           kind:'prosperity', severity:0.6, duration:50, label:'Toltecs rise in Mesoamerica', emoji:'🏛' },
        { year:960,   target:['156'],           kind:'prosperity', severity:0.8, duration:60, label:'Song dynasty begins — paper money, gunpowder, compass', emoji:'🐉' },
        { year:988,   target:['643'],           kind:'revolution', severity:0.6, duration:30, label:'Kievan Rus adopts Christianity', emoji:'✝' },
        { year:1000,  target:['124'],           kind:'migration',  severity:0.6, duration:30, label:'Leif Erikson reaches Vinland', emoji:'⛵' },
        { year:1000,  target:['156'],           kind:'innovation', severity:0.8, duration:30, label:'Gunpowder weaponized in China', emoji:'💥' },
        { year:1054,  target:'europe',          kind:'revolution', severity:0.7, duration:30, label:'Great Schism splits Christendom', emoji:'✝' },
        { year:1066,  target:['826'],           kind:'war',        severity:0.8, duration:25, label:'Battle of Hastings — Normans conquer England', emoji:'⚔' },
        { year:1088,  target:['380'],           kind:'innovation', severity:0.7, duration:40, label:'University of Bologna founded', emoji:'🎓' },
        { year:1096,  target:'middle east',     kind:'war',        severity:0.85,duration:100,label:'First Crusade begins', emoji:'⚔' },
        { year:1147,  target:'middle east',     kind:'war',        severity:0.7, duration:60, label:'Second Crusade', emoji:'⚔' },
        { year:1163,  target:['250'],           kind:'innovation', severity:0.6, duration:30, label:'Construction of Notre-Dame de Paris begins', emoji:'⛪' },
        { year:1170,  target:['826'],           kind:'revolution', severity:0.5, duration:20, label:'Murder of Thomas Becket in Canterbury', emoji:'⛪' },
        { year:1187,  target:'middle east',     kind:'war',        severity:0.8, duration:30, label:'Saladin retakes Jerusalem', emoji:'⚔' },
        { year:1206,  target:['496'],           kind:'prosperity', severity:0.9, duration:50, label:'Genghis Khan unites the Mongol tribes', emoji:'🏹' },
        { year:1215,  target:['826'],           kind:'peace',      severity:0.9, duration:30, label:'Magna Carta signed at Runnymede', emoji:'📜' },
        { year:1227,  target:'central asia',    kind:'war',        severity:0.8, duration:40, label:'Mongol Empire reaches its widest expansion', emoji:'⚔' },
        { year:1241,  target:['616'],           kind:'war',        severity:0.8, duration:25, label:'Mongols sweep into Poland and Hungary', emoji:'🏹' },
        { year:1258,  target:['368'],           kind:'war',        severity:0.95,duration:30, label:'Mongols sack Baghdad — end of the Abbasid Caliphate', emoji:'🔥' },
        { year:1271,  target:['156'],           kind:'prosperity', severity:0.8, duration:40, label:'Kublai Khan founds the Yuan dynasty', emoji:'🐉' },
        { year:1279,  target:['156'],           kind:'war',        severity:0.7, duration:30, label:'Mongols complete conquest of Song China', emoji:'⚔' },
        { year:1291,  target:['756'],           kind:'peace',      severity:0.6, duration:30, label:'Swiss Confederation founded', emoji:'🤝' },
        { year:1299,  target:['792'],           kind:'prosperity', severity:0.9, duration:60, label:'Ottoman Empire founded', emoji:'☪' },
        { year:1325,  target:['484'],           kind:'prosperity', severity:0.8, duration:40, label:'Tenochtitlan founded by the Aztecs', emoji:'🏛' },
        { year:1347,  target:'europe',          kind:'plague',     severity:1.0, duration:120,label:'Black Death reaches Europe', emoji:'☠' },
        { year:1368,  target:['156'],           kind:'revolution', severity:0.8, duration:40, label:'Ming dynasty drives out the Mongols', emoji:'🐲' },
        { year:1378,  target:'europe',          kind:'revolution', severity:0.6, duration:40, label:'Western Schism — two popes in Christendom', emoji:'⛪' },
        { year:1381,  target:['826'],           kind:'revolution', severity:0.6, duration:25, label:'Peasants\' Revolt in England', emoji:'🔥' },

        // --- Early modern (1400 – 1760) ---
        { year:1405,  target:['156'],           kind:'innovation', severity:0.8, duration:50, label:'Zheng He\'s treasure fleets sail', emoji:'⛵' },
        { year:1410,  target:'europe',          kind:'war',        severity:0.7, duration:25, label:'Battle of Grunwald — Teutonic Knights broken', emoji:'⚔' },
        { year:1415,  target:['250'],           kind:'war',        severity:0.7, duration:25, label:'Battle of Agincourt', emoji:'🏹' },
        { year:1429,  target:['250'],           kind:'war',        severity:0.8, duration:30, label:'Joan of Arc lifts the siege of Orléans', emoji:'⚔' },
        { year:1441,  target:['620'],           kind:'migration',  severity:0.7, duration:60, label:'Transatlantic slave trade begins in earnest', emoji:'⛓' },
        { year:1469,  target:['356'],           kind:'innovation', severity:0.6, duration:30, label:'Guru Nanak, founder of Sikhism, is born', emoji:'📖' },
        { year:1473,  target:['616'],           kind:'innovation', severity:0.8, duration:30, label:'Copernicus is born', emoji:'🪐' },
        { year:1485,  target:['826'],           kind:'revolution', severity:0.6, duration:30, label:'Battle of Bosworth — Tudors rise in England', emoji:'👑' },
        { year:1487,  target:['620'],           kind:'migration',  severity:0.7, duration:30, label:'Bartolomeu Dias rounds the Cape of Good Hope', emoji:'⛵' },
        { year:1498,  target:['620'],           kind:'innovation', severity:0.8, duration:30, label:'Vasco da Gama reaches India by sea', emoji:'⛵' },
        { year:1499,  target:['380'],           kind:'innovation', severity:0.7, duration:30, label:'Leonardo da Vinci paints The Last Supper', emoji:'🎨' },
        { year:1509,  target:['380'],           kind:'innovation', severity:0.7, duration:30, label:'Michelangelo finishes the Sistine ceiling', emoji:'🎨' },
        { year:1520,  target:['792'],           kind:'prosperity', severity:0.8, duration:60, label:'Suleiman the Magnificent rules the Ottomans', emoji:'☪' },
        { year:1521,  target:['484'],           kind:'war',        severity:0.9, duration:30, label:'Fall of Tenochtitlan', emoji:'🔥' },
        { year:1522,  target:['724'],           kind:'innovation', severity:0.9, duration:30, label:'Magellan\'s expedition circumnavigates the Earth', emoji:'🌍' },
        { year:1526,  target:['356'],           kind:'war',        severity:0.8, duration:30, label:'Babur founds the Mughal Empire at Panipat', emoji:'⚔' },
        { year:1532,  target:['604'],           kind:'war',        severity:0.9, duration:30, label:'Pizarro conquers the Incas', emoji:'⚔' },
        { year:1543,  target:['380'],           kind:'innovation', severity:0.7, duration:30, label:'Vesalius publishes On the Fabric of the Human Body', emoji:'🧠' },
        { year:1545,  target:['068'],           kind:'prosperity', severity:0.7, duration:60, label:'Silver strike at Potosí reshapes the world economy', emoji:'💰' },
        { year:1558,  target:['826'],           kind:'prosperity', severity:0.7, duration:45, label:'Elizabeth I ascends the English throne', emoji:'👑' },
        { year:1564,  target:['826'],           kind:'festival',   severity:0.6, duration:30, label:'Shakespeare is born in Stratford', emoji:'✒' },
        { year:1600,  target:['826'],           kind:'prosperity', severity:0.7, duration:60, label:'English East India Company chartered', emoji:'⚖' },
        { year:1609,  target:['380'],           kind:'innovation', severity:0.9, duration:30, label:'Galileo turns his telescope to the sky', emoji:'🔭' },
        { year:1618,  target:'europe',          kind:'war',        severity:0.9, duration:120,label:'Thirty Years\' War begins', emoji:'⚔' },
        { year:1628,  target:['826'],           kind:'innovation', severity:0.7, duration:30, label:'Harvey describes the circulation of blood', emoji:'💓' },
        { year:1632,  target:['356'],           kind:'innovation', severity:0.7, duration:40, label:'Taj Mahal construction begins', emoji:'🕌' },
        { year:1636,  target:['840'],           kind:'innovation', severity:0.6, duration:30, label:'Harvard College founded', emoji:'🎓' },
        { year:1642,  target:['826'],           kind:'revolution', severity:0.8, duration:40, label:'English Civil War', emoji:'⚔' },
        { year:1644,  target:['156'],           kind:'revolution', severity:0.7, duration:30, label:'Qing dynasty takes Beijing', emoji:'🐲' },
        { year:1649,  target:['826'],           kind:'revolution', severity:0.8, duration:25, label:'Charles I beheaded', emoji:'⚔' },
        { year:1652,  target:['710'],           kind:'migration',  severity:0.6, duration:40, label:'Dutch establish Cape Town', emoji:'⛵' },
        { year:1661,  target:['250'],           kind:'prosperity', severity:0.7, duration:60, label:'Louis XIV begins personal rule — the Sun King', emoji:'☀' },
        { year:1676,  target:['528'],           kind:'innovation', severity:0.7, duration:30, label:'Van Leeuwenhoek sees microorganisms', emoji:'🔬' },
        { year:1683,  target:['040'],           kind:'war',        severity:0.7, duration:25, label:'Siege of Vienna halts Ottoman advance', emoji:'⚔' },
        { year:1688,  target:['826'],           kind:'revolution', severity:0.7, duration:30, label:'Glorious Revolution in England', emoji:'📜' },
        { year:1692,  target:['840'],           kind:'protest',    severity:0.5, duration:25, label:'Salem witch trials', emoji:'🔥' },
        { year:1700,  target:['643'],           kind:'war',        severity:0.7, duration:50, label:'Great Northern War begins', emoji:'⚔' },
        { year:1707,  target:['826'],           kind:'peace',      severity:0.6, duration:30, label:'Acts of Union unite England and Scotland', emoji:'🇬🇧' },
        { year:1712,  target:['826'],           kind:'innovation', severity:0.7, duration:30, label:'Newcomen\'s steam engine pumps water from mines', emoji:'⚙' },
        { year:1735,  target:['752'],           kind:'innovation', severity:0.6, duration:30, label:'Linnaeus systematizes nature in Systema Naturae', emoji:'🌿' },
        { year:1751,  target:['250'],           kind:'innovation', severity:0.8, duration:40, label:'Diderot\'s Encyclopédie begins publication', emoji:'📚' },
        { year:1756,  target:'europe',          kind:'war',        severity:0.9, duration:60, label:'Seven Years\' War — the first global war', emoji:'⚔' },

        // --- 1760 – 1900: industrial, independence, nationalisms ---
        { year:1764,  target:['826'],           kind:'innovation', severity:0.8, duration:40, label:'Spinning jenny — textile industry transformed', emoji:'🧵' },
        { year:1773,  target:['840'],           kind:'revolution', severity:0.7, duration:25, label:'Boston Tea Party', emoji:'🍵' },
        { year:1781,  target:['826'],           kind:'innovation', severity:0.9, duration:30, label:'Herschel discovers Uranus', emoji:'🪐' },
        { year:1783,  target:['250'],           kind:'innovation', severity:0.8, duration:30, label:'Montgolfier hot-air balloon flies', emoji:'🎈' },
        { year:1787,  target:['840'],           kind:'peace',      severity:0.9, duration:40, label:'United States Constitution signed', emoji:'📜' },
        { year:1791,  target:['276'],           kind:'festival',   severity:0.7, duration:30, label:'Mozart finishes The Magic Flute', emoji:'🎼' },
        { year:1796,  target:['826'],           kind:'innovation', severity:0.95,duration:40, label:'Jenner\'s smallpox vaccination', emoji:'💉' },
        { year:1799,  target:['818'],           kind:'innovation', severity:0.8, duration:30, label:'Rosetta Stone discovered', emoji:'📜' },
        { year:1803,  target:['840','250'],     kind:'prosperity', severity:0.8, duration:30, label:'Louisiana Purchase doubles the United States', emoji:'🗺' },
        { year:1807,  target:['826'],           kind:'peace',      severity:0.8, duration:40, label:'British Empire abolishes the slave trade', emoji:'🕊' },
        { year:1810,  target:['484'],           kind:'revolution', severity:0.8, duration:50, label:'Mexican War of Independence', emoji:'🔥' },
        { year:1812,  target:['840'],           kind:'war',        severity:0.7, duration:40, label:'War of 1812', emoji:'⚔' },
        { year:1815,  target:['250'],           kind:'war',        severity:0.9, duration:25, label:'Battle of Waterloo', emoji:'⚔' },
        { year:1821,  target:['300'],           kind:'revolution', severity:0.8, duration:40, label:'Greek War of Independence', emoji:'🔥' },
        { year:1822,  target:['076'],           kind:'peace',      severity:0.7, duration:30, label:'Brazil becomes an independent empire', emoji:'🕊' },
        { year:1824,  target:['276'],           kind:'festival',   severity:0.8, duration:30, label:'Beethoven\'s Ninth Symphony premieres', emoji:'🎼' },
        { year:1831,  target:['826'],           kind:'innovation', severity:0.9, duration:30, label:'Faraday discovers electromagnetic induction', emoji:'⚡' },
        { year:1833,  target:['826'],           kind:'peace',      severity:0.8, duration:40, label:'Slavery Abolition Act across the British Empire', emoji:'🕊' },
        { year:1837,  target:['840'],           kind:'innovation', severity:0.8, duration:40, label:'Morse demonstrates the telegraph', emoji:'📡' },
        { year:1839,  target:['250'],           kind:'innovation', severity:0.7, duration:30, label:'Daguerreotype — photography is born', emoji:'📷' },
        { year:1840,  target:['554'],           kind:'peace',      severity:0.6, duration:30, label:'Treaty of Waitangi signed', emoji:'🤝' },
        { year:1845,  target:['372'],           kind:'plague',     severity:0.9, duration:80, label:'Great Famine begins in Ireland', emoji:'🥔' },
        { year:1854,  target:['826'],           kind:'innovation', severity:0.7, duration:30, label:'John Snow traces cholera in Soho — epidemiology', emoji:'💧' },
        { year:1863,  target:['840'],           kind:'peace',      severity:0.8, duration:30, label:'Emancipation Proclamation', emoji:'🕊' },
        { year:1865,  target:['203'],           kind:'innovation', severity:0.8, duration:30, label:'Mendel publishes his laws of inheritance', emoji:'🌱' },
        { year:1866,  target:['380','276'],     kind:'war',        severity:0.6, duration:25, label:'Austro-Prussian War', emoji:'⚔' },
        { year:1867,  target:['124'],           kind:'peace',      severity:0.7, duration:30, label:'Canadian Confederation', emoji:'🍁' },
        { year:1869,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'First Transcontinental Railroad completed', emoji:'🚂' },
        { year:1870,  target:['380'],           kind:'peace',      severity:0.7, duration:30, label:'Italy unified', emoji:'🇮🇹' },
        { year:1871,  target:['276'],           kind:'peace',      severity:0.7, duration:30, label:'Germany unified under the Prussian crown', emoji:'🇩🇪' },
        { year:1874,  target:['250'],           kind:'festival',   severity:0.6, duration:25, label:'First Impressionist exhibition in Paris', emoji:'🎨' },
        { year:1876,  target:['156'],           kind:'drought',    severity:0.9, duration:80, label:'Great Famine devastates northern China', emoji:'🌾' },
        { year:1879,  target:['276'],           kind:'innovation', severity:0.8, duration:30, label:'First commercial electric railway', emoji:'🚃' },
        { year:1885,  target:['276'],           kind:'innovation', severity:0.8, duration:30, label:'Benz builds the first modern automobile', emoji:'🚗' },
        { year:1886,  target:['840'],           kind:'innovation', severity:0.6, duration:30, label:'Coca-Cola invented in Atlanta', emoji:'🥤' },
        { year:1887,  target:['250'],           kind:'innovation', severity:0.6, duration:30, label:'Esperanto launched as a universal language', emoji:'🗣' },
        { year:1888,  target:['826'],           kind:'innovation', severity:0.7, duration:30, label:'Dunlop patents the pneumatic tire', emoji:'🛞' },
        { year:1890,  target:['276'],           kind:'innovation', severity:0.8, duration:30, label:'Rudolf Diesel patents the diesel engine', emoji:'⚙' },
        { year:1893,  target:['554'],           kind:'peace',      severity:0.8, duration:30, label:'New Zealand — first country to grant women the vote', emoji:'🗳' },
        { year:1895,  target:['276'],           kind:'innovation', severity:0.9, duration:30, label:'Röntgen discovers X-rays', emoji:'🩻' },
        { year:1898,  target:['250'],           kind:'innovation', severity:0.9, duration:30, label:'Marie and Pierre Curie isolate radium', emoji:'☢' },
        { year:1899,  target:['710'],           kind:'war',        severity:0.8, duration:50, label:'Second Boer War begins', emoji:'⚔' },

        // --- 20th century: wars, tech, culture, movements ---
        { year:1900,  target:['276'],           kind:'innovation', severity:0.8, duration:30, label:'Planck introduces the quantum', emoji:'⚛' },
        { year:1900,  target:['156'],           kind:'revolution', severity:0.7, duration:30, label:'Boxer Rebellion', emoji:'🥋' },
        { year:1901,  target:['752'],           kind:'festival',   severity:0.7, duration:30, label:'First Nobel Prizes awarded', emoji:'🏅' },
        { year:1904,  target:['392','643'],     kind:'war',        severity:0.8, duration:40, label:'Russo-Japanese War', emoji:'⚔' },
        { year:1908,  target:['643'],           kind:'meteor',     severity:0.9, duration:20, label:'Tunguska event flattens Siberian forest', emoji:'☄' },
        { year:1908,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'Ford Model T rolls off the line', emoji:'🚗' },
        { year:1910,  target:['484'],           kind:'revolution', severity:0.8, duration:50, label:'Mexican Revolution', emoji:'🔥' },
        { year:1910,  target:['710'],           kind:'peace',      severity:0.7, duration:30, label:'Union of South Africa formed', emoji:'🤝' },
        { year:1911,  target:['604'],           kind:'innovation', severity:0.7, duration:30, label:'Hiram Bingham rediscovers Machu Picchu', emoji:'⛰' },
        { year:1912,  target:['578'],           kind:'innovation', severity:0.7, duration:30, label:'Amundsen reaches the South Pole', emoji:'🏔' },
        { year:1913,  target:['276'],           kind:'innovation', severity:0.7, duration:30, label:'Bohr model of the atom', emoji:'⚛' },
        { year:1916,  target:'europe',          kind:'war',        severity:0.95,duration:90, label:'Battles of the Somme and Verdun', emoji:'💣' },
        { year:1917,  target:['376'],           kind:'peace',      severity:0.7, duration:30, label:'Balfour Declaration', emoji:'📜' },
        { year:1919,  target:'europe',          kind:'peace',      severity:0.8, duration:40, label:'Treaty of Versailles', emoji:'📜' },
        { year:1921,  target:['372'],           kind:'peace',      severity:0.7, duration:30, label:'Irish Free State declared', emoji:'🤝' },
        { year:1922,  target:['380'],           kind:'revolution', severity:0.8, duration:30, label:'Mussolini\'s March on Rome', emoji:'🪖' },
        { year:1922,  target:['826'],           kind:'innovation', severity:0.8, duration:30, label:'Howard Carter opens Tutankhamun\'s tomb', emoji:'👑' },
        { year:1923,  target:['792'],           kind:'revolution', severity:0.7, duration:30, label:'Republic of Türkiye founded', emoji:'🇹🇷' },
        { year:1927,  target:['840'],           kind:'innovation', severity:0.8, duration:30, label:'Lindbergh flies solo across the Atlantic', emoji:'✈' },
        { year:1927,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'First sound film — The Jazz Singer', emoji:'🎬' },
        { year:1930,  target:['356'],           kind:'protest',    severity:0.8, duration:40, label:'Gandhi\'s Salt March', emoji:'✊' },
        { year:1933,  target:['276'],           kind:'revolution', severity:1.0, duration:40, label:'Hitler appointed Chancellor of Germany', emoji:'🪖' },
        { year:1936,  target:['276'],           kind:'festival',   severity:0.6, duration:25, label:'Berlin Olympics — Jesse Owens wins four golds', emoji:'🏅' },
        { year:1937,  target:['156'],           kind:'war',        severity:1.0, duration:80, label:'Second Sino-Japanese War / Nanjing massacre', emoji:'⚔' },
        { year:1938,  target:['276'],           kind:'migration',  severity:0.9, duration:40, label:'Kristallnacht', emoji:'🔥' },
        { year:1940,  target:['826'],           kind:'war',        severity:0.95,duration:60, label:'Battle of Britain', emoji:'✈' },
        { year:1941,  target:['840'],           kind:'war',        severity:1.0, duration:40, label:'Attack on Pearl Harbor', emoji:'💣' },
        { year:1942,  target:['643'],           kind:'war',        severity:1.0, duration:60, label:'Battle of Stalingrad', emoji:'⚔' },
        { year:1944,  target:['250'],           kind:'war',        severity:0.95,duration:40, label:'D-Day landings in Normandy', emoji:'⚓' },
        { year:1945,  target:'world',           kind:'peace',      severity:0.9, duration:60, label:'United Nations founded', emoji:'🕊' },
        { year:1946,  target:['392'],           kind:'innovation', severity:0.7, duration:30, label:'Japan adopts a peace constitution', emoji:'📜' },
        { year:1947,  target:['840'],           kind:'innovation', severity:0.95,duration:30, label:'Transistor invented at Bell Labs', emoji:'💾' },
        { year:1948,  target:['840'],           kind:'peace',      severity:0.8, duration:30, label:'Marshall Plan rebuilds Europe', emoji:'🤝' },
        { year:1948,  target:'world',           kind:'peace',      severity:0.9, duration:30, label:'Universal Declaration of Human Rights', emoji:'🕊' },
        { year:1948,  target:['710'],           kind:'revolution', severity:0.9, duration:60, label:'Apartheid instituted in South Africa', emoji:'⚔' },
        { year:1950,  target:['156','408'],     kind:'war',        severity:0.9, duration:60, label:'Korean War begins', emoji:'⚔' },
        { year:1953,  target:['826'],           kind:'innovation', severity:0.95,duration:30, label:'Watson and Crick describe DNA\'s double helix', emoji:'🧬' },
        { year:1954,  target:['840'],           kind:'peace',      severity:0.8, duration:30, label:'Brown v. Board of Education', emoji:'⚖' },
        { year:1955,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'Salk\'s polio vaccine approved', emoji:'💉' },
        { year:1956,  target:['818'],           kind:'war',        severity:0.7, duration:30, label:'Suez Crisis', emoji:'⚔' },
        { year:1957,  target:'europe',          kind:'peace',      severity:0.8, duration:40, label:'Treaty of Rome — European Community', emoji:'🇪🇺' },
        { year:1960,  target:['192'],           kind:'innovation', severity:0.7, duration:30, label:'First laser demonstrated', emoji:'💡' },
        { year:1962,  target:'world',           kind:'war',        severity:0.95,duration:20, label:'Cuban Missile Crisis', emoji:'☢' },
        { year:1963,  target:['840'],           kind:'war',        severity:0.9, duration:20, label:'JFK assassinated in Dallas', emoji:'🕯' },
        { year:1964,  target:['840'],           kind:'peace',      severity:0.9, duration:40, label:'Civil Rights Act signed', emoji:'🕊' },
        { year:1966,  target:['156'],           kind:'revolution', severity:0.95,duration:100,label:'Cultural Revolution', emoji:'🔥' },
        { year:1967,  target:['710'],           kind:'innovation', severity:0.7, duration:30, label:'First human heart transplant in Cape Town', emoji:'❤' },
        { year:1968,  target:['250'],           kind:'protest',    severity:0.7, duration:30, label:'May 1968 protests', emoji:'✊' },
        { year:1969,  target:['840'],           kind:'innovation', severity:0.8, duration:30, label:'ARPANET — the internet\'s first nodes', emoji:'🌐' },
        { year:1970,  target:['826'],           kind:'festival',   severity:0.6, duration:25, label:'The Beatles break up', emoji:'🎸' },
        { year:1973,  target:['840'],           kind:'peace',      severity:0.8, duration:30, label:'Roe v. Wade', emoji:'⚖' },
        { year:1973,  target:['152'],           kind:'revolution', severity:0.8, duration:30, label:'Pinochet coup in Chile', emoji:'🪖' },
        { year:1974,  target:['840'],           kind:'revolution', severity:0.8, duration:30, label:'Nixon resigns over Watergate', emoji:'📰' },
        { year:1975,  target:['704'],           kind:'peace',      severity:0.8, duration:30, label:'Saigon falls — Vietnam War ends', emoji:'🕊' },
        { year:1975,  target:['116'],           kind:'war',        severity:1.0, duration:40, label:'Khmer Rouge seize Cambodia', emoji:'💀' },
        { year:1977,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'Voyager probes launch', emoji:'🛰' },
        { year:1977,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'Star Wars hits theaters', emoji:'⭐' },
        { year:1980,  target:['608'],           kind:'peace',      severity:0.7, duration:30, label:'Smallpox declared eradicated', emoji:'💉' },
        { year:1981,  target:['840'],           kind:'innovation', severity:0.8, duration:30, label:'IBM launches the personal computer', emoji:'💻' },
        { year:1982,  target:['032','826'],     kind:'war',        severity:0.7, duration:30, label:'Falklands War', emoji:'⚔' },
        { year:1984,  target:['356'],           kind:'flood',      severity:0.9, duration:40, label:'Bhopal gas tragedy', emoji:'☣' },
        { year:1987,  target:'world',           kind:'peace',      severity:0.8, duration:30, label:'Montreal Protocol — ozone layer agreement', emoji:'🌍' },
        { year:1988,  target:['703'],           kind:'innovation', severity:0.7, duration:30, label:'Global Positioning System goes online', emoji:'📍' },
        { year:1988,  target:['586'],           kind:'peace',      severity:0.6, duration:30, label:'Benazir Bhutto — first woman PM in a Muslim nation', emoji:'🕊' },
        { year:1990,  target:['756'],           kind:'innovation', severity:0.95,duration:30, label:'Tim Berners-Lee publishes the World Wide Web proposal', emoji:'🌐' },
        { year:1990,  target:['368'],           kind:'war',        severity:0.8, duration:40, label:'Iraq invades Kuwait → Gulf War', emoji:'⚔' },
        { year:1993,  target:'europe',          kind:'peace',      severity:0.8, duration:40, label:'European Union established by Maastricht Treaty', emoji:'🇪🇺' },
        { year:1995,  target:['070'],           kind:'peace',      severity:0.7, duration:30, label:'Dayton Accords end the Bosnian War', emoji:'🤝' },
        { year:1995,  target:['392'],           kind:'earthquake', severity:0.9, duration:30, label:'Great Hanshin earthquake devastates Kobe', emoji:'🌐' },
        { year:1996,  target:['156'],           kind:'innovation', severity:0.7, duration:30, label:'First successful mammalian clone: Dolly', emoji:'🐑' },
        { year:1998,  target:['826'],           kind:'peace',      severity:0.8, duration:30, label:'Good Friday Agreement', emoji:'🕊' },
        { year:1998,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'Google incorporated', emoji:'🔎' },
        { year:1999,  target:['360'],           kind:'peace',      severity:0.7, duration:30, label:'East Timor votes for independence', emoji:'🕊' },

        // --- 21st century: tech, climate, conflict ---
        { year:2000,  target:'world',           kind:'innovation', severity:0.6, duration:25, label:'Y2K scare fizzles harmlessly at midnight', emoji:'💾' },
        { year:2000,  target:['826'],           kind:'innovation', severity:0.8, duration:30, label:'Human Genome Project first draft', emoji:'🧬' },
        { year:2002,  target:'europe',          kind:'prosperity', severity:0.7, duration:30, label:'Euro notes enter circulation', emoji:'💶' },
        { year:2003,  target:['826'],           kind:'protest',    severity:0.7, duration:25, label:'Largest global anti-war protest', emoji:'✊' },
        { year:2005,  target:['840'],           kind:'hurricane',  severity:1.0, duration:35, label:'Hurricane Katrina devastates New Orleans', emoji:'🌀' },
        { year:2005,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'YouTube launches', emoji:'📹' },
        { year:2006,  target:['840'],           kind:'innovation', severity:0.6, duration:30, label:'Twitter appears', emoji:'🐦' },
        { year:2008,  target:['156'],           kind:'festival',   severity:0.7, duration:25, label:'Beijing Summer Olympics', emoji:'🏅' },
        { year:2008,  target:['356'],           kind:'war',        severity:0.85,duration:30, label:'Mumbai terror attacks', emoji:'💥' },
        { year:2009,  target:['840'],           kind:'peace',      severity:0.7, duration:30, label:'Obama inaugurated; Nobel Peace Prize', emoji:'🕊' },
        { year:2010,  target:['152'],           kind:'innovation', severity:0.7, duration:25, label:'Chilean miners rescued after 69 days', emoji:'⛏' },
        { year:2011,  target:['760'],           kind:'war',        severity:0.95,duration:100,label:'Syrian Civil War begins', emoji:'⚔' },
        { year:2011,  target:['434'],           kind:'revolution', severity:0.8, duration:40, label:'NATO intervention in Libya; Gaddafi falls', emoji:'🔥' },
        { year:2011,  target:['840'],           kind:'war',        severity:0.8, duration:20, label:'Osama bin Laden killed in Abbottabad', emoji:'⚔' },
        { year:2012,  target:['840'],           kind:'innovation', severity:0.8, duration:30, label:'NASA\'s Curiosity rover lands on Mars', emoji:'🚀' },
        { year:2012,  target:'world',           kind:'innovation', severity:0.8, duration:30, label:'Higgs boson detected at CERN', emoji:'⚛' },
        { year:2013,  target:['356'],           kind:'revolution', severity:0.7, duration:30, label:'Chelyabinsk meteor over Russia', emoji:'☄' },
        { year:2014,  target:'west africa',     kind:'plague',     severity:0.9, duration:80, label:'Ebola outbreak in West Africa', emoji:'☣' },
        { year:2015,  target:'world',           kind:'peace',      severity:0.9, duration:40, label:'Paris Agreement on climate change', emoji:'🌍' },
        { year:2015,  target:['250'],           kind:'war',        severity:0.8, duration:25, label:'Paris terror attacks', emoji:'🕯' },
        { year:2017,  target:['608'],           kind:'protest',    severity:0.7, duration:30, label:'#MeToo movement spreads globally', emoji:'✊' },
        { year:2017,  target:['840'],           kind:'innovation', severity:0.6, duration:30, label:'Reusable rocket first stages land routinely', emoji:'🚀' },
        { year:2018,  target:['826'],           kind:'peace',      severity:0.6, duration:30, label:'GDPR takes effect', emoji:'🔒' },
        { year:2019,  target:['076'],           kind:'wildfire',   severity:0.9, duration:60, label:'Amazon fires spike globally', emoji:'🔥' },
        { year:2019,  target:['036'],           kind:'wildfire',   severity:0.95,duration:80, label:'Australia\'s Black Summer bushfires', emoji:'🔥' },
        { year:2020,  target:['840'],           kind:'innovation', severity:0.7, duration:30, label:'SpaceX Crew Dragon carries astronauts to the ISS', emoji:'🚀' },
        { year:2021,  target:['566'],           kind:'innovation', severity:0.7, duration:30, label:'James Webb Space Telescope launches', emoji:'🔭' },
        { year:2022,  target:['484'],           kind:'drought',    severity:0.8, duration:60, label:'Megadrought across the American West', emoji:'🏜' },
        { year:2022,  target:['392'],           kind:'war',        severity:0.7, duration:25, label:'Shinzo Abe assassinated', emoji:'🕯' },
        { year:2022,  target:['364'],           kind:'protest',    severity:0.9, duration:60, label:'Mahsa Amini protests sweep Iran', emoji:'✊' },
        { year:2023,  target:['792'],           kind:'earthquake', severity:1.0, duration:40, label:'Turkey-Syria earthquake kills tens of thousands', emoji:'🌐' },
        { year:2023,  target:['376'],           kind:'war',        severity:1.0, duration:90, label:'October 7 attacks; Gaza war begins', emoji:'⚔' },
        { year:2024,  target:'world',           kind:'festival',   severity:0.7, duration:30, label:'Paris Summer Olympics', emoji:'🏅' },
        { year:2024,  target:['840'],           kind:'revolution', severity:0.8, duration:30, label:'Trump returns to the White House', emoji:'🇺🇸' },
        { year:2025,  target:'world',           kind:'innovation', severity:0.8, duration:40, label:'AI agents enter everyday workflows', emoji:'🤖' },
        { year:2025,  target:['360'],           kind:'volcano',    severity:0.7, duration:30, label:'Mt. Lewotobi erupts in Indonesia', emoji:'🌋' },
        { year:2026,  target:'world',           kind:'festival',   severity:0.7, duration:30, label:'FIFA World Cup across USA, Canada, Mexico', emoji:'⚽' },
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
