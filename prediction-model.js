/**
 * F-ATICS AI Race Predictor — 2026
 * Lightweight client-side prediction model using 2026 driver form data
 */
const predictionModel = (function () {

    const driverRatings = {
        'Lando Norris':      { pace: 96, consistency: 94, wet: 88, overtaking: 90, starts: 88 },
        'Oscar Piastri':     { pace: 94, consistency: 93, wet: 85, overtaking: 87, starts: 90 },
        'Max Verstappen':    { pace: 99, consistency: 97, wet: 96, overtaking: 97, starts: 96 },
        'Charles Leclerc':   { pace: 95, consistency: 87, wet: 92, overtaking: 88, starts: 85 },
        'Lewis Hamilton':    { pace: 95, consistency: 91, wet: 95, overtaking: 90, starts: 89 },
        'George Russell':    { pace: 91, consistency: 90, wet: 89, overtaking: 85, starts: 88 },
        'Kimi Antonelli':    { pace: 88, consistency: 82, wet: 80, overtaking: 83, starts: 82 },
        'Fernando Alonso':   { pace: 90, consistency: 89, wet: 93, overtaking: 91, starts: 88 },
        'Carlos Sainz':      { pace: 90, consistency: 90, wet: 89, overtaking: 86, starts: 87 },
        'Alex Albon':        { pace: 83, consistency: 83, wet: 81, overtaking: 82, starts: 80 },
        'Lance Stroll':      { pace: 80, consistency: 78, wet: 82, overtaking: 77, starts: 79 },
        'Isack Hadjar':      { pace: 82, consistency: 78, wet: 74, overtaking: 79, starts: 77 },
        'Liam Lawson':       { pace: 83, consistency: 80, wet: 76, overtaking: 80, starts: 78 },
        'Arvid Lindblad':    { pace: 78, consistency: 74, wet: 70, overtaking: 75, starts: 73 },
        'Pierre Gasly':      { pace: 84, consistency: 82, wet: 83, overtaking: 80, starts: 81 },
        'Franco Colapinto':  { pace: 82, consistency: 78, wet: 75, overtaking: 79, starts: 77 },
        'Esteban Ocon':      { pace: 82, consistency: 80, wet: 83, overtaking: 78, starts: 80 },
        'Oliver Bearman':    { pace: 80, consistency: 76, wet: 72, overtaking: 77, starts: 75 },
        'Nico Hulkenberg':   { pace: 83, consistency: 83, wet: 80, overtaking: 80, starts: 82 },
        'Gabriel Bortoleto': { pace: 80, consistency: 75, wet: 72, overtaking: 76, starts: 74 },
        'Sergio Perez':      { pace: 84, consistency: 82, wet: 80, overtaking: 83, starts: 84 },
        'Valtteri Bottas':   { pace: 80, consistency: 79, wet: 77, overtaking: 76, starts: 79 }
    };

    const circuitFactors = {
        'Albert Park Circuit':            { tireWear: 0.7, overtaking: 0.6, strategy: 0.7 },
        'Shanghai International Circuit': { tireWear: 0.8, overtaking: 0.8, strategy: 0.9 },
        'Suzuka Circuit':                 { tireWear: 0.9, overtaking: 0.4, strategy: 0.6 },
        'Bahrain International Circuit':  { tireWear: 0.9, overtaking: 0.8, strategy: 0.9 },
        'Jeddah Corniche Circuit':        { tireWear: 0.5, overtaking: 0.6, strategy: 0.5 },
        'Miami International Autodrome':  { tireWear: 0.7, overtaking: 0.7, strategy: 0.8 },
        'Circuit de Monaco':              { tireWear: 0.3, overtaking: 0.1, strategy: 0.7 },
        'Silverstone Circuit':            { tireWear: 0.9, overtaking: 0.7, strategy: 0.8 },
        default:                          { tireWear: 0.7, overtaking: 0.6, strategy: 0.7 }
    };

    function _getScore(driver, circuit, weather) {
        const r = driverRatings[driver];
        if (!r) return 50;
        const cf = circuitFactors[circuit] || circuitFactors.default;
        let score = r.pace * 0.35 + r.consistency * 0.25 + r.starts * 0.15 +
                    r.overtaking * cf.overtaking * 0.15 + r.wet * (weather === 'wet' ? 0.3 : weather === 'mixed' ? 0.15 : 0.05);
        // small random spread per "lap"
        score += (Math.random() - 0.5) * 10;
        return Math.max(0, Math.min(100, score));
    }

    return {
        generatePredictions(circuit = 'Albert Park Circuit', weather = 'dry') {
            const drivers = Object.keys(driverRatings);
            return drivers
                .map(driver => ({ driver, winProbability: +_getScore(driver, circuit, weather).toFixed(1) }))
                .sort((a, b) => b.winProbability - a.winProbability)
                .map((d, i) => ({ ...d, position: i + 1 }));
        },

        simulateSeason(runs = 1000) {
            const wins = {};
            Object.keys(driverRatings).forEach(d => (wins[d] = 0));
            for (let i = 0; i < runs; i++) {
                const results = this.generatePredictions();
                wins[results[0].driver]++;
            }
            return Object.entries(wins)
                .map(([driver, w]) => ({ driver, simWins: w, probability: ((w / runs) * 100).toFixed(1) }))
                .sort((a, b) => b.simWins - a.simWins)
                .map((d, i) => ({ ...d, position: i + 1 }));
        },

        getDriverAnalysis(driver) {
            const r = driverRatings[driver];
            if (!r) return null;
            const score = Math.round((r.pace + r.consistency + r.wet + r.overtaking + r.starts) / 5);
            return {
                driver,
                score,
                strengths: [
                    ...(r.pace >= 94 ? ['Elite raw pace'] : []),
                    ...(r.consistency >= 92 ? ['World-class consistency'] : []),
                    ...(r.wet >= 90 ? ['Exceptional in wet conditions'] : []),
                    ...(r.overtaking >= 89 ? ['Aggressive overtaking'] : [])
                ],
                weaknesses: [
                    ...(r.pace < 85 ? ['Raw pace needs development'] : []),
                    ...(r.consistency < 82 ? ['Needs to improve consistency'] : []),
                    ...(r.wet < 80 ? ['Wet weather performance'] : [])
                ],
                stats: { wins: Math.floor(r.pace / 10), poles: Math.floor(r.pace / 11), podiums: Math.floor(r.pace / 6) }
            };
        }
    };
})();
