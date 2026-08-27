/**
 * Hash-based URL router.
 *
 * Responsibilities:
 *  - On load, scroll to the section matching location.hash
 *  - As the user scrolls, update location.hash to the section in view
 *    (using replaceState so the history stack stays clean)
 *  - Makes every section deep-linkable and shareable
 */

const SECTIONS = [
    'tracker',
    'calendar',
    'showcase',
    'circuits',
    'predictor',
    'live-telemetry',
];

function scrollToHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(() => {
            el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }, 120);
    }
}

function initScrollTracking() {
    const elements = SECTIONS.map(id => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    // replaceState keeps the back-button behaviour clean
                    history.replaceState(null, '', `#${id}`);
                    // Update active nav link
                    document.querySelectorAll('.pw-nav__link').forEach(a => {
                        const href = a.getAttribute('href');
                        a.classList.toggle('router-active', href === `#${id}`);
                    });
                    break;
                }
            }
        },
        {
            rootMargin: '-45% 0px -45% 0px', // fires when section is centred-ish
            threshold: 0,
        }
    );

    elements.forEach(el => observer.observe(el));
}

// Add a tiny active-link style if not already in CSS
const style = document.createElement('style');
style.textContent = `
  .router-active {
    color: var(--accent) !important;
  }
`;
document.head.appendChild(style);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        scrollToHash();
        initScrollTracking();
    });
} else {
    scrollToHash();
    initScrollTracking();
}

// Also handle browser back/forward
window.addEventListener('hashchange', scrollToHash);
