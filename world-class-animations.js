// World-Class Animations - Premium F1 Experience
// Inspired by landonorris.com

document.addEventListener('DOMContentLoaded', () => {

    // ===== LENIS SMOOTH SCROLL =====
    let lenis;
    function initSmoothScroll() {
        if (typeof Lenis !== 'undefined') {
            lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
                direction: 'vertical',
                gestureDirection: 'vertical',
                smooth: true,
                mouseMultiplier: 1,
                smoothTouch: false,
                touchMultiplier: 2,
                infinite: false,
            });

            // Connect Lenis scroll event to GSAP ScrollTrigger
            lenis.on('scroll', ScrollTrigger.update);

            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });

            gsap.ticker.lagSmoothing(0);
            
            // Expose globally for other scripts to jump
            window.lenis = lenis;
        } else {
            console.warn('Lenis library not loaded! ScrollTrigger might fail to sync.');
        }
    }

    initSmoothScroll();

    // ===== SPLIT TEXT ANIMATION =====
    function initTextReveal() {
        // Find all elements with text-reveal class
        const textElements = document.querySelectorAll('.text-split');

        textElements.forEach((element) => {
            const text = element.textContent;
            element.innerHTML = '';

            // Split into characters
            text.split('').forEach((char, index) => {
                const span = document.createElement('span');
                span.className = 'char';
                span.textContent = char === ' ' ? '\u00A0' : char;
                span.style.animationDelay = `${index * 0.03}s`;
                element.appendChild(span);
            });
        });

        // Trigger reveal after a short delay
        setTimeout(() => {
            document.querySelectorAll('.char').forEach((char, index) => {
                setTimeout(() => {
                    char.classList.add('revealed');
                }, index * 30);
            });
        }, 500);
    }

    // ===== GSAP SCROLL ANIMATIONS =====
    function initScrollAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP or ScrollTrigger not loaded');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        // Hero text parallax
        gsap.utils.toArray('.hero-mega-text').forEach((text, i) => {
            gsap.to(text, {
                scrollTrigger: {
                    trigger: '.hero-world-class',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1,
                },
                y: (i + 1) * 50,
                opacity: 0.3,
                ease: 'none'
            });
        });

        // Section reveal animations
        gsap.utils.toArray('.section').forEach((section) => {
            // Title animation
            const title = section.querySelector('.section-title, .section-title-mega');
            if (title) {
                gsap.fromTo(title, 
                    { y: 100, opacity: 0 },
                    {
                        scrollTrigger: {
                            trigger: section,
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        },
                        y: 0,
                        opacity: 1,
                        duration: 1,
                        ease: 'power4.out',
                        clearProps: 'all' // Crucial to prevent sticky opacity:0
                    }
                );
            }

            // Cards stagger animation
            const cards = section.querySelectorAll('.bento-card, .team-card, .circuit-card, .calendar-card');
            if (cards.length > 0) {
                gsap.fromTo(cards, 
                    { y: 80, opacity: 0 },
                    {
                        scrollTrigger: {
                            trigger: section,
                            start: 'top 80%',
                            toggleActions: 'play none none none',
                        },
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        stagger: 0.1,
                        ease: 'power3.out',
                        clearProps: 'all' // Crucial
                    }
                );
            }
        });

        // Fail-safe to ensure everything is visible after 3 seconds just in case ScrollTrigger totally crashes
        setTimeout(() => {
            document.querySelectorAll('.bento-card, .team-card, .circuit-card, .calendar-card, .section-title, .section-title-mega').forEach(el => {
                if(getComputedStyle(el).opacity === '0') {
                   el.style.opacity = '1';
                   el.style.transform = 'none';
                   el.style.visibility = 'visible';
                }
            });
            ScrollTrigger.refresh();
        }, 3000);

        // Parallax background layers
        gsap.utils.toArray('.parallax-layer').forEach((layer) => {
            const speed = layer.dataset.speed || 0.5;
            gsap.to(layer, {
                scrollTrigger: {
                    trigger: layer.parentElement,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
                y: `${100 * speed}%`,
                ease: 'none'
            });
        });

        // Image reveal on scroll
        gsap.utils.toArray('.image-reveal').forEach((image) => {
            gsap.to(image, {
                scrollTrigger: {
                    trigger: image,
                    start: 'top 80%',
                    onEnter: () => image.classList.add('revealed'),
                }
            });
        });

    }

    // ===== 3D CARD TILT EFFECT =====
    function init3DCards() {
        const cards = document.querySelectorAll('.card-3d, .bento-card, .team-card');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
            });
        });

    }

    // ===== MAGNETIC BUTTONS =====
    function initMagneticButtons() {
        const buttons = document.querySelectorAll('.btn-magnetic, .btn-primary, .btn-neon');

        buttons.forEach(button => {
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translate(0, 0)';
            });
        });

    }

    // ===== FULLSCREEN NAVIGATION =====
    function initFullscreenNav() {
        const menuToggle = document.querySelector('.menu-toggle');
        const fullscreenNav = document.querySelector('.fullscreen-nav');
        const megaLinks = document.querySelectorAll('.mega-link');

        if (!menuToggle || !fullscreenNav) return;

        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            fullscreenNav.classList.toggle('active');
            document.body.style.overflow = fullscreenNav.classList.contains('active') ? 'hidden' : '';

            // Animate links
            if (fullscreenNav.classList.contains('active')) {
                megaLinks.forEach((link, i) => {
                    link.style.opacity = '0';
                    link.style.transform = 'translateY(50px)';
                    setTimeout(() => {
                        link.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                        link.style.opacity = '1';
                        link.style.transform = 'translateY(0)';
                    }, 100 + i * 100);
                });
            }
        });

        // Close nav on link click
        megaLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                fullscreenNav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

    }

    // ===== SCROLL PROGRESS INDICATOR =====
    function initScrollProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        progressBar.innerHTML = '<div class="scroll-progress-bar"></div>';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            z-index: 10000;
        `;

        const bar = progressBar.querySelector('.scroll-progress-bar');
        bar.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #FF6B00, #e10600);
            width: 0%;
            transition: width 0.1s ease-out;
        `;

        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            bar.style.width = `${progress}%`;
        });

    }

    // ===== INTERSECTION OBSERVER FOR REVEAL =====
    function initRevealObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');

                    // Stagger children if present
                    const children = entry.target.querySelectorAll(':scope > *');
                    children.forEach((child, i) => {
                        child.style.transitionDelay = `${i * 0.1}s`;
                    });
                }
            });
        }, observerOptions);

        document.querySelectorAll('.section-reveal, .stagger-reveal, .image-reveal').forEach(el => {
            observer.observe(el);
        });

    }

    // ===== DYNAMIC GLOW EFFECT =====
    function initGlowEffect() {
        const glowElements = document.querySelectorAll('.glow-on-hover');

        glowElements.forEach(element => {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                element.style.setProperty('--glow-x', `${x}px`);
                element.style.setProperty('--glow-y', `${y}px`);
            });
        });
    }

    // ===== GSAP ZERO-REFRESH PAGE TRANSITIONS (Phase 10) =====
    function initPageTransitions() {
        if (typeof gsap === 'undefined') return;

        const wipePanels = document.querySelectorAll('.wipe-panel');
        const wipeLogo = document.querySelector('.wipe-logo');
        
        // Intercept all local anchor links (e.g., #basics, #standings)
        const localLinks = document.querySelectorAll('a[href^="#"]');

        localLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (!targetElement) return;

                // Create the Wipe Timeline
                const tl = gsap.timeline();

                // 1. Bring panels up (Staggered wipe IN)
                tl.to(wipePanels, {
                    y: '0%',
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'power4.inOut'
                })
                // 2. Fade in logo
                .to(wipeLogo, {
                    opacity: 1,
                    duration: 0.3
                }, '-=0.2')
                // 3. The actual "Page Load" swap (Instant scroll & layout recalibration)
                .add(() => {
                    try {
                        if (typeof window.lenis !== 'undefined' && window.lenis) {
                            // Use lenis built-in jump to keep external scroll triggers in sync
                            window.lenis.scrollTo(targetElement, { immediate: true });
                        } else {
                            // Fallback
                            targetElement.scrollIntoView({ behavior: 'auto' });
                        }
                        
                        if (targetElement) {
                            // Force reveal CSS stagger elements
                            const hiddenElements = targetElement.querySelectorAll('.stagger-reveal, .section-reveal, .image-reveal');
                            hiddenElements.forEach(el => el.classList.add('revealed'));
                            
                            // Kill GSAP scroll triggers for this section so they don't fight us
                            if (typeof ScrollTrigger !== 'undefined') {
                                ScrollTrigger.getAll().forEach(st => {
                                    if (st.trigger && (targetElement.contains(st.trigger) || st.trigger === targetElement)) {
                                        st.kill();
                                    }
                                });
                            }
                            
                            // Absolute brute-force unhide on all typical staggered elements
                            if (typeof gsap !== 'undefined') {
                                const animatedEls = targetElement.querySelectorAll('.section-title, .section-subtitle, .bento-card, .driver-standings-card, .team-card, .circuit-card, .calendar-card');
                                gsap.set(animatedEls, { opacity: 1, y: 0, x: 0, visibility: 'visible', clearProps: 'opacity,transform,visibility' });
                                
                                // Also clear children of stagger reveals just in case
                                const staggerChildren = targetElement.querySelectorAll('.stagger-reveal > *');
                                gsap.set(staggerChildren, { opacity: 1, y: 0, clearProps: 'opacity,transform' });
                            }
                        }
                        
                        if (typeof ScrollTrigger !== 'undefined') {
                            ScrollTrigger.refresh();
                        }
                    } catch (err) {
                        console.error("Transition scroll error:", err);
                        // Emergency fallback to ensure user isn't stuck
                        if (targetElement) targetElement.scrollIntoView({ behavior: 'auto' });
                    }
                })
                // 4. Hold the mask for a split second to feel like a real load
                .to({}, { duration: 0.3 })
                // 5. Fade out logo
                .to(wipeLogo, {
                    opacity: 0,
                    duration: 0.2
                })
                // 6. Push panels up and away (Staggered wipe OUT)
                .to(wipePanels, {
                    y: '-100%',
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'power4.inOut'
                })
                // 7. Reset panels back to bottom for the next click
                .set(wipePanels, {
                    y: '100%'
                });
            });
        });
        
    }

    // ===== HERO TEXT ANIMATION =====
    function initHeroAnimation() {
        const heroTexts = document.querySelectorAll('.hero-mega-text .text-reveal');

        heroTexts.forEach((text, index) => {
            text.style.animationDelay = `${0.2 + index * 0.2}s`;
        });

        // Add floating animation to accent elements
        const accentText = document.querySelector('.hero-mega-text.accent');
        if (accentText) {
            accentText.style.animation = 'glowPulse 3s ease-in-out infinite';
        }

    }

    // ===== PREMIUM PAGE LOADER =====
    function initPremiumLoader() {
        const loader = document.querySelector('.page-loader');
        if (!loader) return;

        // Upgrade loader styling
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #050505;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 2rem;
            transition: opacity 0.8s ease, visibility 0.8s ease;
        `;

        // Add glow effect to loader
        const loaderText = loader.querySelector('.loader-text');
        if (loaderText) {
            loaderText.style.cssText = `
                font-family: 'Racing Sans One', sans-serif;
                font-size: 2rem;
                color: #FF6B00;
                text-shadow: 0 0 30px rgba(255, 107, 0, 0.5);
                animation: loaderPulse 1.5s ease-in-out infinite;
            `;
        }

        // Hide loader after load or immediately if already loaded
        const hideLoader = () => {
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.visibility = 'hidden';
                loader.style.pointerEvents = 'none'; // Ensure it doesn't block clicks
                document.body.classList.add('loaded');
                // Trigger hero animations
                initHeroAnimation();
            }, 500);
        };

        if (document.readyState === 'complete') {
            hideLoader();
        } else {
            window.addEventListener('load', hideLoader);
            // Fallback just in case
            setTimeout(hideLoader, 3000);
        }
    }

    // ===== ENHANCED CURSOR WITH GLOW =====
    function initEnhancedCursor() {
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorOutline = document.querySelector('.cursor-outline');

        if (!cursorDot || !cursorOutline) return;

        // Add glow effect to cursor
        cursorDot.style.cssText += `
            box-shadow: 0 0 20px rgba(255, 107, 0, 0.8), 0 0 40px rgba(255, 107, 0, 0.4);
            background: #FF6B00;
        `;

        cursorOutline.style.cssText += `
            border-color: rgba(255, 107, 0, 0.5);
        `;

        // Make cursor larger on hover over interactive elements
        const interactiveElements = document.querySelectorAll('a, button, .bento-card, .team-card, .calendar-card, .circuit-card');

        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorDot.style.transform = 'translate(-50%, -50%) scale(2)';
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
            });

            el.addEventListener('mouseleave', () => {
                cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        });

    }

    // ===== ADD CSS KEYFRAMES DYNAMICALLY =====
    function addDynamicStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes glowPulse {
                0%, 100% {
                    text-shadow: 
                        0 0 40px rgba(255, 107, 0, 0.5),
                        0 0 80px rgba(255, 107, 0, 0.3);
                }
                50% {
                    text-shadow: 
                        0 0 60px rgba(255, 107, 0, 0.8),
                        0 0 120px rgba(255, 107, 0, 0.5),
                        0 0 180px rgba(255, 107, 0, 0.2);
                }
            }
            
            @keyframes loaderPulse {
                0%, 100% { opacity: 0.5; transform: scale(0.98); }
                50% { opacity: 1; transform: scale(1); }
            }
            
            /* Smooth transitions for all animated elements */
            .bento-card, .team-card, .circuit-card, .calendar-card {
                transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            
            /* Enhanced header */
            .header {
                background: rgba(5, 5, 5, 0.9) !important;
                backdrop-filter: blur(20px) !important;
                border-bottom: 1px solid rgba(255, 107, 0, 0.2) !important;
            }
            
            /* Glow on nav links */
            .nav-link:hover {
                color: #FF6B00 !important;
                text-shadow: 0 0 20px rgba(255, 107, 0, 0.5);
            }
            
            /* Enhanced sections */
            .section-title {
                background: linear-gradient(135deg, #fff 0%, #FF6B00 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
        `;
        document.head.appendChild(style);
    }

    // ===== INITIALIZE ALL =====
    function init() {
        addDynamicStyles();
        initPremiumLoader();
        // initSmoothScroll(); // Removed to prevent double Lenis conflicts
        initScrollProgress();
        init3DCards();
        initMagneticButtons();
        initFullscreenNav();
        initRevealObserver();
        initGlowEffect();
        initEnhancedCursor();
        initPageTransitions();

        // Initialize GSAP animations after a short delay
        setTimeout(() => {
            initScrollAnimations();
        }, 100);

    }

    // Start initialization
    init();
});
