/* ══════════════════════════════════════════════════════════════════
   F-ATICS · SEASON EXTRAS
   Three views built from data already fetched for other things, so
   none of this costs a request:

     · Grid vs finish — who actually gains places on Sunday
     · Sprint results — fetched for the battle chart, never shown
     · Teammate record — qualifying and race head-to-head, not just
       a points bar, which flatters whoever had the reliable car
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };
    const surname = (s) => String(s).trim().split(/\s+/).slice(-1)[0];

    function tally(races) {
        const d = new Map();
        const touch = (k) => {
            if (!d.has(k)) d.set(k, { name: '', team: '', gained: 0, starts: 0, grid: [], fin: [], beatQ: 0, beatR: 0, vs: 0 });
            return d.get(k);
        };
        races.forEach((r) => {
            const byTeam = new Map();
            (r.Results || []).forEach((res) => {
                const key = res.Driver.driverId;
                const e = touch(key);
                e.name = res.Driver.givenName + ' ' + res.Driver.familyName;
                e.team = res.Constructor.name;
                const g = Number(res.grid), p = Number(res.position);
                if (g > 0 && p > 0) {
                    e.starts++;
                    e.gained += (g - p);
                    e.grid.push(g);
                    e.fin.push(p);
                }
                if (!byTeam.has(res.Constructor.name)) byTeam.set(res.Constructor.name, []);
                byTeam.get(res.Constructor.name).push({ key, g, p });
            });
            // Teammate comparison, race by race, only when both cars have a
            // classified result — otherwise a DNF counts as being "beaten".
            byTeam.forEach((pair) => {
                if (pair.length !== 2) return;
                const [a, b] = pair;
                if (a.g > 0 && b.g > 0) {
                    touch(a.key).vs++; touch(b.key).vs++;
                    if (a.g < b.g) touch(a.key).beatQ++; else touch(b.key).beatQ++;
                }
                if (a.p > 0 && b.p > 0) {
                    if (a.p < b.p) touch(a.key).beatR++; else touch(b.key).beatR++;
                }
            });
        });
        return d;
    }

    function movers(map) {
        const rows = [...map.values()].filter((e) => e.starts >= 4)
            .sort((a, b) => b.gained - a.gained);
        if (rows.length < 4) return '';
        const top = rows.slice(0, 5);
        const bot = rows.slice(-5).reverse();
        const max = Math.max(...rows.map((e) => Math.abs(e.gained)), 1);

        const bar = (e) => {
            const w = (Math.abs(e.gained) / max) * 50;
            const up = e.gained >= 0;
            return '<div class="mv__row">' +
                '<span class="mv__n">' + esc(surname(e.name)) + '</span>' +
                '<div class="mv__track">' +
                '  <i class="mv__bar ' + (up ? 'is-up' : 'is-dn') + '" style="width:' + w.toFixed(1) +
                '%;' + (up ? 'left:50%' : 'right:50%') + '"></i>' +
                '  <span class="mv__mid"></span>' +
                '</div>' +
                '<span class="mv__v">' + (up ? '+' : '') + e.gained + '</span></div>';
        };

        return '<section class="xtra"><h3 class="xtra__h">Grid vs finish</h3>' +
            '<p class="xtra__s">Net places gained across the season — start position minus finish, ' +
            'summed. Positive means the driver is making up ground on Sunday rather than on Saturday.</p>' +
            '<div class="mv">' + top.map(bar).join('') +
            '<div class="mv__split"></div>' + bot.map(bar).join('') + '</div></section>';
    }

    function teammates(map) {
        const byTeam = new Map();
        map.forEach((e) => {
            if (!e.team || e.starts < 3) return;
            if (!byTeam.has(e.team)) byTeam.set(e.team, []);
            byTeam.get(e.team).push(e);
        });
        const cards = [...byTeam.entries()].filter(([, p]) => p.length === 2).map(([team, [a, b]]) => {
            const line = (l, x, y) =>
                '<div class="tmv__line"><span class="tmv__l">' + l + '</span>' +
                '<b class="' + (x >= y ? 'is-win' : '') + '">' + x + '</b>' +
                '<span class="tmv__d">–</span>' +
                '<b class="' + (y > x ? 'is-win' : '') + '">' + y + '</b></div>';
            const avg = (arr) => (arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : '—');
            return '<div class="tmv">' +
                '<div class="tmv__t">' + esc(team) + '</div>' +
                '<div class="tmv__names"><span>' + esc(surname(a.name)) + '</span>' +
                '<span>' + esc(surname(b.name)) + '</span></div>' +
                line('Qualifying', a.beatQ, b.beatQ) +
                line('Race', a.beatR, b.beatR) +
                '<div class="tmv__line"><span class="tmv__l">Avg grid</span>' +
                '<b>' + avg(a.grid) + '</b><span class="tmv__d">·</span><b>' + avg(b.grid) + '</b></div>' +
                '<div class="tmv__line"><span class="tmv__l">Avg finish</span>' +
                '<b>' + avg(a.fin) + '</b><span class="tmv__d">·</span><b>' + avg(b.fin) + '</b></div>' +
                '</div>';
        }).join('');
        if (!cards) return '';
        return '<section class="xtra"><h3 class="xtra__h">Teammate record</h3>' +
            '<p class="xtra__s">Head-to-head where both cars were classified. Points flatter whoever ' +
            'had the reliable car; this does not.</p>' +
            '<div class="tmv__grid">' + cards + '</div></section>';
    }

    function sprints(sp) {
        const rounds = sp.filter((r) => (r.SprintResults || []).length);
        if (!rounds.length) return '';
        const rows = rounds.sort((a, b) => Number(a.round) - Number(b.round)).map((r) => {
            const top3 = (r.SprintResults || []).slice(0, 3)
                .map((x, i) => '<span class="spr__p"><i>' + (i + 1) + '</i>' +
                     esc(x.Driver.familyName) + '</span>').join('');
            return '<div class="spr__row"><span class="spr__r">R' + r.round + '</span>' +
                   '<span class="spr__n">' + esc(r.raceName.replace(' Grand Prix', '')) + '</span>' +
                   '<div class="spr__p3">' + top3 + '</div></div>';
        }).join('');
        return '<section class="xtra"><h3 class="xtra__h">Sprint results</h3>' +
            '<p class="xtra__s">' + rounds.length + ' sprint' + (rounds.length > 1 ? 's' : '') +
            ' this season. These points count toward the championship and were previously invisible here.</p>' +
            '<div class="spr">' + rows + '</div></section>';
    }

    function handle(detail) {
        const { races = [], sprints: sp = [] } = detail || {};
        if (!races.length) return;
        const host = document.getElementById('tracker');
        if (!host || document.querySelector('.mv')) return;
        try {
            const map = tally(races);
            host.insertAdjacentHTML('beforeend', movers(map) + teammates(map) + sprints(sp));
            console.info('[season-extras] grid-vs-finish, teammate record and sprints rendered');
        } catch (err) {
            console.warn('[season-extras]', err && err.message);
        }
    }

    document.addEventListener('season:results', (e) => handle(e.detail));

    // Backstop: if the dispatch landed before this module was listening,
    // the payload is still on window.
    let tries = 0;
    const poll = setInterval(() => {
        if (window.__seasonResults) { handle(window.__seasonResults); clearInterval(poll); }
        else if (++tries > 60) clearInterval(poll);
    }, 1000);
})();
