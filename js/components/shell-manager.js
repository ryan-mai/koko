AFRAME.registerComponent('shell-manager', {
  schema: {
    poolSize: {type: 'int', default: 6},
    maxActive: {type: 'int', default: 3},
    shellSelector: {type: 'string', default: '#shell'}
  },
  init: function() {
    this.shellPool = [];
    this.shellFree = [];
    this.shellTimer = null;
    this._creating = false;
  this.initialized = true; 
  this._firedCount = 0;
  this._firedTotal = null; 
  this._activeCount = 0;
  this._spawnerStartedAt = 0;
  this._finishedEmitted = false;
  this._lastTickAt = 0;
  try { console.log('[ShellManager] init'); } catch(_){ }
  },
  remove: function() {
    if (this.shellTimer) clearInterval(this.shellTimer);
    (this.shellPool || []).forEach(s => {
      try { s.setAttribute('shell-mover', 'active: false; extraSpeed: 0; target: 0 0 0'); s.setAttribute('visible', 'false'); } catch(e){}
    });
    this.shellFree = this.shellPool.map((_, i) => i);
  },
  createPool: function(parentEl) {

  if (!this.shellPool) this.shellPool = [];
  if (!this.shellFree) this.shellFree = [];
  if (this.shellPool.length > 0 || this._creating) return;
    this._creating = true;
    const parent = parentEl || (this.el.sceneEl || document.body);
    const selector = this.data.shellSelector;
    const assetEl = document.querySelector(selector);
    const self = this;

  function doCreate() {
      self.shellPool = [];
      self.shellFree = [];
      for (let i=0;i<self.data.poolSize;i++) {
        const s = document.createElement('a-entity');
        s.classList.add('shell-proj');
        s.setAttribute('gltf-model', selector);
  s.setAttribute('scale', '0.15 0.15 0.15');
        s.setAttribute('visible', 'false');
        s.setAttribute('shadow', 'cast: false; receive: false');
        s.setAttribute('shell-mover', 'active: false; extraSpeed: -10');
        let loaded = false;
        s.addEventListener('model-loaded', () => {
          loaded = true;
          try { if (s.getAttribute('geometry')) s.removeAttribute('geometry'); if (s.getAttribute('material')) s.removeAttribute('material'); } catch(_){}
        });
        s.addEventListener('model-error', (ev) => {
          try { s.setAttribute('geometry', 'primitive: sphere; radius: 1.0'); s.setAttribute('material', 'shader: flat; color: #ffd166; emissive: #ffcc00'); } catch(_){ }
        });
        setTimeout(() => { if (!loaded) { try { s.setAttribute('geometry', 'primitive: sphere; radius: 1.0'); s.setAttribute('material', 'shader: flat; color: #ffd166; emissive: #ffcc00'); } catch(_){} } }, 2000);
  s.addEventListener('needs-respawn', () => self.recycle(s));
  parent.appendChild(s);
  self.shellPool.push(s);
  self.shellFree.push(i);
      }
      try { console.log('[ShellManager] pool created size=', self.shellPool.length); } catch(_){ }
      self._creating = false;
    }

    if (assetEl && !assetEl.hasLoaded) {
      const onLoaded = () => { try { assetEl.removeEventListener('loaded', onLoaded); } catch(_){} doCreate(); };
      assetEl.addEventListener('loaded', onLoaded);
  setTimeout(() => { try { assetEl.removeEventListener('loaded', onLoaded); } catch(_){} if (!self.shellPool.length) doCreate(); }, 2000);
    } else {
      doCreate();
    }
  },
  getShell: function() {
    if (!this.shellFree || this.shellFree.length === 0) return null;
    const idx = this.shellFree.pop();
  try { console.log('[ShellManager] dispensing shell idx=', idx); } catch(_){ }
    return this.shellPool[idx] || null;
  },
  recycle: function(s) {
    try {
      s.setAttribute('shell-mover', 'active: false; extraSpeed: 0; target: 0 0 0');
      s.setAttribute('visible', 'false');

  try { s.setAttribute('position', '0 -1000 0'); } catch(_) {}
  try { console.log('[ShellManager] Recycled shell', s, 'moved to', s.getAttribute('position')); } catch(_){ }
      const i = this.shellPool.indexOf(s);
      if (i !== -1 && !this.shellFree.includes(i)) this.shellFree.push(i);

      if (this._firedTotal != null) {
        const activeCount = (this.shellPool.length || 0) - (this.shellFree.length || 0);
        this._activeCount = activeCount;
        try { document.dispatchEvent(new CustomEvent('shells-progress', { detail: { fired: this._firedCount, total: this._firedTotal, active: activeCount } })); } catch(_){}
        if (this._firedCount >= this._firedTotal && activeCount === 0) {
          this._finishSpawner('recycle-complete');
        }
      }
    } catch(e) { console.warn('shell-manager recycle failed', e); }
  },
  startSpawner: function(cannonPositions, opts) {
    if (!cannonPositions || cannonPositions.length === 0) return;
    const self = this;
    const shellInterval = (opts && opts.interval) || 400; 
    const jitter = (opts && opts.jitter) || 120; 
    const shellsDuration = (opts && opts.duration) || null; 
    const totalToFire = (opts && typeof opts.total === 'number') ? Math.max(0, opts.total) : null;
    const batchMax = Math.max(1, Math.min((opts && opts.batchMax) || 2, Math.max(1, Math.min(this.data.maxActive || 3, 2))));
    const maxActive = this.data.maxActive;

    this.createPool();

    this.stopSpawner();
    this._firedCount = 0;
    this._firedTotal = totalToFire;
  this._finishedEmitted = false;
    this._spawnerStartedAt = performance.now ? performance.now() : Date.now();
    this._lastTickAt = 0;
    try { console.log('[ShellManager] startSpawner config', { shellInterval, jitter, shellsDuration, totalToFire, batchMax, maxActive, cannons: cannonPositions.length }); } catch(_){}

    function pickCannons(count) {
      const idxs = Array.from({length: cannonPositions.length}, (_, i) => i);
      for (let i = idxs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = idxs[i]; idxs[i] = idxs[j]; idxs[j] = tmp;
      }
      return idxs.slice(0, count).map(i => ({ idx: i, pos: cannonPositions[i] }));
    }

    const spawnOne = (cannonPos) => {
      const s = self.getShell();
      if (!s) { try { console.warn('[ShellManager] no free shell available to spawn'); } catch(_){} return false; }
      const startY = (cannonPos.y || 55) + 25;
      s.setAttribute('position', `${cannonPos.x} ${startY} ${cannonPos.z}`);
      const player = document.querySelector('#player');
      const playerX = player && player.object3D ? player.object3D.position.x : 0;
      const playerY = player && player.object3D ? player.object3D.position.y : 2;
  const playerZ = player && player.object3D ? player.object3D.position.z : 0;

  const target = { x: playerX, y: Math.max(1.2, playerY), z: playerZ + 0.5 };
      s.setAttribute('shell-mover', `active: true; extraSpeed: 0; target: ${target.x} ${target.y} ${target.z}`);
      s.setAttribute('visible', 'true');
      this._firedCount += 1;
      try { console.log('[ShellManager] Spawned shell', {fromCannon: cannonPos, firedCount: this._firedCount, total: this._firedTotal}); } catch(_){}
      if (this._firedTotal != null) {
        const activeCount = (this.shellPool.length || 0) - (this.shellFree.length || 0);
        this._activeCount = activeCount;
        try { document.dispatchEvent(new CustomEvent('shells-progress', { detail: { fired: this._firedCount, total: this._firedTotal, active: activeCount } })); } catch(_){}
      }
      return true;
    };

    const spawner = setInterval(() => {
      const now = performance.now ? performance.now() : Date.now();
      const activeCount = (self.shellPool.length || 0) - (self.shellFree.length || 0);
      const deficit = (maxActive || 3) - activeCount;

      if (!self._finishedEmitted && self._firedTotal != null && self._firedCount >= self._firedTotal) {
        if (activeCount === 0) {
          self._finishSpawner('total-complete');
        }
        return;
      }
      if (deficit <= 0) {
        try { console.log('[ShellManager] tick: at capacity; active=', activeCount, 'maxActive=', maxActive); } catch(_){}
        return;
      }
      const cap = Math.min(deficit, cannonPositions.length, batchMax);
      const spawnCount = Math.max(1, Math.min(cap, (Math.random() < 0.5 ? 1 : 2)));
      const picks = pickCannons(spawnCount);
      try { console.log('[ShellManager] tick', {activeCount, deficit, spawnCount, picks}); } catch(_){}
      picks.forEach((p, i) => {
        const delay = (jitter && spawnCount > 1) ? Math.floor((i * jitter) / spawnCount) : 0;
        setTimeout(() => { spawnOne(p.pos); }, delay);
      });
    }, shellInterval);

    this.shellTimer = spawner;
    if (shellsDuration != null && totalToFire == null) {
      setTimeout(() => {
        if (this.shellTimer === spawner) {
          clearInterval(spawner);
          this.shellTimer = null;
        }

        try { console.log('[ShellManager] duration complete; emitting shells-finished'); } catch(_){}
        try { document.dispatchEvent && document.dispatchEvent(new CustomEvent('shells-finished')); } catch(_){}
      }, shellsDuration);
    }
  },
  stopSpawner: function() {
    if (this.shellTimer) { clearInterval(this.shellTimer); this.shellTimer = null; }

    try {
      (this.shellPool || []).forEach(s => {
        try {
          const i = this.shellPool.indexOf(s);

          if (i !== -1 && !(this.shellFree || []).includes(i)) {
            this.recycle(s);
          }
        } catch(_) {}
      });
    } catch (e) { console.warn('[ShellManager] stopSpawner recycle failed', e); }
  }
});

AFRAME.components['shell-manager'].Component.prototype._finishSpawner = function(reason) {
  try { console.log('[ShellManager] finishSpawner', { reason, fired: this._firedCount, total: this._firedTotal }); } catch(_){}
  if (this._finishedEmitted) return;
  this._finishedEmitted = true;
  if (this.shellTimer) { clearInterval(this.shellTimer); this.shellTimer = null; }
  this._lastTickAt = performance.now ? performance.now() : Date.now();
  try { document.dispatchEvent && document.dispatchEvent(new CustomEvent('shells-finished')); } catch(_){}
};