/* ══════════════════════════════════════════════════════════════════
   F-ATICS · TITLE RACE
   Two additions to the standings drawer, both from data already in
   memory — no new requests.

   1. PERMUTATIONS. The most-asked question of any F1 season is "can
      they still win it?", and a table of points does not answer it.
      This works out how many points remain, who is mathematically
      out, and what the leader needs in order to clinch.

   2. HEAD-TO-HEAD. The teammate record only compares drivers who
      share a garage. This lets you put any two drivers side by side,
      scored over the races both actually finished.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // 2026 scoring. Sprints pay the top eight.
    const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
    const MAX_RACE = RACE_POINTS[0];
    const MAX_SPRINT = SPRINT_POINTS[0];
    // A constructor banks both cars, so its ceiling is a one-two.
    const MAX_RACE_CTOR = RACE_POINTS[0] + RACE_POINTS[1];
    const MAX_SPRINT_CTOR = SPRINT_POINTS[0] + SPRINT_POINTS[1];


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
.tr { display: grid; gap: 18px; }
.tr__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px 20px; }
.tr__lead { font-family: var(--font-display); font-size: clamp(20px, 2.4vw, 28px);
    font-weight: 700; letter-spacing: -0.02em; color: var(--fg); }
.tr__meta { font-size: 13px; color: var(--fg-dim); }
.tr__meta b { color: var(--fg); font-variant-numeric: tabular-nums; }

.tr__rows { display: grid; gap: 6px; }
.tr__row { display: grid; grid-template-columns: 30px minmax(0, 1fr) 96px 118px minmax(0, 1.15fr);
    align-items: center; gap: 14px; padding: 11px 14px; border-radius: 5px;
    background: var(--surface); border-left: 3px solid var(--row-team, var(--line)); }
.tr__row.is-out { opacity: 0.5; }
.tr__row.is-leader { background: var(--surface-2); }
.tr__pos { font-family: var(--font-mono); font-size: 11px; color: var(--fg-mute); }
.tr__name { font-weight: 600; color: var(--fg); font-size: 14px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tr__name span { color: var(--fg-mute); font-weight: 400; font-size: 12px; margin-left: 7px; }
.tr__pts { font-variant-numeric: tabular-nums; color: var(--fg); font-size: 14px; }
.tr__pts i { font-style: normal; color: var(--fg-mute); font-size: 11px; margin-left: 3px; }
.tr__max { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-mute);
    font-variant-numeric: tabular-nums; }
.tr__verdict { font-size: 12px; color: var(--fg-dim); }
.tr__verdict.is-alive { color: var(--fg); }
.tr__verdict.is-out { color: var(--accent-text, var(--accent)); }
.tr__clinch { margin-top: 4px; padding: 14px 16px; border: 1px dashed var(--line-strong, var(--line));
    border-radius: 6px; font-size: 13px; line-height: 1.6; color: var(--fg-dim); }
.tr__clinch b { color: var(--fg); }

/* Head to head */
.h2h__pick { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 18px; }
.h2h__f { display: grid; gap: 6px; }
.h2h__f label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--fg-mute); }
.h2h__f select { min-width: 210px; padding: 10px 12px; border-radius: 5px;
    border: 1px solid var(--line); background: var(--surface); color: var(--fg);
    font-family: inherit; font-size: 13px; }
.h2h__grid { display: grid; gap: 4px; }
.h2h__r { display: grid; grid-template-columns: minmax(0, 1fr) 120px minmax(0, 1fr);
    align-items: center; gap: 12px; padding: 10px 14px; border-radius: 5px; background: var(--surface); }
.h2h__r.is-head { background: none; padding-bottom: 4px; }
.h2h__who { font-family: var(--font-display); font-size: 17px; font-weight: 700;
    letter-spacing: -0.02em; color: var(--fg); text-transform: uppercase; }
.h2h__who.r { text-align: right; }
.h2h__team { display: block; font-family: var(--font-mono); font-size: 9.5px;
    letter-spacing: 0.12em; color: var(--fg-mute); text-transform: uppercase; margin-top: 3px; }
.h2h__l { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--fg-mute); text-align: center; }
.h2h__v { font-variant-numeric: tabular-nums; font-size: 15px; color: var(--fg-dim); }
.h2h__v.r { text-align: right; }
.h2h__v.is-win { color: var(--fg); font-weight: 700; }
.h2h__note { margin-top: 12px; font-size: 12px; color: var(--fg-mute); }

