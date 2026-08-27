/* ══════════════════════════════════════════════════════════════════
   F-ATICS · CAR SHOWCASE
   Heads the car drawer with a viewer, the 2026 specification, and the
   Pirelli compound range.

   On the viewer: a licensed Oracle Red Bull Racing model is not
   something this project can ship — the geometry and liveries are the
   team's IP. Supply one at assets/models/rb.glb and it renders here in
   3D. With no model the stage is not rendered at all: a placeholder
   image standing in for a car you were promised is worse than the
   anatomy drawing simply leading the section.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const MODEL_URL = '/assets/models/rb.glb';
    const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js';
    const LOADERS = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/';

    const SPEC = [
        ['Minimum weight',   '768 kg',              '30 kg lighter than 2025'],
        ['Combined output',  '≈750 kW / 1,000 hp',  'engine plus electric motor'],
        ['Combustion',       '1.6 L V6 turbo',      '≈400 kW'],
        ['Electric (MGU-K)', '350 kW',              'up from 120 kW; MGU-H deleted'],
        ['Fuel',             '100% sustainable',    'no fossil carbon'],
        ['Wheelbase',        'max 3,400 mm',        '200 mm shorter than 2025'],
        ['Width',            '1,900 mm',            '100 mm narrower'],
        ['Wheels',           '18-inch Pirelli',     'narrower front and rear'],
        ['Gearbox',          '8-speed semi-auto',   'seamless shift, ~40 ms'],
        ['Top speed',        '≈350 km/h',           'circuit dependent'],
    ];

    // C1 is the hardest of the slick range and C6 the softest; three of
    // the six are nominated as hard/medium/soft at each event.
    const TYRES = [
        ['C1', 'Hardest slick',   '#E8E4DA', '#0B0C0E'],
        ['C2', 'Hard',            '#D8D3C6', '#0B0C0E'],
        ['C3', 'Medium',          '#E4C05A', '#0B0C0E'],
        ['C4', 'Soft',            '#D8503F', '#FFFFFF'],
        ['C5', 'Softer',          '#C43A2C', '#FFFFFF'],
        ['C6', 'Softest slick',   '#A82C22', '#FFFFFF'],
        ['I',  'Intermediate',    '#3E8E5A', '#FFFFFF'],
        ['W',  'Full wet',        '#2F6FA8', '#FFFFFF'],
    ];

    function esc(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function shell(withStage) {
        return '' +
            '<section class="carshow">' +
            (withStage ? '  <div class="carshow__stage" id="carshow-stage"></div>' +
                         '  <p class="carshow__cap" id="carshow-cap"></p>' : '') +
            '  <h3 class="carshow__h">2026 specification</h3>' +
            '  <dl class="carshow__spec">' +
            SPEC.map(([k, v, n]) =>
                '<div class="carshow__row"><dt>' + esc(k) + '</dt>' +
                '<dd><b>' + esc(v) + '</b><span>' + esc(n) + '</span></dd></div>').join('') +
            '  </dl>' +
            '  <h3 class="carshow__h">Tyre compounds</h3>' +
            '  <ul class="carshow__tyres">' +
            TYRES.map(([c, n, bg, fg]) =>
                '<li><span class="carshow__chip" style="background:' + bg + ';color:' + fg + '">' +
                esc(c) + '</span>' + esc(n) + '</li>').join('') +
            '  </ul>' +
            '</section>';
    }

    async function hasModel() {
        try {
            const r = await fetch(MODEL_URL, { method: 'HEAD' });
            // A dev server that falls back to index.html answers 200 with
            // HTML, so the status alone is not proof the model exists.
            const type = r.headers.get('content-type') || '';
            return r.ok && !type.includes('text/html');
        } catch (_) { return false; }
    }

    async function mountModel(stage, cap) {
        try {
            const THREE = await import(/* @vite-ignore */ THREE_URL);
            const { GLTFLoader } = await import(/* @vite-ignore */ LOADERS + 'loaders/GLTFLoader.js');
            const { OrbitControls } = await import(/* @vite-ignore */ LOADERS + 'controls/OrbitControls.js');

            stage.innerHTML = '';
            const w = stage.clientWidth || 800;
            const h = stage.clientHeight || 420;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
            renderer.setSize(w, h);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            stage.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 200);
            camera.position.set(5.2, 2.0, 6.4);

            scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1410, 1.5));
            const key = new THREE.DirectionalLight(0xffffff, 2.2);
            key.position.set(6, 9, 5);
            scene.add(key);

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.maxPolarAngle = Math.PI / 2.05;

            new GLTFLoader().load(MODEL_URL, (gltf) => {
                const car = gltf.scene;
                // Normalise whatever scale the model ships at so the camera
                // framing does not depend on the file's authoring units.
                const box = new THREE.Box3().setFromObject(car);
                const size = box.getSize(new THREE.Vector3());
                const centre = box.getCenter(new THREE.Vector3());
                const k = 5 / Math.max(size.x, size.y, size.z);
                car.scale.setScalar(k);
                car.position.sub(centre.multiplyScalar(k));
                scene.add(car);
                controls.target.set(0, 0, 0);
            }, undefined, () => {
                stage.remove();
                cap.remove();
            });

            (function tick() {
                requestAnimationFrame(tick);
                controls.update();
                renderer.render(scene, camera);
            })();

            const fit = () => {
                const nw = stage.clientWidth, nh = stage.clientHeight;
                if (!nw || !nh) return;
                camera.aspect = nw / nh;
                camera.updateProjectionMatrix();
                renderer.setSize(nw, nh);
            };
            window.addEventListener('resize', fit, { passive: true });

            cap.textContent = 'Drag to orbit · scroll to zoom · your model, assets/models/rb.glb';
        } catch (e) {
            stage.remove();
            cap.remove();
        }
    }

    async function init() {
        const drawer = document.getElementById('drawer-anatomy');
        if (!drawer) return;
        const body = drawer.querySelector('.drawer__body');
        if (!body || body.querySelector('.carshow')) return;

        const withStage = await hasModel();

        // The anatomy drawing is the strongest thing in this drawer, so it
        // opens the section and the reference tables follow it. A supplied
        // 3D model outranks it and goes to the top on its own.
        body.insertAdjacentHTML('beforeend', shell(false));
        if (!withStage) return;

        body.insertAdjacentHTML('afterbegin',
            '<div class="carshow carshow--stage">' +
            '  <div class="carshow__stage" id="carshow-stage"></div>' +
            '  <p class="carshow__cap" id="carshow-cap">Loading model…</p>' +
            '</div>');
        mountModel(body.querySelector('#carshow-stage'), body.querySelector('#carshow-cap'));
    }

    document.addEventListener('room:ready', init, { once: true });
})();
