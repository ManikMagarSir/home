/* ============================================================
   MANIK MAGAR — 3D SPATIAL GALLERY
   WASD walk · Mouse look · E interact · 7 alcove exhibits
   ============================================================ */
(function(){
  'use strict';

  /* ====== DOM REFS ====== */
  const html = document.documentElement;
  const cvs = document.getElementById('c');
  const hintText = document.getElementById('hint-text');
  const exhibitHint = document.getElementById('exhibit-hint');
  const crosshair = document.getElementById('crosshair');
  const loading = document.getElementById('loading');
  const pauseOverlay = document.getElementById('pause');
  const exhibitOverlay = document.getElementById('overlay');
  const ovlContent = document.getElementById('ovl-content');
  const endContact = document.getElementById('end-contact');
  const mobileCtrl = document.getElementById('mobile-ctrl');
  const mcInteract = document.getElementById('mc-interact');
  const warpEl = document.getElementById('warp');

  /* ====== THEME ====== */
  function cv(n){ return getComputedStyle(html).getPropertyValue(n).trim(); }
  function tc(p){ return parseInt(cv(p).replace('#',''),16); }

  /* ====== STATE ====== */
  let isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) html.classList.add('touch');
  let mode = 'loading'; /* loading | play | overlay | paused */
  let currentExhibit = -1;
  let nearExhibit = -1;
  let muted = false;
  let warpKick = 0;
  let warpToken = 0;

  const HAND_ICON = '<svg class="hint-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>';

  /* ====== THREE.JS SETUP ====== */
  const renderer = new THREE.WebGLRenderer({ canvas:cvs, antialias:true, alpha:false, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch?1.5:2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const accent = tc('--accent'), accent2 = tc('--accent2');
  scene.background = new THREE.Color(tc('--bg'));
  scene.fog = new THREE.Fog(tc('--bg'), 5, 45);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, .3, 60);
  camera.position.set(0, 1.65, 20);
  camera.rotation.order = 'YXZ';

  /* ====== LIGHTING ====== */
  const amb = new THREE.AmbientLight(0x334466, .35); scene.add(amb);
  const hemi = new THREE.HemisphereLight(0x8899cc, 0x112233, .4); scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, .5);
  keyLight.position.set(0, 8, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048,2048);
  keyLight.shadow.camera.near = .5;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -15;
  keyLight.shadow.camera.right = 15;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -2;
  keyLight.shadow.bias = -.0005;
  scene.add(keyLight);

  /* entrance + exit glow to guide the walk through the hall */
  const entranceLight = new THREE.PointLight(accent, 1.1, 12, 2);
  entranceLight.position.set(0, 2.4, 16.4);
  scene.add(entranceLight);
  const exitLight = new THREE.PointLight(accent2, 1.3, 14, 2);
  exitLight.position.set(0, 2.6, -23.6);
  scene.add(exitLight);

  /* ====== MATERIALS ====== */
  const floorMat = new THREE.MeshStandardMaterial({ color:0x111822, roughness:.55, metalness:.15 });
  const wallMat = new THREE.MeshStandardMaterial({ color:0x1a1f2e, roughness:.6, metalness:.1 });
  const wallDarkMat = new THREE.MeshStandardMaterial({ color:0x0f131d, roughness:.7, metalness:.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color:accent, roughness:.3, metalness:.4, emissive:accent, emissiveIntensity:.6 });
  const frameMat = new THREE.MeshStandardMaterial({ color:accent2, roughness:.25, metalness:.5, emissive:accent2, emissiveIntensity:.4 });
  const pedestalMat = new THREE.MeshStandardMaterial({ color:0x1a1f2e, roughness:.4, metalness:.3 });
  const stripMat = new THREE.MeshStandardMaterial({ color:accent, roughness:.35, metalness:.3, emissive:accent, emissiveIntensity:.5 });

  /* ====== BUILD GALLERY HALL ====== */
  const HALL_LENGTH = 50;
  const HALL_WIDTH = 10;
  const HALL_HEIGHT = 6;
  const hallGroup = new THREE.Group();

  /* floor */
  const floorLength = HALL_LENGTH;
  const floorGeo = new THREE.BoxGeometry(HALL_WIDTH, .15, floorLength);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, 0, -floorLength/2 + 18);
  floor.receiveShadow = true;
  floor.castShadow = true;
  hallGroup.add(floor);

  /* floor tiles (decorative grid lines) */
  const tileEdgeMat = new THREE.MeshStandardMaterial({ color:0x1a2030, roughness:.5, metalness:.2 });
  for (let z = -2; z > -36; z -= 2){
    const line = new THREE.Mesh(new THREE.BoxGeometry(HALL_WIDTH - .4, .02, .04), tileEdgeMat);
    line.position.set(0, .08, z);
    hallGroup.add(line);
  }
  for (let x = -4; x <= 4; x += 2){
    const line = new THREE.Mesh(new THREE.BoxGeometry(.04, .02, 33), tileEdgeMat);
    line.position.set(x, .08, -17.5);
    hallGroup.add(line);
  }

  /* walls */
  const wallGeo = new THREE.BoxGeometry(.3, HALL_HEIGHT, HALL_LENGTH);
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-HALL_WIDTH/2, HALL_HEIGHT/2, -HALL_LENGTH/2 + 18);
  leftWall.castShadow = true; leftWall.receiveShadow = true;
  hallGroup.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(HALL_WIDTH/2, HALL_HEIGHT/2, -HALL_LENGTH/2 + 18);
  rightWall.castShadow = true; rightWall.receiveShadow = true;
  hallGroup.add(rightWall);

  /* ceiling */
  const ceilGeo = new THREE.BoxGeometry(HALL_WIDTH, .2, HALL_LENGTH);
  const ceiling = new THREE.Mesh(ceilGeo, wallDarkMat);
  ceiling.position.set(0, HALL_HEIGHT, -HALL_LENGTH/2 + 18);
  ceiling.castShadow = true;
  hallGroup.add(ceiling);

  /* ceiling light panels */
  const lightPanelMat = new THREE.MeshStandardMaterial({ color:0x334455, roughness:.15, metalness:.3, emissive:0x112233, emissiveIntensity:.3 });
  for (let z = 15; z > -25; z -= 5){
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2, .06, 1.2), lightPanelMat);
    panel.position.set(0, HALL_HEIGHT - .13, z);
    hallGroup.add(panel);
  }

  /* glowing base strips along each wall */
  const stripGeo = new THREE.BoxGeometry(.07, .05, HALL_LENGTH - 2);
  const stripL = new THREE.Mesh(stripGeo, stripMat);
  stripL.position.set(-HALL_WIDTH/2 + .2, .14, -HALL_LENGTH/2 + 18);
  hallGroup.add(stripL);
  const stripR = new THREE.Mesh(stripGeo, stripMat);
  stripR.position.set(HALL_WIDTH/2 - .2, .14, -HALL_LENGTH/2 + 18);
  hallGroup.add(stripR);

  scene.add(hallGroup);

  /* ====== EXHIBIT DATA ====== */
  const EXHIBITS = [
    {
      id:'welcome', title:'Welcome', subtitle:'MANIK MAGAR',
      pos:[ -4.85, 2.0, 14 ], wall:'left',
      contentHTML: `<div class="bento">
        <div class="b-card b-4 b-hero">
          <span class="b-num">01</span>
          <div class="b-kicker">WELCOME</div>
          <h3 class="b-title">Manik <span class="g">Magar</span></h3>
          <div class="b-sub">Full-Stack Developer · MERN · Cybersecurity</div>
          <p class="b-desc">A developer with a security mindset. I build complete web applications with robust backends and polished frontends, always with security woven into every layer.</p>
        </div>
        <div class="b-card b-2 b-flag">
          <span class="b-emoji">📍</span>
          <div class="b-kicker">BASED IN</div>
          <div class="b-big">Kathmandu, Nepal</div>
          <p class="b-desc">Final-year BSc Cybersecurity at Herald College Kathmandu, degree awarded by the University of Wolverhampton.</p>
        </div>
        <div class="b-card b-6">
          <div class="b-kicker">FOCUS AREAS</div>
          <div class="ovl-tags"><span>MERN Stack</span><span>Cybersecurity</span><span>Three.js</span><span>Open to Work</span></div>
        </div>
      </div>`
    },
    {
      id:'about', title:'About Me', subtitle:'THE STORY',
      pos:[ 4.85, 2.0, 8 ], wall:'right',
      contentHTML: `<div class="bento">
        <div class="b-card b-6 b-hero">
          <span class="b-num">02</span>
          <div class="b-kicker">THE STORY</div>
          <h3 class="b-title">About <span class="g">Me</span></h3>
          <p class="b-desc">Full-stack MERN developer and final-year BSc Cybersecurity student. I build products that work flawlessly and stay secure, spending years mastering the MERN stack while diving deep into network defense, ethical hacking, and secure coding.</p>
        </div>
        <div class="b-card b-2">
          <span class="b-emoji">📍</span>
          <div class="b-kicker">BASED IN</div>
          <div class="b-big">Kathmandu</div>
          <p class="b-desc">Nepal</p>
        </div>
        <div class="b-card b-2">
          <span class="b-emoji">🎓</span>
          <div class="b-kicker">DEGREE</div>
          <div class="b-big">BSc Cybersecurity</div>
          <p class="b-desc">Herald College Kathmandu · Awarded by University of Wolverhampton (UK) · Class of 2026</p>
        </div>
        <div class="b-card b-2">
          <span class="b-emoji">🛠</span>
          <div class="b-kicker">STACK</div>
          <div class="b-big">MERN + more</div>
          <p class="b-desc">PHP/MySQL · Three.js · Python</p>
        </div>
      </div>`,
      screenImage: 'profile'
    },
    {
      id:'skills', title:'Skills', subtitle:'THE ARSENAL',
      pos:[ -4.85, 2.0, 2 ], wall:'left',
      contentHTML: `<div class="bento">
        <div class="b-card b-2 b-hero">
          <span class="b-num">03</span>
          <div class="b-kicker">THE ARSENAL</div>
          <h3 class="b-title">Tech <span class="g">Stack</span></h3>
          <p class="b-desc">Languages, frameworks & tools I reach for daily.</p>
        </div>
        <div class="b-card b-4">
          <div class="b-kicker">FRONTEND</div>
          <div class="ovl-tags"><span>React</span><span>JavaScript</span><span>TypeScript</span><span>Three.js</span><span>HTML5</span><span>CSS3</span></div>
          <div class="b-kicker b-mt">BACKEND</div>
          <div class="ovl-tags"><span>Node.js</span><span>Express</span><span>MongoDB</span><span>MySQL</span><span>PHP</span><span>Python</span></div>
          <div class="b-kicker b-mt">SECURITY & DEVOPS</div>
          <div class="ovl-tags"><span>Linux/Kali</span><span>Network Security</span><span>Docker</span><span>Git</span><span>Burp Suite</span></div>
        </div>
      </div>`,
      screenMarquee: true,
      screenLogos: [['html5','css3','javascript','nodedotjs','mongodb','express','react','php','mysql','threedotjs']]
    },
    {
      id:'projects', title:'Projects', subtitle:'WHAT I\'VE BUILT',
      pos:[ 4.85, 2.0, -4 ], wall:'right',
      contentHTML: `<div class="bento">
        <div class="b-card b-6 b-hero">
          <span class="b-num">04</span>
          <div class="b-kicker">WHAT I'VE BUILT</div>
          <h3 class="b-title">Featured <span class="g">Projects</span></h3>
        </div>
        <div class="b-card b-3 b-feature">
          <span class="proj-bubble"><img src="assets/img/proj-hostel.svg" alt="Hostel Management"/></span>
          <div class="b-kicker">01 · FULL-STACK</div>
          <h4 class="b-item-title">Hostel Management System</h4>
          <p class="b-desc">Room allocation, fee tracking & attendance with role-based access.</p>
          <div class="stack b-mt">
            <img src="assets/img/html5.svg" alt="HTML5" title="HTML5"/>
            <img src="assets/img/css3.svg" alt="CSS3" title="CSS3"/>
            <img src="assets/img/javascript.svg" alt="JavaScript" title="JavaScript"/>
            <img src="assets/img/nodedotjs.svg" alt="Node.js" title="Node.js"/>
          </div>
        </div>
        <div class="b-card b-3 b-feature">
          <span class="proj-bubble"><img src="assets/img/proj-rack.svg" alt="Rack Management"/></span>
          <div class="b-kicker">02 · MERN</div>
          <h4 class="b-item-title">Rack Management System</h4>
          <p class="b-desc">Data-center inventory with asset tracking and live dashboards.</p>
          <div class="stack b-mt">
            <img src="assets/img/mongodb.svg" alt="MongoDB" title="MongoDB"/>
            <img src="assets/img/express-light.svg" alt="Express" title="Express"/>
            <img src="assets/img/react.svg" alt="React" title="React"/>
            <img src="assets/img/nodedotjs.svg" alt="Node.js" title="Node.js"/>
          </div>
        </div>
        <div class="b-card b-2">
          <span class="proj-bubble"><img src="assets/img/proj-visitor.svg" alt="Visitor Management"/></span>
          <div class="b-kicker">03 · FULL-STACK</div>
          <h4 class="b-item-title">Visitor Management</h4>
          <p class="b-desc">Digital check-in/out, host notifications, visitor logs.</p>
          <div class="stack b-mt">
            <img src="assets/img/html5.svg" alt="HTML5" title="HTML5"/>
            <img src="assets/img/css3.svg" alt="CSS3" title="CSS3"/>
            <img src="assets/img/javascript.svg" alt="JavaScript" title="JavaScript"/>
            <img src="assets/img/php.svg" alt="PHP" title="PHP"/>
          </div>
        </div>
        <div class="b-card b-2">
          <span class="proj-bubble"><img src="assets/img/proj-movie.svg" alt="Movie Database"/></span>
          <div class="b-kicker">04 · DATABASE</div>
          <h4 class="b-item-title">Movie Database</h4>
          <p class="b-desc">Searchable catalog, custom SQL queries, filters & favorites.</p>
          <div class="stack b-mt">
            <img src="assets/img/php.svg" alt="PHP" title="PHP"/>
            <img src="assets/img/mysql.svg" alt="MySQL" title="MySQL"/>
          </div>
        </div>
        <div class="b-card b-2 b-glow">
          <span class="proj-bubble"><img src="assets/img/proj-openword.svg" alt="OpenWord 3D"/></span>
          <div class="b-kicker">05 · MERN + 3D</div>
          <h4 class="b-item-title">OpenWord 3D</h4>
          <p class="b-desc">Multiplayer 3D word game built on MERN with Three.js.</p>
          <div class="stack b-mt">
            <img src="assets/img/mongodb.svg" alt="MongoDB" title="MongoDB"/>
            <img src="assets/img/express-light.svg" alt="Express" title="Express"/>
            <img src="assets/img/react.svg" alt="React" title="React"/>
            <img src="assets/img/nodedotjs.svg" alt="Node.js" title="Node.js"/>
            <img src="assets/img/threedotjs-light.svg" alt="Three.js" title="Three.js"/>
          </div>
        </div>
      </div>`,
      screenShowcase: [
        { key:'hostel', label:'Hostel' },
        { key:'rack', label:'Rack' },
        { key:'visitor', label:'Visitor' },
        { key:'movie', label:'Movie' },
        { key:'openword', label:'OpenWord' }
      ]
    },
    {
      id:'education', title:'Education', subtitle:'THE JOURNEY',
      pos:[ -4.85, 2.0, -10 ], wall:'left',
      contentHTML: `<div class="bento">
        <div class="b-card b-2 b-hero">
          <span class="b-num">05</span>
          <div class="b-kicker">THE JOURNEY</div>
          <h3 class="b-title">Education <span class="g">& Path</span></h3>
        </div>
        <div class="b-card b-2 b-flag">
          <img class="uni-logo" src="assets/img/wlv-white.svg" alt="University of Wolverhampton" />
          <div class="b-kicker">DEGREE AWARDING BODY</div>
          <h4 class="b-item-title">University of Wolverhampton</h4>
          <p class="b-desc">BSc (Hons) Cybersecurity · degree awarded from the UK.</p>
        </div>
        <div class="b-card b-2 b-flag">
          <img class="uni-logo" src="assets/img/herald-logo.svg" alt="Herald College Kathmandu" />
          <div class="b-kicker">2023 - PRESENT · KATHMANDU</div>
          <h4 class="b-item-title">Herald College Kathmandu</h4>
          <p class="b-desc">Studying the WLV programme at the Kathmandu campus, Nepal.</p>
        </div>
        <div class="b-card b-4">
          <span class="b-emoji">💻</span>
          <div class="b-kicker">2021 - 2023</div>
          <h4 class="b-item-title">Self-Taught Full-Stack Development</h4>
          <p class="b-desc">Independent MERN: REST APIs, authentication, real-time features, deployments.</p>
        </div>
        <div class="b-card b-2 b-glow">
          <span class="b-emoji">📜</span>
          <div class="b-kicker">CERTIFICATIONS</div>
          <h4 class="b-item-title">Security Certifications & Labs</h4>
          <p class="b-desc">Certified LLM Security Expert (CLLMSE) · CompTIA Security+ (in progress) · TryHackMe · HackTheBox.</p>
        </div>
      </div>`,
      screenLogos: [[
        { key:'wlv', w:191, h:40 },
        { key:'herald', w:171, h:40 }
      ]]
    },
    {
      id:'security', title:'Security Research', subtitle:'ETHICAL LAB WORK',
      pos:[ 4.85, 2.0, -16 ], wall:'right',
      contentHTML: `<div class="bento">
        <div class="b-card b-6 b-hero">
          <span class="b-num">06</span>
          <div class="b-kicker">ETHICAL LAB WORK</div>
          <h3 class="b-title">Security <span class="g">Research</span></h3>
        </div>
        <div class="b-card b-6 b-warn">
          <span class="b-emoji">⚠️</span>
          <div class="b-kicker">LAB-ONLY · CONTROLLED ENVIRONMENTS</div>
          <p class="b-desc">All research conducted strictly in isolated lab environments for educational purposes only. Never deployed or tested against real systems.</p>
        </div>
        <div class="b-card b-3">
          <span class="b-emoji">🔐</span>
          <div class="b-kicker">POC · BROWSER EXT</div>
          <h4 class="b-item-title">Credential Stealer</h4>
          <p class="b-desc">Browser autofill silently fills hidden form fields. Defense: visible-field checks, sandboxed iframes, strict autofill policies.</p>
          <div class="ovl-tags b-mt"><span>Browser Ext</span><span>JavaScript</span></div>
        </div>
        <div class="b-card b-3">
          <span class="b-emoji">🔗</span>
          <div class="b-kicker">POC · BROWSER EXT</div>
          <h4 class="b-item-title">Auto Page Redirector</h4>
          <p class="b-desc">URL rewriting & redirect attacks. Defense: URL validation, redirect whitelisting, typosquatting awareness.</p>
          <div class="ovl-tags b-mt"><span>Browser Ext</span><span>JavaScript</span></div>
        </div>
        <div class="b-card b-6 b-cta">
          <p class="b-desc b-cta-text">Understanding how attacks work is the first step to building robust defenses.</p>
        </div>
      </div>`,
      screenBadge: 'security'
    },
    {
      id:'contact', title:'Connect', subtitle:'REACH OUT',
      pos:[ 0, 1.8, -24 ], wall:'center',
      contentHTML: `<div class="bento">
        <div class="b-card b-6 b-hero">
          <span class="b-num">07</span>
          <div class="b-kicker">REACH OUT</div>
          <h3 class="b-title">Let's <span class="g">Connect</span></h3>
          <p class="b-desc">Actively looking for internships, freelance projects, and collaborations. Building something interesting, or need a developer with a security mindset? Let's talk.</p>
        </div>
        <a class="b-card b-2 b-link" href="mailto:contact@manikmagar.com.np">
          <span class="b-emoji">✉</span>
          <div class="b-kicker">EMAIL</div>
          <h4 class="b-item-title">contact@manikmagar.com.np</h4>
        </a>
        <a class="b-card b-2 b-link" href="https://github.com/manikmagarsir" target="_blank" rel="noopener">
          <span class="b-emoji">⌂</span>
          <div class="b-kicker">GITHUB</div>
          <h4 class="b-item-title">github.com/manikmagarsir</h4>
        </a>
        <a class="b-card b-2 b-link" href="https://www.linkedin.com/in/manik-magar-b48287374/" target="_blank" rel="noopener">
          <span class="b-emoji">◉</span>
          <div class="b-kicker">LINKEDIN</div>
          <h4 class="b-item-title">linkedin.com/in/manik-magar</h4>
        </a>
        <div class="b-card b-6 b-flag b-cta">
          <span class="b-emoji">📍</span>
          <div class="b-big">Kathmandu, Nepal</div>
          <p class="b-desc">Open to internships, freelance, and collaborations.</p>
        </div>
      </div>`
    }
  ];

  const exhibitObjects = []; /* { group, screenMesh, pointLight, triggerBox, data } */
  const marqueeObjects = []; /* animated screens needing per-frame redraw */

  /* ====== BUILD EXHIBITS ====== */
  /* logo images drawn onto the exhibit wall screens */
  const SCREEN_LOGOS = {
    wlv: 'assets/img/wlv-white.svg',
    herald: 'assets/img/herald-logo.svg',
    react: 'assets/img/react.svg',
    express: 'assets/img/express-light.svg',
    mongodb: 'assets/img/mongodb.svg',
    nodedotjs: 'assets/img/nodedotjs.svg',
    html5: 'assets/img/html5.svg',
    css3: 'assets/img/css3.svg',
    javascript: 'assets/img/javascript.svg',
    php: 'assets/img/php.svg',
    mysql: 'assets/img/mysql.svg',
    threedotjs: 'assets/img/threedotjs-light.svg',
    hostel: 'assets/img/proj-hostel.svg',
    rack: 'assets/img/proj-rack.svg',
    visitor: 'assets/img/proj-visitor.svg',
    movie: 'assets/img/proj-movie.svg',
    openword: 'assets/img/proj-openword.svg'
  };
  const LOGO_LABELS = {
    html5:'HTML5', css3:'CSS3', javascript:'JavaScript', nodedotjs:'Node.js',
    mongodb:'MongoDB', express:'Express', react:'React', php:'PHP',
    mysql:'MySQL', threedotjs:'Three.js', wlv:'UNIVERSITY OF WOLVERHAMPTON',
    herald:'HERALD COLLEGE KATHMANDU'
  };
  const screenLogos = {};
  const SCREEN_IMAGES = {
    profile: 'assets/img/profile.jpg',
    security: 'assets/img/security.svg'
  };
  /* contained icon drawn above its topic text (sub-rect crop of the source image) */
  const SCREEN_BADGES = {
    security: { key:'security', sx:188, sy:26, sw:136, sh:174 }
  };
  const screenImgs = {};
  const LOGO_BOX = 40;
  const LOGO_GAP = 14;

  function loadScreenAssets(cb){
    const all = Object.assign({}, SCREEN_LOGOS, SCREEN_IMAGES);
    const keys = Object.keys(all);
    let pending = keys.length;
    if (!pending) return cb();
    keys.forEach(k => {
      const img = new Image();
      img.onload = () => { (SCREEN_IMAGES[k] ? screenImgs : screenLogos)[k] = img; if (--pending === 0) cb(); };
      img.onerror = () => { if (--pending === 0) cb(); };
      img.src = all[k];
    });
  }

  /* cover-crop an image into a w×h region */
  function drawCover(ctx, img, w, h){
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(w/iw, h/ih);
    const dw = iw*scale, dh = ih*scale;
    ctx.drawImage(img, (w-dw)/2, (h-dh)/2, dw, dh);
  }

  /* draw one row of logos centered at x=256, each with its topic label below */
  function drawLogoRow(ctx, row, y){
    const items = row.map(it => typeof it === 'string' ? { key:it, w:LOGO_BOX, h:LOGO_BOX } : { key:it.key, w:it.w, h:it.h });
    let total = 0;
    items.forEach((it, i) => { total += it.w + (i ? LOGO_GAP : 0); });
    let x = 256 - total/2;
    ctx.textAlign = 'center';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    items.forEach(it => {
      const img = screenLogos[it.key];
      if (img) ctx.drawImage(img, x, y, it.w, it.h);
      const lbl = LOGO_LABELS[it.key];
      if (lbl){
        ctx.fillStyle = 'rgba(196,205,226,.85)';
        ctx.fillText(lbl, x + it.w/2, y + it.h + 14);
      }
      x += it.w + LOGO_GAP;
    });
  }

  function makeScreenCanvas(ex, t, out){
    const c = out || document.createElement('canvas');
    c.width = 512; c.height = 320;
    const ctx = c.getContext('2d');

    /* background: full-bleed screen image or dark glass */
    const img = ex.screenImage ? screenImgs[ex.screenImage] : null;
    if (img){
      drawCover(ctx, img, 512, 320);
      const dim = ctx.createLinearGradient(0, 130, 0, 320);
      dim.addColorStop(0, 'rgba(10,14,26,0)');
      dim.addColorStop(1, 'rgba(10,14,26,.93)');
      ctx.fillStyle = dim;
      ctx.fillRect(0,0,512,320);
    } else {
      const grad = ctx.createLinearGradient(0,0,512,320);
      grad.addColorStop(0, 'rgba(15,20,35,.95)');
      grad.addColorStop(1, 'rgba(20,28,48,.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,512,320);
    }

    /* border glow */
    ctx.strokeStyle = '#4f8cff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4,4,504,312);

    /* inner line */
    ctx.strokeStyle = 'rgba(79,140,255,.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(12,12,488,296);

    /* top accent bar */
    ctx.fillStyle = 'rgba(79,140,255,.15)';
    ctx.fillRect(12,12,488,3);

    /* contained topic image (icon above its topic text) */
    const badge = ex.screenBadge ? SCREEN_BADGES[ex.screenBadge] : null;
    const badgeImg = badge ? screenImgs[badge.key] : null;
    if (badgeImg && badge){
      const dw = 130;
      const dh = dw * badge.sh / badge.sw;
      ctx.drawImage(badgeImg, badge.sx, badge.sy, badge.sw, badge.sh, 256 - dw/2, 36, dw, dh);
    }

    const rows = (ex.screenLogos || []).filter(row => row.some(it => screenLogos[typeof it === 'string' ? it : it.key]));
    const hasLogos = rows.length > 0;
    const marquee = !!ex.screenMarquee && hasLogos;
    const showcase = ex.screenShowcase || [];
    const hasShowcase = !!showcase.length;

    if (marquee){
      /* scrolling tech-stack banner: icon + topic label per logo */
      const items = rows[0].map(it => typeof it === 'string' ? { key:it, w:LOGO_BOX, h:LOGO_BOX } : { key:it.key, w:it.w, h:it.h });
      ctx.textAlign = 'center';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const gap = 16;
      const itemWs = items.map(it => Math.max(it.w, ctx.measureText(LOGO_LABELS[it.key] || '').width + 16));
      const period = itemWs.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
      const offset = ((t || 0) * 48) % period;
      ctx.fillStyle = 'rgba(251,146,60,.07)';
      ctx.fillRect(0, 40, 512, 72);
      ctx.fillStyle = 'rgba(251,146,60,.4)';
      ctx.fillRect(0, 40, 512, 1.5);
      ctx.fillRect(0, 112, 512, 1.5);
      let x = -offset;
      for (let rep = 0; rep < 2; rep++){
        items.forEach((it, i) => {
          const w = itemWs[i];
          const logoImg = screenLogos[it.key];
          if (logoImg) ctx.drawImage(logoImg, x + (w - it.w)/2, 44, it.w, it.h);
          const lbl = LOGO_LABELS[it.key];
          if (lbl){
            ctx.fillStyle = 'rgba(196,205,226,.85)';
            ctx.fillText(lbl, x + w/2, 98);
          }
          x += w + gap;
        });
      }
    } else if (hasShowcase){
      /* project bubbles showcased in front, gently floating */
      const d = 68, gap = 18;
      const total = showcase.length*d + (showcase.length-1)*gap;
      let cx = 256 - total/2 + d/2;
      ctx.textAlign = 'center';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      showcase.forEach((item, i) => {
        const bob = Math.sin((t || 0) * 2.1 + i * 1.3) * 6;
        const breathe = 1 + Math.sin((t || 0) * 1.6 + i * 2.1) * .03;
        const r = d/2 * breathe;
        const cy = 82 + bob;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(22,28,46,.96)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(251,146,60,.55)';
        ctx.stroke();
        const glyph = screenLogos[item.key];
        if (glyph) ctx.drawImage(glyph, cx - 16, cy - 16, 32, 32);
        ctx.fillStyle = 'rgba(196,205,226,.85)';
        ctx.fillText(item.label, cx, cy + 56);
        cx += d + gap;
      });
    } else if (hasLogos){
      let ly = 54;
      rows.forEach(row => { drawLogoRow(ctx, row, ly); ly += LOGO_BOX + 14; });
    }
    const hasArt = marquee || hasShowcase || hasLogos || !!img || !!badgeImg;

    /* title */
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ex.title, 256, badgeImg ? 240 : (marquee || hasShowcase) ? 174 : hasArt ? 186 : 120);

    /* subtitle */
    ctx.fillStyle = 'rgba(148,163,184,.7)';
    ctx.font = '500 16px "JetBrains Mono", monospace';
    ctx.fillText(ex.subtitle, 256, badgeImg ? 270 : (marquee || hasShowcase) ? 206 : hasArt ? 220 : 160);

    /* bottom decorative dots */
    ctx.fillStyle = 'rgba(79,140,255,.5)';
    for (let i = 0; i < 5; i++){
      ctx.beginPath();
      ctx.arc(216 + i*20, badgeImg ? 294 : (marquee || hasShowcase) ? 238 : hasArt ? 252 : 200, 3, 0, Math.PI*2);
      ctx.fill();
    }

    /* scanline effect */
    ctx.fillStyle = 'rgba(0,0,0,.03)';
    for (let y = 0; y < 320; y += 4){
      ctx.fillRect(0,y,512,2);
    }

    return c;
  }

  /* rebuild a screen's texture from its data (keeps logos in sync) */
  function refreshScreenTexture(eo, t){
    if (eo.screen.material.map) eo.screen.material.map.dispose();
    eo.marqueeCanvas = makeScreenCanvas(eo.data, t, eo.marqueeCanvas);
    eo.screen.material.map = new THREE.CanvasTexture(eo.marqueeCanvas);
    eo.screen.material.map.minFilter = THREE.LinearFilter;
    eo.screen.material.map.magFilter = THREE.LinearFilter;
    eo.screen.material.needsUpdate = true;
  }

  /* accent bar deco on walls between exhibits */
  function makeWallDeco(x, z){
    const group = new THREE.Group();
    /* thin vertical accent line on wall */
    const h = 4;
    const line = new THREE.Mesh(new THREE.BoxGeometry(.04, h, .04), trimMat);
    line.position.set(x, 1 + h/2, z);
    line.castShadow = true;
    group.add(line);

    /* small dot at top */
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 8), frameMat);
    dot.position.set(x, 1 + h + .3, z);
    group.add(dot);

    return group;
  }

  EXHIBITS.forEach((ex, i) => {
    const group = new THREE.Group();
    const [exX, exY, exZ] = ex.pos;
    const wallOffset = ex.wall === 'left' ? .16 : ex.wall === 'right' ? -.16 : 0;

    /* screen plane */
    const screenCanvas = makeScreenCanvas(ex, 0);
    const screenTex = new THREE.CanvasTexture(screenCanvas);
    screenTex.minFilter = THREE.LinearFilter;
    screenTex.magFilter = THREE.LinearFilter;

    const screenGeo = new THREE.PlaneGeometry(3.2, 2.0);
    const screenMat = new THREE.MeshBasicMaterial({ map:screenTex });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(exX + wallOffset, exY, exZ);

    /* rotate screen to face the hallway */
    if (ex.wall === 'left') screen.rotation.y = Math.PI/2;
    else if (ex.wall === 'right') screen.rotation.y = -Math.PI/2;
    /* center-facing already */

    group.add(screen);

    /* frame around screen */
    const frameThick = .06;
    const frameW = 3.35;
    const frameH = 2.15;
    const makeFrameBar = (w,h,d) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d), frameMat);

    const topBar = makeFrameBar(frameW, frameThick, frameThick);
    topBar.position.set(exX + wallOffset, exY + 1.08, exZ);
    if (ex.wall === 'left') topBar.rotation.y = Math.PI/2;
    else if (ex.wall === 'right') topBar.rotation.y = -Math.PI/2;
    group.add(topBar);

    const botBar = makeFrameBar(frameW, frameThick, frameThick);
    botBar.position.set(exX + wallOffset, exY - 1.08, exZ);
    if (ex.wall === 'left') botBar.rotation.y = Math.PI/2;
    else if (ex.wall === 'right') botBar.rotation.y = -Math.PI/2;
    group.add(botBar);

    const leftBar = makeFrameBar(frameThick, frameH, frameThick);
    if (ex.wall === 'center'){
      leftBar.position.set(exX - 1.62, exY, exZ);
    } else {
      leftBar.position.set(exX + wallOffset, exY, exZ + (ex.wall==='left'?-1.62:1.62));
      leftBar.rotation.y = Math.PI/2;
    }
    group.add(leftBar);

    const rightBar = makeFrameBar(frameThick, frameH, frameThick);
    if (ex.wall === 'center'){
      rightBar.position.set(exX + 1.62, exY, exZ);
    } else {
      rightBar.position.set(exX + wallOffset, exY, exZ + (ex.wall==='left'?1.62:-1.62));
      rightBar.rotation.y = Math.PI/2;
    }
    group.add(rightBar);

    /* spotlight */
    const spotLight = new THREE.PointLight(accent, .8, 8, 1);
    spotLight.position.set(exX + (ex.wall==='left'?1.5:ex.wall==='right'?-1.5:0), exY + .5, exZ);
    group.add(spotLight);

    /* pedestal / small base */
    if (ex.wall === 'center'){
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.6,.7,.6,16), pedestalMat);
      base.position.set(exX, .4, exZ);
      base.castShadow = true; base.receiveShadow = true;
      group.add(base);
    }

    scene.add(group);

    /* trigger box (invisible, for proximity detection) */
    const triggerBox = new THREE.Box3();
    const triggerCenter = new THREE.Vector3(exX + (ex.wall==='left'?2.5:ex.wall==='right'?-2.5:0), exY, exZ);
    triggerBox.setFromCenterAndSize(triggerCenter, new THREE.Vector3(2.5, 2.5, 2.5));

    const eo = { group, screen, pointLight:spotLight, triggerBox, data:ex, index:i };
    if (ex.screenMarquee || ex.screenShowcase){ eo.marqueeCanvas = screenCanvas; marqueeObjects.push(eo); }
    exhibitObjects.push(eo);
  });

  /* wall deco lines between exhibits */
  const decoPositions = [
    [-4.85, 11, 'left'], [-4.85, 5, 'left'], [-4.85, -2, 'left'], [-4.85, -7, 'left'], [-4.85, -13, 'left'],
    [4.85, 11, 'right'], [4.85, 5, 'right'], [4.85, -2, 'right'], [4.85, -7, 'right'], [4.85, -13, 'right'],
  ];
  decoPositions.forEach(([dx, dz]) => {
    const d = makeWallDeco(dx, dz);
    scene.add(d);
  });

  /* refresh wall screens once the logo / screen images finish loading */
  loadScreenAssets(() => { exhibitObjects.forEach(refreshScreenTexture); });

  /* ====== PARTICLES ====== */
  const particlesGeo = new THREE.BufferGeometry();
  const particlesCount = isTouch ? 200 : 500;
  const particlesPos = new Float32Array(particlesCount * 3);
  for (let i = 0; i < particlesCount * 3; i += 3){
    particlesPos[i] = (Math.random()-.5) * HALL_WIDTH * .8;
    particlesPos[i+1] = Math.random() * HALL_HEIGHT * .7;
    particlesPos[i+2] = 18 - Math.random() * 42;
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlesPos, 3));
  const particlesMat = new THREE.PointsMaterial({ color:accent, size:.03, transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false });
  const particles = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particles);

  /* ====== PLAYER STATE ====== */
  const player = { x:0, z:18 };
  let yaw = 0; /* facing down the gallery (toward -z) */
  let pitch = 0;
  const EYE_H = 1.65;
  const WALK_SPEED = 4.0;
  const RUN_SPEED = 7.5;
  const MOUSE_SENS = .002;

  const keys = {};
  const HANDLED_KEYS = ['KeyW','KeyA','KeyS','KeyD','KeyE','Escape','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  window.addEventListener('keydown', e => {
    if (HANDLED_KEYS.indexOf(e.code) === -1) return;
    keys[e.code] = true;
    if (e.code === 'KeyE'){
      if (mode === 'overlay') closeExhibit();
      else if (mode === 'play' && nearExhibit >= 0) openExhibit(nearExhibit);
    }
    if (e.code === 'Escape'){
      if (mode === 'play'){ mode='paused'; pauseOverlay.classList.remove('hidden'); showHUD(false); }
      else if (mode === 'paused'){ mode='play'; pauseOverlay.classList.add('hidden'); showHUD(true); requestLock(); }
    }
    e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  /* ====== MOUSE LOOK ====== */
  let lockTimer = null, lockFails = 0;

  function scheduleLockRetry(){
    if (mode !== 'play' || document.pointerLockElement || lockFails >= 5) return;
    lockFails++;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
      if (mode === 'play' && !document.pointerLockElement) requestLock();
    }, 1350);
  }

  function requestLock(){
    if (isTouch) return;
    try{
      const p = renderer.domElement.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => scheduleLockRetry());
    }catch(e){ scheduleLockRetry(); }
  }
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement){
      lockFails = 0;
      if (mode === 'paused'){
        mode = 'play';
        pauseOverlay.classList.add('hidden');
        showHUD(true);
      }
    }
  });
  document.addEventListener('pointerlockerror', () => scheduleLockRetry());
  document.addEventListener('mousemove', e => {
    if (mode !== 'play' || !document.pointerLockElement) return;
    yaw -= e.movementX * MOUSE_SENS;
    pitch -= e.movementY * MOUSE_SENS;
    pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, pitch));
  });
  renderer.domElement.addEventListener('click', () => {
    if (mode === 'play' && !document.pointerLockElement) requestLock();
  });

  /* ====== TOUCH CONTROLS ====== */
  let touchJoy = { active:false, sx:0, sy:0, dx:0, dy:0 };
  let touchLook = { active:false, lx:0, ly:0 };

  if (isTouch){
    mobileCtrl.classList.remove('hidden');
    hintText.textContent = 'Joystick move · Drag right to look · Interact';

    const joy = document.getElementById('mc-joy');
    const knob = document.getElementById('mc-knob');
    const lookZone = document.getElementById('mc-look');

    joy.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      const r = joy.getBoundingClientRect();
      touchJoy.sx = r.left + r.width/2;
      touchJoy.sy = r.top + r.height/2;
      touchJoy.active = true;
    }, { passive:false });
    joy.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!touchJoy.active) return;
      const t = e.touches[0];
      touchJoy.dx = (t.clientX - touchJoy.sx) / 35;
      touchJoy.dy = (t.clientY - touchJoy.sy) / 35;
      const mag = Math.sqrt(touchJoy.dx*touchJoy.dx + touchJoy.dy*touchJoy.dy);
      if (mag > 1){ touchJoy.dx /= mag; touchJoy.dy /= mag; }
      knob.style.transform = `translate(${touchJoy.dx*28}px,${touchJoy.dy*28}px)`;
    }, { passive:false });
    joy.addEventListener('touchend', () => {
      touchJoy.active = false; touchJoy.dx = 0; touchJoy.dy = 0;
      knob.style.transform = 'translate(0,0)';
    });

    let lookTouchId = null;
    lookZone.addEventListener('touchstart', e => {
      e.preventDefault();
      if (lookTouchId !== null) return; /* already tracking a look touch */
      const t = e.changedTouches[0];
      lookTouchId = t.identifier;
      touchLook.active = true;
      touchLook.lx = t.clientX;
      touchLook.ly = t.clientY;
    }, { passive:false });
    lookZone.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!touchLook.active) return;
      let t = null;
      for (let i = 0; i < e.touches.length; i++){
        if (e.touches[i].identifier === lookTouchId){ t = e.touches[i]; break; }
      }
      if (!t) return;
      const dx = t.clientX - touchLook.lx;
      const dy = t.clientY - touchLook.ly;
      yaw -= dx * .004;
      pitch -= dy * .004;
      pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, pitch));
      touchLook.lx = t.clientX;
      touchLook.ly = t.clientY;
    }, { passive:false });
    lookZone.addEventListener('touchend', e => {
      for (let i = 0; i < e.changedTouches.length; i++){
        if (e.changedTouches[i].identifier === lookTouchId){
          touchLook.active = false;
          lookTouchId = null;
          break;
        }
      }
    });

    document.getElementById('mc-interact').addEventListener('touchstart', e => {
      e.preventDefault();
      if (nearExhibit >= 0 && mode === 'play') openExhibit(nearExhibit);
    }, { passive:false });
  }

  /* ====== HUD ====== */
  function showHUD(on){
    const hud = document.getElementById('hud');
    hud.style.opacity = on ? '1' : '0';
    crosshair.style.display = on ? '' : 'none';
    endContact.classList.toggle('hidden', !on || player.z > -20);
  }

  /* ====== EXHIBIT INTERACTION ====== */
  function openExhibit(idx){
    if (mode === 'overlay') return;
    currentExhibit = idx;
    mode = 'overlay';
    showHUD(false);
    if (document.pointerLockElement) document.exitPointerLock();
    exhibitHint.classList.remove('show');
    nearExhibit = -1;
    crosshair.classList.remove('near');
    mcInteract.classList.remove('show');
    renderOverlay(idx);

    /* portal-warp cutscene */
    playWarpWhoosh();
    warpKick = 1;
    const token = ++warpToken;
    warpEl.classList.remove('on');
    void warpEl.offsetWidth; /* restart animation */
    warpEl.classList.add('on');
    setTimeout(() => {
      if (token !== warpToken) return;
      exhibitOverlay.classList.remove('hidden');
    }, 420);
    setTimeout(() => {
      if (token !== warpToken) return;
      warpEl.classList.remove('on');
    }, 1120);
  }

  function closeExhibit(){
    if (mode !== 'overlay') return;
    /* reverse portal-warp cutscene */
    playExitWhoosh();
    warpKick = .8;
    const token = ++warpToken;
    warpEl.classList.remove('on');
    void warpEl.offsetWidth; /* restart animation */
    warpEl.classList.add('on');
    setTimeout(() => {
      if (token !== warpToken) return;
      exhibitOverlay.classList.add('hidden');
      ovlContent.innerHTML = '';
      currentExhibit = -1;
      mode = 'play';
      showHUD(true);
      requestLock();
    }, 380);
    setTimeout(() => {
      if (token !== warpToken) return;
      warpEl.classList.remove('on');
    }, 1150);
  }

  function renderOverlay(idx){
    const ex = exhibitObjects[idx].data;
    ovlContent.innerHTML = ex.contentHTML;
    document.getElementById('ovl-eyebrow').textContent = 'Exhibit ' + String(idx + 1).padStart(2, '0') + ' / ' + String(EXHIBITS.length).padStart(2, '0') + ' · ' + ex.subtitle;
  }

  document.getElementById('ovl-close').addEventListener('click', closeExhibit);

  /* ====== PAUSE MENU ====== */
  document.getElementById('resume-btn').addEventListener('click', () => {
    mode = 'play'; pauseOverlay.classList.add('hidden'); showHUD(true); requestLock();
  });

  /* ====== AMBIENT AUDIO / BGM ====== */
  let audioCtx = null, ambGain = null, sfxGain = null, ambNodes = [];
  let chordTimer = null, pulseTimer = null, chordIdx = 0;
  const AMB_VOL = 0.05; /* BGM bed — space travel feel */
  const SFX_VOL = 0.6;  /* UI / warp sound effects */
  const PAD_CHORDS = [
    [110.00, 164.81, 220.00],  /* Am — open void */
    [ 87.31, 130.81, 174.61],  /* F  — drift */
    [130.81, 196.00, 261.63],  /* C  — time hole */
    [ 98.00, 146.83, 196.00],  /* G  — gravity well */
  ];

  function initAudio(){
    if (audioCtx) return;
    try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){audioCtx=null;}
  }

  /* build a buffer of white noise */
  function noiseBuffer(duration){
    const sr = audioCtx.sampleRate;
    const len = sr * duration;
    const buf = audioCtx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function startAmbient(){
    if (!audioCtx || ambNodes.length) return;
    const now = audioCtx.currentTime;

    ambGain = audioCtx.createGain();
    ambGain.gain.value = 0;
    if (!muted) ambGain.gain.linearRampToValueAtTime(AMB_VOL, now + 2.5);

    /* separate SFX bus — effects stay clearly audible over the BGM bed */
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = muted ? 0 : SFX_VOL;
    sfxGain.connect(audioCtx.destination);

    /* ---- LAYER 1: Interstellar wind (filter-swept noise, drifting pan) ---- */
    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer(4);
    noiseSrc.loop = true;
    const noiseBP = audioCtx.createBiquadFilter();
    noiseBP.type = 'bandpass';
    noiseBP.frequency.value = 260;
    noiseBP.Q.value = .6;
    const sweep = audioCtx.createOscillator();
    sweep.frequency.value = .05;
    const sweepG = audioCtx.createGain();
    sweepG.gain.value = 200;
    sweep.connect(sweepG);
    sweepG.connect(noiseBP.frequency);
    const noiseG = audioCtx.createGain();
    noiseG.gain.value = .1;
    noiseSrc.connect(noiseBP);
    noiseBP.connect(noiseG);
    if (audioCtx.createStereoPanner){
      const windPan = audioCtx.createStereoPanner();
      const panLFO = audioCtx.createOscillator();
      panLFO.frequency.value = .03;
      const panG = audioCtx.createGain();
      panG.gain.value = .5;
      panLFO.connect(panG);
      panG.connect(windPan.pan);
      noiseG.connect(windPan);
      windPan.connect(ambGain);
      panLFO.start(now);
      ambNodes.push(windPan, panLFO, panG);
    } else {
      noiseG.connect(ambGain);
    }
    noiseSrc.start(now);
    sweep.start(now);
    ambNodes.push(noiseSrc, noiseBP, noiseG, sweep, sweepG);

    /* ---- LAYER 2: Deep drone (A0 · E1 · A1 gravity bed) ---- */
    [27.5, 41.2, 55].forEach(fr => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = fr;
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = .08 + Math.random() * .04;
      const lfoG = audioCtx.createGain();
      lfoG.gain.value = .9;
      lfo.connect(lfoG);
      lfoG.connect(osc.detune);
      lfo.start(now);
      const g = audioCtx.createGain();
      g.gain.value = .05;
      osc.connect(g);
      g.connect(ambGain);
      osc.start(now);
      ambNodes.push(osc, lfo, lfoG, g);
    });

    /* ---- LAYER 3: Evolving pad — time-hole chord morphing ---- */
    const padOut = audioCtx.createGain();
    padOut.gain.value = 0;
    const padLP = audioCtx.createBiquadFilter();
    padLP.type = 'lowpass';
    padLP.frequency.value = 950;
    padLP.connect(padOut);
    padOut.connect(ambGain);
    const padVoices = PAD_CHORDS[0].map((fr, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = fr;
      const det = audioCtx.createOscillator();
      det.frequency.value = .05 + i * .021;
      const detG = audioCtx.createGain();
      detG.gain.value = 3.5;
      det.connect(detG);
      detG.connect(osc.detune);
      const v = audioCtx.createGain();
      v.gain.value = .26;
      osc.connect(v);
      v.connect(padLP);
      osc.start(now);
      det.start(now);
      ambNodes.push(osc, v, det, detG);
      return { osc, v };
    });
    ambNodes.push(padOut, padLP);
    padOut.gain.setValueAtTime(0, now);
    padOut.gain.linearRampToValueAtTime(.5, now + 6);
    chordTimer = setInterval(() => {
      const freqs = PAD_CHORDS[chordIdx++ % PAD_CHORDS.length];
      const t = audioCtx.currentTime;
      padVoices.forEach((pv, i) => {
        pv.osc.frequency.setTargetAtTime(freqs[i], t, 2.4);
      });
    }, 9000);

    /* ---- LAYER 4: Time-warp pulse (slow heartbeat of the hole) ---- */
    const pulseLP = audioCtx.createBiquadFilter();
    pulseLP.type = 'lowpass';
    pulseLP.frequency.value = 170;
    const pulseOut = audioCtx.createGain();
    pulseOut.gain.value = .5;
    pulseLP.connect(pulseOut);
    pulseOut.connect(ambGain);
    ambNodes.push(pulseLP, pulseOut);
    pulseTimer = setInterval(() => {
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(64, t);
      o.frequency.exponentialRampToValueAtTime(42, t + .45);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.07, t + .04);
      g.gain.exponentialRampToValueAtTime(.0001, t + .6);
      o.connect(g);
      g.connect(pulseLP);
      o.start(t);
      o.stop(t + .65);
    }, 1500);

    ambGain.connect(audioCtx.destination);
  }

  /* portal-warp sweep for enter / exhibit open (through SFX bus) */
  function playWarpWhoosh(){
    if (!audioCtx || audioCtx.state !== 'running' || muted) return;
    const dest = sfxGain || audioCtx.destination;
    const now = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer(1.4);
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(160, now);
    bp.frequency.exponentialRampToValueAtTime(1500, now + .5);
    bp.frequency.exponentialRampToValueAtTime(180, now + 1.3);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(.5, now + .12);
    g.gain.exponentialRampToValueAtTime(.0001, now + 1.35);
    src.connect(bp);
    bp.connect(g);
    if (audioCtx.createStereoPanner){
      const pan = audioCtx.createStereoPanner();
      g.connect(pan);
      pan.connect(dest);
    } else {
      g.connect(dest);
    }
    src.start(now);
    src.stop(now + 1.4);
    const tone = audioCtx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(90, now);
    tone.frequency.exponentialRampToValueAtTime(560, now + .45);
    tone.frequency.exponentialRampToValueAtTime(70, now + 1.25);
    const tg = audioCtx.createGain();
    tg.gain.setValueAtTime(.0001, now);
    tg.gain.exponentialRampToValueAtTime(.2, now + .18);
    tg.gain.exponentialRampToValueAtTime(.0001, now + 1.3);
    tone.connect(tg);
    tg.connect(dest);
    tone.start(now);
    tone.stop(now + 1.35);
  }

  /* reversed warp sweep for closing the exhibit */
  function playExitWhoosh(){
    if (!audioCtx || audioCtx.state !== 'running' || muted) return;
    const dest = sfxGain || audioCtx.destination;
    const now = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer(1.3);
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1400, now);
    bp.frequency.exponentialRampToValueAtTime(160, now + 1.2);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(.4, now + .1);
    g.gain.exponentialRampToValueAtTime(.0001, now + 1.25);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(now);
    src.stop(now + 1.3);
    const tone = audioCtx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(520, now);
    tone.frequency.exponentialRampToValueAtTime(75, now + 1.1);
    const tg = audioCtx.createGain();
    tg.gain.setValueAtTime(.0001, now);
    tg.gain.exponentialRampToValueAtTime(.16, now + .15);
    tg.gain.exponentialRampToValueAtTime(.0001, now + 1.2);
    tone.connect(tg);
    tg.connect(dest);
    tone.start(now);
    tone.stop(now + 1.25);
  }

  function stopAmbient(){
    if (chordTimer){ clearInterval(chordTimer); chordTimer = null; }
    if (pulseTimer){ clearInterval(pulseTimer); pulseTimer = null; }
    ambNodes.forEach(n => { try{n.stop();}catch(e){} });
    ambNodes = [];
    ambGain = null;
    sfxGain = null;
  }

  function toggleMute(){
    muted = !muted;
    if (ambGain){
      ambGain.gain.cancelScheduledValues(audioCtx.currentTime);
      ambGain.gain.value = muted ? 0 : AMB_VOL;
    }
    if (sfxGain) sfxGain.gain.value = muted ? 0 : SFX_VOL;
    document.getElementById('audio-btn-pause').textContent = muted ? '🔇' : '🔊';
    if (!audioCtx || audioCtx.state !== 'running'){
      initAudio();
      if (audioCtx) audioCtx.resume().then(startAmbient).catch(()=>{});
      return;
    }
  }
  document.getElementById('audio-btn-pause').addEventListener('click', toggleMute);

  /* unlock audio on first interaction */
  ['pointerdown','keydown'].forEach(ev => {
    window.addEventListener(ev, () => {
      initAudio();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().then(startAmbient).catch(()=>{});
      else startAmbient();
    }, {once:true});
  });

  /* cleanup on unload */
  window.addEventListener('beforeunload', () => {
    stopAmbient();
    if (audioCtx && audioCtx.state === 'running') audioCtx.close().catch(()=>{});
  });

  /* ====== COLLISION ====== */
  function checkCollision(nx, nz){
    /* wall bounds */
    if (nx < -4.7 || nx > 4.7) return true;
    /* hallway ends */
    if (nz > 18.5 || nz < -26.5) return true;
    /* exhibit pedestal (contact at center) */
    if (Math.abs(nz - (-24)) < .8 && Math.abs(nx) < .8) return true;
    return false;
  }

  /* ====== UPDATE LOOP ====== */
  const clock = new THREE.Clock();

  function update(dt){
    if (mode !== 'play'){
      /* drift camera when not in play */
      if (mode === 'paused' || mode === 'overlay'){
        camera.position.lerp(new THREE.Vector3(player.x, EYE_H, player.z), .05);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(pitch, yaw, 0);
      }
      return;
    }

    /* movement */
    let speed = keys['ShiftLeft'] || keys['ShiftRight'] ? RUN_SPEED : WALK_SPEED;
    let mx = 0, mz = 0;

    if (keys['KeyW'] || keys['ArrowUp']) mz = -1;
    if (keys['KeyS'] || keys['ArrowDown']) mz = 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx = -1;
    if (keys['KeyD'] || keys['ArrowRight']) mx = 1;

    /* touch joystick */
    if (touchJoy.active){
      mx = touchJoy.dx;
      mz = touchJoy.dy;
    }

    /* normalize */
    const mag = Math.sqrt(mx*mx + mz*mz);
    if (mag > 1){ mx /= mag; mz /= mag; }

    /* apply with camera direction */
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    let dx = (mx * rightX - mz * forwardX) * speed * dt;
    let dz = (mx * rightZ - mz * forwardZ) * speed * dt;

    /* collision */
    if (!checkCollision(player.x + dx, player.z)) player.x += dx;
    if (!checkCollision(player.x, player.z + dz)) player.z += dz;

    /* camera with head-bob + run FOV kick */
    const moving = mx !== 0 || mz !== 0;
    const running = (keys['ShiftLeft'] || keys['ShiftRight']) && moving;
    let bobY = 0, bobPitch = 0, bobRoll = 0;
    if (moving){
      const t = performance.now() * .001;
      const rate = running ? 11 : 8;
      bobY = Math.abs(Math.sin(t * rate)) * (running ? .03 : .02);
      bobPitch = Math.sin(t * rate) * .012;
      bobRoll = Math.sin(t * rate) * .0022;
    }
    camera.position.set(player.x, EYE_H + bobY, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch + bobPitch, yaw, bobRoll);
    camera.fov += ((running ? 72 : 65) - camera.fov) * Math.min(1, dt * 8);
    camera.updateProjectionMatrix();

    /* proximity check for exhibits */
    let closest = -1, closestDist = 2.8;
    const playerVec = new THREE.Vector3(player.x, EYE_H, player.z);
    for (let i = 0; i < exhibitObjects.length; i++){
      const tb = exhibitObjects[i].triggerBox;
      if (tb.containsPoint(playerVec)){
        const cx = exhibitObjects[i].data.pos[0] + (exhibitObjects[i].data.wall==='left'?2:exhibitObjects[i].data.wall==='right'?-2:0);
        const cz = exhibitObjects[i].data.pos[2];
        const dist = Math.sqrt((player.x-cx)**2 + (player.z-cz)**2);
        if (dist < closestDist){
          closestDist = dist;
          closest = i;
        }
      }
    }

    if (closest !== nearExhibit){
      nearExhibit = closest;
      if (closest >= 0){
        exhibitHint.innerHTML = (isTouch ? HAND_ICON + ' ' : 'Press E to view ') + exhibitObjects[closest].data.title;
        exhibitHint.classList.add('show');
        crosshair.classList.add('near');
        mcInteract.classList.add('show');
      } else {
        exhibitHint.classList.remove('show');
        crosshair.classList.remove('near');
        mcInteract.classList.remove('show');
      }
    }

    /* end contact display */
    endContact.classList.toggle('hidden', player.z > -20 || mode !== 'play');
  }

  function animate(){
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), .15);

    /* scroll the tech-stack banner on animated screens */
    if (marqueeObjects.length){
      const mt = clock.elapsedTime;
      marqueeObjects.forEach(eo => {
        makeScreenCanvas(eo.data, mt, eo.marqueeCanvas);
        eo.screen.material.map.needsUpdate = true;
      });
    }

    update(dt);

    /* portal-warp lens kick while overlay is coming in */
    if (mode === 'overlay' && warpKick > 0){
      camera.fov = 65 + warpKick * 55;
      camera.updateProjectionMatrix();
      warpKick = Math.max(0, warpKick - dt * 1.8);
    }

    /* particles drift */
    const posArr = particles.geometry.attributes.position.array;
    for (let i = 0; i < posArr.length; i += 3){
      posArr[i+1] += Math.sin(Date.now()*.001 + i)*.0004;
      if (posArr[i+1] > HALL_HEIGHT*.7) posArr[i+1] = 0;
      if (posArr[i+1] < 0) posArr[i+1] = HALL_HEIGHT*.7;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y += dt * .03;

    /* screen glow pulse */
    exhibitObjects.forEach((eo, i) => {
      eo.pointLight.intensity = .6 + Math.sin(Date.now()*.002 + i)*.2;
    });

    renderer.render(scene, camera);
  }

  /* ====== RESIZE ====== */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (isTouch) renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  });

  /* ====== ENTER ====== */
  function enterGallery(){
    if (mode !== 'loading') return;
    /* fullscreen on touch for the immersive landscape experience */
    if (isTouch){
      const el = document.documentElement;
      const fs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (fs){
        try{ const p = fs.call(el); if (p && p.catch) p.catch(()=>{}); }catch(e){}
      }
    }
    loading.classList.add('hidden');
    mode = 'play';
    showHUD(true);
    requestLock();
    initAudio();
    if (audioCtx){
      const start = () => { startAmbient(); playWarpWhoosh(); };
      if (audioCtx.state === 'suspended') audioCtx.resume().then(start).catch(()=>{});
      else start();
    }
  }
  document.getElementById('enter-btn').addEventListener('click', enterGallery);
  loading.addEventListener('click', e => { if (e.target.id !== 'enter-btn') enterGallery(); });

  /* ====== INIT ====== */
  function init(){
    renderer.render(scene, camera);
    document.getElementById('ovl-hint').textContent = isTouch ? 'Tap ✕ to close · walk to explore' : 'Press E to close · walk to explore';
    hintText.textContent = isTouch ? 'Joystick move · Drag right to look · Interact' : 'WASD move · Mouse look · E interact · Shift run · ESC pause';
    document.getElementById('audio-btn-pause').textContent = muted ? '🔇' : '🔊';
  }

  init();
  animate();

})();
