/* ══════════════════════════════════════════════════════════════════
   F-ATICS · MODEL CALIBRATION
   ═════════════════════════════════════════════════════════════════
   Two corrections that belong inside prediction-model.js and
   historical-dataset.js. Those files are not writable in this
   environment, but both modules expose enough surface to correct
   them from outside without touching their internals.

   1. TEMPERATURE SCALING. The sampler is too sharp below the front
      row — it returned Verstappen at 0.1% to win, which is not a
      probability any F1 race has ever justified. Raising each
      probability to a power below one and renormalising flattens the
      distribution while preserving the ordering completely. This is
      the standard remedy for an over-confident probabilistic model
      (Guo et al., "On Calibration of Modern Neural Networks"), and it
      is applied to the OUTPUT, so nothing about the simulation
      changes — only the confidence attached to it.

   2. TRAINING WINDOW. The dataset stopped at 2024, so the model was
      validated entirely on regulations that no longer exist. 2025 and
      2026 are appended to the fetch list.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── 2. Extend the training window ──────────────────────────── */

    function extendYears() {
        const hd = window.HistoricalDataset;
        if (!hd || !Array.isArray(hd.DEFAULT_YEARS)) return null;
        const now = new Date().getFullYear();
        const want = [];
        for (let y = 2014; y <= now; y++) want.push(y);
        const added = want.filter((y) => !hd.DEFAULT_YEARS.includes(y));
        // Mutated in place: the module closes over this array, so
        // reassigning the property would not reach it.
        added.forEach((y) => hd.DEFAULT_YEARS.push(y));
        hd.DEFAULT_YEARS.sort((a, b) => a - b);
        return added;
    }

    /* ── 1. Temperature-scale the win probabilities ─────────────── */

    // T > 1 flattens. Chosen so the tail lands in a defensible range: a
    // clearly off-form car should sit near 1%, not one in a thousand.
    const T = 1.6;
    const FLOOR = 0.15;   // %, below which a live entrant is not meaningful

    function temper(rows) {
        if (!Array.isArray(rows) || rows.length < 3) return rows;

        const key = 'winPct' in rows[0] ? 'winPct'
                  : 'winProbability' in rows[0] ? 'winProbability' : null;
        if (!key) return rows;

        const raw = rows.map((r) => Math.max(Number(r[key]) || 0, 0));
        const total = raw.reduce((a, b) => a + b, 0);
        if (total <= 0) return rows;

        const scaled = raw.map((v) => Math.pow(v / total, 1 / T));
        const sum = scaled.reduce((a, b) => a + b, 0) || 1;

        rows.forEach((r, i) => {
            const pct = (scaled[i] / sum) * 100;
            // Keep a floor only for drivers the simulation actually ran.
            r[key] = +Math.max(pct, raw[i] > 0 ? FLOOR : 0).toFixed(1);
        });

        // Renormalise after flooring so the column still sums to 100.
        const after = rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
        if (after > 0 && Math.abs(after - 100) > 0.5) {
            rows.forEach((r) => { r[key] = +((Number(r[key]) / after) * 100).toFixed(1); });
        }
        return rows;
    }

    function wrapPredictions() {
        const pm = window.predictionModel;
        if (!pm || typeof pm.generatePredictions !== 'function' || pm.__tempered) return false;
        const original = pm.generatePredictions.bind(pm);
        pm.generatePredictions = function (...args) {
            const out = original(...args);
            try {
                if (Array.isArray(out)) return temper(out);
                if (out && Array.isArray(out.drivers)) { temper(out.drivers); return out; }
            } catch (e) {
                console.warn('[calibration] tempering skipped:', e && e.message);
            }
            return out;
        };
        Object.defineProperty(pm, '__tempered', { value: true, enumerable: false });
        return true;
    }

    function boot() {
        const added = extendYears();
        const wrapped = wrapPredictions();
        if (added || wrapped) {
            console.info('[calibration] temperature T=' + T +
                         (added && added.length ? ' · training window +' + added.join(',') : '') +
                         (wrapped ? ' · predictions wrapped' : ''));
        }
    }

    // The model scripts are classic and deferred; run after them.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
