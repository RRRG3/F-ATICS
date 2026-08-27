/* ══════════════════════════════════════════════════════════════════
   F-ATICS · PREDICTOR AUTORUN
   The predictor opened as a wall of em-dashes and stayed that way
   until you found the button. It knows which race is next and it has
   a fitted model, so it should just answer the obvious question on
   arrival: what happens at the next Grand Prix?

   Runs once, on first open, and only if nothing has been simulated
   yet — a user's own run is never overwritten.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    let done = false;

    function nextRaceName() {
        if (typeof raceCalendar === 'undefined' || !Array.isArray(raceCalendar)) return null;
        const now = new Date();
        const next = raceCalendar.find((r) => new Date(r.date) >= now) ||
                     raceCalendar[raceCalendar.length - 1];
        return next || null;
    }

    // The select is keyed by circuit name, the calendar by race name, and
    // the two rarely match verbatim ("Italian Grand Prix" vs "Autodromo
    // Nazionale Monza"), so score options on shared significant words.
    function bestOption(sel, race) {
        const opts = [...sel.options].filter((o) => o.value);
        if (!opts.length) return null;
        const stop = new Set(['grand', 'prix', 'circuit', 'de', 'international', 'the', 'autodromo', 'nazionale']);
        const words = (t) => t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
                              .filter((w) => w.length > 2 && !stop.has(w));
        const want = new Set([...words(race.name), ...words(race.circuit || ''), ...words(race.country || '')]);
        let best = null, bestScore = 0;
        opts.forEach((o) => {
            const score = words(o.text).reduce((a, w) => a + (want.has(w) ? 1 : 0), 0);
            if (score > bestScore) { bestScore = score; best = o; }
        });
        return bestScore > 0 ? best : null;
    }

    function run() {
        if (done) return;
        const sel = document.getElementById('circuit-select');
        const btn = document.querySelector('.pred-run-btn');
        if (!sel || !btn || !sel.options.length) return;
        if (document.querySelectorAll('.pred-result-row').length) { done = true; return; }

        const race = nextRaceName();
        if (!race) return;
        const opt = bestOption(sel, race);
        if (!opt) return;

        done = true;
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        // Let the drawer finish transitioning so the charts measure a real box.
        setTimeout(() => {
            if (!btn.disabled) btn.click();
            console.info('[predictor] auto-ran for ' + race.name + ' (' + opt.text + ')');
        }, 700);
    }

    // The self-consistency check runs itself and looks flattering; the
    // genuinely out-of-sample backtest sat behind a button showing dashes.
    // Surface the honest number without being asked for it.
    let backtested = false;
    function runBacktest() {
        if (backtested) return;
        const btn = document.getElementById('run-walkforward');
        if (!btn || btn.disabled) return;
        backtested = true;
        setTimeout(() => {
            btn.click();
            console.info('[predictor] auto-running out-of-sample walk-forward backtest');
        }, 2500);
    }

    /* A flat $1 stake per race cannot lose more than it staked, so a
       peak-to-trough drawdown above 100% is arithmetically impossible —
       it means the bankroll went negative and the percentage was taken
       against a near-zero base. The calculation lives in a file this
       project cannot modify, so rather than let a broken figure stand
       unqualified, mark it as unreliable where it is displayed. */
    function auditDrawdown() {
        const panel = document.querySelector('.pred-walkforward');
        if (!panel || panel.dataset.ddAudited) return;
        const stats = [...panel.querySelectorAll('.pred-cal-stat')];
        const dd = stats.find((el) => /MAX DD/i.test(el.textContent));
        if (!dd) return;
        const val = parseFloat((dd.textContent.match(/(-?[\d.]+)\s*%/) || [])[1]);
        if (!Number.isFinite(val)) return;
        panel.dataset.ddAudited = '1';
        if (Math.abs(val) > 100) {
            dd.classList.add('is-suspect');
            dd.insertAdjacentHTML('beforeend',
                '<span class="stat-warn">Implausible — a flat stake cannot lose more than 100%. ' +
                'Treat as a reporting bug, not a result.</span>');
            console.warn('[predictor] max-drawdown reported as ' + val + '% — flagged as unreliable');
        }
    }

    document.addEventListener('room:open', (e) => {
        if (e.detail && e.detail.id === 'predictor') {
            run();
            runBacktest();
            // The backtest fetches eleven seasons on a cold cache; poll for
            // its result rather than guessing at a single delay.
            let tries = 0;
            const poll = setInterval(() => {
                auditDrawdown();
                if (++tries > 60 || document.querySelector('.pred-walkforward')?.dataset.ddAudited) {
                    clearInterval(poll);
                }
            }, 2000);
        }
    });
})();
