/* =========================================================
   quests.js — rotating objectives that gently guide new
   users. Each quest is a predicate on (event, world) that
   marks itself completed when satisfied. Persisted to
   localStorage so it isn't noisy between sessions.
   ========================================================= */

const Quests = (() => {
    const KEY = 'gaia.quests.v1';

    const LIST = [
        { id:'q_quake',  text:'Trigger an earthquake anywhere.',
          match:(ev) => ev.kind === 'earthquake' },
        { id:'q_festival_brazil', text:'Throw a festival in Brazil.',
          match:(ev) => ev.kind === 'festival' && ev.targets.includes('076') },
        { id:'q_travel_60s', text:'Travel to the 1960s.',
          match:(ev, ctx) => ctx.kind === 'travel' && ctx.year >= 1960 && ctx.year < 1970 },
        { id:'q_bless_africa', text:'Bless Africa with prosperity or peace.',
          match:(ev) => ['prosperity','peace','healing','miracle'].includes(ev.kind)
                      && ev.targets.some(id => COUNTRIES[id]?.continent === 'africa') },
        { id:'q_plague_end', text:'Let a plague run its course.',
          match:(ev, ctx) => ctx.kind === 'event_end' && ev.kind === 'plague' },
        { id:'q_globe', text:'Try the globe projection.',
          match:(_, ctx) => ctx.kind === 'globe' },
        { id:'q_aurora', text:'Summon an aurora.',
          match:(ev) => ev.kind === 'aurora' },
        { id:'q_war_peace', text:'End a war with a wave of peace.',
          match:(ev) => ev.kind === 'peace' && ev.targets.length >= 3 },
        { id:'q_click_20', text:'Click 20 different countries.',
          match:(_, ctx) => ctx.kind === 'click_tour' },
        { id:'q_1969', text:'Land on the Moon (travel to 1969).',
          match:(_, ctx) => ctx.kind === 'travel' && ctx.year === 1969 },
        { id:'q_worldwide', text:'Affect the entire world at once.',
          match:(ev) => (ev.targets?.length || 0) >= ALL_COUNTRY_IDS.length - 2 },
        { id:'q_ancient', text:'Travel to antiquity (before 500 CE).',
          match:(_, ctx) => ctx.kind === 'travel' && ctx.year < 500 },
    ];

    let completed = {};
    let activeIds = [];

    function load() {
        try { completed = JSON.parse(localStorage.getItem(KEY) || '{}'); }
        catch(e) { completed = {}; }
        pickThree();
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(completed)); } catch(e) {}
    }

    function pickThree() {
        const pool = LIST.filter(q => !completed[q.id]);
        if (pool.length === 0) { activeIds = []; return; }
        const picks = [];
        const copy = pool.slice();
        while (picks.length < 3 && copy.length) {
            const i = Math.floor(Math.random() * copy.length);
            picks.push(copy.splice(i, 1)[0]);
        }
        activeIds = picks.map(q => q.id);
        render();
    }

    function trigger(ev, ctx = {}) {
        if (activeIds.length === 0) return;
        for (const qid of activeIds.slice()) {
            const q = LIST.find(x => x.id === qid);
            if (!q) continue;
            let ok = false;
            try { ok = q.match(ev, ctx); } catch(e) {}
            if (ok) {
                completed[q.id] = Date.now();
                activeIds = activeIds.filter(x => x !== qid);
                save();
                if (typeof UI !== 'undefined' && UI.log) {
                    UI.log(`<b>Objective complete</b> — ${q.text}`, 'good');
                }
                if (activeIds.length === 0) pickThree();
                else render();
            }
        }
    }

    function render() {
        const el = document.getElementById('questList');
        if (!el) return;
        el.innerHTML = '';
        for (const id of activeIds) {
            const q = LIST.find(x => x.id === id);
            if (!q) continue;
            const li = document.createElement('li');
            li.className = 'quest-item';
            li.innerHTML = `<span class="quest-bullet">◇</span>${q.text}`;
            el.appendChild(li);
        }
    }

    return { load, trigger, render, get active() { return activeIds.map(id => LIST.find(q => q.id === id)); } };
})();
