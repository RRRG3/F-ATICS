/* ══════════════════════════════════════════════════════════════════
   F-ATICS · PREDICTION SCORECARD
   The predictor was a thing you pressed once. Saving a call makes it
   something you come back to: the site keeps your prediction, and
   once that race has actually run it scores it against the result.

   Scoring uses the same two measures the model reports on itself, so
   your number and its number are directly comparable:
     · hit rate  — did the predicted winner win, was the podium right
     · Brier     — squared error on the stated win probability, which
                   punishes being confident and wrong more than being
                   unsure and wrong

   Saved calls live in localStorage; nothing leaves the browser.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const KEY = 'fatics:predictions:v1';
    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };
    const surname = (s) => String(s || '').trim().split(/\s+/).slice(-1)[0];
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

    const CSS = `
.ps { margin-top: clamp(24px, 3vw, 36px); border: 1px solid var(--line);
    border-radius: 8px; background: var(--surface); padding: clamp(20px, 2.6vw, 28px); }
.ps__top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between;
    gap: 12px; margin-bottom: 16px; }
.ps__h { font-family: var(--font-display); font-size: 17px; font-weight: 700;
    letter-spacing: -0.02em; text-transform: uppercase; color: var(--fg); }
.ps__s { font-size: 13px; line-height: 1.6; color: var(--fg-dim); max-width: 62ch; margin-bottom: 16px; }
.ps__save { padding: 11px 20px; border-radius: 5px; border: 1px solid var(--accent);
    background: transparent; color: var(--accent-text, var(--accent)); cursor: pointer;
    font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; }
.ps__save:hover:not(:disabled) { background: var(--accent); color: #fff; }
.ps__save:disabled { opacity: 0.45; cursor: default; }

.ps__tally { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
    gap: 12px; margin-bottom: 18px; }
.ps__stat { padding: 14px 16px; border-radius: 6px; background: var(--surface-2); }
.ps__stat b { display: block; font-family: var(--font-display); font-size: 26px; font-weight: 700;
    letter-spacing: -0.03em; color: var(--fg); line-height: 1; font-variant-numeric: tabular-nums; }
.ps__stat span { display: block; font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg-mute); margin-top: 6px; }

.ps__list { display: grid; gap: 6px; }
.ps__row { display: grid; grid-template-columns: minmax(0, 1fr) 120px 96px auto;
    gap: 12px; align-items: center; padding: 12px 14px; border-radius: 5px;
    background: var(--surface-2); border-left: 3px solid var(--line); }
.ps__row.is-hit { border-left-color: #3E8E5A; }
.ps__row.is-miss { border-left-color: var(--accent); }
.ps__where { font-size: 13px; color: var(--fg); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
.ps__where span { display: block; font-family: var(--font-mono); font-size: 9.5px;
    color: var(--fg-mute); margin-top: 2px; }
.ps__call { font-size: 12px; color: var(--fg-dim); }
.ps__call b { color: var(--fg); }
.ps__out { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--fg-mute); }
.ps__out.is-hit { color: #6FBF8B; }
.ps__out.is-miss { color: var(--accent-text, var(--accent)); }
.ps__del { border: none; background: none; color: var(--fg-mute); cursor: pointer;
    font-size: 15px; line-height: 1; padding: 4px 6px; }
.ps__del:hover { color: var(--accent-text, var(--accent)); }
.ps__empty { font-size: 13px; color: var(--fg-mute); line-height: 1.6; }
.ps__hind { font-style: normal; color: var(--fg-mute); letter-spacing: 0.1em; }

@media (max-width: 700px) {
  .ps__row { grid-template-columns: minmax(0,1fr) auto; }
  .ps__call { display: none; }
}
`;

    function injectCSS() {
        if (document.getElementById('prediction-score-css')) return;
        const el = document.createElement('style');
        el.id = 'prediction-score-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } };
    const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) {} };

    /* Read whatever the predictor currently has on screen. */
    function currentCall() {
        const rows = [...document.querySelectorAll('#prediction-results .pred-result-row')];
        if (!rows.length) return null;
        const top = rows.slice(0, 3).map((r) => {
            const n = r.querySelector('.pred-driver-name');
            const v = r.querySelector('.pred-stat-win .pred-stat-val');
            return {
                driver: ((n && (n.dataset.driver || n.textContent)) || '').trim(),
                win: parseFloat((v && v.textContent) || '') || 0,
            };
        });
        const sel = document.getElementById('circuit-select');
        const wx = document.getElementById('weather-select');
        if (!top[0] || !top[0].driver) return null;
        return {
            circuit: sel ? sel.value : '',
            weather: wx ? wx.value : 'dry',
            top,
            at: Date.now(),
        };
    }

    /* Match a saved call to a real result, once that race has run. */
    function outcomeFor(call) {
        const results = window.__seasonResults;
        if (!results || !Array.isArray(results.races)) return null;
        const want = norm(call.circuit);
        if (!want) return null;

        const race = results.races.find((r) => {
            const c = r.Circuit || {};
            return norm(c.circuitName) === want ||
                   norm(c.circuitName).includes(want) ||
                   want.includes(norm(c.circuitName));
        });
        if (!race) return null;

        // A call made after the race had already run is still worth showing —
        // it is how you check the model against a known result — but it is
        // hindsight, so it is tagged and kept out of the headline tally.
        const when = Date.parse(race.date + 'T00:00:00Z');
        const hindsight = Number.isFinite(when) && when < call.at - 86400000;

        const podium = (race.Results || []).slice(0, 3)
            .map((r) => r.Driver.givenName + ' ' + r.Driver.familyName);
        if (!podium.length) return null;

        const pickedWinner = call.top[0].driver;
        const wonIt = norm(podium[0]) === norm(pickedWinner);
        const onPodium = podium.some((p) => norm(p) === norm(pickedWinner));
        const hits = call.top.filter((t) => podium.some((p) => norm(p) === norm(t.driver))).length;

        // Brier on the stated win probability of the pick.
        const p = Math.max(0, Math.min(1, (call.top[0].win || 0) / 100));
        const brier = Math.pow(p - (wonIt ? 1 : 0), 2);

        return { race: race.raceName, podium, wonIt, onPodium, hits, brier, hindsight };
    }

    function render(host) {
        const calls = load();
        const scored = calls.map((c) => ({ call: c, out: outcomeFor(c) }));
        const done = scored.filter((s) => s.out && !s.out.hindsight);
        const hind = scored.filter((s) => s.out && s.out.hindsight).length;

        const wins = done.filter((s) => s.out.wonIt).length;
        const pods = done.filter((s) => s.out.onPodium).length;
        const brier = done.length
            ? (done.reduce((a, s) => a + s.out.brier, 0) / done.length).toFixed(3) : '—';

        const tally = done.length
            ? '<div class="ps__tally">' +
              '<div class="ps__stat"><b>' + wins + '/' + done.length + '</b><span>winner called</span></div>' +
              '<div class="ps__stat"><b>' + pods + '/' + done.length + '</b><span>pick on podium</span></div>' +
              '<div class="ps__stat"><b>' + brier + '</b><span>brier score</span></div>' +
              '<div class="ps__stat"><b>' + calls.length + '</b><span>calls saved</span></div>' +
              '</div>'
            : (hind ? '<p class="ps__empty">' + hind + ' saved call' + (hind === 1 ? '' : 's') +
                      ' cover races that had already been run, so they are scored below but ' +
                      'kept out of the tally. Save a call for an upcoming round to start one.</p>' : '');

        const rows = calls.length ? calls.map((c, i) => {
            const o = outcomeFor(c);
            const cls = o ? (o.wonIt ? ' is-hit' : ' is-miss') : '';
            const verdict = !o
                ? '<span class="ps__out">awaiting race</span>'
                : '<span class="ps__out ' + (o.wonIt ? 'is-hit' : 'is-miss') + '">' +
                  (o.wonIt ? 'called it' : (o.onPodium ? 'podium only' : 'missed')) +
                  ' · ' + o.hits + '/3' +
                  (o.hindsight ? ' <em class="ps__hind">hindsight</em>' : '') + '</span>';
            return '<div class="ps__row' + cls + '">' +
                '<span class="ps__where">' + esc(c.circuit || 'Unknown circuit') +
                    '<span>' + esc(c.weather) + ' · ' +
                    new Date(c.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
                    '</span></span>' +
                '<span class="ps__call">You said <b>' + esc(surname(c.top[0].driver)) + '</b> at ' +
                    (c.top[0].win || 0).toFixed(1) + '%</span>' +
                verdict +
                '<button class="ps__del" data-i="' + i + '" title="Remove" aria-label="Remove saved prediction">×</button>' +
                '</div>';
        }).join('') : '<p class="ps__empty">Nothing saved yet. Run a simulation, then save the call — ' +
                       'once that race has been run this scores it for you.</p>';

        host.innerHTML =
            '<div class="ps__top"><span class="ps__h">Your scorecard</span>' +
            '<button class="ps__save" id="ps-save">Save this prediction</button></div>' +
            '<p class="ps__s">Keep a prediction and it gets marked once the race is in. ' +
            'Brier score is the squared error on the win probability you backed — lower is better, ' +
            'and it penalises being confident and wrong more than being unsure and wrong. ' +
            'The model reports the same measure on itself, so the two are comparable.</p>' +
            tally + '<div class="ps__list">' + rows + '</div>';

        const btn = host.querySelector('#ps-save');
        const call = currentCall();
        if (!call) {
            btn.disabled = true;
            btn.textContent = 'Run a simulation first';
        }
        btn.addEventListener('click', () => {
            const c = currentCall();
            if (!c) return;
            const all = load();
            // One call per circuit — a re-run replaces the old one.
            const at = all.findIndex((x) => norm(x.circuit) === norm(c.circuit));
            if (at >= 0) all[at] = c; else all.unshift(c);
            save(all.slice(0, 30));
            render(host);
        });

        host.querySelectorAll('.ps__del').forEach((b) => {
            b.addEventListener('click', () => {
                const all = load();
                all.splice(Number(b.dataset.i), 1);
                save(all);
                render(host);
            });
        });
    }

    function build() {
        const wrap = document.querySelector('#predictor .predictor-wrapper');
        if (!wrap || wrap.querySelector('.ps')) return false;
        const results = document.getElementById('prediction-results');
        if (!results) return false;

        injectCSS();
        const host = document.createElement('section');
        host.className = 'ps';
        // After the result, before the apparatus disclosure.
        const appx = wrap.querySelector('.appx');
        if (appx) wrap.insertBefore(host, appx); else wrap.appendChild(host);
        render(host);

        // Re-render when a new simulation lands, so the save button wakes up.
        new MutationObserver(() => {
            const btn = host.querySelector('#ps-save');
            const call = currentCall();
            if (btn && call && btn.disabled) {
                btn.disabled = false;
                btn.textContent = 'Save this prediction';
            }
        }).observe(results, { childList: true });

        console.info('[scorecard] ready (' + load().length + ' saved)');
        return true;
    }

    function boot() {
        if (build()) return;
        let n = 0;
        const t = setInterval(() => { if (build() || ++n > 60) clearInterval(t); }, 900);
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 800), { once: true });
    setTimeout(boot, 2400);
})();
