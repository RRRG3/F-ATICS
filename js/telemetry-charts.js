/* ══════════════════════════════════════════════════════════════════
   F-ATICS · TELEMETRY CHARTS
   Four views built from OpenF1 data the site was already entitled to
   and never asked for:

     · Race trace   — position by lap, the defining F1 chart
     · Gap to leader— whether the race closed up or stretched out
     · Race control — flags, safety cars, penalties: the narrative
     · Sector times — where each driver actually finds their lap time

   /position, /race_control and /intervals were completely unused.
   Sector durations were already arriving inside /laps and thrown away
   in favour of the lap total.

   Transport reuses session-extras' cache keys ("f1tel:<path>"), so a
   warm cache costs nothing and /laps is usually already there.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const API = 'https://api.openf1.org/v1';
    const GAP = 420;
    const TTL = 12 * 60 * 60 * 1000;
    let chain = Promise.resolve();
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));
    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };

    // Charts are created while the drawer is still closed, so Chart.js
    // measures a collapsed container and bakes that width onto the canvas
    // (261px on a 1400px screen). Keep the instances and re-measure them
    // whenever the container actually changes size.
    const CHARTS = [];

    function watchSize(wrap, chart) {
        CHARTS.push(chart);
        if (typeof ResizeObserver === 'function') {
            let last = 0;
            new ResizeObserver((entries) => {
                const w = entries[0].contentRect.width;
                if (w > 0 && Math.abs(w - last) > 1) { last = w; chart.resize(); }
            }).observe(wrap);
        }
    }

    const INK = '#EDE3CC';
    const DIM = 'rgba(237,227,204,0.55)';
    const GRID = 'rgba(214,168,96,0.14)';


    const CSS = `
.tcharts { display: grid; gap: clamp(28px, 4vw, 46px); margin-bottom: clamp(28px, 4vw, 46px); }
.trace__wrap { position: relative; padding: 16px 12px 8px; border: 1px solid var(--line);
    border-radius: 8px; background: var(--surface); }
.trace__wrap canvas { max-width: 100%; }

/* Race control log */
.rc { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px;
    max-height: 460px; overflow-y: auto; border: 1px solid var(--line);
    border-radius: 8px; background: var(--surface); padding: 10px; }
.rc__i { display: grid; grid-template-columns: 46px 104px minmax(0, 1fr);
    gap: 12px; align-items: baseline; padding: 9px 12px; border-radius: 4px;
    border-left: 3px solid transparent; background: var(--surface-2); }
.rc__lap { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;
    color: var(--fg-mute); }
