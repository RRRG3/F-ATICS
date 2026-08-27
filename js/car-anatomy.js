/* ══════════════════════════════════════════════════════════════════
   F-ATICS · CAR ANATOMY
   Drives the interactive side elevation in the hero. Hover, tap, or
   tab through the parts; the panel explains what each one does and
   what the 2026 regulations changed about it.

   The SVG lives in index.html so the drawing renders without JS —
   this file only adds behaviour and the copy.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // Ordered front-to-back, which is also the legend order.
    const PARTS = [
        {
            id: 'front-wing',
            name: 'Front wing',
            copy: 'Sets up everything behind it. It makes roughly a quarter of the car’s ' +
                  'downforce, but its real job is deciding how cleanly air reaches the floor ' +
                  'and the rear wing.',
            spec: '2026 — narrower, and moveable for the first time',
        },
        {
            id: 'nose',
            name: 'Nose',
            copy: 'Carries the front wing and channels air back toward the floor. It is a crash ' +
                  'structure first: it has to absorb a frontal impact and break away without the ' +
                  'survival cell deforming.',
            spec: 'Homologated impact structure',
        },
        {
            id: 'front-suspension',
            name: 'Front suspension',
            copy: 'The wishbones do two jobs at once — locate the wheel, and work as aerodynamic ' +
                  'surfaces. Teams shape and angle them to steer air around the messy wake coming ' +
                  'off the front tyre.',
            spec: 'Pushrod or pullrod, inboard springs and dampers',
        },
        {
            id: 'front-tyre',
            name: 'Front tyre',
            copy: 'An 18-inch Pirelli slick. Getting it into its temperature window matters more ' +
                  'than almost any setup change — a cold front tyre costs more lap time than a ' +
                  'wing adjustment ever will.',
            spec: '2026 — 25 mm narrower than 2025, to cut drag',
        },
        {
            id: 'cockpit',
            name: 'Survival cell',
            copy: 'A carbon-fibre monocoque moulded around the driver, with the fuel cell directly ' +
                  'behind their back. It is by a wide margin the strongest structure on the car, ' +
                  'and everything else bolts to it.',
            spec: 'Carbon fibre and aluminium honeycomb',
        },
        {
            id: 'halo',
            name: 'Halo',
            copy: 'Titanium, about seven kilograms, and required to withstand 125 kN — near enough ' +
                  'twelve tonnes, or a London bus resting on it. Mandatory since 2018, and it has ' +
                  'already saved lives.',
            spec: '125 kN static load test',
        },
        {
            id: 'airbox',
            name: 'Airbox & roll hoop',
            copy: 'Feeds the turbo with clean air from above the driver’s helmet, and doubles ' +
                  'as the rollover structure. It has to hold the whole car’s weight inverted ' +
                  'without collapsing.',
            spec: 'Combined intake and primary roll structure',
        },
        {
            id: 'sidepod',
            name: 'Sidepod',
            copy: 'Houses the radiators for the engine, the energy store and the gearbox. Every ' +
                  'inlet is the same compromise: cooling the car needs, traded against drag it ' +
                  'does not want.',
            spec: 'Shape is one of the most visible team differentiators',
        },
        {
            id: 'floor',
            name: 'Floor & venturi tunnels',
            copy: 'Where most of the downforce actually comes from. The tunnels accelerate air ' +
                  'underneath the car, dropping its pressure and sucking the whole thing onto the ' +
                  'road — no drag penalty, unlike a wing.',
            spec: '2026 — ground effect reduced to calm porpoising',
        },
        {
            id: 'power-unit',
            name: 'Power unit',
            copy: 'A 1.6-litre V6 turbo hybrid. From 2026 the split is near even — about ' +
                  '400 kW from the engine, 350 kW from the electric motor. The MGU-H is gone.',
            spec: '2026 — ~50/50 split, 100% sustainable fuel',
        },
        {
            id: 'rear-suspension',
            name: 'Rear suspension',
            copy: 'Mounted to the gearbox casing rather than the chassis. It has to survive full ' +
                  'traction and braking loads while leaving the air feeding the diffuser as ' +
                  'undisturbed as possible.',
            spec: 'Loads carried through the gearbox structure',
        },
        {
            id: 'diffuser',
            name: 'Diffuser',
            copy: 'Expands the air leaving the floor and slows it back to ambient pressure. It is ' +
                  'what seals the car to the track, and small changes here move the entire ' +
                  'aerodynamic balance.',
            spec: 'Works as one system with the floor',
        },
        {
            id: 'rear-wing',
            name: 'Rear wing',
            copy: 'From 2026, DRS is replaced by active aerodynamics. X-mode flattens both wings ' +
                  'for minimum drag down the straights; Z-mode puts the downforce back for the ' +
                  'corners — and every car can use it.',
            spec: '2026 — active aero replaces DRS',
        },
        {
            id: 'rear-tyre',
            name: 'Rear tyre',
            copy: 'Same 18-inch rim as the front, on a narrower casing for 2026. Managing rear ' +
                  'tyre temperature across a stint is frequently what decides the result of a ' +
                  'race, not outright pace.',
            spec: '2026 — 30 mm narrower than 2025',
        },
    ];

    function init() {
        const root = document.querySelector('.anat');
        if (!root) return;

        const svg = root.querySelector('.anat__svg');
        const legend = root.querySelector('.anat__legend');
        const elIndex = document.getElementById('anat-index');
        const elName = document.getElementById('anat-name');
        const elCopy = document.getElementById('anat-copy');
        const elSpec = document.getElementById('anat-spec');
        if (!svg || !legend) return;

        const groups = new Map();
        svg.querySelectorAll('.anat__part').forEach((g) => groups.set(g.dataset.part, g));

        // Any part in the copy list that has no shape (or the reverse) would
        // silently break the pairing, so drop unmatched entries up front.
        const parts = PARTS.filter((p) => groups.has(p.id));

        const buttons = new Map();
        parts.forEach((part, i) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'anat__chip';
            btn.dataset.part = part.id;
            btn.innerHTML = '<span class="anat__chip-num">' + String(i + 1).padStart(2, '0') +
                            '</span>' + part.name;
            li.appendChild(btn);
            legend.appendChild(li);
            buttons.set(part.id, btn);

            const g = groups.get(part.id);
            // The <g> carries the semantics; the legend button is the keyboard
            // entry point, so the shape itself stays out of the tab order.
            g.setAttribute('role', 'img');
            g.setAttribute('aria-label', part.name);
        });

        let activeId = null;

        function show(id) {
            const i = parts.findIndex((p) => p.id === id);
            if (i < 0 || id === activeId) return;
            activeId = id;
            const part = parts[i];

            root.classList.add('is-focused');
            groups.forEach((g, key) => g.classList.toggle('is-active', key === id));
            buttons.forEach((b, key) => {
                const on = key === id;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });

            elIndex.textContent = String(i + 1).padStart(2, '0');
            elName.textContent = part.name;
            elCopy.textContent = part.copy;
            elSpec.textContent = part.spec;
        }

        function clear() {
            activeId = null;
            root.classList.remove('is-focused');
            groups.forEach((g) => g.classList.remove('is-active'));
            buttons.forEach((b) => {
                b.classList.remove('is-active');
                b.setAttribute('aria-pressed', 'false');
            });
            elIndex.textContent = '—';
            elName.textContent = 'Select a part';
            elCopy.textContent = 'Every component on this car exists because a rule allows it and a ' +
                                 'stopwatch justifies it. Point at one to see which.';
            elSpec.textContent = '';
        }

        // Clicking pins a part and writes it to the URL so a specific
        // component can be linked to. Hovering deliberately does not touch
        // the hash — that would rewrite the URL on every mouse move.
        function pin(id) {
            show(id);
            try {
                history.replaceState(null, '', '#part-' + id);
            } catch (_) { /* file:// and sandboxed contexts */ }
        }

        groups.forEach((g, id) => {
            g.addEventListener('mouseenter', () => show(id));
            g.addEventListener('click', () => {
                pin(id);
                buttons.get(id).focus();
            });
        });

        buttons.forEach((b, id) => {
            b.addEventListener('mouseenter', () => show(id));
            b.addEventListener('focus', () => show(id));
            b.addEventListener('click', () => pin(id));
        });

        // Left/right walk the car front-to-back without leaving the keyboard.
        legend.addEventListener('keydown', (e) => {
            const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
                      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
            if (!dir) return;
            e.preventDefault();
            const cur = parts.findIndex((p) => p.id === activeId);
            const next = parts[(cur + dir + parts.length) % parts.length];
            buttons.get(next.id).focus();
        });

        // Leaving the whole diagram resets it; moving between parts does not.
        root.querySelector('.anat__stage').addEventListener('mouseleave', () => {
            if (!legend.contains(document.activeElement) && !location.hash.startsWith('#part-')) clear();
        });

        function fromHash() {
            const m = /^#part-(.+)$/.exec(location.hash);
            return m && parts.some((p) => p.id === m[1]) ? m[1] : null;
        }

        const linked = fromHash();
        clear();
        if (linked) show(linked);

        window.addEventListener('hashchange', () => {
            const id = fromHash();
            if (id) show(id);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
