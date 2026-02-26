// ============================================================
// F1 2026 RACE CALENDAR — Full 24-Round Season
// Season opener: Australian GP — March 6–8, 2026
// New: Madrid GP debut! Plus Cadillac & Audi join the grid!
// ============================================================
const raceCalendar = [
    { round: 1,  name: "Australian Grand Prix",       circuit: "Albert Park Circuit",              date: "2026-03-08", country: "Australia",     flag: "🇦🇺", isSprint: false },
    { round: 2,  name: "Chinese Grand Prix",           circuit: "Shanghai International Circuit",   date: "2026-03-15", country: "China",          flag: "🇨🇳", isSprint: true  },
    { round: 3,  name: "Japanese Grand Prix",          circuit: "Suzuka Circuit",                   date: "2026-03-29", country: "Japan",          flag: "🇯🇵", isSprint: false },
    { round: 4,  name: "Bahrain Grand Prix",           circuit: "Bahrain International Circuit",    date: "2026-04-12", country: "Bahrain",        flag: "🇧🇭", isSprint: false },
    { round: 5,  name: "Saudi Arabian Grand Prix",     circuit: "Jeddah Corniche Circuit",          date: "2026-04-19", country: "Saudi Arabia",   flag: "🇸🇦", isSprint: false },
    { round: 6,  name: "Miami Grand Prix",             circuit: "Miami International Autodrome",    date: "2026-05-03", country: "USA",            flag: "🇺🇸", isSprint: true  },
    { round: 7,  name: "Canadian Grand Prix",          circuit: "Circuit Gilles Villeneuve",        date: "2026-05-24", country: "Canada",         flag: "🇨🇦", isSprint: true  },
    { round: 8,  name: "Monaco Grand Prix",            circuit: "Circuit de Monaco",                date: "2026-06-07", country: "Monaco",         flag: "🇲🇨", isSprint: false },
    { round: 9,  name: "Spanish Grand Prix",           circuit: "Circuit de Barcelona-Catalunya",   date: "2026-06-14", country: "Spain",          flag: "🇪🇸", isSprint: false },
    { round: 10, name: "Austrian Grand Prix",          circuit: "Red Bull Ring",                    date: "2026-06-28", country: "Austria",        flag: "🇦🇹", isSprint: false },
    { round: 11, name: "British Grand Prix",           circuit: "Silverstone Circuit",              date: "2026-07-05", country: "United Kingdom", flag: "🇬🇧", isSprint: true  },
    { round: 12, name: "Belgian Grand Prix",           circuit: "Circuit de Spa-Francorchamps",     date: "2026-07-19", country: "Belgium",        flag: "🇧🇪", isSprint: false },
    { round: 13, name: "Hungarian Grand Prix",         circuit: "Hungaroring",                      date: "2026-07-26", country: "Hungary",        flag: "🇭🇺", isSprint: false },
    { round: 14, name: "Dutch Grand Prix",             circuit: "Circuit Zandvoort",                date: "2026-08-23", country: "Netherlands",    flag: "🇳🇱", isSprint: true  },
    { round: 15, name: "Italian Grand Prix",           circuit: "Autodromo Nazionale di Monza",     date: "2026-09-06", country: "Italy",          flag: "🇮🇹", isSprint: false },
    { round: 16, name: "Madrid Grand Prix",            circuit: "Circuito Urbano de Madrid",        date: "2026-09-13", country: "Spain",          flag: "🇪🇸", isSprint: false, isDebut: true },
    { round: 17, name: "Azerbaijan Grand Prix",        circuit: "Baku City Circuit",                date: "2026-09-26", country: "Azerbaijan",     flag: "🇦🇿", isSprint: false },
    { round: 18, name: "Singapore Grand Prix",         circuit: "Marina Bay Street Circuit",        date: "2026-10-11", country: "Singapore",      flag: "🇸🇬", isSprint: true  },
    { round: 19, name: "United States Grand Prix",     circuit: "Circuit of the Americas",          date: "2026-10-25", country: "USA",            flag: "🇺🇸", isSprint: false },
    { round: 20, name: "Mexico City Grand Prix",       circuit: "Autódromo Hermanos Rodríguez",     date: "2026-11-01", country: "Mexico",         flag: "🇲🇽", isSprint: false },
    { round: 21, name: "São Paulo Grand Prix",         circuit: "Autódromo José Carlos Pace",       date: "2026-11-08", country: "Brazil",         flag: "🇧🇷", isSprint: false },
    { round: 22, name: "Las Vegas Grand Prix",         circuit: "Las Vegas Street Circuit",         date: "2026-11-21", country: "USA",            flag: "🇺🇸", isSprint: false },
    { round: 23, name: "Qatar Grand Prix",             circuit: "Lusail International Circuit",     date: "2026-11-29", country: "Qatar",          flag: "🇶🇦", isSprint: false },
    { round: 24, name: "Abu Dhabi Grand Prix",         circuit: "Yas Marina Circuit",               date: "2026-12-06", country: "UAE",            flag: "🇦🇪", isSprint: false }
];

