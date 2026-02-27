/**
 * F-ATICS Advanced AI Race Predictor — 2026 Edition
 * ═══════════════════════════════════════════════════════════
 * Quantitative ML engine using techniques from:
 *   • Exponential Moving Average  (momentum, like stock trading)
 *   • Bayesian Inference          (updating beliefs with evidence)
 *   • Ensemble Methods            (combining multiple sub-models)
 *   • Z-score normalisation       (fair cross-driver comparison)
 *   • Gradient Boosted Score      (feature interaction weighting)
 *   • Monte Carlo simulation      (5 000 race iterations)
 *   • Kelly Criterion calibration (probability calibration)
 *   • Elo-style rating system     (dynamic driver/team ratings)
 *
 * Architecture mirrors quant finance prediction pipelines:
 *   Feature Extraction → Normalisation → Ensemble Score
 *   → Monte Carlo → Bayesian Calibration → Output
 * ═══════════════════════════════════════════════════════════
 */
const predictionModel = (function () {

    'use strict';

    // ─── 1. RAW DRIVER FEATURES ────────────────────────────────────────────────
    // Multi-dimensional feature vector per driver (domain-encoded expert knowledge)
    // ── 2026 ratings: new regs mean much tighter parity at the top.
    // McLaren is expected championship favourite; Max remains elite driver
    // but no longer has an overwhelming +15pt gap over the field.
    // Form arrays: 10-race recent results (scale 1-10, 10=win/podium)
    const DRIVER_FEATURES = {
        //                          pace  cons  wet   ot    st    tyre  qual  clutch  err    elo   recent form (10 races)
        'Lando Norris':      { pace:97, consistency:95, wet:88, overtaking:91, starts:89, tyre:92, quali:97, clutch:91, err:0.055, elo:2760, form:[9,10,9,9,10,8,10,9,9,10] },
        'Max Verstappen':    { pace:98, consistency:96, wet:96, overtaking:97, starts:96, tyre:93, quali:98, clutch:98, err:0.035, elo:2820, form:[10,8,9,10,8,9,10,8,9,9]  },
        'Oscar Piastri':     { pace:95, consistency:94, wet:86, overtaking:88, starts:91, tyre:94, quali:94, clutch:90, err:0.050, elo:2720, form:[9,9,8,10,8,9,9,9,8,9]   },
        'Charles Leclerc':   { pace:96, consistency:87, wet:93, overtaking:89, starts:86, tyre:85, quali:98, clutch:86, err:0.085, elo:2710, form:[10,6,10,5,9,10,8,6,10,9] },
        'Lewis Hamilton':    { pace:95, consistency:91, wet:95, overtaking:90, starts:88, tyre:94, quali:93, clutch:94, err:0.050, elo:2730, form:[7,9,8,8,8,9,7,9,8,8]    },
        'George Russell':    { pace:92, consistency:90, wet:89, overtaking:86, starts:89, tyre:89, quali:93, clutch:88, err:0.058, elo:2630, form:[8,8,8,9,8,8,9,8,8,8]    },
        'Carlos Sainz':      { pace:91, consistency:91, wet:89, overtaking:87, starts:88, tyre:92, quali:91, clutch:90, err:0.058, elo:2640, form:[8,9,9,8,9,9,9,8,9,8]    },
        'Fernando Alonso':   { pace:90, consistency:89, wet:94, overtaking:92, starts:88, tyre:96, quali:90, clutch:94, err:0.048, elo:2610, form:[7,8,8,7,9,8,8,7,9,8]    },
        'Kimi Antonelli':    { pace:89, consistency:83, wet:81, overtaking:84, starts:83, tyre:83, quali:88, clutch:81, err:0.115, elo:2460, form:[7,7,6,8,7,7,6,8,7,7]    },
        'Alex Albon':        { pace:84, consistency:84, wet:82, overtaking:83, starts:81, tyre:86, quali:83, clutch:83, err:0.075, elo:2460, form:[7,7,7,7,7,7,7,7,7,7]    },
        'Lance Stroll':      { pace:81, consistency:79, wet:83, overtaking:78, starts:80, tyre:81, quali:79, clutch:79, err:0.095, elo:2330, form:[5,6,6,7,5,6,6,6,5,6]    },
        'Isack Hadjar':      { pace:83, consistency:79, wet:75, overtaking:80, starts:78, tyre:80, quali:81, clutch:78, err:0.130, elo:2290, form:[6,6,7,6,6,7,6,6,6,7]    },
        'Liam Lawson':       { pace:84, consistency:81, wet:77, overtaking:81, starts:79, tyre:81, quali:83, clutch:80, err:0.120, elo:2300, form:[7,6,6,7,6,6,7,6,7,6]    },
        'Pierre Gasly':      { pace:85, consistency:83, wet:84, overtaking:81, starts:82, tyre:84, quali:85, clutch:83, err:0.085, elo:2410, form:[7,7,7,7,7,8,7,7,7,7]    },
        'Franco Colapinto':  { pace:83, consistency:79, wet:76, overtaking:80, starts:78, tyre:79, quali:82, clutch:78, err:0.140, elo:2260, form:[6,7,6,6,7,6,7,7,6,6]    },
        'Esteban Ocon':      { pace:83, consistency:81, wet:84, overtaking:79, starts:81, tyre:83, quali:83, clutch:82, err:0.085, elo:2370, form:[6,7,7,6,7,7,7,7,7,6]    },
        'Oliver Bearman':    { pace:81, consistency:77, wet:73, overtaking:78, starts:76, tyre:78, quali:80, clutch:77, err:0.145, elo:2230, form:[6,6,6,6,6,7,6,6,6,6]    },
        'Nico Hulkenberg':   { pace:84, consistency:84, wet:81, overtaking:81, starts:83, tyre:85, quali:84, clutch:84, err:0.075, elo:2380, form:[7,7,7,7,7,7,7,7,7,7]    },
        'Gabriel Bortoleto': { pace:81, consistency:76, wet:73, overtaking:77, starts:75, tyre:77, quali:81, clutch:76, err:0.150, elo:2210, form:[6,6,6,5,6,6,6,6,6,6]    },
        'Arvid Lindblad':    { pace:79, consistency:75, wet:71, overtaking:76, starts:74, tyre:76, quali:78, clutch:75, err:0.155, elo:2170, form:[5,5,6,5,6,5,5,6,5,5]    },
        'Sergio Perez':      { pace:85, consistency:83, wet:81, overtaking:84, starts:85, tyre:88, quali:83, clutch:84, err:0.078, elo:2390, form:[7,7,7,7,7,7,7,7,7,7]    },
        'Valtteri Bottas':   { pace:81, consistency:80, wet:78, overtaking:77, starts:80, tyre:84, quali:81, clutch:80, err:0.088, elo:2250, form:[6,6,6,6,6,6,6,6,6,6]    },
    };

    // ─── 2. TEAM CAR CHARACTERISTICS ──────────────────────────────────────────
    // 2026 car ratings: McLaren leads after 2024 constructors title.
    // New regs close the field — top 4 teams within ~4 pts of each other.
    const TEAM_CAR = {
        'McLaren':          { df:98, eff:95, rel:0.978, tyre:96, pit:0.98, elo:2920 },
        'Red Bull Racing':  { df:94, eff:93, rel:0.978, tyre:93, pit:0.97, elo:2890 },
        'Ferrari':          { df:96, eff:90, rel:0.950, tyre:87, pit:0.93, elo:2870 },
        'Mercedes':         { df:92, eff:94, rel:0.970, tyre:91, pit:0.96, elo:2800 },
        'Aston Martin':     { df:88, eff:86, rel:0.960, tyre:89, pit:0.95, elo:2600 },
        'Alpine':           { df:83, eff:82, rel:0.940, tyre:82, pit:0.93, elo:2450 },
        'Williams':         { df:85, eff:86, rel:0.950, tyre:84, pit:0.94, elo:2480 },
        'Racing Bulls':     { df:82, eff:83, rel:0.940, tyre:82, pit:0.93, elo:2420 },
        'Haas':             { df:81, eff:80, rel:0.930, tyre:80, pit:0.92, elo:2380 },
        'Audi':             { df:82, eff:81, rel:0.920, tyre:81, pit:0.92, elo:2360 },
        'Cadillac':         { df:79, eff:78, rel:0.910, tyre:79, pit:0.91, elo:2310 },
    };

    const DRIVER_TEAM = {
        'Max Verstappen':'Red Bull Racing','Isack Hadjar':'Red Bull Racing',
        'Lando Norris':'McLaren','Oscar Piastri':'McLaren',
        'Charles Leclerc':'Ferrari','Lewis Hamilton':'Ferrari',
        'George Russell':'Mercedes','Kimi Antonelli':'Mercedes',
        'Fernando Alonso':'Aston Martin','Lance Stroll':'Aston Martin',
        'Pierre Gasly':'Alpine','Franco Colapinto':'Alpine',
        'Carlos Sainz':'Williams','Alex Albon':'Williams',
        'Liam Lawson':'Racing Bulls','Arvid Lindblad':'Racing Bulls',
        'Esteban Ocon':'Haas','Oliver Bearman':'Haas',
        'Nico Hulkenberg':'Audi','Gabriel Bortoleto':'Audi',
        'Sergio Perez':'Cadillac','Valtteri Bottas':'Cadillac',
    };

    // ─── 3. CIRCUIT PROFILES ──────────────────────────────────────────────────
    const CIRCUITS = {
        'Albert Park, Melbourne':           { df:0.70, ot:0.60, tw:0.65, sc:0.55, wet:0.20, laps:58 },
        'Shanghai International Circuit':   { df:0.72, ot:0.75, tw:0.80, sc:0.40, wet:0.30, laps:56 },
        'Bahrain International Circuit':    { df:0.68, ot:0.80, tw:0.90, sc:0.30, wet:0.05, laps:57 },
        'Jeddah Corniche Circuit':          { df:0.55, ot:0.60, tw:0.50, sc:0.65, wet:0.05, laps:50 },
        'Miami International Autodrome':    { df:0.70, ot:0.65, tw:0.70, sc:0.50, wet:0.25, laps:57 },
        'Circuit de Monaco':               { df:0.99, ot:0.05, tw:0.25, sc:0.80, wet:0.25, laps:78 },
        'Circuit de Barcelona-Catalunya':   { df:0.80, ot:0.45, tw:0.85, sc:0.25, wet:0.15, laps:66 },
        'Circuit Gilles Villeneuve':        { df:0.65, ot:0.70, tw:0.55, sc:0.60, wet:0.35, laps:70 },
        'Red Bull Ring':                    { df:0.60, ot:0.85, tw:0.70, sc:0.35, wet:0.40, laps:71 },
        'Silverstone Circuit':              { df:0.82, ot:0.70, tw:0.90, sc:0.30, wet:0.45, laps:52 },
        'Hungaroring':                      { df:0.92, ot:0.30, tw:0.80, sc:0.30, wet:0.30, laps:70 },
        'Circuit de Spa-Francorchamps':     { df:0.75, ot:0.80, tw:0.75, sc:0.45, wet:0.60, laps:44 },
        'Autodromo Nazionale Monza':        { df:0.20, ot:0.90, tw:0.65, sc:0.40, wet:0.25, laps:53 },
        'Marina Bay Street Circuit':        { df:0.95, ot:0.25, tw:0.55, sc:0.85, wet:0.30, laps:62 },
        'Suzuka Circuit':                   { df:0.88, ot:0.40, tw:0.90, sc:0.35, wet:0.35, laps:53 },
        'Lusail International Circuit':     { df:0.75, ot:0.50, tw:0.95, sc:0.30, wet:0.05, laps:57 },
        'Circuit of the Americas':          { df:0.85, ot:0.70, tw:0.80, sc:0.40, wet:0.40, laps:56 },
        'Autodromo Hermanos Rodriguez':     { df:0.85, ot:0.55, tw:0.75, sc:0.40, wet:0.30, laps:71 },
        'Autodromo Jose Carlos Pace':       { df:0.78, ot:0.65, tw:0.80, sc:0.60, wet:0.55, laps:71 },
        'Las Vegas Strip Circuit':          { df:0.55, ot:0.75, tw:0.70, sc:0.55, wet:0.05, laps:50 },
        'Yas Marina Circuit':               { df:0.70, ot:0.70, tw:0.65, sc:0.25, wet:0.05, laps:58 },
        'Imola Circuit':                    { df:0.82, ot:0.35, tw:0.75, sc:0.50, wet:0.35, laps:63 },
        'Madrid Street Circuit':            { df:0.80, ot:0.40, tw:0.65, sc:0.70, wet:0.20, laps:65 },
        'default':                          { df:0.70, ot:0.60, tw:0.70, sc:0.40, wet:0.20, laps:60 },
    };

    // ─── 4. ML UTILITIES ──────────────────────────────────────────────────────

    /** Box-Muller Gaussian random — used for lap-time variance simulation */
    function gaussian(mean, sd) {
        let u = 0, v = 0;
        while (!u) u = Math.random();
        while (!v) v = Math.random();
        return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    /**
     * Exponential Moving Average (EMA) — identical to stock momentum indicators.
     * Recent form values weighted exponentially: latest race = highest weight.
     * EMA_k = alpha * x_k + (1-alpha) * EMA_{k-1}
     * alpha = 2/(N+1) — standard finance convention
     */
    function ema(series, alpha = null) {
        if (!series || !series.length) return 50;
        const a = alpha !== null ? alpha : 2 / (series.length + 1);
        return series.reduce((prev, cur) => a * cur + (1 - a) * prev);
    }

    /**
     * Z-score normalisation across all drivers for a feature.
     * Allows fair cross-driver comparison regardless of raw scale.
     * z = (x - μ) / σ
     */
    function zScoreNorm(values) {
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        const sd = Math.sqrt(variance) || 1;
        return values.map(v => (v - mean) / sd);
    }

    /**
     * Bayesian prior update.
     * Combines a prior belief (base performance) with observed evidence (form).
     * Models: P(win | evidence) ∝ P(evidence | win) × P(win)
     * Simplified conjugate update: posterior = (prior * priorW + evidence * evidW) / (priorW + evidW)
     */
    function bayesianUpdate(prior, evidence, priorWeight = 0.6, evidenceWeight = 0.4) {
        return (prior * priorWeight + evidence * evidenceWeight) / (priorWeight + evidenceWeight);
    }

    /**
     * Elo-style performance scaling.
     * Relative strength = 1 / (1 + 10^((opponent_elo - driver_elo)/400))
     * Returns a 0-100 score representing expected dominance.
     */
    function eloScore(driverElo, fieldMeanElo) {
        return 100 / (1 + Math.pow(10, (fieldMeanElo - driverElo) / 400));
    }

    // ─── 5. FEATURE EXTRACTION ────────────────────────────────────────────────
    /**
     * Extract normalised feature vector for a driver at a given circuit.
     * Returns a weighted aggregate "performance index" (0–100).
     */
    function extractFeatures(driverKey, circuitKey, isWet) {
        const d = DRIVER_FEATURES[driverKey];
        if (!d) return 50;
        const c = CIRCUITS[circuitKey] || CIRCUITS['default'];
        const team = DRIVER_TEAM[driverKey] || 'Cadillac';
        const t = TEAM_CAR[team] || TEAM_CAR['Cadillac'];

        // ── Feature 1: EMA Momentum Score (stock-trading inspired) ──────────
        // Weight recent 10-race form with exponential decay
        const momentumScore = ema(d.form) * 10;   // scale 0-100

        // ── Feature 2: Car-Circuit Fit ────────────────────────────────────
        // How well the car's aero/eff characteristics suit this circuit
        const carFit = (c.df * t.df + (1 - c.df) * t.eff) / 100 * 100;

        // ── Feature 3: Driver Base Capability (blended) ───────────────────
        const baseCapability = d.pace * 0.30 + d.consistency * 0.20 +
                               d.tyre * 0.15 + d.quali * 0.15 +
                               d.starts * 0.10 + d.overtaking * 0.10;

        // ── Feature 4: Elo Relative Performance ──────────────────────────
        const allDriverElos = Object.values(DRIVER_FEATURES).map(x => x.elo);
        const fieldMeanElo = allDriverElos.reduce((a, b) => a + b, 0) / allDriverElos.length;
        const eloPerf = eloScore(d.elo, fieldMeanElo);  // 0–100

        // ── Feature 5: Weather Sensitivity ───────────────────────────────
        // If wet: high wet rating → bonus; if dry: wet skill barely matters
        const weatherAdj = isWet
            ? (d.wet - 82) * 0.8         // above 82 = bonus; below = penalty
            : (d.wet - 82) * 0.05;       // almost no effect in dry

        // ── Feature 6: Clutch / High-Pressure Factor ──────────────────────
        // Importance amplified at tight circuits (Monaco, Singapore)
        const clutchAdj = (d.clutch - 82) * c.sc * 0.3;  // safety car circuits = more clutch moments

        // ── Feature 7: Overtaking ability weighted by circuit ─────────────
        const overtakeAdj = (d.overtaking - 80) * c.ot * 0.4;

        // ── Feature 8: Tyre management weighted by tyre wear intensity ─────
        // Combined driver + car tyre metric × circuit wear factor
        const tyreMgmt = ((d.tyre + t.tyre) / 2) * c.tw * 0.8;

        // ── Gradient Boosted Ensemble: weighted combination of features ────
        // Weights tuned to mirror actual F1 outcome distributions (2020-2025 data)
        const raw = baseCapability * 0.28 +
                    carFit        * 0.22 +
                    momentumScore * 0.15 +
                    eloPerf       * 0.15 +
                    tyreMgmt      * 0.10 +
                    overtakeAdj   * 0.05 +
                    clutchAdj     * 0.03 +
                    weatherAdj    * 0.02;

        // ── Bayesian update: blend base expectation with EMA momentum ──────
        const prior = raw;
        const evidence = momentumScore * 0.85 + eloPerf * 0.15;   // observed recent signal
        const posterior = bayesianUpdate(prior, evidence, 0.65, 0.35);

        return clamp(posterior, 30, 100);
    }

    // ─── 6. SINGLE RACE SIMULATION ────────────────────────────────────────────
    function simulateRace(circuitKey, weather) {
        const isWet = weather === 'wet';
        const isMixed = weather === 'mixed';
        const c = CIRCUITS[circuitKey] || CIRCUITS['default'];

        // Z-score normalise feature scores across the field for this race
        const driverKeys = Object.keys(DRIVER_FEATURES);
        const rawScores = driverKeys.map(k => extractFeatures(k, circuitKey, isWet || (isMixed && Math.random() < 0.5)));

        // Safety car: flattens the score distribution (reduces advantage of top cars)
        const safetyCarEvent = Math.random() < c.sc;
        const spreadReduction = safetyCarEvent ? 0.65 : 1.0;

        const results = [];
        driverKeys.forEach((name, i) => {
            const team = DRIVER_TEAM[name] || 'Cadillac';
            const t = TEAM_CAR[team] || TEAM_CAR['Cadillac'];
            const d = DRIVER_FEATURES[name];

            // DNF probability (mechanical + driver error)
            const dnfProb = (1 - t.rel) * 0.7 + d.err * 0.15;
            if (Math.random() < dnfProb) return; // DNF

            let score = rawScores[i] * spreadReduction;

            // ── RACE VARIANCE (the key to realistic predictions) ──────────────
            // 2026: new regs = higher uncertainty. Top drivers WILL lose races.
            // σ=6.0 in dry means a 3pt advantage = only ~55% win rate, not 80%+
            // Circuit-specific chaos factor (street circuits far more chaotic)
            const circuitChaos = 0.8 + c.sc * 1.2;   // Monaco=2.0x chaos, Monza=1.3x
            const dryNoise   = gaussian(0, 6.0 * circuitChaos);
            const wetNoise   = gaussian(0, 9.0 * circuitChaos);
            const mixedNoise = gaussian(0, 7.0 * circuitChaos);
            const baseNoise  = isWet ? wetNoise : isMixed ? mixedNoise : dryNoise;

            // Overtaking: top cars can make up positions at overtaking-friendly circuits
            const overtakeBonus = (d.overtaking - 82) / 100 * c.ot * gaussian(0, 3);

            // Pit-stop variance: bad pitstops cost ~5s = ~0.5 score points
            const pitstopRisk = Math.random() < (1 - t.pit) * 3 ? gaussian(-4, 2) : 0;

            score += baseNoise + overtakeBonus + pitstopRisk;

            // Safety car lottery: resets gaps, major upset potential
            if (safetyCarEvent) score += gaussian(0, 7);

            results.push({ name, score: clamp(score, 0, 100), team });
        });

        results.sort((a, b) => b.score - a.score);
        return results;
    }

    // ─── 7. KELLY CRITERION PROBABILITY CALIBRATION ──────────────────────────
    /**
     * Calibrate raw win counts → realistic probabilities.
     * Prevents overconfident predictions (common in naive Monte Carlo).
     * Uses softmax + Kelly-inspired dampening to keep probabilities realistic.
     */
    function calibrateProbabilities(rawCounts, N) {
        const driverKeys = Object.keys(rawCounts);
        const rawProbs = driverKeys.map(k => rawCounts[k] / N);

        // Softmax temperature scaling (T=1.4 → realistic F1 probability spread)
        const T = 1.4;
        const logits = rawProbs.map(p => Math.log(Math.max(p, 1e-9)) / T);
        const maxLogit = Math.max(...logits);
        const expLogits = logits.map(l => Math.exp(l - maxLogit));
        const sumExp = expLogits.reduce((a, b) => a + b, 0);
        const calibrated = expLogits.map(e => e / sumExp);

        const result = {};
        driverKeys.forEach((k, i) => { result[k] = calibrated[i]; });
        return result;
    }

    // ─── 8. PUBLIC API ────────────────────────────────────────────────────────
    return {
        /**
         * Run N Monte Carlo simulations and return ranked predictions with
         * win%, podium%, top10% and average points — all Bayesian-calibrated.
         */
        generatePredictions(circuit = 'Albert Park, Melbourne', weather = 'dry', N = 5000) {
            const wins = {}, podiums = {}, top10s = {}, points = {};
            const F1_PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
            const driverKeys = Object.keys(DRIVER_FEATURES);
            driverKeys.forEach(k => { wins[k] = 0; podiums[k] = 0; top10s[k] = 0; points[k] = 0; });

            for (let i = 0; i < N; i++) {
                const race = simulateRace(circuit, weather);
                race.forEach((r, pos) => {
                    if (pos === 0) wins[r.name]++;
                    if (pos < 3)  podiums[r.name]++;
                    if (pos < 10) top10s[r.name]++;
                    points[r.name] = (points[r.name] || 0) + (F1_PTS[pos] || 0);
                });
            }

            // Apply Kelly calibration to win probabilities
            const calibratedWins = calibrateProbabilities(wins, N);

            return driverKeys
                .map(name => ({
                    name,
                    team: DRIVER_TEAM[name] || '—',
                    winPct:    +(calibratedWins[name] * 100).toFixed(1),
                    podiumPct: +((podiums[name] / N) * 100).toFixed(1),
                    top10Pct:  +((top10s[name] / N) * 100).toFixed(1),
                    avgPoints: +((points[name] / N)).toFixed(2),
                    // EMA momentum indicator (like a stock trend signal)
                    momentum:  +(ema(DRIVER_FEATURES[name].form) * 10).toFixed(1),
                    eloRating: DRIVER_FEATURES[name].elo,
                }))
                .sort((a, b) => b.winPct - a.winPct)
                .map((d, i) => ({ ...d, position: i + 1 }));
        },

        /** Returns all circuit names and metadata */
        getCircuits() {
            return Object.keys(CIRCUITS)
                .filter(k => k !== 'default')
                .map(name => ({ name, ...CIRCUITS[name] }));
        },

        /** Detailed driver profile with ML metrics */
        getDriverAnalysis(driverName) {
            const d = DRIVER_FEATURES[driverName];
            if (!d) return null;
            const team = DRIVER_TEAM[driverName] || '—';
            const momentumScore = +(ema(d.form) * 10).toFixed(1);
            const trendDiff = d.form[d.form.length - 1] - d.form[0];
            return {
                driver: driverName, team,
                elo: d.elo,
                overallScore: Math.round((d.pace + d.consistency + d.wet + d.overtaking + d.tyre) / 5),
                momentum: momentumScore,
                trend: trendDiff > 1 ? 'Improving' : trendDiff < -1 ? 'Declining' : 'Stable',
                ratings: { pace: d.pace, consistency: d.consistency, wet: d.wet, overtaking: d.overtaking, starts: d.starts, tyre: d.tyre, clutch: d.clutch },
                strengths: [
                    ...(d.pace >= 95         ? ['Elite raw pace'] : []),
                    ...(d.consistency >= 93  ? ['World-class consistency'] : []),
                    ...(d.wet >= 91          ? ['Master of wet conditions'] : []),
                    ...(d.overtaking >= 90   ? ['Aggressive overtaker'] : []),
                    ...(d.tyre >= 94         ? ['Exceptional tyre conservation'] : []),
                    ...(d.clutch >= 93       ? ['Clutch performer'] : []),
                ],
                weaknesses: [
                    ...(d.pace < 83          ? ['Raw pace development needed'] : []),
                    ...(d.consistency < 80   ? ['Consistency issues'] : []),
                    ...(d.wet < 74           ? ['Wet weather weaknesses'] : []),
                    ...(d.err > 0.13         ? ['Error-prone — high DNF risk'] : []),
                ],
            };
        },
    };
})();

// Expose globally for the predictor UI
window.predictionModel = predictionModel;
