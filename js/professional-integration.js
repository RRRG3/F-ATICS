/**
 * Professional Integration Script
 * Enhances user experience with smooth animations and interactions
 */

class ProfessionalIntegration {
    constructor() {
        this.init();
    }

    init() {
        this.setupScrollAnimations();
        this.setupSmoothTransitions();
        this.setupAccessibility();
        this.setupPerformanceOptimizations();
        this.setupInteractiveElements();
        console.log('✨ Professional enhancements loaded');
    }

    /**
     * Scroll-based animations
     */
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    // Stagger children animations
                    const children = entry.target.querySelectorAll('.team-card, .circuit-card, .calendar-card, .option');
                    children.forEach((child, index) => {
                        setTimeout(() => {
                            child.style.animation = `fadeInScale 0.6s ease-out ${index * 0.05}s backwards`;
                        }, index * 50);
                    });
                }
            });
        }, observerOptions);

        // Observe all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('fade-in-on-scroll');
            observer.observe(section);
        });
    }

    /**
     * Smooth page transitions
     */
    setupSmoothTransitions() {
        // Smooth scroll to sections
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                
                if (target) {
                    const offset = 80;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Add highlight effect
                    target.style.animation = 'none';
                    setTimeout(() => {
                        target.style.animation = 'sectionHighlight 1s ease-out';
                    }, 10);
                }
            });
        });

        // Add highlight animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes sectionHighlight {
                0% { box-shadow: 0 0 0 0 rgba(225, 6, 0, 0.7); }
                50% { box-shadow: 0 0 0 20px rgba(225, 6, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(225, 6, 0, 0); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Accessibility enhancements
     */
    setupAccessibility() {
        // Add skip to content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-to-content';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Add aria-labels to interactive elements
        document.querySelectorAll('.team-card').forEach((card, index) => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `View team ${index + 1} details`);
            
            // Keyboard navigation
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });

        // Announce dynamic content changes
        const announcer = document.createElement('div');
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        document.body.appendChild(announcer);

        // Store announcer for later use
        window.announceToScreenReader = (message) => {
            announcer.textContent = message;
            setTimeout(() => { announcer.textContent = ''; }, 1000);
        };
    }

    /**
     * Performance optimizations
     */
    setupPerformanceOptimizations() {
        // Lazy load images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Debounce scroll events
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) {
                window.cancelAnimationFrame(scrollTimeout);
            }
            
            scrollTimeout = window.requestAnimationFrame(() => {
                this.handleScroll();
            });
        }, { passive: true });

        // Optimize animations based on device
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduce-motion');
        }
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        try {
            const scrolled = window.pageYOffset;
            
            // Parallax effect on hero (disabled to prevent visibility issues)
            // const hero = document.querySelector('.hero-content');
            // if (hero && scrolled < window.innerHeight) {
            //     hero.style.transform = `translateY(${scrolled * 0.5}px)`;
            //     hero.style.opacity = 1 - (scrolled / window.innerHeight);
            // }

            // Show/hide header on scroll
            const header = document.querySelector('.header');
            if (header) {
                if (scrolled > 100) {
                    header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
                } else {
                    header.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
                }
            }
        } catch (error) {
            console.error('Scroll handler error:', error);
        }
    }

    /**
     * Interactive element enhancements
     */
    setupInteractiveElements() {
        // Add ripple effect to buttons
        document.querySelectorAll('.btn, .predictor-btn, .option').forEach(button => {
            button.addEventListener('click', (e) => {
                const ripple = document.createElement('span');
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.5);
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                    animation: ripple 0.6s ease-out;
                `;

                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            });
        });

        // Add ripple animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                from {
                    transform: scale(0);
                    opacity: 1;
                }
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        // Enhanced hover effects for cards
        document.querySelectorAll('.team-card, .circuit-card, .predictor-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });

        // Add tooltips
        this.setupTooltips();
    }

    /**
     * Setup tooltips
     */
    setupTooltips() {
        // Add tooltips to stat items
        document.querySelectorAll('.stat-item').forEach(item => {
            const label = item.querySelector('.stat-label');
            if (label) {
                item.setAttribute('data-tooltip', `Click to view ${label.textContent}`);
            }
        });

        // Add tooltips to badges
        document.querySelectorAll('.predictor-badge').forEach(badge => {
            if (badge.textContent.includes('Trained')) {
                badge.setAttribute('data-tooltip', 'Model is ready for predictions');
            } else if (badge.textContent.includes('Not Trained')) {
                badge.setAttribute('data-tooltip', 'Train the model to start predicting');
            }
        });
    }

    /**
     * Show notification
     */
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'rgba(0, 213, 99, 0.9)' : 
                         type === 'error' ? 'rgba(255, 68, 68, 0.9)' : 
                         'rgba(255, 215, 0, 0.9)'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Announce to screen readers
        if (window.announceToScreenReader) {
            window.announceToScreenReader(message);
        }

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        if (!document.querySelector('style[data-notifications]')) {
            style.setAttribute('data-notifications', 'true');
            document.head.appendChild(style);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ProfessionalIntegration();
    });
} else {
    new ProfessionalIntegration();
}

// Export for use in other modules
export default ProfessionalIntegration;
