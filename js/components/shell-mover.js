AFRAME.registerComponent('shell-mover', {
  schema: {
    extraSpeed: {type: 'number', default: 0},
    active: {type: 'boolean', default: false},
    target: {type: 'vec3', default: {x:0,y:0,z:0}}
  },
  init: function () {
    this.endZ = 0;
    this.dir = null;
    this._started = false;
  try { console.log('[ShellMover] init for', this.el); } catch(_){ }
  },
  update: function (oldData) {
    if (!oldData) return;
    const targetChanged = oldData.target && (
      oldData.target.x !== this.data.target.x ||
      oldData.target.y !== this.data.target.y ||
      oldData.target.z !== this.data.target.z
    );
    if (oldData.active !== this.data.active || targetChanged) {
      this._started = false;
      this.dir = null;
    }
  },
  tick: function (time, delta) {
    if (!this.el.object3D) return;
    if (!this.data.active) return;
    const speedNow = (window.shellSpeed || 40) + this.data.extraSpeed;
    const pos = this.el.object3D.position;

    if (!this._started) {
      this._started = true;
      const t = this.data.target || {x:0,y:0,z:0};
  try { console.log('[ShellMover] start', this.el.id || this.el, 'from', pos, 'to', t, 'extraSpeed', this.data.extraSpeed); } catch(_){ }
      if (t.x !== 0 || t.y !== 0 || t.z !== 0) {
        try {
          this.dir = new THREE.Vector3(t.x - pos.x, t.y - pos.y, t.z - pos.z).normalize();
          this.endZ = t.z;
        } catch (e) { this.dir = null; }
      }
    }

    if (this.dir) {

  const step = (delta/1000) * speedNow;
  pos.x += this.dir.x * step;
  pos.y += this.dir.y * step;
  pos.z += this.dir.z * step;

      try {
        const player = document.querySelector('#player');

        if (window.playerInvulnerable) {

        } else if (player && player.object3D) {
          const ppos = player.object3D.position;
          const dx = pos.x - ppos.x, dy = pos.y - ppos.y, dz = pos.z - ppos.z;
          const distSq = dx*dx + dy*dy + dz*dz;
          const hitRadius = 1.4; 
          if (distSq <= hitRadius * hitRadius) {
            try {

              try { window.playerInvulnerable = true; } catch(_){}
              const scene = this.el.sceneEl || document.querySelector('a-scene');
              if (scene) scene.emit('player-hit', { target: this.el });
            } catch(_){ }
            try { this.el.emit('needs-respawn'); } catch(_){}
            return;
          }
        }
      } catch (e) {  }

      if ((this.dir.z >= 0 && pos.z >= this.endZ) || (this.dir.z < 0 && pos.z <= this.endZ)) {
        try { console.log('[ShellMover] reached target, emitting needs-respawn', this.el.id || this.el); } catch(_){}
        this.el.emit('needs-respawn');
      }
    } else {

      pos.z += (delta / 1000) * speedNow;
      if (pos.y < -10) { 
        try { console.log('[ShellMover] fell below world, emitting needs-respawn', this.el.id || this.el); } catch(_){}
        this.el.emit('needs-respawn');
      } else if (pos.z >= this.endZ) { try { console.log('[ShellMover] reached endZ fallback, emitting needs-respawn', this.el.id || this.el); } catch(_){} this.el.emit('needs-respawn'); }
    }
  }
});