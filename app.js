(function(){
  window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  window.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
})();

/* ========================================
   THREE.JS — Ambient Particle Field
   ======================================== */

(function initThreeJS(){
  if(window.prefersReduced) return;

  const canvas = document.getElementById('bg3d');
  if(!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.z = 50;

  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:!window.isMobile});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const amber = new THREE.Color(0xf59e0b);
  const rust = new THREE.Color(0xd97706);
  const white = new THREE.Color(0xfaf6f0);

  const count = window.isMobile ? 150 : 400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  for(let i = 0; i < count; i++){
    const i3 = i*3;
    pos[i3]   = (Math.random()-0.5)*160;
    pos[i3+1] = (Math.random()-0.5)*100;
    pos[i3+2] = (Math.random()-0.5)*60 - 10;
    const c = Math.random()<0.5 ? amber : (Math.random()<0.7 ? rust : white);
    col[i3] = c.r; col[i3+1] = c.g; col[i3+2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size:0.15, transparent:true, opacity:0.35,
    sizeAttenuation:true, vertexColors:true,
    blending:THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  const wires = [];
  const configs = [
    {g:new THREE.IcosahedronGeometry(4,1), p:[20,8,-15], s:0.3},
    {g:new THREE.OctahedronGeometry(3,0), p:[-22,-5,-12], s:0.4},
    {g:new THREE.TorusGeometry(3,0.7,8,20), p:[15,-12,-18], s:0.25},
    {g:new THREE.TetrahedronGeometry(2.5,0), p:[-18,12,-20], s:0.35},
  ];

  configs.forEach(c=>{
    const m = new THREE.MeshBasicMaterial({
      color:amber, wireframe:true, transparent:true,
      opacity:0.04+Math.random()*0.04,
      blending:THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(c.g, m);
    mesh.position.set(...c.p);
    mesh.userData = {speed:c.s, base:[...c.p]};
    scene.add(mesh);
    wires.push(mesh);
  });

  const mouse = {x:0, y:0, tx:0, ty:0};
  document.addEventListener('mousemove', e=>{
    mouse.tx = (e.clientX/innerWidth)*2-1;
    mouse.ty = -(e.clientY/innerHeight)*2+1;
  });

  let hProgress = 0;
  let lastTime = performance.now();

  function animate(now){
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    mouse.x += (mouse.tx - mouse.x)*0.04;
    mouse.y += (mouse.ty - mouse.y)*0.04;

    const pArr = particles.geometry.attributes.position.array;
    for(let i=0;i<count;i++){
      const i3=i*3;
      pArr[i3]   += Math.sin(now*0.00015+i*0.3)*0.03;
      pArr[i3+1] += Math.cos(now*0.00012+i*0.4)*0.03;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y = now*0.00001 + hProgress*0.5;

    wires.forEach(w=>{
      w.rotation.x += w.userData.speed*dt*0.4;
      w.rotation.y += w.userData.speed*dt*0.6;
      const b = w.userData.base;
      w.position.y = b[1] + Math.sin(now*0.001*w.userData.speed)*2;
      w.position.x = b[0] + Math.cos(now*0.0007*w.userData.speed)*1.2;
    });

    camera.position.x = Math.sin(now*0.00006)*1.5 + mouse.x*3 + hProgress*20;
    camera.position.y = Math.cos(now*0.00004)*1 + mouse.y*2;
    camera.lookAt(hProgress*20, 0, 0);

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  let resizeTimer;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    }, 150);
  });

  // Pause on tab hide
  let paused = false;
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){
      paused = true;
    } else {
      paused = false;
      lastTime = performance.now();
      requestAnimationFrame(animate);
    }
  });

  window._setHProgress = function(p){ hProgress = p; };
})();

/* ========================================
   GSAP — HORIZONTAL SCROLL HIJACK
   ======================================== */

