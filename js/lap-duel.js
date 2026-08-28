/* ══════════════════════════════════════════════════════════════════
   F-ATICS · LAP DUEL
   The broadcast graphic, built from data that was sitting there.

   OpenF1's /location returns x/y/z for every car at ~3.7 Hz, and
   /car_data returns speed, throttle, brake, gear and DRS at the same
   rate. Neither was used anywhere on the site. For a single lap that
   is roughly 275 points per driver — nothing.

   Put two drivers' fastest laps side by side and you get:

     · the circuit drawn from real GPS coordinates, not an SVG traced
       by hand, with the racing line painted by speed
     · both speed traces against distance round the lap
     · a delta line — cumulative time gained or lost, metre by metre,
       which is the only view that actually answers "where did those
       three tenths go?"

   Distance is integrated from the coordinates, so the two laps are
   compared at the same point on the track rather than the same
   timestamp. That is what makes the delta meaningful.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const API = 'https://api.openf1.org/v1';
    const TTL = 12 * 60 * 60 * 1000;
    let chain = Promise.resolve();
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));
    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };

    const INK = '#EDE3CC';
    const DIM = 'rgba(237,227,204,0.55)';
    const GRID = 'rgba(214,168,96,0.14)';

    const CSS = `
.duel__pick { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 18px; }
.duel__f { display: grid; gap: 6px; }
.duel__f label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--fg-mute); }
.duel__f select { min-width: 190px; padding: 10px 12px; border-radius: 5px;
    border: 1px solid var(--line); background: var(--surface); color: var(--fg);
    font-family: inherit; font-size: 13px; }
.duel__go { padding: 11px 22px; border-radius: 5px; border: 1px solid var(--accent);
    background: transparent; color: var(--accent-text, var(--accent)); cursor: pointer;
    font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; }
.duel__go:hover:not(:disabled) { background: var(--accent); color: #fff; }
.duel__go:disabled { opacity: 0.45; cursor: default; }

.duel__body { display: grid; gap: 18px; min-width: 0; }
.duel__top { display: grid; grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
    gap: 18px; align-items: start; }
.duel__mapwrap, .duel__chart { border: 1px solid var(--line); border-radius: 8px;
    background: var(--surface); padding: 14px; min-width: 0; }
/* maintainAspectRatio:false makes Chart.js fill its container, so the
   container is what has to carry the height. Without this the speed trace
   grew to roughly 700px and pushed the delta chart off the page. */
.duel__box { position: relative; height: 210px; min-width: 0; }
.duel__box + .duel__box { height: 170px; margin-top: 12px;
    border-top: 1px solid var(--line); padding-top: 12px; }
.duel__map { display: block; width: 100%; height: auto; }
.duel__legend { display: flex; align-items: center; gap: 8px; margin-top: 10px;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--fg-mute); }
.duel__ramp { flex: 1; height: 4px; border-radius: 2px;
    background: linear-gradient(90deg, #2F6FA8 0%, #4FD1C5 35%, #E4C05A 70%, #E2503C 100%); }

.duel__heads { display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px;
    align-items: center; margin-bottom: 4px; }
.duel__who { font-family: var(--font-display); font-size: clamp(17px, 2vw, 22px);
    font-weight: 700; letter-spacing: -0.02em; text-transform: uppercase; color: var(--fg); }
.duel__who.r { text-align: right; }
.duel__who span { display: block; font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 0.1em; color: var(--fg-mute); margin-top: 3px; font-weight: 400; }
.duel__gap { font-family: var(--font-display); font-size: clamp(20px, 2.6vw, 30px);
    font-weight: 700; letter-spacing: -0.03em; color: var(--accent-text, var(--accent));
    font-variant-numeric: tabular-nums; text-align: center; }
.duel__gap span { display: block; font-family: var(--font-mono); font-size: 8.5px;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-mute); margin-top: 4px; }

.duel__note { font-size: 12px; line-height: 1.6; color: var(--fg-mute); }
.duel__status { font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim); }