@media (max-width: 760px) {
  .tr__row { grid-template-columns: 26px minmax(0,1fr) 74px; }
  .tr__max, .tr__verdict { display: none; }
  .h2h__f select { min-width: 100%; }
}
`;

    function injectCSS() {
        if (document.getElementById('title-race-css')) return;
        const el = document.createElement('style');
        el.id = 'title-race-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    function teamColour(team) {
        if (typeof window.teamColour === 'function') {
            try { return window.teamColour(team); } catch (_) {}
        }
        return 'var(--line)';
    }

    /* ── 1. Permutations ─────────────────────────────────────────── */
    function remaining(cal, results) {
        const done = new Set((results.races || []).map((r) => Number(r.round)));
        const now = new Date();
        // A round counts as still to come if it has no result AND has not
        // already been run — a race can be finished before the feed updates.
        const left = (cal || []).filter((r) => !done.has(Number(r.round)) && new Date(r.date) >= now);
        const sprintsLeft = left.filter((r) => r.isSprint).length;
        return { rounds: left.length, sprints: sprintsLeft, next: left[0] || null };
    }

    function permutations(standings, cal, results, opts) {
        const { rounds, sprints } = remaining(cal, results);
        if (!standings.length) return '';

        const o = opts || {};
        const perRace = o.perRace || MAX_RACE;
        const perSprint = o.perSprint || MAX_SPRINT;
        const nameOf = o.nameOf || ((d) => surname(d.driver));
        const subOf = o.subOf || ((d) => d.team);
        const title = o.title || 'Can they still win it?';

        const available = rounds * perRace + sprints * perSprint;
        const leader = standings[0];

        const rows = standings.slice(0, 10).map((d) => {
            const max = d.points + available;
            const alive = max >= leader.points;
            const gap = leader.points - d.points;
            const isLeader = d === leader;

            let verdict;
            if (isLeader) {
                verdict = '<span class="tr__verdict is-alive">Leads by ' +
                    (standings[1] ? leader.points - standings[1].points : 0) + '</span>';
            } else if (!alive) {
                verdict = '<span class="tr__verdict is-out">Mathematically out</span>';
            } else {
                const need = Math.ceil((gap + 1) / perRace);
                verdict = '<span class="tr__verdict is-alive">' + gap + ' behind · needs ' +
                    (need > rounds ? 'everything' : need + ' clear win' + (need > 1 ? 's' : '')) +
                    '</span>';
            }

            return '<div class="tr__row' + (alive ? '' : ' is-out') + (isLeader ? ' is-leader' : '') +
                '" style="--row-team:' + teamColour(subOf(d) || nameOf(d)) + '">' +
                '<span class="tr__pos">' + d.position + '</span>' +
                '<span class="tr__name">' + esc(nameOf(d)) +
                    '<span>' + esc(subOf(d) || '') + '</span></span>' +
                '<span class="tr__pts">' + d.points + '<i>pts</i></span>' +
                '<span class="tr__max">max ' + max + '</span>' +
                verdict + '</div>';
        }).join('');

        // Earliest round the title can actually be settled.
        //
        // The first version asked what margin the leader needed at the very
        // next race and printed the raw number — which came out as "outscore
        // Russell by 200 there", an impossibility when one weekend is worth
        // at most 33. The real question is which round is the first where a
        // clinch is even arithmetically available.
        let clinch = '';
        if (rounds === 0) {
            clinch = '<p class="tr__clinch">Season complete — <b>' + esc(nameOf(leader)) +
                '</b> takes the championship on ' + leader.points + ' points.</p>';
        } else if (standings[1]) {
            const rival = standings[1];
            const gap = leader.points - rival.points;
            const left = (cal || []).filter((r) => {
                const done = new Set((results.races || []).map((x) => Number(x.round)));
                return !done.has(Number(r.round)) && new Date(r.date) >= new Date();
            });

            let atRound = null;
            let bestGap = gap;
            for (let k = 0; k < left.length; k++) {
                // Best case for the leader: wins the round, rival scores nothing.
                bestGap += perRace + (left[k].isSprint ? perSprint : 0);
                const after = left.slice(k + 1);
                const remainingAfter = after.length * perRace +
                    after.filter((r) => r.isSprint).length * perSprint;
                if (bestGap > remainingAfter) { atRound = left[k]; break; }
            }

            clinch = '<p class="tr__clinch">' +
                '<b>' + esc(nameOf(leader)) + '</b> leads <b>' + esc(nameOf(rival)) +
                '</b> by <b>' + gap + '</b>, with <b>' + available + '</b> still on the table across ' +
                rounds + ' round' + (rounds === 1 ? '' : 's') +
                (sprints ? ' (' + sprints + ' with a sprint)' : '') + '. ' +
                (atRound
                    ? 'The earliest it can be settled is <b>' + esc(atRound.name) + '</b> (round ' +
                      atRound.round + ') — and only if they win every race until then while ' +
                      esc(nameOf(rival)) + ' scores nothing.'
                    : 'It cannot be settled before the final round.') +
                '</p>';
        }

        return '<section class="xtra"><h3 class="xtra__h">' + title + '</h3>' +
            '<p class="xtra__s">' + rounds + ' round' + (rounds === 1 ? '' : 's') + ' left, so ' +
            available + ' points are still available — ' + perRace + ' a race' +
            (sprints ? ' plus ' + perSprint + ' for each of the ' + sprints + ' sprints' : '') +
            '. ' + (o.unit || 'A driver') + ' is out when their maximum can no longer reach ' +
            'the leader’s total.</p>' +
            '<div class="tr"><div class="tr__rows">' + rows + '</div>' + clinch + '</div></section>';
    }

    /* ── 2. Head to head ─────────────────────────────────────────── */
    let RACES = [];

    function compare(aName, bName) {
        const acc = {};
        [aName, bName].forEach((n) => {
            acc[n] = { pts: 0, wins: 0, podiums: 0, dnf: 0, starts: 0, grid: [], fin: [], team: '' };
        });

        RACES.forEach((race) => {
            const found = {};
            (race.Results || []).forEach((res) => {
                const full = res.Driver.givenName + ' ' + res.Driver.familyName;
                if (full !== aName && full !== bName) return;
                found[full] = res;
                const e = acc[full];
                e.team = res.Constructor.name;
                e.starts++;
                e.pts += Number(res.points) || 0;
                const pos = Number(res.position);
                const grid = Number(res.grid);
                if (pos === 1) e.wins++;
                if (pos <= 3) e.podiums++;
                if (!/finished|\+\d+ lap/i.test(res.status || '')) e.dnf++;
                if (grid > 0) e.grid.push(grid);
                if (pos > 0) e.fin.push(pos);
            });
            // Only score the duel where both were classified.
            const A = found[aName], B = found[bName];
            if (A && B) {
                acc[aName].both = (acc[aName].both || 0) + 1;
                const ag = Number(A.grid), bg = Number(B.grid);
                if (ag > 0 && bg > 0) {
                    acc[aName].q = (acc[aName].q || 0) + (ag < bg ? 1 : 0);
                    acc[bName].q = (acc[bName].q || 0) + (bg < ag ? 1 : 0);
                }
                const ap = Number(A.position), bp = Number(B.position);
                if (ap > 0 && bp > 0) {
                    acc[aName].r = (acc[aName].r || 0) + (ap < bp ? 1 : 0);
                    acc[bName].r = (acc[bName].r || 0) + (bp < ap ? 1 : 0);
                }
            }
        });

        const avg = (arr) => (arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : '—');
        const A = acc[aName], B = acc[bName];

        const line = (label, x, y, lowerWins) => {
            const nx = parseFloat(x), ny = parseFloat(y);
            let xw = false, yw = false;
            if (Number.isFinite(nx) && Number.isFinite(ny) && nx !== ny) {
                xw = lowerWins ? nx < ny : nx > ny;
                yw = !xw;
            }
            return '<div class="h2h__r">' +
                '<span class="h2h__v' + (xw ? ' is-win' : '') + '">' + x + '</span>' +
                '<span class="h2h__l">' + label + '</span>' +
                '<span class="h2h__v r' + (yw ? ' is-win' : '') + '">' + y + '</span></div>';
        };

        return '<div class="h2h__grid">' +
            '<div class="h2h__r is-head">' +
            '<span class="h2h__who">' + esc(surname(aName)) +
                '<span class="h2h__team">' + esc(A.team || '—') + '</span></span>' +
            // The duels below are scored only where both drivers appeared, so
            // the header states that shared count — not the larger of the two,
            // which implied a common basis that might not exist.
            '<span class="h2h__l">' + (A.both ? A.both + ' shared races' : 'no shared races') + '</span>' +
            '<span class="h2h__who r">' + esc(surname(bName)) +
                '<span class="h2h__team">' + esc(B.team || '—') + '</span></span></div>' +
            line('Points', A.pts, B.pts, false) +
            line('Wins', A.wins, B.wins, false) +
            line('Podiums', A.podiums, B.podiums, false) +
            line('Qualifying', A.q || 0, B.q || 0, false) +
            line('Race', A.r || 0, B.r || 0, false) +
            line('Avg grid', avg(A.grid), avg(B.grid), true) +
            line('Avg finish', avg(A.fin), avg(B.fin), true) +
            line('Retirements', A.dnf, B.dnf, true) +
            '</div>' +
            '<p class="h2h__note">Qualifying and race are wins in the direct duel — counted only ' +
            'across races where both were classified, so a retirement is not scored as a defeat.</p>';
    }

    function headToHead(standings) {
        const opts = standings.map((d) =>
            '<option value="' + esc(d.driver) + '">' + esc(d.driver) + '</option>').join('');
        return '<section class="xtra"><h3 class="xtra__h">Head to head</h3>' +
            '<p class="xtra__s">Any two drivers on the grid, over this season. The teammate ' +
            'record already covers drivers sharing a garage; this covers everyone else.</p>' +
            '<div class="h2h__pick">' +
            '<div class="h2h__f"><label for="h2h-a">Driver</label>' +
            '<select id="h2h-a">' + opts + '</select></div>' +
            '<div class="h2h__f"><label for="h2h-b">Against</label>' +
            '<select id="h2h-b">' + opts + '</select></div></div>' +
            '<div id="h2h-out"></div></section>';
    }

    /* ── Boot ────────────────────────────────────────────────────── */
    let built = false;

    function build() {
        if (built) return true;
        const host = document.getElementById('tracker');
        if (!host) return false;

        const standings = globalVar('driverStandings2026') || globalVar('driverStandings');
        const cal = globalVar('raceCalendar2026') || globalVar('raceCalendar');
        const results = window.__seasonResults;
        if (!Array.isArray(standings) || !standings.length) return false;
        if (!Array.isArray(cal) || !cal.length) return false;
        if (!results || !Array.isArray(results.races)) return false;

        injectCSS();
        RACES = results.races;

        try {
            const ctors = (window.__seasonCtors || []).map((c) => ({
                position: c.position, points: c.points, team: c.team,
            }));

            host.insertAdjacentHTML('beforeend',
                permutations(standings, cal, results) +
                (ctors.length ? permutations(ctors, cal, results, {
                    perRace: MAX_RACE_CTOR,
                    perSprint: MAX_SPRINT_CTOR,
                    nameOf: (c) => c.team,
                    subOf: () => '',
                    title: 'Constructors — who is still in it?',
                    unit: 'A team',
                }) : '') +
                headToHead(standings));
        } catch (e) {
            console.warn('[title-race]', e && e.message);
            return false;
        }

        const a = document.getElementById('h2h-a');
        const b = document.getElementById('h2h-b');
        const out = document.getElementById('h2h-out');
        if (a && b && out) {
            a.selectedIndex = 0;
            b.selectedIndex = Math.min(1, standings.length - 1);
            const draw = () => {
                if (a.value === b.value) { out.innerHTML =
                    '<p class="h2h__note">Pick two different drivers.</p>'; return; }
                out.innerHTML = compare(a.value, b.value);
            };
            a.addEventListener('change', draw);
            b.addEventListener('change', draw);
            draw();
        }

        built = true;
        console.info('[title-race] permutations and head-to-head rendered');
        return true;
    }

    function boot() {
        if (build()) return;
        let n = 0;
        const t = setInterval(() => { if (build() || ++n > 90) clearInterval(t); }, 1000);
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 600), { once: true });
    setTimeout(boot, 2000);
})();
