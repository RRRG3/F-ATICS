/* ══════════════════════════════════════════════════════════════════
   F-ATICS · CIRCUIT HISTORY
   The calendar shows what is coming; it never said what has happened
   there before. Jolpica holds every result back to 1950, so the next
   round now carries its own record: who has won here, who starts from
   pole most often, and the last ten winners.

   Circuit history does not change, so it is cached for thirty days.
   Jolpica rate-limits hard and drops its CORS header when it does, so
   requests are serialised and failures degrade to nothing rather than
   an error card.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const API = 'https://api.jolpi.ca/ergast/f1';
    const TTL = 30 * 24 * 60 * 60 * 1000;      // history is immutable
    const GAP = 600;
    let chain = Promise.resolve();
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));

    /* These live as top-level `const` in classic scripts, which puts them in
       the global lexical environment rather than on `window` — so
       window.driverStandings2026 is undefined even though the identifier
       resolves fine. Indirect eval runs in global scope and can see both. */
    function globalVar(name) {
        try {
            return (0, eval)('typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined');
        } catch (_) { return undefined; }
    }

    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };
    const surname = (s) => String(s || '').trim().split(/\s+/).slice(-1)[0];

    const CSS = `
.ch { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 14px; display: grid; gap: 12px; }
.ch__k { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--fg-mute); }
.ch__top { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
.ch__stat b { display: block; font-family: var(--font-display); font-size: 21px; font-weight: 700;
    letter-spacing: -0.02em; color: var(--fg); line-height: 1.1; }
.ch__stat span { font-size: 11px; color: var(--fg-dim); }
.ch__list { display: grid; gap: 3px; }
.ch__row { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 10px;
    align-items: baseline; font-size: 12px; padding: 4px 0; }
.ch__yr { font-family: var(--font-mono); font-size: 10px; color: var(--fg-mute); }
.ch__win { color: var(--fg); }
.ch__team { color: var(--fg-mute); font-size: 11px; }
`;

    function injectCSS() {
        if (document.getElementById('circuit-history-css')) return;
        const el = document.createElement('style');
        el.id = 'circuit-history-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    async function get(path) {
        const key = 'f1hist:' + path;
        try {
            const hit = JSON.parse(localStorage.getItem(key) || 'null');
            if (hit && Date.now() - hit.t < TTL) return hit.d;
        } catch (_) {}
        const run = chain.then(async () => {
            await nap(GAP);
            for (let a = 0; a < 3; a++) {
                const r = await fetch(API + path);
                if (r.ok) return r.json();
                // A 429 arrives without CORS headers, so it usually surfaces
                // as a network error rather than a status — either way, back off.
                if (r.status !== 429 || a === 2) throw new Error(path + ' → ' + r.status);
                await nap(2000 * (a + 1));
            }
        });
        chain = run.catch(() => {});
        const data = await run;
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (_) {}
        return data;
    }

    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

    async function circuitId(name) {
        const json = await get('/circuits.json?limit=100');
        const list = (((json || {}).MRData || {}).CircuitTable || {}).Circuits || [];
        const want = norm(name);
        let hit = list.find((c) => norm(c.circuitName) === want);
        if (!hit) hit = list.find((c) => norm(c.circuitName).includes(want) || want.includes(norm(c.circuitName)));
        return hit ? hit.circuitId : null;
    }

    async function winners(id) {
        const json = await get('/circuits/' + id + '/results/1.json?limit=100');
        const races = (((json || {}).MRData || {}).RaceTable || {}).Races || [];
        return races.map((r) => ({
            year: r.season,
            name: (r.Results[0].Driver.givenName + ' ' + r.Results[0].Driver.familyName),
            team: r.Results[0].Constructor.name,
        }));
    }

    async function poles(id) {
        const json = await get('/circuits/' + id + '/qualifying/1.json?limit=100');
        const races = (((json || {}).MRData || {}).RaceTable || {}).Races || [];
        return races.map((r) => (r.QualifyingResults[0].Driver.givenName + ' ' +
                                 r.QualifyingResults[0].Driver.familyName));
    }

    const mode = (arr) => {
        const c = new Map();
        arr.forEach((v) => c.set(v, (c.get(v) || 0) + 1));
        let best = null, n = 0;
        c.forEach((v, k) => { if (v > n) { n = v; best = k; } });
        return { name: best, count: n };
    };

    async function run() {
        const card = document.querySelector('#calendar .calendar-card:has(.cal-status--next)')
                  || document.querySelector('#calendar .cal-status--next');
        const host = card && (card.closest ? card.closest('.calendar-card') : null) || card;
        if (!host || host.dataset.history === '1') return false;

        // The circuit name lives in the calendar data, not reliably in the card.
        const cal = globalVar('raceCalendar2026') || globalVar('raceCalendar') || [];
        const now = new Date();
        const next = cal.find((r) => new Date(r.date) >= now);
        if (!next || !next.circuit) return false;

        host.dataset.history = '1';
        injectCSS();

        // Everything below awaits the network for a second or two, and the
        // calendar redraws in that window — so the element captured above can
        // be detached by the time the markup is ready. Writing into it then
        // succeeds silently and shows nothing. Re-find the live card instead.
        const liveHost = () =>
            document.querySelector('#calendar .calendar-card:has(.cal-status--next)')
            || (document.querySelector('#calendar .cal-status--next') || {}).closest?.('.calendar-card')
            || null;

        try {
            const id = await circuitId(next.circuit);
            if (!id) { console.info('[history] no circuit id for ' + next.circuit); return true; }

            const [wins, pol] = [await winners(id), await poles(id).catch(() => [])];
            if (!wins.length) return true;

            const topWin = mode(wins.map((w) => w.name));
            const topTeam = mode(wins.map((w) => w.team));
            const topPole = pol.length ? mode(pol) : null;

            // Jolpica returns results oldest-first, so slicing from the front
            // gave "recent winners" of 1950-1957. Newest first.
            const recent = wins.slice().sort((a, b) => Number(b.year) - Number(a.year))
                .slice(0, 6).map((w) =>
                '<div class="ch__row"><span class="ch__yr">' + esc(w.year) + '</span>' +
                '<span class="ch__win">' + esc(surname(w.name)) + '</span>' +
                '<span class="ch__team">' + esc(w.team) + '</span></div>').join('');

            const target = liveHost() || host;
            if (target.querySelector('.ch')) return true;      // already drawn
            target.dataset.history = '1';
            target.insertAdjacentHTML('beforeend',
                '<div class="ch">' +
                '<span class="ch__k">Form at this circuit · ' + wins.length + ' races</span>' +
                '<div class="ch__top">' +
                '  <div class="ch__stat"><b>' + esc(surname(topWin.name)) + '</b>' +
                '    <span>' + topWin.count + ' win' + (topWin.count === 1 ? '' : 's') + ' here</span></div>' +
                (topPole && topPole.name ?
                '  <div class="ch__stat"><b>' + esc(surname(topPole.name)) + '</b>' +
                '    <span>' + topPole.count + ' pole' + (topPole.count === 1 ? '' : 's') + '</span></div>' : '') +
                '  <div class="ch__stat"><b>' + esc(topTeam.name) + '</b>' +
                '    <span>' + topTeam.count + ' team win' + (topTeam.count === 1 ? '' : 's') + '</span></div>' +
                '</div>' +
                '<span class="ch__k">Recent winners</span>' +
                '<div class="ch__list">' + recent + '</div></div>');

            console.info('[history] ' + next.circuit + ' — ' + wins.length + ' past races');
        } catch (e) {
            console.warn('[history]', e && e.message);
        }
        return true;
    }

    /* script.js rebuilds the calendar grid on every search, filter and sort,
       which replaces the next-race card and takes this block with it. The
       first version stopped retrying after one success, so the history
       silently vanished the moment anyone typed in the search box — and on a
       cold origin it was gone before it was ever seen. Watch the grid and
       rebuild. The 30-day cache means a redraw costs no requests. */
    function watch() {
        const grid = document.getElementById('calendar-grid')
                  || document.querySelector('#calendar .calendar-grid');
        if (!grid || grid.dataset.histWatched === '1') return;
        grid.dataset.histWatched = '1';
        let queued = false;
        new MutationObserver(() => {
            if (queued) return;
            queued = true;
            setTimeout(() => { queued = false; run(); }, 150);
        }).observe(grid, { childList: true });
    }

    function boot() {
        watch();
        run().then((ok) => {
            if (ok) return;
            let n = 0;
            const t = setInterval(() => {
                watch();
                run().then((done) => { if (done || ++n > 60) clearInterval(t); });
            }, 1200);
        });
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 900), { once: true });
    setTimeout(boot, 2600);
})();
