/**
 * F-ATICS High-Fidelity 3D Car Viewer
 * Replaces the old SVG generator with a true WebGL 3D procedural F1 Car using Three.js.
 * Built with realistic PBR materials, shadows, and interactive rotation.
 */

(function () {
    'use strict';
  
    // Map to keep track of active viewers so we can handle resize and cleanup
    const viewers = new Map();
  
    // Helper to blend colors
    function lightenDarkenColor(col, amt) {
        let usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }
        let num = parseInt(col, 16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
  
    /**
     * Builds a stylized 3D F1 car group using Three.js primitives
     */
    function buildF1Car(teamColorHex) {
        const carGroup = new THREE.Group();
        
        // --- Materials ---
        const paintMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(teamColorHex),
            metalness: 0.6,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
  
        const carbonMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            metalness: 0.4,
            roughness: 0.8,
            clearcoat: 0.5,
            clearcoatRoughness: 0.4
        });
  
        const tireMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });
  
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.5,
            metalness: 0.8
        });
  
        const whiteDecalMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.1
        });
  
        // --- Geometry Builders ---
        const addMesh = (geom, mat, x, y, z, castShadow=true) => {
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(x, y, z);
            mesh.castShadow = castShadow;
            mesh.receiveShadow = true;
            carGroup.add(mesh);
            return mesh;
        };
  
        // 1. Main Chassis / Monocoque
        const chassisGeom = new THREE.BoxGeometry(0.6, 0.4, 3.5);
        const chassis = addMesh(chassisGeom, paintMaterial, 0, 0.3, 0.2);
        
        // Tapered nose
        const noseGeom = new THREE.CylinderGeometry(0.15, 0.3, 1.5, 4, 1, false, Math.PI/4);
        noseGeom.rotateX(Math.PI / 2);
        noseGeom.scale(1, 0.5, 1);
        addMesh(noseGeom, paintMaterial, 0, 0.25, -2.1);
  
        // 2. Sidepods
        const sidepodGeom = new THREE.BoxGeometry(1.6, 0.45, 1.8);
        const sidepod = addMesh(sidepodGeom, paintMaterial, 0, 0.32, 0.5);
        // angled sidepod intakes
        const intakeGeom = new THREE.BoxGeometry(1.5, 0.3, 0.2);
        addMesh(intakeGeom, carbonMaterial, 0, 0.3, -0.45);
        
        // 3. Engine Cover / Shark Fin
        const engineCoverGeom = new THREE.BoxGeometry(0.4, 0.6, 1.5);
        const engineCover = addMesh(engineCoverGeom, paintMaterial, 0, 0.7, 1.0);
        
        const sharkFinGeom = new THREE.BoxGeometry(0.05, 0.4, 0.8);
        addMesh(sharkFinGeom, carbonMaterial, 0, 1.1, 1.2);
  
        // 4. Airbox / Roll hoop
        const airboxGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8);
        airboxGeom.rotateX(Math.PI/2);
        addMesh(airboxGeom, carbonMaterial, 0, 0.7, 0.3);
  
        // 5. Halo
        const haloPillarGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.3);
        addMesh(haloPillarGeom, carbonMaterial, 0, 0.65, -0.2);
        
        const haloRingGeom = new THREE.TorusGeometry(0.3, 0.04, 8, 16, Math.PI);
        const haloRing = addMesh(haloRingGeom, carbonMaterial, 0, 0.75, 0.1);
        haloRing.rotation.x = Math.PI / 2 + 0.1;
  
        // 6. Front Wing
        const fWingMainGeom = new THREE.BoxGeometry(2.0, 0.05, 0.4);
        addMesh(fWingMainGeom, carbonMaterial, 0, 0.1, -2.8);
        
        const fWingFlapGeom = new THREE.BoxGeometry(1.9, 0.05, 0.2);
        const flap = addMesh(fWingFlapGeom, paintMaterial, 0, 0.15, -2.7);
        flap.rotation.x = -0.2;
        
        const endplateGeom = new THREE.BoxGeometry(0.05, 0.3, 0.6);
        addMesh(endplateGeom, paintMaterial, -1.0, 0.2, -2.8);
        addMesh(endplateGeom, paintMaterial, 1.0, 0.2, -2.8);
  
        // 7. Rear Wing
        const rWingMainGeom = new THREE.BoxGeometry(1.5, 0.08, 0.3);
        const rWing = addMesh(rWingMainGeom, paintMaterial, 0, 0.9, 2.0);
        rWing.rotation.x = 0.2;
        
        const rWingFlapGeom = new THREE.BoxGeometry(1.5, 0.05, 0.2);
        const rFlap = addMesh(rWingFlapGeom, carbonMaterial, 0, 1.05, 2.1);
        rFlap.rotation.x = 0.4;
  
        const rEndplateGeom = new THREE.BoxGeometry(0.05, 0.7, 0.6);
        addMesh(rEndplateGeom, carbonMaterial, -0.75, 0.7, 2.0);
        addMesh(rEndplateGeom, carbonMaterial, 0.75, 0.7, 2.0);
        
        // Rear wing pillar
        const rPillarGeom = new THREE.BoxGeometry(0.1, 0.6, 0.2);
        addMesh(rPillarGeom, carbonMaterial, 0, 0.6, 1.8);
  
        // 8. Tires and Wheels
        const createTire = (x, z, scale=1.0) => {
            const tireGroup = new THREE.Group();
            
            // Tire rubber
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.35 * scale, 0.35, 32), tireMaterial);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            tireGroup.add(tire);
            
            // Rim cover
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.36, 16), rimMaterial);
            rim.rotation.z = Math.PI / 2;
            tireGroup.add(rim);
            
            // Pirelli Stripe (P-Zero style)
            const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.351 * scale, 0.351 * scale, 0.05, 32), whiteDecalMaterial);
            stripe.rotation.z = Math.PI / 2;
            tireGroup.add(stripe);
  
            tireGroup.position.set(x, 0.35 * scale, z);
            carGroup.add(tireGroup);
            
            // Suspension links
            const suspGeom = new THREE.CylinderGeometry(0.02, 0.02, Math.abs(x) - 0.2);
            const susp = addMesh(suspGeom, carbonMaterial, x/2, 0.35 * scale, z);
            susp.rotation.z = Math.PI / 2;
        };
  
        // Front tires (slightly smaller)
        createTire(-0.8, -1.8, 0.95);
        createTire(0.8, -1.8, 0.95);
        
        // Rear tires
        createTire(-0.85, 1.4, 1.05);
        createTire(0.85, 1.4, 1.05);
  
        // 9. Floor / Diffuser
        const floorGeom = new THREE.BoxGeometry(1.8, 0.05, 4.2);
        addMesh(floorGeom, carbonMaterial, 0, 0.05, 0);
  
        // Center the whole group
        carGroup.position.y = -0.3;
        
        return carGroup;
    }
  
    /**
     * Initializes a 3D viewer in the given container
     */
    function init360Viewer(container, colorHex, label) {
        // Ensure Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.error("Three.js is not loaded! Cannot initialize 3D viewer.");
            return;
        }
  
        // Clean up previous content
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.cursor = 'grab';
  
        const width = container.clientWidth || 300;
        const height = container.clientHeight || 200;
  
        // Scene setup
        const scene = new THREE.Scene();
        // Transparent background
        scene.background = null;
  
        // Camera
        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        camera.position.set(4, 2.5, 5);
        camera.lookAt(0, 0, 0);
  
        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        container.appendChild(renderer.domElement);
  
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
  
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 25;
        dirLight.shadow.camera.left = -5;
        dirLight.shadow.camera.right = 5;
        dirLight.shadow.camera.top = 5;
        dirLight.shadow.camera.bottom = -5;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);
  
        const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
        rimLight.position.set(-5, 5, -5);
        scene.add(rimLight);
  
        // Add subtle ground shadow plane
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.ShadowMaterial({ opacity: 0.5 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.3;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);
  
        // Build the F1 Car
        const car = buildF1Car(colorHex || '#e10600');
        scene.add(car);
  
        // UI Indicator (Drag hint)
        const indicator = document.createElement('div');
        indicator.className = 'three-rotation-indicator';
        indicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                <polyline points="16 6 22 6 22 12"/>
            </svg>
            <span>3D Drag</span>
        `;
        indicator.style.cssText = `
            position:absolute; bottom:10px; right:12px;
            background:rgba(0,0,0,0.55); backdrop-filter:blur(6px);
            border:1px solid rgba(255,255,255,0.12);
            border-radius:100px; padding:4px 10px;
            font-size:11px; color:rgba(255,255,255,0.7);
            font-family:'Inter',sans-serif;
            pointer-events:none;
            display:flex; align-items:center; gap:5px;
            transition: opacity 0.3s ease;
        `;
        container.appendChild(indicator);
  
        const angleLabel = document.createElement('div');
        angleLabel.style.cssText = `
            position:absolute; top:10px; left:12px;
            font-size:10px; font-family:'SF Mono','Fira Mono',monospace;
            color:${colorHex}; letter-spacing:1.5px; text-transform:uppercase;
            opacity:0; transition: opacity 0.3s ease;
            pointer-events:none;
        `;
        angleLabel.textContent = "INTERACTIVE CAR";
        container.appendChild(angleLabel);
  
        // Interaction Logic
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let targetRotation = { x: 0, y: Math.PI / 4 }; // Initial angle
        let currentRotation = { x: 0, y: Math.PI / 4 };
        
        car.rotation.y = currentRotation.y;
  
        const onPointerDown = (e) => {
            isDragging = true;
            container.style.cursor = 'grabbing';
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            previousMousePosition = { x: clientX, y: clientY };
            e.stopPropagation();
        };
  
        const onPointerMove = (e) => {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const deltaMove = {
                x: clientX - previousMousePosition.x,
                y: clientY - previousMousePosition.y
            };
            
            targetRotation.y += deltaMove.x * 0.01;
            targetRotation.x += deltaMove.y * 0.005;
            
            // Limit pitch rotation
            targetRotation.x = Math.max(-0.2, Math.min(0.5, targetRotation.x));
            
            previousMousePosition = { x: clientX, y: clientY };
        };
  
        const onPointerUp = () => {
            isDragging = false;
            container.style.cursor = 'grab';
        };
  
        container.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        
        container.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);
        
        container.addEventListener('mouseenter', () => {
            indicator.style.opacity = '1';
            angleLabel.style.opacity = '1';
        });
        container.addEventListener('mouseleave', () => {
            indicator.style.opacity = '0.4';
            angleLabel.style.opacity = '0';
        });
  
        // Render Loop
        let animationFrameId;
        const clock = new THREE.Clock();
  
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
  
            // Auto spin if not dragging
            if (!isDragging) {
                targetRotation.y -= 0.5 * delta; // slow spin
                targetRotation.x += (0 - targetRotation.x) * 0.05; // ease pitch back to 0
            }
  
            // Smooth rotation easing
            currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;
            currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
            
            car.rotation.y = currentRotation.y;
            car.rotation.z = currentRotation.x; // Map physical mouse Y to Car Z tilt so it tilts up/down
            
            renderer.render(scene, camera);
        };
  
        animate();
  
        // Store context for cleanup
        const viewerContext = {
            renderer,
            cleanup: () => {
                cancelAnimationFrame(animationFrameId);
                window.removeEventListener('mousemove', onPointerMove);
                window.removeEventListener('mouseup', onPointerUp);
                window.removeEventListener('touchmove', onPointerMove);
                window.removeEventListener('touchend', onPointerUp);
                renderer.dispose();
            },
            resize: () => {
                const w = container.clientWidth;
                const h = container.clientHeight;
                if (w > 0 && h > 0) {
                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();
                    renderer.setSize(w, h);
                }
            }
        };
  
        // Ensure initial sizing handles 0-width edge cases by forcing a style update
        setTimeout(viewerContext.resize, 50);
  
        viewers.set(container, viewerContext);
        
        // Add ResizeObserver to accurately track when container changes size or becomes visible
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => viewerContext.resize());
            ro.observe(container);
            viewerContext.cleanup = () => {
                ro.disconnect();
                cancelAnimationFrame(animationFrameId);
                window.removeEventListener('mousemove', onPointerMove);
                window.removeEventListener('mouseup', onPointerUp);
                window.removeEventListener('touchmove', onPointerMove);
                window.removeEventListener('touchend', onPointerUp);
                renderer.dispose();
            };
        }
    }
  
    // Fallback for older browsers
    window.addEventListener('resize', () => {
        viewers.forEach(v => v.resize());
    });
  
    // ─── Public API ───────────────────────────────────────────────────────────
    window.Car360 = { 
        init: (container, colorHex, label) => {
            // Cleanup existing if present
            if (viewers.has(container)) {
                viewers.get(container).cleanup();
                viewers.delete(container);
            }
            init360Viewer(container, colorHex, label);
        }
    };
  
  })();
