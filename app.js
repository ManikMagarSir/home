/* ========================================
   PERFORMANCE OPTIMIZATION
======================================== */
(function() {
    window.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
})();

/* ========================================
   THREE.JS - Connected Dots & Floating Icons
   Static background with independent animations
======================================== */

(function initThreeJSScene() {
    const canvas = document.querySelector('#bg');
    if (!canvas) return;
    
    // Check WebGL support
    const canvasEl = document.createElement('canvas');
    const gl = canvasEl.getContext('webgl') || canvasEl.getContext('experimental-webgl');
    if (!gl) {
        canvas.style.display = 'none';
        return;
    }
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: !window.isMobile,
        powerPreference: 'high-performance'
    });
    
    const pixelRatio = window.isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    
    // ==========================================
    // CONNECTED DOTS (Constellation Effect)
    // ==========================================
    
    const dots = [];
    const dotCount = window.isMobile ? 40 : 60;
    const connectionDistance = 18;
    
    // Create dots with different colors
    const cyanColor = new THREE.Color(0x00d4ff);
    const purpleColor = new THREE.Color(0x7c3aed);
    
    for (let i = 0; i < dotCount; i++) {
        const geometry = new THREE.CircleGeometry(0.2, 16);
        const material = new THREE.MeshBasicMaterial({
            color: i % 3 === 0 ? cyanColor : (i % 3 === 1 ? purpleColor : 0xffffff),
            transparent: true,
            opacity: 0.7 + Math.random() * 0.3
        });
        
        const dot = new THREE.Mesh(geometry, material);
        dot.position.set(
            (Math.random() - 0.5) * 90,
            (Math.random() - 0.5) * 70,
            (Math.random() - 0.5) * 40 - 5
        );
        
        dot.userData = {
            // Movement parameters
            speedX: (Math.random() - 0.5) * 0.015,
            speedY: (Math.random() - 0.5) * 0.015,
            speedZ: (Math.random() - 0.5) * 0.005,
            // Rotation
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            // Boundary detection
            bounds: {
                x: 45,
                y: 35,
                z: 15
            }
        };
        
        dots.push(dot);
        scene.add(dot);
    }
    
    // Connection lines
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.12
    });
    
    const lines = [];
    
    function updateConnections() {
        // Clear old lines
        lines.forEach(line => {
            scene.remove(line);
            line.geometry.dispose();
        });
        lines.length = 0;
        
        // Create new connections
        for (let i = 0; i < dots.length; i++) {
            for (let j = i + 1; j < dots.length; j++) {
                const distance = dots[i].position.distanceTo(dots[j].position);
                
                if (distance < connectionDistance && lines.length < 80) {
                    const opacity = 0.2 * (1 - distance / connectionDistance);
                    const material = new THREE.LineBasicMaterial({
                        color: 0x00d4ff,
                        transparent: true,
                        opacity: opacity
                    });
                    
                    const geometry = new THREE.BufferGeometry().setFromPoints([
                        dots[i].position,
                        dots[j].position
                    ]);
                    
                    const line = new THREE.Line(geometry, material);
                    lines.push(line);
                    scene.add(line);
                }
            }
        }
    }
    
    // ==========================================
    // FLOATING TECH ICONS
    // ==========================================
    
    const icons = [];
    const techIcons = [
        { name: 'HTML', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' },
        { name: 'CSS', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg' },
        { name: 'JavaScript', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
        { name: 'React', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
        { name: 'NodeJS', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
        { name: 'PHP', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg' },
        { name: 'MySQL', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
        { name: 'ThreeJS', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/threejs/threejs-original.svg' },
        { name: 'Git', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg' },
        { name: 'TypeScript', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' }
    ];
    
    const textureLoader = new THREE.TextureLoader();
    
    techIcons.forEach((icon, index) => {
        const size = 2.5 + Math.random() * 1;
        const geometry = new THREE.PlaneGeometry(size, size);
        
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        
        // Load texture
        textureLoader.load(
            icon.url,
            (texture) => {
                material.map = texture;
                material.opacity = 0.8;
                material.needsUpdate = true;
            },
            undefined,
            () => {
                // Fallback: create colored placeholder square
                material.color = index % 2 === 0 ? cyanColor : purpleColor;
                material.opacity = 0.7;
            }
        );
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Distribute icons in 3D space
        const angle = (index / techIcons.length) * Math.PI * 2;
        const radius = 15 + Math.random() * 20;
        const height = (Math.random() - 0.5) * 25;
        
        mesh.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius - 10
        );
        
        mesh.userData = {
            // Orbital motion parameters
            orbitRadius: radius,
            orbitAngle: angle,
            orbitSpeed: 0.08 + Math.random() * 0.12,
            orbitHeight: height,
            heightOscillation: Math.random() * 0.5,
            // Rotation
            rotationX: (Math.random() - 0.5) * 0.01,
            rotationY: (Math.random() - 0.5) * 0.01,
            rotationZ: (Math.random() - 0.5) * 0.005,
            // Individual oscillation
            phaseOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.5 + Math.random() * 0.5
        };
        
        icons.push(mesh);
        scene.add(mesh);
    });
    
    // ==========================================
    // AMBIENT PARTICLES (Additional depth)
    // ==========================================
    
    const particleCount = window.isMobile ? 150 : 300;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = (Math.random() - 0.5) * 100;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 80;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * 50 - 15;
        particleSizes[i] = Math.random() * 1.5 + 0.3;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x00d4ff,
        size: 0.15,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // ==========================================
    // ANIMATION LOOP (Independent, no user interaction)
    // ==========================================
    
    const shouldAnimate = !window.prefersReducedMotion;
    let connectionUpdateCounter = 0;
    let time = 0;
    
    function animate() {
        if (!shouldAnimate) return;
        
        requestAnimationFrame(animate);
        time += 0.016; // ~60fps
        
        // Animate dots - each with independent movement
        dots.forEach((dot, i) => {
            const data = dot.userData;
            
            // Continuous movement
            dot.position.x += data.speedX;
            dot.position.y += data.speedY;
            dot.position.z += data.speedZ;
            
            // Sine wave oscillation
            dot.position.x += Math.sin(time * 0.5 + i * 0.3) * 0.01;
            dot.position.y += Math.cos(time * 0.4 + i * 0.5) * 0.01;
            
            // Boundary wrapping
            if (dot.position.x > data.bounds.x) dot.position.x = -data.bounds.x;
            if (dot.position.x < -data.bounds.x) dot.position.x = data.bounds.x;
            if (dot.position.y > data.bounds.y) dot.position.y = -data.bounds.y;
            if (dot.position.y < -data.bounds.y) dot.position.y = data.bounds.y;
            if (dot.position.z > data.bounds.z) dot.position.z = -data.bounds.z;
            if (dot.position.z < -data.bounds.z) dot.position.z = data.bounds.z;
            
            // Subtle rotation
            dot.rotation.z += data.rotationSpeed;
        });
        
        // Update connection lines
        connectionUpdateCounter++;
        if (connectionUpdateCounter >= 5) {
            updateConnections();
            connectionUpdateCounter = 0;
        }
        
        // Animate tech icons - orbital motion
        icons.forEach((icon, i) => {
            const data = icon.userData;
            
            // Orbital rotation around center
            data.orbitAngle += data.orbitSpeed * 0.016;
            icon.position.x = Math.cos(data.orbitAngle) * data.orbitRadius;
            icon.position.z = Math.sin(data.orbitAngle) * data.orbitRadius - 10;
            
            // Height oscillation
            icon.position.y = data.orbitHeight + 
                Math.sin(time * data.floatSpeed + data.phaseOffset) * data.heightOscillation;
            
            // Rotation
            icon.rotation.x += data.rotationX;
            icon.rotation.y += data.rotationY;
            icon.rotation.z += data.rotationZ;
            
            // Billboard - face camera
            icon.lookAt(camera.position);
        });
        
        // Animate ambient particles
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] += Math.sin(time * 0.2 + i) * 0.005;
            positions[i3 + 1] += Math.cos(time * 0.15 + i) * 0.005;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y = time * 0.01;
        
        // Subtle camera sway (not tied to mouse)
        camera.position.x = Math.sin(time * 0.1) * 2;
        camera.position.y = Math.cos(time * 0.08) * 1.5;
        camera.lookAt(scene.position);
        
        renderer.render(scene, camera);
    }
    
    // Initial connection setup
    updateConnections();
    
    if (shouldAnimate) {
        animate();
    }
    
    // ==========================================
    // RESIZE HANDLER
    // ==========================================
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
            updateConnections();
        }, 100);
    });
    
    window.threeJSScene = { scene, camera, renderer, dots, icons, lines, particles };
})();


/* ========================================
   ANIME.JS - Page Load Sequence
======================================== */

(function initPageLoadAnimation() {
    if (typeof anime === 'undefined' || window.prefersReducedMotion) {
        document.querySelectorAll('.reveal').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        return;
    }
    
    const masterTimeline = anime.timeline({
        easing: 'easeOutExpo'
    });
    
    masterTimeline
    .add({
        targets: '.hero-greeting',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 600,
        easing: 'easeOutQuart'
    })
    .add({
        targets: '.hero-name',
        opacity: [0, 1],
        translateY: [60, 0],
        scale: [0.9, 1],
        duration: 1000,
        easing: 'easeOutExpo'
    }, '-=300')
    .add({
        targets: '.hero-role',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 700,
        easing: 'easeOutQuart'
    }, '-=600')
    .add({
        targets: '.hero-intro',
        opacity: [0, 1],
        translateY: [25, 0],
        duration: 700,
        easing: 'easeOutQuart'
    }, '-=400')
    .add({
        targets: '.hero-cta-group .cta',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 600,
        delay: anime.stagger(100),
        easing: 'easeOutQuart'
    }, '-=300')
    .add({
        targets: '.social-links',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutQuart'
    }, '-=200')
    .add({
        targets: '.scroll-indicator',
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutQuart'
    }, '-=100');
    
    anime({
        targets: '.navbar',
        translateY: [-100, 0],
        opacity: [0, 1],
        duration: 800,
        delay: 500,
        easing: 'easeOutQuart'
    });
})();


/* ========================================
   SCROLL REVEAL SYSTEM - CSS-only fallback
======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Elements are visible by default - CSS handles animation
    // This ensures content shows even if JS fails
    const revealElements = document.querySelectorAll('.reveal');
    
    // Just add visible class to all elements immediately
    // The animation will play when they scroll into view
    revealElements.forEach(el => {
        el.classList.add('visible');
    });
});


/* ========================================
   SKILL BAR ANIMATION
======================================== */

(function initSkillBars() {
    const skillBars = document.querySelectorAll('.bar div');
    if (skillBars.length === 0) return;
    
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const level = entry.target.dataset.level;
                
                if (typeof anime !== 'undefined' && !window.prefersReducedMotion) {
                    anime({
                        targets: entry.target,
                        width: level + '%',
                        duration: 1500,
                        easing: 'easeOutQuart'
                    });
                } else {
                    entry.target.style.width = level + '%';
                }
                
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    skillBars.forEach(bar => {
        bar.style.width = '0';
        skillObserver.observe(bar);
    });
})();


/* ========================================
   STATS COUNTER ANIMATION
======================================== */

(function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length === 0) return;
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const countTo = parseInt(target.dataset.count);
                
                if (typeof anime !== 'undefined' && !window.prefersReducedMotion) {
                    const obj = { value: 0 };
                    anime({
                        targets: obj,
                        value: countTo,
                        round: 1,
                        duration: 2000,
                        easing: 'easeOutQuart',
                        update: function() {
                            target.textContent = obj.value;
                        }
                    });
                } else {
                    target.textContent = countTo;
                }
                
                statsObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(num => statsObserver.observe(num));
})();


/* ========================================
   NAVIGATION
======================================== */

(function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScroll = window.pageYOffset;
                
                if (currentScroll > 100) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
        });
        
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navToggle.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            }
        });
    }
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: window.prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    });
})();





/* ========================================
   CONTACT POPUP FUNCTIONS
======================================== */
var popupOpened = false;

function openPopup() {
    popupOpened = true;
    document.getElementById('contact-form').reset();
    document.getElementById('contact-popup').classList.add('active');
}

function closePopup() {
    popupOpened = false;
    document.getElementById('contact-popup').classList.remove('active');
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && popupOpened) closePopup();
});

// Handle form submit to open popup
document.getElementById('contact-form').addEventListener('submit', function(e) {
    if (!popupOpened) {
        e.preventDefault();
        openPopup();
    }
});

/* ========================================
   CURRENT YEAR
======================================== */

(function initCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
})();


/* ========================================
   LAZY LOADING
======================================== */

(function initLazyLoad() {
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
})();
