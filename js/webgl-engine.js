/**
 * WebGL Engine Module
 * Manages 3D rendering, scenes, cameras, and WebGL contexts
 */

export class WebGLEngine {
    constructor(options = {}) {
        this.canvas = options.canvas || this.createCanvas();
        this.scenes = new Map();
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.isInitialized = false;
        this.deviceCapabilities = this.detectCapabilities();
    }

    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'webgl-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        `;
        return canvas;
    }

    detectCapabilities() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!gl) {
            return { webgl: false, quality: 'none' };
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
        
        // Detect device type and capabilities
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        let quality = 'high';
        if (isMobile || maxTextureSize < 4096) {
            quality = 'low';
        } else if (maxTextureSize < 8192) {
            quality = 'medium';
        }

        return {
            webgl: true,
            webgl2: !!canvas.getContext('webgl2'),
            quality,
            isMobile,
            renderer,
            maxTextureSize
        };
    }

    init() {
        if (this.isInitialized) return true;

        if (!this.deviceCapabilities.webgl) {
            console.warn('WebGL not supported, falling back to CSS animations');
            return false;
        }

        try {
            // Create renderer with appropriate settings
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: this.deviceCapabilities.quality !== 'low',
                powerPreference: this.deviceCapabilities.isMobile ? 'low-power' : 'high-performance'
            });

            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for performance
            
            // Enable shadows only on high quality
            if (this.deviceCapabilities.quality === 'high') {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }

            // Add canvas to DOM if not already present
            if (!this.canvas.parentElement) {
                document.body.appendChild(this.canvas);
            }

            // Handle resize
            window.addEventListener('resize', () => this.resize());

            // Handle context loss
            this.canvas.addEventListener('webglcontextlost', (e) => this.handleContextLost(e));
            this.canvas.addEventListener('webglcontextrestored', () => this.handleContextRestored());

            this.isInitialized = true;
            console.log('✅ WebGL Engine initialized', this.deviceCapabilities);
            return true;

        } catch (error) {
            console.error('Failed to initialize WebGL:', error);
            return false;
        }
    }

    createScene(name, config = {}) {
        const scene = new Scene3D(name, config, this.renderer, this.deviceCapabilities);
        this.scenes.set(name, scene);
        return scene;
    }

    getScene(name) {
        return this.scenes.get(name);
    }

    render() {
        if (!this.isInitialized) return;

        const deltaTime = this.clock.getDelta();

        // Update and render all scenes
        this.scenes.forEach(scene => {
            if (scene.active) {
                scene.update(deltaTime);
                this.renderer.render(scene.scene, scene.camera);
            }
        });
    }

    resize() {
        if (!this.isInitialized) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.renderer.setSize(width, height);
        
        this.scenes.forEach(scene => {
            if (scene.camera.isPerspectiveCamera) {
                scene.camera.aspect = width / height;
                scene.camera.updateProjectionMatrix();
            }
        });
    }

    handleContextLost(event) {
        event.preventDefault();
        console.warn('WebGL context lost. Pausing rendering...');
        this.isInitialized = false;
    }

    handleContextRestored() {
        console.log('WebGL context restored. Reinitializing...');
        this.init();
    }

    dispose() {
        this.scenes.forEach(scene => scene.dispose());
        this.scenes.clear();
        
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        this.isInitialized = false;
    }
}

export class Scene3D {
    constructor(name, config, renderer, capabilities) {
        this.name = name;
        this.scene = new THREE.Scene();
        this.renderer = renderer;
        this.capabilities = capabilities;
        this.active = true;
        this.objects = [];

        // Create camera
        const cameraConfig = config.camera || {};
        this.camera = this.createCamera(cameraConfig);

        // Set background
        if (config.background) {
            this.setBackground(config.background);
        }

        // Add lights
        if (config.lights) {
            config.lights.forEach(lightConfig => this.addLight(lightConfig));
        }
    }

    createCamera(config) {
        const {
            type = 'PerspectiveCamera',
            fov = 75,
            near = 0.1,
            far = 1000,
            position = { x: 0, y: 0, z: 5 }
        } = config;

        let camera;
        if (type === 'PerspectiveCamera') {
            camera = new THREE.PerspectiveCamera(
                fov,
                window.innerWidth / window.innerHeight,
                near,
                far
            );
        } else {
            camera = new THREE.OrthographicCamera(
                window.innerWidth / -2,
                window.innerWidth / 2,
                window.innerHeight / 2,
                window.innerHeight / -2,
                near,
                far
            );
        }

        camera.position.set(position.x, position.y, position.z);
        return camera;
    }

    addLight(config) {
        let light;
        
        switch (config.type) {
            case 'DirectionalLight':
                light = new THREE.DirectionalLight(config.color, config.intensity);
                if (config.castShadow && this.capabilities.quality === 'high') {
                    light.castShadow = true;
                    light.shadow.mapSize.width = 1024;
                    light.shadow.mapSize.height = 1024;
                }
                break;
            
            case 'AmbientLight':
                light = new THREE.AmbientLight(config.color, config.intensity);
                break;
            
            case 'PointLight':
                light = new THREE.PointLight(config.color, config.intensity, config.distance || 0);
                break;
            
            case 'SpotLight':
                light = new THREE.SpotLight(config.color, config.intensity);
                break;
            
            default:
                console.warn(`Unknown light type: ${config.type}`);
                return;
        }

        if (config.position) {
            light.position.set(config.position.x, config.position.y, config.position.z);
        }

        this.scene.add(light);
        return light;
    }

    add(object) {
        this.scene.add(object);
        this.objects.push(object);
        return object;
    }

    remove(object) {
        this.scene.remove(object);
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    setBackground(config) {
        if (typeof config === 'number') {
            this.scene.background = new THREE.Color(config);
        } else if (config.type === 'color') {
            this.scene.background = new THREE.Color(config.color);
        } else if (config.type === 'gradient') {
            // Gradient backgrounds would use a shader
            console.log('Gradient background - implement with shader');
        }
    }

    update(deltaTime) {
        // Update all objects that have an update method
        this.objects.forEach(obj => {
            if (obj.update && typeof obj.update === 'function') {
                obj.update(deltaTime);
            }
        });
    }

    dispose() {
        this.objects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.objects = [];
    }
}

export class MaterialLibrary {
    constructor(capabilities) {
        this.capabilities = capabilities;
        this.cache = new Map();
    }

    createCarMaterial(teamColor) {
        const key = `car-${teamColor}`;
        if (this.cache.has(key)) {
            return this.cache.get(key).clone();
        }

        const material = new THREE.MeshStandardMaterial({
            color: teamColor,
            metalness: 0.8,
            roughness: 0.2,
            envMapIntensity: 1.0
        });

        this.cache.set(key, material);
        return material.clone();
    }

    createTrackMaterial() {
        if (this.cache.has('track')) {
            return this.cache.get('track').clone();
        }

        const material = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1
        });

        this.cache.set('track', material);
        return material.clone();
    }

    createHolographicMaterial(color = 0x00d2be) {
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        return material;
    }

    createGlassMaterial() {
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            transmission: 0.9,
            transparent: true,
            opacity: 0.5
        });

        return material;
    }

    dispose() {
        this.cache.forEach(material => material.dispose());
        this.cache.clear();
    }
}
