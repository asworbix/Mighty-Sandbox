/* =========================================================
   narrator.js — Gaia's voice. Turns events and world state
   into short, evocative prose for the chronicle log.
   ========================================================= */

const Narrator = (() => {

    const TEMPLATES = {
        earthquake: [
            "The ground shudders beneath {place}.",
            "An earthquake rolls across {place}; walls crack and pigeons scatter.",
            "Seismographs in {place} jolt awake at once.",
            "{name} clutches a doorframe as {place} trembles.",
        ],
        tsunami: [
            "A wall of water races toward {place}.",
            "Sirens wail along {place}'s coast.",
            "{name} watches the sea retreat before it returns.",
        ],
        volcano: [
            "A plume of ash rises over {place}.",
            "The sky above {place} turns amber with volcanic glow.",
            "{name} tastes sulfur in the wind.",
        ],
        flood: [
            "Rivers swell {place}. Streets become streams.",
            "{name} wades home through knee-high water.",
        ],
        drought: [
            "The wells {place} run dry.",
            "{name} rations water by candle-light.",
            "Crops wither under an unforgiving sun {place}.",
        ],
        hurricane: [
            "A hurricane coils over {place}.",
            "{name} boards up windows as the wind howls.",
        ],
        tornado: [
            "A tornado touches down {place}.",
            "{name} crouches in the storm cellar, counting breaths.",
        ],
        wildfire: [
            "Smoke pools orange over {place}.",
            "{name} watches embers drift like slow snow.",
        ],
        blizzard: [
            "A blizzard swallows {place}.",
            "{name} shovels snow that has already returned.",
        ],
        storm: [
            "Thunder rolls across {place}.",
            "{name} lights a candle as the lights flicker.",
        ],
        meteor: [
            "A streak of fire tears the sky above {place}.",
            "Every clock {place} seems to stop at once.",
        ],

        prosperity: [
            "A warmth spreads {place}. Workshops hum, markets thrive.",
            "{name} notices strangers smiling more {place} today.",
        ],
        peace: [
            "Guns go quiet {place}. Someone sings, softly.",
            "{name} crosses a border that once was a wound.",
        ],
        healing: [
            "Fevers break {place}. The clinics empty.",
            "{name} embraces a parent they thought they'd lost.",
        ],
        miracle: [
            "Something unexplained happens {place}. Scholars will argue for a century.",
            "{name} will tell their grandchildren about this day.",
        ],
        festival: [
            "Music spills from every street {place}.",
            "{name} dances with a stranger as lanterns rise.",
        ],
        harvest: [
            "The fields {place} bow with grain.",
            "{name}'s table is crowded with friends tonight.",
        ],
        innovation: [
            "An idea {place} will change how the world works.",
            "{name} reads the news three times, then smiles.",
        ],
        baby_boom: [
            "Hospitals {place} buzz with new arrivals.",
            "{name} chooses a name that will echo for generations.",
        ],

        war: [
            "War comes to {place}. The old arguments are made loud with steel.",
            "{name} learns the sound of a siren at midnight.",
        ],
        revolution: [
            "The streets {place} fill with chants.",
            "{name} carries a flag older than their country.",
        ],
        protest: [
            "A march threads through {place}.",
            "{name} hands a flower to a soldier.",
        ],
        migration: [
            "Families leave {place} with what they can carry.",
            "{name} packs a photograph and closes the door for the last time.",
        ],

        plague: [
            "A sickness walks through {place}.",
            "{name} leaves bread on a neighbor's step and hurries away.",
        ],

        rain: [
            "Rain falls softly {place}. The dust settles.",
            "{name} breathes petrichor and smiles.",
        ],
        snow: [
            "Snow sifts down over {place}.",
            "{name} traces a window with one finger.",
        ],
        sunshine: [
            "Sun breaks through clouds {place}.",
            "{name} tilts their face upward.",
        ],
        rainbow: [
            "A rainbow arcs {place}.",
            "{name} points at the sky and everyone looks.",
        ],
        fog: [
            "A soft fog drapes {place}.",
            "{name} hears church bells long before seeing them.",
        ],

        aurora: [
            "Green light curtains the sky above {place}.",
            "{name} wakes the children to see it.",
        ],
        eclipse: [
            "Daylight bruises {place}. An eclipse is underway.",
            "{name} squints through a pinhole in cardboard.",
        ],
        ufo: [
            "Something unidentified hovers over {place}.",
            "{name} films it with trembling hands.",
        ],
        zombies: [
            "The unquiet dead walk {place}. Doors are barred.",
            "{name} sharpens whatever they can find.",
        ],
        dragons: [
            "Great shapes are seen wheeling over {place}.",
            "{name} swears they felt warm wind from wings.",
        ],
        dance: [
            "An impromptu dance erupts {place}.",
            "{name} forgets the song but remembers the laughter.",
        ],
        nightfall: [
            "Night folds over {place}.",
            "{name} lights a single lamp.",
        ],
        sunrise: [
            "The first light of dawn finds {place}.",
            "{name} sets water to boil.",
        ],
    };

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function describePlace(ev) {
        if (!ev.targets || !ev.targets.length) return 'somewhere on Earth';
        if (ev.targets.length > 20) return 'across the world';
        if (ev.targets.length > 6)  return 'across a wide region';
        const names = ev.targets.slice(0, 3).map(id => COUNTRIES[id]?.name).filter(Boolean);
        if (!names.length) return 'somewhere on Earth';
        if (names.length === 1) return 'in ' + names[0];
        if (names.length === 2) return 'between ' + names.join(' and ');
        return 'from ' + names[0] + ' to ' + names[names.length-1];
    }

    function pickPerson(ev) {
        if (!ev.targets || !ev.targets.length) return Population.randomPerson();
        const id = ev.targets[Math.floor(Math.random() * ev.targets.length)];
        const p = Population.randomInCountry(id);
        return p || Population.randomPerson();
    }

    function narrate(ev) {
        const lines = TEMPLATES[ev.kind] || ['{place} feels different tonight.'];
        const tmpl = pick(lines);
        const place = describePlace(ev);
        const person = pickPerson(ev);
        const name = person ? person.name : 'A stranger';
        return tmpl.replace('{place}', place).replace('{name}', name);
    }

    /* Short headline-style version */
    function headline(ev) {
        const place = describePlace(ev);
        const label = ev.label || ev.kind;
        return `${ev.emoji || '•'} ${label} · ${place}`;
    }

    /* Era arrival voice-over */
    function eraIntro(era) {
        return `${era.name} — ${era.mood}`;
    }

    return { narrate, headline, eraIntro };
})();
