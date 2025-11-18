/**
 * Application Initialization
 * Main entry point that initializes all systems with progressive enhancement
 */

import { WebGLEngine, MaterialLibrary } from './webgl-engine.js';
import { PerformanceMonitor, AdaptiveQuality, MetricsCollector } from './performance-monitor.js';
import { AnimationController, ScrollAnimationManager, TimelineManager } from './animation-controller.js';
import { AssetLoader, ImageOptimizer } from './asset-loader.js';

class F1FanZoneApp {
    constructor() {
        this.webglEngine = null;
        this.performanceMonitor = null;
        this.animationController = null;
        this.assetLoader = null;
        
        this.isWebGLSupported = false;
        this.isInitialized = false;
        
        // Feature detection
        this.features = {
            webgl: this.detectWebGL(),
            reducedMotion: this.detectReducedMotion(),
            touchDevice: this.detectTouchDevice(),
            connectionSpeed: this.detectConnectionSpeed()
        };
    }

    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    detectReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    detectTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    detectConnectionSpeed() {
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                const effectiveType = connection.effectiveType;
                return effectiveType; // '4g', '3g', '2g', 'slow-2g'
            }
        }
        return 'unknown';
    }

    async init() {
        console.log('🏎️ Initializing F1 Fan Zone...');
        console.log('Features:', this.features);

        // Initialize core systems
        this.performanceMonitor = new PerformanceMonitor({
            enabled: true,
            targetFPS: 60
        });

        this.assetLoader = new AssetLoader();
        this.animationController = new AnimationController();

        // Progressive enhancement based on capabilities
        if (this.features.webgl && !this.features.reducedMotion) {
            await this.initWebGL();
        } else {
            this.initFallbackExperience();
        }

        // Initialize animations (works with or without WebGL)
        this.initAnimations();

        // Set up adaptive quality
        this.setupAdaptiveQuality();

        // Initialize metrics collection
        this.metricsCollector = new MetricsCollector();

        // Show FPS counter in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.performanceMonitor.createFPSDisplay();
        }

        // Start render loop
        this.startRenderLoop();

        this.isInitialized = true;
        console.log('✅ F1 Fan Zone initialized successfully');

        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('app:ready', {
            detail: { features: this.features }
        }));
    }

    async initWebGL() {
        console.log('Initializing WebGL...');
        
        this.webglEngine = new WebGLEngine();
        this.isWebGLSupported = this.webglEngine.init();

        if (this.isWebGLSupported) {
            // Create material library
            this.materialLibrary = new MaterialLibrary(this.webglEngine.deviceCapabilities);
            
            // Initialize scenes based on quality
            this.initScenes();
            
            console.log('✅ WebGL initialized');
        } else {
            console.warn('WebGL initialization failed, using fallback');
            this.initFallbackExperience();
        }
    }

    initScenes() {
        // Create hero scene
        const heroScene = this.webglEngine.createScene('hero', {
            camera: {
                type: 'PerspectiveCamera',
                fov: 75,
                position: { x: 0, y: 0, z: 5 }
            },
            lights: [
                {
                    type: 'DirectionalLight',
                    color: 0xffffff,
                    intensity: 1,
                    position: { x: 5, y: 5, z: 5 }
                },
                {
                    type: 'AmbientLight',
                    color: 0x404040,
                    intensity: 0.5
                }
            ],
            background: {
                type: 'color',
                color: 0x000000
            }
        });

        // Add example geometry (can be replaced with actual 3D models)
        if (this.webglEngine.deviceCapabilities.quality !== 'low') {
            this.addExampleGeometry(heroScene);
        }
    }

    addExampleGeometry(scene) {
        // Example: Add a rotating cube
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = this.materialLibrary.createCarMaterial(0xe10600);
        const cube = new THREE.Mesh(geometry, material);
        
        // Add update method for animation
        cube.update = (deltaTime) => {
            cube.rotation.x += deltaTime * 0.5;
            cube.rotation.y += deltaTime * 0.3;
        };
        
        scene.add(cube);
    }

    initFallbackExperience() {
        console.log('Using CSS-only fallback experience');
        
        // Add class to body for CSS targeting
        document.body.classList.add('no-webgl');
        
        // Enhance with CSS animations
        this.enhanceWithCSS();
    }

    enhanceWithCSS() {
        // Add CSS animations for cards, sections, etc.
        const style = document.createElement('style');
        style.textContent = `
            .no-webgl .team-card,
            .no-webgl .circuit-card,
            .no-webgl .calendar-card {
                animation: fadeInUp 0.6s ease-out backwards;
            }
            
            .no-webgl .team-card:nth-child(1) { animation-delay: 0.1s; }
            .no-webgl .team-card:nth-child(2) { animation-delay: 0.2s; }
            .no-webgl .team-card:nth-child(3) { animation-delay: 0.3s; }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    initAnimations() {
        if (this.features.reducedMotion) {
            console.log('Reduced motion detected, disabling animations');
            return;
        }

        this.animationController.init();

        // Set up scroll animations
        const scrollManager = new ScrollAnimationManager(this.animationController);
        
        // Animate sections on scroll
        document.querySelectorAll('.section').forEach((section, index) => {
            scrollManager.createReveal(section, 'up');
        });

        // Animate cards
        document.querySelectorAll('.team-card, .circuit-card, .calendar-card').forEach((card, index) => {
            scrollManager.createReveal(card, 'up');
        });

        // Add parallax to hero if not on mobile
        if (!this.features.touchDevice) {
            const heroContent = document.querySelector('.hero-content');
            if (heroContent) {
                scrollManager.createParallax(heroContent, 0.3);
            }
        }
    }

    setupAdaptiveQuality() {
        const adaptiveQuality = new AdaptiveQuality(this.performanceMonitor, {
            onQualityChange: (quality, settings) => {
                console.log(`Quality changed to: ${quality}`, settings);
                
                // Adjust WebGL settings if available
                if (this.webglEngine && this.webglEngine.isInitialized) {
                    this.adjustWebGLQuality(quality, settings);
                }
            },
            onParticleReduce: (maxCount) => {
                // Reduce particle count
                window.dispatchEvent(new CustomEvent('particles:setmax', {
                    detail: { maxCount }
                }));
            }
        });
    }

    adjustWebGLQuality(quality, settings) {
        // Adjust renderer settings
        if (this.webglEngine.renderer) {
            const pixelRatio = quality === 'low' ? 1 : Math.min(window.devicePixelRatio, 2);
            this.webglEngine.renderer.setPixelRatio(pixelRatio);
            
            // Toggle shadows
            this.webglEngine.renderer.shadowMap.enabled = settings.shadows;
        }

        // Adjust scene complexity
        this.webglEngine.scenes.forEach(scene => {
            if (quality === 'low') {
                // Reduce scene complexity
                scene.active = false;
            } else {
                scene.active = true;
            }
        });
    }

    startRenderLoop() {
        const render = () => {
            this.performanceMonitor.startFrame();

            // Render WebGL if available
            if (this.webglEngine && this.webglEngine.isInitialized) {
                this.webglEngine.render();
            }

            this.performanceMonitor.endFrame();
            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
    }

    // Public API
    getMetrics() {
        return {
            performance: this.performanceMonitor.reportMetrics(),
            collector: this.metricsCollector.exportMetrics()
        };
    }

    dispose() {
        if (this.webglEngine) {
            this.webglEngine.dispose();
        }
        if (this.animationController) {
            this.animationController.dispose();
        }
        if (this.assetLoader) {
            this.assetLoader.dispose();
        }
    }
}

// Initialize app when DOM is ready
let app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new F1FanZoneApp();
        app.init();
    });
} else {
    app = new F1FanZoneApp();
    app.init();
}

// Export for global access
window.F1App = app;

export default F1FanZoneApp;
