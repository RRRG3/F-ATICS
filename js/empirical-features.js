/**
 * F-ATICS Empirical Features Loader
 * ═════════════════════════════════════════════════════════════════
 * Pulls real F1 race results from Jolpica (Ergast mirror) and converts
 * them into the form-array shape used by prediction-model.js. This
 * replaces my hand-typed form arrays with actual race results — the
 * single biggest shift from "rule-based toy" to "empirical quant model".
 *
 * Data source: https://api.jolpi.ca/ergast/f1/2025/results.json
 * Cached in localStorage 24h. Non-blocking — falls back to hardcoded
 * values if the API is unreachable.
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    const CACHE_KEY = 'f1_empirical_features_v1';
    const CACHE_TTL = 24 * 60 * 60 * 1000;   // 24 hours
    const JOLPICA   = 'https://api.jolpi.ca/ergast/f1';

    // Jolpica returns drivers with `givenName + familyName`. Some 2026
    // newcomers (Antonelli, Bortoleto, Lindblad, Hadjar) may have F2 history
    // but won't appear in 2025 F1 results — those stay on the hardcoded form.
    function fullName(d) {
        return `${d.givenName} ${d.familyName}`;
    }

    /**
     * Convert a finishing position to a form score (1-10 scale).
     * Mirrors the existing form-array convention so it drops in unchanged.
     *
     *   P1  = 10   P2  = 9.3  P3  = 9.0   P4-5 = 8.5
     *   P6-8 = 7.5  P9-10 = 7   P11-15 = 6  P16-20 = 5
     *   DNF/DSQ = 2
     */
    function positionToFormScore(position, status) {
        if (status && /Accident|Collision|Mechanical|Engine|Hydraulics|Gearbox|Transmission|Brakes|Electrical|Retired|Did not finish|Withdrew/i.test(status)) {
            return 2;
        }
        const p = parseInt(position, 10);
        if (!Number.isFinite(p)) return 5;
        if (p === 1) return 10;
        if (p === 2) return 9.3;
        if (p === 3) return 9.0;
        if (p <= 5)  return 8.5;
        if (p <= 8)  return 7.5;
        if (p <= 10) return 7.0;
        if (p <= 15) return 6.0;
        return 5.0;
    }

    function loadCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL) return null;
            return data;
        } catch { return null; }
    }

    function saveCache(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch {}
    }

    /**
     * Fetch full season results by paginating through Jolpica's 100-per-page API.
     * Jolpica returns `MRData.total = 479-ish` (~20 drivers × 24 races), so we
     * need 5 pages per full season. Capped at 10 pages to avoid runaway loops.
     */
    async function fetchSeasonResults(season) {
        const limit = 100;
        let offset = 0;
        const racesByName = {};  // raceName → race object (merge across pages)
        let total = Infinity;
        let pagesFetched = 0;

        while (offset < total && pagesFetched < 10) {
            const url = `${JOLPICA}/${season}/results.json?limit=${limit}&offset=${offset}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            const mr = json?.MRData;
            if (!mr) break;
            total = parseInt(mr.total, 10) || 0;
            (mr.RaceTable?.Races || []).forEach(race => {
                const key = `R${race.round}`;
                if (!racesByName[key]) racesByName[key] = { ...race, Results: [] };
                racesByName[key].Results.push(...(race.Results || []));
            });
            offset += limit;
            pagesFetched++;
        }

        // Sort races by round number ascending — chronological order
        const races = Object.values(racesByName).sort((a, b) => +a.round - +b.round);

        const formByDriver = {};
        const dnfByDriver  = {};
        races.forEach(race => {
            race.Results.forEach(r => {
                const name = fullName(r.Driver);
                const score = positionToFormScore(r.position, r.status);
                if (!formByDriver[name]) formByDriver[name] = [];
                formByDriver[name].push(score);
                if (score === 2) dnfByDriver[name] = (dnfByDriver[name] || 0) + 1;
            });
        });

        // Keep last 10 races per driver, padded with neutral 6.0 if shorter
        Object.keys(formByDriver).forEach(name => {
            const arr = formByDriver[name].slice(-10);
            while (arr.length < 10) arr.unshift(6.0);
            formByDriver[name] = arr;
        });

        return {
            season,
            racesCount: races.length,
            formByDriver,
            dnfByDriver,
            fetchedAt: new Date().toISOString(),
        };
    }

    /**
     * Try the current-ish season first (some races); if very few races,
     * fall back to the most recent fully-archived season for richer form data.
     */
    async function fetchBestAvailable() {
        const now = new Date();
        const candidates = [now.getFullYear(), now.getFullYear() - 1];
        for (const season of candidates) {
            try {
                const data = await fetchSeasonResults(season);
                if (data.racesCount >= 3) return data;
            } catch (e) { /* try next season */ }
        }
        throw new Error('No usable season data');
    }

    /**
     * Apply empirical form arrays to the prediction model in-place.
     * Returns a report of how many drivers got real data vs fallback.
     */
    function applyToModel(empirical, predictionModel) {
        if (!predictionModel || !predictionModel._DRIVER_FEATURES) {
            // The model doesn't expose features for hot-swapping by default.
            // We monkey-patch via the closure's reference. If we can't, no harm done.
            return { applied: 0, total: 0, note: 'predictionModel features not exposed for hot-swap' };
        }
        const features = predictionModel._DRIVER_FEATURES;
        let applied = 0;
        const total = Object.keys(features).length;
        Object.keys(features).forEach(name => {
            if (empirical.formByDriver[name]) {
                features[name].form = empirical.formByDriver[name];
                applied++;
            }
        });
        return { applied, total };
    }

    async function init(predictionModel) {
        // Try cache first
        let empirical = loadCache();
        if (empirical) {
            console.info(`[empirical] using cached 2025 data (${Object.keys(empirical.formByDriver).length} drivers, fetched ${empirical.fetchedAt})`);
        } else {
            try {
                empirical = await fetchBestAvailable();
                saveCache(empirical);
                console.info(`[empirical] fetched ${empirical.season} season — ${empirical.racesCount} races, ${Object.keys(empirical.formByDriver).length} drivers`);
            } catch (e) {
                console.warn(`[empirical] Jolpica unreachable, keeping hardcoded form — ${e.message}`);
                return;
            }
        }
        const report = applyToModel(empirical, predictionModel);
        if (report.applied > 0) {
            console.info(`[empirical] applied real 2025 form to ${report.applied}/${report.total} drivers (rookies keep hardcoded form)`);
        }
        // Mark on global so UI can show data source
        window._F_ATICS_DATA_SOURCE = {
            source: 'Jolpica / Ergast',
            season: empirical.season,
            races:  empirical.racesCount,
            fetchedAt: empirical.fetchedAt,
            driversWithEmpirical: report.applied,
            totalDrivers: report.total,
        };
        // Emit event so UI can react
        window.dispatchEvent(new CustomEvent('empirical-features-ready', { detail: window._F_ATICS_DATA_SOURCE }));
    }

    // Kick off when both the model and the metrics module are loaded
    function start() {
        if (window.predictionModel) {
            init(window.predictionModel);
        } else {
            // Retry once after a tick if model not yet loaded
            setTimeout(start, 200);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
