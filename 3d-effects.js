// 3D Effects and Advanced Animations

document.addEventListener('DOMContentLoaded', () => {
    // ===== PAGE LOADER =====
    const loader = document.querySelector('.page-loader');
    const progressBar = document.querySelector('.loader-progress-bar');
    
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += Math.random() * 40; // Faster loading
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadInterval);
            setTimeout(() => {
                loader.classList.add('hidden');
                document.body.classList.add('loaded');
                initAnimations();
            }, 200); // Reduced from 500ms
        }
        progressBar.style.width = progress + '%';
    }, 100); // Reduced from 200ms

    // ===== OPTIMIZED CHECKERED FLAG TRAIL =====
    const flagCanvas = document.getElementById('flag-trail-canvas');
    const flagCtx = flagCanvas.getContext('2d', { alpha: true, desynchronized: true });
    
    flagCanvas.width = window.innerWidth;
    flagCanvas.height = window.innerHeight;
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            flagCanvas.width = window.innerWidth;
            flagCanvas.height = window.innerHeight;
        }, 250);
    });
    
    const flags = [];
    const maxFlags = 10; // Reduced from 15 for better performance
    
    class CheckeredFlag {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = 30;
            this.alpha = 1;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
            this.scale = 1;
            this.velocity = {
                x: (Math.random() - 0.5) * 2,
                y: Math.random() * 2 + 1
            };
        }
        
        update() {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.rotation += this.rotationSpeed;
            this.alpha -= 0.02;
            this.scale -= 0.02;
            this.velocity.y += 0.1; // gravity
        }
        
        draw() {
            flagCtx.save();
            flagCtx.globalAlpha = this.alpha;
            flagCtx.translate(this.x, this.y);
            flagCtx.rotate(this.rotation);
            flagCtx.scale(this.scale, this.scale);
            
            const squareSize = this.size / 4;
            
            // Draw checkered pattern
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    if ((row + col) % 2 === 0) {
                        flagCtx.fillStyle = '#000000';
                    } else {
                        flagCtx.fillStyle = '#ffffff';
                    }
                    flagCtx.fillRect(
                        col * squareSize - this.size / 2,
                        row * squareSize - this.size / 2,
                        squareSize,
                        squareSize
                    );
                }
            }
            
            // Add flag pole
            flagCtx.fillStyle = '#666666';
            flagCtx.fillRect(-2, -this.size / 2, 2, this.size + 10);
            
            flagCtx.restore();
        }
    }
    
    let lastFlagTime = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const flagInterval = 50; // Increased from 30 for better performance
    const speedThreshold = 5; // Increased from 2 - only show on fast movement
    
    function animateFlags(timestamp) {
        flagCtx.clearRect(0, 0, flagCanvas.width, flagCanvas.height);
        
        // Calculate mouse speed
        const deltaX = mouseX - lastMouseX;
        const deltaY = mouseY - lastMouseY;
        const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Create new flag if mouse is moving fast enough
        if (timestamp - lastFlagTime > flagInterval && speed > speedThreshold && mouseX > 0) {
            flags.push(new CheckeredFlag(mouseX, mouseY));
            lastFlagTime = timestamp;
            
            if (flags.length > maxFlags) {
                flags.shift();
            }
        }
        
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        
        // Update and draw flags
        for (let i = flags.length - 1; i >= 0; i--) {
            flags[i].update();
            flags[i].draw();
            
            if (flags[i].alpha <= 0) {
                flags.splice(i, 1);
            }
        }
        
        requestAnimationFrame(animateFlags);
    }
    requestAnimationFrame(animateFlags);

    // ===== CUSTOM CURSOR =====
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let outlineX = 0, outlineY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animateCursor() {
        // Smooth cursor movement
        cursorX += (mouseX - cursorX) * 0.3;
        cursorY += (mouseY - cursorY) * 0.3;
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;
        
        cursorDot.style.left = cursorX + 'px';
        cursorDot.style.top = cursorY + 'px';
        cursorOutline.style.left = outlineX + 'px';
        cursorOutline.style.top = outlineY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Cursor hover effects
    const hoverElements = document.querySelectorAll('a, button, .team-card, .circuit-card, .calendar-card, .option');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
    
    // Optimized click effect - reduced burst
    document.addEventListener('click', (e) => {
        for (let i = 0; i < 5; i++) { // Reduced from 8 to 5
            const angle = (Math.PI * 2 * i) / 5;
            const flag = new CheckeredFlag(e.clientX, e.clientY);
            flag.velocity.x = Math.cos(angle) * 4;
            flag.velocity.y = Math.sin(angle) * 4;
            flag.size = 20; // Reduced from 25
            flags.push(flag);
        }
    });

    // ===== LIGHTWEIGHT PARTICLES BACKGROUND =====
    const particlesContainer = document.getElementById('particles');
    if (particlesContainer) {
        // Reduced from 50 to 20 particles for better performance
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 3 + 1}px;
                height: ${Math.random() * 3 + 1}px;
                background: rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 15 + 15}s linear infinite;
                animation-delay: ${Math.random() * 5}s;
                will-change: transform;
            `;
            particlesContainer.appendChild(particle);
        }
        
        // Simplified CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0%, 100% { transform: translate(0, 0); }
                50% { transform: translate(50px, -50px); }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== OPTIMIZED GSAP ANIMATIONS =====
    function initAnimations() {
        if (typeof gsap !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
            
            // Simplified section animations
            gsap.utils.toArray('.section').forEach((section) => {
                gsap.from(section, {
                    scrollTrigger: {
                        trigger: section,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                        once: true // Only animate once
                    },
                    y: 50,
                    opacity: 0,
                    duration: 0.6,
                    ease: 'power2.out'
                });
            });
            
            // Removed heavy parallax effect for better performance
        }
    }

    // ===== COUNTER ANIMATION =====
    const counters = document.querySelectorAll('.stat-number[data-count]');
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.count);
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;
                
                const updateCounter = () => {
                    current += step;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                updateCounter();
                counterObserver.unobserve(counter);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => counterObserver.observe(counter));

    // ===== OPTIMIZED VANILLA TILT =====
    if (typeof VanillaTilt !== 'undefined') {
        // Only apply to stat items, not all cards for better performance
        VanillaTilt.init(document.querySelectorAll('[data-tilt]'), {
            max: 10,
            speed: 300,
            glare: false, // Disabled glare for performance
            scale: 1.03
        });
    }

    // ===== SMOOTH SCROLL =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.offsetTop - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ===== HEADER SCROLL EFFECT =====
    const header = document.querySelector('.header');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.style.background = 'rgba(13, 13, 13, 0.95)';
            header.style.backdropFilter = 'blur(20px)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        } else {
            header.style.background = 'linear-gradient(180deg, rgba(13, 13, 13, 0.98) 0%, rgba(26, 26, 26, 0.95) 100%)';
            header.style.backdropFilter = 'blur(10px)';
            header.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
        }
        
        // Hide/show header on scroll
        if (currentScroll > lastScroll && currentScroll > 500) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });

    // Removed magnetic buttons for better performance

});


    // ===== FLAG TRAIL TOGGLE =====
    const flagToggle = document.getElementById('flag-toggle');
    if (flagToggle) {
        const flagIcon = flagToggle.querySelector('.flag-icon');
        let flagTrailEnabled = localStorage.getItem('flagTrail') !== 'false';
        
        flagCanvas.style.display = flagTrailEnabled ? 'block' : 'none';
        if (flagIcon) flagIcon.style.opacity = flagTrailEnabled ? '1' : '0.5';
        
        flagToggle.addEventListener('click', () => {
            flagTrailEnabled = !flagTrailEnabled;
            localStorage.setItem('flagTrail', flagTrailEnabled);
            flagCanvas.style.display = flagTrailEnabled ? 'block' : 'none';
            if (flagIcon) flagIcon.style.opacity = flagTrailEnabled ? '1' : '0.5';
            
            // Clear flags when disabled
            if (!flagTrailEnabled) {
                flags.length = 0;
            }
            
            // Show notification
            const notification = document.createElement('div');
            notification.textContent = flagTrailEnabled ? '🏁 Flag Trail Enabled' : '🏁 Flag Trail Disabled';
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: var(--primary-red);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        });
    }
