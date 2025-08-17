AFRAME.registerComponent('game-reset', {
  init() {
    this.resetting = false;
    const scene = this.el.sceneEl || document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('player-hit', (ev) => { try { this.onPlayerHit(ev && ev.detail ? ev.detail : {}); } catch(e){ console.warn('game-reset handler error', e); } });
    }
  },

  async onPlayerHit(detail) {
    if (this.resetting) return;
    this.resetting = true;
    console.log('[GameReset] player-hit received', detail);

  try { window.playerInvulnerable = true; } catch(_){}

    const playerCam = document.querySelector('#playerCam');
    if (!playerCam) {
      console.warn('[GameReset] no playerCam found — falling back to reload');
      window.location.reload();
      return;
    }

    let overlay = playerCam.querySelector('#fadeOverlay');
    if (!overlay) {
      overlay = document.createElement('a-plane');
      overlay.setAttribute('id', 'fadeOverlay');
      overlay.setAttribute('position', '0 0 -0.8');
      overlay.setAttribute('rotation', '0 0 0');
      overlay.setAttribute('width', '5');
      overlay.setAttribute('height', '5');
      overlay.setAttribute('material', 'color: #000; shader: flat; opacity: 0; transparent: true');
      playerCam.appendChild(overlay);
    }

    const runAnimation = (el, name) => new Promise((resolve) => {
      const fn = (evt) => { try { if (!evt.detail || evt.detail.name === name) { el.removeEventListener('animationcomplete', fn); } } catch(_){}; resolve(); };
      el.addEventListener('animationcomplete', fn);
      setTimeout(resolve, 800);
    });

    overlay.setAttribute('animation__fadein', 'property: material.opacity; to: 1; dur: 600; easing: easeInOutQuad');
    await runAnimation(overlay, 'fadein');

    try {
      const horseManagerEl = document.querySelector('#horseManager');
      if (horseManagerEl && horseManagerEl.components && horseManagerEl.components['horse-manager']) {
        horseManagerEl.components['horse-manager'].pause();
      }
    } catch (e) { console.warn('pause horse-manager failed', e); }

    try {
      window.finaleRunning = false;

      window.finaleCooldownWave = null;
      window.shellWaveActive = false;
      const shellManagerEl = document.querySelector('[shell-manager]');
      if (shellManagerEl && shellManagerEl.components && shellManagerEl.components['shell-manager']) {
        const sm = shellManagerEl.components['shell-manager'];
        try { sm.stopSpawner(); } catch(_){}
        if (sm.shellPool && sm.shellPool.length) {
          sm.shellPool.forEach(s => { try { sm.recycle(s); } catch(_){} });
        }
      }
    } catch (e) { console.warn('stop shells failed', e); }

    try {
      var created = Array.from(document.querySelectorAll('[id^="finale-cannon-"]'));
      created.forEach(function(c){ try { if (c.parentNode) c.parentNode.removeChild(c); } catch(_){} });
    } catch(_){}
    try {
      var pc = document.querySelector('#playerCam');
      if (pc) {
        try { pc.removeAttribute('animation__finale_cam'); } catch(_){}
        try { pc.removeAttribute('animation__ease_after_cannons'); } catch(_){}
        try { pc.removeAttribute('animation__move'); } catch(_){}
        try { pc.setAttribute('position', '0 4.5 1.5'); } catch(_){}
      }
    } catch(_){ }

    try {
      const player = document.querySelector('#player');
      if (player) { try { player.setAttribute('visible', 'false'); } catch(_) { player.object3D && (player.object3D.visible = false); } }
    } catch (e) { }
  try { window.playerInvulnerable = true; } catch(_) {}

    let msg = playerCam.querySelector('#hitText');
    if (!msg) {
      msg = document.createElement('a-entity');
      msg.setAttribute('id', 'hitText');
      msg.setAttribute('troika-text', 'value: You were hit! Restarting...; font: #aotFont; fontSize: 0.18; color: #fff; anchor: center');
      msg.setAttribute('position', '0 -0.1 -0.9');
      playerCam.appendChild(msg);
    } else {
      msg.setAttribute('troika-text', 'value: You were hit! Restarting...');
    }

    await new Promise(r => setTimeout(r, 3000));

    overlay.setAttribute('animation__fadeout', 'property: material.opacity; to: 0; dur: 600; easing: easeInOutQuad');
    await runAnimation(overlay, 'fadeout');

    try { if (msg && msg.parentNode) msg.parentNode.removeChild(msg); } catch(_){}

    try {
      window.gameStarted = false;
      window.horsesPassed = 0;
      window.currentWave = 1;
      window.horseSpeed = 30;

  window.shellSpeed = 20;
      window.horsesPassedInWave = 0;
      window.horsesSpawnedInWave = 0;
      window.waveTransitioning = false;
  window.finaleCooldownWave = null;
  window.shellWaveActive = false;

      const horseManagerEl = document.querySelector('#horseManager');
      if (horseManagerEl && horseManagerEl.components && horseManagerEl.components['horse-manager']) {
        horseManagerEl.components['horse-manager'].reset();
      }

      const shellManagerEl = document.querySelector('[shell-manager]');
      if (shellManagerEl && shellManagerEl.components && shellManagerEl.components['shell-manager']) {
        const sm = shellManagerEl.components['shell-manager'];
        try { sm.remove(); } catch(_){}
        try { sm.createPool && sm.createPool(document.querySelector('#game-entities') || document.body); } catch(_){}
      }
    } catch (e) { console.warn('reset state failed', e); }

    try {
      window.gameStarted = true;
      const vrMenu = document.querySelector('#vr-menu');
      const gameEntities = document.querySelector('#game-entities');
      if (vrMenu) vrMenu.setAttribute('visible', 'false');
      if (gameEntities) gameEntities.setAttribute('visible', 'true');

      const introCam = document.querySelector('#introCam');
      if (introCam) introCam.removeAttribute('camera');
      if (playerCam) playerCam.setAttribute('camera', 'active', true);

      try {
        const player = document.querySelector('#player');
        if (player) { try { player.setAttribute('visible', 'true'); } catch(_) { player.object3D && (player.object3D.visible = true); } }
      } catch (e) {}

  try { window.playerInvulnerable = false; } catch(_) {}

      try { Array.from(document.querySelectorAll('.intro-horse')).forEach(el => el.remove()); } catch(_) {}

      const waveLabel = document.querySelector('#waveLabel');
      if (waveLabel) waveLabel.setAttribute('value', 'Wave 1');
      if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();

      const mgrEl = document.querySelector('#horseManager');
      if (mgrEl) mgrEl.setAttribute('visible', 'true');

      const scene = document.querySelector('a-scene');
      if (scene) scene.emit('game-start');

      if (mgrEl && mgrEl.components && mgrEl.components['horse-manager']) {
        try { mgrEl.components['horse-manager'].reset(); } catch(_){}
      }
    } catch (e) { console.warn('restart after reset failed', e); }

    setTimeout(() => { try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch(_) {} }, 1200);

    this.resetting = false;
  }
});