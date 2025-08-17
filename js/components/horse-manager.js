AFRAME.registerComponent('horse-manager', {
  schema: {
    poolSize: {type: 'number', default: 9},
    startZ: {type: 'number', default: -200},
    planCount: {type: 'number', default: 40},

  maxActive: {type: 'number', default: 5},
    zJitter: {type: 'number', default: 20},
    minGapZ: {type: 'number', default: 50}
  },
  init: function () {
    this.paused = false;
    this.lanes = [-2, 0, 2];
    this.pool = [];
    this.free = []; 
    this.events = []; 
    this.nextEventIdx = 0;
    this.replanCounter = 0;
    this.waveDoneTriggered = false;

    for (let i = 0; i < this.data.poolSize; i++) {
      const horse = document.createElement('a-entity');
      horse.classList.add('car');
      horse.setAttribute('gltf-model', 'assets/obstacles/Horse_Running.glb');
      horse.setAttribute('scale', '0.04 0.04 0.04');
      horse.setAttribute('position', `0 0.5 ${this.data.startZ}`);
      horse.setAttribute('rotation', '0 0 0');
      horse.addEventListener('model-loaded', () => {
        try {
          if (horse.object3D && horse.object3D.rotation) {
            horse.object3D.rotation.set(0, Math.PI, 0);
          }
          horse.object3D.traverse((child) => {
            try { if (child && child.rotation) child.rotation.set(0, Math.PI, 0); } catch(_){}
          });
        } catch (_) {}
      });
      horse.setAttribute('animation-mixer', 'clip: *; timeScale: 2');
      horse.setAttribute('horse-mover', 'active: false; extraSpeed: 0');
      horse.object3D.visible = false;
      horse.setAttribute('horse-id', (i+1));
      horse.addEventListener('needs-respawn', () => this.recycleHorse(horse));
      this.el.appendChild(horse);
      this.pool.push(horse);
      this.free.push(i);
    }
    console.log('[HorseManager] init complete. poolSize=', this.data.poolSize);
    const startNow = !!window.gameStarted;
    const scene = (this.el && this.el.sceneEl) ? this.el.sceneEl : document.querySelector('a-scene');
    const startFn = () => {
      try {
        if (this.paused) this.paused = false;
        this.planEvents();
        this.fillFromPlan();
      } catch(e) { console.warn('[HorseManager] start after game-start failed', e); }
    };
    if (startNow) {
      startFn();
    } else if (scene) {
      this._onGameStart = () => { try { startFn(); } finally { try { scene.removeEventListener('game-start', this._onGameStart); } catch(_){} } };
      scene.addEventListener('game-start', this._onGameStart);
    }
    this.lastSpawnAt = Date.now();
    this.stallTimer = setInterval(() => {
      try {
  if (!window.gameStarted || window.finaleRunning || this.paused || window.waveTransitioning) return;
        const quota = (window.waveQuota ? window.waveQuota(window.currentWave) : 5);
        if ((window.horsesSpawnedInWave || 0) >= quota) return;
        const active = this.pool.length - this.free.length;
        if (this.free.length === 0 || active >= this.data.maxActive) return;
        const now = Date.now();

        if (now - (this.lastSpawnAt || 0) >= 900) {

          const lane = (Math.random() < 0.7) ? this.getPlayerLane() : [0,1,2][Math.floor(Math.random()*3)];
          const ok = this.spawnHorseInLane(lane);
          if (!ok) console.warn('[HorseManager] forced spawn failed (no free horses)');
        }
      } catch (e) {
        console.warn('stallTimer error', e)
      }
    }, 500);
  },
  remove: function () {
    if (this.stallTimer) clearInterval(this.stallTimer);
  },
  reset: function () {
    this.free = [];
    for (let i = 0; i < this.pool.length; i++) {
      const h = this.pool[i];
  h.object3D.position.set(0, 0.5, this.data.startZ);
  try { h.setAttribute('rotation', '0 0 0'); } catch(_){}
      h.object3D.visible = false;
      h.setAttribute('horse-mover', 'active: false; extraSpeed: 0');
      this.free.push(i);
    }
    this.waveDoneTriggered = false;

  if (window.updateWaveLabel) window.updateWaveLabel();
  if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();
  if (window.gameStarted) { this.planEvents(); this.fillFromPlan(); }

  this.paused = false;

  },
  pause: function () {
    this.paused = true;
    try {
      for (let i = 0; i < this.pool.length; i++) {
        const h = this.pool[i];
        if (!h) continue;
        h.setAttribute('horse-mover', 'active: false; extraSpeed: 0');
        h.object3D.visible = false;
      }
      this.free = this.pool.map((_,i)=>i);
    } catch (e) { console.warn('pause error', e); }
  },
  resume: function () {
    this.paused = false;
    this.planEvents();
    this.fillFromPlan();
  },
  getPlayerLane: function () {
    try {
      const player = document.querySelector('#player');
      const x = player && player.object3D ? player.object3D.position.x : 0;
      let idx = 0, bestDist = Infinity;
      for (let i = 0; i < this.lanes.length; i++) {
        const d = Math.abs(this.lanes[i] - x);
        if (d < bestDist) { bestDist = d; idx = i; }
      }
      return idx;
    } catch (e) { return 1; }
  },
  currentMinGap: function () {

    return 35;
  },
  planEvents: function () {
    this.events = [];
    this.nextEventIdx = 0;
    const gap = this.currentMinGap();
    const jitter = this.data.zJitter || 0;
    const startZ = this.data.startZ;

    const count = this.data.planCount;
    const playerLane = this.getPlayerLane();
    const wave = window.currentWave || 1;

  const twoLaneProb = Math.min(0.45 + 0.12 * (wave - 1), 0.9);
  const threeLaneProb = Math.min(0.15 + 0.10 * (wave - 1), 0.45);
  const repeatLaneProb = Math.min(0.15 + 0.08 * (wave - 1), 0.25);

    let z = startZ;

    const player = document.querySelector('#player');

    try {
      const wave = (window.currentWave || 1);
      if (player && player.object3D) {
        const px = player.object3D.position.x;
        const py = player.object3D.position.y;
        const pz = -5 * (wave - 1);
        player.object3D.position.set(px, py, pz);
      }
    } catch (e) { console.warn('player shift per-wave failed', e); }
    const endZ = (player && player.object3D) ? player.object3D.position.z : 0;
    let lastChosen = null;
    for (let i = 0; i < count && z < endZ - 5; i++) {

      let lanesToUse = [];
      const useThree = Math.random() < threeLaneProb;
      const useTwo = !useThree && (Math.random() < twoLaneProb);
      if (useThree) {

        lanesToUse = [playerLane, 0, 1, 2].filter((v,i,a)=> a.indexOf(v)===i).slice(0,3);
      } else if (useTwo) {

        lanesToUse.push(playerLane);

        const others = [0,1,2].filter(L => L !== playerLane);

        const prefer = playerLane === 1 ? others[0] : 1;
        const second = (Math.random() < 0.6) ? prefer : others[Math.floor(Math.random()*others.length)];
        if (!lanesToUse.includes(second)) lanesToUse.push(second);

        lanesToUse = lanesToUse.slice(0,2);

        if (Math.random() < 0.5) lanesToUse.reverse();
      } else {

        const pickPlayer = Math.random() < 0.65;
        let lane = pickPlayer ? playerLane : [0,1,2].filter(L=>L!==playerLane)[Math.floor(Math.random()*2)];

        if (lastChosen !== null && Math.random() < repeatLaneProb) lane = lastChosen;
        lanesToUse = [lane];
        lastChosen = lane;
      }
  this.events.push({ z, lanes: lanesToUse });

      z += gap + (jitter > 0 ? Math.random() * jitter : 0);
    }
  },
  fillFromPlan: function () {
    if (window.finaleRunning || this.paused) {
      console.log('[HorseManager] fillFromPlan skipped: finaleRunning or paused');
      return;
    }
    let active = this.pool.length - this.free.length;

    const freeSet = new Set(this.free);
    const activeZs = this.pool
      .map((h, i) => (!freeSet.has(i) ? h.object3D.position.z : null))
      .filter(z => z !== null);
    const minGap = this.data.minGapZ || 50;
    const computeSpacedZ = (baseZ) => {
      let z = baseZ;

      let safety = (activeZs.length || 0) + 5;
      while (safety-- > 0) {
        let tooClose = false;
        for (let i = 0; i < activeZs.length; i++) {
          const oz = activeZs[i];
          if (Math.abs(z - oz) < minGap) {

            z = Math.min(z, oz - minGap);
            tooClose = true;
          }
        }
        if (!tooClose) break;
      }
      return z;
    };

    const quota = (window.waveQuota ? window.waveQuota(window.currentWave) : 5);
    while (this.nextEventIdx < this.events.length && this.free.length > 0 && active < this.data.maxActive) {
      if (window.waveTransitioning) {
        console.log('[Spawn] Paused: waveTransitioning is true');
        break;
      }
      if ((window.horsesSpawnedInWave || 0) >= quota) {
        console.log(`[Spawn] Quota reached for Wave ${window.currentWave}: spawned=${window.horsesSpawnedInWave}/${quota}`);
        break;
      }
      const ev = this.events[this.nextEventIdx++];
      const playerLane = this.getPlayerLane();

      const orderedLanes = [...ev.lanes].sort((a,b)=> (a===playerLane? -1:0) - (b===playerLane? -1:0));
      let remaining = [];
      for (const laneIdx of orderedLanes) {
        if (this.free.length === 0 || active >= this.data.maxActive) {
          remaining.push(laneIdx);
          continue;
        }
        if ((window.horsesSpawnedInWave || 0) >= quota) {
          remaining.push(laneIdx);
          continue;
        }
        const horseIdx = this.free.pop();
        const horse = this.pool[horseIdx];

        const wave = window.currentWave || 1;
        const extra = (Math.random() * 6.9 - 4) + (wave - 1); 
        horse.setAttribute('horse-mover', `active: true; extraSpeed: ${extra.toFixed(2)}`);
        horse.setAttribute('animation-mixer', `clip: *; loop: repeat; timeScale: 2`);

        const spawnZ = computeSpacedZ(this.data.startZ);
        horse.object3D.position.set(this.lanes[laneIdx], 0.5, spawnZ);
        horse.setAttribute('horse-lane', laneIdx);
        horse.object3D.visible = true;

        try {
          const player = document.querySelector('#player');
          const endZ = (player && player.object3D) ? player.object3D.position.z : 0;
          horse.setAttribute('horse-mover', `active: true; extraSpeed: ${extra.toFixed(2)}; endZ: ${endZ}`);
        } catch(_){}

        const speedNow = (window.horseSpeed || 30) + parseFloat(extra.toFixed(2));
        console.log(`[Spawn] Wave ${window.currentWave} | spawned ${window.horsesSpawnedInWave + 1}/${quota} | lane=${laneIdx} z=${spawnZ.toFixed(1)} | speed=${speedNow.toFixed(1)} (base=${window.horseSpeed} extra=${extra.toFixed(2)})`);

        activeZs.push(spawnZ);
        active++;
  window.horsesSpawnedInWave = (window.horsesSpawnedInWave || 0) + 1;
  this.lastSpawnAt = Date.now();
      }

      if (remaining.length > 0) {
        this.events.splice(this.nextEventIdx, 0, { z: ev.z, lanes: remaining });
      }
    }
  },
  recycleHorse: function (horse) {
    try {
      window.horsesPassed = (window.horsesPassed || 0) + 1;
      window.horsesPassedInWave = (window.horsesPassedInWave || 0) + 1;

      try {
        const hid = horse && horse.getAttribute ? horse.getAttribute('horse-id') : null;
        const spawned = (window.horsesSpawnedInWave || 0);
        const passed = (window.horsesPassedInWave || 0);
        const totalPassed = (window.horsesPassed || 0);
        const quota = (window.waveQuota ? window.waveQuota(window.currentWave) : 5);
        console.log('[HorseManager] horse passed', { horseId: hid, spawnedInWave: spawned, passedInWave: passed, totalPassed, quota, currentWave: window.currentWave });
      } catch (e) { console.log('[HorseManager] horse passed (debug log failed)', e); }

      const quota = (window.waveQuota ? window.waveQuota(window.currentWave) : 5);
      const finishedWave = (window.horsesPassedInWave >= quota);
      if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();
      this.replanCounter = (this.replanCounter || 0) + 1;

      const idx = this.pool.indexOf(horse);
      if (idx !== -1) this.free.push(idx);

      horse.setAttribute('horse-mover', 'active: false; extraSpeed: 0');
      horse.object3D.visible = false;
      horse.object3D.position.set(0, 0.5, this.data.startZ);

      if (!finishedWave) {
        if (this.nextEventIdx >= this.events.length || this.replanCounter % 12 === 0) {
          this.planEvents();
        }
        if (!this.paused && !window.finaleRunning) this.fillFromPlan();
      } else if (!this.waveDoneTriggered) {
        this.waveDoneTriggered = true;
        window.waveTransitioning = true;
        console.log(`[Wave] Completed Wave ${window.currentWave}. Waiting 2s before next wave...`);
        setTimeout(() => {
          window.waveTransitioning = false;
          this.waveDoneTriggered = false;

          const FINAL_WAVE = (typeof window !== 'undefined' && window.FINAL_WAVE != null) ? window.FINAL_WAVE : 10;
          const cur = (window.currentWave || 1);
          if (cur === FINAL_WAVE && window.finaleCooldownWave !== cur) {
            window.finaleCooldownWave = cur;
            console.log(`[Finale] Wave ${cur} complete. Triggering finale-start.`);
            const scene = document.querySelector('a-scene');
            if (scene) scene.emit('finale-start');
            try { document.dispatchEvent(new CustomEvent('finale-start')); } catch (e) {}
            return;
          } else {
            console.log('[Wave] Delay complete. Advancing wave.');
            window.incrementWave();
            this.planEvents();
            this.fillFromPlan();
          }
        }, 2000);
      }
    } catch (e) { console.error('recycleHorse error', e); }
  }

  ,spawnHorseInLane: function (laneIdx) {
    try {
      if ((this.free || []).length === 0) return false;
      const horseIdx = this.free.pop();
      const horse = this.pool[horseIdx];
      if (!horse) return false;
      const wave = window.currentWave || 1;
      const extra = (Math.random() * 6.9 - 4) + (wave - 1);
      horse.setAttribute('horse-mover', `active: true; extraSpeed: ${extra.toFixed(2)}`);
      horse.setAttribute('animation-mixer', `clip: *; loop: repeat; timeScale: 2`);

      const freeSet = new Set(this.free);
      const activeZs = this.pool
        .map((h, i) => (!freeSet.has(i) ? h.object3D.position.z : null))
        .filter(z => z !== null);
      const minGap = this.data.minGapZ || 50;
      const computeSpacedZ = (baseZ) => {
        let z = baseZ;
        let safety = (activeZs.length || 0) + 5;
        while (safety-- > 0) {
          let tooClose = false;
          for (let i = 0; i < activeZs.length; i++) {
            const oz = activeZs[i];
            if (Math.abs(z - oz) < minGap) {
              z = Math.min(z, oz - minGap);
              tooClose = true;
            }
          }
          if (!tooClose) break;
        }
        return z;
      };
      const spawnZ = computeSpacedZ(this.data.startZ);
      horse.object3D.position.set(this.lanes[laneIdx], 0.5, spawnZ);

  try { horse.setAttribute('rotation', '0 0 0'); } catch(_){}
      horse.setAttribute('horse-lane', laneIdx);
      horse.object3D.visible = true;

      try {
        const player = document.querySelector('#player');
        const endZ = (player && player.object3D) ? player.object3D.position.z : 0;
        horse.setAttribute('horse-mover', `active: true; extraSpeed: ${extra.toFixed(2)}; endZ: ${endZ}`);
      } catch(_){}
      window.horsesSpawnedInWave = (window.horsesSpawnedInWave || 0) + 1;
      if (window.updateHorsesLeftLabel) window.updateHorsesLeftLabel();
      this.lastSpawnAt = Date.now();
      console.log(`[Spawn-forced] Wave ${window.currentWave} | spawned ${window.horsesSpawnedInWave} | lane=${laneIdx} z=${spawnZ.toFixed(1)}`);
      return true;
    } catch (e) { console.warn('spawnHorseInLane failed', e); return false; }
  }
});