// ============================================================
// F1 2026 DRIVER STANDINGS
// Pre-season — no races completed yet (season starts March 6)
// Based on 2025 final standings order for reference
// ============================================================
const driverStandings2026 = [
    { position: 1,  driver: "Lando Norris",       nationality: "British",        team: "McLaren",           points: 0, number: 4,   flag: "🇬🇧" },
    { position: 2,  driver: "Oscar Piastri",       nationality: "Australian",     team: "McLaren",           points: 0, number: 81,  flag: "🇦🇺" },
    { position: 3,  driver: "Max Verstappen",      nationality: "Dutch",          team: "Red Bull Racing",   points: 0, number: 1,   flag: "🇳🇱" },
    { position: 4,  driver: "Charles Leclerc",     nationality: "Monegasque",     team: "Ferrari",           points: 0, number: 16,  flag: "🇲🇨" },
    { position: 5,  driver: "Lewis Hamilton",      nationality: "British",        team: "Ferrari",           points: 0, number: 44,  flag: "🇬🇧" },
    { position: 6,  driver: "George Russell",      nationality: "British",        team: "Mercedes",          points: 0, number: 63,  flag: "🇬🇧" },
    { position: 7,  driver: "Kimi Antonelli",      nationality: "Italian",        team: "Mercedes",          points: 0, number: 12,  flag: "🇮🇹" },
    { position: 8,  driver: "Fernando Alonso",     nationality: "Spanish",        team: "Aston Martin",      points: 0, number: 14,  flag: "🇪🇸" },
    { position: 9,  driver: "Lance Stroll",        nationality: "Canadian",       team: "Aston Martin",      points: 0, number: 18,  flag: "🇨🇦" },
    { position: 10, driver: "Carlos Sainz",        nationality: "Spanish",        team: "Williams",          points: 0, number: 55,  flag: "🇪🇸" },
    { position: 11, driver: "Alex Albon",          nationality: "Thai",           team: "Williams",          points: 0, number: 23,  flag: "🇹🇭" },
    { position: 12, driver: "Isack Hadjar",        nationality: "French",         team: "Red Bull Racing",   points: 0, number: 6,   flag: "🇫🇷" },
    { position: 13, driver: "Liam Lawson",         nationality: "New Zealander",  team: "Racing Bulls",      points: 0, number: 30,  flag: "🇳🇿" },
    { position: 14, driver: "Arvid Lindblad",      nationality: "British",        team: "Racing Bulls",      points: 0, number: 7,   flag: "🇬🇧" },
    { position: 15, driver: "Pierre Gasly",        nationality: "French",         team: "Alpine",            points: 0, number: 10,  flag: "🇫🇷" },
    { position: 16, driver: "Franco Colapinto",    nationality: "Argentine",      team: "Alpine",            points: 0, number: 43,  flag: "🇦🇷" },
    { position: 17, driver: "Esteban Ocon",        nationality: "French",         team: "Haas",              points: 0, number: 31,  flag: "🇫🇷" },
    { position: 18, driver: "Oliver Bearman",      nationality: "British",        team: "Haas",              points: 0, number: 87,  flag: "🇬🇧" },
    { position: 19, driver: "Nico Hulkenberg",     nationality: "German",         team: "Audi",              points: 0, number: 27,  flag: "🇩🇪" },
    { position: 20, driver: "Gabriel Bortoleto",   nationality: "Brazilian",      team: "Audi",              points: 0, number: 5,   flag: "🇧🇷" },
    { position: 21, driver: "Sergio Perez",        nationality: "Mexican",        team: "Cadillac",          points: 0, number: 11,  flag: "🇲🇽" },
    { position: 22, driver: "Valtteri Bottas",     nationality: "Finnish",        team: "Cadillac",          points: 0, number: 77,  flag: "🇫🇮" }
];

