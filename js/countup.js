/* ══════════════════════════════════════════════════════════════════
   F-ATICS · COUNT-UP
   Headline figures land instead of simply being present. Only the
   large stat values animate — tables and body copy are left alone,
   because numbers you want to READ should never be moving.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const SELECTOR = [
        '.sess__stat-v',
        '.carshow__row dd b',
        '.quiz__score',
        '.pred-cal-stat__val',
    ].join(', ');

    // Split "1:16.201" or "≈750 kW / 1,000 hp" into a leading number and the
    // text around it, so units and prefixes survive the animation intact.
    const NUM = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s;

    function animate(el) {
        if (el.dataset.counted) return;
        const m = NUM.exec(el.textContent.trim());
        if (!m) return;
        const [, pre, raw, post] = m;
        const target = parseFloat(raw.replace(/,/g, ''));
        if (!Number.isFinite(target) || target === 0) return;

        el.dataset.counted = '1';
        const decimals = (raw.split('.')[1] || '').length;
        const grouped = raw.includes(',');
        const t0 = performance.now();
        const DUR = 900;

        const paint = (now) => {
            const p = Math.min((now - t0) / DUR, 1);
            // easeOutExpo: quick commitment, soft landing.
            const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            let v = (target * e).toFixed(decimals);
            if (grouped) v = Number(v).toLocaleString(undefined, {
                minimumFractionDigits: decimals, maximumFractionDigits: decimals,
            });
            el.textContent = pre + v + post;
            if (p < 1) requestAnimationFrame(paint);
        };
        requestAnimationFrame(paint);
    }

    // Only run for things actually on screen inside an open drawer.
    const io = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                animate(en.target);
                io.unobserve(en.target);
            });
        }, { threshold: 0.4 })
        : null;

    function scan(root) {
        (root || document).querySelectorAll(SELECTOR).forEach((el) => {
            if (el.dataset.counted || el.dataset.watched) return;
            el.dataset.watched = '1';
            if (io) io.observe(el); else animate(el);
        });
    }

    document.addEventListener('room:open', () => setTimeout(() => scan(), 500));
    document.addEventListener('season:loaded', () => setTimeout(() => scan(), 400));
})();
