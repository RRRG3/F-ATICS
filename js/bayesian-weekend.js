/**
 * F-ATICS Bayesian Weekend Updater
 * ═════════════════════════════════════════════════════════════════
 * Treats a race weekend as a sequence of evidence-bearing sessions:
 *   FP1 → FP2 → FP3 → SQ → SR → Q1 → Q2 → Q3 → RACE
 *
 * Each completed session contributes a pace-signal that updates the
 * prior win probabilities. The math is Bayesian:
 *
 *     posterior ∝ prior × likelihood(session)
 *
 * The likelihood is built from each driver's pace-delta-to-fastest
 * in that session, mapped through a logistic with a session-specific
 * temperature (practice less informative than quali, quali less
 * informative than race-trim race-pace).
 *
 * Session weights (informativeness multipliers):
 *   FP1: 0.4   FP2: 0.7   FP3: 0.9
 *   SQ:  1.2   SR:  1.4
 *   Q1:  1.6   Q2:  1.8   Q3:  2.4     ← strongest pre-race signal
 *
 * Usage:
 *   const bw = new BayesianWeekend({ priorProbs: {...} });
 *   bw.ingestSession({type:'FP1', paceByDriver:{1: -0.2, 4: -0.1, ...}});
 *   bw.ingestSession({type:'Q3', paceByDriver:{...}});
 *   const updated = bw.posterior();    // {driverNumber: probability}
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    const SESSION_WEIGHTS = {
        FP1: 0.4,
        FP2: 0.7,
        FP3: 0.9,
        SQ: 1.2,
        SR: 1.4,    // sprint race
        Q1: 1.6,
        Q2: 1.8,
        Q3: 2.4,
    };

    // Convert pace delta (in seconds vs leader) to a likelihood score.
    // 0s delta = 1.0 likelihood. Each 0.5s slower → ~halved likelihood.
    function paceToLikelihood(deltaSec, sessionWeight) {
        // Logistic mapping: λ × exp(-α × delta)
        // α controls how steeply pace differences matter. 1.4 means 0.5s = 2x.
        const alpha = 1.4 * sessionWeight;
        return Math.exp(-alpha * Math.max(0, deltaSec));
    }

    function normalize(map) {
        const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
        const out = {};
        Object.keys(map).forEach(k => { out[k] = map[k] / total; });
        return out;
    }

    class BayesianWeekend {
        constructor(opts = {}) {
            // priorProbs: {driverNumber: probability}, must sum to ~1
            this.prior = opts.priorProbs ? normalize(opts.priorProbs) : {};
            this.posteriorProbs = { ...this.prior };
            this.history = [];   // [{type, weight, timestamp, driversSeen}]
        }

        /**
         * Ingest a session's pace data.
         *
         * @param {Object} session
         * @param {string} session.type           one of 'FP1'..'Q3', 'SQ', 'SR'
         * @param {Object<number, number>} session.paceByDriver
         *        deltaSec vs session leader, keyed by driverNumber.
         *        A driver who didn't post a time is omitted.
         * @param {number} [session.weightOverride] custom weight if provided
         */
        ingestSession(session) {
            const w = session.weightOverride ?? SESSION_WEIGHTS[session.type] ?? 1.0;
            const paceByDriver = session.paceByDriver || {};
            const driversSeen = Object.keys(paceByDriver);

            if (driversSeen.length === 0) {
                this.history.push({ type: session.type, weight: w, driversSeen: 0, skipped: true, timestamp: Date.now() });
                return this.posterior();
            }

            // Compute likelihoods
            const likelihood = {};
            const allDrivers = new Set([...Object.keys(this.posteriorProbs), ...driversSeen]);
            allDrivers.forEach(d => {
                if (paceByDriver[d] != null) {
                    likelihood[d] = paceToLikelihood(paceByDriver[d], w);
                } else {
                    // Driver wasn't in this session — assume neutral signal
                    likelihood[d] = 1.0;
                }
            });

            // Bayesian update
            const newPosterior = {};
            allDrivers.forEach(d => {
                const prior = this.posteriorProbs[d] || (1 / allDrivers.size);
                newPosterior[d] = prior * likelihood[d];
            });
            this.posteriorProbs = normalize(newPosterior);

            this.history.push({
                type: session.type,
                weight: w,
                driversSeen: driversSeen.length,
                timestamp: Date.now(),
            });
            return this.posterior();
        }

        posterior() {
            return { ...this.posteriorProbs };
        }

        getHistory() {
            return this.history.slice();
        }

        reset() {
            this.posteriorProbs = { ...this.prior };
            this.history = [];
        }
    }

    /**
     * Convenience: build a BayesianWeekend instance from a prediction-model
     * driver prediction array.
     */
    function fromPredictions(predictions) {
        const prior = {};
        predictions.forEach(p => {
            prior[p.name] = (p.winPct || 0) / 100;
        });
        return new BayesianWeekend({ priorProbs: prior });
    }

    /**
     * For a given session's lap features, derive paceByDriver as
     * {driverNumber: deltaSec vs fastest}. Used to feed live OpenF1 data
     * into the updater.
     */
    function paceFromOpenF1LapFeatures(features) {
        if (!features.length) return {};
        const fastestMs = Math.min(...features.map(f => f.ultimateMs).filter(Number.isFinite));
        if (!Number.isFinite(fastestMs)) return {};
        const out = {};
        features.forEach(f => {
            if (!Number.isFinite(f.ultimateMs)) return;
            out[f.driver_number] = (f.ultimateMs - fastestMs) / 1000;   // back to seconds
        });
        return out;
    }

    window.BayesianWeekend = {
        BayesianWeekend,
        fromPredictions,
        paceFromOpenF1LapFeatures,
        SESSION_WEIGHTS,
    };
})();
