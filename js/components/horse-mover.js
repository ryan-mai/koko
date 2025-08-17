if (!window.AFRAME) {
  console.error('A-Frame not loaded!');
}

AFRAME.registerComponent('horse-mover', {
  schema: {
    extraSpeed: {type: 'number', default: 0},
  active: {type: 'boolean', default: false},
  endZ: {type: 'number', default: 0}
  },
  init: function () {
  this.endZ = 0;
  },
  tick: function(timer, delta) {
    if (!this.el.object3D) return;
    if (!this.data.active) return;

  let base = Number(window.horseSpeed || 30);
  let extra = Number(this.data.extraSpeed || 0);
  let speedNow = base + extra;
  if (!isFinite(speedNow)) speedNow = base;
  if (speedNow < 0) speedNow = 0; 
    const pos = this.el.object3D.position;
    pos.z += (delta / 1000) * speedNow;

  const endZ = (typeof this.data.endZ === 'number') ? this.data.endZ : this.endZ;
  if (pos.z >= endZ) {
      this.el.emit('needs-respawn');
    }
  }
});