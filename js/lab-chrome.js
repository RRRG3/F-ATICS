/* ============================================================
   LAB Chrome — terminal corner readouts + loader bar
   No deps, lightweight, runs on DOMContentLoaded.
   ============================================================ */
(function () {
    'use strict';

    // ── Loader bar — animate to 100% on full load ───────────────
    const bar = document.getElementById('lab-loader-bar');
    if (bar) {
        let p = 0;
        const tick = setInterval(() => {
            p = Math.min(p + Math.random() * 14, 88);
            bar.style.width = p + '%';
        }, 120);

        const finish = () => {
            clearInterval(tick);
            bar.style.width = '100%';
            setTimeout(() => { bar.style.opacity = '0'; bar.style.transition = 'opacity 0.4s'; }, 280);
        };
        if (document.readyState === 'complete') finish();
        else window.addEventListener('load', finish, { once: true });
    }

    // ── Live clock (UTC) ────────────────────────────────────────
    const clockEl = document.getElementById('lab-clock');
    if (clockEl) {
        const fmt = n => String(n).padStart(2, '0');
        const update = () => {
            const d = new Date();
            clockEl.textContent = `${fmt(d.getUTCHours())}:${fmt(d.getUTCMinutes())}:${fmt(d.getUTCSeconds())} UTC`;
        };
        update();
        setInterval(update, 1000);
    }

    // ── Scroll percent ──────────────────────────────────────────
    const scrollEl = document.getElementById('lab-scroll');
    if (scrollEl) {
        const update = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
            scrollEl.textContent = String(pct).padStart(2, '0') + '%';
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
    }

    // ── Coordinates of the next race (top-right readout) ───────
    const coordsEl = document.getElementById('lab-coords');
    if (coordsEl && typeof raceCalendar !== 'undefined') {
        // Lat/Lng map keyed by circuit short name — accurate to the city
        const COORDS = {
            'Albert Park Circuit':              [-37.8497, 144.968,  'MELBOURNE / AU'],
            'Shanghai International Circuit':   [ 31.3389, 121.220,  'SHANGHAI / CN'],
            'Suzuka Circuit':                   [ 34.8431, 136.541,  'SUZUKA / JP'],
            'Bahrain International Circuit':    [ 26.0325,  50.510,  'SAKHIR / BH'],
            'Jeddah Corniche Circuit':          [ 21.6319,  39.103,  'JEDDAH / SA'],
            'Miami International Autodrome':    [ 25.9581, -80.239,  'MIAMI / US'],
            'Circuit Gilles Villeneuve':        [ 45.5000, -73.522,  'MONTREAL / CA'],
            'Circuit de Monaco':                [ 43.7347,   7.420,  'MONTE CARLO / MC'],
            'Circuit de Barcelona-Catalunya':   [ 41.5700,   2.261,  'BARCELONA / ES'],
            'Red Bull Ring':                    [ 47.2197,  14.764,  'SPIELBERG / AT'],
            'Silverstone Circuit':              [ 52.0786,  -1.016,  'SILVERSTONE / GB'],
            'Circuit de Spa-Francorchamps':     [ 50.4372,   5.971,  'SPA / BE'],
            'Hungaroring':                      [ 47.5789,  19.250,  'BUDAPEST / HU'],
            'Circuit Zandvoort':                [ 52.3888,   4.541,  'ZANDVOORT / NL'],
            'Autodromo Nazionale di Monza':     [ 45.6156,   9.281,  'MONZA / IT'],
            'Circuito Urbano de Madrid':        [ 40.4720,  -3.560,  'MADRID / ES'],
            'Baku City Circuit':                [ 40.3725,  49.853,  'BAKU / AZ'],
            'Marina Bay Street Circuit':        [  1.2914, 103.864,  'SINGAPORE / SG'],
            'Circuit of the Americas':          [ 30.1328, -97.641,  'AUSTIN / US'],
            'Autódromo Hermanos Rodríguez':     [ 19.4042, -99.092,  'MEXICO CITY / MX'],
        };
        const now = new Date();
        const next = raceCalendar.find(r => new Date(r.date) >= now) || raceCalendar[0];
        if (next) {
            const m = COORDS[next.circuit];
            if (m) {
                const fmt = (n, dec=4) => (n >= 0 ? '+' : '') + n.toFixed(dec);
                coordsEl.textContent = `LAT ${fmt(m[0])} / LNG ${fmt(m[1])} / ${m[2]}`;
            } else {
                coordsEl.textContent = (next.country || '—').toUpperCase();
            }
        }
    }

    // ── Hero readout — round + next race ─────────────────────────
    if (typeof raceCalendar !== 'undefined') {
        const now = new Date();
        const next = raceCalendar.find(r => new Date(r.date) >= now) || raceCalendar[raceCalendar.length - 1];
        const past = raceCalendar.filter(r => new Date(r.date) < now);
        const round = next ? next.round : raceCalendar.length;
        const roundEl = document.getElementById('hero-round');
        const nextEl  = document.getElementById('hero-next');
        if (roundEl) roundEl.textContent = `R${String(round).padStart(2, '0')} / ${past.length + 1}-OF-${raceCalendar.length}`;
        if (nextEl)  nextEl.textContent  = (next?.country || '2026').toUpperCase();
    }

    // ── Auto-number all section titles: [02] PREDICTIONS, etc. ──
    const sectionTitles = document.querySelectorAll('main .section .section-title');
    sectionTitles.forEach((el, i) => {
        el.setAttribute('data-num', `[${String(i + 2).padStart(2, '0')}]`);
    });

    // ── Status badge propagation ─────────────────────────────────
    // Mirror the telemetry-section live status into:
    //   • #hero-status (hero readout)
    //   • #lab-live-status (top-right corner chrome)
    // Tracks whether feed is LIVE / REPLAY / OFFLINE.
    (function mirrorStatus() {
        const src = document.getElementById('tele-session-status');
        const heroStatus = document.getElementById('hero-status');
        const cornerStatus = document.getElementById('lab-live-status');
        if (!heroStatus && !cornerStatus) return;

        function classify(text) {
            const t = (text || '').toLowerCase();
            if (t.includes('[live]') || (t.includes('connected') && !t.includes('disconnected'))) return 'LIVE';
            if (t.includes('[replay]') || t.includes('replay')) return 'REPLAY';
            if (t.includes('simulation')) return 'SIM';
            if (t.includes('connecting')) return 'CONNECTING';
            return 'OFFLINE';
        }

        function paint(label) {
            const cls = label === 'LIVE' ? 'lab-badge--live'
                      : label === 'REPLAY' ? 'lab-badge--replay'
                      : label === 'SIM' ? 'lab-badge--replay'
                      : 'lab-badge--offline';
            if (heroStatus) {
                heroStatus.textContent = label;
                heroStatus.style.color = (label === 'LIVE') ? 'var(--red)'
                                       : (label === 'REPLAY' || label === 'SIM') ? '#FFC700'
                                       : 'var(--text-3)';
            }
            if (cornerStatus) {
                cornerStatus.textContent = label;
                cornerStatus.className = `lab-badge ${cls}`;
            }
        }

        // Initial paint based on current src text, or OFFLINE
        paint(src ? classify(src.textContent) : 'OFFLINE');

        // Watch for changes via MutationObserver (telemetry updates the status text)
        if (src && 'MutationObserver' in window) {
            const obs = new MutationObserver(() => paint(classify(src.textContent)));
            obs.observe(src, { childList: true, characterData: true, subtree: true });
        }
    })();

    // ── Calendar status banner — show "RACE WEEK" / "RACE DAY" near hero ──
    (function calendarStatus() {
        if (typeof raceCalendar === 'undefined') return;
        const banner = document.getElementById('tele-weekend-banner');
        if (!banner) return;
        const now = new Date();
        const todayStr = now.toDateString();
        const raceToday = raceCalendar.find(r => new Date(r.date).toDateString() === todayStr);
        if (raceToday) {
            banner.innerHTML = `[ RACE DAY ] · ${raceToday.name.toUpperCase()} · ${raceToday.circuit.toUpperCase()} — TELEMETRY ACTIVE`;
            return;
        }
        const upcoming = raceCalendar.find(r => new Date(r.date) > now);
        if (upcoming) {
            const ms = new Date(upcoming.date) - now;
            const days = Math.ceil(ms / 86400000);
            if (days <= 7) {
                banner.innerHTML = `[ RACE WEEK ] · ${upcoming.name.toUpperCase()} IN ${days}D — STREAM AVAILABLE`;
            } else {
                banner.innerHTML = `[ OFF-WEEK ] · NEXT: ${upcoming.name.toUpperCase()} IN ${days}D — REPLAY MODE ONLY`;
            }
        }
    })();

    // ── [DRIVE] — minimal 2D top-down WASD car ───────────────────
    initDrive();
    function initDrive() {
        const stage = document.getElementById('drive-stage');
        if (!stage) return;

        // Respect reduced-motion: render a static frame, skip the sim loop
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Build canvas
        stage.innerHTML = '';
        stage.style.position = 'relative';
        const cvs = document.createElement('canvas');
        cvs.style.cssText = 'width:100%;height:100%;display:block;';
        cvs.tabIndex = 0;
        cvs.setAttribute('aria-label', 'Interactive WASD driving demo');
        stage.appendChild(cvs);
        // Add class so the [ LOADING TELEMETRY... ] placeholder hides reliably
        // (broader compatibility than `:has(canvas)` which Firefox <121 lacks).
        stage.classList.add('is-loaded');

        // Floating WASD keyboard hint (auto-hides once user starts driving)
        const kbdHint = document.createElement('div');
        kbdHint.className = 'pw-drive__kbd-hint';
        kbdHint.innerHTML = `
            <span><kbd>W</kbd> ACCEL</span>
            <span><kbd>A</kbd>/<kbd>D</kbd> STEER</span>
            <span><kbd>S</kbd> BRAKE</span>
            <span><kbd>CLICK</kbd> FOCUS</span>
        `;
        stage.appendChild(kbdHint);

        // HUD
        const hud = document.createElement('div');
        hud.style.cssText = `
            position:absolute; bottom:12px; left:12px; right:12px;
            display:flex; justify-content:space-between;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px; letter-spacing: 0.12em;
            text-transform: uppercase; color: rgba(255,255,255,0.55);
            pointer-events: none;
        `;
        hud.innerHTML = `
            <span>[SPEED] <b style="color:#fff" id="drive-speed">000</b> KM/H</span>
            <span>[RPM] <b style="color:#fff" id="drive-rpm">0000</b></span>
            <span>[GEAR] <b style="color:#fff" id="drive-gear">N</b></span>
            <span>[X / Y] <b style="color:#fff" id="drive-coords">+0000 / +0000</b></span>
        `;
        stage.appendChild(hud);

        // Hint
        const hint = document.createElement('div');
        hint.style.cssText = `
            position:absolute; top:12px; right:12px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px; letter-spacing: 0.18em;
            color: #FF1F1F;
            pointer-events: none;
        `;
        hint.textContent = '[ CLICK / WASD ]';
        stage.appendChild(hint);

        const ctx = cvs.getContext('2d');
        let W = 0, H = 0;
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const r = cvs.getBoundingClientRect();
            W = r.width; H = r.height;
            cvs.width  = W * dpr;
            cvs.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        new ResizeObserver(resize).observe(stage);

        // Car state — world coordinates
        const car = {
            x: 0, y: 0,
            vx: 0, vy: 0,
            heading: 0,         // radians
            speed: 0,           // km/h equivalent for HUD
            steerInput: 0,
        };
        const keys = Object.create(null);
        let focused = false;

        cvs.addEventListener('focus', () => { focused = true; });
        cvs.addEventListener('blur', () => { focused = false; for (const k in keys) keys[k] = false; });
        cvs.addEventListener('click', () => cvs.focus());

        const KEYMAP = { w:1, arrowup:1, s:2, arrowdown:2, a:3, arrowleft:3, d:4, arrowright:4 };
        let hintFaded = false;
        window.addEventListener('keydown', (e) => {
            if (!focused) return;
            const k = KEYMAP[e.key.toLowerCase()];
            if (k) {
                keys[k] = true;
                e.preventDefault();
                // Fade the WASD hint once user starts driving
                if (!hintFaded && kbdHint) {
                    kbdHint.style.transition = 'opacity 0.6s';
                    kbdHint.style.opacity = '0.15';
                    hintFaded = true;
                }
            }
        });
        window.addEventListener('keyup', (e) => {
            const k = KEYMAP[e.key.toLowerCase()];
            if (k) keys[k] = false;
        });

        // Sim loop
        const speedEl  = hud.querySelector('#drive-speed');
        const rpmEl    = hud.querySelector('#drive-rpm');
        const gearEl   = hud.querySelector('#drive-gear');
        const coordsEl2 = hud.querySelector('#drive-coords');

        let last = performance.now();
        function tick(now) {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;

            // Inputs
            const throttle = keys[1] ? 1 : 0;
            const brake    = keys[2] ? 1 : 0;
            const left     = keys[3] ? 1 : 0;
            const right    = keys[4] ? 1 : 0;

            // Longitudinal
            const ACC = 220;
            const BRK = 360;
            const DRAG = 0.6;
            const ROLL = 14;
            const fwd = throttle * ACC - brake * BRK;
            // velocity along heading
            let v = Math.hypot(car.vx, car.vy);
            // Direction sign relative to heading
            const dot = car.vx * Math.cos(car.heading) + car.vy * Math.sin(car.heading);
            const dir = dot < 0 ? -1 : 1;
            v = v * dir;
            v += fwd * dt;
            v -= Math.sign(v) * (ROLL + Math.abs(v) * DRAG) * dt;
            if (Math.abs(v) < 0.5 && fwd === 0) v = 0;

            // Steering — only effective when moving
            const STEER = 1.6;
            const grip = Math.min(1, Math.abs(v) / 30);
            car.heading += (right - left) * STEER * grip * dt;

            car.vx = Math.cos(car.heading) * v;
            car.vy = Math.sin(car.heading) * v;
            car.x += car.vx * dt;
            car.y += car.vy * dt;

            // World wrap
            const FIELD = 600;
            if (car.x >  FIELD) car.x = -FIELD;
            if (car.x < -FIELD) car.x =  FIELD;
            if (car.y >  FIELD) car.y = -FIELD;
            if (car.y < -FIELD) car.y =  FIELD;

            // HUD
            car.speed = Math.round(Math.abs(v) * 3.6);  // m/s → km/h-ish for show
            speedEl.textContent = String(car.speed).padStart(3, '0');
            rpmEl.textContent   = String(Math.round(2400 + Math.abs(v) * 220)).padStart(4, '0');
            gearEl.textContent  = v === 0 ? 'N' : (v < 0 ? 'R' : String(Math.min(8, 1 + Math.floor(Math.abs(v) / 18))));
            const sx = (n) => (n >= 0 ? '+' : '-') + String(Math.abs(Math.round(n))).padStart(4, '0');
            coordsEl2.textContent = `${sx(car.x)} / ${sx(car.y)}`;

            // Render
            ctx.clearRect(0, 0, W, H);
            // Camera centred on car
            const cx = W / 2, cy = H / 2;
            ctx.save();
            ctx.translate(cx - car.x, cy - car.y);

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            const G = 40;
            const x0 = Math.floor((car.x - W) / G) * G;
            const y0 = Math.floor((car.y - H) / G) * G;
            for (let x = x0; x < car.x + W; x += G) {
                ctx.beginPath(); ctx.moveTo(x, car.y - H); ctx.lineTo(x, car.y + H); ctx.stroke();
            }
            for (let y = y0; y < car.y + H; y += G) {
                ctx.beginPath(); ctx.moveTo(car.x - W, y); ctx.lineTo(car.x + W, y); ctx.stroke();
            }

            // Track loop (simple oval reference)
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 60;
            ctx.beginPath();
            ctx.ellipse(0, 0, 360, 220, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Centre line
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 12]);
            ctx.beginPath();
            ctx.ellipse(0, 0, 360, 220, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Origin marker
            ctx.fillStyle = '#FF1F1F';
            ctx.fillRect(-3, -3, 6, 6);
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.fillStyle = 'rgba(255,31,31,0.7)';
            ctx.fillText('[ START ]', 10, 4);
            ctx.restore();

            // Car — rotated rectangle
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(car.heading);
            ctx.fillStyle = '#FF1F1F';
            ctx.fillRect(-14, -5, 28, 10);
            // nose
            ctx.fillStyle = '#fff';
            ctx.fillRect(10, -2, 6, 4);
            // wheels
            ctx.fillStyle = '#000';
            ctx.fillRect(-12, -7, 6, 3);
            ctx.fillRect(-12,  4, 6, 3);
            ctx.fillRect(  6, -7, 6, 3);
            ctx.fillRect(  6,  4, 6, 3);
            ctx.restore();

            if (!reduceMotion) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ── Active nav highlight on scroll ──────────────────────────
    const navLinks = document.querySelectorAll('.pw-nav__link[href^="#"]');
    if (navLinks.length && 'IntersectionObserver' in window) {
        const sections = Array.from(navLinks)
            .map(a => document.querySelector(a.getAttribute('href')))
            .filter(Boolean);
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = '#' + entry.target.id;
                    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === id));
                }
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        sections.forEach(s => obs.observe(s));
    }
})();
