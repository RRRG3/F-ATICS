/**
 * F1 Historical Data Generator
 * Generates synthetic historical F1 race data for training the ML model
 */

export class F1DataGenerator {
    constructor() {
        this.drivers = [
            { name: 'Max Verstappen', team: 'Red Bull Racing', skill: 0.95 },
            { name: 'Lando Norris', team: 'McLaren', skill: 0.90 },
            { name: 'Charles Leclerc', team: 'Ferrari', skill: 0.92 },
            { name: 'Oscar Piastri', team: 'McLaren', skill: 0.85 },
            { name: 'Lewis Hamilton', team: 'Ferrari', skill: 0.93 },
            { name: 'George Russell', team: 'Mercedes', skill: 0.87 },
            { name: 'Carlos Sainz', team: 'Williams', skill: 0.88 },
            { name: 'Fernando Alonso', team: 'Aston Martin', skill: 0.89 },
            { name: 'Lance Stroll', team: 'Aston Martin', skill: 0.75 },
            { name: 'Pierre Gasly', team: 'Alpine', skill: 0.80 },
            { name: 'Yuki Tsunoda', team: 'RB', skill: 0.78 },
            { name: 'Nico Hulkenberg', team: 'Sauber', skill: 0.82 },
            { name: 'Esteban Ocon', team: 'Haas', skill: 0.79 },
            { name: 'Alexander Albon', team: 'Williams', skill: 0.81 },
            { name: 'Liam Lawson', team: 'Red Bull Racing', skill: 0.76 },
            { name: 'Jack Doohan', team: 'Alpine', skill: 0.72 },
            { name: 'Isack Hadjar', team: 'RB', skill: 0.70 },
            { name: 'Gabriel Bortoleto', team: 'Sauber', skill: 0.71 },
            { name: 'Oliver Bearman', team: 'Haas', skill: 0.73 },
            { name: 'Andrea Kimi Antonelli', team: 'Mercedes', skill: 0.74 }
        ];

        this.circuits = [
            { name: 'Bahrain', type: 'permanent', difficulty: 0.7 },
            { name: 'Saudi Arabia', type: 'street', difficulty: 0.85 },
            { name: 'Australia', type: 'street', difficulty: 0.75 },
            { name: 'Japan', type: 'permanent', difficulty: 0.8 },
            { name: 'China', type: 'permanent', difficulty: 0.7 },
            { name: 'Miami', type: 'street', difficulty: 0.75 },
            { name: 'Imola', type: 'permanent', difficulty: 0.85 },
            { name: 'Monaco', type: 'street', difficulty: 0.95 },
            { name: 'Canada', type: 'street', difficulty: 0.8 },
            { name: 'Spain', type: 'permanent', difficulty: 0.7 },
            { name: 'Austria', type: 'permanent', difficulty: 0.65 },
            { name: 'Britain', type: 'permanent', difficulty: 0.75 },
            { name: 'Hungary', type: 'permanent', difficulty: 0.8 },
            { name: 'Belgium', type: 'permanent', difficulty: 0.85 },
            { name: 'Netherlands', type: 'permanent', difficulty: 0.75 },
            { name: 'Italy', type: 'permanent', difficulty: 0.7 },
            { name: 'Azerbaijan', type: 'street', difficulty: 0.85 },
            { name: 'Singapore', type: 'street', difficulty: 0.9 },
            { name: 'USA', type: 'permanent', difficulty: 0.75 },
            { name: 'Mexico', type: 'permanent', difficulty: 0.8 },
            { name: 'Brazil', type: 'permanent', difficulty: 0.85 },
            { name: 'Las Vegas', type: 'street', difficulty: 0.8 },
            { name: 'Qatar', type: 'permanent', difficulty: 0.75 },
            { name: 'Abu Dhabi', type: 'permanent', difficulty: 0.7 }
        ];

        this.weather = ['dry', 'wet', 'mixed'];
        this.tireCompounds = ['soft', 'medium', 'hard'];
    }

    /**
     * Generate historical race data
     */
    generateHistoricalData(numRaces = 100) {
        console.log(`🏁 Generating ${numRaces} historical races...`);
        
        const data = [];
        
        for (let raceNum = 0; raceNum < numRaces; raceNum++) {
            const circuit = this.circuits[Math.floor(Math.random() * this.circuits.length)];
            const weather = this.weather[Math.floor(Math.random() * this.weather.length)];
            
            // Generate race for all drivers
            const raceResults = this.simulateRace(circuit, weather);
            data.push(...raceResults);
        }
        
        console.log(`✅ Generated ${data.length} data points`);
        return data;
    }

