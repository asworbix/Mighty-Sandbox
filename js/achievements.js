/* =========================================================
   achievements.js — small unlock system that rewards
   exploration. Saves to localStorage.
   ========================================================= */

const Achievements = (() => {
    const KEY = 'gaia.achievements.v1';

    const LIST = [
        { id:'first',       title:'First Whisper',        desc:'Send your first prompt.' },
        { id:'disaster',    title:'Wrath of the Earth',   desc:'Trigger a natural disaster.' },
        { id:'blessing',    title:'Benevolent Hand',      desc:'Bless a country with prosperity, peace, or healing.' },
        { id:'world',       title:'Hand Across the World',desc:'Affect the entire world at once.' },
        { id:'continental', title:'Continental Drift',    desc:'Affect an entire continent.' },
        { id:'time_past',   title:'Ghost of History',     desc:'Travel to a date before 1900.' },
        { id:'time_future', title:'Glimpse of Tomorrow',  desc:'Travel to a date after 2050.' },
        { id:'ancient',     title:'Where the Pyramids Rise', desc:'Witness a historical event in antiquity.' },
        { id:'war',         title:'Cry Havoc',            desc:'Summon war somewhere on Earth.' },
        { id:'peace',       title:'Dove in the Doorway',  desc:'Bring peace to a country at war.' },
        { id:'plague',      title:'The Long Shadow',      desc:'Unleash a plague (and let it end).' },
        { id:'aurora',      title:'Ribbon in the Sky',    desc:'Summon an aurora.' },
        { id:'ufo',         title:'They Are Not Alone',   desc:'Summon a UFO.' },
        { id:'ten',         title:'Ten-Fold',             desc:'Trigger ten events in a single session.' },
        { id:'fifty',       title:'Demiurge',             desc:'Trigger fifty events in a single session.' },
        { id:'century',     title:'A Century in a Minute',desc:'Let the simulation run 100 sim-years at 168× speed.' },
        { id:'midnight',    title:'Midnight Thinker',     desc:'Watch the world at 24× with no events for two full minutes.' },
        { id:'tour',        title:'Grand Tour',           desc:'Click 20 different countries.' },
    ];

    let state = {};

    function load() {
        try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); }
        catch(e) { state = {}; }
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(state)); }
        catch(e) {}
    }

    function has(id) { return !!state[id]; }

    function unlock(id) {
        if (state[id]) return null;
        const entry = LIST.find(a => a.id === id);
        if (!entry) return null;
        state[id] = Date.now();
        save();
        toast(entry);
        return entry;
    }

    function toast(a) {
        const el = document.createElement('div');
        el.className = 'achv-toast';
        el.innerHTML = `
            <div class="achv-ic">🏆</div>
            <div class="achv-text">
                <div class="achv-t">${a.title}</div>
                <div class="achv-d">${a.desc}</div>
            </div>
        `;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 500);
        }, 4200);
    }

    /* Counters */
    const counters = {
        events: 0,
        countriesClicked: new Set(),
        simYearsAt168: 0,
        quietAt24ms: 0,
    };

    function noteEvent(ev) {
        counters.events++;
        if (counters.events >= 10) unlock('ten');
        if (counters.events >= 50) unlock('fifty');
        if (['earthquake','tsunami','volcano','flood','drought','hurricane','tornado','wildfire','blizzard','meteor'].includes(ev.kind)) unlock('disaster');
        if (['prosperity','peace','healing','miracle','festival','harvest','innovation','baby_boom'].includes(ev.kind)) unlock('blessing');
        if (ev.kind === 'war') unlock('war');
        if (ev.kind === 'peace') unlock('peace');
        if (ev.kind === 'plague') unlock('plague');
        if (ev.kind === 'aurora') unlock('aurora');
        if (ev.kind === 'ufo') unlock('ufo');
        if (ev.targets && ev.targets.length >= ALL_COUNTRY_IDS.length - 2) unlock('world');
        else if (ev.targets && ev.targets.length >= 20) unlock('continental');
        if (ev.historical && ev.year && ev.year < 500) unlock('ancient');
    }

    function noteTravel(year) {
        if (year < 1900) unlock('time_past');
        if (year > 2050) unlock('time_future');
    }

    function noteClick(countryId) {
        if (!countryId) return;
        counters.countriesClicked.add(countryId);
        if (counters.countriesClicked.size >= 20) unlock('tour');
    }

    return {
        LIST,
        load, save,
        has, unlock,
        noteEvent, noteTravel, noteClick,
        get state() { return state; },
        get counters() { return counters; },
    };
})();
