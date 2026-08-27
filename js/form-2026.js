/* ══════════════════════════════════════════════════════════════════
   F-ATICS · CURRENT-SEASON FIT
   ═════════════════════════════════════════════════════════════════
   The predictor was trained on 2014–2024 and then hand-nudged for
   2026 with comments like "McLaren dominant" and "Russell lead
   driver". Twelve rounds of 2026 have actually been run and they say
   something else entirely — Antonelli leads on 242 with six wins and
   Mercedes are 87 clear in the constructors.

   This measures the season instead of guessing it. Every figure below
   is derived from finishing positions, grid slots and retirements in
   the real results; nothing is authored by hand.

   Shrinkage: a twelve-race sample is informative but not decisive, so
   each figure is blended toward the historical prior with weight
   n/(n+6) — about 0.67 at this point in the year, rising as the season
   goes on. That keeps a driver with two freak results from being
   re-rated on noise.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const SHRINK_K = 6;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const sd = (a) => {
        if (a.length < 2) return 0;
        const m = mean(a);
        return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length);
    };

    // Finishing/grid position → the model's 0-100 scale. P1 ≈ 100, P20 ≈ 60.
    const posToScore = (p) => clamp(Math.round(100 - (p - 1) * 2.2), 60, 100);

    // Teams and drivers are named differently by the API and the model.
    const TEAM_ALIAS = {
        'Red Bull': 'Red Bull Racing',
        'RB F1 Team': 'Racing Bulls',
        'Sauber': 'Kick Sauber',
        'Alfa Romeo': 'Kick Sauber',
    };

    const surname = (s) => s.trim().split(/\s+/).slice(-1)[0].toLowerCase();

    function fit(races, sprints) {
        const drv = new Map();   // surname → tally
        const team = new Map();

        const touchD = (k) => {
            if (!drv.has(k)) drv.set(k, { name: '', team: '', pos: [], grid: [], pts: 0, starts: 0, dnf: 0 });
            return drv.get(k);
        };
        const touchT = (k) => {
            if (!team.has(k)) team.set(k, { pos: [], grid: [], pts: 0, starts: 0, dnf: 0 });
            return team.get(k);
        };

        races.forEach((r) => {
            (r.Results || []).forEach((res) => {
                const key = surname(res.Driver.familyName);
                const d = touchD(key);
                const tname = TEAM_ALIAS[res.Constructor.name] || res.Constructor.name;
                const t = touchT(tname);

                d.name = res.Driver.givenName + ' ' + res.Driver.familyName;
                d.team = tname;
                d.starts++; t.starts++;
                d.pts += Number(res.points || 0);
                t.pts += Number(res.points || 0);

                const g = Number(res.grid);
                if (g > 0) { d.grid.push(g); t.grid.push(g); }

                // "Lapped" is still a classified finish; anything else is not.
                const classified = res.status === 'Finished' || /^\+\d+ Lap/.test(res.status) ||
                                   res.status === 'Lapped';
                const p = Number(res.position);
                if (classified && p > 0) { d.pos.push(p); t.pos.push(p); }
                else { d.dnf++; t.dnf++; d.pos.push(19); t.pos.push(19); }
            });
        });

        sprints.forEach((r) => {
            (r.SprintResults || []).forEach((res) => {
                const d = touchD(surname(res.Driver.familyName));
                const t = touchT(TEAM_ALIAS[res.Constructor.name] || res.Constructor.name);
                d.pts += Number(res.points || 0);
                t.pts += Number(res.points || 0);
            });
        });

        // Ergast paginates by RESULT, so a race straddling a page boundary
        // arrives twice with its results split. The results themselves are
        // never duplicated, but counting entries overstates the round count
        // (14 for a 12-round season) and inflates the shrinkage weight.
        const rounds = new Set(races.map((r) => r.round)).size;
        return { drv, team, rounds };
    }

    function apply(fitted) {
        const model = window.predictionModel;
        if (!model || !model._DRIVER_FEATURES || !model._TEAM_CAR) return null;

        const { drv, team, rounds } = fitted;
        if (!rounds) return null;

        const w = rounds / (rounds + SHRINK_K);
        const mix = (live, prior) => Math.round(live * w + prior * (1 - w));

        const maxDrvPts = Math.max(...[...drv.values()].map((d) => d.pts), 1);
        const maxTeamPts = Math.max(...[...team.values()].map((t) => t.pts), 1);

        // Index the model's driver keys by surname so 'Kimi Antonelli' and
        // 'Andrea Kimi Antonelli' resolve to the same person.
        const byKey = new Map();
        Object.keys(model._DRIVER_FEATURES).forEach((k) => byKey.set(surname(k), k));

        let drivers = 0, teams = 0;
        const changes = [];

        drv.forEach((d, key) => {
            const modelKey = byKey.get(key);
            if (!modelKey || d.starts < 3) return;
            const f = model._DRIVER_FEATURES[modelKey];
            const before = f.pace;

            const avgPos = mean(d.pos);
            const avgGrid = d.grid.length ? mean(d.grid) : avgPos;

            f.pace = mix(posToScore(avgPos), f.pace);
            f.quali = mix(posToScore(avgGrid), f.quali);
            f.consistency = mix(clamp(Math.round(100 - sd(d.pos) * 3.2), 60, 98), f.consistency);
            f.err = +(clamp(d.dnf / d.starts, 0.02, 0.25) * w + f.err * (1 - w)).toFixed(4);
            f.elo = Math.round((2300 + 600 * (d.pts / maxDrvPts)) * w + f.elo * (1 - w));
            // Form is the last ten races on a 1-10 scale, most recent last.
            f.form = d.pos.slice(-10).map((p) => clamp(11 - Math.min(p, 10), 1, 10));

            drivers++;
            if (Math.abs(f.pace - before) >= 2) {
                changes.push(modelKey + ' pace ' + before + '→' + f.pace);
            }
        });

        team.forEach((t, name) => {
            const car = model._TEAM_CAR[name];
            if (!car || t.starts < 6) return;
            const avgPos = mean(t.pos);
            car.df = mix(posToScore(avgPos), car.df);
            car.eff = mix(posToScore(avgPos), car.eff);
            car.rel = +(clamp(1 - t.dnf / t.starts, 0.90, 0.995) * w + car.rel * (1 - w)).toFixed(3);
            car.elo = Math.round((2300 + 600 * (t.pts / maxTeamPts)) * w + car.elo * (1 - w));
            teams++;
        });

        // ── Track affinity recalibration ──────────────────────────
        // The shipped affinities run 3–11 on a scale where 2.2 points is a
        // whole finishing position, so "likes this circuit" was worth up to
        // five places — enough to make a P5 championship driver a 59% Monza
        // favourite over a leader with six wins. A real track-specialist
        // edge is worth well under a position, so this rescales the whole
        // table into that range and leaves the ordering untouched.
        let affinities = 0, affMaxBefore = 0;
        const AFF_CAP = 2.5;
        const aff = model._TRACK_AFFINITY;
        if (aff && !aff.__damped) {
            const vals = [];
            Object.values(aff).forEach((byDriver) => {
                if (byDriver && typeof byDriver === 'object') {
                    Object.values(byDriver).forEach((v) => { if (typeof v === 'number') vals.push(Math.abs(v)); });
                }
            });
            affMaxBefore = vals.length ? Math.max(...vals) : 0;
            if (affMaxBefore > AFF_CAP) {
                const k = AFF_CAP / affMaxBefore;
                Object.values(aff).forEach((byDriver) => {
                    if (byDriver && typeof byDriver === 'object') {
                        Object.keys(byDriver).forEach((d) => {
                            if (typeof byDriver[d] === 'number') {
                                byDriver[d] = +(byDriver[d] * k).toFixed(2);
                                affinities++;
                            }
                        });
                    }
                });
            }
            Object.defineProperty(aff, '__damped', { value: true, enumerable: false });
        }

        return { drivers, teams, rounds, weight: +w.toFixed(2), changes,
                 affinities, affMaxBefore, affMaxAfter: AFF_CAP };
    }

    function banner(info) {
        const host = document.querySelector('#predictor .container') || document.getElementById('predictor');
        if (!host || !info || document.querySelector('.fit-note')) return;
        const head = host.querySelector('.section-header');
        const html =
            '<p class="fit-note">' +
            '<span class="fit-note__dot"></span>' +
            // One text node, not bare text plus <b> tags: in a flex container
            // every <b> becomes its own flex item and the sentence shatters.
            '<span class="fit-note__t">' +
            'Fitted to <b>' + info.rounds + '</b> completed 2026 rounds — pace, qualifying, ' +
            'consistency, reliability and Elo are measured from real finishing data, ' +
            'shrunk toward the historical prior at weight <b>' + info.weight + '</b>.' +
            '</span></p>';
        if (head) head.insertAdjacentHTML('beforeend', html);
        else host.insertAdjacentHTML('afterbegin', html);
    }

    document.addEventListener('season:results', (e) => {
        try {
            const { races = [], sprints = [] } = e.detail || {};
            if (!races.length) return;
            const info = apply(fit(races, sprints));
            if (!info) return;
            console.info('[form-2026] refit ' + info.drivers + ' drivers / ' + info.teams +
                         ' teams from ' + info.rounds + ' rounds (w=' + info.weight + ')' +
                         (info.changes.length ? ' · ' + info.changes.slice(0, 6).join(', ') : ''));
            banner(info);
            document.dispatchEvent(new CustomEvent('model:refit', { detail: info }));
        } catch (err) {
            console.warn('[form-2026]', err && err.message);
        }
    });
})();