(function initHorizontalScroll(){
  if(typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const wrapper = document.getElementById('hWrapper');
  const track = document.getElementById('hTrack');
  const panels = gsap.utils.toArray('.panel');
  const dots = document.querySelectorAll('.dot');
  const label = document.getElementById('navLabel');
  const progressBar = document.getElementById('progressBar');
  const scrollHint = document.getElementById('scrollHint');

  if(!wrapper || !track || panels.length === 0) return;

  const panelCount = panels.length;
  let totalScroll = (panelCount - 1) * innerWidth;

  const tl = gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: wrapper,
      pin: true,
      scrub: 1,
      end: () => '+=' + ((panelCount - 1) * innerWidth),
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;

        if(progressBar){
          progressBar.style.width = (p*100)+'%';
          progressBar.setAttribute('aria-valuenow', Math.round(p*100));
        }

        const idx = Math.round(p * (panelCount-1));

        dots.forEach((d,i)=>{
          d.classList.toggle('active', i===idx);
          d.setAttribute('aria-selected', i===idx ? 'true' : 'false');
          d.setAttribute('tabindex', i===idx ? '0' : '-1');
        });

        if(label && panels[idx]){
          label.textContent = panels[idx].dataset.name || '';
        }

        if(scrollHint){
          if(p > 0.02) scrollHint.classList.add('hidden');
          else scrollHint.classList.remove('hidden');
        }

        if(window._setHProgress) window._setHProgress(p);
      }
    }
  });

  // Recalculate on resize
  window.addEventListener('resize', ()=>{
    totalScroll = (panelCount - 1) * innerWidth;
    ScrollTrigger.refresh();
  });

  // Dot click navigation — use native scrollTo
  function scrollToPanel(idx){
    const target = idx / (panelCount - 1);
    const scrollTarget = wrapper.offsetTop + target * ((panelCount - 1) * innerWidth);
    window.scrollTo({ top: scrollTarget, behavior: window.prefersReduced ? 'auto' : 'smooth' });
  }

  dots.forEach(d=>{
    d.addEventListener('click', ()=>{
      scrollToPanel(parseInt(d.dataset.idx));
    });
    d.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        scrollToPanel(parseInt(d.dataset.idx));
      }
      // Arrow key navigation between dots
      if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
        e.preventDefault();
        const next = Math.min(parseInt(d.dataset.idx)+1, panelCount-1);
        dots[next].focus();
        scrollToPanel(next);
      }
      if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
        e.preventDefault();
        const prev = Math.max(parseInt(d.dataset.idx)-1, 0);
        dots[prev].focus();
        scrollToPanel(prev);
      }
    });
  });

  // CTA button navigation
  document.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const idx = parseInt(btn.dataset.nav);
      if(!isNaN(idx)) scrollToPanel(idx);
    });
  });

  // Keyboard arrow navigation between panels
  let currentPanel = 0;
  document.addEventListener('keydown', (e)=>{
    if(e.target.closest('.dot') || e.target.tagName === 'INPUT') return;
    if(e.key === 'ArrowRight'){
      e.preventDefault();
      currentPanel = Math.min(currentPanel + 1, panelCount - 1);
      scrollToPanel(currentPanel);
    }
    if(e.key === 'ArrowLeft'){
      e.preventDefault();
      currentPanel = Math.max(currentPanel - 1, 0);
      scrollToPanel(currentPanel);
    }
  });

  // Update currentPanel on scroll
  ScrollTrigger.create({
    trigger: wrapper,
    start: 'top top',
    end: () => '+=' + ((panelCount - 1) * innerWidth),
    onUpdate: (self) => {
      currentPanel = Math.round(self.progress * (panelCount - 1));
    }
  });

  // GSAP entrance animations — skip hero (panel 0) to avoid double animation
  if(!window.prefersReduced){
    panels.forEach((panel, i) => {
      if(i === 0) return; // Skip hero

      const inner = panel.querySelector('.panel-inner');
      if(!inner) return;

      gsap.from(inner.children, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: panel,
          containerAnimation: tl,
          start: 'left 80%',
          toggleActions: 'play none none none'
        }
      });
    });

    // Hero entrance — only once, on load
    const heroName = document.getElementById('heroName');
    if(heroName){
      const lines = heroName.querySelectorAll('.line');
      lines.forEach((line, i)=>{
        gsap.from(line, {
          x: -80,
          opacity: 0,
          duration: 1,
          delay: 0.3 + i*0.15,
          ease: 'power3.out'
        });
      });
    }

    // Project cards stagger
    const cards = gsap.utils.toArray('.p-card');
    cards.forEach((card, i)=>{
      gsap.from(card, {
        x: 100,
        opacity: 0,
        rotateY: -15,
        duration: 0.8,
        delay: i*0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.panel-projects',
          containerAnimation: tl,
          start: 'left 70%',
        }
      });
    });

    // Tool cards stagger
    const toolCards = gsap.utils.toArray('.tool-icon-card');
    toolCards.forEach((card, i)=>{
      gsap.from(card, {
        scale: 0,
        opacity: 0,
        z: -40,
        duration: 0.4,
        delay: 0.1 + (i%15)*0.03,
        ease: 'back.out(1.8)',
        scrollTrigger: {
          trigger: '.panel-skills',
          containerAnimation: tl,
          start: 'left 70%',
        }
      });
    });

    // Contact cards
    const cCards = gsap.utils.toArray('.c-card');
    cCards.forEach((card, i)=>{
      gsap.from(card, {
        y: 40,
        opacity: 0,
        rotateX: -10,
        duration: 0.6,
        delay: i*0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.panel-contact',
          containerAnimation: tl,
          start: 'left 70%',
        }
      });
    });

    // Section numbers
    gsap.utils.toArray('.section-num').forEach(num=>{
      gsap.from(num, {
        scale: 0.5,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: num.closest('.panel'),
          containerAnimation: tl,
          start: 'left 75%',
        }
      });
    });
  }
})();

/* ========================================
   TYPEWRITER
   ======================================== */

