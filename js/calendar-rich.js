/* ══════════════════════════════════════════════════════════════════
   F-ATICS · CALENDAR ENRICHMENT
   Every completed round rendered the same two words — STATUS /
   ARCHIVED — which is the least informative thing a finished race
   could possibly say. The results are already in memory, so a past
   round now shows who actually won it, and the season gets a header
   that says where in the year we are.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    let winners = null;      // round → { name, team, time }
    let bound = false;

    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };

    function buildWinners(races) {
        const map = new Map();
        races.forEach((r) => {
            const w = (r.Results || []).find((x) => Number(x.position) === 1);
            if (!w) return;
            map.set(Number(r.round), {
                name: w.Driver.givenName + ' ' + w.Driver.familyName,
                surname: w.Driver.familyName,
                team: w.Constructor.name,
                time: (w.Time && w.Time.time) || '',
            });
        });
        return map;
    }

    /* The card markup is produced by script.js and re-produced on every
       search or filter change, so enrichment has to be re-applied rather
       than done once. */
    function enrich() {
        if (!winners) return;
        const cards = document.querySelectorAll('#calendar .calendar-card');
        cards.forEach((card) => {
            if (card.dataset.enriched === '1') return;
            const roundEl = card.querySelector('.calendar-round');
            const round = parseInt((roundEl && roundEl.textContent || '').replace(/\D/g, ''), 10);
            const w = winners.get(round);
            const slot = card.querySelector('.calendar-countdown');
            if (!slot) return;

            if (w && card.classList.contains('completed')) {
                slot.classList.add('cal-winner');
                slot.innerHTML =
                    '<div class="cal-winner__l">Winner</div>' +
                    '<div class="cal-winner__n">' + esc(w.surname) + '</div>' +
                    '<div class="cal-winner__t">' + esc(w.team) + '</div>';
                card.dataset.enriched = '1';
            } else if (!card.classList.contains('completed')) {
                card.dataset.enriched = '1';
            }
        });
    }

    function hero(cal) {
        const host = document.getElementById('calendar');
        if (!host || document.querySelector('.season-bar')) return;
        const now = new Date();
        const done = cal.filter((r) => new Date(r.date) < now);
        const next = cal.find((r) => new Date(r.date) >= now);
        const pct = Math.round((done.length / cal.length) * 100);

        const ticks = cal.map((r) => {
            const past = new Date(r.date) < now;
            const isNext = next && r.round === next.round;
            return '<span class="season-bar__tick' + (past ? ' is-done' : '') +
                   (isNext ? ' is-next' : '') + '" title="R' + r.round + ' ' + esc(r.name) + '"></span>';
        }).join('');

        const html =
            '<div class="season-bar">' +
            '  <div class="season-bar__top">' +
            '    <div><span class="season-bar__k">Season progress</span>' +
            '         <b class="season-bar__v">' + done.length + ' <i>of</i> ' + cal.length + '</b>' +
            '         <span class="season-bar__s">rounds complete · ' + pct + '%</span></div>' +
            (next ? '    <div class="season-bar__next"><span class="season-bar__k">Up next</span>' +
                    '<b class="season-bar__v">' + esc(next.flag || '') + ' ' + esc(next.name) + '</b>' +
                    '<span class="season-bar__s">Round ' + next.round + ' · ' +
                    new Date(next.date + 'T12:00:00Z').toLocaleDateString('en-GB',
                        { day: 'numeric', month: 'long', timeZone: 'UTC' }) + '</span></div>' : '') +
            '  </div>' +
            '  <div class="season-bar__track">' + ticks + '</div>' +
            '</div>';

        const head = host.querySelector('.section-header');
        if (head) head.insertAdjacentHTML('afterend', html);
    }

    function watch() {
        if (bound) return;
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        bound = true;
        new MutationObserver(() => enrich()).observe(grid, { childList: true });
    }

    function handleResults(detail) {
        const races = (detail && detail.races) || [];
        if (!races.length || winners) return;
        winners = buildWinners(races);
        watch();
        enrich();
        console.info('[calendar] winners attached for ' + winners.size + ' rounds');
    }

    document.addEventListener('season:results', (e) => handleResults(e.detail));

    // Same backstop as season-extras: one event is one chance to be listening.
    let tries = 0;
    const poll = setInterval(() => {
        if (window.__seasonResults) { handleResults(window.__seasonResults); clearInterval(poll); }
        else if (++tries > 60) clearInterval(poll);
    }, 1000);

    document.addEventListener('season:loaded', (e) => {
        const cal = e.detail && e.detail.cal;
        if (cal && cal.length) {
            hero(cal);
            // The stale copy promised twenty-four rounds; the season has 23.
            const sub = document.querySelector('#calendar .section-subtitle');
            if (sub) {
                sub.textContent = cal.length + ' rounds across five continents, in order, ' +
                                  'with every completed race showing who won it.';
            }
        }
        watch();
        enrich();
    });
})();
