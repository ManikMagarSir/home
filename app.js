(function() {
  window.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
})();

/* ========================================
   THREE.JS — Warm Constellation
   ======================================== */

(function initThreeJSScene() {
  const canvas = document.querySelector('#bg');
  if (!canvas) return;

  const canvasEl = document.createElement('canvas');
  const gl = canvasEl.getContext('webgl') || canvasEl.getContext('experimental-webgl');
  if (!gl) {
    canvas.style.display = 'none';
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !window.isMobile,
    powerPreference: 'high-performance'
  });

  const pixelRatio = window.isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  // Warm colors
  const amberColor = new THREE.Color(0xf59e0b);
  const rustColor = new THREE.Color(0xd97706);
  const warmWhite = new THREE.Color(0xfaf6f0);

  // Constellation dots
  const dots = [];
  const dotCount = window.isMobile ? 35 : 50;
  const connectionDistance = 20;

  for (let i = 0; i < dotCount; i++) {
    const geometry = new THREE.CircleGeometry(0.15, 12);
    const material = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? amberColor : (i % 3 === 1 ? rustColor : warmWhite),
      transparent: true,
      opacity: 0.5 + Math.random() * 0.3
    });

    const dot = new THREE.Mesh(geometry, material);
    dot.position.set(
      (Math.random() - 0.5) * 90,
      (Math.random() - 0.5) * 70,
      (Math.random() - 0.5) * 40 - 5
    );

    dot.userData = {
      speedX: (Math.random() - 0.5) * 0.012,
      speedY: (Math.random() - 0.5) * 0.012,
      speedZ: (Math.random() - 0.5) * 0.004,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      bounds: { x: 45, y: 35, z: 15 }
    };

    dots.push(dot);
    scene.add(dot);
  }

  // Connection lines
  const lines = [];

  function updateConnections() {
    lines.forEach(line => {
      scene.remove(line);
      line.geometry.dispose();
    });
    lines.length = 0;

    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const distance = dots[i].position.distanceTo(dots[j].position);
        if (distance < connectionDistance && lines.length < 60) {
          const opacity = 0.15 * (1 - distance / connectionDistance);
          const material = new THREE.LineBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity
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

  // Ambient particles
  const particleCount = window.isMobile ? 100 : 200;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    particlePositions[i3] = (Math.random() - 0.5) * 100;
    particlePositions[i3 + 1] = (Math.random() - 0.5) * 80;
    particlePositions[i3 + 2] = (Math.random() - 0.5) * 50 - 15;
    particleSizes[i] = Math.random() * 1.2 + 0.2;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xf59e0b,
    size: 0.12,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const shouldAnimate = !window.prefersReducedMotion;
  let connectionUpdateCounter = 0;
  let time = 0;

  function animate() {
    if (!shouldAnimate) return;
    requestAnimationFrame(animate);
    time += 0.016;

    dots.forEach((dot, i) => {
      const data = dot.userData;
      dot.position.x += data.speedX;
      dot.position.y += data.speedY;
      dot.position.z += data.speedZ;

      dot.position.x += Math.sin(time * 0.5 + i * 0.3) * 0.008;
      dot.position.y += Math.cos(time * 0.4 + i * 0.5) * 0.008;

      if (dot.position.x > data.bounds.x) dot.position.x = -data.bounds.x;
      if (dot.position.x < -data.bounds.x) dot.position.x = data.bounds.x;
      if (dot.position.y > data.bounds.y) dot.position.y = -data.bounds.y;
      if (dot.position.y < -data.bounds.y) dot.position.y = data.bounds.y;
      if (dot.position.z > data.bounds.z) dot.position.z = -data.bounds.z;
      if (dot.position.z < -data.bounds.z) dot.position.z = data.bounds.z;

      dot.rotation.z += data.rotationSpeed;
    });

    connectionUpdateCounter++;
    if (connectionUpdateCounter >= 6) {
      updateConnections();
      connectionUpdateCounter = 0;
    }

    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] += Math.sin(time * 0.2 + i) * 0.004;
      positions[i3 + 1] += Math.cos(time * 0.15 + i) * 0.004;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y = time * 0.008;

    camera.position.x = Math.sin(time * 0.08) * 1.5;
    camera.position.y = Math.cos(time * 0.06) * 1;
    camera.lookAt(scene.position);

    // Scroll reactivity
    if (window._scrollFactor) {
      const sf = window._scrollFactor;
      particles.material.opacity = 0.2 + sf * 0.3;
      dots.forEach((dot, i) => {
        const base = dot.userData;
        dot.position.x += Math.sin(time * 0.3 + i) * sf * 0.005;
        dot.position.y += Math.cos(time * 0.25 + i) * sf * 0.005;
      });
    }

    renderer.render(scene, camera);
  }

  // Track scroll for 3D reactivity
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    window._scrollFactor = Math.min(docHeight > 0 ? scrollTop / docHeight : 0, 1);
  }, { passive: true });

  updateConnections();
  if (shouldAnimate) animate();

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
})();

