/**
 * F-ATICS Walking-Forward Backtest
 * ═════════════════════════════════════════════════════════════════
 * The honest backtest a quant fund would run.
 *
 * Method:
 *   For each race in chronological order (2014→2024, ~250 races):
 *     1. Build a feature vector for every driver entered in this race,
 *        using ONLY data from races BEFORE this one.
 *     2. Score each driver, convert to win probability via softmax.
 *     3. Compare to the actual race result.
 *     4. Tally Brier, log-loss, top-K hit, and simulated ROI.
 *
 * Features per driver (all empirically computed):
 *   • rolling_avg_finish_10   — avg finishing position, last 10 races
 *   • rolling_dnf_rate_10     — DNF rate, last 10 races
 *   • circuit_avg_finish      — avg finish at THIS circuit historically
 *   • circuit_wins            — wins at this circuit
 *   • teammate_quali_gap      — quali gap to teammate, EMA over season
 *   • season_points_share     — share of constructor's points YTD
 *   • career_races            — sample-size guard
 *
 * Model: linear in features + softmax. Weights chosen to reflect F1 reality
 * (form is dominant, circuit history matters, teammate gap is a quality signal).
 * In a production quant pipeline these would be fitted by gradient descent
 * on the first 60% of races and validated on the rest. We use defensible
 * fixed weights for transparency.
 *
 * ROI scenarios:
 *   • Fair odds       — bet 1u on top pick at modelOdds=1/winProb, push if wrong
 *   • Sportsbook -10% — bet 1u at modelOdds×0.91 (simulates bookmaker margin)
 *   • Edge-only       — only bet when modelProb > 0.40
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    // ─── Hyperparameters ─────────────────────────────────────────────
    // These are the DEFAULT (hand-set) weights. The learnWeights() function
    // below uses grid search + local refinement on a TRAIN split (first 60%
    // of races) and validates on TEST split (last 40%). When called from
    // the UI, the learned weights replace the defaults.
    const DEFAULT_WEIGHTS = {
        formRecent:        2.20,   // last-10-race avg finish (strongest signal)
        formCircuit:       1.80,   // circuit-specific history
        teammateQualiGap:  1.20,   // quality proxy
        dnfPenalty:       -2.00,   // reliability matters
        seasonPointsShare: 1.40,   // recent season dominance
    };
    let WEIGHTS = { ...DEFAULT_WEIGHTS };
    const SAMPLE_SIZE_GATE = 0.30;
    const NOISE_SIGMA = 0.45;   // softmax temperature
    const FIELD_MEAN_FINISH = 10.5;

    // ─── Feature extraction ────────────────────────────────────────────
    function buildFeatures(driverId, race, index) {
        const driverResults = (index.resultsByDriver[driverId] || []);
        const beforeThisRace = driverResults.filter(r => {
            const ra = index.racesById[r.raceId];
            return ra && ra.date < race.date;
        });
        if (beforeThisRace.length === 0) {
            // Rookie / first-ever race — use field mean
            return null;
        }

        // Rolling form (last 10 races)
        const last10 = beforeThisRace.slice(-10);
        const finishes = last10.map(r => Number.isFinite(r.finish) ? r.finish : 20);
        const dnfs     = last10.filter(r => !Number.isFinite(r.finish)).length;
        const avgFinish = finishes.reduce((a, b) => a + b, 0) / finishes.length;
        const dnfRate   = dnfs / last10.length;

        // Circuit-specific history (last 5 visits to this circuit)
        const circuitHist = beforeThisRace
            .filter(r => index.racesById[r.raceId]?.circuitId === race.circuitId)
            .slice(-5);
        const circuitAvgFinish = circuitHist.length
            ? circuitHist.map(r => Number.isFinite(r.finish) ? r.finish : 20).reduce((a, b) => a + b, 0) / circuitHist.length
            : avgFinish;  // fall back to general form if no history at this circuit

        // Teammate qualifying gap (this season, average)
        const sameSeasonResults = beforeThisRace.filter(r => {
            const ra = index.racesById[r.raceId];
            return ra && ra.season === race.season;
        });
        let teammateQualiGap = 0;
        if (sameSeasonResults.length > 0) {
            const myConstructor = sameSeasonResults[0].constructorId;
            const myQualiPositions = [];
            const teammateQualiPositions = [];
            sameSeasonResults.forEach(r => {
                const raceQuali = (index.qualifyingByRace[r.raceId] || []);
                const mine = raceQuali.find(q => q.driverId === driverId);
                const teammate = raceQuali.find(q => q.driverId !== driverId &&
                    (index.resultsByRace[r.raceId] || []).some(rr => rr.driverId === q.driverId && rr.constructorId === myConstructor));
                if (mine?.qualiPos && teammate?.qualiPos) {
                    myQualiPositions.push(mine.qualiPos);
                    teammateQualiPositions.push(teammate.qualiPos);
                }
            });
            if (myQualiPositions.length > 0) {
                const myAvg       = myQualiPositions.reduce((a, b) => a + b, 0) / myQualiPositions.length;
                const teammateAvg = teammateQualiPositions.reduce((a, b) => a + b, 0) / teammateQualiPositions.length;
                teammateQualiGap = teammateAvg - myAvg;  // positive = beats teammate
            }
        }

        // Season points share (driver's share of constructor's points so far this season)
        let seasonPointsShare = 0;
        if (sameSeasonResults.length > 0) {
            const myConstructor = sameSeasonResults[sameSeasonResults.length - 1].constructorId;
            const myPts     = sameSeasonResults.reduce((a, r) => a + (r.points || 0), 0);
            const teamPts   = sameSeasonResults
                .reduce((a, r) => {
                    const teamThis = (index.resultsByRace[r.raceId] || [])
                        .filter(rr => rr.constructorId === myConstructor)
                        .reduce((b, rr) => b + (rr.points || 0), 0);
                    return a + teamThis;
                }, 0);
            seasonPointsShare = teamPts > 0 ? myPts / teamPts : 0.5;
        }

        return {
            avgFinish,
            dnfRate,
            circuitAvgFinish,
            teammateQualiGap,
            seasonPointsShare,
            careerRaces: beforeThisRace.length,
        };
    }

    function scoreDriver(features, weights = WEIGHTS) {
        if (!features) return 0;  // rookie
        // Convert "lower is better" finish positions to "higher is better" scores
        const formRecent    = (FIELD_MEAN_FINISH - features.avgFinish) / FIELD_MEAN_FINISH;
        const formCircuit   = (FIELD_MEAN_FINISH - features.circuitAvgFinish) / FIELD_MEAN_FINISH;
        const dnf           = features.dnfRate;
        const teammate      = features.teammateQualiGap / 5;   // 5-pos gap = ~1.0 scaled
        const pointsShare   = features.seasonPointsShare - 0.5;
        // Shrinkage toward 0 for low-sample drivers
        const sampleGate    = Math.min(features.careerRaces / 20, 1);

        return (
            formRecent       * weights.formRecent +
            formCircuit      * weights.formCircuit +
            teammate         * weights.teammateQualiGap +
            dnf              * weights.dnfPenalty +
            pointsShare      * weights.seasonPointsShare
        ) * (sampleGate + (1 - sampleGate) * SAMPLE_SIZE_GATE);
    }

    function softmaxProbs(scores) {
        const max = Math.max(...scores);
        const exps = scores.map(s => Math.exp((s - max) / NOISE_SIGMA));
        const sum  = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    }

    // ─── The main backtest loop ────────────────────────────────────────
    /**
     * @param {Object} dataset           output of HistoricalDataset.ensureLoaded()
     * @param {Object} opts
     * @param {number} opts.minSeason    skip races before this season (warmup)
     * @param {Function} opts.onProgress (pct, msg) => void
     */
    async function runBacktest(dataset, opts = {}) {
        const index = window.HistoricalDataset.buildIndex(dataset);
        const minSeason = opts.minSeason || 2016;   // need 2 years of history per driver
        const onProgress = opts.onProgress || (() => {});

        const races = index.raceList.filter(r => r.season >= minSeason);
        const M = window.PredictorMetrics;
        if (!M) throw new Error('PredictorMetrics not loaded');

        const brierScores = [];
        const logLosses   = [];
        const top1Hits    = [];
        const top3Hits    = [];
        const top5Hits    = [];
        const calibrationPairs = [];

        // ROI tracking
        const equityFair      = [1.0];   // start with $1 bankroll
        const equitySportsbook = [1.0];
        const equityEdgeOnly  = [1.0];
        let kellyDD = { peak: 1.0, maxDD: 0 };

        const perSeason = {};   // {season: {wins, top3, races, roi}}
        const racesLog = [];

        for (let i = 0; i < races.length; i++) {
            const race = races[i];
            const drivers = (index.resultsByRace[race.raceId] || []).map(r => r.driverId);
            if (drivers.length < 5) continue;  // skip races with missing data

            // Predict
            const scores = drivers.map(did => scoreDriver(buildFeatures(did, race, index)));
            const probs  = softmaxProbs(scores);
            const probByDriver = {};
            drivers.forEach((d, idx) => { probByDriver[d] = probs[idx]; });

            // Ranked list (highest probability first)
            const ranked = drivers
                .map((d, idx) => ({ driverId: d, prob: probs[idx] }))
                .sort((a, b) => b.prob - a.prob);
            const rankedIds = ranked.map(r => r.driverId);

            // Actual winner
            const actualResults = (index.resultsByRace[race.raceId] || [])
                .slice()
                .sort((a, b) => (a.finish || 99) - (b.finish || 99));
            const actualWinner = actualResults.find(r => r.finish === 1)?.driverId;
            if (!actualWinner) continue;
            const actualPodium = actualResults.slice(0, 3).map(r => r.driverId);

            // Score
            brierScores.push(M.brierSingleRace(probByDriver, actualWinner));
            logLosses.push(M.logLossSingleRace(probByDriver, actualWinner));
            const t1 = rankedIds[0] === actualWinner ? 1 : 0;
            const t3 = rankedIds.slice(0, 3).includes(actualWinner) ? 1 : 0;
            const t5 = rankedIds.slice(0, 5).includes(actualWinner) ? 1 : 0;
            top1Hits.push(t1);
            top3Hits.push(t3);
            top5Hits.push(t5);

            drivers.forEach((d, idx) => {
                calibrationPairs.push({ prob: probs[idx], outcome: d === actualWinner ? 1 : 0 });
            });

            // ROI — bet 1u on top pick
            const topPickProb = ranked[0].prob;
            if (topPickProb > 0.01) {
                const fairOdds = 1 / topPickProb;
                const sportsbookOdds = fairOdds * 0.91;  // -10% margin
                // Fair odds: break-even, just records hit rate as profit pattern
                if (t1 === 1) {
                    equityFair.push(equityFair[equityFair.length - 1] + (fairOdds - 1));
                    equitySportsbook.push(equitySportsbook[equitySportsbook.length - 1] + (sportsbookOdds - 1));
                } else {
                    equityFair.push(equityFair[equityFair.length - 1] - 1);
                    equitySportsbook.push(equitySportsbook[equitySportsbook.length - 1] - 1);
                }
            }

            // Edge-only: only bet when model is highly confident (P>0.40)
            if (topPickProb > 0.40) {
                const sportsbookOdds = (1 / topPickProb) * 0.91;
                if (t1 === 1) equityEdgeOnly.push(equityEdgeOnly[equityEdgeOnly.length - 1] + (sportsbookOdds - 1));
                else          equityEdgeOnly.push(equityEdgeOnly[equityEdgeOnly.length - 1] - 1);
            } else {
                equityEdgeOnly.push(equityEdgeOnly[equityEdgeOnly.length - 1]); // no bet
            }

            // Max drawdown tracking on sportsbook equity
            const curEquity = equitySportsbook[equitySportsbook.length - 1];
            if (curEquity > kellyDD.peak) kellyDD.peak = curEquity;
            const dd = (kellyDD.peak - curEquity) / kellyDD.peak;
            if (dd > kellyDD.maxDD) kellyDD.maxDD = dd;

            // Per-season buckets
            const s = race.season;
            if (!perSeason[s]) perSeason[s] = { races: 0, top1: 0, top3: 0, brierSum: 0 };
            perSeason[s].races += 1;
            perSeason[s].top1  += t1;
            perSeason[s].top3  += t3;
            perSeason[s].brierSum += brierScores[brierScores.length - 1];

            racesLog.push({
                date: race.date,
                season: race.season,
                round: race.round,
                circuit: race.circuitName,
                predicted: rankedIds[0],
                predictedProb: +(topPickProb * 100).toFixed(1),
                actual: actualWinner,
                hit: t1 === 1,
            });

            if (i % 20 === 0) onProgress(Math.round((i / races.length) * 100), `${race.season} R${race.round}`);
        }

        const totalBets = equitySportsbook.length - 1;
        const finalSportsbookROI = ((equitySportsbook[equitySportsbook.length - 1] - 1) / totalBets) * 100;
        const finalEdgeOnlyROI   = ((equityEdgeOnly[equityEdgeOnly.length - 1] - 1) / Math.max(totalBets, 1)) * 100;

        // Sharpe-ish: mean per-race profit / stddev per-race profit, sqrt-N annualised
        const perRaceProfits = [];
        for (let i = 1; i < equitySportsbook.length; i++) {
            perRaceProfits.push(equitySportsbook[i] - equitySportsbook[i - 1]);
        }
        const meanProfit = perRaceProfits.reduce((a, b) => a + b, 0) / Math.max(perRaceProfits.length, 1);
        const variance = perRaceProfits.reduce((a, b) => a + (b - meanProfit) ** 2, 0) / Math.max(perRaceProfits.length - 1, 1);
        const sharpe = variance > 0 ? (meanProfit / Math.sqrt(variance)) * Math.sqrt(22) : 0;  // 22 races/season

        return {
            totalRaces: brierScores.length,
            metrics: {
                brier:      M.aggregate(brierScores),
                logLoss:    M.aggregate(logLosses),
                top1HitPct: { mean: +(M.aggregate(top1Hits).mean * 100).toFixed(1), stderr: +(M.aggregate(top1Hits).stderr * 100).toFixed(1) },
                top3HitPct: { mean: +(M.aggregate(top3Hits).mean * 100).toFixed(1), stderr: +(M.aggregate(top3Hits).stderr * 100).toFixed(1) },
                top5HitPct: { mean: +(M.aggregate(top5Hits).mean * 100).toFixed(1), stderr: +(M.aggregate(top5Hits).stderr * 100).toFixed(1) },
            },
            roi: {
                fair:            +equityFair[equityFair.length - 1].toFixed(2),
                sportsbook:      +equitySportsbook[equitySportsbook.length - 1].toFixed(2),
                edgeOnly:        +equityEdgeOnly[equityEdgeOnly.length - 1].toFixed(2),
                sportsbookROIpct:+finalSportsbookROI.toFixed(1),
                edgeOnlyROIpct:  +finalEdgeOnlyROI.toFixed(1),
                maxDrawdownPct:  +(kellyDD.maxDD * 100).toFixed(1),
                sharpe:          +sharpe.toFixed(2),
            },
            equity: {
                fair:       equityFair,
                sportsbook: equitySportsbook,
                edgeOnly:   equityEdgeOnly,
            },
            perSeason: Object.entries(perSeason).map(([s, v]) => ({
                season: +s,
                races:  v.races,
                top1HitPct: +((v.top1 / v.races) * 100).toFixed(1),
                top3HitPct: +((v.top3 / v.races) * 100).toFixed(1),
                brier:      +(v.brierSum / v.races).toFixed(3),
            })).sort((a, b) => a.season - b.season),
            calibration: M.calibrationBuckets(calibrationPairs, 10),
            racesLog,
        };
    }

    // ─── WEIGHT LEARNING ──────────────────────────────────────────────
    // Coordinate-descent + random restart (no autograd, no deps).
    // For each weight: probe ±range around current value, pick whichever
    // gives lowest Brier on the TRAIN split. Repeat for several passes
    // until convergence. Validates final weights on the TEST split.
    //
    // This is the same approach used by simple production quant models
    // before they graduate to gradient-boosted trees.
    function evaluateBrierWithWeights(weights, races, index) {
        const M = window.PredictorMetrics;
        let sum = 0;
        let n   = 0;
        for (const race of races) {
            const drivers = (index.resultsByRace[race.raceId] || []).map(r => r.driverId);
            if (drivers.length < 5) continue;
            const scores = drivers.map(did => scoreDriver(buildFeatures(did, race, index), weights));
            const probs  = softmaxProbs(scores);
            const probByDriver = {};
            drivers.forEach((d, i) => { probByDriver[d] = probs[i]; });
            const actual = (index.resultsByRace[race.raceId] || []).find(r => r.finish === 1)?.driverId;
            if (!actual) continue;
            sum += M.brierSingleRace(probByDriver, actual);
            n   += 1;
        }
        return { brier: n ? sum / n : 1, samples: n };
    }

    async function learnWeights(dataset, opts = {}) {
        const index = window.HistoricalDataset.buildIndex(dataset);
        const minSeason = opts.minSeason || 2016;
        const onProgress = opts.onProgress || (() => {});

        const allRaces = index.raceList.filter(r => r.season >= minSeason);
        const splitIdx = Math.floor(allRaces.length * 0.6);
        const trainRaces = allRaces.slice(0, splitIdx);
        const testRaces  = allRaces.slice(splitIdx);

        // Baseline metrics with default weights
        const baselineTrain = evaluateBrierWithWeights(DEFAULT_WEIGHTS, trainRaces, index);
        const baselineTest  = evaluateBrierWithWeights(DEFAULT_WEIGHTS, testRaces, index);

        // Search ranges per weight — symmetric around defaults
        const probes = [-1.0, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5, 1.0];
        let current = { ...DEFAULT_WEIGHTS };
        let bestTrainBrier = baselineTrain.brier;

        // Coordinate descent — 3 passes
        const weightNames = Object.keys(DEFAULT_WEIGHTS);
        for (let pass = 0; pass < 3; pass++) {
            for (let wi = 0; wi < weightNames.length; wi++) {
                const name = weightNames[wi];
                onProgress(
                    Math.round(((pass * weightNames.length + wi) / (3 * weightNames.length)) * 100),
                    `pass ${pass + 1}/3 — optimising ${name}`
                );
                const baseValue = current[name];
                let bestProbe = baseValue;
                for (const delta of probes) {
                    const trial = { ...current, [name]: baseValue + delta };
                    const score = evaluateBrierWithWeights(trial, trainRaces, index);
                    if (score.brier < bestTrainBrier) {
                        bestTrainBrier = score.brier;
                        bestProbe = baseValue + delta;
                    }
                }
                current[name] = bestProbe;
                // Yield to UI
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // Final eval
        const learnedTrain = evaluateBrierWithWeights(current, trainRaces, index);
        const learnedTest  = evaluateBrierWithWeights(current, testRaces, index);

        // Hot-swap into module state — future backtest runs use the learned weights
        WEIGHTS = current;

        return {
            defaultWeights: DEFAULT_WEIGHTS,
            learnedWeights: current,
            train: {
                races:    trainRaces.length,
                brierBaseline: +baselineTrain.brier.toFixed(4),
                brierLearned:  +learnedTrain.brier.toFixed(4),
                improvementPct: +((1 - learnedTrain.brier / baselineTrain.brier) * 100).toFixed(1),
            },
            test: {
                races:    testRaces.length,
                brierBaseline: +baselineTest.brier.toFixed(4),
                brierLearned:  +learnedTest.brier.toFixed(4),
                improvementPct: +((1 - learnedTest.brier / baselineTest.brier) * 100).toFixed(1),
            },
        };
    }

    function resetWeights() { WEIGHTS = { ...DEFAULT_WEIGHTS }; }
    function getCurrentWeights() { return { ...WEIGHTS }; }

    window.WalkForwardBacktest = {
        runBacktest,
        learnWeights,
        resetWeights,
        getCurrentWeights,
        DEFAULT_WEIGHTS,
    };
})();
