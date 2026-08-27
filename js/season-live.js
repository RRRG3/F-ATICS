/* ══════════════════════════════════════════════════════════════════
   F-ATICS · LIVE SEASON
   The shipped season files are a preseason placeholder — every driver
   on zero points and a 24-round calendar. This pulls the real thing
   from Jolpica (the Ergast successor) and repaints:

     · driver and constructor standings
     · the race calendar
     · the live strip (leader, last race, next session)
     · the championship battle and teammate head-to-head

   Everything degrades to the shipped data if the API is unreachable,
   so the page is never empty offline.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const API = 'https://api.jolpi.ca/ergast/f1';
    const SEASON = 2026;

    const NAT = {
        British: '🇬🇧', Dutch: '🇳🇱', Italian: '🇮🇹', Monegasque: '🇲🇨', Spanish: '🇪🇸',
        Australian: '🇦🇺', Mexican: '🇲🇽', French: '🇫🇷', German: '🇩🇪', Canadian: '🇨🇦',
        Japanese: '🇯🇵', Thai: '🇹🇭', Danish: '🇩🇰', Finnish: '🇫🇮', American: '🇺🇸',
        Argentine: '🇦🇷', Brazilian: '🇧🇷', 'New Zealander': '🇳🇿', Swiss: '🇨🇭', Belgian: '🇧🇪',
    };

    const FLAG = {
        Australia: '🇦🇺', China: '🇨🇳', Japan: '🇯🇵', Bahrain: '🇧🇭', 'Saudi Arabia': '🇸🇦',
        USA: '🇺🇸', 'United States': '🇺🇸', Canada: '🇨🇦', Monaco: '🇲🇨', Spain: '🇪🇸',
        Austria: '🇦🇹', UK: '🇬🇧', 'United Kingdom': '🇬🇧', Belgium: '🇧🇪', Hungary: '🇭🇺',
        Netherlands: '🇳🇱', Italy: '🇮🇹', Azerbaijan: '🇦🇿', Singapore: '🇸🇬', Mexico: '🇲🇽',
        Brazil: '🇧🇷', Qatar: '🇶🇦', UAE: '🇦🇪', 'United Arab Emirates': '🇦🇪', France: '🇫🇷',
        Malaysia: '🇲🇾', Portugal: '🇵🇹', Turkey: '🇹🇷', Russia: '🇷🇺', Germany: '🇩🇪',
        Korea: '🇰🇷', India: '🇮🇳', Argentina: '🇦🇷', 'South Africa': '🇿🇦', Vietnam: '🇻🇳',
        Switzerland: '🇨🇭', Sweden: '🇸🇪', Morocco: '🇲🇦', Thailand: '🇹🇭', Madrid: '🇪🇸',
    };

    /* ── transport ─────────────────────────────────────────────── */

    // Jolpica burst-limits at ~4 requests/second and, when it throttles, it
    // answers WITHOUT the CORS header — so the browser reports a CORS
    // failure rather than a 429 and the cause is easy to misread. Requests
    // are therefore serialised with real spacing, retried once with backoff,
    // and cached in localStorage so a reload costs nothing.
    const GAP = 420;
    const TTL = 6 * 60 * 60 * 1000;
    let chain = Promise.resolve();

    const nap = (ms) => new Promise((r) => setTimeout(r, ms));

    function cached(key) {
        try {
            const hit = JSON.parse(localStorage.getItem(key) || 'null');
            if (hit && Date.now() - hit.t < TTL) return hit.d;
        } catch (_) { /* private mode / quota */ }
        return null;
    }

    function store(key, d) {
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (_) {}
    }

    async function get(path) {
        const key = 'fatics:' + path;
        const hit = cached(key);
        if (hit) return hit;

        // Queue behind whatever is already in flight, then pause, so bursts
        // from Promise.all() still go out one at a time.
        const run = chain.then(async () => {
            await nap(GAP);
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const res = await fetch(API + path);
                    if (!res.ok) throw new Error(String(res.status));
                    return await res.json();
                } catch (e) {
                    if (attempt) throw e;
                    await nap(2000);
                }
            }
        });
        chain = run.catch(() => {});
        const data = await run;
        store(key, data);
        return data;
    }

    /* ── shaping ───────────────────────────────────────────────── */

    function toDrivers(json) {
        const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
        return list.map((d) => ({
            position: Number(d.position),
            driver: d.Driver.givenName + ' ' + d.Driver.familyName,
            nationality: d.Driver.nationality,
            team: d.Constructors[d.Constructors.length - 1].name,
            points: Number(d.points),
            wins: Number(d.wins),
            number: Number(d.Driver.permanentNumber) || null,
            flag: NAT[d.Driver.nationality] || '',
        }));
    }

    function toConstructors(json) {
        const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
        return list.map((c) => ({
            position: Number(c.position),
            team: c.Constructor.name,
            points: Number(c.points),
            wins: Number(c.wins),
        }));
    }

    function toCalendar(json) {
        const races = json?.MRData?.RaceTable?.Races || [];
        return races.map((r) => ({
            round: Number(r.round),
            name: r.raceName,
            circuit: r.Circuit.circuitName,
            date: r.date,
            time: r.time || null,
            country: r.Circuit.Location.country,
            flag: FLAG[r.Circuit.Location.country] || '',
            isSprint: !!r.Sprint,
        }));
    }

    /* ── repaint the existing views ────────────────────────────── */

    function swap(target, next) {
        // The season files are `const`, so the arrays are mutated in place —
        // every closure in script.js already holds this same reference.
        if (!Array.isArray(target) || !next.length) return false;
        target.length = 0;
        next.forEach((x) => target.push(x));
        return true;
    }

    function paintStrip(drivers, ctors, cal, lastRace) {
        const set = (id, txt) => { const e = document.getElementById(id); if (e && txt != null) e.textContent = txt; };

        // Claim the strip so script.js's fallback painter stands down.
        const block = document.getElementById('now-block');
        if (block) {
            block.dataset.live = '1';
            block.setAttribute('data-loading', 'false');
        }

        const leader = drivers[0];
        if (leader) {
            set('now-leader-name', leader.driver.toUpperCase());
            const el = document.getElementById('now-leader-team');
            if (el) {
                const gap = drivers[1] ? leader.points - drivers[1].points : 0;
                el.innerHTML = leader.team + ' · <span class="pw-now__delta">' +
                    leader.points + ' pt' + (gap ? ' (+' + gap + ')' : '') + '</span>';
            }
        }

        if (lastRace) {
            set('now-last-race', (lastRace.Circuit?.Location?.country || lastRace.raceName).toUpperCase());
            const w = lastRace.Results?.[0]?.Driver;
            set('now-last-result', 'Round ' + lastRace.round + ' · Winner: ' +
                (w ? w.givenName + ' ' + w.familyName : '—'));
        }

        const cells = document.querySelectorAll('.pw-now__cell');
        const last = cells[cells.length - 1];
        if (last && ctors.length) {
            const b = last.querySelector('.pw-now__big');
            const s = last.querySelector('.pw-now__small');
            if (b) b.textContent = ctors[0].team.toUpperCase();
            if (s) s.textContent = 'Constructors leader · ' + ctors[0].points + ' pt';
            const lab = last.querySelector('.pw-now__label');
            if (lab) lab.textContent = 'Constructors';
        }
    }

    /* ── championship battle ───────────────────────────────────── */

    function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    function battleMarkup(drivers, cal, rounds) {
        const now = new Date();
        const done = cal.filter((r) => new Date(r.date) < now).length;
        const left = cal.length - done;
        // 25 for a win, plus 8 for a sprint win on sprint weekends.
        const sprintsLeft = cal.filter((r) => new Date(r.date) >= now && r.isSprint).length;
        const maxLeft = left * 25 + sprintsLeft * 8;
        const leader = drivers[0];

        const alive = drivers.filter((d) => d.points + maxLeft >= leader.points);
        const rows = drivers.slice(0, 10).map((d) => {
            const gap = leader.points - d.points;
            const canWin = d.points + maxLeft >= leader.points;
            return '<tr><td>' + d.position + '</td><td>' + esc(d.driver) + '</td>' +
                '<td>' + esc(d.team) + '</td><td>' + d.points + '</td>' +
                '<td>' + (gap ? '−' + gap : '—') + '</td><td>' + d.wins + '</td>' +
                '<td><span class="battle__flag ' + (canWin ? 'is-alive' : 'is-out') + '">' +
                (canWin ? 'Alive' : 'Out') + '</span></td></tr>';
        }).join('');

        return '' +
        '<section class="battle">' +
        '  <h3 class="battle__h">Championship battle</h3>' +
        '  <p class="battle__lede">' + done + ' of ' + cal.length + ' rounds run · ' + left +
        ' remaining · <b>' + maxLeft + '</b> points still on the table' +
        (sprintsLeft ? ' (including ' + sprintsLeft + ' sprint' + (sprintsLeft > 1 ? 's' : '') + ')' : '') +
        ' · <b>' + alive.length + '</b> driver' + (alive.length === 1 ? '' : 's') +
        ' still mathematically alive.</p>' +
        '  <div class="battle__chartwrap"><canvas id="battle-chart" height="200"></canvas></div>' +
        '  <div class="battle__tablewrap"><table class="battle__table"><thead><tr>' +
        '<th>Pos</th><th>Driver</th><th>Team</th><th>Pts</th><th>Gap</th><th>Wins</th><th>Title</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '  <h3 class="battle__h">Teammate head-to-head</h3>' +
        '  <div class="battle__h2h" id="battle-h2h"></div>' +
        '</section>';
    }

    function paintH2H(drivers) {
        const host = document.getElementById('battle-h2h');
        if (!host) return;
        const byTeam = new Map();
        drivers.forEach((d) => {
            if (!byTeam.has(d.team)) byTeam.set(d.team, []);
            byTeam.get(d.team).push(d);
        });

        host.innerHTML = [...byTeam.entries()]
            .filter(([, pair]) => pair.length === 2)
            .sort((a, b) => (b[1][0].points + b[1][1].points) - (a[1][0].points + a[1][1].points))
            .map(([team, [a, b]]) => {
                const tot = Math.max(a.points + b.points, 1);
                const aw = Math.round((a.points / tot) * 100);
                return '<div class="h2h">' +
                    '<div class="h2h__team">' + esc(team) + '</div>' +
                    '<div class="h2h__row"><span class="h2h__n' + (a.points >= b.points ? ' is-up' : '') + '">' +
                    esc(a.driver) + '</span><span class="h2h__p">' + a.points + '</span></div>' +
                    '<div class="h2h__bar"><i style="width:' + aw + '%"></i></div>' +
                    '<div class="h2h__row"><span class="h2h__n' + (b.points > a.points ? ' is-up' : '') + '">' +
                    esc(b.driver) + '</span><span class="h2h__p">' + b.points + '</span></div>' +
                    '</div>';
            }).join('');
    }

    async function paintBattleChart(cal) {
        const cv = document.getElementById('battle-chart');
        if (!cv || typeof Chart === 'undefined') return;

        const now = new Date();
        const done = cal.filter((r) => new Date(r.date) < now).map((r) => r.round).sort((a, b) => a - b);
        if (!done.length) return;

        // Twelve per-round standings calls is twelve chances to be
        // throttled. Every Result already carries the points it scored, so
        // four paged calls (races + sprints) reconstruct the same curve —
        // penalties included, because they are applied to the results.
        const pages = async (endpoint) => {
            const out = [];
            for (let offset = 0; offset < 400; offset += 100) {
                let j;
                try { j = await get(endpoint + '?limit=100&offset=' + offset); }
                catch (_) { break; }
                const races = j?.MRData?.RaceTable?.Races || [];
                out.push(...races);
                if (offset + 100 >= Number(j?.MRData?.total || 0)) break;
            }
            return out;
        };

        const [racePages, sprintPages] = await Promise.all([
            pages('/' + SEASON + '/results.json'),
            pages('/' + SEASON + '/sprint.json'),
        ]);
        if (!racePages.length) return;

        const scored = new Map();          // round → driverName → points that round
        const add = (races, key) => races.forEach((r) => {
            const rd = Number(r.round);
            if (!scored.has(rd)) scored.set(rd, new Map());
            const bucket = scored.get(rd);
            (r[key] || []).forEach((res) => {
                const name = res.Driver.givenName + ' ' + res.Driver.familyName;
                bucket.set(name, (bucket.get(name) || 0) + Number(res.points || 0));
            });
        });
        add(racePages, 'Results');
        add(sprintPages, 'SprintResults');

        // Publish the raw finishing data. form-2026.js fits the prediction
        // model to it, and re-fetching would cost another four requests.
        // Published on window as well as dispatched. A single event is a
        // single chance to be listening at exactly the right moment, and
        // consumers that miss it have no way back — which is precisely how
        // the grid-vs-finish, teammate and sprint panels silently vanished.
        window.__seasonResults = { races: racePages, sprints: sprintPages };
        document.dispatchEvent(new CustomEvent('season:results', {
            detail: window.__seasonResults,
        }));

        const roundsRun = [...scored.keys()].sort((x, y) => x - y);
        if (roundsRun.length < 2) return;

        const running = new Map();
        const perRound = roundsRun.map((rd) => {
            scored.get(rd).forEach((pts, name) => running.set(name, (running.get(name) || 0) + pts));
            return {
                round: rd,
                table: [...running.entries()]
                    .map(([driver, points]) => ({ driver, points }))
                    .sort((x, y) => y.points - x.points),
            };
        });

        // Publish the curve so the painted pinboard can draw the same fight
        // the chart shows. Emitted separately from season:loaded because it
        // lands several requests later.
        const leaders = perRound[perRound.length - 1].table.slice(0, 2);
        document.dispatchEvent(new CustomEvent('season:series', {
            detail: {
                series: leaders.map((d) => ({
                    name: d.driver,
                    points: perRound.map((p) => (p.table.find((x) => x.driver === d.driver) || {}).points || 0),
                })),
            },
        }));

        const final = perRound[perRound.length - 1].table.slice(0, 5);
        const COLORS = ['#4FD1C5', '#E2503C', '#C4622A', '#D9A93C', '#7FA9DE'];

        new Chart(cv.getContext('2d'), {
            type: 'line',
            data: {
                labels: perRound.map((p) => 'R' + p.round),
                datasets: final.map((d, i) => ({
                    label: d.driver,
                    data: perRound.map((p) => (p.table.find((x) => x.driver === d.driver) || {}).points ?? null),
                    borderColor: COLORS[i],
                    backgroundColor: COLORS[i],
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.25,
                })),
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: '#B9C6DC', font: { family: 'Inter', size: 11 }, boxWidth: 10, usePointStyle: true } },
                    tooltip: { titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } },
                },
                scales: {
                    x: { grid: { color: 'rgba(245,243,240,0.06)' }, ticks: { color: '#7E93B8', font: { family: 'JetBrains Mono', size: 10 } } },
                    y: { grid: { color: 'rgba(245,243,240,0.06)' }, ticks: { color: '#7E93B8', font: { family: 'JetBrains Mono', size: 10 } } },
                },
            },
        });
    }

    /* ── boot ──────────────────────────────────────────────────── */

    async function run() {
        let drivers, ctors, cal, lastRace;
        try {
            const [ds, cs, sched, last] = await Promise.all([
                get('/' + SEASON + '/driverstandings.json?limit=40'),
                get('/' + SEASON + '/constructorstandings.json?limit=20'),
                get('/' + SEASON + '.json?limit=40'),
                get('/' + SEASON + '/last/results.json'),
            ]);
            drivers = toDrivers(ds);
            ctors = toConstructors(cs);
            cal = toCalendar(sched);
            lastRace = last?.MRData?.RaceTable?.Races?.[0] || null;
        } catch (e) {
            console.warn('[season] live data unavailable, keeping shipped season files:', e.message);
            return;
        }
        if (!drivers.length || !cal.length) {
            console.warn('[season] API returned an empty season; keeping shipped data');
            return;
        }

        const f = window.fatics || {};
        if (typeof driverStandings2026 !== 'undefined' && swap(driverStandings2026, drivers)) {
            if (f.displayStandings) f.displayStandings(drivers);
        }
        if (typeof constructorStandings !== 'undefined' && swap(constructorStandings, ctors)) {
            if (f.renderConstructors) f.renderConstructors(ctors);
        }
        if (typeof raceCalendar !== 'undefined' && swap(raceCalendar, cal)) {
            if (f.renderCalendar) f.renderCalendar(cal);
            // script.js owns the countdown and the race-day states; it just
            // needs re-running now that the calendar holds real dates.
            if (f.refreshCountdown) f.refreshCountdown();
        }

        paintStrip(drivers, ctors, cal, lastRace);

        // A championship section should open by telling you who is winning
        // it, not with a table you have to read to find out.
        const trackerHost = document.getElementById('tracker');
        if (trackerHost && !document.querySelector('.lead')) {
            const head = trackerHost.querySelector('.section-header');
            const [p1, p2, p3] = drivers;
            const gap = p2 ? p1.points - p2.points : 0;
            const ctorLead = ctors[0];
            const podium = [p2, p1, p3].filter(Boolean);   // 2 · 1 · 3
            const card = (d, place) =>
                '<div class="lead__step lead__step--' + place + '">' +
                '  <span class="lead__pos">' + place + '</span>' +
                '  <b class="lead__name">' + esc(d.driver.split(" ").slice(-1)[0]) + '</b>' +
                '  <span class="lead__team">' + esc(d.team) + '</span>' +
                '  <span class="lead__pts">' + d.points + '<i>pts</i></span>' +
                '</div>';
            const html =
                '<div class="lead">' +
                '  <div class="lead__hero">' +
                '    <span class="lead__k">Championship leader</span>' +
                '    <b class="lead__big">' + esc(p1.driver) + '</b>' +
                '    <span class="lead__sub">' + esc(p1.team) + ' · ' + p1.wins + ' wins · ' +
                        (gap ? gap + ' points clear of ' + esc(p2.driver.split(" ").slice(-1)[0]) : 'level at the top') +
                '    </span>' +
                '  </div>' +
                '  <div class="lead__podium">' + podium.map((d, i) => card(d, [2, 1, 3][i])).join('') + '</div>' +
                '  <div class="lead__ctor"><span class="lead__k">Constructors</span>' +
                '    <b class="lead__cname">' + esc(ctorLead.team) + '</b>' +
                '    <span class="lead__sub">' + ctorLead.points + ' pts · ' +
                        (ctors[1] ? (ctorLead.points - ctors[1].points) + ' clear of ' + esc(ctors[1].team) : '') +
                '</span></div>' +
                '</div>';
            if (head) head.insertAdjacentHTML('afterend', html);
        }

        const host = document.querySelector('#tracker .container') || document.getElementById('tracker');
        if (host && !document.querySelector('.battle')) {
            host.insertAdjacentHTML('beforeend', battleMarkup(drivers, cal));
            paintH2H(drivers);
            paintBattleChart(cal);
        }

        window.__seasonCtors = ctors;
        console.info('[season] live 2026: ' + drivers.length + ' drivers, ' + ctors.length +
                     ' teams, ' + cal.length + ' rounds — leader ' + drivers[0].driver +
                     ' on ' + drivers[0].points);
        document.dispatchEvent(new CustomEvent('season:loaded', { detail: { drivers, ctors, cal } }));
    }

    // Prefer running once the room has relocated the sections, but never
    // depend on that single event — if it is missed the whole season falls
    // back to placeholder data silently. A timer backstop starts the same
    // work, and a guard makes sure only one of them wins.
    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        run().catch((e) => console.warn('[season] failed:', e && e.message));
    };

    document.addEventListener('room:ready', () => setTimeout(start, 0), { once: true });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(start, 400), { once: true });
    } else {
        setTimeout(start, 400);
    }
})();
