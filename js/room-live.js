/* ══════════════════════════════════════════════════════════════════
   F-ATICS · LIVING ROOM
   The painting is not a picture of a room — it is an instrument.

   The monitor shows the actual championship, the wall calendar marks
   the actual next round, and the pinned chart is the actual title
   fight. Everything here is driven by the payload season-live.js
   publishes, so the objects and the drawers can never disagree.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // Livery colours, muted to sit inside the painting rather than on it.
    const TEAM = {
        Mercedes: '#2E8B7F', Ferrari: '#A8232B', McLaren: '#C4622A', 'Red Bull': '#24407E',
        'Aston Martin': '#1E5A4C', Alpine: '#B4557E', Williams: '#2F6FA8', 'RB F1 Team': '#5A78B8',
        'Racing Bulls': '#5A78B8', Haas: '#8894A8', 'Kick Sauber': '#3E7A55', Audi: '#8E3B3B',
        Cadillac: '#B08A46', 'Alfa Romeo': '#8E3B3B',
    };

    const SHORT = {
        'Autodromo Nazionale di Monza': 'Monza', 'Circuit de Monaco': 'Monaco',
        'Silverstone Circuit': 'Silverstone', 'Circuit de Spa-Francorchamps': 'Spa',
        'Circuit Park Zandvoort': 'Zandvoort', 'Suzuka Circuit': 'Suzuka',
    };

    const el = (id) => document.getElementById(id);
    const surname = (full) => full.split(' ').slice(-1)[0];

    function paintMonitor(drivers, cal) {
        for (let i = 0; i < 4; i++) {
            const d = drivers[i];
            if (!d) continue;
            const name = el('scr-d' + (i + 1));
            const pts = el('scr-p' + (i + 1));
            const bar = el('scr-c' + (i + 1));
            if (name) name.textContent = surname(d.driver).toUpperCase();
            if (pts) pts.textContent = d.points;
            if (bar) bar.setAttribute('fill', TEAM[d.team] || '#8894A8');
        }
        const run = cal.filter((r) => new Date(r.date) < new Date()).length;
        const round = el('scr-round');
        if (round) round.textContent = 'R' + run + '/' + cal.length;
    }

    function paintCalendar(cal) {
        const next = cal.find((r) => new Date(r.date) >= new Date());
        const label = el('cal-next');
        if (!label) return;
        if (!next) { label.textContent = 'Season complete'; return; }
        const where = SHORT[next.circuit] || next.country;
        const when = new Date(next.date + 'T12:00:00Z')
            .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        label.textContent = 'R' + next.round + ' · ' + where + ' · ' + when;
    }

    /* The pinned chart is the real points curve for the top two, drawn to
       fit the corkboard. Two series is the most this size can carry
       legibly — a full field would be a smear at 260px wide. */
    function paintBoard(series) {
        const leader = el('board-leader');
        const rival = el('board-rival');
        const label = el('board-label');
        if (!leader || !series || series.length < 2) return;

        const X0 = 404, X1 = 668, Y0 = 250, Y1 = 186;
        const top = Math.max(...series.flatMap((s) => s.points), 1);
        const path = (pts) => pts.map((p, i) => {
            const x = X0 + (X1 - X0) * (pts.length > 1 ? i / (pts.length - 1) : 0);
            const y = Y0 - (Y0 - Y1) * (p / top);
            return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        }).join(' ');

        leader.setAttribute('d', path(series[0].points));
        if (rival) rival.setAttribute('d', path(series[1].points));
        if (label) {
            label.textContent = surname(series[0].name).toUpperCase() + ' v ' +
                                surname(series[1].name).toUpperCase();
        }
    }

    document.addEventListener('season:loaded', (e) => {
        const { drivers, cal } = e.detail || {};
        try {
            if (drivers && drivers.length) paintMonitor(drivers, cal || []);
            if (cal && cal.length) paintCalendar(cal);
            document.querySelector('.room')?.classList.add('is-live');
        } catch (err) {
            // A painting that fails to update is still a painting; never let
            // this take the room down.
            console.warn('[room-live]', err && err.message);
        }
    });

    // Arrives later than season:loaded — the curve costs four more requests.
    document.addEventListener('season:series', (e) => {
        try { paintBoard(e.detail && e.detail.series); }
        catch (err) { console.warn('[room-live] board', err && err.message); }
    });
})();
