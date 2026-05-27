/**
 * F-ATICS Historical Dataset
 * ═════════════════════════════════════════════════════════════════
 * Pulls multi-season race + qualifying + sprint data from Jolpica
 * (the modern Ergast mirror) and stores it in IndexedDB.
 *
 * Used by the walk-forward backtest to build a truly out-of-sample
 * evaluation of the prediction model: for every historical race,
 * we predict using ONLY data that existed before the race, then
 * score against the actual outcome.
 *
 * Storage:
 *   IndexedDB database `f1_history_v1`
 *     store `races`     {key: raceId, value: {season, round, date, circuit, name}}
 *     store `results`   {key: `${raceId}|${driverId}`, value: {grid, finish, status, points, time}}
 *     store `qualifying`{key: `${raceId}|${driverId}`, value: {q1, q2, q3, position}}
 *     store `meta`      {key: string, value: arbitrary}
 *
 * Public API (window.HistoricalDataset):
 *   ensureLoaded(opts) -> Promise<{seasons, races, results}>
 *   getRacesBefore(dateISO) -> Race[]
 *   getResultsForRace(raceId) -> Result[]
 *   getDriverRecentResults(driverId, beforeRaceId, n) -> Result[]
 *   getDriverCircuitResults(driverId, circuitId, beforeRaceId) -> Result[]
 *   getAllDriversInRace(raceId) -> string[]
 *   getProgress() -> {pct, message}  (for UI)
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    const DB_NAME    = 'f1_history_v2';
    const DB_VERSION = 1;
    const JOLPICA    = 'https://api.jolpi.ca/ergast/f1';

    // 11 seasons (2014–2024) gives ~250 races, comfortably enough for OOS
    // backtest while keeping fetch time bounded. Each season ~5 paginated calls.
    const DEFAULT_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

    let _db = null;
    const _progress = { pct: 0, message: 'idle' };
    const _listeners = [];

    function emitProgress(pct, message) {
        _progress.pct = pct;
        _progress.message = message;
        _listeners.forEach(fn => { try { fn(_progress); } catch {} });
    }

    function onProgress(fn) { _listeners.push(fn); }

    // ── IndexedDB wrappers (no external deps) ───────────────────────
    function openDB() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('races'))      db.createObjectStore('races',      { keyPath: 'raceId' });
                if (!db.objectStoreNames.contains('results'))    db.createObjectStore('results',    { keyPath: 'rowKey' });
                if (!db.objectStoreNames.contains('qualifying')) db.createObjectStore('qualifying', { keyPath: 'rowKey' });
                if (!db.objectStoreNames.contains('meta'))       db.createObjectStore('meta',       { keyPath: 'key' });
            };
            req.onsuccess = () => { _db = req.result; resolve(_db); };
            req.onerror   = () => reject(req.error);
        });
    }

    async function tx(storeName, mode = 'readonly') {
        const db = await openDB();
        return db.transaction(storeName, mode).objectStore(storeName);
    }

    function promisifyReq(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error);
        });
    }

    async function putAll(storeName, items) {
        const store = await tx(storeName, 'readwrite');
        for (const item of items) store.put(item);
        return new Promise((resolve, reject) => {
            store.transaction.oncomplete = () => resolve();
            store.transaction.onerror    = () => reject(store.transaction.error);
        });
    }

    async function getAll(storeName) {
        const store = await tx(storeName);
        return promisifyReq(store.getAll());
    }

    async function getMeta(key) {
        const store = await tx('meta');
        const row = await promisifyReq(store.get(key));
        return row?.value;
    }

    async function setMeta(key, value) {
        const store = await tx('meta', 'readwrite');
        store.put({ key, value });
        return new Promise(r => { store.transaction.oncomplete = r; });
    }

    // ── Jolpica fetchers — paginated ─────────────────────────────────
    async function fetchPaginated(path) {
        const limit = 100;
        let offset = 0;
        let total = Infinity;
        const all = [];
        let safetyCounter = 0;

        while (offset < total && safetyCounter < 30) {
            const url = `${JOLPICA}${path}${path.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`;
            const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
            const json = await r.json();
            const mr = json.MRData;
            if (!mr) break;
            total = parseInt(mr.total, 10) || 0;
            all.push(json);
            offset += limit;
            safetyCounter += 1;
            // Tiny inter-page delay to be polite to the API
            await new Promise(r => setTimeout(r, 80));
        }
        return all;
    }

    async function fetchSeasonResults(year) {
        const pages = await fetchPaginated(`/${year}/results.json`);
        const races = [];
        const racesByRound = {};
        pages.forEach(json => {
            (json.MRData?.RaceTable?.Races || []).forEach(race => {
                const raceId = `${year}-R${race.round}`;
                if (!racesByRound[raceId]) {
                    racesByRound[raceId] = {
                        raceId,
                        season:  parseInt(race.season, 10),
                        round:   parseInt(race.round, 10),
                        date:    race.date,
                        circuitId: race.Circuit?.circuitId || 'unknown',
                        circuitName: race.Circuit?.circuitName || race.raceName,
                        raceName: race.raceName,
                        results: [],
                    };
                    races.push(racesByRound[raceId]);
                }
                (race.Results || []).forEach(r => {
                    racesByRound[raceId].results.push({
                        rowKey:   `${raceId}|${r.Driver?.driverId}`,
                        raceId,
                        driverId: r.Driver?.driverId,
                        driverName: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
                        constructorId: r.Constructor?.constructorId,
                        constructorName: r.Constructor?.name,
                        grid:     parseInt(r.grid, 10),
                        finish:   parseInt(r.position, 10),
                        positionText: r.positionText,
                        status:   r.status,
                        points:   parseFloat(r.points) || 0,
                        time:     r.Time?.millis ? parseInt(r.Time.millis, 10) : null,
                        fastestLap: r.FastestLap?.rank === '1',
                    });
                });
            });
        });
        return races;
    }

    async function fetchSeasonQualifying(year) {
        const pages = await fetchPaginated(`/${year}/qualifying.json`);
        const all = [];
        pages.forEach(json => {
            (json.MRData?.RaceTable?.Races || []).forEach(race => {
                const raceId = `${year}-R${race.round}`;
                (race.QualifyingResults || []).forEach(q => {
                    all.push({
                        rowKey:   `${raceId}|${q.Driver?.driverId}`,
                        raceId,
                        driverId: q.Driver?.driverId,
                        qualiPos: parseInt(q.position, 10),
                        q1: q.Q1 || null,
                        q2: q.Q2 || null,
                        q3: q.Q3 || null,
                    });
                });
            });
        });
        return all;
    }

    async function loadFromIDB() {
        const races       = await getAll('races');
        const results     = await getAll('results');
        const qualifying  = await getAll('qualifying');
        return { races, results, qualifying };
    }

    /**
     * Ensure the historical dataset is loaded. Returns immediately if cached.
     * Otherwise fetches all seasons and stores in IndexedDB.
     *
     * @param {Object} opts
     * @param {number[]} opts.years
     * @param {boolean}  opts.forceReload
     */
    async function ensureLoaded(opts = {}) {
        const years = opts.years || DEFAULT_YEARS;
        const forceReload = !!opts.forceReload;

        const cachedYears = await getMeta('loadedYears') || [];
        const missingYears = forceReload ? years : years.filter(y => !cachedYears.includes(y));

        if (missingYears.length === 0) {
            emitProgress(100, 'cached');
            return await loadFromIDB();
        }

        emitProgress(2, `fetching ${missingYears.length} seasons...`);

        let done = 0;
        for (const year of missingYears) {
            try {
                emitProgress(
                    2 + Math.round((done / missingYears.length) * 90),
                    `${year} — results`
                );
                const races = await fetchSeasonResults(year);
                // Flatten results for IDB
                const flatResults = [];
                races.forEach(r => { flatResults.push(...r.results); });
                const flatRaces = races.map(({ results, ...r }) => r);

                await putAll('races', flatRaces);
                await putAll('results', flatResults);

                emitProgress(
                    2 + Math.round(((done + 0.5) / missingYears.length) * 90),
                    `${year} — qualifying`
                );
                const quali = await fetchSeasonQualifying(year);
                if (quali.length) await putAll('qualifying', quali);

                done += 1;
            } catch (e) {
                console.warn(`[history] year ${year} failed:`, e.message);
                // Don't fail the whole load — skip and continue
            }
        }

        // Mark which years are now cached
        const newCached = Array.from(new Set([...cachedYears, ...missingYears]));
        await setMeta('loadedYears', newCached);
        await setMeta('lastUpdate',  new Date().toISOString());

        emitProgress(100, 'complete');
        return await loadFromIDB();
    }

    // ── Public query helpers ────────────────────────────────────────
    // These are sync once data is loaded into a JS array; the engine
    // calls ensureLoaded() once then keeps the result in memory.
    function buildIndex(dataset) {
        const racesById   = {};
        const raceList    = dataset.races.slice().sort((a, b) => a.date.localeCompare(b.date));
        raceList.forEach((r, i) => { r._idx = i; racesById[r.raceId] = r; });

        // results: index by raceId AND by driverId
        const resultsByRace = {};
        const resultsByDriver = {};
        dataset.results.forEach(r => {
            if (!resultsByRace[r.raceId])     resultsByRace[r.raceId] = [];
            if (!resultsByDriver[r.driverId]) resultsByDriver[r.driverId] = [];
            resultsByRace[r.raceId].push(r);
            resultsByDriver[r.driverId].push(r);
        });
        // Sort each driver's results by date
        Object.values(resultsByDriver).forEach(arr => {
            arr.sort((a, b) => {
                const ra = racesById[a.raceId], rb = racesById[b.raceId];
                return (ra?.date || '').localeCompare(rb?.date || '');
            });
        });

        // qualifying: same shape
        const qualifyingByRace = {};
        dataset.qualifying.forEach(q => {
            if (!qualifyingByRace[q.raceId]) qualifyingByRace[q.raceId] = [];
            qualifyingByRace[q.raceId].push(q);
        });

        return {
            raceList,
            racesById,
            resultsByRace,
            resultsByDriver,
            qualifyingByRace,
        };
    }

    // ── Bootstrap on load ──────────────────────────────────────────
    window.HistoricalDataset = {
        ensureLoaded,
        buildIndex,
        getProgress: () => ({ ..._progress }),
        onProgress,
        DEFAULT_YEARS,
    };
})();
