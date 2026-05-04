// ─── Local SVG placeholder (no network needed) ───────────────────────────────
// Generates an inline SVG data URI with team color background and short label.
// Drop-in replacement for via.placeholder.com that works fully offline.
function makeSVG(text, bg, fg) {
    bg = bg || '#1a1a2e';
    fg = fg || '#ffffff';
    // Shorten long text for the badge
    const label = text.length > 18 ? text.slice(0, 16) + '…' : text;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
        <rect width="400" height="260" fill="${bg}"/>
        <rect x="0" y="0" width="400" height="4" fill="${fg}" opacity="0.3"/>
        <rect x="0" y="256" width="400" height="4" fill="${fg}" opacity="0.3"/>
        <text x="200" y="120" font-family="'Instrument Serif','Georgia',serif" font-size="22" fill="${fg}" text-anchor="middle" dominant-baseline="middle" font-weight="400" opacity="0.9">${label}</text>
        <text x="200" y="155" font-family="'Inter','Arial',sans-serif" font-size="11" fill="${fg}" text-anchor="middle" dominant-baseline="middle" opacity="0.45" letter-spacing="2">F1 F-ATICS</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

document.addEventListener('DOMContentLoaded', () => {

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll to top when logo is clicked
    const logoBtn = document.getElementById('logo-btn');
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Team Showcase
    const teamGrid = document.getElementById('team-grid');
    const modal = document.getElementById('team-modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.querySelector('.close-btn');
    const modalOverlay = document.querySelector('.modal-overlay');

    // ========================================
    // F1 2026 TEAM DATA — 11 Teams on the Grid
    // NEW: Audi Revolut F1 Team & Cadillac F1!
    // ========================================
    const teamsData = [
        {
            name: "McLaren Formula 1 Team",
            car: "McLaren MCL40",
            drivers: "Lando Norris, Oscar Piastri",
            principal: "Andrea Stella",
            engine: "Mercedes",
            color: "#FF8700",
            isNew: false,
            sketchfabId: "902384ddbec64d86b608881bf44e366f", // MCL39 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/mclaren.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/norris.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/piastri.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/AndreaStella.jpg",
            fallbackImg: makeSVG('McLaren MCL40', '#FF8700', '#fff')
        },
        {
            name: "Scuderia Ferrari",
            car: "Ferrari SF-26",
            drivers: "Charles Leclerc, Lewis Hamilton",
            principal: "Frédéric Vasseur",
            engine: "Ferrari",
            color: "#DC0000",
            isNew: false,
            sketchfabId: "f5f6391749814819a60546f57b10b5f9", // SF-25 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/ferrari.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/leclerc.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/hamilton.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/FredericVasseur.jpg",
            fallbackImg: makeSVG('Ferrari SF-26', '#DC0000', '#fff')
        },
        {
            name: "Oracle Red Bull Racing",
            car: "Red Bull RB22",
            drivers: "Max Verstappen, Isack Hadjar",
            principal: "Christian Horner",
            engine: "Ford / Red Bull Powertrains",
            color: "#0600EF",
            isNew: false,
            sketchfabId: "621f884d9aee4efdaa54309e6b08bdd1", // RB21 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/red%20bull.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/verstappen.jpg",
            driver2Img: makeSVG('Isack Hadjar', '#0600EF', '#fff'),
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/ChristianHorner.jpg",
            fallbackImg: makeSVG('Red Bull RB22', '#0600EF', '#fff')
        },
        {
            name: "Mercedes-AMG Petronas",
            car: "Mercedes W17",
            drivers: "George Russell, Kimi Antonelli",
            principal: "Toto Wolff",
            engine: "Mercedes",
            color: "#00D2BE",
            isNew: false,
            sketchfabId: "0ffecbff3b814d308f30abba8b5fd8e7", // W16 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/mercedes.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/russell.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/antonelli.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/TotoWolff.jpg",
            fallbackImg: makeSVG('Mercedes W17', '#00D2BE', '#fff')
        },
        {
            name: "Aston Martin Aramco",
            car: "Aston Martin AMR26",
            drivers: "Fernando Alonso, Lance Stroll",
            principal: "Andy Cowell",
            engine: "Honda",
            color: "#006F62",
            isNew: false,
            sketchfabId: "6eb43dd1b0f6404e90ff8f0a87162636", // AMR25 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/aston%20martin.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/alonso.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/stroll.jpg",
            principalImg: makeSVG('Andy Cowell', '#006F62', '#fff'),
            fallbackImg: makeSVG('Aston Martin AMR26', '#006F62', '#fff')
        },
        {
            name: "Alpine F1 Team",
            car: "Alpine A526",
            drivers: "Pierre Gasly, Franco Colapinto",
            principal: "Oliver Oakes",
            engine: "Mercedes",
            color: "#FF69B4",
            isNew: false,
            sketchfabId: "33c7b240d04f480da57183ccb6fc5ea8", // A525 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/alpine.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/gasly.jpg",
            driver2Img: makeSVG('Franco Colapinto', '#FF69B4', '#fff'),
            principalImg: makeSVG('Oliver Oakes', '#FF69B4', '#fff'),
            fallbackImg: makeSVG('Alpine A526', '#FF69B4', '#fff')
        },
        {
            name: "Williams Racing",
            car: "Williams FW48",
            drivers: "Carlos Sainz, Alex Albon",
            principal: "James Vowles",
            engine: "Mercedes",
            color: "#005AFF",
            isNew: false,
            sketchfabId: "a7b48019a6ce43a7ab93cd01efda9739", // FW47 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/williams.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/sainz.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/albon.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/JamesVowles.jpg",
            fallbackImg: makeSVG('Williams FW48', '#005AFF', '#fff')
        },
        {
            name: "Racing Bulls",
            car: "Racing Bulls VCARB 03",
            drivers: "Liam Lawson, Arvid Lindblad",
            principal: "Laurent Mekies",
            engine: "Ford / Red Bull Powertrains",
            color: "#4E5D9F",
            isNew: false,
            sketchfabId: "a5927538612642f697650a2dcf67fdde", // VCARB 02 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/rb.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/lawson.jpg",
            driver2Img: makeSVG('Arvid Lindblad', '#4E5D9F', '#fff'),
            principalImg: makeSVG('Laurent Mekies', '#4E5D9F', '#fff'),
            fallbackImg: makeSVG('Racing Bulls VCARB 03', '#4E5D9F', '#fff')
        },
        {
            name: "MoneyGram Haas F1 Team",
            car: "Haas VF-26",
            drivers: "Esteban Ocon, Oliver Bearman",
            principal: "Ayao Komatsu",
            engine: "Ferrari",
            color: "#B6BABD",
            isNew: false,
            sketchfabId: "b211ec88d4884ffbb7c4133054d1bd2d", // VF-25 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/haas.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/ocon.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/bearman.jpg",
            principalImg: makeSVG('Ayao Komatsu', '#B6BABD', '#111'),
            fallbackImg: makeSVG('Haas VF-26', '#B6BABD', '#111')
        },
        {
            name: "Audi Revolut F1 Team",
            car: "Audi R26",
            drivers: "Nico Hülkenberg, Gabriel Bortoleto",
            principal: "Jonathan Wheatley",
            engine: "Audi (Works)",
            color: "#C0C0C0",
            isNew: true,
            newLabel: "NEW TEAM 2026",
            sketchfabId: "39d08c4788e244de870dd4b9540d8bda", // Sauber C45 (closest — Audi inherits Sauber)
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/2560px-Audi-Logo_2016.svg.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/hulkenberg.jpg",
            driver2Img: makeSVG('Gabriel Bortoleto', '#C0C0C0', '#111'),
            principalImg: makeSVG('Jonathan Wheatley', '#C0C0C0', '#111'),
            fallbackImg: makeSVG('Audi R26', '#C0C0C0', '#111')
        },
        {
            name: "Cadillac F1 Team",
            car: "Cadillac CA01",
            drivers: "Sergio Perez, Valtteri Bottas",
            principal: "Graeme Lowdon",
            engine: "Ferrari",
            color: "#CC0033",
            isNew: true,
            newLabel: "NEW TEAM 2026",
            sketchfabId: "05965d76f34048fc94b8189442acbd95", // APX GP F1 Movie car (closest available)
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Cadillac_logo.svg/1280px-Cadillac_logo.svg.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/perez.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/bottas.jpg",
            principalImg: makeSVG('Graeme Lowdon', '#CC0033', '#fff'),
            fallbackImg: makeSVG('Cadillac CA01', '#CC0033', '#fff')
        }
    ];

    teamGrid.innerHTML = ''; // Clear skeleton cards
    teamsData.forEach((team, index) => {
        const card = document.createElement('div');
        card.classList.add('team-card');
        card.style.animationDelay = `${index * 0.05}s`;
        const newBadge = team.isNew ? `<div class="team-new-badge">🆕 NEW TEAM 2026</div>` : '';
        card.innerHTML = `
            ${newBadge}
            <div class="team-logo-badge">
                <img src="${team.logo}" alt="${team.name} logo" class="team-logo"
                     onerror="this.onerror=null;this.src=makeSVG('${team.name}','${team.color}','#fff')">
            </div>
            <div class="car-360-container">
            </div>
            <div class="team-card-content">
                <h3>${team.name}</h3>
                <p class="team-car-name">${team.car}</p>
                <div class="team-quick-info">
                    <span class="team-drivers">👥 ${team.drivers.split(',')[0]} &amp; ${team.drivers.split(',')[1]}</span>
                    ${team.engine ? `<span class="team-engine">⚡ ${team.engine}</span>` : ''}
                </div>
            </div>
        `;
        card.addEventListener('click', () => openModal(team));
        teamGrid.appendChild(card);
        
        // Lazy-init 3D viewer — only when the card enters the viewport (saves ~11 Three.js canvases on load)
        const viewerContainer = card.querySelector('.car-360-container');
        if (window.Car360 && viewerContainer) {
            const carObs = new IntersectionObserver((entries, obs) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        Car360.init(entry.target, team.color, team.car);
                        obs.unobserve(entry.target);
                    }
                }
            }, { rootMargin: '200px 0px' });
            carObs.observe(viewerContainer);
        }

    });


    // Focus trap: cycle Tab/Shift-Tab within the modal
    function trapFocus(modalEl, e) {
        const focusable = Array.from(
            modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled);
        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    let _trapHandler = null;
    let _previousFocus = null;

    function openModal(team) {
        const drivers = team.drivers.split(', ');
        modalBody.innerHTML = `
            <div class="team-modal-header">
                <img src="${team.logo}" alt="${team.name} logo" class="modal-team-logo"
                     onerror="this.onerror=null;this.src=makeSVG('${team.name}','${team.color}','#fff')">
                <h2>${team.name}</h2>
                <p class="modal-car-name">${team.car}</p>
            </div>
            
            <div class="team-modal-grid">
                <div class="modal-image-card" style="grid-column: 1 / -1; height: 350px;">
                    <h3>🏎️ Interactive 3D Model</h3>
                    <div class="modal-car-360" style="width: 100%; height: 300px;"></div>
                </div>
                
                <div class="modal-image-card">
                    <h3>👤 ${drivers[0]}</h3>
                    <img src="${team.driver1Img}" alt="${drivers[0]}" loading="lazy" 
                         onerror="this.onerror=null;this.src=makeSVG('${drivers[0]}','${team.color}','#fff')">
                </div>
                
                <div class="modal-image-card">
                    <h3>👤 ${drivers[1]}</h3>
                    <img src="${team.driver2Img}" alt="${drivers[1]}" loading="lazy" 
                         onerror="this.onerror=null;this.src=makeSVG('${drivers[1]}','${team.color}','#fff')">
                </div>
                
                <div class="modal-image-card">
                    <h3>👔 Team Principal</h3>
                    <img src="${team.principalImg}" alt="${team.principal}" loading="lazy" 
                         onerror="this.onerror=null;this.src=makeSVG('${team.principal}','${team.color}','#fff')">
                    <p class="principal-name">${team.principal}</p>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Set title for aria-labelledby
        const titleEl = modalBody.querySelector('h2');
        if (titleEl) titleEl.id = 'team-modal-title';

        // Initialize 3D viewer in modal
        const modalCarContainer = modalBody.querySelector('.modal-car-360');
        if (window.Car360 && modalCarContainer) {
            Car360.init(modalCarContainer, team.color, team.car);
        }

        // Store previous focus and move focus into modal
        _previousFocus = document.activeElement;
        const closeButton = modal.querySelector('.close-btn');
        if (closeButton) closeButton.focus();

        // Activate focus trap
        _trapHandler = (e) => trapFocus(modal, e);
        modal.addEventListener('keydown', _trapHandler);
    }

    function closeModal() {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';

        // Remove focus trap and restore focus to the triggering element
        if (_trapHandler) {
            modal.removeEventListener('keydown', _trapHandler);
            _trapHandler = null;
        }
        if (_previousFocus) {
            _previousFocus.focus();
            _previousFocus = null;
        }
    }

    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });

    // Standings with fallback data
    const standingsBody = document.getElementById('standings-body');

    // 2025 Driver Lineup with current season points
    // 2026 team color map for standings display
    const teamColors2026 = {
        'McLaren': '#FF8700',
        'Ferrari': '#DC0000',
        'Red Bull Racing': '#0600EF',
        'Mercedes': '#00D2BE',
        'Aston Martin': '#006F62',
        'Williams': '#005AFF',
        'Racing Bulls': '#4E5D9F',
        'Alpine': '#FF69B4',
        'Haas': '#B6BABD',
        'Audi': '#C0C0C0',
        'Cadillac': '#CC0033'
    };

    // Use 2026 driver standings from the data file
    const fallbackStandings = typeof driverStandings2026 !== 'undefined' ? driverStandings2026 : [];

    function displayStandings(standings) {
        standingsBody.innerHTML = '';
        const maxPts = Math.max(...standings.map(d => d.points || 0), 1);
        standings.forEach((driver, index) => {
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.03}s`;
            const teamColor = teamColors2026[driver.team] || '#E10600';
            const driverFlag = driver.flag || '';
            const driverNum = driver.number ? `<span class="driver-num" style="color:${teamColor}">#${driver.number}</span>` : '';

            let positionDisplay = driver.position;
            if (driver.position === 1) positionDisplay = '🥇 1';
            else if (driver.position === 2) positionDisplay = '🥈 2';
            else if (driver.position === 3) positionDisplay = '🥉 3';

            const ptsPct = Math.max((driver.points / maxPts) * 100, 0);
            const ptsBar = `<div class="pts-bar-wrap"><div class="pts-bar" style="width:${ptsPct}%;background:${teamColor}"></div></div>`;

            row.innerHTML = `
                <td class="pos-col">${positionDisplay}</td>
                <td class="driver-col">${driverFlag} ${driverNum} ${driver.driver}</td>
                <td class="nationality-col">${driver.nationality}</td>
                <td class="team-col"><span class="team-dot" style="background:${teamColor}"></span>${driver.team}</td>
                <td class="points-col">${driver.points} ${ptsBar}</td>
            `;
            standingsBody.appendChild(row);
        });

        const allZero = standings.every(d => (d.points || 0) === 0);
        if (allZero) {
            const note = document.createElement('tr');
            note.innerHTML = '<td colspan="5" class="standings-note">Points update live after each race weekend. Check back once the season is underway.</td>';
            standingsBody.appendChild(note);
        }
    }

    // Show fallback immediately so the table is never empty
    displayStandings(fallbackStandings);

    // Silently upgrade to live Jolpica data (Ergast mirror) with 1-hour localStorage cache
    (async function fetchLiveStandings() {
        const CACHE_KEY = 'f1_driver_standings_2026';
        const CACHE_TTL = 3_600_000; // 1 hour

        // Serve from cache if fresh
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const { ts, data } = JSON.parse(raw);
                if (Date.now() - ts < CACHE_TTL && data?.length) {
                    displayStandings(data);
                    return;
                }
            }
        } catch (_) {}

        // Fetch from Jolpica API
        try {
            const res = await fetch('https://api.jolpi.ca/ergast/f1/2026/driverStandings.json');
            if (!res.ok) return;
            const json = await res.json();
            const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
            if (!list?.length) return;

            // Preserve flag emojis from fallback data (Jolpica doesn't include them)
            const flagByNumber = {};
            fallbackStandings.forEach(d => { flagByNumber[d.number] = d.flag; });

            const live = list.map(entry => ({
                position:    +entry.position,
                driver:      `${entry.Driver.givenName} ${entry.Driver.familyName}`,
                nationality: entry.Driver.nationality,
                team:        entry.Constructors[0]?.name || '',
                points:      +entry.points,
                number:      +entry.Driver.permanentNumber,
                flag:        flagByNumber[+entry.Driver.permanentNumber] || '',
            }));

            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: live }));
            displayStandings(live);
        } catch (_) {
            // Silently stay on fallback data already shown
        }
    })();


    // Quiz - using external quiz data
    // Shuffle and select random questions
    const shuffledQuiz = quizData.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    const questionEl = document.getElementById('question');
    const optionsEl = document.getElementById('options');
    const nextBtn = document.getElementById('next-btn');
    const resultEl = document.getElementById('result');
    const progressFill = document.getElementById('progress-fill');
    const quizCounter = document.getElementById('quiz-counter');

    let currentQuiz = 0;
    let score = 0;
    let answered = false;

    function updateProgress() {
        const progress = ((currentQuiz + 1) / shuffledQuiz.length) * 100;
        progressFill.style.width = `${progress}%`;
        quizCounter.textContent = `Question ${currentQuiz + 1} of ${shuffledQuiz.length}`;
    }

    function loadQuiz() {
        answered = false;
        const currentQuizData = shuffledQuiz[currentQuiz];
        questionEl.innerText = currentQuizData.question;
        optionsEl.innerHTML = '';
        resultEl.innerText = '';
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
        
        updateProgress();
        
        currentQuizData.options.forEach(optionText => {
            const button = document.createElement('button');
            button.innerText = optionText;
            button.classList.add('option');
            button.addEventListener('click', () => {
                if (!answered) {
                    checkAnswer(optionText, button);
                }
            });
            optionsEl.appendChild(button);
        });
    }

    function checkAnswer(answer, selectedButton) {
        answered = true;
        const correctAnswer = shuffledQuiz[currentQuiz].answer;
        
        Array.from(optionsEl.children).forEach(button => {
            button.disabled = true;
            if (button.innerText === correctAnswer) {
                button.classList.add('correct');
            }
        });
        
        if (answer === correctAnswer) {
            score++;
            resultEl.innerText = "✓ Correct!";
            resultEl.style.color = 'var(--success-green)';
        } else {
            selectedButton.classList.add('incorrect');
            resultEl.innerText = `✗ Wrong! The correct answer was ${correctAnswer}`;
            resultEl.style.color = 'var(--error-red)';
        }
        
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }

    nextBtn.addEventListener('click', () => {
        currentQuiz++;
        if (currentQuiz < shuffledQuiz.length) {
            loadQuiz();
        } else {
            showResults();
        }
    });

    function showResults() {
        const percentage = (score / shuffledQuiz.length) * 100;
        let message = '';
        let emoji = '';
        
        if (percentage === 100) {
            message = 'Perfect score! You\'re an F1 expert! 🏆';
            emoji = '🏆';
        } else if (percentage >= 66) {
            message = 'Great job! You know your F1! 🏁';
            emoji = '🏁';
        } else if (percentage >= 33) {
            message = 'Not bad! Keep learning! 🏎️';
            emoji = '🏎️';
        } else {
            message = 'Keep practicing! 📚';
            emoji = '📚';
        }
        
        questionEl.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${emoji}</div>
                <div style="font-size: 2rem; margin-bottom: 1rem;">Quiz Complete!</div>
                <div style="font-size: 1.5rem; color: var(--primary-red);">Score: ${score}/${shuffledQuiz.length}</div>
                <div style="margin-top: 1rem; color: var(--text-secondary);">${message}</div>
            </div>
        `;
        optionsEl.innerHTML = '';
        nextBtn.style.display = 'none';
        resultEl.innerText = '';
        progressFill.style.width = '100%';
    }

    loadQuiz();

    // Personal Best tracker — no prompt(), no fake global leaderboard.
    // Stores up to 5 recent attempts chronologically so users can see progress.
    function updateLeaderboard() {
        const history = JSON.parse(localStorage.getItem('f1QuizHistory') || '[]');
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;

        if (history.length === 0) {
            leaderboardList.innerHTML = '<p style="text-align:center;color:var(--pk-muted,#8A8A9A);font-size:0.85rem;">Complete a quiz to see your scores here.</p>';
            return;
        }

        // Sort by score descending for display, keep chronological for storage
        const sorted = [...history].sort((a, b) => (b.score / b.total) - (a.score / a.total));
        const best = sorted[0];

        leaderboardList.innerHTML = sorted.slice(0, 5).map((entry, i) => {
            const pct  = Math.round((entry.score / entry.total) * 100);
            const date = new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            const isBest = entry === best && i === 0;
            return `
            <div class="leaderboard-item" style="${isBest ? 'border-left:3px solid var(--pk-red,#E10600)' : ''}">
                <span class="leaderboard-rank">${isBest ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <span class="leaderboard-name">${entry.score}/${entry.total} <span style="color:var(--pk-red,#E10600);font-weight:700">${pct}%</span></span>
                <span class="leaderboard-score" style="font-size:0.75rem;color:var(--pk-muted,#8A8A9A)">${date}</span>
            </div>`;
        }).join('');
    }

    function saveScore(score, total) {
        const history = JSON.parse(localStorage.getItem('f1QuizHistory') || '[]');
        history.unshift({ score, total, date: new Date().toISOString() });
        // Keep last 10 attempts
        localStorage.setItem('f1QuizHistory', JSON.stringify(history.slice(0, 10)));
        updateLeaderboard();
    }

    updateLeaderboard();

    // Restart Quiz
    const restartBtn = document.getElementById('restart-quiz');
    restartBtn.addEventListener('click', () => {
        currentQuiz = 0;
        score = 0;
        shuffledQuiz.sort(() => 0.5 - Math.random());
        loadQuiz();
        nextBtn.style.display = 'block';
        restartBtn.style.display = 'none';
        document.getElementById('quiz-share').style.display = 'none';
    });

    // Social Share Functions
    window.shareToTwitter = function() {
        const text = `I scored ${score}/${shuffledQuiz.length} on the F1 Fan Zone Quiz! Can you beat my score? 🏎️🏁`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    };

    window.shareToFacebook = function() {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
    };

    window.copyScore = function() {
        const text = `I scored ${score}/${shuffledQuiz.length} on the F1 Fan Zone Quiz! 🏎️🏁`;
        navigator.clipboard.writeText(text).then(() => {
            alert('Score copied to clipboard!');
        });
    };

    // Update showResults to include save and share
    const originalShowResults = showResults;
    showResults = function() {
        originalShowResults();
        restartBtn.style.display = 'block';
        document.getElementById('quiz-share').style.display = 'block';
        saveScore(score, shuffledQuiz.length);
    };

    // Standings Toggle
    const standingsToggleBtns = document.querySelectorAll('.toggle-btn');
    standingsToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const standingsType = btn.dataset.standings;
            standingsToggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.standings-view').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById(`${standingsType}-standings`).classList.add('active');
        });
    });

    // Constructor Standings
    const constructorBody = document.getElementById('constructor-body');
    constructorStandings.forEach((team, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.03}s`;
        
        let positionDisplay = team.position;
        if (team.position === 1) positionDisplay = '🥇 1';
        else if (team.position === 2) positionDisplay = '🥈 2';
        else if (team.position === 3) positionDisplay = '🥉 3';
        
        row.innerHTML = `
            <td class="pos-col">${positionDisplay}</td>
            <td class="team-col">
                <span style="display: inline-block; width: 4px; height: 20px; background: ${team.color}; margin-right: 0.5rem; border-radius: 2px;"></span>
                ${team.team}
            </td>
            <td class="points-col">${team.points}</td>
        `;
        constructorBody.appendChild(row);
    });

    // Race Calendar
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarSearch = document.getElementById('calendar-search');
    const calendarFilter = document.getElementById('calendar-filter');
    
    function renderCalendar(races = raceCalendar) {
        calendarGrid.innerHTML = '';
        const now = new Date();
        
        races.forEach((race, index) => {
            const raceDate = new Date(race.date);
            const isUpcoming = raceDate > now;
            const isCompleted = raceDate < now;
            
            const card = document.createElement('div');
            card.classList.add('calendar-card');
            if (isCompleted) card.classList.add('completed');
            if (isUpcoming) card.classList.add('upcoming');
            card.style.animationDelay = `${index * 0.05}s`;
            
            let countdownHTML = '';
            if (isUpcoming) {
                const timeDiff = raceDate - now;
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                countdownHTML = `
                    <div class="calendar-countdown">
                        <div class="countdown-label">Countdown</div>
                        <div class="countdown-time">${days} day${days !== 1 ? 's' : ''}</div>
                    </div>
                `;
            }

            const sprintBadge = race.isSprint ? `<span class="cal-badge cal-badge-sprint">⚡ Sprint</span>` : '';
            const debutBadge = race.isDebut ? `<span class="cal-badge cal-badge-debut">🆕 Debut</span>` : '';
            
            card.innerHTML = `
                <div class="calendar-card-header">
                    <span class="calendar-round">Round ${race.round}</span>
                    <span class="calendar-flag">${race.flag}</span>
                </div>
                <h3>${race.name}</h3>
                <div class="calendar-badges">${sprintBadge}${debutBadge}</div>
                <div class="calendar-circuit">📍 ${race.circuit}</div>
                <div class="calendar-date">
                    📅 ${new Date(race.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                ${countdownHTML}
            `;
            calendarGrid.appendChild(card);
        });
    }
    
    renderCalendar();

    // ============================================================
    // NEXT RACE LIVE COUNTDOWN
    // ============================================================
    function initNextRaceCountdown() {
        const now = new Date();
        const todayStr = now.toDateString();

        const setBoxes = (d, h, m, s) => {
            const fmt = n => String(n).padStart(2, '0');
            const ids = ['cd-days','cd-hours','cd-mins','cd-secs'];
            const vals = [d, h, m, s];
            ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = vals[i]; });
        };

        const setLabel = (text) => {
            const el = document.querySelector('.countdown-label-hero');
            if (el) el.textContent = text;
        };

        const setName = (text) => {
            const el = document.getElementById('next-race-name');
            if (el) el.textContent = text;
        };

        // Race day — show a "LIGHTS OUT" state instead of zeros
        const raceToday = raceCalendar.find(r => new Date(r.date).toDateString() === todayStr);
        if (raceToday) {
            setName(`${raceToday.name} — Race Day!`);
            setLabel('LIGHTS OUT');
            setBoxes('🏎', '🏁', '00', '00');
            return;
        }

        // Next upcoming race
        const nextRace = raceCalendar.find(r => new Date(r.date) > now);
        if (!nextRace) {
            setName('2026 Season Complete');
            setLabel('CHAMPIONS CROWNED');
            setBoxes('—', '—', '—', '—');
            return;
        }

        setName(`Next: ${nextRace.name}`);

        function updateCountdown() {
            const diff = new Date(nextRace.date) - new Date();
            if (diff <= 0) { initNextRaceCountdown(); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            const fmt = n => String(n).padStart(2, '0');
            setBoxes(d, fmt(h), fmt(m), fmt(s));
        }
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    initNextRaceCountdown();

    // ============================================================
    // 2026 RULE CHANGES SECTION
    // ============================================================
    function initRuleChanges() {
        const grid = document.getElementById('rule-changes-grid');
        if (!grid || typeof ruleChanges2026 === 'undefined') return;
        grid.innerHTML = ruleChanges2026.map(rule => `
            <div class="rule-card">
                <div class="rule-icon">${rule.icon}</div>
                <h3 class="rule-title">${rule.title}</h3>
                <p class="rule-desc">${rule.description}</p>
            </div>
        `).join('');
    }
    initRuleChanges();


    
    calendarSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = raceCalendar.filter(race => 
            race.name.toLowerCase().includes(searchTerm) ||
            race.circuit.toLowerCase().includes(searchTerm) ||
            race.country.toLowerCase().includes(searchTerm)
        );
        renderCalendar(filtered);
    });
    
    calendarFilter.addEventListener('change', (e) => {
        const filter = e.target.value;
        const now = new Date();
        let filtered = raceCalendar;
        
        if (filter === 'upcoming') {
            filtered = raceCalendar.filter(race => new Date(race.date) > now);
        } else if (filter === 'completed') {
            filtered = raceCalendar.filter(race => new Date(race.date) < now);
        }
        
        renderCalendar(filtered);
    });



    // ===== CHAMPIONSHIP PREDICTION =====
    const runPredictionBtn = document.getElementById('run-prediction');
    const simulateSeasonBtn = document.getElementById('simulate-season');
    const predictionResults = document.getElementById('prediction-results');
    const analysisGrid = document.getElementById('analysis-grid');

    if (runPredictionBtn && typeof predictionModel !== 'undefined') {
        runPredictionBtn.addEventListener('click', () => {
            showPredictionLoading();
            
            setTimeout(() => {
                const predictions = predictionModel.generatePredictions();
                displayPredictions(predictions);
                displayDriverAnalysis();
            }, 1500);
        });

        simulateSeasonBtn.addEventListener('click', () => {
            showPredictionLoading();
            
            setTimeout(() => {
                const simResults = predictionModel.simulateSeason(1000);
                displaySimulationResults(simResults);
                displayDriverAnalysis();
            }, 2000);
        });
    }

    function showPredictionLoading() {
        predictionResults.innerHTML = `
            <div class="prediction-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Analyzing driver performance data...</div>
            </div>
        `;
    }

    // Shared prediction share bar — injected after results render
    function buildShareBar(top3, circuit, weather) {
        const emoji = ['🥇', '🥈', '🥉'];
        const shareText = `🏎️ F-ATICS AI Prediction — ${circuit || 'F1 2026'} ${weather === 'wet' ? '🌧️' : '☀️'}\n${top3.map((p, i) => `${emoji[i]} ${p.driver || p.driver} — ${p.winProbability || p.probability}% win probability`).join('\n')}\n\nTry your prediction: https://f-atics.vercel.app/#predictor`;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        return `
            <div class="pred-share-bar">
                <span class="pred-share-label">Share</span>
                <button class="pred-share-btn copy-btn" data-share="${encodeURIComponent(shareText)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Result
                </button>
                <a class="pred-share-btn x-share-btn" href="${tweetUrl}" target="_blank" rel="noopener noreferrer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Share on X
                </a>
            </div>`;
    }

    // Toast helper
    function showPredToast(msg) {
        let toast = document.getElementById('pred-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pred-toast';
            toast.className = 'pred-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
    }

    // Wire copy buttons via event delegation on the results container
    predictionResults.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn[data-share]');
        if (!btn) return;
        const text = decodeURIComponent(btn.dataset.share);
        navigator.clipboard.writeText(text)
            .then(() => showPredToast('✓ Prediction copied to clipboard'))
            .catch(() => showPredToast('Copy failed — try long-pressing the text'));
    });

    function displayPredictions(predictions) {
        const top3 = predictions.slice(0, 3);
        const rest = predictions.slice(3);
        const circuit = document.getElementById('circuit-select')?.value || '';
        const weather = document.getElementById('weather-select')?.value || 'dry';

        predictionResults.innerHTML = `
            <div class="prediction-podium">
                ${top3.map((p, i) => `
                    <div class="podium-card ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}">
                        <div class="podium-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                        <div class="podium-driver-name">${p.driver}</div>
                        <div class="podium-probability">${p.winProbability}%</div>
                        <div class="podium-label">Win Probability</div>
                    </div>
                `).join('')}
            </div>
            <div class="prediction-list">
                ${rest.map((p, i) => `
                    <div class="prediction-item">
                        <div class="prediction-position">${i + 4}</div>
                        <div class="prediction-driver">${p.driver}</div>
                        <div class="prediction-bar-container">
                            <div class="prediction-bar" style="width: ${p.winProbability}%">
                                <span class="prediction-percentage">${p.winProbability}%</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${buildShareBar(top3, circuit, weather)}
        `;

        // Animate bars
        setTimeout(() => {
            document.querySelectorAll('.prediction-bar').forEach(bar => {
                bar.style.width = bar.style.width;
            });
        }, 100);
    }

    function displaySimulationResults(results) {
        const top3 = results.slice(0, 3);
        const rest = results.slice(3);
        const circuit = document.getElementById('circuit-select')?.value || '';

        predictionResults.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <h3 style="color: var(--primary-red); font-size: 1.5rem; margin-bottom: 0.5rem;">
                    Monte Carlo Simulation Results
                </h3>
                <p style="color: var(--text-muted);">Based on 1,000 simulated seasons</p>
            </div>
            <div class="prediction-podium">
                ${top3.map((p, i) => `
                    <div class="podium-card ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}">
                        <div class="podium-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                        <div class="podium-driver-name">${p.driver}</div>
                        <div class="podium-probability">${p.probability}%</div>
                        <div class="podium-label">Championship Wins: ${p.simWins}/1000</div>
                    </div>
                `).join('')}
            </div>
            <div class="prediction-list">
                ${rest.map((p, i) => `
                    <div class="prediction-item">
                        <div class="prediction-position">${i + 4}</div>
                        <div class="prediction-driver">${p.driver}</div>
                        <div class="prediction-bar-container">
                            <div class="prediction-bar" style="width: ${Math.max(parseFloat(p.probability) * 2, 5)}%">
                                <span class="prediction-percentage">${p.probability}%</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${buildShareBar(top3.map(p => ({...p, winProbability: p.probability})), circuit, 'dry')}
        `;
    }

    function displayDriverAnalysis() {
        const drivers = ['Max Verstappen', 'Lando Norris', 'Charles Leclerc', 'Oscar Piastri', 'Lewis Hamilton', 'George Russell'];
        
        analysisGrid.innerHTML = drivers.map(driver => {
            const analysis = predictionModel.getDriverAnalysis(driver);
            if (!analysis) return '';

            return `
                <div class="analysis-card">
                    <div class="analysis-driver-name">${analysis.driver}</div>
                    <div class="analysis-score">Score: ${analysis.score}/100</div>
                    
                    ${analysis.strengths.length > 0 ? `
                        <div class="analysis-section">
                            <h4>💪 Strengths</h4>
                            <ul>
                                ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${analysis.weaknesses.length > 0 ? `
                        <div class="analysis-section weaknesses">
                            <h4>⚠️ Areas to Improve</h4>
                            <ul>
                                ${analysis.weaknesses.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-box-label">Wins</div>
                            <div class="stat-box-value">${analysis.stats.wins}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-label">Podiums</div>
                            <div class="stat-box-value">${analysis.stats.podiums}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-label">Poles</div>
                            <div class="stat-box-value">${analysis.stats.poles}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-label">Consistency</div>
                            <div class="stat-box-value">${(analysis.stats.consistency * 100).toFixed(0)}%</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Circuits Section with Search and Sort
    const circuitsGrid = document.getElementById('circuits-grid');
    const circuitModal = document.getElementById('circuit-modal');
    const circuitModalBody = document.getElementById('circuit-modal-body');
    const circuitCloseBtn = circuitModal.querySelector('.close-btn');
    const circuitModalOverlay = circuitModal.querySelector('.modal-overlay');
    const circuitSearch = document.getElementById('circuit-search');
    const circuitSort = document.getElementById('circuit-sort');
    
    let displayedCircuits = [...circuitsData];

    function renderCircuits(circuits) {
        circuitsGrid.innerHTML = '';
        circuits.forEach((circuit, index) => {
        const card = document.createElement('div');
        card.classList.add('circuit-card');
        card.style.animationDelay = `${index * 0.03}s`;
        card.innerHTML = `
            <div class="circuit-card-image">
                <img src="${circuit.layoutImage}" alt="${circuit.name}" loading="lazy" onerror="this.onerror=null;this.src=makeSVG('${circuit.name}','#1a1a1e','#e10600')">
            </div>
            <div class="circuit-card-content">
                <h3>${circuit.name}</h3>
                <div class="circuit-card-location">
                    📍 ${circuit.location}
                </div>
                <div class="circuit-card-stats">
                    <div class="circuit-stat">
                        <span class="circuit-stat-label">Length</span>
                        <span class="circuit-stat-value">${circuit.length}</span>
                    </div>
                    <div class="circuit-stat">
                        <span class="circuit-stat-label">Laps</span>
                        <span class="circuit-stat-value">${circuit.laps}</span>
                    </div>
                    <div class="circuit-stat">
                        <span class="circuit-stat-label">First GP</span>
                        <span class="circuit-stat-value">${circuit.firstGP}</span>
                    </div>
                    <div class="circuit-stat">
                        <span class="circuit-stat-label">Corners</span>
                        <span class="circuit-stat-value">${circuit.corners}</span>
                    </div>
                </div>
            </div>
        `;
            card.addEventListener('click', () => openCircuitModal(circuit));
            circuitsGrid.appendChild(card);
        });
    }
    
    renderCircuits(displayedCircuits);
    
    // Circuit Search
    circuitSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        displayedCircuits = circuitsData.filter(circuit => 
            circuit.name.toLowerCase().includes(searchTerm) ||
            circuit.location.toLowerCase().includes(searchTerm)
        );
        applySortAndRender();
    });
    
    // Circuit Sort
    circuitSort.addEventListener('change', (e) => {
        applySortAndRender();
    });
    
    function applySortAndRender() {
        const sortValue = circuitSort.value;
        let sorted = [...displayedCircuits];
        
        switch(sortValue) {
            case 'length-desc':
                sorted.sort((a, b) => parseFloat(b.length) - parseFloat(a.length));
                break;
            case 'length-asc':
                sorted.sort((a, b) => parseFloat(a.length) - parseFloat(b.length));
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                // calendar order (already in order)
                break;
        }
        
        renderCircuits(sorted);
    }

    function openCircuitModal(circuit) {
        const typeBadgeClass = circuit.circuitType === 'Street' ? 'badge-street'
                             : circuit.circuitType === 'Semi-Permanent' ? 'badge-semi'
                             : 'badge-permanent';
        circuitModalBody.innerHTML = `
            <div class="circuit-modal-header">
                <h2>${circuit.name}</h2>
                <div class="circuit-modal-location">📍 ${circuit.location}</div>
                <div class="circuit-meta-badges">
                    ${circuit.circuitType ? `<span class="circuit-badge ${typeBadgeClass}">${circuit.circuitType}</span>` : ''}
                    ${circuit.drsZones   ? `<span class="circuit-badge badge-drs">${circuit.drsZones} DRS Zone${circuit.drsZones !== 1 ? 's' : ''}</span>` : ''}
                    ${circuit.topSpeed   ? `<span class="circuit-badge badge-speed">${circuit.topSpeed} top speed</span>` : ''}
                </div>
            </div>

            <img src="${circuit.layoutImage}" alt="${circuit.name} layout" class="circuit-layout-image" onerror="this.onerror=null;this.src=makeSVG('${circuit.name} Layout','#1a1a1e','#e10600')">

            <div class="circuit-modal-stats">
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Length</div>
                    <div class="circuit-modal-stat-value">${circuit.length}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Laps</div>
                    <div class="circuit-modal-stat-value">${circuit.laps}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Race Distance</div>
                    <div class="circuit-modal-stat-value">${circuit.raceDistance}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">First GP</div>
                    <div class="circuit-modal-stat-value">${circuit.firstGP}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Corners</div>
                    <div class="circuit-modal-stat-value">${circuit.corners}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Lap Record</div>
                    <div class="circuit-modal-stat-value" style="font-size: 0.9rem;">${circuit.lapRecord}</div>
                </div>
            </div>
            
            <div class="circuit-modal-info">
                <div class="circuit-info-section">
                    <h3>🏁 Significance</h3>
                    <p>${circuit.significance}</p>
                </div>
                <div class="circuit-info-section">
                    <h3>🏎️ Characteristics</h3>
                    <p>${circuit.characteristics}</p>
                </div>
                <div class="circuit-info-section">
                    <h3>⭐ Famous Corner</h3>
                    <p>${circuit.famousCorner}</p>
                </div>
            </div>
        `;
        circuitModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeCircuitModal() {
        circuitModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    circuitCloseBtn.addEventListener('click', closeCircuitModal);
    circuitModalOverlay.addEventListener('click', closeCircuitModal);

    // Close circuit modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && circuitModal.style.display === 'block') {
            closeCircuitModal();
        }
    });
});
