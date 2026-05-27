/**
 * F-ATICS Predictor Metrics
 * ═════════════════════════════════════════════════════════════════
 * Quant-grade evaluation primitives:
 *   • Brier score          — calibration loss on probability vectors
 *   • Log-loss             — penalises overconfidence harder than Brier
 *   • Top-K hit rate       — model-agnostic accuracy
 *   • Kelly criterion      — optimal stake sizing given edge
 *   • Expected value (EV)  — for value-bet detection
 *
 * All functions are pure. No state. Easy to unit-test.
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    /**
     * Brier score on a probability vector vs one-hot outcome.
     * Lower is better. Perfect calibration = 0. Random = ~0.5 / N drivers.
     *
     * @param {Object<string, number>} probs   driverName → probability (0..1)
     * @param {string} actualWinner            name of actual race winner
     * @returns {number}                       Brier loss for this single race
     */
    function brierSingleRace(probs, actualWinner) {
        let sum = 0;
        const names = Object.keys(probs);
        for (const name of names) {
            const p = probs[name];
            const o = (name === actualWinner) ? 1 : 0;
            sum += (p - o) ** 2;
        }
        return sum / names.length;
    }

    /**
     * Log-loss (cross-entropy) — penalises confidently-wrong predictions harshly.
     * For win prediction only: -log(p_actualWinner).
     */
    function logLossSingleRace(probs, actualWinner) {
        const p = Math.max(probs[actualWinner] || 1e-9, 1e-9);
        return -Math.log(p);
    }

    /**
     * Top-K hit rate: does the model's top-K predicted set contain the actual winner?
     */
    function topKHit(rankedNames, actualWinner, k = 3) {
        return rankedNames.slice(0, k).includes(actualWinner) ? 1 : 0;
    }

    /**
     * Kelly criterion — optimal fraction of bankroll to wager.
     *
     *   f* = (b·p - q) / b
     *   where p = model's prob, q = 1-p, b = decimal_odds - 1 (net payoff per unit)
     *
     * Returns 0 if no edge (would lose money long-term). Capped at 25% to cap drawdown.
     *
     * @param {number} modelProb        Model's win probability (0..1)
     * @param {number} decimalOdds      Bookmaker's decimal odds (e.g. 2.50)
     * @param {number} maxFraction      Safety cap (default 0.25 = "quarter-Kelly")
     */
    function kellyFraction(modelProb, decimalOdds, maxFraction = 0.25) {
        if (!Number.isFinite(modelProb) || !Number.isFinite(decimalOdds)) return 0;
        if (modelProb <= 0 || decimalOdds <= 1) return 0;
        const b = decimalOdds - 1;
        const p = modelProb;
        const q = 1 - p;
        const f = (b * p - q) / b;
        if (f <= 0) return 0;            // no edge — don't bet
        return Math.min(f, maxFraction); // cap risk
    }

    /**
     * Expected value of a 1-unit bet — positive means +EV (model thinks bookmaker is wrong).
     */
    function expectedValue(modelProb, decimalOdds) {
        if (!Number.isFinite(modelProb) || !Number.isFinite(decimalOdds)) return 0;
        const win  = (decimalOdds - 1) * modelProb;
        const lose = -1 * (1 - modelProb);
        return win + lose;
    }

    /**
     * Edge percentage: (model_implied_odds / bookmaker_odds - 1) × -1
     * Positive = +EV, i.e. model thinks the true odds should be lower than book.
     */
    function edgePercent(modelProb, decimalOdds) {
        if (modelProb <= 0 || decimalOdds <= 1) return 0;
        const modelOdds = 1 / modelProb;
        return ((decimalOdds / modelOdds) - 1) * 100;
    }

    /**
     * Aggregate a list of single-race scores into mean / stderr.
     */
    function aggregate(scores) {
        if (!scores.length) return { mean: 0, stderr: 0, n: 0 };
        const n = scores.length;
        const mean = scores.reduce((a, b) => a + b, 0) / n;
        const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1);
        const stderr = Math.sqrt(variance / n);
        return { mean: +mean.toFixed(4), stderr: +stderr.toFixed(4), n };
    }

    /**
     * Reliability bins — for calibration plots. Bucket predictions by predicted
     * probability and compute observed frequency per bucket. Perfectly calibrated
     * model has observed == predicted for every bucket.
     *
     * @param {Array<{prob:number, outcome:0|1}>} pairs
     * @param {number} bins                              number of buckets (default 10)
     */
    function calibrationBuckets(pairs, bins = 10) {
        const buckets = Array.from({ length: bins }, (_, i) => ({
            lo: i / bins,
            hi: (i + 1) / bins,
            count: 0,
            predictedSum: 0,
            actualSum: 0,
        }));
        for (const { prob, outcome } of pairs) {
            const idx = Math.min(Math.floor(prob * bins), bins - 1);
            buckets[idx].count += 1;
            buckets[idx].predictedSum += prob;
            buckets[idx].actualSum += outcome;
        }
        return buckets.map(b => ({
            range:     `${(b.lo * 100).toFixed(0)}-${(b.hi * 100).toFixed(0)}%`,
            n:         b.count,
            predicted: b.count ? +(b.predictedSum / b.count).toFixed(3) : null,
            actual:    b.count ? +(b.actualSum    / b.count).toFixed(3) : null,
        }));
    }

    // Expose globally — used by prediction-model.js and the UI
    window.PredictorMetrics = {
        brierSingleRace,
        logLossSingleRace,
        topKHit,
        kellyFraction,
        expectedValue,
        edgePercent,
        aggregate,
        calibrationBuckets,
    };
})();
