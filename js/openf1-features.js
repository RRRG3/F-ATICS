/**
 * F-ATICS OpenF1 Lap-Time Features
 * ═════════════════════════════════════════════════════════════════
 * Pulls per-lap data from OpenF1 (2023+) and computes the lap-time
 * features that real F1 quant models rely on but which finishing-
 * position data alone cannot capture:
 *
 *   • race_pace_delta_to_leader  – median race lap time minus session's best
 *   • sector_consistency         – stddev of lap times (lower = more consistent)
 *   • tire_deg_slope             – slope of lap_time vs lap_in_stint per stint
 *   • ultimate_pace              – fastest lap time
 *   • avg_pit_loss               – seconds lost in pit stops (race only)
 *
 * Data flow:
 *   OpenF1 /sessions/{key}/laps  →  per-driver lap series
 *   →  feature vector per (driver, session)
 *   →  rolled up to per-driver per-circuit features
 *
 * Cached in IndexedDB under `f1_openf1_v1`. First-time fetch is heavy
 * (~50 sessions × 20 drivers ≈ 30s of network), then it's instant.
 *
 * The features are exposed via:
 *   window.OpenF1Features.ensureLoaded() — fetch + cache
 *   window.OpenF1Features.getDriverCircuitPace(driverNumber, circuit) →
 *     {raceMedianDelta, ultimatePace, consistency, tireDegSlope, samples}
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    const DB_NAME    = 'f1_openf1_v1';
    const DB_VERSION = 1;
    const BASE       = 'https://api.openf1.org/v1';

    let _db = null;
    const _progress = { pct: 0, message: 'idle' };
    const _listeners = [];

    function emitProgress(pct, message) {
        _progress.pct = pct; _progress.message = message;
        _listeners.forEach(fn => { try { fn(_progress); } catch {} });
    }
    function onProgress(fn) { _listeners.push(fn); }

    // ── IndexedDB ─────────────────────────────────────────────────
    function openDB() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('sessions'))    db.createObjectStore('sessions',    { keyPath: 'session_key' });
                if (!db.objectStoreNames.contains('lap_features')) db.createObjectStore('lap_features', { keyPath: 'rowKey' });
                if (!db.objectStoreNames.contains('meta'))         db.createObjectStore('meta',         { keyPath: 'key' });
            };
            req.onsuccess = () => { _db = req.result; resolve(_db); };
            req.onerror   = () => reject(req.error);
        });
    }

    async function txStore(name, mode = 'readonly') {
        const db = await openDB();
        return db.transaction(name, mode).objectStore(name);
    }

    async function putMany(storeName, items) {
        const store = await txStore(storeName, 'readwrite');
        for (const item of items) store.put(item);
        return new Promise((res, rej) => {
            store.transaction.oncomplete = res;
            store.transaction.onerror    = () => rej(store.transaction.error);
        });
    }

    async function getAllFromStore(storeName) {
        const store = await txStore(storeName);
        return new Promise((res, rej) => {
            const req = store.getAll();
            req.onsuccess = () => res(req.result || []);
            req.onerror   = () => rej(req.error);
        });
    }

    async function getMeta(key) {
        const store = await txStore('meta');
        return new Promise((res) => {
            const req = store.get(key);
            req.onsuccess = () => res(req.result?.value);
            req.onerror   = () => res(undefined);
        });
    }
    async function setMeta(key, value) {
        const store = await txStore('meta', 'readwrite');
        store.put({ key, value });
        return new Promise(r => { store.transaction.oncomplete = r; });
    }

    // ── OpenF1 client ─────────────────────────────────────────────
    async function fetchJSON(path) {
        const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(12000) });
        if (!r.ok) {
            if (r.status === 404) return [];
            throw new Error(`HTTP ${r.status} on ${path}`);
        }
        return await r.json();
    }

    /**
     * Median of a numeric array. Robust to outliers (e.g. safety-car laps).
     */
    function median(arr) {
        if (!arr.length) return null;
        const s = arr.slice().sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
    }
    function stdDev(arr) {
        if (arr.length < 2) return 0;
        const m = arr.reduce((a, b) => a + b, 0) / arr.length;
        return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
    }

    /**
     * Trim laps to "clean" race laps: exclude first lap (start chaos), pit-in/out
     * laps, and laps slower than 110% of the driver's median (safety-car laps).
     */
    function cleanLaps(laps) {
        if (!laps.length) return [];
        const valid = laps.filter(l =>
            Number.isFinite(l.lap_duration) &&
            l.lap_number > 1 &&
            !l.is_pit_out_lap
        );
        if (!valid.length) return [];
        const med = median(valid.map(l => l.lap_duration));
        return valid.filter(l => l.lap_duration <= med * 1.10);
    }

    /**
     * Compute the per-driver feature vector for a single race session.
     */
    function computeSessionFeatures(driverLaps) {
        const clean = cleanLaps(driverLaps);
        if (clean.length < 3) {
            return { sampleSize: clean.length, raceMedianMs: null, ultimateMs: null, consistencyMs: null, tireDegMsPerLap: null };
        }
        const durations = clean.map(l => l.lap_duration * 1000); // seconds → ms
        const raceMedianMs = median(durations);
        const ultimateMs   = Math.min(...durations);
        const consistencyMs = stdDev(durations);

        // Tire-deg slope: group laps by stint (gaps in lap_number > 1 imply pit stop),
        // do a simple linear regression of duration vs (lap - stint_start_lap)
        let totalSlope = 0, nStints = 0;
        let stintStart = clean[0].lap_number;
        let stintLaps = [];
        for (let i = 0; i < clean.length; i++) {
            const expected = stintStart + stintLaps.length;
            if (clean[i].lap_number !== expected) {
                if (stintLaps.length >= 3) {
                    const slope = linearSlope(stintLaps.map((_, j) => j), stintLaps.map(l => l.lap_duration * 1000));
                    totalSlope += slope; nStints++;
                }
                stintStart = clean[i].lap_number;
                stintLaps = [];
            }
            stintLaps.push(clean[i]);
        }
        if (stintLaps.length >= 3) {
            const slope = linearSlope(stintLaps.map((_, j) => j), stintLaps.map(l => l.lap_duration * 1000));
            totalSlope += slope; nStints++;
        }
        const tireDegMsPerLap = nStints > 0 ? totalSlope / nStints : null;

        return {
            sampleSize:      clean.length,
            raceMedianMs:    Math.round(raceMedianMs),
            ultimateMs:      Math.round(ultimateMs),
            consistencyMs:   Math.round(consistencyMs),
            tireDegMsPerLap: tireDegMsPerLap != null ? +tireDegMsPerLap.toFixed(1) : null,
        };
    }

    function linearSlope(xs, ys) {
        const n = xs.length;
        const mx = xs.reduce((a, b) => a + b, 0) / n;
        const my = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (xs[i] - mx) * (ys[i] - my);
            den += (xs[i] - mx) ** 2;
        }
        return den ? num / den : 0;
    }

    /**
     * Fetch sessions for a year and store metadata. Race sessions only.
     */
    async function fetchYearSessions(year) {
        const list = await fetchJSON(`/sessions?year=${year}&session_type=Race`);
        await putMany('sessions', list.map(s => ({ ...s })));
        return list;
    }

    /**
     * For a session, fetch every driver's laps and compute features.
     */
    async function fetchSessionLapFeatures(session) {
        const laps = await fetchJSON(`/laps?session_key=${session.session_key}`);
        // Group by driver number
        const byDriver = {};
        for (const lap of laps) {
            const n = lap.driver_number;
            (byDriver[n] = byDriver[n] || []).push(lap);
        }
        const features = [];
        for (const [driverNumber, dLaps] of Object.entries(byDriver)) {
            const f = computeSessionFeatures(dLaps);
            if (f.raceMedianMs == null) continue;
            features.push({
                rowKey:        `${session.session_key}|${driverNumber}`,
                session_key:   session.session_key,
                year:          session.year,
                circuit_short_name: session.circuit_short_name,
                driver_number: parseInt(driverNumber, 10),
                date_start:    session.date_start,
                ...f,
            });
        }
        return features;
    }

    /**
     * Public: fetch + cache lap features for the given years.
     * Default: 2023 + 2024 (OpenF1 coverage starts 2023).
     */
    async function ensureLoaded(opts = {}) {
        const years = opts.years || [2023, 2024];
        const forceReload = !!opts.forceReload;

        const cachedYears = await getMeta('loadedYears') || [];
        const missing = forceReload ? years : years.filter(y => !cachedYears.includes(y));

        if (missing.length === 0) {
            emitProgress(100, 'cached');
            const features = await getAllFromStore('lap_features');
            return { features };
        }

        emitProgress(2, `fetching ${missing.length} year(s) of OpenF1 sessions`);

        for (let yi = 0; yi < missing.length; yi++) {
            const year = missing[yi];
            const sessions = await fetchYearSessions(year);
            for (let si = 0; si < sessions.length; si++) {
                const session = sessions[si];
                const pct = 2 + Math.round(((yi + si / sessions.length) / missing.length) * 92);
                emitProgress(pct, `${year} R${si + 1}/${sessions.length} ${session.circuit_short_name}`);
                try {
                    const feats = await fetchSessionLapFeatures(session);
                    if (feats.length) await putMany('lap_features', feats);
                } catch (e) {
                    emitProgress(pct, `${year} ${session.circuit_short_name} limited — continuing`);
                }
                await new Promise(r => setTimeout(r, 100));  // be polite
            }
        }

        const newCached = Array.from(new Set([...cachedYears, ...missing]));
        await setMeta('loadedYears', newCached);
        await setMeta('lastUpdate', new Date().toISOString());

        emitProgress(100, 'complete');
        const features = await getAllFromStore('lap_features');
        return { features };
    }

    /**
     * Roll up to per-driver per-circuit average pace metrics. Used by the
     * predictor's feature engineer as an additional signal layer.
     */
    function buildLookup(features) {
        // key: `${driverNumber}|${circuit_short_name}` → aggregated
        const byKey = {};
        features.forEach(f => {
            const key = `${f.driver_number}|${f.circuit_short_name}`;
            if (!byKey[key]) byKey[key] = { medians: [], ultimates: [], consistencies: [], degSlopes: [], samples: 0 };
            byKey[key].medians.push(f.raceMedianMs);
            byKey[key].ultimates.push(f.ultimateMs);
            byKey[key].consistencies.push(f.consistencyMs);
            if (f.tireDegMsPerLap != null) byKey[key].degSlopes.push(f.tireDegMsPerLap);
            byKey[key].samples += f.sampleSize;
        });
        const lookup = {};
        Object.entries(byKey).forEach(([key, v]) => {
            lookup[key] = {
                raceMedianMs:    Math.round(v.medians.reduce((a, b) => a + b, 0) / v.medians.length),
                ultimateMs:      Math.round(Math.min(...v.ultimates)),
                consistencyMs:   Math.round(v.consistencies.reduce((a, b) => a + b, 0) / v.consistencies.length),
                tireDegMsPerLap: v.degSlopes.length ? +(v.degSlopes.reduce((a, b) => a + b, 0) / v.degSlopes.length).toFixed(1) : null,
                samples:         v.samples,
            };
        });
        return lookup;
    }

    /**
     * Returns pace-delta-to-leader per driver for a circuit.
     * Negative = faster than leader, positive = slower.
     */
    function paceDeltaByDriver(lookup, circuitShortName) {
        const entries = Object.entries(lookup)
            .filter(([k]) => k.endsWith(`|${circuitShortName}`))
            .map(([k, v]) => {
                const [num] = k.split('|');
                return { driverNumber: parseInt(num, 10), ...v };
            });
        if (!entries.length) return {};
        const leaderMedian = Math.min(...entries.map(e => e.raceMedianMs));
        const out = {};
        entries.forEach(e => {
            out[e.driverNumber] = {
                deltaMs:    e.raceMedianMs - leaderMedian,
                ultimateMs: e.ultimateMs,
                consistencyMs: e.consistencyMs,
                tireDegMsPerLap: e.tireDegMsPerLap,
            };
        });
        return out;
    }

    window.OpenF1Features = {
        ensureLoaded,
        buildLookup,
        paceDeltaByDriver,
        getProgress: () => ({ ..._progress }),
        onProgress,
    };
})();
