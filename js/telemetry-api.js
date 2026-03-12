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
        // Construct URL with query parameters
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const urlString = url.toString();
        
        // Simple caching to avoid spamming the API
        if (this.cache.has(urlString)) {
            return this.cache.get(urlString);
        }

        try {
            const response = await fetch(urlString);
            if (!response.ok) {
                throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            
            // Cache successful responses for 10 seconds
            this.cache.set(urlString, data);
            setTimeout(() => this.cache.delete(urlString), 10000);
            
            return data;
        } catch (error) {
            console.error(`Error fetching from OpenF1 ${endpoint}:`, error);
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
     * Get the latest session specifically
     */
    async getLatestSession() {
        // We fetch the most recent sessions and sort descending by date
        // API supports filtering, e.g., year=2024
        const sessions = await this.fetch('/sessions', { session_name: 'Race' });
        if (sessions && sessions.length > 0) {
            // Sort by date descending to get the latest race
            return sessions.sort((a, b) => new Date(b.date_start) - new Date(a.date_start))[0];
        }
        return null;
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
     * Get high-frequency car telemetry (speed, rpm, gear, throttle, brake)
     */
    async getCarData(sessionKey, driverNumber) {
        return this.fetch('/car_data', {
            session_key: sessionKey,
            driver_number: driverNumber
        });
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