@media (max-width: 860px) {
  .duel__top { grid-template-columns: minmax(0, 1fr); }
  .duel__f select { min-width: 100%; }
  .duel__f { width: 100%; }
}
`;

    function injectCSS() {
        if (document.getElementById('lap-duel-css')) return;
        const el = document.createElement('style');
        el.id = 'lap-duel-css';
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
            await nap(420);
            for (let a = 0; a < 3; a++) {
                const r = await fetch(API + path);
                if (r.ok) return r.json();
                if (r.status !== 429 || a === 2) throw new Error(path + ' → ' + r.status);
                await nap(1500 * (a + 1));
            }
        });
        chain = run.catch(() => {});
        const data = await run;
        // Per-lap payloads are small, but the quota is not infinite.
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (_) {}
        return data;
    }

    const teamColour = (d) => (d && d.team_colour ? '#' + String(d.team_colour).replace(/^#/, '') : '#8894A8');

    /* ── Build one driver's lap ──────────────────────────────────── */
    async function buildLap(sessionKey, lap) {
        const t0 = new Date(lap.date_start);
        const t1 = new Date(t0.getTime() + lap.lap_duration * 1000 + 500);
        const q = '&date>=' + t0.toISOString() + '&date<=' + t1.toISOString();
        const base = '?session_key=' + sessionKey + '&driver_number=' + lap.driver_number + q;

        const loc = (await get('/location' + base)) || [];
        const car = (await get('/car_data' + base)) || [];
        if (loc.length < 20 || car.length < 20) return null;

        const start = t0.getTime();
        const pts = loc
            .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
            .map((p) => ({ t: (Date.parse(p.date) - start) / 1000, x: p.x, y: p.y }))
            .filter((p) => p.t >= 0)
            .sort((a, b) => a.t - b.t);
        if (pts.length < 20) return null;

        // Integrate distance along the path so the two laps can be compared
        // at the same point on the circuit rather than the same clock time.
        let d = 0;
        pts[0].d = 0;
        for (let i = 1; i < pts.length; i++) {
            d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
            pts[i].d = d;
        }
        const total = d || 1;

        // Attach speed by nearest telemetry sample.
        const samples = car
            .map((c) => ({ t: (Date.parse(c.date) - start) / 1000, speed: c.speed,
                           throttle: c.throttle, brake: c.brake, gear: c.n_gear }))
            .filter((c) => Number.isFinite(c.t))
            .sort((a, b) => a.t - b.t);

        let si = 0;
        pts.forEach((p) => {
            while (si + 1 < samples.length && Math.abs(samples[si + 1].t - p.t) <= Math.abs(samples[si].t - p.t)) si++;
            const s = samples[si] || {};
            p.speed = s.speed || 0;
            p.throttle = s.throttle || 0;
            p.brake = s.brake || 0;
        });

        return { lap, pts, total, dur: lap.lap_duration };
    }

    // Time at a given fraction of the lap, linearly interpolated.
    function timeAt(run, frac) {
        const target = frac * run.total;
        const p = run.pts;
        let lo = 0, hi = p.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (p[mid].d < target) lo = mid; else hi = mid;
        }
        const a = p[lo], b = p[hi];
        const span = (b.d - a.d) || 1;
        return a.t + (b.t - a.t) * ((target - a.d) / span);
    }

    function valueAt(run, frac, key) {
        const target = frac * run.total;
        const p = run.pts;
        let lo = 0, hi = p.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (p[mid].d < target) lo = mid; else hi = mid;
        }
        return p[hi][key];
    }

    /* ── Track map, painted by speed ─────────────────────────────── */
    function speedColour(v, lo, hi) {
        const t = Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1)));
        // slow → fast : blue, teal, gold, red
        const stops = [[47, 111, 168], [79, 209, 197], [228, 192, 90], [226, 80, 60]];
        const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
        const f = t * (stops.length - 1) - seg;
        const c = stops[seg].map((v0, i) => Math.round(v0 + (stops[seg + 1][i] - v0) * f));
        return 'rgb(' + c.join(',') + ')';
    }

    function trackMap(run) {
        const xs = run.pts.map((p) => p.x), ys = run.pts.map((p) => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const w = (maxX - minX) || 1, h = (maxY - minY) || 1;
        const pad = Math.max(w, h) * 0.06;

        const speeds = run.pts.map((p) => p.speed).filter(Number.isFinite);
        const lo = Math.min(...speeds), hi = Math.max(...speeds);

        // One short segment per sample, coloured by the speed carried there.
        const segs = [];
        for (let i = 1; i < run.pts.length; i++) {
            const a = run.pts[i - 1], b = run.pts[i];
            segs.push('<line x1="' + a.x + '" y1="' + (-a.y) + '" x2="' + b.x + '" y2="' + (-b.y) +
                '" stroke="' + speedColour(b.speed, lo, hi) + '" stroke-width="' +
                (Math.max(w, h) * 0.012).toFixed(1) + '" stroke-linecap="round"/>');
        }

        return '<svg class="duel__map" viewBox="' + (minX - pad) + ' ' + (-maxY - pad) + ' ' +
            (w + pad * 2) + ' ' + (h + pad * 2) + '" role="img" ' +
            'aria-label="Circuit map drawn from GPS, coloured by speed">' + segs.join('') + '</svg>' +
            '<div class="duel__legend"><span>' + Math.round(lo) + ' km/h</span>' +
            '<i class="duel__ramp"></i><span>' + Math.round(hi) + ' km/h</span></div>';
    }

    /* ── Render ──────────────────────────────────────────────────── */
    const CHARTS = [];

    function render(host, a, b, da, db) {
        const N = 200;
        const labels = [];
        const speedA = [], speedB = [], delta = [];
        for (let i = 0; i <= N; i++) {
            const f = i / N;
            labels.push(Math.round(f * 100));
            speedA.push(valueAt(a, f, 'speed'));
            speedB.push(valueAt(b, f, 'speed'));
            // Positive = driver A is ahead on time at this point of the lap.
            delta.push(+(timeAt(b, f) - timeAt(a, f)).toFixed(3));
        }

        const cA = teamColour(da), cB = teamColour(db);
        const gap = b.dur - a.dur;
        const lapStr = (v) => (v >= 60 ? Math.floor(v / 60) + ':' + (v % 60).toFixed(3).padStart(6, '0') : v.toFixed(3));

        host.innerHTML =
            '<div class="duel__heads">' +
            '  <div class="duel__who">' + esc(da.name_acronym || a.lap.driver_number) +
            '    <span>' + lapStr(a.dur) + ' · lap ' + a.lap.lap_number + '</span></div>' +
            '  <div class="duel__gap">' + (gap >= 0 ? '+' : '') + gap.toFixed(3) +
            '    <span>' + esc(db.name_acronym || '') + ' delta</span></div>' +
            '  <div class="duel__who r">' + esc(db.name_acronym || b.lap.driver_number) +
            '    <span>' + lapStr(b.dur) + ' · lap ' + b.lap.lap_number + '</span></div>' +
            '</div>' +
            '<div class="duel__top">' +
            '  <div class="duel__mapwrap">' + trackMap(a) + '</div>' +
            '  <div class="duel__chart">' +
            '    <div class="duel__box"><canvas></canvas></div>' +
            '    <div class="duel__box"><canvas></canvas></div></div>' +
            '</div>' +
            '<p class="duel__note">Both laps are sampled by distance round the circuit rather than ' +
            'by clock time, which is what makes the delta readable: where the line rises, ' +
            esc(da.name_acronym || 'the first driver') + ' is gaining. Distance is integrated from ' +
            'each car’s own GPS trace, so two different racing lines give slightly different path ' +
            'lengths — the shape of the delta is sound, but treat the last tenth of it as ' +
            'approximate. The headline gap above is the real lap-time difference.</p>';

        const [c1, c2] = host.querySelectorAll('canvas');

        CHARTS.push(new window.Chart(c1, {
            type: 'line',
            data: { labels, datasets: [
                { label: da.name_acronym, data: speedA, borderColor: cA, borderWidth: 2, pointRadius: 0, tension: 0.25 },
                { label: db.name_acronym, data: speedB, borderColor: cB, borderWidth: 2,
                  pointRadius: 0, tension: 0.25, borderDash: [5, 3] },
            ] },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: { ticks: { color: DIM, font: { size: 9 }, callback: (v) => v + '' }, grid: { color: GRID },
                         title: { display: true, text: 'Speed (km/h)', color: DIM, font: { size: 9 } } },
                    x: { ticks: { color: DIM, font: { size: 9 }, maxTicksLimit: 10, callback: (v, i) => labels[i] + '%' },
                         grid: { color: GRID } },
                },
                plugins: { legend: { labels: { color: INK, boxWidth: 10, font: { size: 10 } } } },
            },
        }));

        CHARTS.push(new window.Chart(c2, {
            type: 'line',
            data: { labels, datasets: [{
                label: 'Delta', data: delta, borderColor: cA, borderWidth: 2, pointRadius: 0,
                tension: 0.25, fill: { target: 'origin', above: cA + '33', below: cB + '33' },
            }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: { ticks: { color: DIM, font: { size: 9 },
                                 callback: (v) => (v > 0 ? '+' : '') + Number(v).toFixed(2) + 's' },
                         grid: { color: GRID },
                         title: { display: true, text: 'Time gained', color: DIM, font: { size: 9 } } },
                    x: { ticks: { color: DIM, font: { size: 9 }, maxTicksLimit: 10, callback: (v, i) => labels[i] + '%' },
                         grid: { color: GRID },
                         title: { display: true, text: 'Distance round the lap', color: DIM, font: { size: 9 } } },
                },
                plugins: { legend: { display: false } },
            },
        }));
    }

    /* ── Boot ────────────────────────────────────────────────────── */
    let built = false;

    async function build(sessionKey, driverList) {
        if (built) return;
        const wrap = document.querySelector('#live-telemetry .telemetry-wrapper');
        if (!wrap || wrap.querySelector('.duel') || typeof window.Chart !== 'function') return;
        built = true;
        injectCSS();

        const drivers = new Map((driverList || []).map((d) => [d.driver_number, d]));
        const laps = (await get('/laps?session_key=' + sessionKey)) || [];

        // Each driver's fastest clean lap.
        const best = new Map();
        laps.forEach((l) => {
            if (!l.lap_duration || !l.date_start || l.is_pit_out_lap) return;
            const cur = best.get(l.driver_number);
            if (!cur || l.lap_duration < cur.lap_duration) best.set(l.driver_number, l);
        });
        if (best.size < 2) return;

        const ranked = [...best.values()].sort((a, b) => a.lap_duration - b.lap_duration);
        const opts = ranked.map((l) => {
            const d = drivers.get(l.driver_number) || {};
            return '<option value="' + l.driver_number + '">' +
                esc((d.name_acronym || l.driver_number) + '  ' + l.lap_duration.toFixed(3)) + '</option>';
        }).join('');

        const sec = document.createElement('section');
        sec.className = 'xtra duel';
        sec.innerHTML =
            '<h3 class="xtra__h">Lap duel</h3>' +
            '<p class="xtra__s">Two fastest laps, compared metre by metre. The circuit is drawn from ' +
            'the cars’ own GPS and painted by speed; the delta below shows exactly where the time ' +
            'changes hands.</p>' +
            '<div class="duel__pick">' +
            '  <div class="duel__f"><label for="duel-a">Driver</label><select id="duel-a">' + opts + '</select></div>' +
            '  <div class="duel__f"><label for="duel-b">Against</label><select id="duel-b">' + opts + '</select></div>' +
            '  <button class="duel__go" id="duel-go">Compare laps</button>' +
            '</div>' +
            '<div class="duel__body" id="duel-out"><p class="duel__status">Pick two drivers and compare.</p></div>';

        // Directly under the race trace, which sets up the same question.
        const tcharts = wrap.querySelector('.tcharts');
        if (tcharts) tcharts.insertBefore(sec, tcharts.children[1] || null);
        else wrap.appendChild(sec);

        const selA = sec.querySelector('#duel-a');
        const selB = sec.querySelector('#duel-b');
        const go = sec.querySelector('#duel-go');
        const out = sec.querySelector('#duel-out');
        selA.selectedIndex = 0;
        selB.selectedIndex = Math.min(1, ranked.length - 1);

        go.addEventListener('click', async () => {
            const na = +selA.value, nb = +selB.value;
            if (na === nb) { out.innerHTML = '<p class="duel__status">Pick two different drivers.</p>'; return; }
            go.disabled = true;
            out.innerHTML = '<p class="duel__status">Fetching both laps…</p>';
            try {
                const a = await buildLap(sessionKey, best.get(na));
                const b = await buildLap(sessionKey, best.get(nb));
                if (!a || !b) {
                    out.innerHTML = '<p class="duel__status">No position trace available for one of ' +
                        'these laps — OpenF1 does not carry GPS for every session.</p>';
                } else {
                    render(out, a, b, drivers.get(na) || {}, drivers.get(nb) || {});
                }
            } catch (e) {
                out.innerHTML = '<p class="duel__status">Could not load: ' + esc(e.message) + '</p>';
            }
            go.disabled = false;
        });

        console.info('[duel] ready — ' + ranked.length + ' drivers with a timed lap');
    }

    function start(detail) {
        const { sessionKey, drivers } = detail || {};
        if (sessionKey && drivers) build(sessionKey, drivers);
    }

    document.addEventListener('telemetry:session', (e) => start(e.detail));
    document.addEventListener('room:open', () => {
        setTimeout(() => CHARTS.forEach((c) => { try { c.resize(); } catch (_) {} }), 260);
    });

    let tries = 0;
    const poll = setInterval(() => {
        if (window.__telemetrySession) { start(window.__telemetrySession); clearInterval(poll); }
        else if (++tries > 90) clearInterval(poll);
    }, 1000);
})();
