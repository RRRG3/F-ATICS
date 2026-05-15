/**
 * OpenF1 API Client
 * Handles fetching live and historical telemetry data from the open OpenF1 API
 * Documentation: https://openf1.org/
 */
export class OpenF1API {
    constructor() {
        this.baseUrl = 'https://api.openf1.org/v1';
        this.cache = new Map();
    }

    async fetch(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        const urlString = url.toString();

        // Cache successful responses (and short-cache 404s so we don't spam)
        if (this.cache.has(urlString)) return this.cache.get(urlString);

        try {
            const response = await fetch(urlString);
            if (!response.ok) {
                // 404 == "no data for this query" — common on OpenF1, not a real error
                if (response.status === 404) {
                    this.cache.set(urlString, null);
                    setTimeout(() => this.cache.delete(urlString), 60000);
                    return null;
                }
                throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.cache.set(urlString, data);
            setTimeout(() => this.cache.delete(urlString), 10000);
            return data;
        } catch (error) {
            // Silent fail — caller falls back to simulation
            return null;
        }
    }

    /**
     * Get the latest or specific session
     */
    async getSessions(params = {}) {
        return this.fetch('/sessions', params);
    }

    /**
     * Get the most-recently-completed race session that ACTUALLY HAS DATA.
     *
     * OpenF1 pre-populates future-scheduled sessions, so sorting all "Race"
     * sessions descending can pick a session that hasn't happened yet
     * (no car_data / lap_data → 404). We filter to past sessions and then
     * pre-flight each candidate against /laps until we find one that has
     * real data — guarantees the dashboard always gets something usable.
     */
    async getLatestSession() {
        const sessions = await this.fetch('/sessions', { session_name: 'Race' });
        if (!sessions || !sessions.length) return null;

        const now = Date.now();
        const past = sessions
            .filter(s => new Date(s.date_start).getTime() <= now)
            .sort((a, b) => new Date(b.date_start) - new Date(a.date_start));

        // Try the most recent past sessions in order until one has lap data.
        // Cap at 4 attempts so we don't slow boot to a crawl.
        for (const candidate of past.slice(0, 4)) {
            const laps = await this.fetch('/laps', {
                session_key: candidate.session_key,
                driver_number: 1,
            });
            if (laps && laps.length > 0) return candidate;
        }

        // No past races with data — return the closest upcoming one anyway
        const future = sessions
            .filter(s => new Date(s.date_start).getTime() > now)
            .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
        return past[0] || future[0] || null;
    }

    /**
     * Get laps for a specific session and driver
     */
    async getLaps(sessionKey, driverNumber = null) {
        const params = { session_key: sessionKey };
        if (driverNumber) params.driver_number = driverNumber;
        return this.fetch('/laps', params);
    }

    /**
     * Get high-frequency car telemetry (speed, rpm, gear, throttle, brake).
     *
     * A full race has 50k+ rows per driver — fetching all of them blocks
     * the UI for many seconds. We cap to a `windowMinutes` slice anchored
     * to `endDate`. For a live race pass no endDate (defaults to now).
     * For a past replay pass the session's `date_end`.
     */
    async getCarData(sessionKey, driverNumber, opts = {}) {
        const windowMinutes = opts.windowMinutes ?? 5;
        const end = opts.endDate ? new Date(opts.endDate) : new Date();
        const params = {
            session_key: sessionKey,
            driver_number: driverNumber,
        };
        if (windowMinutes > 0) {
            const start = new Date(end.getTime() - windowMinutes * 60 * 1000);
            params['date>='] = start.toISOString();
            params['date<=']  = end.toISOString();
        }
        return this.fetch(`/car_data`, params);
    }

    /**
     * Get driver intervals/gaps
     */
    async getIntervals(sessionKey) {
        return this.fetch('/intervals', { session_key: sessionKey });
    }

    /**
     * Get driver track positions
     */
    async getLocation(sessionKey, driverNumber) {
        return this.fetch('/location', {
            session_key: sessionKey,
            driver_number: driverNumber
        });
    }
}
