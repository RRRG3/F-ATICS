/**
 * Performance Monitor Module
 * Tracks and optimizes rendering performance in real-time
 */

export class PerformanceMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.sampleSize = options.sampleSize || 60;
        this.targetFPS = options.targetFPS || 60;
        
        this.frames = [];
        this.lastFrameTime = performance.now();
        this.fps = 60;
        this.frameTime = 16.67;
        
        this.metrics = {
            fps: [],
            frameTime: [],
            memory: []
        };

        this.thresholds = {
            high: { fps: 60, particles: 200, shadows: true, postProcessing: true },
            medium: { fps: 45, particles: 100, shadows: true, postProcessing: false },
            low: { fps: 30, particles: 50, shadows: false, postProcessing: false }
        };

        this.currentQuality = 'high';
        this.adaptiveQuality = null;
    }

    startFrame() {
        this.frameStartTime = performance.now();
    }

    endFrame() {
        if (!this.enabled) return;

        const now = performance.now();
        const frameTime = now - this.frameStartTime;
        const fps = 1000 / (now - this.lastFrameTime);

        this.frames.push({ time: now, frameTime, fps });
        
        // Keep only recent samples
        if (this.frames.length > this.sampleSize) {
            this.frames.shift();
        }

        // Calculate averages
        if (this.frames.length > 0) {
            this.fps = this.frames.reduce((sum, f) => sum + f.fps, 0) / this.frames.length;
            this.frameTime = this.frames.reduce((sum, f) => sum + f.frameTime, 0) / this.frames.length;
        }

        this.lastFrameTime = now;

        // Store metrics
        this.metrics.fps.push(this.fps);
        this.metrics.frameTime.push(this.frameTime);

        // Limit metrics history
        const maxHistory = 300; // 5 seconds at 60fps
        if (this.metrics.fps.length > maxHistory) {
            this.metrics.fps.shift();
            this.metrics.frameTime.shift();
        }

        // Check for performance issues
        this.checkPerformance();
    }

    getFPS() {
        return Math.round(this.fps);
    }

    getFrameTime() {
        return this.frameTime.toFixed(2);
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
                total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
                limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2),
                percentage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1)
            };
        }
        return null;
    }

    checkPerformance() {
        // Check if FPS is consistently low
        if (this.frames.length >= this.sampleSize) {
            const avgFPS = this.fps;
            
            if (avgFPS < 30 && this.currentQuality !== 'low') {
                this.triggerQualityReduction('low');
            } else if (avgFPS < 45 && this.currentQuality === 'high') {
                this.triggerQualityReduction('medium');
            } else if (avgFPS > 55 && this.currentQuality === 'low') {
                this.triggerQualityIncrease('medium');
            } else if (avgFPS > 58 && this.currentQuality === 'medium') {
                this.triggerQualityIncrease('high');
            }
        }

        // Check memory usage
        const memory = this.getMemoryUsage();
        if (memory && parseFloat(memory.percentage) > 80) {
            console.warn('High memory usage detected:', memory);
            this.triggerMemoryCleanup();
        }
    }

    triggerQualityReduction(newQuality) {
        if (this.currentQuality === newQuality) return;
        
        console.log(`🔽 Reducing quality: ${this.currentQuality} → ${newQuality}`);
        this.currentQuality = newQuality;
        
        if (this.adaptiveQuality) {
            this.adaptiveQuality.adjustQuality(newQuality);
        }

        this.showNotification(`Performance mode: ${newQuality}`);
    }

    triggerQualityIncrease(newQuality) {
        if (this.currentQuality === newQuality) return;
        
        console.log(`🔼 Increasing quality: ${this.currentQuality} → ${newQuality}`);
        this.currentQuality = newQuality;
        
        if (this.adaptiveQuality) {
            this.adaptiveQuality.adjustQuality(newQuality);
        }
    }

    triggerMemoryCleanup() {
        console.log('🧹 Triggering memory cleanup...');
        // Dispatch event for other systems to clean up
        window.dispatchEvent(new CustomEvent('performance:cleanup'));
    }

    enableAdaptiveQuality(adaptiveQualityInstance) {
        this.adaptiveQuality = adaptiveQualityInstance;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = `⚡ ${message}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(225, 6, 0, 0.9);
            color: white;
            padding: 0.75rem 1.25rem;
            border-radius: 8px;
            font-size: 0.875rem;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    reportMetrics() {
        return {
            timestamp: Date.now(),
            fps: this.getFPS(),
            frameTime: this.getFrameTime(),
            memory: this.getMemoryUsage(),
            quality: this.currentQuality,
            deviceType: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            userAgent: navigator.userAgent
        };
    }

    exportMetrics() {
        return {
            summary: this.reportMetrics(),
            history: {
                fps: this.metrics.fps.slice(-60), // Last 60 frames
                frameTime: this.metrics.frameTime.slice(-60)
            }
        };
    }

    // Create visual FPS counter for development
    createFPSDisplay() {
        const display = document.createElement('div');
        display.id = 'fps-display';
        display.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            padding: 10px;
            font-family: monospace;
            font-size: 14px;
            border-radius: 4px;
            z-index: 10000;
            min-width: 150px;
        `;
        document.body.appendChild(display);

        setInterval(() => {
            const memory = this.getMemoryUsage();
            const memoryText = memory ? `\nMem: ${memory.used}MB (${memory.percentage}%)` : '';
            
            display.innerHTML = `
                FPS: ${this.getFPS()}
                Frame: ${this.getFrameTime()}ms
                Quality: ${this.currentQuality}${memoryText}
            `.trim();

            // Color code based on FPS
            if (this.fps >= 55) {
                display.style.color = '#0f0'; // Green
            } else if (this.fps >= 30) {
                display.style.color = '#ff0'; // Yellow
            } else {
                display.style.color = '#f00'; // Red
            }
        }, 100);

        return display;
    }
}

