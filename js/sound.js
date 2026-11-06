// Sound, synthesised in the browser from what the hero whale is doing.
// Not a recording: an imitation of the rhythm of sperm whale clicks and
// creaks, a blow at the surface and a low sea that thickens with depth.
(function () {
  "use strict";

  var ac = null, master = null, sea = null, seaGain = null, seaFilter = null, noiseBuf = null;
  var on = false, nextClick = 0, creakUntil = 0, nextCreak = 0;

  function noise(seconds) {
    var n = Math.floor(ac.sampleRate * seconds), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function start() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);
    noiseBuf = noise(2);
    // The sea: looped noise through a low filter, slow swell.
    sea = ac.createBufferSource();
    sea.buffer = noiseBuf;
    sea.loop = true;
    seaFilter = ac.createBiquadFilter();
    seaFilter.type = "lowpass";
    seaFilter.frequency.value = 180;
    seaFilter.Q.value = 0.7;
    seaGain = ac.createGain();
    seaGain.gain.value = 0.35;
    sea.connect(seaFilter);
    seaFilter.connect(seaGain);
    seaGain.connect(master);
    sea.start();
  }

  function click(t, loud, hi) {
    // A short broadband impulse with a little body under it.
    var src = ac.createBufferSource();
    src.buffer = noiseBuf;
    var f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = hi ? 4200 : 2600;
    f.Q.value = 1.2;
    var g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(loud, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 1.5, 0.05);
    var o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.03);
    var og = ac.createGain();
    og.gain.setValueAtTime(loud * 0.5, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(og);
    og.connect(master);
    o.start(t);
    o.stop(t + 0.05);
  }

  function blow(t) {
    var src = ac.createBufferSource();
    src.buffer = noiseBuf;
    var f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(400, t + 0.9);
    var g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t, 0, 1.1);
  }

  window.Sound = {
    enabled: function () { return on; },
    // Peak level of the last second, for checks. 0 when off.
    level: function () {
      if (!ac || !master) return 0;
      if (!window.__an) { window.__an = ac.createAnalyser(); window.__an.fftSize = 2048; master.connect(window.__an); }
      var d = new Float32Array(window.__an.fftSize); window.__an.getFloatTimeDomainData(d);
      var m = 0; for (var i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); return m;
    },
    toggle: function () {
      if (!on) { start(); on = true; master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(0.9, ac.currentTime + 1.2); }
      else { on = false; master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8); }
      return on;
    },
    // Called every frame with the hero's state: depth, slope (m/s, down positive), surfaced (true on the frame she surfaces).
    update: function (depth, slope, surfaced) {
      if (!on || !ac) return;
      var t = ac.currentTime;
      // The sea deepens with depth: lower, heavier.
      var k = Math.min(1, depth / 1200);
      seaFilter.frequency.setTargetAtTime(180 - 110 * k, t, 0.5);
      seaGain.gain.setTargetAtTime(0.3 + 0.35 * k, t, 0.5);
      if (surfaced) blow(t + 0.05);
      // Clicks: searching from 300 m down, about one a second. At the bottom, creaks.
      var searching = depth > 300;
      var atBottom = depth > 500 && Math.abs(slope) < 0.2;
      if (!searching) { nextClick = 0; return; }
      if (nextClick === 0) nextClick = t + 0.3;
      if (atBottom && t > nextCreak && t > creakUntil) {
        creakUntil = t + 1.2 + Math.random() * 1.4;
        nextCreak = creakUntil + 6 + Math.random() * 14;
        var ct = t, gap = 0.18;
        while (ct < creakUntil) { click(ct, 0.25 * (1 - (ct - t) / (creakUntil - t) * 0.5), true); gap = Math.max(0.035, gap * 0.9); ct += gap; }
        nextClick = creakUntil + 0.8;
        return;
      }
      if (t < creakUntil) return;
      while (nextClick < t + 0.1) {
        click(nextClick, 0.4 + Math.random() * 0.15, false);
        nextClick += 0.7 + Math.random() * 0.6;
      }
    }
  };
})();