(function initTypewriter(){
  const el = document.getElementById('typeText');
  const cursor = document.getElementById('typeCursor');
  if(!el) return;

  if(window.prefersReduced){
    el.textContent = 'Full-Stack Developer';
    if(cursor) cursor.style.display='none';
    return;
  }

  const phrases = [
    'Full-Stack Developer',
    'Cybersecurity Student',
    'MERN Stack Builder',
    '3D Graphics & WebGL',
    'Offensive Security'
  ];
  let pi=0, ci=0, del=false, paused=false;
  let timers = [];
  let cancelled = false;

  function clearTimers(){
    timers.forEach(t => clearTimeout(t));
    timers = [];
  }

  function schedule(fn, ms){
    if(cancelled) return;
    timers.push(setTimeout(fn, ms));
  }

  setTimeout(()=>{
    function type(){
      if(cancelled) return;
      const cur = phrases[pi];
      if(!del && !paused){
        el.textContent = cur.substring(0, ci+1);
        ci++;
        if(ci===cur.length){
          paused=true;
          schedule(()=>{paused=false;del=true;type()}, 2000);
          return;
        }
        schedule(type, 55+Math.random()*70);
      } else if(del){
        el.textContent = cur.substring(0, ci);
        ci--;
        if(ci===0){
          del=false;
          pi=(pi+1)%phrases.length;
          schedule(type, 350);
          return;
        }
        schedule(type, 25+Math.random()*35);
      }
    }
    type();
  }, 800);

  // Cleanup on page unload
  window.addEventListener('beforeunload', ()=>{
    cancelled = true;
    clearTimers();
  });
})();

/* ========================================
   3D CARD TILT — uses data-depth
   ======================================== */

(function initCardTilt(){
  if(window.isMobile || window.prefersReduced) return;

  document.querySelectorAll('.p-card').forEach(card=>{
    const depth = parseFloat(card.dataset.depth) || 1;

    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width - 0.5;
      const y = (e.clientY - r.top)/r.height - 0.5;
      const z = 15 + depth * 5;
      card.style.transform =
        `perspective(800px) translateZ(${z}px) rotateY(${x*15}deg) rotateX(${-y*15}deg)`;
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.transform = '';
    });
  });
})();

/* ========================================
   3D TOOL CARDS — TILT ON HOVER
   ======================================== */

(function initToolCards(){
  const container = document.getElementById('toolGrid');
  if(!container || window.isMobile || window.prefersReduced) return;

  container.addEventListener('mousemove', e=>{
    const r = container.getBoundingClientRect();
    const x = (e.clientX - r.left)/r.width - 0.5;
    const y = (e.clientY - r.top)/r.height - 0.5;

    container.querySelectorAll('.tool-icon-card').forEach((card, i)=>{
      const row = Math.floor(i / 5);
      const depth = (row+1)*0.3;
      card.style.transform =
        `translateX(${x*depth*8}px) translateY(${y*depth*5}px) translateZ(0)`;
    });
  });

  container.addEventListener('mouseleave', ()=>{
    container.querySelectorAll('.tool-icon-card').forEach(card=>{
      card.style.transform = '';
    });
  });

  container.querySelectorAll('.tool-icon-card').forEach(card=>{
    card.addEventListener('mouseenter', function(){
      const d = parseFloat(this.dataset.depth)||1;
      this.style.transform =
        `translateZ(${d*8+20}px) scale(1.08) rotateY(3deg)`;
    });
    card.addEventListener('mouseleave', function(){
      this.style.transform = '';
    });
  });
})();

/* ========================================
   3D FLOATING TERMINAL
   ======================================== */

(function initFloatTerminal(){
  if(window.isMobile || window.prefersReduced) return;

  document.querySelectorAll('.float3d').forEach(el=>{
    el.addEventListener('mousemove', e=>{
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width - 0.5;
      const y = (e.clientY - r.top)/r.height - 0.5;
      el.style.transform =
        `perspective(1000px) rotateX(${-y*5}deg) rotateY(${x*5}deg)`;
    });
    el.addEventListener('mouseleave', ()=>{
      el.style.transform = '';
    });
  });
})();

/* ========================================
   MAGNETIC BUTTONS
   ======================================== */

(function initMagnetic(){
  if(window.isMobile || window.prefersReduced) return;

  document.querySelectorAll('.magnetic-btn').forEach(btn=>{
    btn.addEventListener('mousemove', e=>{
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width - 0.5;
      const y = (e.clientY - r.top)/r.height - 0.5;
      btn.style.setProperty('--mag-rx', (-y*10)+'deg');
      btn.style.setProperty('--mag-ry', (x*10)+'deg');
    });
    btn.addEventListener('mouseleave', ()=>{
      btn.style.setProperty('--mag-rx', '0deg');
      btn.style.setProperty('--mag-ry', '0deg');
    });
  });
})();

/* ========================================
   CONTACT CARD TILT
   ======================================== */

(function initContactTilt(){
  if(window.isMobile || window.prefersReduced) return;

  document.querySelectorAll('.c-card').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width - 0.5;
      const y = (e.clientY - r.top)/r.height - 0.5;
      card.style.transform =
        `perspective(800px) translateZ(30px) rotateX(${-y*8}deg) rotateY(${x*8}deg)`;
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.transform = '';
    });
  });
})();