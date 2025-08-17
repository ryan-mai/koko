AFRAME.registerComponent('player-collision', {
  schema: {

    targetSelector: { type: 'string', default: '.car, .shell-proj' },
    radius: { type: 'number', default: 1.0 },
    checkInterval: { type: 'number', default: 100 } 
  },
  init() {
    this.lastCheck = 0;
    this.playerPos = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
  },
  tick(time, delta) {

  if (!window.gameStarted) return;

  if (window.playerInvulnerable) return;
  if (time - this.lastCheck < this.data.checkInterval) return;
    this.lastCheck = time;

    if (!this.el.object3D) return;
    this.el.object3D.getWorldPosition(this.playerPos);

    const targets = document.querySelectorAll(this.data.targetSelector);
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];

      try {
        if (t.getAttribute && t.getAttribute('visible') === false) continue;
        if (t.components && t.components['shell-mover'] && t.components['shell-mover'].data) {
          if (!t.components['shell-mover'].data.active) continue;
        }

        if (t.classList && t.classList.contains('shell-proj') && !(t.components && t.components['shell-mover'])) continue;
      } catch(_) {}
      if (!t.object3D) continue;
      t.object3D.getWorldPosition(this.targetPos);
      const distSq = this.playerPos.distanceToSquared(this.targetPos);
      const tRadius = parseFloat(t.getAttribute('collision-radius')) || 0.5;
      const r = this.data.radius + tRadius;
      if (distSq <= r * r) {

        try {
          const isShell = t.classList && t.classList.contains('shell-proj');
          const isHorse = t.classList && t.classList.contains('car');
          const vis = t.getAttribute && t.getAttribute('visible');
          const sm = t.components && t.components['shell-mover'];
          console.log('player-collision: hit', { node: t, isShell, isHorse, visible: vis, shellActive: !!(sm && sm.data && sm.data.active), pos: (t.object3D && t.object3D.position && t.object3D.position.toArray ? t.object3D.position.toArray() : t.object3D && t.object3D.position) });
        } catch(_){}
        try {
          this.el.emit('player-hit', { target: t });
        } catch(_) {}
        try {
          const scene = this.el.sceneEl || document.querySelector('a-scene');
          if (scene) scene.emit('player-hit', { target: t });
        } catch(_) {}
        return;
      }
    }
  }
});