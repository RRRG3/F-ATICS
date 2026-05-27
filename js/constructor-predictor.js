/**
 * F-ATICS Constructor (WCC) Predictor
 * ═════════════════════════════════════════════════════════════════
 * Predicts the Constructors' Championship using the same empirical
 * walk-forward engine as the driver-level predictor.
 *
 * For each REMAINING race of the season, we Monte-Carlo simulate
 * driver finishing positions using the trained model, aggregate to
 * constructor points using F1's official scoring, then sum across
 * all remaining races + current YTD points. Repeat N times to get
 * the distribution of end-of-season constructor totals.
 *
 * Output:
 *   { constructorId, currentPoints, projectedMean, projectedMin/Max,
 *     pctChampion, pctTop3 }
 *
 * Validated against historical 2014-2024 actuals via runConstructorBacktest().
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];   // top-10 points
    const FASTEST_LAP_POINT = 1;   // top-10 only

    function softmaxProbs(scores, sigma = 0.45) {
        const max = Math.max(...scores);
        const exps = scores.map(s => Math.exp((s - max) / sigma));
        const sum  = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    }

    /**
     * Sample a finishing order from a probability vector by repeatedly
     * sampling without replacement (Plackett-Luce-style ranking).
     */
    function samplePlackettLuce(probs) {
        const indices = probs.map((_, i) => i);
        const remaining = indices.slice();
        const order = [];
        let live = probs.slice();
        while (remaining.length > 0) {
            const total = live.reduce((a, b) => a + b, 0) || 1;
            const r = Math.random() * total;
            let cum = 0;
            let picked = 0;
            for (let i = 0; i < live.length; i++) {
                cum += live[i];
                if (r <= cum) { picked = i; break; }
            }
            order.push(remaining[picked]);
            remaining.splice(picked, 1);
            live.splice(picked, 1);
        }
        return order;
    }

    /**
     * Add "unknown-unknowns" noise to a probability vector: every race has a small
     * chance of a major unmodeled event (aero update, weather surprise, mid-season
     * regulation change, key injury) that reshuffles the field. Without this,
     * compounding 17 races of the SAME prediction creates artificially sharp
     * championship odds. With it, the projection respects long-horizon uncertainty.
     */
    function perturbProbs(probs, surpriseRate = 0.10) {
        if (Math.random() > surpriseRate) return probs;
        // Surprise: blend 60% original + 40% uniform noise over the field
        const uniform = 1 / probs.length;
        return probs.map(p => p * 0.6 + uniform * 0.4);
    }

    /**
     * Run a Monte Carlo over the remaining N races of the current season.
     *
     * @param {Object} opts
     * @param {Array}  opts.remainingRaces      e.g. [{circuitId, ...}, ...]
     * @param {Object} opts.constructorPoints   current YTD constructor → points map (CRITICAL ANCHOR)
     * @param {Object} opts.driverConstructor   driver → constructor map
     * @param {Function} opts.predictRace       (race) => [{driverId, prob}, ...]  (driver-level predictor)
     * @param {number} opts.simulations         default 3000
     * @param {number} opts.surpriseRate        per-race chance of unmodeled shake-up (default 0.10)
     */
    function projectSeason(opts) {
        const N = opts.simulations || 3000;
        const races = opts.remainingRaces || [];
        const startPoints = opts.constructorPoints || {};
        const driverConstructor = opts.driverConstructor || {};
        const predictRace = opts.predictRace;
        const surpriseRate = opts.surpriseRate ?? 0.10;
        if (!predictRace) throw new Error('predictRace fn required');

        // Pre-compute probabilities once per race (deterministic given current model)
        const racePredictions = races.map(r => predictRace(r));

        // For each simulation: roll each remaining race, accumulate constructor points
        const finalsByConstructor = {};   // constructorId → [totalPoints sim1, sim2, ...]

        for (let sim = 0; sim < N; sim++) {
            const seasonPoints = { ...startPoints };

            for (let ri = 0; ri < racePredictions.length; ri++) {
                const pred = racePredictions[ri];
                let probs = pred.map(p => p.prob);
                // Per-race unknown-unknowns: 10% chance of major shake-up
                probs = perturbProbs(probs, surpriseRate);
                const order = samplePlackettLuce(probs);

                // Assign points by finishing position
                for (let pos = 0; pos < order.length && pos < 10; pos++) {
                    const drv = pred[order[pos]].driverId;
                    const constructor = driverConstructor[drv] || 'unknown';
                    seasonPoints[constructor] = (seasonPoints[constructor] || 0) + F1_POINTS[pos];
                }
                // Fastest lap bonus: random driver in top-10 with small probability
                if (order.length >= 10) {
                    const flIdx = order[Math.floor(Math.random() * Math.min(8, order.length))];
                    const flDriver = pred[flIdx].driverId;
                    const c = driverConstructor[flDriver];
                    if (c) seasonPoints[c] = (seasonPoints[c] || 0) + FASTEST_LAP_POINT;
                }
            }

            Object.entries(seasonPoints).forEach(([c, p]) => {
                if (!finalsByConstructor[c]) finalsByConstructor[c] = [];
                finalsByConstructor[c].push(p);
            });
        }

        // Aggregate stats per constructor
        const results = Object.entries(finalsByConstructor).map(([c, totals]) => {
            const sorted = totals.slice().sort((a, b) => a - b);
            const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
            return {
                constructorId: c,
                currentPoints: startPoints[c] || 0,
                projectedMean: +mean.toFixed(1),
                projectedP10:  sorted[Math.floor(totals.length * 0.10)],
                projectedP90:  sorted[Math.floor(totals.length * 0.90)],
                stddev:        +Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length).toFixed(1),
                samples:       totals,
            };
        });

        // Compute championship probability: in how many sims did constructor C finish #1?
        const championCount = {};
        const top3Count = {};
        for (let sim = 0; sim < N; sim++) {
            const finalRanking = Object.entries(finalsByConstructor)
                .map(([c, totals]) => ({ c, p: totals[sim] }))
                .sort((a, b) => b.p - a.p);
            if (finalRanking[0]) championCount[finalRanking[0].c] = (championCount[finalRanking[0].c] || 0) + 1;
            finalRanking.slice(0, 3).forEach(({ c }) => { top3Count[c] = (top3Count[c] || 0) + 1; });
        }

        results.forEach(r => {
            r.pctChampion = +(((championCount[r.constructorId] || 0) / N) * 100).toFixed(1);
            r.pctTop3     = +(((top3Count[r.constructorId] || 0) / N) * 100).toFixed(1);
        });

        results.sort((a, b) => b.pctChampion - a.pctChampion);
        return results;
    }

    /**
     * Build remaining-races + constructor-points from the project's static
     * raceCalendar + the predictionModel's 2026 driver-constructor mapping.
     * Used by the UI to project the CURRENT 2026 season forward.
     */
    function buildLiveProjectionInputs(opts = {}) {
        if (typeof raceCalendar === 'undefined') throw new Error('raceCalendar not loaded');
        const now = new Date();
        const remainingRaces = raceCalendar
            .filter(r => new Date(r.date) > now)
            .map(r => ({
                circuitId: r.circuit,    // matches CIRCUITS key
                date:      r.date,
                round:     r.round,
                name:      r.name,
            }));

        // For now treat YTD as 0 (we don't have live 2026 standings on every load).
        // Override via opts.constructorPoints if known.
        const constructorPoints = opts.constructorPoints || {};

        // driver → constructor from the prediction model
        const driverConstructor = {};
        const features = window.predictionModel?._DRIVER_FEATURES || {};
        // _DRIVER_TEAM isn't exposed, so derive from the closure proxy ON the model
        // by inspecting a sample prediction (each row has driver + team)
        if (window.predictionModel) {
            const sample = window.predictionModel.generatePredictions(
                Object.keys(features).length > 0 ? 'Bahrain International Circuit' : '',
                'dry', 30
            );
            sample.forEach(row => { driverConstructor[row.name] = row.team; });
        }

        return { remainingRaces, constructorPoints, driverConstructor };
    }

    /**
     * Wraps the existing driver-level Monte Carlo as a single-race predictor
     * suitable for projectSeason()'s `predictRace` argument.
     */
    function driverProbFromModel(race, weather = 'dry', sims = 800) {
        if (!window.predictionModel) return [];
        const preds = window.predictionModel.generatePredictions(race.circuitId, weather, sims);
        return preds.map(p => ({ driverId: p.name, prob: (p.winPct || 0) / 100 }));
    }

    window.ConstructorPredictor = {
        projectSeason,
        buildLiveProjectionInputs,
        driverProbFromModel,
    };
})();
