import { OpenF1API } from './telemetry-api.js';

class LiveTelemetryDashboard {
    constructor() {
        this.api = new OpenF1API();
        this.currentSession = null;
        this.speedChart = null;
        this.isStreaming = false;
        this.streamInterval = null;

        // DOM Elements
        this.btnFetch = document.getElementById('btn-fetch-telemetry');
        this.statusEl = document.getElementById('tele-session-status');
        this.driverSelect = document.getElementById('tele-driver-select');
        this.dashboardGrid = document.getElementById('tele-dashboard');
        this.lapTbody = document.getElementById('tele-lap-tbody');
        this.ctxSpeed = document.getElementById('tele-speed-chart');

        if (this.btnFetch) {
            this.btnFetch.addEventListener('click', () => this.toggleStream());
        }
        
        if (this.driverSelect) {
            this.driverSelect.addEventListener('change', () => {
                if (this.isStreaming) this.refreshData();
            });
        }
    }

    async toggleStream() {
        if (this.isStreaming) {
            this.stopStream();
        } else {
            if (window.faticsAudio) window.faticsAudio.playHover();
            await this.startStream();
        }
    }

    _setStatus(text, type) {
        if (!this.statusEl) return;
        this.statusEl.innerText = text;
        this.statusEl.className = `tele-status ${type}`;
    }

    _setBtnText(text) {
        if (this.btnFetch) this.btnFetch.querySelector('.btn-text').innerText = text;
    }

