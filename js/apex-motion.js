/* ══════════════════════════════════════════════════════════════════
   F-ATICS · AURUM motion
   Everything here is transform/opacity only and runs on CSS
   transitions — no GSAP dependency, so a blocked CDN degrades to a
   static page rather than an invisible one. Reduced-motion bails out
   of every effect and shows all content immediately.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Nav: solid bar past the fold, active link tracks the section ── */
    function initNavState() {
        const update = () => {
            document.body.classList.toggle('nav-scrolled', window.scrollY > 24);
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    function initNavActive() {
        const links = Array.from(document.querySelectorAll('.pw-nav__link[href^="#"]'));
        if (!links.length || !('IntersectionObserver' in window)) return;

        const map = new Map();
        links.forEach((link) => {
            const target = document.getElementById(link.getAttribute('href').slice(1));
            if (target) map.set(target, link);
        });
        if (!map.size) return;

        // A band across the middle of the viewport decides what's "current",
        // so the marker doesn't flicker at section boundaries.
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const link = map.get(entry.target);
                if (!link) return;
                if (entry.isIntersecting) {
                    links.forEach((l) => l.classList.remove('is-active'));
                    link.classList.add('is-active');
                }
            });
        }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

        map.forEach((_link, target) => observer.observe(target));
    }

    /* ── Section titles slide up from behind their own edge ─────────── */
    function wrapTitles() {
        const masks = [];
        document.querySelectorAll('.section-title').forEach((el) => {
            // Only plain-text headings — anything with markup is left alone
            // so we never clobber content another script owns.
            if (el.children.length || !el.textContent.trim()) return;
            const text = el.textContent;
            const outer = document.createElement('span');
            const inner = document.createElement('span');
            outer.className = 'apex-mask';
            inner.className = 'apex-mask__i';
            inner.textContent = text;
            outer.appendChild(inner);
            el.textContent = '';
            el.appendChild(outer);
            masks.push(outer);
        });

        if (!masks.length) return;

        // Each mask watches itself. Tying the reveal to an ancestor's
        // class would leave any title outside a .section-header clipped
        // shut forever.
        if (reduceMotion || !('IntersectionObserver' in window)) {
            masks.forEach((m) => m.classList.add('apex-mask--in'));
            return;
        }

        // Anything not laid out right now (inside a display:none tab panel,
        // say) is opened immediately rather than clipped. A closed mask on
        // an unrendered element would never receive an intersection.
        for (let i = masks.length - 1; i >= 0; i--) {
            if (!masks[i].getClientRects().length) {
                masks[i].classList.add('apex-mask--in');
                masks.splice(i, 1);
            }
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('apex-mask--in');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

        masks.forEach((m) => observer.observe(m));
    }

    /* ── Reveals, staggered within each group ───────────────────────── */
    const REVEAL_SELECTOR = [
        '.section-header', '.calendar-card', '.lab-team-card', '.lab-circuit-card',
        '.table-container', '.predictor-controls-panel', '.pred-calibration',
        '.pred-walkforward', '.pred-gbt', '.pred-openf1', '.pred-bayesian',
        '.pred-priors', '.pred-paceoverride', '.pred-constructor', '.pred-bookmaker',
        '.pred-live-track', '.pred-telemetry', '.tele-panel', '.tele-weekend-banner',
        '.pw-drive__head', '.pw-drive__frame', '.pw-now__inner', '.apex-break__inner',
    ].join(', ');

    function initReveals() {
        let targets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
        if (!targets.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            targets.forEach((el) => el.classList.add('apex-visible'));
            return;
        }

        // Same guard as the title masks: never hide something that isn't
        // currently laid out — e.g. the constructors table sitting in an
        // inactive standings tab — or it can be left at opacity 0.
        targets = targets.filter((el) => {
            if (el.getClientRects().length) return true;
            el.classList.add('apex-visible');
            return false;
        });

        targets.forEach((el) => el.classList.add('apex-hidden'));

        // Elements entering together share a batch; each gets a slightly
        // later delay so a grid cascades diagonally instead of popping.
        let batch = [];
        let flush = null;

        const release = () => {
            batch.forEach((el, i) => {
                el.style.setProperty('--d', Math.min(i * 70, 420) + 'ms');
                el.classList.remove('apex-hidden');
                el.classList.add('apex-visible');
            });
            batch = [];
            flush = null;
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                batch.push(entry.target);
                observer.unobserve(entry.target);
            });
            if (batch.length && !flush) flush = requestAnimationFrame(release);
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

        targets.forEach((el) => observer.observe(el));
    }

    /* ── Scroll progress hairline ───────────────────────────────────── */
    function initProgress() {
        if (reduceMotion) return;
        const line = document.createElement('div');
        line.className = 'apex-progress';
        line.setAttribute('aria-hidden', 'true');
        document.body.appendChild(line);

        let ticking = false;
        const paint = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
            line.style.transform = 'scaleX(' + p + ')';
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) { ticking = true; requestAnimationFrame(paint); }
        }, { passive: true });
        paint();
    }

    /* ── Hero parallax: photo drifts slower than the type above it ──── */
    function initHeroParallax() {
        if (reduceMotion) return;
        const hero = document.querySelector('.apex-hero');
        if (!hero) return;
        const photo = hero.querySelector('.apex-hero__photo');
        const copy = hero.querySelector('.apex-hero__copy');
        if (!photo && !copy) return;

        let ticking = false;
        const paint = () => {
            const rect = hero.getBoundingClientRect();
            // 0 at rest, 1 once the hero has scrolled fully out of frame.
            const p = Math.min(Math.max(-rect.top / (rect.height || 1), 0), 1);
            if (photo) photo.style.transform = 'translate3d(0,' + (p * 14) + '%,0) scale(' + (1 + p * 0.06) + ')';
            if (copy) {
                copy.style.transform = 'translate3d(0,' + (p * -34) + 'px,0)';
                copy.style.opacity = String(1 - p * 0.85);
            }
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) { ticking = true; requestAnimationFrame(paint); }
        }, { passive: true });
        window.addEventListener('resize', paint, { passive: true });
        paint();
    }

    /* ── Showroom HUD: reserve the exact height the chip rail needs ─── */
    function initDriveRail() {
        const overlay = document.querySelector('.pw-drive__overlay');
        const frame = document.querySelector('.pw-drive__frame');
        if (!overlay || !frame) return;

        // The rail wraps between one and two rows depending on width, and a
        // fixed reservation either clips the race number or leaves a gap.
        let ro = null;
        const sync = () => {
            const rail = frame.querySelector('.pw-drive__rail');
            if (!rail) return;
            overlay.style.setProperty('--rail-h', Math.ceil(rail.getBoundingClientRect().height) + 'px');
        };
        const bind = () => {
            const rail = frame.querySelector('.pw-drive__rail');
            if (!rail) return;
            if (ro) ro.disconnect();
            if ('ResizeObserver' in window) {
                ro = new ResizeObserver(sync);
                ro.observe(rail);
            }
            sync();
        };

        bind();
        // apex-showroom builds the rail *after* this script boots and
        // replaces it when the scene rebuilds, so watch the frame instead
        // of binding once to an element that isn't there yet.
        new MutationObserver(bind).observe(frame, { childList: true });
        window.addEventListener('resize', sync, { passive: true });
    }

    function boot() {
        wrapTitles();
        initDriveRail();
        initNavState();
        initNavActive();
        initReveals();
        initProgress();
        initHeroParallax();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
