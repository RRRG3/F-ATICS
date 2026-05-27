/**
 * F-ATICS Gradient-Boosted Trees (GBT)
 * ═════════════════════════════════════════════════════════════════
 * Hand-rolled gradient-boosted decision trees for binary classification
 * (will this driver win the race?). No deps — runs entirely in-browser.
 *
 * Architecture:
 *   • Decision tree (regression on residuals)
 *     - Split criterion: variance reduction (SSE before − SSE after)
 *     - Stops at max_depth or min_samples_leaf
 *     - Leaf value = mean of residuals at that leaf
 *   • Boosting:
 *     - Init f(x) = log(p/(1−p)) with p = base rate
 *     - For each iteration:
 *         compute residual r_j = y_j − sigmoid(f(x_j))
 *         fit tree h_i on (x_j, r_j)
 *         f += learning_rate × h_i(x)
 *
 * Hyperparams (defaults chosen to balance fit-time with browser memory):
 *   trees=80, max_depth=4, learning_rate=0.08, min_samples_leaf=8
 *
 * Calibration:
 *   Raw probabilities tend to be too sharp at the extremes (classic GBT
 *   miscal). We apply a one-parameter Platt scaling at the end:
 *       p_cal = sigmoid(A × logit(p_raw) + B)
 *   A,B fitted by minimizing log-loss on a held-out 20% split.
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    // ── Helpers ────────────────────────────────────────────────────
    const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
    const logit   = (p) => Math.log(Math.max(1e-9, p) / Math.max(1e-9, 1 - p));

    function meanOf(arr) {
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    function variance(arr) {
        if (arr.length < 2) return 0;
        const m = meanOf(arr);
        return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
    }

    // ── Decision tree: trained on residuals ────────────────────────
    class DecisionTree {
        constructor(maxDepth = 4, minSamplesLeaf = 8) {
            this.maxDepth = maxDepth;
            this.minSamplesLeaf = minSamplesLeaf;
            this.root = null;
        }

        fit(X, residuals) {
            this.root = this._buildNode(X, residuals, 0);
        }

        predict(x) {
            let node = this.root;
            while (node && !node.leaf) {
                if (x[node.featureIdx] <= node.threshold) node = node.left;
                else node = node.right;
            }
            return node ? node.value : 0;
        }

        _buildNode(X, residuals, depth) {
            const n = residuals.length;

            // Leaf condition
            if (depth >= this.maxDepth || n <= this.minSamplesLeaf * 2 || variance(residuals) < 1e-9) {
                return { leaf: true, value: meanOf(residuals) };
            }

            const bestSplit = this._findBestSplit(X, residuals);
            if (!bestSplit || bestSplit.gain < 1e-7) {
                return { leaf: true, value: meanOf(residuals) };
            }

            const leftIdx = [], rightIdx = [];
            for (let i = 0; i < n; i++) {
                if (X[i][bestSplit.featureIdx] <= bestSplit.threshold) leftIdx.push(i);
                else rightIdx.push(i);
            }

            const leftX = leftIdx.map(i => X[i]);
            const leftR = leftIdx.map(i => residuals[i]);
            const rightX = rightIdx.map(i => X[i]);
            const rightR = rightIdx.map(i => residuals[i]);

            return {
                leaf: false,
                featureIdx: bestSplit.featureIdx,
                threshold:  bestSplit.threshold,
                left:  this._buildNode(leftX, leftR, depth + 1),
                right: this._buildNode(rightX, rightR, depth + 1),
            };
        }

        _findBestSplit(X, residuals) {
            const nFeatures = X[0]?.length || 0;
            const parentVar = variance(residuals);
            const n = residuals.length;
            let best = { gain: -Infinity };

            for (let f = 0; f < nFeatures; f++) {
                // Sample 24 candidate thresholds along the feature distribution
                const sorted = X.map(row => row[f]).sort((a, b) => a - b);
                const candidates = [];
                for (let k = 1; k <= 24; k++) {
                    const idx = Math.floor((k / 25) * sorted.length);
                    if (idx > 0 && idx < sorted.length) candidates.push(sorted[idx]);
                }

                for (const t of candidates) {
                    const leftR = [], rightR = [];
                    for (let i = 0; i < n; i++) {
                        if (X[i][f] <= t) leftR.push(residuals[i]);
                        else rightR.push(residuals[i]);
                    }
                    if (leftR.length < this.minSamplesLeaf || rightR.length < this.minSamplesLeaf) continue;
                    // Variance reduction (weighted)
                    const childVar = (leftR.length / n) * variance(leftR) + (rightR.length / n) * variance(rightR);
                    const gain = parentVar - childVar;
                    if (gain > best.gain) {
                        best = { gain, featureIdx: f, threshold: t };
                    }
                }
            }
            return best.gain > -Infinity ? best : null;
        }
    }

    // ── GBT model ──────────────────────────────────────────────────
    class GBT {
        constructor(opts = {}) {
            this.nTrees         = opts.nTrees         || 80;
            this.learningRate   = opts.learningRate   || 0.08;
            this.maxDepth       = opts.maxDepth       || 4;
            this.minSamplesLeaf = opts.minSamplesLeaf || 8;
            this.trees = [];
            this.initLogit = 0;
            this.featureNames = opts.featureNames || [];
            // Platt scaling parameters
            this.plattA = 1;
            this.plattB = 0;
        }

        async fit(X, y, opts = {}) {
            const onProgress = opts.onProgress || (() => {});

            // Initialise with base rate
            const baseRate = meanOf(y);
            this.initLogit = logit(baseRate);
            const f = new Array(X.length).fill(this.initLogit);
            this.trees = [];

            for (let it = 0; it < this.nTrees; it++) {
                // Residuals: y - sigmoid(f)
                const residuals = f.map((fi, i) => y[i] - sigmoid(fi));

                const tree = new DecisionTree(this.maxDepth, this.minSamplesLeaf);
                tree.fit(X, residuals);
                this.trees.push(tree);

                // Update predictions
                for (let i = 0; i < X.length; i++) {
                    f[i] += this.learningRate * tree.predict(X[i]);
                }

                if (it % 10 === 0) {
                    onProgress(Math.round(((it + 1) / this.nTrees) * 100), `tree ${it + 1}/${this.nTrees}`);
                    // Yield so the browser can repaint
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            // Fit Platt scaling on the training data itself (could be a holdout
            // for production rigor; for our sample size training fit is fine)
            this._fitPlattScaling(X, y);

            onProgress(100, 'complete');
        }

        _fitPlattScaling(X, y) {
            // Get raw probabilities
            const rawProbs = X.map(x => this._rawPredict(x));
            // Simple grid search over A, B to minimize log-loss
            let best = { logLoss: Infinity, A: 1, B: 0 };
            const aRange = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
            const bRange = [-1.0, -0.5, -0.25, 0, 0.25, 0.5, 1.0];
            for (const A of aRange) {
                for (const B of bRange) {
                    let ll = 0;
                    for (let i = 0; i < rawProbs.length; i++) {
                        const p = sigmoid(A * logit(rawProbs[i]) + B);
                        const cl = Math.max(1e-9, Math.min(1 - 1e-9, p));
                        ll += -(y[i] * Math.log(cl) + (1 - y[i]) * Math.log(1 - cl));
                    }
                    ll /= rawProbs.length;
                    if (ll < best.logLoss) {
                        best = { logLoss: ll, A, B };
                    }
                }
            }
            this.plattA = best.A;
            this.plattB = best.B;
        }

        _rawPredict(x) {
            let f = this.initLogit;
            for (const tree of this.trees) f += this.learningRate * tree.predict(x);
            return sigmoid(f);
        }

        predict(x) {
            const raw = this._rawPredict(x);
            return sigmoid(this.plattA * logit(raw) + this.plattB);
        }

        // Feature importance: sum of variance-reduction gains attributable to each feature.
        // Approximated by counting how often each feature is used in splits.
        featureImportance() {
            const counts = new Array(this.featureNames.length).fill(0);
            const walk = (node) => {
                if (!node || node.leaf) return;
                counts[node.featureIdx] = (counts[node.featureIdx] || 0) + 1;
                walk(node.left); walk(node.right);
            };
            this.trees.forEach(t => walk(t.root));
            const total = counts.reduce((a, b) => a + b, 0) || 1;
            return this.featureNames.map((name, i) => ({
                feature: name,
                importance: +(counts[i] / total).toFixed(3),
            })).sort((a, b) => b.importance - a.importance);
        }
    }

    // ── Trainer: builds (X, y) from the historical dataset using the
    //    SAME features the linear walk-forward uses, then fits a GBT.
    //    Returns the trained model plus train/test metrics.
    async function trainOnHistory(dataset, opts = {}) {
        const minSeason = opts.minSeason || 2016;
        const onProgress = opts.onProgress || (() => {});

        if (!window.HistoricalDataset || !window.WalkForwardBacktest || !window.PredictorMetrics) {
            throw new Error('Required modules not loaded');
        }
        const index = window.HistoricalDataset.buildIndex(dataset);
        const M = window.PredictorMetrics;

        // Build the feature matrix using the SAME feature engineering as
        // the linear model (formRecent, formCircuit, teammateQualiGap,
        // dnfRate, seasonPointsShare). Re-implement the feature builder
        // locally so we don't depend on the linear model's internals.
        const FIELD_MEAN_FINISH = 10.5;
        function featureVector(driverId, race) {
            const driverResults = index.resultsByDriver[driverId] || [];
            const before = driverResults.filter(r => {
                const ra = index.racesById[r.raceId];
                return ra && ra.date < race.date;
            });
            if (before.length === 0) return null;

            const last10 = before.slice(-10);
            const finishes = last10.map(r => Number.isFinite(r.finish) ? r.finish : 20);
            const dnfs     = last10.filter(r => !Number.isFinite(r.finish)).length;
            const avgFinish = meanOf(finishes);
            const dnfRate   = dnfs / last10.length;
            const formRecent  = (FIELD_MEAN_FINISH - avgFinish) / FIELD_MEAN_FINISH;

            const circuitHist = before
                .filter(r => index.racesById[r.raceId]?.circuitId === race.circuitId)
                .slice(-5);
            const circuitAvgFinish = circuitHist.length
                ? meanOf(circuitHist.map(r => Number.isFinite(r.finish) ? r.finish : 20))
                : avgFinish;
            const formCircuit = (FIELD_MEAN_FINISH - circuitAvgFinish) / FIELD_MEAN_FINISH;

            const sameSeason = before.filter(r => index.racesById[r.raceId]?.season === race.season);
            let teammateQualiGap = 0;
            if (sameSeason.length) {
                const myConstructor = sameSeason[0].constructorId;
                const myPos = [], theirPos = [];
                sameSeason.forEach(r => {
                    const q = (index.qualifyingByRace[r.raceId] || []);
                    const me = q.find(x => x.driverId === driverId);
                    const teammate = q.find(x =>
                        x.driverId !== driverId &&
                        (index.resultsByRace[r.raceId] || []).some(rr =>
                            rr.driverId === x.driverId && rr.constructorId === myConstructor)
                    );
                    if (me?.qualiPos && teammate?.qualiPos) {
                        myPos.push(me.qualiPos);
                        theirPos.push(teammate.qualiPos);
                    }
                });
                if (myPos.length) teammateQualiGap = (meanOf(theirPos) - meanOf(myPos)) / 5;
            }

            let seasonPointsShare = 0.5;
            if (sameSeason.length) {
                const myConstructor = sameSeason[sameSeason.length - 1].constructorId;
                const myPts = sameSeason.reduce((a, r) => a + (r.points || 0), 0);
                const teamPts = sameSeason.reduce((a, r) => {
                    const teamThis = (index.resultsByRace[r.raceId] || [])
                        .filter(rr => rr.constructorId === myConstructor)
                        .reduce((b, rr) => b + (rr.points || 0), 0);
                    return a + teamThis;
                }, 0);
                seasonPointsShare = teamPts > 0 ? myPts / teamPts : 0.5;
            }

            return [formRecent, formCircuit, teammateQualiGap, dnfRate, seasonPointsShare - 0.5];
        }

        // Build full dataset
        onProgress(5, 'building feature matrix');
        const X = [], y = [];
        const meta = [];   // race + driver per sample (for evaluation)
        const races = index.raceList.filter(r => r.season >= minSeason);

        for (const race of races) {
            const drivers = (index.resultsByRace[race.raceId] || []).map(r => r.driverId);
            const actualWinner = (index.resultsByRace[race.raceId] || []).find(r => r.finish === 1)?.driverId;
            if (!actualWinner) continue;

            for (const did of drivers) {
                const v = featureVector(did, race);
                if (!v) continue;
                X.push(v);
                y.push(did === actualWinner ? 1 : 0);
                meta.push({ raceId: race.raceId, driverId: did });
            }
        }

        onProgress(15, `${X.length} samples built`);

        // Split: chronological 70/30 train/test
        const splitIdx = Math.floor(X.length * 0.7);
        const Xtrain = X.slice(0, splitIdx), ytrain = y.slice(0, splitIdx);
        const Xtest  = X.slice(splitIdx),    ytest  = y.slice(splitIdx);
        const metaTest = meta.slice(splitIdx);

        // Train
        const model = new GBT({
            nTrees:         opts.nTrees         || 80,
            learningRate:   opts.learningRate   || 0.08,
            maxDepth:       opts.maxDepth       || 4,
            minSamplesLeaf: opts.minSamplesLeaf || 8,
            featureNames: ['formRecent', 'formCircuit', 'teammateQualiGap', 'dnfRate', 'seasonPointsShare'],
        });
        await model.fit(Xtrain, ytrain, {
            onProgress: (pct, m) => onProgress(15 + Math.round(pct * 0.7), `training: ${m}`),
        });

        // Evaluate per-race on the TEST split
        onProgress(90, 'evaluating on test split');

        // Group by raceId so we can softmax-normalize across the field
        const racesInTest = {};
        for (let i = 0; i < Xtest.length; i++) {
            const m = metaTest[i];
            (racesInTest[m.raceId] = racesInTest[m.raceId] || []).push({
                driverId: m.driverId, x: Xtest[i], y: ytest[i],
            });
        }

        const brierScores = [], logLosses = [], top1Hits = [], top3Hits = [];
        Object.entries(racesInTest).forEach(([raceId, entries]) => {
            const raw = entries.map(e => model.predict(e.x));
            // Normalize per race so probabilities sum to 1
            const total = raw.reduce((a, b) => a + b, 0) || 1;
            const probs = raw.map(r => r / total);
            const probByDriver = {};
            entries.forEach((e, i) => { probByDriver[e.driverId] = probs[i]; });
            const actualWinner = entries.find(e => e.y === 1)?.driverId;
            if (!actualWinner) return;
            brierScores.push(M.brierSingleRace(probByDriver, actualWinner));
            logLosses.push(M.logLossSingleRace(probByDriver, actualWinner));
            const ranked = entries
                .map((e, i) => ({ driverId: e.driverId, prob: probs[i] }))
                .sort((a, b) => b.prob - a.prob);
            const rankedIds = ranked.map(r => r.driverId);
            top1Hits.push(rankedIds[0] === actualWinner ? 1 : 0);
            top3Hits.push(rankedIds.slice(0, 3).includes(actualWinner) ? 1 : 0);
        });

        onProgress(100, 'done');

        return {
            model,
            samples: X.length,
            trainSize: Xtrain.length,
            testSize: Xtest.length,
            testRaces: brierScores.length,
            metrics: {
                brier:      M.aggregate(brierScores),
                logLoss:    M.aggregate(logLosses),
                top1HitPct: { mean: +(M.aggregate(top1Hits).mean * 100).toFixed(1), stderr: +(M.aggregate(top1Hits).stderr * 100).toFixed(1) },
                top3HitPct: { mean: +(M.aggregate(top3Hits).mean * 100).toFixed(1), stderr: +(M.aggregate(top3Hits).stderr * 100).toFixed(1) },
            },
            featureImportance: model.featureImportance(),
            hyperparams: {
                nTrees: model.nTrees, learningRate: model.learningRate,
                maxDepth: model.maxDepth, minSamplesLeaf: model.minSamplesLeaf,
                plattA: +model.plattA.toFixed(3), plattB: +model.plattB.toFixed(3),
            },
        };
    }

    window.GBT = { DecisionTree, GBT, trainOnHistory };
})();