    // Wraps a promise with a hard timeout — rejects if API doesn't respond in time
    _withTimeout(promise, ms = 10000) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`OpenF1 API timed out after ${ms / 1000}s`)), ms)
            )
        ]);
    }

    async startStream() {
        // Guard: prevent double-clicks
        if (this.isConnecting) return;
        this.isConnecting = true;

        this._setBtnText('Connecting…');
        this._setStatus('Connecting to OpenF1…', 'warning');
        if (this.btnFetch) this.btnFetch.disabled = true;

        try {
            const session = await this._withTimeout(this.api.getLatestSession());

            if (!session) {
                throw new Error('No active session found. Live telemetry is only available during race weekends.');
            }

            this.currentSession = session;
            this.isStreaming = true;

            // Differentiate LIVE vs REPLAY status so the user knows which mode
            const sessionEnd = session.date_end ? new Date(session.date_end) : null;
            const isReplay = sessionEnd && sessionEnd.getTime() < Date.now();
            const dateStr = session.date_start ? new Date(session.date_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

            const statusText = isReplay
                ? `[REPLAY] ${session.circuit_short_name} — ${session.session_name} · ${dateStr}`
                : `[LIVE] ${session.circuit_short_name} — ${session.session_name}`;
            this._setStatus(statusText, 'success');
            this._setBtnText(isReplay ? 'Stop Replay' : 'Stop Live Stream');
            if (this.btnFetch) this.btnFetch.disabled = false;

            this.dashboardGrid.style.display = 'grid';

            await this.refreshData();
            // Replays don't need 5s refresh — data is static. Poll once per minute as a heartbeat.
            const pollMs = isReplay ? 60000 : 5000;
            this.streamInterval = setInterval(() => this.refreshData(), pollMs);

        } catch (error) {
            const msg = error.message.includes('timed out')
                ? 'Connection timed out — OpenF1 may be offline'
                : (error.message.length < 80 ? error.message : 'Connection failed — try again during a race weekend');

            this._setStatus(msg, 'error');
            this._setBtnText('Connect Live Stream');
            if (this.btnFetch) this.btnFetch.disabled = false;
            this.isStreaming = false;
            this.currentSession = null;
        } finally {
            this.isConnecting = false;
        }
    }

    stopStream() {
        this.isStreaming = false;
        this.isConnecting = false;
        clearInterval(this.streamInterval);
        this.streamInterval = null;
        this._setBtnText('Connect Live Stream');
        if (this.btnFetch) this.btnFetch.disabled = false;
        this._setStatus('Disconnected', 'error');
    }

    async refreshData() {
        if (!this.currentSession || !this.isStreaming) return;

        try {
            const sessionKey = this.currentSession.session_key;
            const driverNo = this.driverSelect.value;

            // 1. Laps first — small payload (~50 rows × ~200 bytes = 10KB).
            const lapData = await this._withTimeout(
                this.api.getLaps(sessionKey, driverNo), 8000
            ).catch(() => null);

            // If the session genuinely has no lap data for this driver
            // (other driver), or 3 consecutive refreshes failed, stop
            // polling and switch to pure simulation. Prevents the
            // 1/min API hammering the user saw in the console.
            if (!lapData) {
                this._missCount = (this._missCount || 0) + 1;
                if (this._missCount >= 3) {
                    clearInterval(this.streamInterval);
                    this.streamInterval = null;
                    this._setStatus('No live data — showing simulation', 'warning');
                }
                this.simulateSpeedTrace();
                this.simulateLapData();
                return;
            }
            this._missCount = 0;

            // 2. Use the last lap's start time to anchor a tight car_data
            //    window. car_data for a full race is ~6MB; a 2-min slice is ~250KB.
            let carOpts = { windowMinutes: 5 };
            if (lapData && lapData.length > 0) {
                const lastLap = lapData[lapData.length - 1];
                const lapStartIso = lastLap.date_start;
                if (lapStartIso) {
                    const lapStart = new Date(lapStartIso);
                    const endDate = new Date(lapStart.getTime() + (lastLap.lap_duration || 90) * 1000);
                    carOpts = { endDate, windowMinutes: 2 };
                }
            } else {
                // Fall back to session date_end for the window anchor
                const sessionEnd = this.currentSession.date_end
                    ? new Date(this.currentSession.date_end)
                    : null;
                if (sessionEnd && sessionEnd.getTime() < Date.now()) {
                    carOpts = { endDate: sessionEnd, windowMinutes: 30 };
                }
            }

            const carData = await this._withTimeout(
                this.api.getCarData(sessionKey, driverNo, carOpts), 8000
            ).catch(() => null);

            // Render — use real data if present, otherwise fall back to sim
            if (carData && carData.length > 0) {
                this.renderSpeedChart(carData);
            } else {
                this.simulateSpeedTrace();
            }
            if (lapData && lapData.length > 0) {
                this.renderLapData(lapData);
            } else {
                this.simulateLapData();
            }
        } catch (e) {
            this._setStatus(`Live feed interrupted — showing simulation (${new Date().toLocaleTimeString()})`, 'warning');
            this.simulateSpeedTrace();
            this.simulateLapData();
        }
    }

    // Realistic Simulation Engine for when the live F1 session is offline
    simulateSpeedTrace() {
        if (!this.simulatedCarData) {
            this.simulatedCarData = [];
            this.simTime = new Date();
            this.simSpeed = 80; // Pit exit speed
        }

        // Generate 5 seconds of track data (one point per second)
        for(let i = 0; i < 5; ++i) {
            this.simTime.setSeconds(this.simTime.getSeconds() + 1);
            
            // F1 speed physics simulation (accelerating, braking, coasting)
            const trackPhase = (this.simTime.getTime() % 90000) / 90000; // 90s lap
            
            if (trackPhase < 0.2) {
                // Main straight (Accelerate to ~330)
                this.simSpeed = Math.min(340, this.simSpeed + (Math.random() * 30 + 10));
            } else if (trackPhase < 0.25) {
                // Heavy braking turn 1
                this.simSpeed = Math.max(80, this.simSpeed - (Math.random() * 80 + 40));
            } else if (trackPhase < 0.5) {
                // Winding sectors (120-220)
                this.simSpeed += (Math.random() * 40 - 20);
                this.simSpeed = Math.max(120, Math.min(240, this.simSpeed));
            } else if (trackPhase < 0.7) {
                // Secondary straight
                this.simSpeed = Math.min(310, this.simSpeed + (Math.random() * 25 + 10));
            } else {
                // Final technical sector
                this.simSpeed += (Math.random() * 60 - 35);
                this.simSpeed = Math.max(90, Math.min(200, this.simSpeed));
            }

            let throttle = 0;
            if (this.simSpeed > 280) throttle = 100;
            else if (this.simSpeed < 100) throttle = 10 + Math.random() * 20;
            else throttle = Math.min(100, Math.max(0, (this.simSpeed / 340) * 100 + (Math.random() * 20 - 10)));

            this.simulatedCarData.push({
                date: new Date(this.simTime),
                speed: Math.round(this.simSpeed),
                throttle: Math.round(throttle)
            });
        }

        if (this.simulatedCarData.length > 100) {
            this.simulatedCarData = this.simulatedCarData.slice(-100);
        }

        this.renderSpeedChart(this.simulatedCarData);
    }

    simulateLapData() {
        if (!this.simulatedLaps) {
            this.simulatedLaps = [
                { lap_number: 14, duration_sector_1: 28.452, duration_sector_2: 39.102, duration_sector_3: 24.311, lap_duration: 91.865 },
                { lap_number: 15, duration_sector_1: 28.310, duration_sector_2: 39.005, duration_sector_3: 24.250, lap_duration: 91.565 },
                { lap_number: 16, duration_sector_1: 28.295, duration_sector_2: 38.950, duration_sector_3: 24.200, lap_duration: 91.445 }
            ];
            this.currentSimLap = 17;
        }

        // Add a new lap every ~90 seconds (we'll just cheat and add one randomly every few refreshes for the demo)
        if (Math.random() > 0.8) {
            const s1 = 28.0 + Math.random();
            const s2 = 38.5 + Math.random() * 1.5;
            const s3 = 24.0 + Math.random();
            this.simulatedLaps.push({
                lap_number: this.currentSimLap++,
                duration_sector_1: s1,
                duration_sector_2: s2,
                duration_sector_3: s3,
                lap_duration: s1 + s2 + s3
            });
            if (this.simulatedLaps.length > 5) this.simulatedLaps.shift();
        }

        this.renderLapData(this.simulatedLaps);
    }

    renderSpeedChart(carData) {
        if (!this.ctxSpeed || !carData.length) return;
        
        // Take the last 100 data points to keep the chart performant and readable
        const recentData = carData.slice(-100);
        
        const labels = recentData.map(d => {
            const date = new Date(d.date);
            return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`;
        });
        const speeds = recentData.map(d => d.speed);
        const throttles = recentData.map(d => d.throttle);

        const rootStyles = getComputedStyle(document.documentElement);
        const themeColor = rootStyles.getPropertyValue('--accent').trim() || '#E8112D';
        const textColor = rootStyles.getPropertyValue('--fg').trim() || '#F5F3F0';

        if (this.speedChart) {
            this.speedChart.data.labels = labels;
            this.speedChart.data.datasets[0].data = speeds;
            this.speedChart.data.datasets[0].borderColor = themeColor;
            this.speedChart.data.datasets[0].backgroundColor = `${themeColor}33`; // 20% opacity
            
            this.speedChart.data.datasets[1].data = throttles;
            
            this.speedChart.update('none'); // Update without animation for smooth streaming
        } else {
            this.speedChart = new Chart(this.ctxSpeed, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Speed (km/h)',
                            data: speeds,
                            borderColor: themeColor,
                            backgroundColor: `${themeColor}33`,
                            borderWidth: 2,
                            fill: true,
                            tension: 0.2,
                            pointRadius: 0,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Throttle (%)',
                            data: throttles,
                            borderColor: textColor,
                            borderWidth: 1,
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.2,
                            pointRadius: 0,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            labels: { color: textColor, font: { family: 'Inter' } }
                        }
                    },
                    scales: {
                        x: { display: false }, // Hide X axis for cleaner look
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Speed (km/h)', color: textColor },
                            grid: { color: textColor },
                            ticks: { color: textColor },
                            min: 0,
                            max: 350
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Throttle %', color: textColor },
                            grid: { drawOnChartArea: false },
                            ticks: { color: textColor },
                            min: 0,
                            max: 105
                        }
                    }
                }
            });
        }
    }

    renderLapData(lapData) {
        if (!this.lapTbody || !lapData.length) return;

        this.lapTbody.innerHTML = '';

        // Get the last 5 valid laps
        const recentLaps = lapData
            .filter(l => l.lap_duration != null)
            .slice(-5)
            .reverse();

        if (recentLaps.length === 0) {
            this.lapTbody.innerHTML = `
                <tr><td colspan="5" style="text-align:center; padding: 1.5rem; font-family: var(--font); font-size: 11px; color: var(--text-3); letter-spacing: 0.16em; text-transform: uppercase;">
                    [ NO VALID LAPS YET ] · WAITING FOR DRIVER ON TRACK
                </td></tr>
            `;
            return;
        }

        const formatTime = (seconds) => {
            if (!seconds) return '—';
            if (seconds < 60) return seconds.toFixed(3);
            const m = Math.floor(seconds / 60);
            const s = (seconds % 60).toFixed(3).padStart(6, '0');
            return `${m}:${s}`;
        };

        recentLaps.forEach(lap => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>L${lap.lap_number}</strong></td>
                <td>${formatTime(lap.duration_sector_1)}</td>
                <td>${formatTime(lap.duration_sector_2)}</td>
                <td>${formatTime(lap.duration_sector_3)}</td>
                <td style="color: var(--accent); font-weight: bold;">${formatTime(lap.lap_duration)}</td>
            `;
            this.lapTbody.appendChild(tr);
        });
    }
}

// Initialize on DOM Load or when added to DOM
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('live-telemetry')) {
        window.liveTelemetry = new LiveTelemetryDashboard();
    }
});
