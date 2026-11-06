// Sound, synthesised in the browser from what the hero whale is doing.
// Not a recording: an imitation of the rhythm of sperm whale clicks and
// creaks, a blow at the surface and a low sea that thickens with depth.
(function () {
  "use strict";

  var ac = null, master = null, sea = null, seaGain = null, seaFilter = null, noiseBuf = null;
  var on = false, nextClick = 0, creakUntil = 0, nextCreak = 0, nextBreath = 0, nextCoda = 0;
  var waves = null, wavesGain = null, wavesLfo = null;

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
    // Waves at the surface: a higher band of the same noise, swelling slowly.
    waves = ac.createBufferSource();
    waves.buffer = noiseBuf;
    waves.loop = true;
    var wf = ac.createBiquadFilter();
    wf.type = "bandpass";
    wf.frequency.value = 650;
    wf.Q.value = 0.6;
    wavesGain = ac.createGain();
    wavesGain.gain.value = 0;
    var lfo = ac.createOscillator();
    lfo.frequency.value = 0.12;
    var lfoGain = ac.createGain();
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(wavesGain.gain);
    lfo.start();
    waves.connect(wf);
    wf.connect(wavesGain);
    wavesGain.connect(master);
    waves.start();
  }

  // A coda: a short pattern of clicks, the social sound at the surface.
  function coda(t) {
    var n = 3 + Math.floor(Math.random() * 5), gap = 0.16 + Math.random() * 0.2;
    for (var i = 0; i < n; i++) {
      var g = gap * (i === n - 1 ? 1.6 : 1);
      click(t, 0.5, false);
      t += g;
    }
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
    g.gain.linearRampToValueAtTime(0.9, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t, 0, 1.1);
  }

  // Blue and fin whales: a moan so low a speaker cannot play it, pitched up here.
  var nextMoan = 0, nextWhistle = 0;
  // Whistles and chirps: belugas most of all, pilot whales too, narwhals now and then.
  function whistle(t, kind) {
    var o = ac.createOscillator();
    o.type = "sine";
    var f0 = kind === "beluga" ? 1800 + Math.random() * 1400 : 1200 + Math.random() * 800;
    var dur = kind === "beluga" ? 0.25 + Math.random() * 0.5 : 0.5 + Math.random() * 0.8;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * (0.6 + Math.random() * 0.9), t + dur);
    var g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.03);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    if (kind === "beluga" && Math.random() < 0.5) whistleLater(t + dur + 0.08, kind);
  }
  function whistleLater(t, kind) { setTimeout(function () { if (on && ac) whistle(ac.currentTime, kind); }, Math.max(0, (t - ac.currentTime) * 1000)); }
  function moan(t, kind) {
    var o = ac.createOscillator();
    o.type = "sine";
    var f0 = kind === "blue" ? 62 : kind === "humpback" ? 180 + Math.random() * 160 : 84;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * 0.82, t + (kind === "blue" ? 4.5 : 1.2));
    var g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + (kind === "blue" ? 5 : 1.4));
    var o2 = ac.createOscillator();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(f0 * 2, t);
    o2.frequency.linearRampToValueAtTime(f0 * 1.64, t + 4.5);
    var g2 = ac.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.08, t + 0.6);
    g2.gain.linearRampToValueAtTime(0.0001, t + 5);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 5.2);
    o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + 5.2);
  }

  function baleen(t, depth, slope, surfaced, kind) {
    var k = Math.min(1, depth / 400);
    seaFilter.frequency.setTargetAtTime(180 - 90 * k, t, 0.5);
    seaGain.gain.setTargetAtTime(0.3 + 0.25 * k, t, 0.5);
    var up = depth < 30;
    wavesGain.gain.setTargetAtTime(up ? 0.12 : 0, t, 0.8);
    if (surfaced) { blow(t + 0.05); nextBreath = t + 7; }
    if (up) {
      if (nextBreath === 0) nextBreath = t + 2;
      if (t > nextBreath) { blow(t); nextBreath = t + 6 + Math.random() * 5; }
    } else {
      nextBreath = 0;
      if (nextMoan === 0) nextMoan = t + 3;
      if (t > nextMoan) { moan(t, kind); nextMoan = t + (kind === "blue" ? 14 : 9) + Math.random() * 12; }
    }
    nextClick = 0;
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
    update: function (depth, slope, surfaced, kind) {
      if (!on || !ac) return;
      var t = ac.currentTime;
      if (kind === "blue" || kind === "fin" || kind === "humpback") { baleen(t, depth, slope, surfaced, kind); return; }
      var quiet = (kind === "cuvier" || kind === "blainville") && depth < 400;   // beaked whales keep silent near the surface
      var chatty = kind === "beluga" || kind === "pilot" || kind === "narwhal";
      // The sea deepens with depth: lower, heavier.
      var k = Math.min(1, depth / 1200);
      seaFilter.frequency.setTargetAtTime(180 - 110 * k, t, 0.5);
      seaGain.gain.setTargetAtTime(0.3 + 0.35 * k, t, 0.5);
      if (surfaced) { blow(t + 0.05); nextBreath = t + 9; nextCoda = t + 4 + Math.random() * 10; }
      // At the surface: waves, a breath every ten seconds or so, a coda now and then.
      var up = depth < 30;
      wavesGain.gain.setTargetAtTime(up ? 0.12 : 0, t, 0.8);
      if (up) {
        if (nextBreath === 0) nextBreath = t + 2;
        if (t > nextBreath) { blow(t); nextBreath = t + 8 + Math.random() * 6; }
        if (nextCoda === 0) nextCoda = t + 3 + Math.random() * 8;
        if (t > nextCoda) { coda(t); nextCoda = t + 12 + Math.random() * 25; }
      } else { nextBreath = 0; nextCoda = 0; }
      // Clicks: searching from 300 m down, about one a second. At the bottom, creaks.
      var searching = depth > 300;
      var atBottom = depth > 500 && Math.abs(slope) < 0.2;
      if (chatty && t > nextWhistle) { whistle(t, kind); nextWhistle = t + (kind === "beluga" ? 4 : 9) + Math.random() * 10; }
      if (!searching || quiet) { nextClick = 0; return; }
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
