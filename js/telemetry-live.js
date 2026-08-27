/* ══════════════════════════════════════════════════════════════════
   F-ATICS · SESSION TELEMETRY
   ═════════════════════════════════════════════════════════════════
   The panel used to say "live telemetry is only available during race
   weekends" and then show nothing — which is roughly 90% of the year.
   OpenF1 holds every completed session, so when nothing is running
   this falls back to the most recent one and shows real laps.

   Accuracy note: raw lap times are useless for pace comparison
   because in-laps, out-laps and safety-car laps are many seconds
   slow. Everything below is computed on CLEAN laps only — pit-out
   excluded, and anything slower than 107% of THAT DRIVER'S own best
   dropped. The cut is per driver, not against the session best: a
   backmarker's ordinary lap is not an outlier just because it is
   slower than the leader's.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const API = 'https://api.openf1.org/v1';
    const OUTLIER = 1.07;
    const LINES = 5;

    const fmt = (s) => {
        if (!Number.isFinite(s)) return '—';
        const m = Math.floor(s / 60);
        const r = (s - m * 60).toFixed(3).padStart(6, '0');
        return m > 0 ? m + ':' + r : r;
    };

    const median = (a) => {
        if (!a.length) return NaN;
        const s = [...a].sort((x, y) => x - y);
        const m = s.length >> 1;
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };

    // OpenF1 rate-limits hard and answers 429 rather than degrading, and a
    // laps payload is ~1400 rows. Requests are serialised with spacing,
    // retried with backoff, and cached — a finished session's laps are
    // immutable, so there is no reason to ask twice.
    const GAP = 350;
    const TTL = 12 * 60 * 60 * 1000;
    let chain = Promise.resolve();
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));

    async function get(path, opts) {
        const fresh = opts && opts.fresh;
        const key = 'f1tel:' + path;
        if (!fresh) {
            try {
                const hit = JSON.parse(localStorage.getItem(key) || 'null');
                if (hit && Date.now() - hit.t < TTL) return hit.d;
            } catch (_) { /* private mode */ }
        }

        const run = chain.then(async () => {
            await nap(GAP);
            for (let attempt = 0; attempt < 3; attempt++) {
                const r = await fetch(API + path);
                if (r.ok) return r.json();
                if (r.status !== 429 || attempt === 2) throw new Error(path + ' → ' + r.status);
                await nap(1500 * (attempt + 1));
            }
        });
        chain = run.catch(() => {});
        const data = await run;
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (_) {}
        return data;
    }

    async function pickSession() {
        const year = new Date().getFullYear();
        let all = await get('/sessions?year=' + year);
        if (!Array.isArray(all) || !all.length) {
            all = await get('/sessions?year=' + (year - 1));
        }
        if (!Array.isArray(all) || !all.length) return null;

        const now = Date.now();
        const live = all.find((s) =>
            new Date(s.date_start) <= now && now <= new Date(s.date_end));
        if (live) return { s: live, live: true };

        const done = all
            .filter((s) => new Date(s.date_end) < now)
            .sort((a, b) => new Date(b.date_end) - new Date(a.date_end));
        return done.length ? { s: done[0], live: false } : null;
    }

    function cleanLaps(laps) {
        const timed = laps.filter((l) => Number.isFinite(l.lap_duration) && !l.is_pit_out_lap);
        if (!timed.length) return [];
        const best = Math.min(...timed.map((l) => l.lap_duration));
        return timed.filter((l) => l.lap_duration <= best * OUTLIER);
    }

    function render(host, ctx) {
        const { session, live, drivers, laps } = ctx;

        const byDriver = new Map();
        laps.forEach((l) => {
            if (!byDriver.has(l.driver_number)) byDriver.set(l.driver_number, []);
            byDriver.get(l.driver_number).push(l);
        });

        const info = new Map(drivers.map((d) => [d.driver_number, d]));

        // Rank by median clean pace — the honest measure of who was quick,
        // rather than by a single fastest lap that may have been a tow.
        const ranked = [...byDriver.entries()]
            .map(([num, ls]) => {
                const clean = cleanLaps(ls);
                return {
                    num,
                    d: info.get(num),
                    laps: ls,
                    clean,
                    pace: median(clean.map((l) => l.lap_duration)),
                    best: clean.length ? Math.min(...clean.map((l) => l.lap_duration)) : NaN,
                    top: Math.max(...ls.map((l) => l.st_speed || 0)),
                };
            })
            .filter((r) => r.d && r.clean.length >= 3)
            .sort((a, b) => a.pace - b.pace);

        if (!ranked.length) return false;

        const fastest = ranked.reduce((a, b) => (a.best <= b.best ? a : b));
        const topSpeed = ranked.reduce((a, b) => (a.top >= b.top ? a : b));
        const when = new Date(session.date_start)
            .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        host.innerHTML =
            '<div class="sess">' +
            '  <div class="sess__head">' +
            '    <div>' +
            '      <p class="sess__eyebrow">' + (live ? 'Session in progress' : 'Most recent completed session') + '</p>' +
            '      <h3 class="sess__title">' + esc(session.country_name) + ' · ' + esc(session.session_name) + '</h3>' +
            '      <p class="sess__meta">' + esc(session.circuit_short_name || '') + ' · ' + when +
            ' · ' + laps.length.toLocaleString() + ' timed laps</p>' +
            '    </div>' +
            '    <span class="sess__badge' + (live ? ' is-live' : '') + '">' + (live ? 'LIVE' : 'ARCHIVE') + '</span>' +
            '  </div>' +
            '  <div class="sess__stats">' +
            stat('Fastest lap', fmt(fastest.best), fastest.d.name_acronym) +
            stat('Best median pace', fmt(ranked[0].pace), ranked[0].d.name_acronym) +
            stat('Top speed', (topSpeed.top || 0) + ' km/h', topSpeed.d.name_acronym) +
            stat('Drivers', String(ranked.length), 'classified') +
            '  </div>' +
            '  <div class="sess__chartwrap"><canvas id="sess-pace-chart"></canvas></div>' +
            '  <p class="sess__foot">Clean laps only — pit-out laps are dropped, and so is ' +
            'anything slower than 107% of <em>that driver\'s own</em> best. Cutting against the ' +
            'session best instead would throw away a slower car\'s perfectly normal laps; cutting ' +
            'per driver removes only their safety-car and in-laps.</p>' +
            '  <div class="sess__tablewrap"><table class="sess__table"><thead><tr>' +
            '<th>#</th><th>Driver</th><th>Team</th><th>Median pace</th><th>Best</th><th>Clean laps</th><th>Top speed</th>' +
            '</tr></thead><tbody>' +
            ranked.slice(0, 12).map((r, i) =>
                '<tr><td>' + (i + 1) + '</td>' +
                '<td><span class="sess__dot" style="background:#' + (r.d.team_colour || '888') + '"></span>' +
                esc(r.d.full_name || r.d.broadcast_name || String(r.num)) + '</td>' +
                '<td>' + esc(r.d.team_name || '—') + '</td>' +
                '<td>' + fmt(r.pace) + '</td><td>' + fmt(r.best) + '</td>' +
                '<td>' + r.clean.length + '</td><td>' + (r.top || '—') + '</td></tr>').join('') +
            '</tbody></table></div></div>';

        window.__telOrder = ranked.map((r) => r.num);
        drawPace(ranked.slice(0, LINES));
        return true;
    }

    function stat(label, value, sub) {
        return '<div class="sess__stat"><span class="sess__stat-l">' + esc(label) + '</span>' +
               '<b class="sess__stat-v">' + esc(value) + '</b>' +
               '<span class="sess__stat-s">' + esc(sub) + '</span></div>';
    }

    function esc(t) {
        const d = document.createElement('div');
        d.textContent = t == null ? '' : t;
        return d.innerHTML;
    }

    function drawPace(top) {
        const cv = document.getElementById('sess-pace-chart');
        if (!cv || typeof Chart === 'undefined') return;
        const DIM = 'rgba(237,227,204,0.55)';
        const GRID = 'rgba(214,168,96,0.14)';

        new Chart(cv.getContext('2d'), {
            type: 'line',
            data: {
                datasets: top.map((r) => ({
                    label: r.d.name_acronym || String(r.num),
                    data: r.clean.map((l) => ({ x: l.lap_number, y: l.lap_duration })),
                    borderColor: '#' + (r.d.team_colour || '888888'),
                    backgroundColor: '#' + (r.d.team_colour || '888888'),
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.2,
                })),
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                parsing: false,
                interaction: { mode: 'nearest', intersect: false },
                plugins: {
                    legend: { labels: { color: DIM, boxWidth: 10, usePointStyle: true,
                                        font: { family: 'JetBrains Mono', size: 10 } } },
                    tooltip: { callbacks: { label: (c) => c.dataset.label + ' — lap ' + c.parsed.x + ' · ' + fmt(c.parsed.y) } },
                },
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Lap', color: DIM,
                                                  font: { family: 'JetBrains Mono', size: 10 } },
                         grid: { color: GRID }, border: { display: false },
                         ticks: { color: DIM, font: { family: 'JetBrains Mono', size: 10 }, precision: 0 } },
                    y: { title: { display: true, text: 'Lap time (s)', color: DIM,
                                  font: { family: 'JetBrains Mono', size: 10 } },
                         grid: { color: GRID }, border: { display: false },
                         ticks: { color: DIM, font: { family: 'JetBrains Mono', size: 10 },
                                  callback: (v) => fmt(v) } },
                },
            },
        });
    }

    async function boot() {
        const wrap = document.querySelector('#live-telemetry .telemetry-wrapper');
        if (!wrap || document.querySelector('.sess')) return;

        const host = document.createElement('div');
        host.className = 'sess-host';
        host.innerHTML = '<p class="sess__loading">Loading the most recent session…</p>';
        wrap.insertBefore(host, wrap.firstChild);

        try {
            const picked = await pickSession();
            if (!picked) throw new Error('no sessions');
            const key = picked.s.session_key;
            const drivers = await get('/drivers?session_key=' + key);
            const laps = await get('/laps?session_key=' + key, { fresh: picked.live });
            const ok = render(host, { session: picked.s, live: picked.live, drivers, laps });
            if (!ok) throw new Error('no timed laps');
            console.info('[telemetry] ' + picked.s.country_name + ' ' + picked.s.session_name +
                         ' — ' + laps.length + ' laps, ' + drivers.length + ' drivers');

            // Hand the chosen session on so strategy, pits, weather and radio
            // attach to the same race rather than picking their own.
            // The payload is published as well as dispatched: a single event
            // is one chance to be listening, and session-extras.js loads
            // after this module, so on some page loads it missed the event
            // entirely and all four of its sections silently never appeared.
            const payload = { sessionKey: key, session: picked.s, drivers, order: window.__telOrder || [] };
            window.__telemetrySession = payload;
            document.dispatchEvent(new CustomEvent('telemetry:session', { detail: payload }));
        } catch (e) {
            host.innerHTML = '<p class="sess__loading">Session data unavailable (' +
                             esc(e.message) + ').</p>';
            console.warn('[telemetry]', e.message);
        }
    }

    // room:ready is not reliable on its own — if it is missed the panel
    // silently stays empty, which is the exact failure this module exists
    // to fix. Back it with a timer and guard against running twice.
    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        boot();
    };

    document.addEventListener('room:ready', () => setTimeout(start, 900), { once: true });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1600), { once: true });
    } else {
        setTimeout(start, 1600);
    }
})();
