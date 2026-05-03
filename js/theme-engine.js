/**
 * F-ATICS Phase 11: Immersive Soundscapes & Dynamic Theming
 * Handles Howler.js audio and global CSS variable injection for team themes.
 */

const ThemeAndSoundEngine = (function() {
    'use strict';

    // ── 1. THEME DEFINITIONS ────────────────────────────────────────────────
    const THEMES = {
        'F-ATICS':      { primary: '#E10600', dim: '#9B0400' }, // Default F1 Red
        'McLaren':      { primary: '#FF8700', dim: '#CC6C00' }, // Papaya Orange
        'Ferrari':      { primary: '#DC0000', dim: '#990000' }, // Scuderia Red
        'Mercedes':     { primary: '#00D2BE', dim: '#00A696' }, // Petronas Teal
        'Red Bull':     { primary: '#0600EF', dim: '#0400B3' }, // RB Blue
        'Aston Martin': { primary: '#006F62', dim: '#004A41' }, // Racing Green
        'Alpine':       { primary: '#FF69B4', dim: '#CC5490' }, // BWT Pink
        'Williams':     { primary: '#005AFF', dim: '#0042B3' }, // Williams Blue
        'Audi':         { primary: '#C0C0C0', dim: '#808080' }, // Silver
        'Haas':         { primary: '#B6BABD', dim: '#7A7E80' }, // Haas Grey
        'Cadillac':     { primary: '#CC0033', dim: '#990026' }  // Cadillac Red
    };

    // ── 2. AUDIO ENGINE (Howler.js) ─────────────────────────────────────────
    let sounds = null;
    let audioInitialized = false;

    function initAudio() {
        if (audioInitialized || typeof Howl === 'undefined') return;
        
        // Use high-quality synthesized/procedural sounds via base64 or public URLs
        // Note: For a true production app, these would be local high-quality .mp3/.wav assets
        sounds = {
            click: new Howl({
                src: ['/audio/click.mp3'], // Reliable local click
                volume: 0.15
            }),
            swoosh: new Howl({
                src: ['/audio/swoosh.mp3'], // Reliable local swoosh
                volume: 0.05
            }),
            radio: new Howl({
                src: ['/audio/radio.mp3'], // Reliable local static
                volume: 0.1
            })
        };
        audioInitialized = true;
    }

    function playSound(type) {
        // Only initialize audio on first user interaction to satisfy browser auto-play policies
        if (!audioInitialized) {
            initAudio();
        }
        if (sounds && sounds[type]) {
            sounds[type].play();
        }
    }

    // ── 3. DOM & UI LOGIC ───────────────────────────────────────────────────
    function applyTheme(teamName, silent = false) {
        const theme = THEMES[teamName];
        if (!theme) return;

        // 1. Update Global CSS Variables
        document.documentElement.style.setProperty('--pk-red', theme.primary);
        document.documentElement.style.setProperty('--pk-red-dim', theme.dim);

        // 2. Update UI Selectors
        document.getElementById('active-theme-name').textContent = teamName;
        document.getElementById('active-theme-dot').style.backgroundColor = theme.primary;
        document.getElementById('active-theme-dot').style.boxShadow = `0 0 5px ${theme.primary}`;

        // 3. Play Mechanical Click (if triggered by user gesture, avoid Autoplay policy block)
        if (!silent) {
            playSound('click');
        }

        // Close dropdown
        document.querySelector('.team-theme-selector').classList.remove('active');
        const tb = document.getElementById('theme-toggle-btn');
        if (tb) tb.setAttribute('aria-expanded', 'false');
        
        // Optional: Save to localStorage
        localStorage.setItem('pk_f1_theme', teamName);
    }

    function initUI() {
        const selector = document.querySelector('.team-theme-selector');
        const btn = document.getElementById('theme-toggle-btn');
        const dropdown = document.getElementById('theme-dropdown');

        if (!selector || !btn || !dropdown) return;

        // Build Dropdown Options
        Object.keys(THEMES).forEach(team => {
            const opt = document.createElement('div');
            opt.className = 'theme-option';
            opt.innerHTML = `
                <span class="theme-color-dot" style="background:${THEMES[team].primary}; box-shadow:0 0 5px ${THEMES[team].primary}"></span>
                ${team}
            `;
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                applyTheme(team);
            });
            dropdown.appendChild(opt);
        });

        // Toggle Dropdown
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            playSound('click');
            const isOpen = selector.classList.toggle('active');
            btn.setAttribute('aria-expanded', String(isOpen));
        });

        // Close when clicking outside
        document.addEventListener('click', () => {
            selector.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
        });

        // Wire up audio to specific interactions
        
        // Mega nav links hover swooshes
        document.querySelectorAll('.mega-link').forEach(link => {
            link.addEventListener('mouseenter', () => playSound('swoosh'));
        });

        // Pill nav clicks
        document.querySelectorAll('.pk-nav-link').forEach(link => {
            link.addEventListener('click', () => playSound('click'));
        });

        // AI Predictor Radio Sound
        const predictBtn = document.getElementById('predict-btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => playSound('radio'));
        }

        // Restore saved theme (silent execution to prevent Autoplay warning)
        const saved = localStorage.getItem('pk_f1_theme');
        if (saved && THEMES[saved]) {
            applyTheme(saved, true);
        }
    }

    return {
        init: () => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initUI);
            } else {
                initUI();
            }
        },
        play: playSound
    };

})();

ThemeAndSoundEngine.init();
