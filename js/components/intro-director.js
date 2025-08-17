AFRAME.registerComponent('intro-director', {
  init: function () {
    this.started = false;
    this.leadHorse = null;
    this.followers = [];

  this.el.addEventListener('start-intro', () => this.start());
  },
  start: function () {
    if (this.started) return;
    this.started = true;
    const introCam = document.querySelector('#introCam');
    const playerCam = document.querySelector('#playerCam');
    const mgrEl = document.querySelector('#horseManager');
    const mgr = mgrEl && mgrEl.components && mgrEl.components['horse-manager'];
    const gameRoot = document.querySelector('#game-entities');
  if (mgrEl) mgrEl.setAttribute('visible', 'false');
    if (playerCam) playerCam.removeAttribute('camera');
    if (introCam) introCam.setAttribute('camera', 'active', true);
    window.horsesPassed = 0;
    window.currentWave = 1;
    window.horseSpeed = 10;
  window.shellSpeed = 20; 
    window.horsesPassedInWave = 0;
    window.horsesSpawnedInWave = 0;
    window.waveTransitioning = false;
  window.finaleCooldownWave = null;
  window.shellWaveActive = false;
    console.log(`[Intro] Start -> Wave ${window.currentWave}, quota=${waveQuota(window.currentWave)}, baseSpeed=${window.horseSpeed}`);
    if (window.updateWaveLabel) window.updateWaveLabel();
    if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();
    if (introCam) {
      introCam.setAttribute('position', '0 1 -100');
      introCam.setAttribute('animation__move', {
        property: 'position',
        from: '0 1.5 -100',
        to: '0 4.5 1.5',
        dur: 6000,
        easing: 'easeInCubic'
      });
    }

    setTimeout(() => {
      this.spawnIntroHorses(gameRoot);
      setTimeout(() => this.accelerateLead(), 2200);
    }, 1000);

    setTimeout(() => {
      this.onIntroPanComplete();
    }, 6000);
  },
  spawnIntroHorses: function (root) {
    const makeHorse = (z, extra, isLead=false) => {
      const h = document.createElement('a-entity');
      h.classList.add('intro-horse'); 
      h.setAttribute('gltf-model', 'assets/obstacles/Horse_Running.glb');
      h.setAttribute('scale', '0.04 0.04 0.04');
      h.setAttribute('position', `0 0.5 ${z}`);
      h.setAttribute('animation-mixer', 'clip: *; timeScale: 1.8');
      h.setAttribute('horse-mover', `active: true; extraSpeed: ${extra}`);

      h.addEventListener('needs-respawn', () => h.remove());
      if (isLead) this.leadHorse = h; else this.followers.push(h);
      root.appendChild(h);
      return h;
    };
    makeHorse(-135, 5, true);
    makeHorse(-145, 0);
    makeHorse(-155, -5);
  },
  accelerateLead: function () {
    if (this.leadHorse) {
      this.leadHorse.setAttribute('horse-mover', 'active: true; extraSpeed: 60');
    }
    for (const f of this.followers) {
      const comp = f.getAttribute('horse-mover');
      const cur = comp && comp.extraSpeed ? comp.extraSpeed : 0;
      f.setAttribute('horse-mover', `active: true; extraSpeed: ${cur + 8}`);
    }
  },
  onIntroPanComplete: function () {
    const introCam = document.querySelector('#introCam');
    const playerCam = document.querySelector('#playerCam');
    const mgrEl = document.querySelector('#horseManager');
    const mgr = mgrEl && mgrEl.components && mgrEl.components['horse-manager'];

  if (introCam) introCam.removeAttribute('camera');
    if (playerCam) playerCam.setAttribute('camera', 'active', true);

    window.horseSpeed = 30;
    if (mgrEl) mgrEl.setAttribute('visible', 'true');
  if (mgr) mgr.reset();

  try { Array.from(document.querySelectorAll('.intro-horse')).forEach(el => el.remove()); } catch (e) {  }
    try {
      const gl = document.querySelector('#game-entities');
      if (gl && gl.components && gl.components['ground-loop']) {
        gl.components['ground-loop'].paused = false;
      }
    } catch (e) { console.warn('resume ground-loop failed', e); }
  }
});