    /**
     * Simulate a single race
     */
    simulateRace(circuit, weather) {
        const results = [];
        
        // Assign qualifying positions based on skill + randomness
        const qualifyingResults = this.drivers.map(driver => ({
            ...driver,
            qualifyingTime: this.calculateQualifyingTime(driver, circuit, weather)
        })).sort((a, b) => a.qualifyingTime - b.qualifyingTime);

        // Simulate race
        qualifyingResults.forEach((driver, index) => {
            const qualifyingPosition = index + 1;
            const tireCompound = this.selectTireStrategy(driver, circuit);
            
            // Calculate race performance
            const racePerformance = this.calculateRacePerformance(
                driver,
                circuit,
                weather,
                qualifyingPosition,
                tireCompound
            );

            results.push({
                driver: driver.name,
                team: driver.team,
                circuit: circuit.name,
                circuit_type: circuit.type,
                weather: weather,
                qualifying_position: qualifyingPosition,
                tire_compound: tireCompound,
                finish_position: racePerformance.position,
                driver_points: this.getDriverPoints(driver.name),
                team_points: this.getTeamPoints(driver.team),
                recent_form: this.calculateRecentForm(driver.name),
                circuit_performance: this.calculateCircuitPerformance(driver.name, circuit.name),
                weather_factor: weather === 'dry' ? 1.0 : (weather === 'wet' ? 0.7 : 0.85),
                tire_strategy: this.getTireStrategyScore(tireCompound, circuit.type),
                pit_stop_efficiency: this.getPitEfficiency(driver.team),
                points_scored: this.getPointsForPosition(racePerformance.position)
            });
        });

        // Sort by finish position
        results.sort((a, b) => a.finish_position - b.finish_position);
        
        return results;
    }

    /**
     * Calculate qualifying time
     */
    calculateQualifyingTime(driver, circuit, weather) {
        const baseTime = 90; // seconds
        const skillFactor = (1 - driver.skill) * 5; // 0-5 seconds
        const circuitFactor = circuit.difficulty * 2; // 0-2 seconds
        const weatherFactor = weather === 'wet' ? Math.random() * 3 : 0;
        const randomness = Math.random() * 0.5;
        
        return baseTime + skillFactor + circuitFactor + weatherFactor + randomness;
    }

    /**
     * Calculate race performance
     */
    calculateRacePerformance(driver, circuit, weather, qualifyingPosition, tireCompound) {
        let position = qualifyingPosition;
        
        // Driver skill impact
        const skillImpact = (driver.skill - 0.75) * 10; // -2.5 to +2
        
        // Weather impact
        const weatherImpact = weather === 'wet' ? (Math.random() - 0.5) * 4 : 0;
        
        // Tire strategy impact
        const tireImpact = this.getTireImpact(tireCompound, circuit.type);
        
        // Circuit familiarity
        const familiarityImpact = Math.random() * 2 - 1;
        
        // Calculate position change
        const positionChange = Math.round(
            skillImpact + weatherImpact + tireImpact + familiarityImpact
        );
        
        position = Math.max(1, Math.min(20, position + positionChange));
        
        return {
            position,
            positionChange
        };
    }

    /**
     * Select tire strategy
     */
    selectTireStrategy(driver, circuit) {
        if (circuit.type === 'street') {
            return Math.random() > 0.5 ? 'soft' : 'medium';
        } else {
            const rand = Math.random();
            if (rand < 0.3) return 'soft';
            if (rand < 0.7) return 'medium';
            return 'hard';
        }
    }

    /**
     * Helper methods for feature calculation
     */
    getDriverPoints(driverName) {
        const pointsMap = {
            'Max Verstappen': 437,
            'Lando Norris': 374,
            'Charles Leclerc': 356,
            'Oscar Piastri': 292,
            'Lewis Hamilton': 223,
            'George Russell': 245,
            'Carlos Sainz': 290
        };
        return pointsMap[driverName] || Math.floor(Math.random() * 100);
    }

    getTeamPoints(teamName) {
        const pointsMap = {
            'Red Bull Racing': 589,
            'McLaren': 666,
            'Ferrari': 579,
            'Mercedes': 468,
            'Aston Martin': 94
        };
        return pointsMap[teamName] || Math.floor(Math.random() * 200);
    }

