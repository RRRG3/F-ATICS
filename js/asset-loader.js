/**
 * Asset Loader Module
 * Efficiently loads and manages all media assets with progressive loading and caching
 */

export class AssetLoader {
    constructor() {
        this.cache = new Map();
        this.loading = new Map();
        this.progress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.callbacks = [];
    }

    async loadImage(url, options = {}) {
        // Check cache first
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        // Check if already loading
        if (this.loading.has(url)) {
            return this.loading.get(url);
        }

        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            const img = new Image();
            
            if (options.crossOrigin) {
                img.crossOrigin = options.crossOrigin;
            }

            img.onload = () => {
                this.cache.set(url, img);
                this.loading.delete(url);
                this.updateProgress();
                resolve(img);
            };

            img.onerror = () => {
                this.loading.delete(url);
                
                // Try fallback if provided
                if (options.fallback) {
                    console.warn(`Failed to load ${url}, trying fallback`);
                    this.loadImage(options.fallback).then(resolve).catch(reject);
                } else {
                    reject(new Error(`Failed to load image: ${url}`));
                }
            };

            img.src = url;
        });

        this.loading.set(url, loadPromise);
        this.totalAssets++;
        
        return loadPromise;
    }

    async loadVideo(url, options = {}) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            
            video.preload = options.preload || 'metadata';
            video.muted = options.muted !== false;
            video.loop = options.loop || false;
            video.playsInline = true;

            video.addEventListener('loadedmetadata', () => {
                this.cache.set(url, video);
                this.updateProgress();
                resolve(video);
            });

            video.addEventListener('error', () => {
                reject(new Error(`Failed to load video: ${url}`));
            });

            video.src = url;
        });
    }

    async load3DModel(url, format = 'gltf') {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        if (!window.THREE) {
            throw new Error('THREE.js not loaded');
        }

        return new Promise((resolve, reject) => {
            let loader;

            switch (format.toLowerCase()) {
                case 'gltf':
                case 'glb':
                    loader = new THREE.GLTFLoader();
                    break;
                case 'fbx':
                    loader = new THREE.FBXLoader();
                    break;
                default:
                    reject(new Error(`Unsupported format: ${format}`));
                    return;
            }

            loader.load(
                url,
                (model) => {
                    this.cache.set(url, model);
                    this.updateProgress();
                    resolve(model);
                },
                (progress) => {
                    // Progress callback
                    if (progress.lengthComputable) {
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        console.log(`Loading ${url}: ${percentComplete.toFixed(2)}%`);
                    }
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    async loadTexture(url, options = {}) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        if (!window.THREE) {
            throw new Error('THREE.js not loaded');
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            
            loader.load(
                url,
                (texture) => {
                    // Apply options
                    if (options.wrapS) texture.wrapS = options.wrapS;
                    if (options.wrapT) texture.wrapT = options.wrapT;
                    if (options.repeat) texture.repeat.set(options.repeat.x, options.repeat.y);
                    
                    this.cache.set(url, texture);
                    this.updateProgress();
                    resolve(texture);
                },
                undefined,
                (error) => {
                    reject(error);
                }
            );
        });
    }

    async preloadCritical(assets) {
        console.log(`Preloading ${assets.length} critical assets...`);
        
        const promises = assets.map(asset => {
            switch (asset.type) {
                case 'image':
                    return this.loadImage(asset.url, asset.options);
                case 'video':
                    return this.loadVideo(asset.url, asset.options);
                case 'model':
                    return this.load3DModel(asset.url, asset.format);
                case 'texture':
                    return this.loadTexture(asset.url, asset.options);
                default:
                    console.warn(`Unknown asset type: ${asset.type}`);
                    return Promise.resolve();
            }
        });

        try {
            await Promise.all(promises);
            console.log('✅ All critical assets loaded');
        } catch (error) {
            console.error('Error loading critical assets:', error);
        }
    }

    getProgress() {
        if (this.totalAssets === 0) return 100;
        return (this.loadedAssets / this.totalAssets) * 100;
    }

    updateProgress() {
        this.loadedAssets++;
        this.progress = this.getProgress();
        
        // Notify callbacks
        this.callbacks.forEach(callback => callback(this.progress));
    }

    onProgress(callback) {
        this.callbacks.push(callback);
    }

    dispose() {
        // Clear cache
        this.cache.forEach((asset, url) => {
            if (asset instanceof HTMLImageElement || asset instanceof HTMLVideoElement) {
                asset.src = '';
            } else if (asset.dispose) {
                asset.dispose();
            }
        });
        
        this.cache.clear();
        this.loading.clear();
        this.callbacks = [];
    }
}

export class ImageOptimizer {
    constructor() {
        this.formats = this.detectSupportedFormats();
    }

    detectSupportedFormats() {
        const formats = {
            webp: false,
            avif: false
        };

        // Check WebP support
        const webpCanvas = document.createElement('canvas');
        if (webpCanvas.getContext && webpCanvas.getContext('2d')) {
            formats.webp = webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        }

        // Check AVIF support (basic check)
        const avifImage = new Image();
        avifImage.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
        avifImage.onload = () => { formats.avif = true; };

        return formats;
    }

    selectOptimalFormat(baseUrl) {
        if (this.formats.avif) {
            return baseUrl.replace(/\.(jpg|jpeg|png)$/i, '.avif');
        } else if (this.formats.webp) {
            return baseUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
        return baseUrl;
    }

    generateSrcSet(baseUrl, sizes) {
        return sizes.map(size => {
            const url = baseUrl.replace(/(\.[^.]+)$/, `-${size}w$1`);
            return `${this.selectOptimalFormat(url)} ${size}w`;
        }).join(', ');
    }

    createPlaceholder(width, height, color = '#1a1a1a') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        
        return canvas.toDataURL();
    }

    lazyLoad(images) {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        const srcset = img.dataset.srcset;
                        
                        if (src) {
                            img.src = src;
                        }
                        if (srcset) {
                            img.srcset = srcset;
                        }
                        
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback: load all images immediately
            images.forEach(img => {
                if (img.dataset.src) img.src = img.dataset.src;
                if (img.dataset.srcset) img.srcset = img.dataset.srcset;
            });
        }
    }
}

export class ModelLoader {
    constructor() {
        this.cache = new Map();
    }

    async loadGLTF(url, options = {}) {
        if (this.cache.has(url)) {
            return this.cache.get(url).clone();
        }

        if (!window.THREE || !window.THREE.GLTFLoader) {
            throw new Error('GLTFLoader not available');
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            
            // Add Draco loader if available
            if (window.THREE.DRACOLoader && options.dracoPath) {
                const dracoLoader = new THREE.DRACOLoader();
                dracoLoader.setDecoderPath(options.dracoPath);
                loader.setDRACOLoader(dracoLoader);
            }

            loader.load(
                url,
                (gltf) => {
                    this.cache.set(url, gltf.scene);
                    resolve(gltf.scene);
                },
                undefined,
                reject
            );
        });
    }

    optimizeGeometry(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Merge vertices
                if (child.geometry.attributes.position) {
                    child.geometry = child.geometry.toNonIndexed();
                }
                
                // Compute vertex normals if missing
                if (!child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }
            }
        });

        return model;
    }

    generateLODs(model, levels = [1, 0.5, 0.25]) {
        const lods = [];
        
        levels.forEach((level, index) => {
            const lod = model.clone();
            
            lod.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    // Simplify geometry based on level
                    // This is a placeholder - actual implementation would use
                    // a geometry simplification algorithm
                    child.geometry.scale(level, level, level);
                }
            });
            
            lods.push({ distance: index * 50, model: lod });
        });

        return lods;
    }
}
