/* ══════════════════════════════════════════════════════════════════
   F-ATICS · SESSION EXTRAS
   Tyre strategy, pit stops, weather and team radio for the session
   telemetry-live.js has already chosen. It reuses that module's
   session key and its cached transport, so the whole set costs four
   more requests on a cold cache and none on a warm one.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const API = 'https://api.openf1.org/v1';
    const GAP = 380;
    const TTL = 12 * 60 * 60 * 1000;
    let chain = Promise.resolve();
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));

    // Pirelli's colour language, so a strategy chart reads without a legend.
    const COMPOUND = {
        SOFT: '#D8503F', MEDIUM: '#E4C05A', HARD: '#E8E4DA',
        INTERMEDIATE: '#3E8E5A', WET: '#2F6FA8', UNKNOWN: '#8894A8',
    };

    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };

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

    /* ── 9. Tyre strategy ───────────────────────────────────────── */
    function strategy(stints, drivers, order) {
        const byDriver = new Map();
        stints.forEach((s) => {
            if (!byDriver.has(s.driver_number)) byDriver.set(s.driver_number, []);
            byDriver.get(s.driver_number).push(s);
        });
        if (!byDriver.size) return '';

        const maxLap = Math.max(...stints.map((s) => s.lap_end || 0), 1);
        const rows = order
            .filter((n) => byDriver.has(n))
            .slice(0, 12)
            .map((num) => {
                const d = drivers.get(num) || {};
                const bars = byDriver.get(num)
                    .sort((a, b) => (a.lap_start || 0) - (b.lap_start || 0))
                    .map((s) => {
                        const from = s.lap_start || 1;
                        const to = s.lap_end || from;
                        const w = ((to - from + 1) / maxLap) * 100;
                        const c = COMPOUND[(s.compound || 'UNKNOWN').toUpperCase()] || COMPOUND.UNKNOWN;
                        return '<i style="width:' + w.toFixed(2) + '%;background:' + c + '" ' +
                               'title="' + esc((s.compound || '?') + ' · laps ' + from + '–' + to) + '"></i>';
                    }).join('');
                return '<div class="strat__row"><span class="strat__d">' +
                       esc(d.name_acronym || num) + '</span><div class="strat__bar">' + bars + '</div></div>';
            }).join('');

        const key = Object.entries(COMPOUND).filter(([k]) => k !== 'UNKNOWN')
            .map(([k, c]) => '<span><i style="background:' + c + '"></i>' + k[0] + k.slice(1).toLowerCase() + '</span>')
            .join('');

        return '<section class="xtra"><h3 class="xtra__h">Tyre strategy</h3>' +
               '<p class="xtra__s">Every stint, in order, scaled to race distance. ' +
               'Where the colours change is where the race was decided.</p>' +
               '<div class="strat">' + rows + '</div>' +
               '<div class="strat__key">' + key + '</div></section>';
    }

    /* ── 10. Pit stops ──────────────────────────────────────────── */
    function pits(stops, drivers) {
        const timed = stops.filter((p) => Number.isFinite(p.pit_duration) && p.pit_duration > 0);
        if (!timed.length) return '';
        const sorted = [...timed].sort((a, b) => a.pit_duration - b.pit_duration);
        const best = sorted[0];
        const med = sorted[Math.floor(sorted.length / 2)].pit_duration;

        const rows = sorted.slice(0, 8).map((p, i) => {
            const d = drivers.get(p.driver_number) || {};
            return '<tr><td>' + (i + 1) + '</td><td><span class="sess__dot" style="background:#' +
                   (d.team_colour || '888') + '"></span>' + esc(d.name_acronym || p.driver_number) +
                   '</td><td>' + esc(d.team_name || '—') + '</td><td>' +
                   p.pit_duration.toFixed(2) + 's</td><td>lap ' + (p.lap_number ?? '—') + '</td></tr>';
        }).join('');

        return '<section class="xtra"><h3 class="xtra__h">Pit stops</h3>' +
               '<p class="xtra__s">' + timed.length + ' stops · quickest <b>' + best.pit_duration.toFixed(2) +
               's</b> · median <b>' + med.toFixed(2) + 's</b>. OpenF1 reports time in the pit LANE, not stationary time at the box — '
               + 'which is why these read 12–20s rather than the ~2s shown on television.</p>' +
               '<div class="sess__tablewrap"><table class="sess__table"><thead><tr>' +
               '<th>#</th><th>Driver</th><th>Team</th><th>Pit lane</th><th>Lap</th>' +
               '</tr></thead><tbody>' + rows + '</tbody></table></div></section>';
    }

    /* ── 12. Weather ────────────────────────────────────────────── */
    function weather(rows) {
        if (!rows || !rows.length) return '';
        const last = rows[rows.length - 1];
        const avg = (k) => {
            const v = rows.map((r) => r[k]).filter(Number.isFinite);
            return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : null;
        };
        const rain = rows.some((r) => Number(r.rainfall) > 0);
        const cell = (l, v, s) => '<div class="sess__stat"><span class="sess__stat-l">' + l +
                                  '</span><b class="sess__stat-v">' + v + '</b>' +
                                  '<span class="sess__stat-s">' + s + '</span></div>';
        const num = (v, unit) => (v == null ? '—' : v.toFixed(1) + unit);

        return '<section class="xtra"><h3 class="xtra__h">Conditions</h3>' +
               '<div class="sess__stats">' +
               cell('Track temp', num(avg('track_temperature'), '°'), 'session average') +
               cell('Air temp', num(avg('air_temperature'), '°'), 'session average') +
               cell('Humidity', num(avg('humidity'), '%'), 'session average') +
               cell('Wind', num(avg('wind_speed'), ' m/s'), 'from ' + (last.wind_direction ?? '—') + '°') +
               '</div><p class="xtra__s">' +
               (rain ? 'Rain was recorded during this session.' : 'Dry throughout — no rainfall recorded.') +
               '</p></section>';
    }

    /* ── 13. Team radio ─────────────────────────────────────────── */
    function radio(clips, drivers) {
        if (!clips || !clips.length) return '';
        const recent = clips.slice(-8).reverse();
        const items = recent.map((c) => {
            const d = drivers.get(c.driver_number) || {};
            const when = c.date ? new Date(c.date).toLocaleTimeString('en-GB',
                { hour: '2-digit', minute: '2-digit' }) : '';
            return '<li class="radio__i">' +
                   '<span class="sess__dot" style="background:#' + (d.team_colour || '888') + '"></span>' +
                   '<span class="radio__d">' + esc(d.name_acronym || c.driver_number) + '</span>' +
                   '<span class="radio__t">' + esc(when) + '</span>' +
                   '<audio class="radio__a" controls preload="none" src="' + esc(c.recording_url) + '"></audio>' +
                   '</li>';
        }).join('');
        return '<section class="xtra"><h3 class="xtra__h">Team radio</h3>' +
               '<p class="xtra__s">The last ' + recent.length + ' transmissions from this session, straight from the feed.</p>' +
               '<ul class="radio">' + items + '</ul></section>';
    }

    async function boot(sessionKey, driverList, order) {
        const host = document.querySelector('#live-telemetry .telemetry-wrapper');
        // The guard used to be a document-wide check for any .xtra — but
        // season-extras.js builds three .xtra sections of its own in the
        // tracker drawer. Whenever those rendered first, this module saw
        // them, assumed its own work was done and returned, so the tyre
        // strategy, pit stops, conditions and team radio never loaded.
        // Scope the check to this section's own slot.
        if (!host || host.querySelector('.xtra-host')) return;
        const drivers = new Map(driverList.map((d) => [d.driver_number, d]));

        const slot = document.createElement('div');
        slot.className = 'xtra-host';
        host.appendChild(slot);

        const q = (p) => get(p + '?session_key=' + sessionKey).catch(() => []);
        const [stints, stops, wx, clips] = [
            await q('/stints'), await q('/pit'), await q('/weather'), await q('/team_radio'),
        ];

        slot.innerHTML =
            strategy(stints || [], drivers, order) +
            pits(stops || [], drivers) +
            weather(wx || []) +
            radio(clips || [], drivers);

        console.info('[extras] stints ' + (stints || []).length + ' · pits ' + (stops || []).length +
                     ' · weather ' + (wx || []).length + ' · radio ' + (clips || []).length);
    }

    let started = false;
    function start(detail) {
        if (started) return;
        const { sessionKey, drivers, order } = detail || {};
        if (!sessionKey || !drivers) return;
        started = true;
        boot(sessionKey, drivers, order || []);
    }

    document.addEventListener('telemetry:session', (e) => start(e.detail));

    // Backstop, matching season-extras and calendar-rich: if the dispatch
    // landed before this module was listening, the payload is still on
    // window. Without this the tyre strategy, pit stops, conditions and
    // team radio sections were simply absent on some loads.
    let tries = 0;
    const poll = setInterval(() => {
        if (window.__telemetrySession) { start(window.__telemetrySession); clearInterval(poll); }
        else if (++tries > 90) clearInterval(poll);
    }, 1000);
})();