    calculateRecentForm(driverName) {
        // More realistic form based on actual driver performance
        const formMap = {
            'Lando Norris': 0.92,
            'Oscar Piastri': 0.88,
            'Charles Leclerc': 0.90,
            'Carlos Sainz': 0.87,
            'Max Verstappen': 0.85,
            'Sergio Perez': 0.75,
            'Lewis Hamilton': 0.82,
            'George Russell': 0.84
        };
        return formMap[driverName] || (0.5 + Math.random() * 0.4);
    }

    calculateCircuitPerformance(driverName, circuitName) {
        // Add some randomness but keep it realistic
        const basePerformance = 0.5 + Math.random() * 0.3;
        
        // Bonus for top drivers
        const topDrivers = ['Lando Norris', 'Charles Leclerc', 'Max Verstappen', 'Oscar Piastri'];
        if (topDrivers.includes(driverName)) {
            return Math.min(1.0, basePerformance + 0.2);
        }
        
        return basePerformance;
    }

    getTireStrategyScore(compound, circuitType) {
        const scores = {
            'soft': { 'street': 0.9, 'permanent': 0.7 },
            'medium': { 'street': 0.8, 'permanent': 0.9 },
            'hard': { 'street': 0.6, 'permanent': 0.85 }
        };
        return scores[compound][circuitType];
    }

    getPitEfficiency(teamName) {
        const efficiency = {
            'Red Bull Racing': 0.95,
            'Ferrari': 0.90,
            'Mercedes': 0.92,
            'McLaren': 0.88,
            'Aston Martin': 0.85
        };
        return efficiency[teamName] || 0.80;
    }

    getTireImpact(compound, circuitType) {
        if (circuitType === 'street' && compound === 'soft') return -1;
        if (circuitType === 'permanent' && compound === 'medium') return -0.5;
        return 0;
    }

    getPointsForPosition(position) {
        const points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
        return position <= 10 ? points[position - 1] : 0;
    }

    /**
     * Generate upcoming race data for prediction
     */
    generateUpcomingRace(circuitName) {
        const circuit = this.circuits.find(c => c.name === circuitName) || this.circuits[0];
        const weather = this.weather[Math.floor(Math.random() * this.weather.length)];
        
        // Generate realistic qualifying positions based on team performance
        const qualifyingPositions = this.generateRealisticQualifying();
        
        return this.drivers.map((driver, index) => ({
            name: driver.name,
            team: driver.team,
            circuit: circuit.name,
            circuit_type: circuit.type,
            weather: weather,
            qualifying_position: qualifyingPositions[index],
            tire_compound: this.selectTireStrategy(driver, circuit),
            driver_points: this.getDriverPoints(driver.name),
            team_points: this.getTeamPoints(driver.team),
            recent_form: this.calculateRecentForm(driver.name),
            circuit_performance: this.calculateCircuitPerformance(driver.name, circuit.name),
            weather_factor: weather === 'dry' ? 1.0 : (weather === 'wet' ? 0.7 : 0.85),
            tire_strategy: this.getTireStrategyScore(this.selectTireStrategy(driver, circuit), circuit.type),
            pit_stop_efficiency: this.getPitEfficiency(driver.team)
        }));
    }
    
    generateRealisticQualifying() {
        // Create positions array
        const positions = Array.from({length: 20}, (_, i) => i + 1);
        
        // Shuffle with bias towards team performance
        const teamPerformance = {
            'McLaren': 1,
            'Ferrari': 2,
            'Red Bull Racing': 3,
            'Mercedes': 4,
            'Aston Martin': 5
        };
        
        // Assign positions with some randomness but respecting team hierarchy
        const driverPositions = this.drivers.map(driver => {
            const teamRank = teamPerformance[driver.team] || 6;
            const basePosition = (teamRank - 1) * 2 + (Math.random() < 0.5 ? 1 : 2);
            const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2
            return Math.max(1, Math.min(20, basePosition + variation));
        });
        
        // Ensure no duplicates by adjusting
        const usedPositions = new Set();
        return driverPositions.map(pos => {
            let finalPos = pos;
            while (usedPositions.has(finalPos)) {
                finalPos = (finalPos % 20) + 1;
            }
            usedPositions.add(finalPos);
            return finalPos;
        });
    }

    /**
     * Get all drivers
     */
    getDrivers() {
        return this.drivers;
    }

    /**
     * Get all circuits
     */
    getCircuits() {
        return this.circuits;
    }
}

export default F1DataGenerator;
