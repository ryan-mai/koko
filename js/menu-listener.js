AFRAME.registerComponent('menu-listener', {
  init: function () {
    var startBtn = document.querySelector('#startBtn');
    var menuCam = document.querySelector('#menuCam');
    var playerCam = document.querySelector('#playerCam');
    console.log('[Menu] init');
    
    
    var vrMenu = document.querySelector('#vr-menu');
    var gameEntities = document.querySelector('#game-entities');

    menuCam.setAttribute('camera', 'active', true);
    playerCam.removeAttribute('camera');
    startBtn.addEventListener('click', function () {
  try { window.gameStarted = true; } catch(_){}
      vrMenu.setAttribute('visible', 'false');
      gameEntities.setAttribute('visible', 'true');

      menuCam.removeAttribute('camera');
  try { var sc = document.querySelector('a-scene'); if (sc) sc.emit('game-start'); } catch(_){ }

      const mgrEl = document.querySelector('#horseManager');
      if (mgrEl) mgrEl.setAttribute('visible', 'false');
      window.horsesPassed = 0;
      window.currentWave = 1;
      window.horseSpeed = 10;
  window.shellSpeed = 20; // slower shells by default
      window.horsesPassedInWave = 0;
      window.horsesSpawnedInWave = 0;
      window.waveTransitioning = false;
  window.finaleCooldownWave = null;
  window.shellWaveActive = false;
      console.log(`[Menu] Start -> Wave ${window.currentWave}, quota=${waveQuota(window.currentWave)}, baseSpeed=${window.horseSpeed}`);
      const waveLabel = document.querySelector('#waveLabel');
      if (waveLabel) waveLabel.setAttribute('value', 'Wave 1');
      if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();
      const introDirector = document.querySelector('#introDirector');
      if (introDirector) introDirector.emit('start-intro');
    });
  }
});