// ============================================================
// F1 2026 CONSTRUCTOR STANDINGS — Pre-season
// Order based on 2025 final standings for reference
// ============================================================
const constructorStandings = [
    { position: 1,  team: "McLaren",         points: 0, color: "#FF8700" },
    { position: 2,  team: "Ferrari",         points: 0, color: "#DC0000" },
    { position: 3,  team: "Red Bull Racing", points: 0, color: "#0600EF" },
    { position: 4,  team: "Mercedes",        points: 0, color: "#00D2BE" },
    { position: 5,  team: "Aston Martin",    points: 0, color: "#006F62" },
    { position: 6,  team: "Williams",        points: 0, color: "#005AFF" },
    { position: 7,  team: "Racing Bulls",    points: 0, color: "#4E5D9F" },
    { position: 8,  team: "Alpine",          points: 0, color: "#FF69B4" },
    { position: 9,  team: "Haas",            points: 0, color: "#B6BABD" },
    { position: 10, team: "Audi",            points: 0, color: "#C0C0C0" },
    { position: 11, team: "Cadillac",        points: 0, color: "#CC0033" }
];

// ============================================================
// 2025 RECENT RACE RESULTS (Last season highlights)
// ============================================================
const recentRaces = [
    {
        round: 24,
        name: "Abu Dhabi Grand Prix 2025",
        date: "2025-12-07",
        winner: "Lando Norris",
        team: "McLaren",
        time: "1:24:XX.XXX",
        podium: ["Lando Norris", "Oscar Piastri", "Max Verstappen"]
    },
    {
        round: 22,
        name: "Chinese Grand Prix 2025",
        date: "2025-03-23",
        winner: "Oscar Piastri",
        team: "McLaren",
        time: "1:30:XX.XXX",
        highlight: "Ferrari & Gasly DSQ controversy!",
        podium: ["Oscar Piastri", "Lando Norris", "George Russell"]
    },
    {
        round: 1,
        name: "Australian Grand Prix 2025",
        date: "2025-03-16",
        winner: "Lando Norris",
        team: "McLaren",
        time: "1:26:XX.XXX",
        highlight: "McLaren's first Melbourne win since 2012!",
        podium: ["Lando Norris", "Max Verstappen", "George Russell"]
    }
];

// ============================================================
// F1 2026 KEY RULE CHANGES
// ============================================================
const ruleChanges2026 = [
    {
        icon: "⚡",
        title: "50/50 Power Split",
        description: "New hybrid power units split power equally between the 1.6L V6 ICE and the electric MGU-K (470bhp electrical output — up from 120bhp)."
    },
    {
        icon: "🏎️",
        title: "Active Aerodynamics",
        description: "Drivers can actively adjust wing angles — closed for grip in corners; open to reduce drag and boost top speed on straights."
    },
    {
        icon: "⛽",
        title: "Sustainable Fuels",
        description: "All cars run on 100% sustainable fuel, making F1 carbon-neutral at the point of combustion."
    },
    {
        icon: "🗓️",
        title: "New Teams!",
        description: "AUDI makes its F1 debut (replacing Sauber) and CADILLAC joins as the 11th team — first new constructor since Haas in 2016."
    },
    {
        icon: "🔋",
        title: "No MGU-H",
        description: "The complex Motor Generator Unit–Heat has been removed to reduce costs and improve reliability for new manufacturers."
    },
    {
        icon: "📍",
        title: "Madrid Debut",
        description: "A brand new street circuit in Madrid, Spain makes its Formula 1 debut — joining Barcelona for TWO Spanish GPs this season!"
    }
];