/* ========================================
   TERMINAL TYPEWRITER
   ======================================== */

(function initTypewriter() {
  const el = document.getElementById('typewriter-text');
  const cursor = document.getElementById('typewriter-cursor');
  if (!el) return;

  const phrases = [
    'Full-Stack Developer',
    'Cybersecurity Student',
    'MERN Stack Builder',
    '3D Graphics & WebGL',
    'Offensive Security'
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isPaused = false;

  // Wait for name animation to finish before starting typewriter
  const delay = window.prefersReducedMotion ? 0 : 1800;

  setTimeout(() => {
    function type() {
      if (window.prefersReducedMotion) {
        el.textContent = phrases[0];
        if (cursor) cursor.classList.add('done');
        return;
      }

      const current = phrases[phraseIndex];

      if (!isDeleting && !isPaused) {
        el.textContent = current.substring(0, charIndex + 1);
        charIndex++;
        if (charIndex === current.length) {
          isPaused = true;
          setTimeout(() => {
            isPaused = false;
            isDeleting = true;
            type();
          }, 2000);
          return;
        }
        setTimeout(type, 60 + Math.random() * 80);
      } else if (isDeleting) {
        el.textContent = current.substring(0, charIndex);
        charIndex--;
        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(type, 400);
          return;
        }
        setTimeout(type, 30 + Math.random() * 40);
      }
    }

    type();
  }, delay);
})();

/* ========================================
   NAME LETTER STAGGER
   ======================================== */

(function initNameReveal() {
  const nameEl = document.querySelector('.hero-name');
  if (!nameEl || window.prefersReducedMotion) return;

  const text = nameEl.textContent.trim();
  nameEl.textContent = '';

  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'letter';
    if (char === ' ') span.classList.add('space');
    if (char === 'M' && text.startsWith('Manik')) {
      // First 'M' of Manik
    }
    // Check if this is the accented "Magar" part
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.animationDelay = (i * 0.06) + 's';
    nameEl.appendChild(span);
  });

  // Now find and mark the "Magar" letters for accent
  const letters = nameEl.querySelectorAll('.letter');
  const fullText = text;
  const magarStart = fullText.indexOf('Magar');
  if (magarStart >= 0) {
    for (let i = magarStart; i < magarStart + 5; i++) {
      if (letters[i]) letters[i].classList.add('accent');
    }
  }
})();

/* ========================================
   SCROLL PROGRESS BAR
   ======================================== */

(function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
    bar.setAttribute('aria-valuenow', Math.round(progress));
  }, { passive: true });
})();

/* ========================================
   SCROLL REVEAL
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  const revealElements = document.querySelectorAll('.reveal');
  const revealItems = document.querySelectorAll('.reveal-item');

  if (window.prefersReducedMotion) {
    revealElements.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    revealItems.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach(el => observer.observe(el));
  revealItems.forEach(el => observer.observe(el));
});

/* ========================================
   NAVIGATION
   ======================================== */

(function initNavigation() {
  const navbar = document.querySelector('.navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-menu a');
  const sections = document.querySelectorAll('section[id]');

  // Scroll shadow
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 80);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Active section
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 150;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  }, { passive: true });

  // Mobile toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !expanded);
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

  // Smooth scroll
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
   PROJECT CARD 3D TILT
   ======================================== */

(function initCardTilt() {
  if (window.isMobile || window.prefersReducedMotion) return;

  const cards = document.querySelectorAll('.project-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.setProperty('--rotate-x', rotateX + 'deg');
      card.style.setProperty('--rotate-y', rotateY + 'deg');
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
    });
  });
})();

/* ========================================
   CARD GLOW (follow mouse)
   ======================================== */

(function initCardGlow() {
  if (window.isMobile) return;

  const cards = document.querySelectorAll('.project-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', x + '%');
      card.style.setProperty('--mouse-y', y + '%');
    });
  });
})();

/* ========================================
   CURRENT YEAR
   ======================================== */

(function initCurrentYear() {
  const el = document.getElementById('current-year');
  if (el) el.textContent = new Date().getFullYear();
})();
