/* ══════════════════════════════════════════════════════════════════
   F-ATICS · ANATOMY POLISH
   Three problems with the car diagram.

   1. It was drawn with a 46%-opacity stroke over a near-black fill,
      on a dark drawer. The centrepiece of the section barely resolved.
   2. The caption said "hover a part", but nothing marked where the
      parts were. Fourteen invisible <rect class="anat__hit"> boxes
      floated over the drawing and you had to find them by sweeping
      the mouse — which is why the fourteen chips exist underneath as
      a fallback. Two mechanisms doing one job, neither of them
      obviously primary. Each part now carries a numbered pin, keyed
      to those same chips.
   3. The spec grid ran three across with ten entries, orphaning "top
      speed" alone on a fourth row.

   The pins are appended INSIDE each existing <g class="anat__part">,
   so they inherit the hover and focus handling already bound to the
   group rather than needing any of it duplicated.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const CSS = `
/* 1. Let the car actually read. */
.drawer .anat__svg path,
.drawer .anat__svg circle,
.drawer .anat__svg ellipse,
.drawer .anat__svg rect:not(.anat__hit) {
    stroke: rgba(245, 243, 240, 0.78) !important;
    stroke-width: 1.6px;
}
.drawer .anat__svg .anat__part { transition: opacity 200ms ease; }

/* When one part is live, the rest step back rather than competing. */
.drawer .anat__svg.is-focused .anat__part { opacity: 0.34; }
.drawer .anat__svg.is-focused .anat__part.is-active,
.drawer .anat__svg .anat__part:hover { opacity: 1; }

/* 2. Numbered pins — the affordance the diagram never had. */
.anat__pin { pointer-events: none; }
.anat__pin-dot {
    fill: var(--surface-2, #12161b);
    stroke: rgba(226, 80, 60, 0.85);
    stroke-width: 1.6px;
    transition: fill 180ms ease, stroke 180ms ease;
}
.anat__pin-n {
    fill: rgba(245, 243, 240, 0.92);
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    text-anchor: middle;
    dominant-baseline: central;
    transition: fill 180ms ease;
}
.anat__part:hover .anat__pin-dot,
.anat__part.is-active .anat__pin-dot { fill: var(--accent, #E2503C); stroke: var(--accent, #E2503C); }
.anat__part:hover .anat__pin-n,
.anat__part.is-active .anat__pin-n { fill: #fff; }
.anat__part:focus-visible .anat__pin-dot { stroke: #fff; stroke-width: 2.4px; }

/* 3. Ten entries across three fixed 340px columns left "top speed"
   orphaned alone on a fourth row. Ten divides evenly by two or five;
   five is too narrow for labels like "Electric (MGU-H)", which wrapped
   onto three lines, so two columns of five rows it is. */
.drawer .carshow__spec {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}
@media (max-width: 720px) {
  .drawer .carshow__spec { grid-template-columns: 1fr !important; }
}

/* The readout panel is stretched by its grid row, so at rest its two
   lines sat at the top above ~90px of void. Centre them instead of
   collapsing the panel, which would make it jump on every hover. */
.drawer .anat__panel {
    display: flex !important;
    flex-direction: column;
    justify-content: center;
}
`;

    function injectCSS() {
        if (document.getElementById('anatomy-polish-css')) return;
        const el = document.createElement('style');
        el.id = 'anatomy-polish-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';

    /* The number on a pin must match the number on the chip below, and
       the chips run front-to-back (01 front wing … 14 rear tyre) while
       the SVG is authored back-to-front. Read the number off the chip
       that shares the same data-part rather than assuming DOM order. */
    function chipNumbers(svg) {
        const map = {};
        document.querySelectorAll('#drawer-anatomy [data-part], #anatomy [data-part]')
            .forEach((el) => {
                if (svg.contains(el)) return;                 // that is the diagram
                const m = (el.textContent || '').match(/(\d{1,2})/);
                if (m && el.dataset.part) map[el.dataset.part] = m[1].padStart(2, '0');
            });
        return map;
    }

    function addPins() {
        const svg = document.querySelector('#drawer-anatomy .anat__svg')
                 || document.querySelector('#anatomy .anat__svg');
        if (!svg || svg.dataset.pinned === '1') return false;

        const parts = [...svg.querySelectorAll('.anat__part')];
        if (!parts.length) return false;

        const nums = chipNumbers(svg);

        parts.forEach((part, i) => {
            const hit = part.querySelector('.anat__hit');
            if (!hit || part.querySelector('.anat__pin')) return;

            // Two of the fourteen hit areas are <circle>, which has cx/cy/r
            // and no x/y/width/height at all — reading those attributes gave
            // NaN and parked both pins at the origin, outside the diagram.
            // getBBox works for every shape.
            let cx, cy;
            try {
                const b = hit.getBBox();
                cx = b.x + b.width / 2;
                cy = b.y + b.height / 2;
            } catch (e) {
                return;
            }
            if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

            const g = document.createElementNS(SVG_NS, 'g');
            g.setAttribute('class', 'anat__pin');

            const c = document.createElementNS(SVG_NS, 'circle');
            c.setAttribute('class', 'anat__pin-dot');
            c.setAttribute('cx', cx);
            c.setAttribute('cy', cy);
            c.setAttribute('r', 13);

            const t = document.createElementNS(SVG_NS, 'text');
            t.setAttribute('class', 'anat__pin-n');
            t.setAttribute('x', cx);
            t.setAttribute('y', cy);
            t.textContent = nums[part.dataset.part] || String(i + 1).padStart(2, '0');

            g.appendChild(c);
            g.appendChild(t);
            part.appendChild(g);   // inside the group: inherits its hover/focus
        });

        // Dim the rest while one part is live.
        parts.forEach((part) => {
            const activate = () => {
                svg.classList.add('is-focused');
                parts.forEach((p) => p.classList.toggle('is-active', p === part));
            };
            part.addEventListener('mouseenter', activate);
            part.addEventListener('focus', activate, true);
        });
        svg.addEventListener('mouseleave', () => {
            svg.classList.remove('is-focused');
            parts.forEach((p) => p.classList.remove('is-active'));
        });

        svg.dataset.pinned = '1';
        console.info('[anatomy] ' + parts.length + ' numbered pins added');
        return true;
    }

    function boot() {
        injectCSS();
        if (!addPins()) {
            let n = 0;
            const t = setInterval(() => { if (addPins() || ++n > 40) clearInterval(t); }, 500);
        }
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 500), { once: true });
    document.addEventListener('room:open', () => setTimeout(boot, 300));
    setTimeout(boot, 1800);
})();