export class AdaptiveQuality {
    constructor(performanceMonitor, options = {}) {
        this.monitor = performanceMonitor;
        this.callbacks = {
            onQualityChange: options.onQualityChange || (() => {}),
            onParticleReduce: options.onParticleReduce || (() => {}),
            onShadowToggle: options.onShadowToggle || (() => {})
        };

        this.monitor.enableAdaptiveQuality(this);
    }

    adjustQuality(quality) {
        const settings = this.monitor.thresholds[quality];
        
        // Notify all systems of quality change
        this.callbacks.onQualityChange(quality, settings);

        // Adjust specific features
        if (settings.particles !== undefined) {
            this.callbacks.onParticleReduce(settings.particles);
        }

        if (settings.shadows !== undefined) {
            this.callbacks.onShadowToggle(settings.shadows);
        }

        // Dispatch global event
        window.dispatchEvent(new CustomEvent('quality:change', {
            detail: { quality, settings }
        }));
    }

    reduceParticles(maxCount) {
        console.log(`Reducing particles to ${maxCount}`);
        window.dispatchEvent(new CustomEvent('particles:reduce', {
            detail: { maxCount }
        }));
    }

    simplifyShaders() {
        console.log('Switching to simplified shaders');
        window.dispatchEvent(new CustomEvent('shaders:simplify'));
    }

    reduceShadowQuality() {
        console.log('Reducing shadow quality');
        window.dispatchEvent(new CustomEvent('shadows:reduce'));
    }
}

export class MetricsCollector {
    constructor() {
        this.metrics = {
            loadTime: null,
            interactionLatency: [],
            scrollPerformance: []
        };

        this.init();
    }

    init() {
        // Track page load time
        if (performance.timing) {
            window.addEventListener('load', () => {
                // Ensure loadEventEnd is fully populated before calculating
                setTimeout(() => {
                    const loadTime = performance.timing.loadEventEnd > 0 
                        ? performance.timing.loadEventEnd - performance.timing.navigationStart
                        : performance.now();
                    this.metrics.loadTime = loadTime;
                    // console.log(`📊 Page load time: ${loadTime}ms`);
                }, 0);
            });
        }

        // Track interaction latency
        ['click', 'touchstart'].forEach(event => {
            document.addEventListener(event, (e) => {
                const start = performance.now();
                requestAnimationFrame(() => {
                    const latency = performance.now() - start;
                    this.metrics.interactionLatency.push(latency);
                    
                    // Keep only recent samples
                    if (this.metrics.interactionLatency.length > 100) {
                        this.metrics.interactionLatency.shift();
                    }
                });
            });
        });

        // Track scroll performance
        let lastScrollTime = performance.now();
        let scrollFrames = [];
        
        window.addEventListener('scroll', () => {
            const now = performance.now();
            const delta = now - lastScrollTime;
            scrollFrames.push(delta);
            
            if (scrollFrames.length > 60) {
                const avgDelta = scrollFrames.reduce((a, b) => a + b) / scrollFrames.length;
                const scrollFPS = 1000 / avgDelta;
                this.metrics.scrollPerformance.push(scrollFPS);
                scrollFrames = [];
            }
            
            lastScrollTime = now;
        });
    }

    trackLoadTime() {
        return this.metrics.loadTime;
    }

    trackInteractionLatency() {
        if (this.metrics.interactionLatency.length === 0) return 0;
        return this.metrics.interactionLatency.reduce((a, b) => a + b) / this.metrics.interactionLatency.length;
    }

    trackScrollPerformance() {
        if (this.metrics.scrollPerformance.length === 0) return 60;
        return this.metrics.scrollPerformance.reduce((a, b) => a + b) / this.metrics.scrollPerformance.length;
    }

    exportMetrics() {
        return {
            loadTime: this.trackLoadTime(),
            avgInteractionLatency: this.trackInteractionLatency().toFixed(2),
            avgScrollFPS: this.trackScrollPerformance().toFixed(2),
            timestamp: Date.now()
        };
    }
}
