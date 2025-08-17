AFRAME.registerComponent('finale-director', {
  init: function () {

    this.shellTimer = null;
    this._spawnerStarted = false;
    this._finishBound = false;
    this._advanceDone = false;
    this._progressListener = null;
    this._finishListener = null;

    this.onFinale = this.onFinale.bind(this);

    try { console.log('[FinaleDirector] init - attaching finale-start listener'); } catch (e) {}
    var scene = (this.el && this.el.sceneEl) ? this.el.sceneEl : document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('finale-start', this.onFinale);
    } else {
      document.addEventListener('loaded', function onLoaded() {
        var sc = document.querySelector('a-scene');
        if (sc) sc.addEventListener('finale-start', this.onFinale);
        document.removeEventListener('loaded', onLoaded);
      }.bind(this));
    }
  },

  remove: function () {
    try {
      var sc = (this.el && this.el.sceneEl) ? this.el.sceneEl : document.querySelector('a-scene');
      if (sc) sc.removeEventListener('finale-start', this.onFinale);
    } catch (e) {}
    if (this.shellTimer) clearInterval(this.shellTimer);
    try {
      var mgr = document.querySelector('[shell-manager]');
      if (mgr && mgr.components && mgr.components['shell-manager']) mgr.components['shell-manager'].stopSpawner();
    } catch (e) {}
    try { if (this._progressListener) document.removeEventListener('shells-progress', this._progressListener); } catch(_){}
    try { if (this._finishListener) document.removeEventListener('shells-finished', this._finishListener); } catch(_){}
  },

  _bindShellListenersOnce: function(horsesLeftBg, horsesLeftLabel) {
    if (this._finishBound) return;
    this._finishBound = true;
    var self = this;

    this._progressListener = function(ev) {
      try {
        var d = (ev && ev.detail) || {};
        var left = Math.max(0, (d.total || 0) - (d.fired || 0));
        var label = horsesLeftLabel || document.querySelector('#horsesLeftLabel');
        if (label) {
          var val = left + ' shells left';
          if (label.components && label.components['troika-text']) label.setAttribute('troika-text', { value: val });
          else label.setAttribute('value', val);
        }
      } catch(_){ }
    };
    document.addEventListener('shells-progress', this._progressListener);

    this._finishListener = function() {
      if (self._advanceDone) return;
      self._advanceDone = true;
      try { console.log('[Finale] shells-finished -> advance wave and resume horses'); } catch(_){ }
      try { document.removeEventListener('shells-progress', self._progressListener); } catch(_){ }
      try { document.removeEventListener('shells-finished', self._finishListener); } catch(_){ }

      try { if (typeof window.updateWaveLabel === 'function') window.updateWaveLabel(); } catch(_){ }
      try { if (typeof window.updateHorsesLeftLabel === 'function') window.updateHorsesLeftLabel(); } catch(_){ }
      try { if (horsesLeftBg) horsesLeftBg.setAttribute('visible', 'true'); } catch(_){ }
      try { if (horsesLeftLabel) horsesLeftLabel.setAttribute('visible', 'true'); } catch(_){ }

      try { if (typeof window.incrementWave === 'function') window.incrementWave(); } catch(_){ }

      try {
        var mgr = document.querySelector('#horseManager');
        if (mgr) {
          mgr.setAttribute('visible', 'true');
          var comp = mgr.components && mgr.components['horse-manager'];
          if (comp) {
            try { if (typeof comp.resume === 'function') comp.resume(); } catch(_){}
            try { if (typeof comp.fillFromPlan === 'function') comp.fillFromPlan(); } catch(_){}
          }
        }
      } catch(_){ }

      try { window.finaleRunning = false; window.waveTransitioning = false; window.shellWaveActive = false; } catch(_){ }
      try { var pc2 = document.querySelector('#playerCam'); if (pc2) { pc2.removeAttribute('animation__finale_cam'); pc2.removeAttribute('animation__ease_after_cannons'); pc2.removeAttribute('animation__move'); pc2.setAttribute('position','0 4.5 1.5'); } } catch(_){ }
    };
    document.addEventListener('shells-finished', this._finishListener);
  },

  _startShellVolley: function(cannonPositions, parentEl, horsesLeftBg, horsesLeftLabel) {
    var mgrEl = document.querySelector('[shell-manager]');
    var self = this;
    var shellsTotal = 12;
    if (!mgrEl) {
      mgrEl = document.createElement('a-entity');
      mgrEl.setAttribute('shell-manager', 'poolSize: 6; maxActive: 3; shellSelector: #shell');
      (parentEl || this.el.sceneEl || document.body).appendChild(mgrEl);
      var onCompInit = function(evt) {
        if (evt && evt.detail && evt.detail.name === 'shell-manager') {
          try {
            var comp = mgrEl.components && mgrEl.components['shell-manager'];
            if (comp && !self._spawnerStarted) {
              comp.createPool(parentEl);
              comp.startSpawner(cannonPositions, { interval: 450, jitter: 140, duration: null, total: shellsTotal, batchMax: 2 });
              self._spawnerStarted = true;
            }
          } catch(e) { console.warn('[Finale] failed to start shell-manager on componentinitialized', e); }
          try { self._bindShellListenersOnce(horsesLeftBg, horsesLeftLabel); } catch(_){ }
          try { mgrEl.removeEventListener('componentinitialized', onCompInit); } catch(_){ }
        }
      };
      mgrEl.addEventListener('componentinitialized', onCompInit);
    }
    var compNow = mgrEl.components && mgrEl.components['shell-manager'];
    if (compNow && compNow.initialized && !this._spawnerStarted) {
      try { compNow.createPool(parentEl); compNow.startSpawner(cannonPositions, { interval: 450, jitter: 140, duration: null, total: shellsTotal, batchMax: 2 }); this._spawnerStarted = true; } catch(e){ console.warn('[Finale] startSpawner immediate failed', e); }
      try { this._bindShellListenersOnce(horsesLeftBg, horsesLeftLabel); } catch(_){ }
    }
  },

  onFinale: function () {
    if (!window.gameStarted) { try { console.log('[Finale] ignored finale-start because game not started'); } catch(_){} return; }
    try { console.log('[Finale] onFinale - wave=', window.currentWave, 'finaleRunning=', window.finaleRunning); } catch(_){ }

    this._spawnerStarted = false;
    this._finishBound = false;
    this._advanceDone = false;

    window.finaleRunning = true;
    window.waveTransitioning = true;
    if (!window.shellWaveActive) {
      try { if (typeof window.incrementWave === 'function') { window.incrementWave(); console.log('[Finale] advanced to shell wave -> Wave', window.currentWave); } } catch(_){ }
      window.shellWaveActive = true;
    }

    var playerCam = null;
    try {
      playerCam = document.querySelector('#playerCam');
      if (playerCam) {
        try { playerCam.removeAttribute('animation__finale_cam'); playerCam.removeAttribute('animation__ease_after_cannons'); playerCam.removeAttribute('animation__move'); } catch(_){ }
        playerCam.setAttribute('animation__finale_cam', 'property: position; to: 0 65 -90; dur: 1400; easing: easeInOutQuad');
        setTimeout(function () { try { playerCam.setAttribute('position', '0 85 -100'); } catch(_){ } }, 1500);
      }
    } catch (e) { console.warn('finale camera move failed', e); }

    var waveLabel = document.querySelector('#waveLabel');
    var horsesLeftBg = document.querySelector('#horsesLeftBg');
    var horsesLeftLabel = document.querySelector('#horsesLeftLabel');
    try {
      if (waveLabel) {
        var waveText = 'wave ' + ((window.currentWave||1));
        if (waveLabel.components && waveLabel.components['troika-text']) waveLabel.setAttribute('troika-text', { value: waveText });
        else waveLabel.setAttribute('value', waveText);
      }
    } catch(_){ }
    try {
      if (horsesLeftBg) horsesLeftBg.setAttribute('visible', 'true');
      if (horsesLeftLabel) {
        horsesLeftLabel.setAttribute('visible', 'true');
        var txt0 = 'BOMBS AWAY LOOK UP...';
        if (horsesLeftLabel.components && horsesLeftLabel.components['troika-text']) horsesLeftLabel.setAttribute('troika-text', { value: txt0 });
        else horsesLeftLabel.setAttribute('value', txt0);
      }
    } catch(_){ }

    var mgrEl = document.querySelector('#horseManager');
    if (mgrEl) {
      try { console.log('[Finale] hiding horseManager and pausing it'); } catch(_){ }
      mgrEl.setAttribute('visible', 'false');
      var mgrComp = mgrEl.components && mgrEl.components['horse-manager'];
      if (mgrComp && typeof mgrComp.pause === 'function') { try { mgrComp.pause(); } catch(_){ } }
    }
    try { var gl = document.querySelector('#game-entities'); if (gl && gl.components && gl.components['ground-loop']) gl.components['ground-loop'].paused = true; } catch (e) { console.warn('pause ground-loop failed', e); }

    var parent = document.querySelector('#game-entities') || (this.el && this.el.sceneEl) || document.body;

    try { var wallA = document.querySelector('#wallEntity'); if (wallA) wallA.setAttribute('visible', 'true'); var wallB = document.querySelector('#mapEntity'); if (wallB) wallB.setAttribute('visible', 'true'); } catch (e) { console.warn('show wall for cannon sequence failed', e); }
    try {
      if (!document.querySelector('#wallEntity')) {
        var map = document.createElement('a-entity');
        map.setAttribute('id', 'mapEntity');
        map.setAttribute('gltf-model', '#wall');
        map.setAttribute('position', '0 0 -100');
        map.setAttribute('scale', '1 1 1');
        parent.appendChild(map);
      }
    } catch (e) { console.warn('finale recreate map failed', e); }

    var cfgs = [
      {x:0, y:108.5, z:-105, rotation:'0 180 0', scale: '10 10 10'},
      {x:28, y:105, z:-104, rotation:'0 175 0', scale: '8 8 8'},
      {x:-28, y:105, z:-104, rotation:'0 190 0', scale: '8 8 8'}
    ];

    var createdCannons = cfgs.map(function(c, i){
      var e = document.createElement('a-entity');
      e.setAttribute('id', 'finale-cannon-' + i);
      e.setAttribute('gltf-model', '#cannon');
      e.setAttribute('rotation', c.rotation);
      e.setAttribute('scale', c.scale);
      e.setAttribute('position', c.x + ' ' + c.y + ' ' + c.z);
      e.setAttribute('visible', 'true');
      var loaded = false;
      e.addEventListener('model-loaded', function(){ loaded = true; });
      e.addEventListener('model-error', function(){ try{ e.setAttribute('geometry','primitive: cylinder; radius:2; height:6'); e.setAttribute('material','shader: flat; color: #444'); }catch(_){} });
      setTimeout(function(){ if (!loaded) { try{ e.setAttribute('geometry','primitive: cylinder; radius:2; height:6'); e.setAttribute('material','shader: flat; color: #444'); }catch(_){} } }, 1000);
      parent.appendChild(e);
      try{ console.log('[Finale] Cannon created', i, c, 'entity=', e); } catch(_){ }
      return { el: e, cfg: c };
    });

    var self = this;
    setTimeout(function(){
      createdCannons.forEach(function(cannon, i){
        var el = cannon.el; var cfg = cannon.cfg;
        try {
          console.log('[Finale] starting fall animation for', el.id || i, cfg, 'el=', el);
          el.setAttribute('animation__fall', { property: 'position', to: cfg.x + ' ' + (cfg.y - 50) + ' ' + cfg.z, dur: 1000, easing: 'easeInCubic' });
        } catch (e) { console.warn('[Finale] failed to start fall animation for', el.id || i, e); }
        try{ console.log('[Finale] Cannon fall animation started', i); } catch(_){ }
      });
    }, 2000);

    (function orchestrateAfterCannons(){
      if (!createdCannons || createdCannons.length === 0) {
        try{ var g = document.querySelector('#game-entities'); if (g && g.components && g.components['ground-loop']) g.components['ground-loop'].paused = false; }catch(e){ console.warn('resume ground-loop failed', e); }
        return;
      }
      var remaining = createdCannons.length;
      var cannonDone = function(){
        this.removeEventListener('animationcomplete__fall', cannonDone);
        try{ console.log('[Finale] Cannon fall complete', this.id || this); } catch(_){ }
        remaining -= 1; if (remaining > 0) return;
        try{
          console.log('[Finale] all cannons complete - scheduling post-cannon sequence');
          setTimeout(function(){
            console.log('[Finale] post-cannon sequence - playerCam exists?', !!playerCam);
            if (playerCam) {
              try { console.log('[Finale] starting camera ease after cannons'); } catch(_){ }
              playerCam.setAttribute('animation__ease_after_cannons', 'property: position; to: 0 70 -95; dur: 600; easing: easeInOutQuad');
              var onEase = function(){
                try{ console.log('[Finale] camera ease complete'); } catch(_){ }
                playerCam.removeEventListener('animationcomplete__ease_after_cannons', onEase);
                if (!window.finaleRunning) {
                  try { console.log('[Finale] finale cancelled during onEase; aborting'); } catch(_){ }
                  try{ var g = document.querySelector('#game-entities'); if (g && g.components && g.components['ground-loop']) g.components['ground-loop'].paused = false; }catch(_){ }
                  return;
                }
                var doMoveBack = function(){
                  try{ console.log('[Finale] moving camera back'); } catch(_){ }
                  playerCam.setAttribute('animation__move', { property: 'position', to: '0 4.5 1.5', dur: 1000, easing: 'easeInCubic' });
                  var onMoveDone = function(){
                    try{ console.log('[Finale] camera move back complete; starting shells'); } catch(_){ }
                    playerCam.removeEventListener('animationcomplete__move', onMoveDone);
                    if (!window.finaleRunning) {
                      try { console.log('[Finale] finale cancelled during onMoveDone; aborting shells'); } catch(_){ }
                      try{ var g2 = document.querySelector('#game-entities'); if (g2 && g2.components && g2.components['ground-loop']) g2.components['ground-loop'].paused = false; }catch(_){ }
                      return;
                    }
                    try {
                      var cannonPositions = createdCannons.map(function(c){ return c.el.object3D ? c.el.object3D.position.clone() : new THREE.Vector3(c.cfg.x, c.cfg.y, c.cfg.z); });
                      self._startShellVolley(cannonPositions, parent, horsesLeftBg, horsesLeftLabel);
                    } catch ( e) { console.warn('spawn shells failed', e); }
                    try{ var gl2 = document.querySelector('#game-entities'); if (gl2 && gl2.components && gl2.components['ground-loop']) gl2.components['ground-loop'].paused = false; }catch(e){ console.warn('resume ground-loop failed', e); }

                    try{
                      createdCannons.forEach(function(c){ try { if (c && c.el) { c.el.setAttribute('visible', 'false'); c.el.removeAttribute('gltf-model'); } } catch(_){ } });
                    } catch(_){ }
                    try{ var wA = document.querySelector('#wallEntity'); if (wA) wA.setAttribute('visible','false'); var wB = document.querySelector('#mapEntity'); if (wB) wB.setAttribute('visible','false'); }catch(_){ }
                  };
                  playerCam.addEventListener('animationcomplete__move', onMoveDone);
                };
                setTimeout(doMoveBack, 800);
              };
              playerCam.addEventListener('animationcomplete__ease_after_cannons', onEase);
            } else {
              try{ var g3 = document.querySelector('#game-entities'); if (g3 && g3.components && g3.components['ground-loop']) g3.components['ground-loop'].paused = false; }catch(e){ console.warn('resume ground-loop failed', e); }
            }
          }, 200);
        } catch(e) { console.warn('post-cannon sequence failed', e); }
      };
      createdCannons.forEach(function(c){
        try{
          console.log('[Finale] attaching listeners to', c.el.id || c);
          c.el.addEventListener('animationcomplete__fall', cannonDone);
        }catch(e){ console.warn('[Finale] attach listener failed', e); }
      });
    })();
  }
});