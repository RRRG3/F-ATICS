document.addEventListener('DOMContentLoaded', () => {
    console.log('🏎️ F1 Fan Zone - Script loaded!');
    console.log('Quiz data loaded:', typeof quizData !== 'undefined' ? quizData.length + ' questions' : 'NOT LOADED');
    console.log('Circuits data loaded:', typeof circuitsData !== 'undefined' ? circuitsData.length + ' circuits' : 'NOT LOADED');
    console.log('Calendar data loaded:', typeof raceCalendar !== 'undefined' ? raceCalendar.length + ' races' : 'NOT LOADED');
    
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

    const teamsData = [
        { 
            name: "Mercedes-AMG Petronas", 
            car: "Mercedes W16", 
            drivers: "George Russell, Andrea Kimi Antonelli", 
            principal: "Toto Wolff",
            color: "#00D2BE",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/mercedes.png",
            carImg: "https://www.mercedes-amg-f1.com/content/dam/mercedes-amg-f1/2024/car-launch/W15-side-profile.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/russell.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/antonelli.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/TotoWolff.jpg",
            fallbackImg: "https://via.placeholder.com/800x400/00D2BE/FFFFFF?text=Mercedes+W16"
        },
        { 
            name: "Oracle Red Bull Racing", 
            car: "Red Bull RB21", 
            drivers: "Max Verstappen, Liam Lawson", 
            principal: "Christian Horner",
            color: "#0600EF",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/red%20bull.png",
            carImg: "https://www.redbull.com/content/dam/redbullcom/images/motorsports/f1/2024/car-launch/RB20-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/verstappen.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/lawson.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/ChristianHorner.jpg",
            fallbackImg: "https://via.placeholder.com/800x400/0600EF/FFFFFF?text=Red+Bull+RB21"
        },
        { 
            name: "Scuderia Ferrari", 
            car: "Ferrari SF-25", 
            drivers: "Charles Leclerc, Lewis Hamilton", 
            principal: "Frédéric Vasseur",
            color: "#DC0000",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/ferrari.png",
            carImg: "https://www.ferrari.com/content/dam/ferrari/motorsport/formula1/2024/car-launch/SF-24-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/leclerc.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/hamilton.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/FredericVasseur.jpg",
            fallbackImg: "https://via.placeholder.com/800x400/DC0000/FFFFFF?text=Ferrari+SF-25"
        },
        { 
            name: "McLaren Formula 1 Team", 
            car: "McLaren MCL39", 
            drivers: "Lando Norris, Oscar Piastri", 
            principal: "Andrea Stella",
            color: "#FF8700",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/mclaren.png",
            carImg: "https://www.mclaren.com/content/dam/mclaren/racing/2024/car-launch/MCL38-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/norris.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/piastri.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/AndreaStella.jpg",
            fallbackImg: "https://via.placeholder.com/800x400/FF8700/FFFFFF?text=McLaren+MCL39"
        },
        { 
            name: "Aston Martin Aramco", 
            car: "Aston Martin AMR25", 
            drivers: "Fernando Alonso, Lance Stroll", 
            principal: "Mike Krack",
            color: "#006F62",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/aston%20martin.png",
            carImg: "https://www.astonmartinf1.com/content/dam/amf1/2024/car-launch/AMR24-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/alonso.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/stroll.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/MikeKrack.jpg",
            fallbackImg: "https://via.placeholder.com/800x400/006F62/FFFFFF?text=Aston+Martin+AMR25"
        },
        { 
            name: "BWT Alpine F1 Team", 
            car: "Alpine A525", 
            drivers: "Pierre Gasly, Jack Doohan", 
            principal: "Oliver Oakes",
            color: "#0090FF",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/alpine.png",
            carImg: "https://www.alpinecars.com/content/dam/alpine/f1/2024/car-launch/A524-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/gasly.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/doohan.jpg",
            principalImg: "https://via.placeholder.com/400x400/0090FF/FFFFFF?text=Oliver+Oakes",
            fallbackImg: "https://via.placeholder.com/800x400/0090FF/FFFFFF?text=Alpine+A525"
        },
        { 
            name: "Williams Racing", 
            car: "Williams FW47", 
            drivers: "Alexander Albon, Carlos Sainz", 
            principal: "James Vowles",
            color: "#005AFF",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/williams.png",
            carImg: "https://www.williamsf1.com/content/dam/williams/2024/car-launch/FW46-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/albon.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/sainz.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/JamesVowles.jpg",
            fallbackImg: "https://via.placeholder.com/800x400/005AFF/FFFFFF?text=Williams+FW47"
        },
        { 
            name: "Visa Cash App RB", 
            car: "RB VCARB 02", 
            drivers: "Yuki Tsunoda, Isack Hadjar", 
            principal: "Laurent Mekies",
            color: "#2B4562",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/rb.png",
            carImg: "https://www.visacashapprb.com/content/dam/rb/2024/car-launch/VCARB01-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/tsunoda.jpg",
            driver2Img: "https://via.placeholder.com/400x400/2B4562/FFFFFF?text=Isack+Hadjar",
            principalImg: "https://via.placeholder.com/400x400/2B4562/FFFFFF?text=Laurent+Mekies",
            fallbackImg: "https://via.placeholder.com/800x400/2B4562/FFFFFF?text=RB+VCARB+02"
        },
        { 
            name: "Stake F1 Team Sauber", 
            car: "Sauber C45", 
            drivers: "Nico Hülkenberg, Gabriel Bortoleto", 
            principal: "Mattia Binotto",
            color: "#00E701",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/sauber.png",
            carImg: "https://www.sauber-group.com/content/dam/sauber/2024/car-launch/C44-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/hulkenberg.jpg",
            driver2Img: "https://via.placeholder.com/400x400/00E701/000000?text=Gabriel+Bortoleto",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/MattiaBinotto.jpg",
            fallbackImg: "https://via.placeholder.com/800x400/00E701/000000?text=Sauber+C45"
        },
        { 
            name: "MoneyGram Haas F1 Team", 
            car: "Haas VF-25", 
            drivers: "Esteban Ocon, Oliver Bearman", 
            principal: "Ayao Komatsu",
            color: "#FFFFFF",
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/haas.png",
            carImg: "https://www.haasf1team.com/content/dam/haas/2024/car-launch/VF-24-side.jpg",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/ocon.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/bearman.jpg",
            principalImg: "https://via.placeholder.com/400x400/FFFFFF/000000?text=Ayao+Komatsu",
            fallbackImg: "https://via.placeholder.com/800x400/FFFFFF/000000?text=Haas+VF-25"
        }
    ];

    teamsData.forEach((team, index) => {
        const card = document.createElement('div');
        card.classList.add('team-card');
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="team-logo-badge">
                <img src="${team.logo}" alt="${team.name} logo" class="team-logo" 
                     onerror="this.style.display='none'">
            </div>
            <div class="car-360-container">
                <div class="car-360-viewer" data-team="${team.name}">
                    <img src="${team.fallbackImg}" alt="${team.car}" class="car-image" 
                         onerror="this.src='${team.fallbackImg}'"
                         style="border-left: 4px solid ${team.color}">
                    <div class="rotation-indicator">
                        <span class="rotate-icon">🔄</span>
                        <span class="rotate-text">Drag to rotate</span>
                    </div>
                </div>
            </div>
            <div class="team-card-content">
                <h3>${team.name}</h3>
                <p class="team-car-name">${team.car}</p>
                <div class="team-quick-info">
                    <span class="team-drivers">👥 ${team.drivers.split(',')[0]} & ${team.drivers.split(',')[1]}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => openModal(team));
        teamGrid.appendChild(card);
        
        // Add 360 rotation interaction
        const viewer = card.querySelector('.car-360-viewer');
        let isDragging = false;
        let startX = 0;
        let currentRotation = 0;
        
        viewer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            viewer.style.cursor = 'grabbing';
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            currentRotation += deltaX * 0.5;
            viewer.style.transform = `perspective(1000px) rotateY(${currentRotation}deg)`;
            startX = e.clientX;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                viewer.style.cursor = 'grab';
            }
        });
        
        // Touch support
        viewer.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            e.stopPropagation();
        });
        
        viewer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - startX;
            currentRotation += deltaX * 0.5;
            viewer.style.transform = `perspective(1000px) rotateY(${currentRotation}deg)`;
            startX = e.touches[0].clientX;
            e.preventDefault();
        });
        
        viewer.addEventListener('touchend', () => {
            isDragging = false;
        });
    });

    function openModal(team) {
        const drivers = team.drivers.split(', ');
        modalBody.innerHTML = `
            <div class="team-modal-header">
                <img src="${team.logo}" alt="${team.name} logo" class="modal-team-logo" 
                     onerror="this.style.display='none'">
                <h2>${team.name}</h2>
                <p class="modal-car-name">${team.car}</p>
            </div>
            
            <div class="team-modal-grid">
                <div class="modal-image-card">
                    <h3>🏎️ Car</h3>
                    <img src="${team.fallbackImg}" alt="${team.car}" loading="lazy" 
                         onerror="this.src='${team.fallbackImg}'">
                </div>
                
                <div class="modal-image-card">
                    <h3>👤 ${drivers[0]}</h3>
                    <img src="${team.driver1Img}" alt="${drivers[0]}" loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/400x400/${team.color.replace('#', '')}/FFFFFF?text=${encodeURIComponent(drivers[0])}'">
                </div>
                
                <div class="modal-image-card">
                    <h3>👤 ${drivers[1]}</h3>
                    <img src="${team.driver2Img}" alt="${drivers[1]}" loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/400x400/${team.color.replace('#', '')}/FFFFFF?text=${encodeURIComponent(drivers[1])}'">
                </div>
                
                <div class="modal-image-card">
                    <h3>👔 Team Principal</h3>
                    <img src="${team.principalImg}" alt="${team.principal}" loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/400x400/${team.color.replace('#', '')}/FFFFFF?text=${encodeURIComponent(team.principal)}'">
                    <p class="principal-name">${team.principal}</p>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });

    // Standings with fallback data
    const standingsBody = document.getElementById('standings-body');

    // 2025 Driver Lineup with current season points
    const fallbackStandings = [
        { position: 1, driver: "Max Verstappen", nationality: "Dutch", team: "Red Bull Racing", points: 437 },
        { position: 2, driver: "Lando Norris", nationality: "British", team: "McLaren", points: 374 },
        { position: 3, driver: "Charles Leclerc", nationality: "Monegasque", team: "Ferrari", points: 356 },
        { position: 4, driver: "Oscar Piastri", nationality: "Australian", team: "McLaren", points: 292 },
        { position: 5, driver: "Lewis Hamilton", nationality: "British", team: "Ferrari", points: 223 },
        { position: 6, driver: "George Russell", nationality: "British", team: "Mercedes", points: 245 },
        { position: 7, driver: "Carlos Sainz", nationality: "Spanish", team: "Williams", points: 290 },
        { position: 8, driver: "Liam Lawson", nationality: "New Zealand", team: "Red Bull Racing", points: 4 },
        { position: 9, driver: "Fernando Alonso", nationality: "Spanish", team: "Aston Martin", points: 70 },
        { position: 10, driver: "Lance Stroll", nationality: "Canadian", team: "Aston Martin", points: 24 },
        { position: 11, driver: "Pierre Gasly", nationality: "French", team: "Alpine", points: 26 },
        { position: 12, driver: "Jack Doohan", nationality: "Australian", team: "Alpine", points: 0 },
        { position: 13, driver: "Yuki Tsunoda", nationality: "Japanese", team: "RB", points: 30 },
        { position: 14, driver: "Isack Hadjar", nationality: "French", team: "RB", points: 0 },
        { position: 15, driver: "Nico Hulkenberg", nationality: "German", team: "Sauber", points: 37 },
        { position: 16, driver: "Gabriel Bortoleto", nationality: "Brazilian", team: "Sauber", points: 0 },
        { position: 17, driver: "Esteban Ocon", nationality: "French", team: "Haas", points: 23 },
        { position: 18, driver: "Oliver Bearman", nationality: "British", team: "Haas", points: 7 },
        { position: 19, driver: "Alexander Albon", nationality: "Thai", team: "Williams", points: 12 },
        { position: 20, driver: "Andrea Kimi Antonelli", nationality: "Italian", team: "Mercedes", points: 0 }
    ];

    function displayStandings(standings) {
        standingsBody.innerHTML = '';
        standings.forEach((driver, index) => {
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.03}s`;
            
            // Add medal emoji for top 3
            let positionDisplay = driver.position;
            if (driver.position === 1 || driver.position === '1') positionDisplay = '🥇 1';
            else if (driver.position === 2 || driver.position === '2') positionDisplay = '🥈 2';
            else if (driver.position === 3 || driver.position === '3') positionDisplay = '🥉 3';
            
            row.innerHTML = `
                <td class="pos-col">${positionDisplay}</td>
                <td class="driver-col">${driver.driver}</td>
                <td class="nationality-col">${driver.nationality}</td>
                <td class="team-col">${driver.team}</td>
                <td class="points-col">${driver.points}</td>
            `;
            standingsBody.appendChild(row);
        });
    }

    // Use fallback data directly for better performance and reliability
    console.log('Loading driver standings...');
    displayStandings(fallbackStandings);
    console.log('✅ Driver standings loaded!');


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

    // Quiz Leaderboard
    function updateLeaderboard() {
        const leaderboard = JSON.parse(localStorage.getItem('f1QuizLeaderboard') || '[]');
        const leaderboardList = document.getElementById('leaderboard-list');
        
        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No scores yet. Be the first!</p>';
            return;
        }
        
        leaderboardList.innerHTML = leaderboard.slice(0, 5).map((entry, index) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">${entry.score}/${entry.total}</span>
            </div>
        `).join('');
    }

    function saveScore(score, total) {
        const name = prompt('Great job! Enter your name for the leaderboard:') || 'Anonymous';
        const leaderboard = JSON.parse(localStorage.getItem('f1QuizLeaderboard') || '[]');
        leaderboard.push({ name, score, total, date: new Date().toISOString() });
        leaderboard.sort((a, b) => (b.score / b.total) - (a.score / a.total));
        localStorage.setItem('f1QuizLeaderboard', JSON.stringify(leaderboard.slice(0, 10)));
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
                        <div class="countdown-time">${days} days</div>
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="calendar-card-header">
                    <span class="calendar-round">Round ${race.round}</span>
                    <span class="calendar-flag">${race.flag}</span>
                </div>
                <h3>${race.name}</h3>
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

    function displayPredictions(predictions) {
        const top3 = predictions.slice(0, 3);
        const rest = predictions.slice(3);

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
                <img src="${circuit.layoutImage}" alt="${circuit.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x200/1a1a1a/e10600?text=${encodeURIComponent(circuit.name)}'">
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
        circuitModalBody.innerHTML = `
            <div class="circuit-modal-header">
                <h2>${circuit.name}</h2>
                <div class="circuit-modal-location">📍 ${circuit.location}</div>
            </div>
            
            <img src="${circuit.layoutImage}" alt="${circuit.name} layout" class="circuit-layout-image" onerror="this.src='https://via.placeholder.com/800x400/1a1a1a/e10600?text=${encodeURIComponent(circuit.name + ' Layout')}'">
            
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
