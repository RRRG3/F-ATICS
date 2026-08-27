/* ══════════════════════════════════════════════════════════════════
   F-ATICS · STATUS & LOADING
   Two gaps this closes:

   · A drawer opened instantly and then sat empty for several seconds
     while its data arrived, which reads as broken rather than busy.
   · When an API throttled us the page kept showing shipped placeholder
     data with nothing to say it was stale. Silent wrong data is worse
     than a visible error.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Loading skeletons ──────────────────────────────────────── */

    // Sections whose content arrives asynchronously, and the element that
    // proves it landed.
    const AWAIT = {
        tracker: '.lead',
        calendar: '.season-bar',
        'live-telemetry': '.sess__title',
        predictor: '.pred-result-row',
    };

    function skeleton(drawerId) {
        const sel = AWAIT[drawerId];
        if (!sel) return;
        const body = document.querySelector('#drawer-' + drawerId + ' .drawer__body');
        if (!body || document.querySelector(sel) || body.querySelector('.skel-wrap')) return;

        const head = body.querySelector('.section-header');
        const host = document.createElement('div');
        host.className = 'skel-wrap';
        host.innerHTML =
            '<div class="skel-block skel-block--lg"></div>' +
            '<div class="skel-row"><span></span><span></span><span></span></div>' +
            '<div class="skel-block"></div>';
        if (head) head.insertAdjacentElement('afterend', host);
        else body.insertAdjacentElement('afterbegin', host);

        // Remove as soon as the real thing exists.
        const stop = () => { host.remove(); ob.disconnect(); clearTimeout(bail); };
        const ob = new MutationObserver(() => { if (document.querySelector(sel)) stop(); });
        ob.observe(body, { childList: true, subtree: true });
        const bail = setTimeout(stop, 30000);
    }

    document.addEventListener('room:open', (e) => {
        if (e.detail && e.detail.id) skeleton(e.detail.id);
    });

    /* ── Status surface ─────────────────────────────────────────── */

    let bar = null;
    const seen = new Set();

    function ensureBar() {
        if (bar) return bar;
        bar = document.createElement('div');
        bar.className = 'statusbar';
        bar.setAttribute('role', 'status');
        bar.setAttribute('aria-live', 'polite');
        document.body.appendChild(bar);
        return bar;
    }

    function report(kind, text) {
        if (seen.has(text)) return;
        seen.add(text);
        const el = ensureBar();
        const item = document.createElement('div');
        item.className = 'statusbar__i is-' + kind;
        item.innerHTML = '<span class="statusbar__d"></span><span>' + text +
                         '</span><button type="button" aria-label="Dismiss">&times;</button>';
        item.querySelector('button').addEventListener('click', () => item.remove());
        el.appendChild(item);
        if (kind !== 'error') setTimeout(() => item.remove(), 9000);
    }

    window.faticsStatus = report;

    /* Both data APIs answer 429 WITHOUT a CORS header, so the browser
       reports a CORS failure and the real cause is invisible. Watch for
       failed requests to those hosts and translate. */
    const origFetch = window.fetch;
    const hosts = [
        { m: /api\.jolpi\.ca/,   n: 'Jolpica (standings, results)' },
        { m: /api\.openf1\.org/, n: 'OpenF1 (telemetry)' },
    ];

    window.fetch = function (...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        return origFetch.apply(this, args).then((res) => {
            if (res.status === 429) {
                const h = hosts.find((x) => x.m.test(url));
                if (h) report('warn', h.n + ' is rate-limiting. Showing cached data — retrying shortly.');
            }
            return res;
        }).catch((err) => {
            const h = hosts.find((x) => x.m.test(url));
            if (h) {
                report('warn', h.n + ' is unreachable or throttled. Some figures may be cached or ' +
                               'fall back to shipped data.');
            }
            throw err;
        });
    };

    document.addEventListener('season:loaded', (e) => {
        const d = e.detail;
        if (d && d.drivers && d.drivers.length) {
            report('ok', 'Live 2026 season loaded — ' + d.drivers.length + ' drivers, ' +
                         d.cal.length + ' rounds.');
        }
    });
})();
