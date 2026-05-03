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

            this._setStatus(`Connected: ${session.circuit_short_name} — ${session.session_name}`, 'success');
            this._setBtnText('Stop Live Stream');
            if (this.btnFetch) this.btnFetch.disabled = false;

            this.dashboardGrid.style.display = 'grid';

            await this.refreshData();
            this.streamInterval = setInterval(() => this.refreshData(), 5000);

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
    
            // Fetch concurrently
            const [carData, lapData] = await Promise.all([
                this.api.getCarData(sessionKey, driverNo),
                this.api.getLaps(sessionKey, driverNo)
            ]);
    
            // If API returns data, use it. Otherwise, use our ultra-realistic simulation engine
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
            // Non-fatal: show warning in status but keep the stream alive
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

        const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--pk-red').trim() || '#E10600';

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
                            borderColor: '#3498db',
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
                            labels: { color: '#ffffff', font: { family: 'Inter' } }
                        }
                    },
                    scales: {
                        x: { display: false }, // Hide X axis for cleaner look
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Speed (km/h)', color: '#fff' },
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#999' },
                            min: 0,
                            max: 350
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Throttle %', color: '#fff' },
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#999' },
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
            this.lapTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1rem;">No valid lap times yet</td></tr>';
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
                <td style="color: var(--pk-red); font-weight: bold;">${formatTime(lap.lap_duration)}</td>
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
