AFRAME.registerComponent('ground-loop', {
  schema: {
    count: {type: 'int', default: 3},
    speed: {type: 'number', default: 30},
    segmentLength: {type: 'number', default: 60}
  },
  init: function () {
  this.paused = true;
  this._setupDone = false;
  this.el.sceneEl.addEventListener('loaded', () => this.setup());

  if (this.el.sceneEl.hasLoaded) this.setup();
  },
  setup: function () {
    try {
      const parent = this.el;
      let base = document.querySelector('#groundEntity');
      if (!base) base = parent.querySelector('[gltf-model="#ground"]');
      if (!base) {
        console.warn('ground-loop: no base ground entity found (#groundEntity or gltf-model="#ground")');
        return;
      }

      this.segs = Array.from(parent.querySelectorAll('.ground-seg'));
      if (this.segs.length === 0) {
        base.classList.add('ground-seg');
        this.segs = [base];
      }

      for (let i = this.segs.length; i < this.data.count; i++) {
        const clone = base.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('ground-seg');
        parent.appendChild(clone);
        this.segs.push(clone);
      }

      const startZ = this.segs[0].object3D.position.z || -20;
      for (let i = 0; i < this.segs.length; i++) {
        const s = this.segs[i];
        const pos = s.object3D.position;
        pos.z = startZ + i * this.data.segmentLength;
        s.object3D.position.set(pos.x, pos.y, pos.z);
      }

      this.player = document.querySelector('#player');
      this.lastTime = performance.now();
      this._setupDone = true;
    } catch (e) {
      console.error('ground-loop setup failed', e);
    }
  },
  tick: function (time, delta) {
    if (this.paused) return;
    if (!this.segs || this.segs.length === 0) return;
    const dt = delta / 1000;
    const speed = this.data.speed;
    for (const s of this.segs) {
      const pos = s.object3D.position;
      pos.z += dt * speed;
      s.object3D.position.set(pos.x, pos.y, pos.z);
    }

    let minZ = Infinity;
    for (const s of this.segs) {
      const z = s.object3D.position.z;
      if (z < minZ) minZ = z;
    }

    const playerZ = (this.player && this.player.object3D) ? this.player.object3D.position.z : 0;

    const threshold = playerZ + this.data.segmentLength / 2;
    for (const s of this.segs) {
      const pos = s.object3D.position;
      if (pos.z > threshold) {
        pos.z = minZ - this.data.segmentLength;
        s.object3D.position.set(pos.x, pos.y, pos.z);
        minZ = Math.min(minZ, pos.z);
      }
    }
  }
});

AFRAME.registerComponent('ground-loop-controls', {});