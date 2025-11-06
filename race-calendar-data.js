// F1 2025 Race Calendar
const raceCalendar = [
    { round: 1, name: "Australian Grand Prix", circuit: "Albert Park Circuit", date: "2025-03-16", country: "Australia", flag: "🇦🇺" },
    { round: 2, name: "Chinese Grand Prix", circuit: "Shanghai International Circuit", date: "2025-03-23", country: "China", flag: "🇨🇳" },
    { round: 3, name: "Japanese Grand Prix", circuit: "Suzuka Circuit", date: "2025-04-06", country: "Japan", flag: "🇯🇵" },
    { round: 4, name: "Bahrain Grand Prix", circuit: "Bahrain International Circuit", date: "2025-04-13", country: "Bahrain", flag: "🇧🇭" },
    { round: 5, name: "Saudi Arabian Grand Prix", circuit: "Jeddah Corniche Circuit", date: "2025-04-20", country: "Saudi Arabia", flag: "🇸🇦" },
    { round: 6, name: "Miami Grand Prix", circuit: "Miami International Autodrome", date: "2025-05-04", country: "USA", flag: "🇺🇸" },
    { round: 7, name: "Emilia Romagna Grand Prix", circuit: "Autodromo Enzo e Dino Ferrari", date: "2025-05-18", country: "Italy", flag: "🇮🇹" },
    { round: 8, name: "Monaco Grand Prix", circuit: "Circuit de Monaco", date: "2025-05-25", country: "Monaco", flag: "🇲🇨" },
    { round: 9, name: "Spanish Grand Prix", circuit: "Circuit de Barcelona-Catalunya", date: "2025-06-01", country: "Spain", flag: "🇪🇸" },
    { round: 10, name: "Canadian Grand Prix", circuit: "Circuit Gilles Villeneuve", date: "2025-06-15", country: "Canada", flag: "🇨🇦" },
    { round: 11, name: "Austrian Grand Prix", circuit: "Red Bull Ring", date: "2025-06-29", country: "Austria", flag: "🇦🇹" },
    { round: 12, name: "British Grand Prix", circuit: "Silverstone Circuit", date: "2025-07-06", country: "United Kingdom", flag: "🇬🇧" },
    { round: 13, name: "Belgian Grand Prix", circuit: "Circuit de Spa-Francorchamps", date: "2025-07-27", country: "Belgium", flag: "🇧🇪" },
    { round: 14, name: "Hungarian Grand Prix", circuit: "Hungaroring", date: "2025-08-03", country: "Hungary", flag: "🇭🇺" },
    { round: 15, name: "Dutch Grand Prix", circuit: "Circuit Zandvoort", date: "2025-08-31", country: "Netherlands", flag: "🇳🇱" },
    { round: 16, name: "Italian Grand Prix", circuit: "Autodromo Nazionale di Monza", date: "2025-09-07", country: "Italy", flag: "🇮🇹" },
    { round: 17, name: "Azerbaijan Grand Prix", circuit: "Baku City Circuit", date: "2025-09-21", country: "Azerbaijan", flag: "🇦🇿" },
    { round: 18, name: "Singapore Grand Prix", circuit: "Marina Bay Street Circuit", date: "2025-10-05", country: "Singapore", flag: "🇸🇬" },
    { round: 19, name: "United States Grand Prix", circuit: "Circuit of the Americas", date: "2025-10-19", country: "USA", flag: "🇺🇸" },
    { round: 20, name: "Mexico City Grand Prix", circuit: "Autódromo Hermanos Rodríguez", date: "2025-10-26", country: "Mexico", flag: "🇲🇽" },
    { round: 21, name: "São Paulo Grand Prix", circuit: "Autódromo José Carlos Pace", date: "2025-11-09", country: "Brazil", flag: "🇧🇷" },
    { round: 22, name: "Las Vegas Grand Prix", circuit: "Las Vegas Street Circuit", date: "2025-11-22", country: "USA", flag: "🇺🇸" },
    { round: 23, name: "Qatar Grand Prix", circuit: "Lusail International Circuit", date: "2025-11-30", country: "Qatar", flag: "🇶🇦" },
    { round: 24, name: "Abu Dhabi Grand Prix", circuit: "Yas Marina Circuit", date: "2025-12-07", country: "UAE", flag: "🇦🇪" }
];

// Constructor Standings 2025 (Based on 2024 final standings)
const constructorStandings = [
    { position: 1, team: "McLaren", points: 666, color: "#FF8700" },
    { position: 2, team: "Ferrari", points: 652, color: "#DC0000" },
    { position: 3, team: "Red Bull Racing", points: 589, color: "#0600EF" },
    { position: 4, team: "Mercedes", points: 468, color: "#00D2BE" },
    { position: 5, team: "Aston Martin", points: 94, color: "#006F62" },
    { position: 6, team: "Alpine", points: 65, color: "#0090FF" },
    { position: 7, team: "Haas F1 Team", points: 58, color: "#FFFFFF" },
    { position: 8, team: "RB", points: 46, color: "#2B4562" },
    { position: 9, team: "Williams", points: 17, color: "#005AFF" },
    { position: 10, team: "Sauber", points: 4, color: "#00E701" }
];

// Recent Race Results from 2024 Season (Last 5 races)
const recentRaces = [
    {
        round: 24,
        name: "Abu Dhabi Grand Prix 2024",
        date: "2024-12-08",
        winner: "Lando Norris",
        team: "McLaren",
        time: "1:26:33.291",
        podium: ["Lando Norris", "Carlos Sainz", "Charles Leclerc"]
    },
    {
        round: 23,
        name: "Qatar Grand Prix 2024",
        date: "2024-12-01",
        winner: "Max Verstappen",
        team: "Red Bull Racing",
        time: "1:31:05.323",
        podium: ["Max Verstappen", "Charles Leclerc", "Oscar Piastri"]
    },
    {
        round: 22,
        name: "Las Vegas Grand Prix 2024",
        date: "2024-11-23",
        winner: "George Russell",
        team: "Mercedes",
        time: "1:22:05.969",
        podium: ["George Russell", "Lewis Hamilton", "Carlos Sainz"]
    },
    {
        round: 21,
        name: "São Paulo Grand Prix 2024",
        date: "2024-11-03",
        winner: "Max Verstappen",
        team: "Red Bull Racing",
        time: "2:06:54.894",
        podium: ["Max Verstappen", "Esteban Ocon", "Pierre Gasly"]
    },
    {
        round: 20,
        name: "Mexico City Grand Prix 2024",
        date: "2024-10-27",
        winner: "Carlos Sainz",
        team: "Ferrari",
        time: "1:40:55.800",
        podium: ["Carlos Sainz", "Lando Norris", "Charles Leclerc"]
    }
];
