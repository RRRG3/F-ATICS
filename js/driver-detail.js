/**
 * F-ATICS Driver Detail Modal
 * ═════════════════════════════════════════════════════════════════
 * Reuses the IndexedDB historical dataset to render a per-driver
 * deep-dive: career wins, podiums, DNFs, best/worst circuits,
 * head-to-head with current teammate, season-by-season trajectory.
 *
 * Activates by clicking any element with `data-driver="<DriverName>"`
 * or by calling window.openDriverDetail("Lando Norris").
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    // Map "Lando Norris" → Jolpica id ("norris") via the cached dataset.
    // The dataset stores driverId AND driverName on every result row, so
    // we just look up by the full name (case-insensitive).
    function findDriverIdByName(dataset, name) {
        const normalized = name.toLowerCase().trim();
        const hit = dataset.results.find(r => (r.driverName || '').toLowerCase() === normalized);
        return hit?.driverId || null;
    }

    function buildDriverStats(dataset, driverId) {
        const races = dataset.races.slice().sort((a, b) => a.date.localeCompare(b.date));
        const racesById = {};
        races.forEach(r => { racesById[r.raceId] = r; });

        const myResults = dataset.results
            .filter(r => r.driverId === driverId)
            .sort((a, b) => (racesById[a.raceId]?.date || '').localeCompare(racesById[b.raceId]?.date || ''));

        if (myResults.length === 0) return null;

        const wins     = myResults.filter(r => r.finish === 1).length;
        const podiums  = myResults.filter(r => r.finish >= 1 && r.finish <= 3).length;
        const pts      = myResults.filter(r => r.finish >= 1 && r.finish <= 10).length;
        const dnfs     = myResults.filter(r => !Number.isFinite(r.finish)).length;
        const totalRaces = myResults.length;
        const finishedRaces = myResults.filter(r => Number.isFinite(r.finish));
        const avgFinish = finishedRaces.length
            ? +(finishedRaces.reduce((a, b) => a + b.finish, 0) / finishedRaces.length).toFixed(2)
            : null;
        const totalPoints = myResults.reduce((a, b) => a + (b.points || 0), 0);

        // Best / worst circuits (by mean finish, min 2 visits)
        const byCircuit = {};
        myResults.forEach(r => {
            const c = racesById[r.raceId]?.circuitId;
            if (!c || !Number.isFinite(r.finish)) return;
            (byCircuit[c] = byCircuit[c] || []).push(r.finish);
        });
        const circuitStats = Object.entries(byCircuit)
            .filter(([_, arr]) => arr.length >= 2)
            .map(([c, arr]) => ({
                circuitId: c,
                visits: arr.length,
                avgFinish: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2),
                bestFinish: Math.min(...arr),
            }));
        circuitStats.sort((a, b) => a.avgFinish - b.avgFinish);
        const bestCircuits  = circuitStats.slice(0, 5);
        const worstCircuits = circuitStats.slice(-5).reverse();

        // Season trajectory (year → avg finish, wins)
        const bySeason = {};
        myResults.forEach(r => {
            const ra = racesById[r.raceId];
            if (!ra) return;
            const s = ra.season;
            if (!bySeason[s]) bySeason[s] = { races: 0, wins: 0, finishSum: 0, finishN: 0 };
            bySeason[s].races += 1;
            if (r.finish === 1) bySeason[s].wins += 1;
            if (Number.isFinite(r.finish)) {
                bySeason[s].finishSum += r.finish;
                bySeason[s].finishN  += 1;
            }
        });
        const trajectory = Object.entries(bySeason)
            .map(([s, v]) => ({
                season: +s,
                races: v.races,
                wins: v.wins,
                avgFinish: v.finishN ? +(v.finishSum / v.finishN).toFixed(2) : null,
            }))
            .sort((a, b) => a.season - b.season);

        // Current/most-recent teammate H2H (last common season with another driver same team)
        const lastResult = myResults[myResults.length - 1];
        const lastRace = racesById[lastResult.raceId];
        const lastConstructor = lastResult.constructorId;
        let teammateName = null;
        let teammateH2H  = null;
        if (lastConstructor && lastRace) {
            const sameSeasonRaces = Object.values(racesById)
                .filter(r => r.season === lastRace.season)
                .map(r => r.raceId);
            const teammateResults = dataset.results.filter(r =>
                r.constructorId === lastConstructor &&
                r.driverId !== driverId &&
                sameSeasonRaces.includes(r.raceId)
            );
            if (teammateResults.length > 0) {
                const t = teammateResults[0];
                teammateName = t.driverName;
                // H2H race-by-race: who finished ahead
                let myAhead = 0, teammateAhead = 0;
                sameSeasonRaces.forEach(raceId => {
                    const mine = myResults.find(r => r.raceId === raceId);
                    const teammate = teammateResults.find(r => r.raceId === raceId);
                    if (mine?.finish && teammate?.finish) {
                        if (mine.finish < teammate.finish) myAhead += 1;
                        else if (teammate.finish < mine.finish) teammateAhead += 1;
                    }
                });
                teammateH2H = { myAhead, teammateAhead };
            }
        }

        return {
            driverId,
            driverName: myResults[0].driverName,
            constructorId: lastConstructor,
            constructorName: lastResult.constructorName,
            totalRaces, wins, podiums, points: pts, dnfs,
            avgFinish,
            totalPoints,
            bestCircuits, worstCircuits,
            trajectory,
            teammateName, teammateH2H,
        };
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = String(s);
        return div.innerHTML;
    }

    function renderModal(stats) {
        const existing = document.getElementById('driver-detail-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'driver-detail-modal';
        modal.className = 'driver-detail-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', `Career detail for ${stats.driverName}`);

        const dnfRate = stats.totalRaces ? +((stats.dnfs / stats.totalRaces) * 100).toFixed(1) : 0;
        const podiumRate = stats.totalRaces ? +((stats.podiums / stats.totalRaces) * 100).toFixed(1) : 0;
        const winRate = stats.totalRaces ? +((stats.wins / stats.totalRaces) * 100).toFixed(1) : 0;

        modal.innerHTML = `
          <div class="driver-detail-modal__backdrop" data-close></div>
          <div class="driver-detail-modal__panel">
            <button class="driver-detail-modal__close" aria-label="Close" data-close>×</button>
            <div class="driver-detail-modal__head">
              <span class="driver-detail-modal__eyebrow">[ DRIVER / CAREER ]</span>
              <h2 class="driver-detail-modal__title">${escapeHtml(stats.driverName)}</h2>
              <div class="driver-detail-modal__sub">${escapeHtml(stats.constructorName || '—')} · ${stats.totalRaces} career races (dataset 2014+)</div>
            </div>
            <div class="driver-detail-modal__stats">
              <div class="ddm-stat"><div class="ddm-stat__label">[WINS]</div><div class="ddm-stat__val">${stats.wins}</div><div class="ddm-stat__hint">${winRate}% win rate</div></div>
              <div class="ddm-stat"><div class="ddm-stat__label">[PODIUMS]</div><div class="ddm-stat__val">${stats.podiums}</div><div class="ddm-stat__hint">${podiumRate}% podium rate</div></div>
              <div class="ddm-stat"><div class="ddm-stat__label">[POINTS]</div><div class="ddm-stat__val">${stats.points}</div><div class="ddm-stat__hint">top-10 finishes</div></div>
              <div class="ddm-stat"><div class="ddm-stat__label">[DNFs]</div><div class="ddm-stat__val">${stats.dnfs}</div><div class="ddm-stat__hint">${dnfRate}% DNF rate</div></div>
              <div class="ddm-stat"><div class="ddm-stat__label">[AVG FINISH]</div><div class="ddm-stat__val">${stats.avgFinish ?? '—'}</div><div class="ddm-stat__hint">when finished</div></div>
              <div class="ddm-stat"><div class="ddm-stat__label">[TOTAL PTS]</div><div class="ddm-stat__val">${Math.round(stats.totalPoints)}</div><div class="ddm-stat__hint">career points</div></div>
            </div>

            ${stats.teammateName && stats.teammateH2H ? `
              <div class="ddm-block">
                <div class="ddm-block__label">[ HEAD-TO-HEAD · ${escapeHtml(stats.teammateName)} ]</div>
                <div class="ddm-h2h">
                  <span class="ddm-h2h__count" style="color:var(--red)">${stats.teammateH2H.myAhead}</span>
                  <span class="ddm-h2h__bar">
                    <span class="ddm-h2h__bar-me" style="flex:${stats.teammateH2H.myAhead}"></span>
                    <span class="ddm-h2h__bar-them" style="flex:${stats.teammateH2H.teammateAhead}"></span>
                  </span>
                  <span class="ddm-h2h__count">${stats.teammateH2H.teammateAhead}</span>
                </div>
                <div class="ddm-block__hint">races finished ahead, current season</div>
              </div>
            ` : ''}

            <div class="ddm-block">
              <div class="ddm-block__label">[ BEST CIRCUITS ]</div>
              <ul class="ddm-list">
                ${stats.bestCircuits.map(c => `<li><span class="ddm-list__name">${escapeHtml(c.circuitId)}</span><span class="ddm-list__val">avg P${c.avgFinish} · ${c.visits} visits · best P${c.bestFinish}</span></li>`).join('')}
              </ul>
            </div>

            <div class="ddm-block">
              <div class="ddm-block__label">[ WORST CIRCUITS ]</div>
              <ul class="ddm-list">
                ${stats.worstCircuits.map(c => `<li><span class="ddm-list__name">${escapeHtml(c.circuitId)}</span><span class="ddm-list__val">avg P${c.avgFinish} · ${c.visits} visits</span></li>`).join('')}
              </ul>
            </div>

            <div class="ddm-block">
              <div class="ddm-block__label">[ SEASON TRAJECTORY ]</div>
              <table class="ddm-traj">
                <thead><tr><th>[SEASON]</th><th>[RACES]</th><th>[WINS]</th><th>[AVG FINISH]</th></tr></thead>
                <tbody>
                  ${stats.trajectory.map(s => `<tr><td>${s.season}</td><td>${s.races}</td><td>${s.wins}</td><td>${s.avgFinish ?? '—'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Close handlers
        modal.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', closeModal);
        });
        document.addEventListener('keydown', escHandler);
        function escHandler(e) { if (e.key === 'Escape') closeModal(); }
        function closeModal() {
            modal.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', escHandler);
        }
    }

    async function openDriverDetail(name) {
        // Find the cached dataset
        if (!window.HistoricalDataset) {
            alert('Historical data not loaded yet. Open the predictor section first and click Run Backtest to fetch it.');
            return;
        }
        // Note: ensureLoaded() will fetch if not cached. UI shows spinner via the title bar.
        // Quietly fetch if needed.
        const dataset = await window.HistoricalDataset.ensureLoaded();
        const driverId = findDriverIdByName(dataset, name);
        if (!driverId) {
            alert(`No historical data for ${name}. This driver may not appear in 2014–2024 results.`);
            return;
        }
        const stats = buildDriverStats(dataset, driverId);
        if (!stats) {
            alert(`No race data for ${name}.`);
            return;
        }
        renderModal(stats);
    }

    // Delegated click handler: any [data-driver] element opens the modal
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-driver]');
        if (!el) return;
        e.preventDefault();
        openDriverDetail(el.dataset.driver);
    });

    window.openDriverDetail = openDriverDetail;
})();