.rc__cat { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--fg-mute); }
.rc__msg { font-size: 13px; line-height: 1.5; color: var(--fg-dim); }
.rc__who { color: var(--fg); font-weight: 600; }
.rc__i.is-yellow { border-left-color: #E4C05A; }
.rc__i.is-red    { border-left-color: #D8503F; }
.rc__i.is-green  { border-left-color: #3E8E5A; }
.rc__i.is-blue   { border-left-color: #2F6FA8; }
.rc__i.is-sc     { border-left-color: #E8A33D; }
.rc__i.is-chequered { border-left-color: var(--fg); }

/* Sector table */
.sec__c { min-width: 128px; }
.sec__v { display: block; font-variant-numeric: tabular-nums; }
.sec__v.is-best { color: #B682E0; font-weight: 600; }
.sec__d { display: block; font-family: var(--font-mono); font-size: 9.5px;
    color: var(--fg-mute); margin-top: 2px; }
.sec__bar { display: block; height: 3px; margin-top: 5px; border-radius: 2px;
    background: var(--line); overflow: hidden; max-width: 108px; }
.sec__bar i { display: block; height: 100%; border-radius: 2px; opacity: 0.8; }
.sec__ideal { font-variant-numeric: tabular-nums; color: var(--fg); font-weight: 600; }

/* Mobile: the classification table carries a hard min-width of 640px, and
   nothing around it scrolled — so instead of the table scrolling inside its
   own box, it stretched the whole section and the entire telemetry drawer
   scrolled sideways on a phone (body 690px in a 375px viewport). Wide
   content scrolls in its own container; the section never does. */
.drawer .sess-host,
.drawer .sess { min-width: 0; max-width: 100%; }

/* The wrapper is a grid whose single column defaults to auto, so the track
   sizes to its widest item's max-content — 640px, because of the table's
   min-width. max-width:100% on the child cannot win that argument; the
   track itself has to be told it may shrink. */
.drawer .telemetry-wrapper,
.drawer .tcharts,
.drawer .xtra-host { grid-template-columns: minmax(0, 1fr); min-width: 0; }
.drawer .tcharts > *,
.drawer .xtra-host > *,
.drawer .telemetry-wrapper > * { min-width: 0; }
.drawer .sess__tablewrap { overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch; }

/* A <canvas> is a replaced element: Chart.js writes a pixel width onto it at
   render time, and that width then forces the layout open. The original
   lap-time chart was drawn before this stylesheet existed, while the table
   was still holding the section at 640px, so it baked in 602px and kept the
   drawer wide even after the table was fixed. */
.drawer .sess canvas,
.drawer .tcharts canvas { max-width: 100% !important; }

@media (max-width: 760px) {
  .rc__i { grid-template-columns: 40px minmax(0, 1fr); }
  .rc__cat { display: none; }
  /* Four stat tiles across is 94px each at 375px — unreadable. */
  .drawer .sess__stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .trace__wrap { padding: 10px 6px 4px; }
}
`;

    function injectCSS() {
        if (document.getElementById('telemetry-charts-css')) return;
        const el = document.createElement('style');
        el.id = 'telemetry-charts-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    async function get(path) {
        const key = 'f1tel:' + path;
        try {
            const hit = JSON.parse(localStorage.getItem(key) || 'null');
            if (hit && Date.now() - hit.t < TTL) return hit.d;
        } catch (_) {}
        const run = chain.then(async () => {
            await nap(GAP);
            for (let a = 0; a < 3; a++) {
                const r = await fetch(API + path);
                if (r.ok) return r.json();
                if (r.status !== 429 || a === 2) throw new Error(path + ' → ' + r.status);
                await nap(1500 * (a + 1));
            }
        });
        chain = run.catch(() => {});
        const data = await run;
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (_) {}
        return data;
    }

    /* ── Lap boundaries ──────────────────────────────────────────
       /position and /intervals are timestamped, not lap-numbered, so
       everything is bucketed against when the leader started each lap. */
    function lapClock(laps) {
        const starts = new Map();          // lap number → earliest start seen
        laps.forEach((l) => {
            if (!l.date_start || !l.lap_number) return;
            const t = Date.parse(l.date_start);
            if (!Number.isFinite(t)) return;
            const cur = starts.get(l.lap_number);
            if (cur === undefined || t < cur) starts.set(l.lap_number, t);
        });
        const nums = [...starts.keys()].sort((a, b) => a - b);
        return { nums, at: (n) => starts.get(n) };
    }

    // Last value on or before each lap boundary, per driver.
    function byLap(rows, clock, valueOf) {
        const out = new Map();             // driver → Map(lap → value)
        const sorted = rows
            .filter((r) => r.date && r.driver_number != null)
            .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

        const cursor = new Map();
        let li = 0;
        const bounds = clock.nums.map((n) => ({ n, t: clock.at(n) }));

        sorted.forEach((r) => {
            const t = Date.parse(r.date);
            while (li + 1 < bounds.length && bounds[li + 1].t <= t) {
                // Close off the lap we are leaving.
                bounds[li].done = true;
                li++;
            }
            cursor.set(r.driver_number, valueOf(r));
            const lap = bounds[li].n;
            if (!out.has(r.driver_number)) out.set(r.driver_number, new Map());
            out.get(r.driver_number).set(lap, valueOf(r));
        });
        return out;
    }

    function teamColour(d) {
        return d && d.team_colour ? '#' + String(d.team_colour).replace(/^#/, '') : '#8894A8';
    }

    /* ── 1. Race trace ───────────────────────────────────────────── */
    function raceTrace(host, positions, drivers, clock, order) {
        if (!positions.length || !clock.nums.length) return;

        const perDriver = byLap(positions, clock, (r) => r.position);
        const laps = clock.nums;

        // Forward-fill: a driver keeps their position until it changes.
        const sets = [];
        const rank = (n) => { const i = order.indexOf(n); return i < 0 ? 99 : i; };
        [...perDriver.keys()]
            .sort((a, b) => rank(a) - rank(b))
            .forEach((num) => {
                const m = perDriver.get(num);
                const d = drivers.get(num) || {};
                let last = null;
                const data = laps.map((l) => {
                    if (m.has(l)) last = m.get(l);
                    return last;
                });
                if (data.every((v) => v == null)) return;
                sets.push({
                    label: d.name_acronym || String(num),
                    data,
                    borderColor: teamColour(d),
                    backgroundColor: teamColour(d),
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0,
                    spanGaps: true,
                });
            });
        if (!sets.length) return;

        const sec = document.createElement('section');
        sec.className = 'xtra';
        sec.innerHTML =
            '<h3 class="xtra__h">Race trace</h3>' +
            '<p class="xtra__s">Every driver’s position, lap by lap. Overtakes, pit cycles ' +
            'and safety-car bunching all read off this one chart. Click a driver in the key ' +
            'to isolate their line.</p>' +
            '<div class="trace__wrap"><canvas class="trace__c" height="440"></canvas></div>';

        // The trace is the headline visual, so it goes ahead of the lap-time
        // chart rather than below the classification table. The lap-time
        // chart stays underneath it as the secondary, pace-focused view.
        const sess = document.querySelector('#live-telemetry .sess');
        const lapChart = sess && sess.querySelector('.sess__chartwrap');
        if (lapChart) sess.insertBefore(sec, lapChart); else host.appendChild(sec);

        watchSize(sec.querySelector('.trace__wrap'), new window.Chart(sec.querySelector('canvas'), {
            type: 'line',
            data: { labels: laps, datasets: sets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', intersect: false },
                scales: {
                    y: {
                        reverse: true,                 // P1 belongs at the top
                        min: 1,
                        max: Math.max(...sets.flatMap((s) => s.data.filter(Number.isFinite))) || 20,
                        ticks: { stepSize: 1, color: DIM, font: { size: 10 } },
                        grid: { color: GRID },
                        title: { display: true, text: 'Position', color: DIM, font: { size: 10 } },
                    },
                    x: {
                        ticks: { color: DIM, font: { size: 10 }, maxTicksLimit: 14 },
                        grid: { color: GRID },
                        title: { display: true, text: 'Lap', color: DIM, font: { size: 10 } },
                    },
                },
                plugins: {
                    legend: { labels: { color: INK, boxWidth: 10, font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: (c) => c.dataset.label + '  P' + c.parsed.y,
                            title: (c) => 'Lap ' + c[0].label,
                        },
                    },
                },
            },
        }));
    }

    /* ── 2. Gap to leader ────────────────────────────────────────── */
    function gapChart(host, intervals, drivers, clock, order) {
        if (!intervals.length || !clock.nums.length) return;

        const perDriver = byLap(intervals, clock, (r) => r.gap_to_leader);
        const laps = clock.nums;
        const top = order.slice(0, 10);

        const sets = top.map((num) => {
            const m = perDriver.get(num);
            if (!m) return null;
            const d = drivers.get(num) || {};
            let last = null;
            const data = laps.map((l) => {
                if (m.has(l)) {
                    const v = m.get(l);
                    // A lapped car reports "+1 LAP" as a string; drop those.
                    last = typeof v === 'number' ? v : null;
                }
                return last;
            });
            if (data.every((v) => v == null)) return null;
            return {
                label: d.name_acronym || String(num),
                data,
                borderColor: teamColour(d),
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.2,
                spanGaps: true,
            };
        }).filter(Boolean);
        if (sets.length < 2) return;

        const sec = document.createElement('section');
        sec.className = 'xtra';
        sec.innerHTML =
            '<h3 class="xtra__h">Gap to leader</h3>' +
            '<p class="xtra__s">Seconds behind the race leader, lap by lap, for the top ten. ' +
            'Lines converging means the field is closing up — usually a safety car; ' +
            'lines fanning out means someone is driving away with it.</p>' +
            '<div class="trace__wrap"><canvas height="320"></canvas></div>';
        host.appendChild(sec);

        watchSize(sec.querySelector('.trace__wrap'), new window.Chart(sec.querySelector('canvas'), {
            type: 'line',
            data: { labels: laps, datasets: sets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', intersect: false },
                scales: {
                    y: {
                        ticks: { color: DIM, font: { size: 10 }, callback: (v) => '+' + v + 's' },
                        grid: { color: GRID },
                    },
                    x: {
                        ticks: { color: DIM, font: { size: 10 }, maxTicksLimit: 14 },
                        grid: { color: GRID },
                        title: { display: true, text: 'Lap', color: DIM, font: { size: 10 } },
                    },
                },
                plugins: { legend: { labels: { color: INK, boxWidth: 10, font: { size: 10 } } } },
            },
        }));
    }

    /* ── 3. Race control ─────────────────────────────────────────── */
    const FLAG_CLASS = {
        YELLOW: 'is-yellow', 'DOUBLE YELLOW': 'is-yellow', RED: 'is-red',
        GREEN: 'is-green', CHEQUERED: 'is-chequered', BLUE: 'is-blue',
    };

    function raceControl(host, msgs, drivers) {
        const rows = (msgs || []).filter((m) => m.message);
        if (!rows.length) return;

        const items = rows
            .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
            .map((m) => {
                const flag = (m.flag || '').toUpperCase();
                const cat = (m.category || '').toUpperCase();
                let cls = FLAG_CLASS[flag] || '';
                if (!cls && /SAFETY/.test(cat + ' ' + m.message)) cls = 'is-sc';
                const who = m.driver_number != null && drivers.get(m.driver_number)
                    ? (drivers.get(m.driver_number).name_acronym || ('#' + m.driver_number))
                    : '';
                return '<li class="rc__i ' + cls + '">' +
                    '<span class="rc__lap">' + (m.lap_number != null ? 'L' + m.lap_number : '—') + '</span>' +
                    '<span class="rc__cat">' + esc(m.category || '') + '</span>' +
                    '<span class="rc__msg">' + esc(m.message) +
                        (who ? ' <b class="rc__who">' + esc(who) + '</b>' : '') + '</span>' +
                    '</li>';
            }).join('');

        const sec = document.createElement('section');
        sec.className = 'xtra';
        sec.innerHTML =
            '<h3 class="xtra__h">Race control</h3>' +
            '<p class="xtra__s">' + rows.length + ' messages from race control, in order — flags, ' +
            'safety cars, investigations and penalties. This is where the spikes in the charts ' +
            'above get their explanation.</p>' +
            '<ol class="rc">' + items + '</ol>';
        host.appendChild(sec);
    }

    /* ── 4. Sector times ─────────────────────────────────────────── */
    function sectors(host, laps, drivers, order) {
        const best = new Map();            // driver → [s1, s2, s3]
        laps.forEach((l) => {
            const s = [l.duration_sector_1, l.duration_sector_2, l.duration_sector_3];
            if (!s.every((v) => Number.isFinite(v) && v > 0)) return;
            const cur = best.get(l.driver_number) || [Infinity, Infinity, Infinity];
            for (let i = 0; i < 3; i++) if (s[i] < cur[i]) cur[i] = s[i];
            best.set(l.driver_number, cur);
        });
        if (best.size < 2) return;

        const ideal = [0, 1, 2].map((i) => Math.min(...[...best.values()].map((b) => b[i])));
        const rank = (n) => { const i = order.indexOf(n); return i < 0 ? 99 : i; };

        const rows = [...best.keys()].sort((a, b) => rank(a) - rank(b)).slice(0, 14).map((num) => {
            const d = drivers.get(num) || {};
            const b = best.get(num);
            const cells = b.map((v, i) => {
                const delta = v - ideal[i];
                const isBest = delta < 0.0005;
                // Bar length is the shortfall against the session's best sector,
                // capped so one wild sector cannot flatten everyone else.
                const w = Math.max(4, 100 - Math.min(delta / 1.2, 1) * 96);
                return '<td class="sec__c">' +
                    '<span class="sec__v' + (isBest ? ' is-best' : '') + '">' + v.toFixed(3) + '</span>' +
                    '<span class="sec__d">' + (isBest ? 'best' : '+' + delta.toFixed(3)) + '</span>' +
                    '<span class="sec__bar"><i style="width:' + w.toFixed(1) + '%;background:' +
                        teamColour(d) + '"></i></span></td>';
            }).join('');
            const theoretical = b.reduce((a, v) => a + v, 0);
            // A lap is minutes:seconds everywhere else in F1; "74.373" is not
            // a lap time anyone reads.
            const lapStr = theoretical >= 60
                ? Math.floor(theoretical / 60) + ':' +
                  (theoretical % 60).toFixed(3).padStart(6, '0')
                : theoretical.toFixed(3);
            return '<tr><td><span class="sess__dot" style="background:' + teamColour(d) + '"></span>' +
                esc(d.name_acronym || num) + '</td>' + cells +
                '<td class="sec__ideal">' + lapStr + '</td></tr>';
        }).join('');

        const sec = document.createElement('section');
        sec.className = 'xtra';
        sec.innerHTML =
            '<h3 class="xtra__h">Sector times</h3>' +
            '<p class="xtra__s">Each driver’s best sector of the session, and the ideal lap those ' +
            'three would make together. A lap time is one number; this shows which third of the ' +
            'circuit it came from.</p>' +
            '<div class="sess__tablewrap"><table class="sess__table sec__t"><thead><tr>' +
            '<th>Driver</th><th>Sector 1</th><th>Sector 2</th><th>Sector 3</th><th>Ideal lap</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
        host.appendChild(sec);
    }

    /* ── Boot ────────────────────────────────────────────────────── */
    let started = false;

    async function boot(sessionKey, driverList, order) {
        if (started) return;
        const wrap = document.querySelector('#live-telemetry .telemetry-wrapper');
        if (!wrap || wrap.querySelector('.tcharts')) return;
        if (typeof window.Chart !== 'function') return;   // Chart.js not up yet
        started = true;
        injectCSS();
        // Charts drawn before the stylesheet landed measured a wider parent;
        // let Chart.js re-measure now that the constraints are in place.
        setTimeout(() => window.dispatchEvent(new Event('resize')), 60);

        const drivers = new Map((driverList || []).map((d) => [d.driver_number, d]));
        const host = document.createElement('div');
        host.className = 'tcharts';
        // Ahead of the existing extras, so the race reads before its details.
        const slot = wrap.querySelector('.xtra-host');
        if (slot) wrap.insertBefore(host, slot); else wrap.appendChild(host);

        const q = (p) => get(p + '?session_key=' + sessionKey).catch(() => []);
        const laps = (await q('/laps')) || [];
        const clock = lapClock(laps);

        try { raceTrace(host, (await q('/position')) || [], drivers, clock, order); }
        catch (e) { console.warn('[charts] trace', e && e.message); }

        try { gapChart(host, (await q('/intervals')) || [], drivers, clock, order); }
        catch (e) { console.warn('[charts] gap', e && e.message); }

        try { sectors(host, laps, drivers, order); }
        catch (e) { console.warn('[charts] sectors', e && e.message); }

        try { raceControl(host, (await q('/race_control')) || [], drivers); }
        catch (e) { console.warn('[charts] race control', e && e.message); }

        console.info('[charts] race trace, gap, sectors and race control rendered');
    }

    function start(detail) {
        const { sessionKey, drivers, order } = detail || {};
        if (sessionKey && drivers) boot(sessionKey, drivers, order || []);
    }

    document.addEventListener('telemetry:session', (e) => start(e.detail));

    document.addEventListener('room:open', () => {
        setTimeout(() => CHARTS.forEach((c) => { try { c.resize(); } catch (_) {} }), 260);
    });

    // Backstop: one event is one chance to be listening.
    let tries = 0;
    const poll = setInterval(() => {
        if (window.__telemetrySession) { start(window.__telemetrySession); clearInterval(poll); }
        else if (++tries > 90) clearInterval(poll);
    }, 1000);
})();
