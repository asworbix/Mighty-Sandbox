/* =========================================================
   cultures.js — cultural profiles that drive behavior,
   names, activities, aesthetics across regions of the world.
   ========================================================= */

const CULTURES = {
    western_european: {
        id: 'western_european',
        name: 'Western European',
        color: '#7aa2ff',
        firstNames: ['Anna','Lucas','Sophie','Mateo','Clara','Liam','Emma','Luca','Noa','Pierre','Elena','Marco','Léa','Ben','Olivia','Jonas','Eva','Henrik','Iris','Theo'],
        lastNames: ['Müller','Martin','Rossi','Silva','Smith','Dubois','Fernandez','Bauer','Romano','Bernard','Andersen','Jansen','Novak','Kowalski'],
        activities: {
            morning: ['sipping espresso at a tiny café','cycling along cobblestone lanes','buying fresh bread from the bakery','walking a dog through a misty park'],
            midday:  ['taking a long lunch with friends','strolling through a plaza','working in a glass-walled office','reading in a sunlit courtyard'],
            evening: ['having aperitivo on a rooftop','playing chess by a fountain','watching a film in an old cinema','dining by candlelight'],
            night:   ['closing a jazz bar','dreaming of summer in Provence','scrolling through the news','cozy under linen sheets'],
        },
        greeting: 'Bonjour', music: 'chanson', signature: '☕',
    },
    nordic: {
        id: 'nordic', name: 'Nordic', color: '#9fd8ff',
        firstNames: ['Astrid','Eirik','Freya','Henrik','Liv','Sven','Ingrid','Magnus','Saga','Oskar','Signe','Thor'],
        lastNames: ['Johansson','Hansen','Lindqvist','Berg','Lund','Olsen','Virtanen','Eriksen'],
        activities: {
            morning: ['cross-country skiing before sunrise','heating the sauna','watching reindeer drift past','reading quietly with coffee'],
            midday:  ['ice-bathing in a frozen lake','designing minimalist furniture','baking cardamom buns','debating in parliament'],
            evening: ['chasing the aurora','knitting by candlelight','eating pickled herring','playing with huskies'],
            night:   ['sleeping through polar night','gazing up at the aurora','wrapped in woolen blankets','dreaming under birch trees'],
        },
        greeting: 'Hej', music: 'folk-metal', signature: '❄',
    },
    mediterranean: {
        id: 'mediterranean', name: 'Mediterranean', color: '#ffd36b',
        firstNames: ['Chiara','Dimitri','Fatima','Giulia','Yiannis','Nadia','Paolo','Rania','Sofia','Tariq','Zoe','Elias'],
        lastNames: ['Papadopoulos','Rossi','Ferrari','Haddad','El-Amin','Bianchi','Katsouros','Khoury'],
        activities: {
            morning: ['fishing along the coast','picking olives','haggling in a sunlit market','sipping thick coffee'],
            midday:  ['napping through the siesta','mending nets by the harbor','cooking with fresh tomatoes','arguing about football'],
            evening: ['dancing sirtaki on the beach','stargazing from a rooftop','sharing mezze with neighbors','watching the sea turn gold'],
            night:   ['singing old sailor songs','listening to crickets','dreaming of ancient gods','wrapped in sea breeze'],
        },
        greeting: 'Yia sou', music: 'rebetiko', signature: '🫒',
    },
    slavic: {
        id: 'slavic', name: 'Slavic', color: '#c9a8ff',
        firstNames: ['Anya','Dmitri','Kateryna','Nikolai','Olga','Petr','Sofiya','Vlad','Irina','Yuri','Lena','Mikhail'],
        lastNames: ['Ivanov','Kowalski','Novak','Petrov','Sokolov','Dvorak','Volkov','Romanenko'],
        activities: {
            morning: ['walking to the bakery through snow','reading Tolstoy on the tram','pouring tea from a samovar','feeding sparrows in the square'],
            midday:  ['eating borscht and black bread','repairing an old Lada','teaching school children','chopping firewood'],
            evening: ['toasting with vodka and friends','playing accordion on the porch','watching football in a smoky pub','debating philosophy'],
            night:   ['dreaming of onion-domed cathedrals','listening to wolves in the distance','reading by a single bulb','humming old ballads'],
        },
        greeting: 'Privet', music: 'folk-choir', signature: '🪆',
    },
    east_asian: {
        id: 'east_asian', name: 'East Asian', color: '#ff9ebb',
        firstNames: ['Aiko','Chen','Daiki','Haruka','Jin','Kenji','Mei','Ryu','Sakura','Wei','Yuna','Hiro','Lin','Min-ji'],
        lastNames: ['Tanaka','Wang','Li','Kim','Zhang','Park','Nakamura','Chen','Sato','Liu'],
        activities: {
            morning: ['riding the bullet train to Tokyo','practicing tai chi in the park','steaming dumplings for breakfast','commuting past neon signs'],
            midday:  ['slurping ramen at a counter','writing code in a glass tower','studying for the civil service exam','tending to a bonsai'],
            evening: ['singing karaoke in Shibuya','watching cherry blossoms fall','eating hotpot with family','wandering a night market'],
            night:   ['reading manga under the covers','meditating before sleep','drinking sake quietly','dreaming of ancient dynasties'],
        },
        greeting: 'こんにちは', music: 'city-pop', signature: '🌸',
    },
    south_asian: {
        id: 'south_asian', name: 'South Asian', color: '#ffb37a',
        firstNames: ['Arjun','Priya','Rahul','Aisha','Vikram','Ananya','Rohan','Zara','Kabir','Meera','Dev','Sana'],
        lastNames: ['Sharma','Khan','Patel','Singh','Kumar','Rao','Desai','Bhatt','Iqbal','Rahman'],
        activities: {
            morning: ['sipping chai on a crowded train','offering prayers at a temple','commuting through monsoon rain','eating paratha with yogurt'],
            midday:  ['negotiating saffron in a bazaar','tutoring kids in mathematics','writing software in Bangalore','tending cardamom fields'],
            evening: ['watching a cricket match erupt','dancing at a wedding','eating street chaat','flying kites against an orange sky'],
            night:   ['listening to ghazals','writing poetry in Urdu','hearing the muezzin call','dreaming of the Himalayas'],
        },
        greeting: 'Namaste', music: 'bollywood', signature: '🪔',
    },
    southeast_asian: {
        id: 'southeast_asian', name: 'Southeast Asian', color: '#9dffc2',
        firstNames: ['Linh','Kwan','Nur','Joko','Somsak','Mai','Dara','Tuan','Rina','Bayu','Ploy','Andi'],
        lastNames: ['Nguyen','Tran','Santos','Wijaya','Suharto','Kim','Phan','Lim','Tan','Cruz'],
        activities: {
            morning: ['steering a longtail boat at dawn','offering rice to temple monks','riding a scooter through rain','peeling mangoes for a stall'],
            midday:  ['cooking pho in a wok','harvesting rice under a wide hat','fishing in the Mekong','trading durian at the wet market'],
            evening: ['watching dragon boats race','singing at a night-market karaoke','eating satay under paper lanterns','watching the moon over rice paddies'],
            night:   ['hearing gamelan in the distance','resting in a stilt house','listening to cicadas','dreaming of limestone cliffs'],
        },
        greeting: 'Xin chào', music: 'gamelan', signature: '🌾',
    },
    middle_eastern: {
        id: 'middle_eastern', name: 'Middle Eastern', color: '#ffc29e',
        firstNames: ['Yasmin','Omar','Layla','Hassan','Fatima','Karim','Amira','Tariq','Noor','Zaid','Rania','Ali'],
        lastNames: ['Al-Sayed','Haddad','Nassar','Karimi','Mahmoud','Ibrahim','Farsi','Saleh'],
        activities: {
            morning: ['praying at dawn','drinking qahwa with dates','walking through an ancient souk','feeding pigeons by a mosque'],
            midday:  ['debating poetry over mint tea','trading gold in the old quarter','studying the Quran','drilling beneath the desert'],
            evening: ['sharing shawarma with family','dancing dabke at a wedding','watching the call to prayer ripple across rooftops','smoking shisha quietly'],
            night:   ['reading Rumi by lamplight','listening to the desert wind','dreaming of Babylon','wrapped in embroidered linen'],
        },
        greeting: 'Salaam', music: 'oud', signature: '🕌',
    },
    african_west: {
        id: 'african_west', name: 'West African', color: '#ffb199',
        firstNames: ['Amara','Kwame','Ade','Chika','Tunde','Ayo','Nia','Obi','Fatou','Moussa','Zuri','Sade'],
        lastNames: ['Okafor','Diallo','Mensah','Abara','Traore','Nwosu','Konaté','Keita'],
        activities: {
            morning: ['drumming before sunrise','carrying fresh water from the well','trading yams in the market','braiding hair in the shade'],
            midday:  ['teaching children under a baobab','brewing palm wine','writing afrobeats in a studio','repairing a motorbike taxi'],
            evening: ['dancing at a village celebration','telling stories by firelight','preparing jollof rice','watching football on a shared screen'],
            night:   ['listening to the coast','drumming into the night','dreaming of ancestors','wrapped in bright kente'],
        },
        greeting: 'Sannu', music: 'afrobeats', signature: '🥁',
    },
    african_east: {
        id: 'african_east', name: 'East African', color: '#ffcf99',
        firstNames: ['Amina','Jabari','Makena','Tadesse','Nia','Dawit','Fatuma','Kofi','Asha','Yusuf'],
        lastNames: ['Abebe','Kamau','Tesfaye','Mwangi','Ochieng','Said','Bekele'],
        activities: {
            morning: ['jogging through highlands','brewing Ethiopian coffee','herding cattle across the savannah','walking kids to school'],
            midday:  ['photographing elephants','researching coral reefs','leading tourists on safari','teaching Swahili'],
            evening: ['watching the sun drop over Kilimanjaro','eating injera with family','dancing at a beach bonfire','telling folk tales'],
            night:   ['listening to crickets and lions','gazing up at a zero-light-pollution sky','sleeping in a boma','dreaming of the Rift Valley'],
        },
        greeting: 'Jambo', music: 'benga', signature: '🦒',
    },
    african_south: {
        id: 'african_south', name: 'Southern African', color: '#c9ff99',
        firstNames: ['Thandi','Sipho','Naledi','Bongani','Lerato','Tumelo','Zanele','Kgosi'],
        lastNames: ['Ndlovu','Mthembu','Khumalo','Dlamini','Van der Merwe','Botha','Mabaso'],
        activities: {
            morning: ['surfing off Cape Town','wandering vineyards at dawn','commuting past mining towers','tending a spaza shop'],
            midday:  ['braaing meat over coals','touring township murals','counting penguins at Boulders','teaching isiZulu'],
            evening: ['watching rugby at a packed pub','sharing amarula around a fire','dancing gqom in a club','stargazing in the Karoo'],
            night:   ['listening to the Indian Ocean','writing Xhosa poetry','dreaming of Mandela','wrapped in shweshwe'],
        },
        greeting: 'Sawubona', music: 'amapiano', signature: '🎶',
    },
    latin_american: {
        id: 'latin_american', name: 'Latin American', color: '#ff99d6',
        firstNames: ['Sofía','Mateo','Camila','Diego','Valentina','Santiago','Isabella','Joaquín','Luna','Ramón','Renata','Bruno'],
        lastNames: ['García','Rodríguez','López','Hernández','Díaz','Pérez','Silva','Santos','Morales','Fernández'],
        activities: {
            morning: ['drinking mate on the balcony','dancing salsa on the way to work','baking arepas','surfing off Pacific cliffs'],
            midday:  ['painting murals in a favela','teaching capoeira','selling tropical fruit','writing magical realism'],
            evening: ['dancing samba in the streets','watching a football match with all the neighbors','eating asado with family','singing bolero'],
            night:   ['listening to cumbia drift from a window','dreaming of jungle rivers','watching fireflies','wrapped in a hammock'],
        },
        greeting: 'Hola', music: 'reggaeton', signature: '💃',
    },
    north_american: {
        id: 'north_american', name: 'North American', color: '#7affd6',
        firstNames: ['Ava','Ethan','Olivia','Noah','Emma','Liam','Sophia','Mason','Zoe','Caleb','Maya','Tyler'],
        lastNames: ['Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Martinez','Anderson','Taylor'],
        activities: {
            morning: ['grabbing coffee from a drive-thru','commuting on the highway','jogging through suburbia','checking email on the train'],
            midday:  ['eating burritos at a food truck','working in an open-plan office','teaching in a rural school','streaming on Twitch'],
            evening: ['watching a baseball game','having tacos on a porch','biking across the Brooklyn Bridge','cooking BBQ'],
            night:   ['watching late-night shows','stargazing from a pickup bed','reading in bed','dreaming of road trips'],
        },
        greeting: 'Hey', music: 'indie-rock', signature: '🗽',
    },
    oceanian: {
        id: 'oceanian', name: 'Oceanian', color: '#7affff',
        firstNames: ['Aroha','Kai','Moana','Tane','Leilani','Noah','Aaliyah','Jack','Mia','Finn'],
        lastNames: ['Tane','Kahu','Waititi','Smith','Nguyen','Wilson','Lee','Nakoa'],
        activities: {
            morning: ['surfing at Bondi','walking a kelpie on the beach','sipping flat white','checking the coral'],
            midday:  ['shearing sheep in the outback','freediving over reefs','grilling prawns','writing haka verses'],
            evening: ['watching rugby league','paddling a waka at sunset','eating hangi with family','counting stars over the Southern Cross'],
            night:   ['listening to cicadas in the bush','dreaming of kangaroos','wrapped in a possum-fur blanket','humming a sea shanty'],
        },
        greeting: 'Kia ora', music: 'indigenous-fusion', signature: '🪃',
    },
    polar: {
        id: 'polar', name: 'Polar', color: '#c9f0ff',
        firstNames: ['Aput','Nanuq','Sikku','Anirniq','Qinnuk'],
        lastNames: ['Arctic','Polar','Inuit','Sami'],
        activities: {
            morning: ['listening to the ice crack','tracking caribou','sipping hot broth','watching the sun barely rise'],
            midday:  ['fishing through the ice','repairing a snowmobile','teaching children Inuktitut','studying climate data'],
            evening: ['gathering around an oil lamp','carving soapstone','singing throat songs','watching the aurora'],
            night:   ['sleeping through the long dark','dreaming of whales','listening to wind on snow','wrapped in fur'],
        },
        greeting: 'Ai', music: 'throat-song', signature: '🐻‍❄',
    },
};

const CULTURE_LIST = Object.values(CULTURES);
