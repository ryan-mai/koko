AFRAME.registerComponent('lane-controller', {
  init: function () {
    this.lanes = [-2, 0, 2];
    this.current = 1;
    this.el.object3D.position.set(0, 1, 0);

    this.cars = null;
    this.lastCarsRefresh = 0;
    document.addEventListener('keydown', (e) => {
      try {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          if (this.current > 0) {
            this.current--;
            this.el.object3D.position.x = this.lanes[this.current];
          }
        } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
          if (this.current < this.lanes.length - 1) {
            this.current++;
            this.el.object3D.position.x = this.lanes[this.current];
          }
        }
      } catch (e) {
        console.error('Error in lane-controller keydown:', e);
      }
    });
  },
  tick: function () {
    try {
  const playerX = this.el.object3D.position.x;
  const playerZ = this.el.object3D.position.z;

      const time = performance.now();
      if (!this.cars || this.cars.length === 0 || (time - this.lastCarsRefresh) > 2000) {
        this.cars = Array.from(document.querySelectorAll('.car'));
        this.lastCarsRefresh = time;
      }
      for (let obs of this.cars) {
        const pos = obs.object3D.position; 
        if (Math.abs(pos.x - playerX) < 0.9 && Math.abs(pos.z - playerZ) < 0.9) {

          let laneIndex = this.lanes.indexOf(Math.round(pos.x));
          let laneName = laneIndex === 0 ? 'left' : laneIndex === 1 ? 'center' : laneIndex === 2 ? 'right' : 'unknown';
          console.log(`Horse touched the player in lane: ${laneName} (x=${pos.x})`);

          try { this.el.emit('player-hit', { target: obs }); } catch(_){}
          try { const scene = this.el.sceneEl || document.querySelector('a-scene'); if (scene) scene.emit('player-hit', { target: obs }); } catch(_){}
          this.current = 1;
          this.el.object3D.position.set(this.lanes[this.current], 1, 0);
        }
      }
    } catch (e) {
      console.error('Error in lane-controller tick:', e);
    }
  }
});