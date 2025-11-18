/**
 * ML Prediction UI Component
 * Interactive interface for the F1 prediction model - Integrated Design
 */

import F1PredictionPipeline from './ml-prediction-pipeline.js';
import F1DataGenerator from './ml-data-generator.js';

export class MLPredictionUI {
    constructor() {
        this.pipeline = new F1PredictionPipeline();
        this.dataGenerator = new F1DataGenerator();
        this.isTraining = false;
    }

    init() {
        this.addStyles();
        this.populateCircuitSelect();
        this.attachEventListeners();
        
        // Clear old cached model to get fresh predictions
        localStorage.removeItem('f1_prediction_model');
        
        // Always auto-train for fresh predictions
        this.autoTrainModel();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .predictor-section {
                background: linear-gradient(135deg, rgba(225, 6, 0, 0.05) 0%, rgba(26, 26, 26, 0.95) 100%);
            }
            
            .predictor-main {
                max-width: 900px;
                margin: 2rem auto;
            }
            
            .predictor-card-single {
                background: rgba(26, 26, 26, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .predictor-card-single:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(225, 6, 0, 0.2);
                border-color: rgba(225, 6, 0, 0.3);
            }
            
            .predictor-controls-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.25rem;
                margin-bottom: 1.5rem;
            }
            
            .predictor-btn-large {
                width: 100%;
                padding: 1.25rem 2rem;
                font-size: 1.2rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                background: linear-gradient(135deg, var(--primary-red), #c70000);
                border: none;
                border-radius: 12px;
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .predictor-btn-large:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(225, 6, 0, 0.4);
            }
            
            .predictor-btn-large:active {
                transform: translateY(0);
            }
            
            .predictor-badge-ready {
                background: rgba(0, 213, 99, 0.2);
                color: var(--success-green);
            }
            
            .predictor-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                gap: 2rem;
                margin-top: 2rem;
            }
            
            .predictor-card {
                background: rgba(26, 26, 26, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .predictor-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(225, 6, 0, 0.2);
                border-color: rgba(225, 6, 0, 0.3);
            }
            
            .predictor-card-header {
                padding: 1.5rem;
                background: linear-gradient(135deg, rgba(225, 6, 0, 0.1) 0%, rgba(26, 26, 26, 0.5) 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .predictor-card-header h3 {
                margin: 0;
                font-size: 1.25rem;
                color: var(--text-primary);
            }
            
            .predictor-badge {
                padding: 0.375rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .predictor-badge {
                background: rgba(128, 128, 128, 0.2);
                color: var(--text-muted);
            }
            
            .predictor-badge.trained {
                background: rgba(0, 213, 99, 0.2);
                color: var(--success-green);
            }
            
            .predictor-badge-info {
                background: rgba(255, 215, 0, 0.2);
                color: var(--accent-gold);
            }
            
            .predictor-card-body {
                padding: 2rem;
            }
            
            .predictor-description {
                color: var(--text-secondary);
                line-height: 1.6;
                margin-bottom: 1.5rem;
            }
            
            .predictor-controls {
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
                margin-bottom: 1.5rem;
            }
            
            .control-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .control-group label {
                color: var(--text-primary);
                font-weight: 600;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .label-icon {
                font-size: 1.1rem;
            }
            
            .control-group input,
            .predictor-select {
                padding: 0.75rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: var(--text-primary);
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            
            .control-group input:focus,
            .predictor-select:focus {
                outline: none;
                border-color: var(--primary-red);
                background: rgba(255, 255, 255, 0.08);
            }
            
            .control-hint {
                font-size: 0.8rem;
                color: var(--text-muted);
                font-style: italic;
            }
            
            .predictor-btn {
                width: 100%;
                padding: 1rem 2rem;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
            }
            
            .btn-icon {
                font-size: 1.3rem;
            }
            
            .training-progress {
                margin-top: 1.5rem;
                padding: 1.5rem;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 12px;
            }
            
            .progress-bar {
                width: 100%;
                height: 12px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 1rem;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-red), var(--accent-gold));
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .progress-text {
                text-align: center;
                color: var(--text-secondary);
                font-size: 0.9rem;
            }
            
            .model-stats {
                margin-top: 1.5rem;
                padding: 1.5rem;
                background: rgba(0, 213, 99, 0.05);
                border: 1px solid rgba(0, 213, 99, 0.2);
                border-radius: 12px;
            }
            
            .model-stats h4 {
                margin: 0 0 1rem 0;
                color: var(--success-green);
                font-size: 1rem;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
            }
            
            .stat-item-ml {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .stat-label-ml {
                font-size: 0.8rem;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .stat-value-ml {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--text-primary);
            }
            
            .prediction-results {
                margin-top: 1.5rem;
            }
            
            .prediction-header {
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 1rem;
                text-align: center;
            }
            
            .prediction-header strong {
                color: var(--primary-red);
                font-size: 1.1rem;
            }
            
            .prediction-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .prediction-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                transition: all 0.3s ease;
            }
            
            .prediction-item:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: var(--primary-red);
                transform: translateX(4px);
            }
            
            .prediction-position {
                font-size: 2rem;
                font-weight: 900;
                color: var(--accent-gold);
                min-width: 50px;
                text-align: center;
            }
            
            .prediction-driver {
                flex: 1;
            }
            
            .prediction-driver-name {
                font-weight: 700;
                font-size: 1.1rem;
                color: var(--text-primary);
                margin-bottom: 0.25rem;
            }
            
            .prediction-team {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }
            
            .prediction-confidence {
                text-align: right;
                min-width: 80px;
            }
            
            .confidence-value {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--success-green);
            }
            
            .confidence-label {
                font-size: 0.75rem;
                color: var(--text-muted);
                text-transform: uppercase;
            }
            
            .predictor-status {
                margin-top: 2rem;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                font-size: 0.95rem;
                display: none;
            }
            
            .predictor-status.show {
                display: block;
            }
            
            .predictor-status.success {
                background: rgba(0, 213, 99, 0.1);
                border: 1px solid var(--success-green);
                color: var(--success-green);
            }
            
            .predictor-status.error {
                background: rgba(255, 68, 68, 0.1);
                border: 1px solid var(--error-red);
                color: var(--error-red);
            }
            
            .predictor-status.info {
                background: rgba(255, 215, 0, 0.1);
                border: 1px solid var(--accent-gold);
                color: var(--accent-gold);
            }
            
            @media (max-width: 1200px) {
                .predictor-container {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    populateCircuitSelect() {
        const select = document.getElementById('circuit-select');
        if (!select) return;
        
        const circuits = this.dataGenerator.getCircuits();
        circuits.forEach(circuit => {
            const option = document.createElement('option');
            option.value = circuit.name;
            option.textContent = circuit.name;
            select.appendChild(option);
        });
    }

    attachEventListeners() {
        const predictBtn = document.getElementById('predict-btn');
        
        if (predictBtn) {
            predictBtn.addEventListener('click', () => this.predictRace());
        }
    }

    async autoTrainModel() {
        if (this.isTraining) return;
        
        this.isTraining = true;
        this.updateStatus('🔄 Initializing AI model...', 'info');
        
        try {
            // Generate training data with default parameters
            const trainingData = this.dataGenerator.generateHistoricalData(100);
            this.pipeline.addHistoricalData(trainingData);
            
            // Train with default configuration
            const result = await this.pipeline.train(trainingData);
            
            // Save model for future use
            this.pipeline.saveModel();
            
            this.updateStatus('✅ AI Model Ready - Make your predictions!', 'success');
            this.enablePrediction();
            
        } catch (error) {
            console.error('Auto-training error:', error);
            this.updateStatus(`❌ Model initialization failed: ${error.message}`, 'error');
        } finally {
            this.isTraining = false;
        }
    }

    predictRace() {
        const circuit = document.getElementById('circuit-select').value;
        const weather = document.getElementById('weather-select').value;
        
        if (!circuit) {
            this.updateStatus('⚠️ Please select a circuit', 'error');
            return;
        }
        
        if (!this.pipeline.isTrained) {
            this.updateStatus('⚠️ AI model is still initializing, please wait...', 'info');
            return;
        }
        
        try {
            const raceData = this.dataGenerator.generateUpcomingRace(circuit);
            
            raceData.forEach(d => {
                d.weather = weather;
                d.weather_factor = weather === 'dry' ? 1.0 : (weather === 'wet' ? 0.7 : 0.85);
            });
            
            const predictions = this.pipeline.predictRace(raceData, { weather, circuit });
            
            this.displayPredictions(predictions, circuit, weather);
            this.updateStatus('✅ Prediction complete!', 'success');
            
        } catch (error) {
            console.error('Prediction error:', error);
            this.updateStatus(`❌ Prediction failed: ${error.message}`, 'error');
        }
    }

    displayPredictions(predictions, circuit, weather) {
        const resultsContainer = document.getElementById('prediction-results');
        
        const weatherEmoji = weather === 'dry' ? '☀️' : (weather === 'wet' ? '🌧️' : '⛅');
        
        let html = `
            <div class="prediction-header">
                <strong>📍 ${circuit}</strong><br>
                <span style="color: var(--text-secondary);">${weatherEmoji} ${weather.charAt(0).toUpperCase() + weather.slice(1)} conditions</span>
            </div>
            <div class="prediction-list">
        `;
        
        predictions.forEach((pred, index) => {
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : pred.predictedPosition));
            
            html += `
                <div class="prediction-item">
                    <div class="prediction-position">${medal}</div>
                    <div class="prediction-driver">
                        <div class="prediction-driver-name">${pred.driver}</div>
                        <div class="prediction-team">${pred.team}</div>
                    </div>
                    <div class="prediction-confidence">
                        <div class="confidence-value">${pred.confidence.toFixed(0)}%</div>
                        <div class="confidence-label">confidence</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        resultsContainer.innerHTML = html;
    }

    enablePrediction() {
        const predictBtn = document.getElementById('predict-btn');
        if (predictBtn) {
            predictBtn.disabled = false;
        }
    }



    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('predictor-status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `predictor-status ${type} show`;
        
        setTimeout(() => {
            statusEl.classList.remove('show');
        }, 5000);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const mlUI = new MLPredictionUI();
        mlUI.init();
    });
} else {
    const mlUI = new MLPredictionUI();
    mlUI.init();
}

export default MLPredictionUI;
