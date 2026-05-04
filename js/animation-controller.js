/**
 * Animation Controller Module
 * Orchestrates all animations including scroll-based, timeline, and interactive animations
 */

export class AnimationController {
    constructor(options = {}) {
        this.gsap = window.gsap;
        this.scrollTrigger = window.ScrollTrigger;
        this.lenis = null;
        
        this.timelines = new Map();
        this.scrollAnimations = [];
        this.isInitialized = false;

        if (this.gsap && this.scrollTrigger) {
            this.gsap.registerPlugin(this.scrollTrigger);
        }
    }

    init() {
        if (this.isInitialized) return;

        // Initialize Lenis smooth scroll if available
        if (window.Lenis) {
            this.initSmoothScroll();
        }

        this.isInitialized = true;
    }

    initSmoothScroll() {
        this.lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false,
        });
        
        // Expose globally for world-class-animations.js
        window.lenis = this.lenis;

        // Sync with GSAP ScrollTrigger
        this.lenis.on('scroll', this.scrollTrigger.update);

        this.gsap.ticker.add((time) => {
            this.lenis.raf(time * 1000);
        });

        this.gsap.ticker.lagSmoothing(0);
    }

    registerScrollAnimation(trigger, animation) {
        if (!this.gsap || !this.scrollTrigger) {
            console.warn('GSAP or ScrollTrigger not available');
            return null;
        }

        const scrollTrigger = this.scrollTrigger.create({
            trigger: trigger,
            start: animation.start || 'top 80%',
            end: animation.end || 'bottom 20%',
            scrub: animation.scrub || false,
            markers: animation.markers || false,
            once: animation.once !== false,
            onEnter: animation.onEnter,
            onLeave: animation.onLeave,
            onEnterBack: animation.onEnterBack,
            onLeaveBack: animation.onLeaveBack
        });

        // Create the animation
        const tween = this.gsap.fromTo(
            animation.target || trigger,
            animation.from || {},
            {
                ...animation.to,
                scrollTrigger: scrollTrigger
            }
        );

        this.scrollAnimations.push({ trigger, scrollTrigger, tween });
        return { scrollTrigger, tween };
    }

    registerTimeline(name, timelineConfig) {
        if (!this.gsap) {
            console.warn('GSAP not available');
            return null;
        }

        const timeline = this.gsap.timeline({
            paused: timelineConfig.paused !== false,
            ...timelineConfig
        });

        this.timelines.set(name, timeline);
        return timeline;
    }

    playTimeline(name, options = {}) {
        const timeline = this.timelines.get(name);
        if (timeline) {
            timeline.play();
            return timeline;
        }
        console.warn(`Timeline "${name}" not found`);
        return null;
    }

    pauseAll() {
        this.timelines.forEach(timeline => timeline.pause());
    }

    resumeAll() {
        this.timelines.forEach(timeline => timeline.resume());
    }

    dispose() {
        // Kill all scroll animations
        this.scrollAnimations.forEach(({ scrollTrigger, tween }) => {
            if (scrollTrigger) scrollTrigger.kill();
            if (tween) tween.kill();
        });
        this.scrollAnimations = [];

        // Kill all timelines
        this.timelines.forEach(timeline => timeline.kill());
        this.timelines.clear();

        // Destroy Lenis
        if (this.lenis) {
            this.lenis.destroy();
            this.lenis = null;
        }

        this.isInitialized = false;
    }
}

export class ScrollAnimationManager {
    constructor(animationController) {
        this.controller = animationController;
        this.gsap = window.gsap;
        this.scrollTrigger = window.ScrollTrigger;
    }

    createScrollTrigger(element, config) {
        return this.controller.registerScrollAnimation(element, config);
    }

    createParallax(element, speed = 0.5) {
        if (!this.gsap || !this.scrollTrigger) return;

        this.gsap.to(element, {
            yPercent: -50 * speed,
            ease: 'none',
            scrollTrigger: {
                trigger: element,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    }

    createReveal(element, direction = 'up') {
        if (!this.gsap || !this.scrollTrigger) return;

        const from = {
            opacity: 0
        };

        switch (direction) {
            case 'up':
                from.y = 60;
                break;
            case 'down':
                from.y = -60;
                break;
            case 'left':
                from.x = -60;
                break;
            case 'right':
                from.x = 60;
                break;
        }

        this.gsap.from(element, {
            ...from,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: element,
                start: 'top 85%',
                once: true
            }
        });
    }

    updateScrollPosition() {
        if (this.scrollTrigger) {
            this.scrollTrigger.refresh();
        }
    }
}

export class TimelineManager {
    constructor(animationController) {
        this.controller = animationController;
        this.gsap = window.gsap;
    }

    createTimeline(name, config = {}) {
        return this.controller.registerTimeline(name, config);
    }

    addToTimeline(timeline, animation, position) {
        if (!timeline) return;

        timeline.to(
            animation.target,
            {
                ...animation.to,
                duration: animation.duration || 0.5,
                ease: animation.ease || 'power2.out'
            },
            position
        );

        return timeline;
    }

    playTimeline(name, options = {}) {
        return this.controller.playTimeline(name, options);
    }

    reverseTimeline(name) {
        const timeline = this.controller.timelines.get(name);
        if (timeline) {
            timeline.reverse();
        }
    }
}

// Animation Presets
export const AnimationPresets = {
    fadeInUp: {
        from: { y: 60, opacity: 0 },
        to: { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    },
    fadeInScale: {
        from: { scale: 0.8, opacity: 0 },
        to: { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
    },
    slideInLeft: {
        from: { x: -100, opacity: 0 },
        to: { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }
    },
    slideInRight: {
        from: { x: 100, opacity: 0 },
        to: { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }
    },
    staggerChildren: {
        stagger: 0.1,
        duration: 0.5,
        ease: 'power2.out'
    },
    counterUp: {
        duration: 2,
        ease: 'power2.inOut'
    },
    scaleIn: {
        from: { scale: 0, opacity: 0 },
        to: { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
    },
    rotateIn: {
        from: { rotation: -180, opacity: 0 },
        to: { rotation: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    }
};

// Helper function to apply preset animations
export function applyPreset(element, presetName, options = {}) {
    const preset = AnimationPresets[presetName];
    if (!preset || !window.gsap) return;

    const config = {
        ...preset.to,
        ...options
    };

    if (preset.from) {
        window.gsap.fromTo(element, preset.from, config);
    } else {
        window.gsap.to(element, config);
    }
}
