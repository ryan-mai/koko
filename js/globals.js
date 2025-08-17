let currentWave = 1;
let horsesPassed = 0;
let horseSpeed = 30;
let shellSpeed = 20; // default slower shell speed

window.currentWave = currentWave;
window.horsesPassed = horsesPassed;
window.horseSpeed = horseSpeed;
window.shellSpeed = shellSpeed;

window.finaleRunning = false;
window.gameStarted = false;

let horsesPassedInWave = 0;
let horsesSpawnedInWave = 0;
let waveTransitioning = false;

function waveQuota(w) { return 4 + (w || window.currentWave); }
window.waveQuota = waveQuota;

function updateWaveLabel() {
  const waveLabel = document.querySelector('#waveLabel');
  if (waveLabel) {
    if (waveLabel.components && waveLabel.components['troika-text']) {
      waveLabel.setAttribute('troika-text', { value: `wave ${window.currentWave}` });
    } else {
      waveLabel.setAttribute('value', `Wave ${window.currentWave}`);
    }
  }
  if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();
}
window.updateWaveLabel = updateWaveLabel;

function updateHorsesLeftLabel() {
  const txt = document.querySelector('#horsesLeftLabel');
  if (!txt) return;
  const quota = (window.waveQuota ? window.waveQuota(window.currentWave) : 5);
  const passedWave = window.horsesPassedInWave || 0;
  const left = Math.max(0, quota - passedWave);
  if (txt.components && txt.components['troika-text']) {
    txt.setAttribute('troika-text', { value: `${left} to next wave` });
  } else {
    txt.setAttribute('value', `${left} to next wave`);
  }
}
window.updateHorsesLeftLabel = updateHorsesLeftLabel;

function incrementWave() {
  // Called after the 2s delay
  window.currentWave = (window.currentWave || 1) + 1;
  window.horseSpeed = (window.horseSpeed || 30) + 5;

  // Reset per-wave counters for the new wave
  window.horsesPassedInWave = 0;
  window.horsesSpawnedInWave = 0;

  updateWaveLabel();
  if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();

  const mgrEl = document.querySelector('#horseManager');
  const mgr = mgrEl && mgrEl.components && mgrEl.components['horse-manager'];
  if (mgr) {
    if (window.gameStarted) { mgr.planEvents(); mgr.fillFromPlan(); }
  }
  console.log(`[Game] Wave advanced -> Wave ${window.currentWave}, quota=${waveQuota(window.currentWave)}, baseSpeed=${window.horseSpeed}`);
}
window.incrementWave = incrementWave;

try {
  if (window.THREE && THREE.DRACOLoader) {
    // r164 legacy examples loader exposes class with setDecoderPath static
    if (typeof THREE.DRACOLoader.setDecoderPath === 'function') {
      THREE.DRACOLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    }
  }
} catch(e) { console.warn('[Globals] DRACO config skipped', e); }
