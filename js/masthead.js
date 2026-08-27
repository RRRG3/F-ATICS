/* ══════════════════════════════════════════════════════════════════
   F-ATICS · MASTHEAD
   The drawers looked like a different product from the room: the
   scene is a painted paddock office, the panels were a generic dark
   dashboard. Each section now opens as a document FROM that office —
   a ruled masthead carrying its number, its source and its extent,
   the way a technical dossier states its provenance before its
   contents.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const SPEC = {
        tracker:          { no: '01', file: 'Classification', src: 'Jolpica · Ergast' },
        calendar:         { no: '02', file: 'Race calendar',  src: 'Jolpica · Ergast' },
        showcase:         { no: '03', file: 'Constructors',   src: 'FIA entry list' },
        circuits:         { no: '04', file: 'Circuit guide',  src: 'FIA circuit data' },
        predictor:        { no: '05', file: 'Race model',     src: 'Monte Carlo · Plackett–Luce' },
        'live-telemetry': { no: '06', file: 'Session data',   src: 'OpenF1' },
        anatomy:          { no: '07', file: 'Technical',      src: '2026 regulations' },
        quiz:             { no: '08', file: 'Trivia',         src: 'F-ATICS question bank' },
    };

    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };

    // What each section can honestly say about its own extent.
    function extent(id) {
        const n = (sel) => document.querySelectorAll(sel).length;
        switch (id) {
            case 'tracker':  return n('#standings-body tr') + ' drivers classified';
            case 'calendar': return n('.calendar-card') + ' rounds';
            case 'showcase': return n('.lab-team-card') + ' constructors';
            case 'circuits': return n('.lab-circuit-card') + ' circuits';
            case 'predictor': return '5,000 simulations per race';
            case 'live-telemetry': {
                const t = document.querySelector('.sess__title');
                return t ? t.textContent.trim() : 'most recent session';
            }
            case 'anatomy': return n('.anat__part') + ' components';
            case 'quiz':    return (typeof quizData !== 'undefined' ? quizData.length : 0) + ' questions';
            default: return '';
        }
    }

    function build(id) {
        const spec = SPEC[id];
        const drawer = document.getElementById('drawer-' + id);
        if (!spec || !drawer) return;
        const body = drawer.querySelector('.drawer__body');
        if (!body || body.querySelector('.mast')) return;

        // The car drawer is built from .anat, which carries its own head
        // rather than the .section-header every other section uses.
        const header = body.querySelector('.section-header') || body.querySelector('.anat__head');
        if (!header) return;
        const isAnat = header.classList.contains('anat__head');

        const titleEl = header.querySelector('.section-title') || header.querySelector('.anat__title');
        const title = titleEl ? titleEl.textContent : spec.file;
        const sub = header.querySelector('.section-subtitle') || header.querySelector('.anat__lede');
        const lede = sub ? sub.textContent.trim() : '';

        const stamp = new Date().toLocaleDateString('en-GB',
            { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

        const mast = document.createElement('div');
        mast.className = 'mast';
        mast.innerHTML =
            '<div class="mast__rail">' +
            '  <span class="mast__no">' + spec.no + '</span>' +
            '  <span class="mast__file">' + esc(spec.file) + '</span>' +
            '</div>' +
            '<div class="mast__main">' +
            '  <h2 class="mast__title">' + esc(title.trim()) + '</h2>' +
            (lede ? '  <p class="mast__lede">' + esc(lede) + '</p>' : '') +
            '  <dl class="mast__meta">' +
            '    <div><dt>Source</dt><dd>' + esc(spec.src) + '</dd></div>' +
            '    <div><dt>Extent</dt><dd data-extent>' + esc(extent(id)) + '</dd></div>' +
            '    <div><dt>Compiled</dt><dd>' + stamp + '</dd></div>' +
            '  </dl>' +
            '</div>';

        if (isAnat) {
            // Keep the diagram's own layout intact — lift the masthead out
            // above .anat instead of replacing a grid child inside it.
            const anat = header.closest('.anat') || header.parentElement;
            anat.parentElement.insertBefore(mast, anat);
            header.remove();
        } else {
            header.replaceWith(mast);
        }

        // Extent is counted from the DOM, and most of it arrives after this
        // runs, so refresh it a few times rather than freezing a zero.
        let n = 0;
        const tick = setInterval(() => {
            const cell = mast.querySelector('[data-extent]');
            if (cell) cell.textContent = extent(id);
            if (++n > 20) clearInterval(tick);
        }, 1500);
    }

    function buildAll() { Object.keys(SPEC).forEach(build); }

    document.addEventListener('room:ready', () => setTimeout(buildAll, 300), { once: true });
    document.addEventListener('room:open', (e) => { if (e.detail) build(e.detail.id); });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(buildAll, 1400), { once: true });
    } else {
        setTimeout(buildAll, 1400);
    }
})();
