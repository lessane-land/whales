// The sea: a vertical world. One hero whale, close, and the camera goes down
// with her. The others are small and far. Rocks, a floor, light from above,
// the real clock of her day, and the small life around her.
(function () {
  "use strict";

  var MAX_DEPTH = 1600;        // metres: the floor
  var SPEED = 90;              // seconds of whale life per second on screen
  var VIEW_M = 720;            // metres of water visible top to bottom
  var TRAIL_SEC = 45 * 60;     // seconds of dive profile trailing behind the hero
  var HERO_W = 440;
  var FAR_W = 80;
  var FAR_MAX = 4;             // small whales shown at once
  var SNOW = 36;
  var FISH = 34;
  var USER_REST = 7000;        // ms before the camera eases back after the user moved it

  var canvas, ctx, W = 0, H = 0, dpr = 1, whales = [], data = null, hero = null;
  var last = 0, running = false, onTick = null, stripes = [], snow = [], rocks = [], fish = [], squid = [], kelp = [], bubbles = [];
  var camDepth = 0, userOffset = 0, userTouched = 0, blowUntil = 0;
  var mono = "monospace", sans = "sans-serif";
  var tickText = function (d) { return d + " m"; };
  var night = 0;               // 0 day, 1 night, from the hero's real clock

  var STOPS = [
    [0, [66, 174, 203]],
    [100, [41, 136, 170]],
    [300, [27, 88, 128]],
    [650, [16, 52, 90]],
    [1050, [10, 31, 60]],
    [1600, [5, 13, 30]]
  ];

  function rgb(c, a) { return "rgba(" + c[0].toFixed(0) + "," + c[1].toFixed(0) + "," + c[2].toFixed(0) + "," + (a === undefined ? 1 : a) + ")"; }
  function mix(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }

  function pxPerM() { return H / VIEW_M; }
  function depthToY(d) { return H / 2 + (d - camDepth) * pxPerM(); }
  function surfaceY() { return depthToY(0); }

  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    layoutWhales();
    makeStripes();
    makeSnow();
    makeRocks();
    makeLife();
  }

  // The water is made of vertical bands: white, pale, teal, deep, navy, in
  // uneven widths, the Buff's signature. Each band has a tone (0 light to 4 dark).
  function makeStripes() {
    stripes = [];
    seed = 11;
    var x = -10, tones = [0, 1, 2, 1, 3, 2, 4, 1, 0, 2, 3, 1, 2, 4, 0, 3];
    var i = 0;
    while (x < W + 10) {
      var w = 4 + rnd() * 30;
      stripes.push({ x: x, w: w, tone: tones[i % tones.length], phase: rnd() * Math.PI * 2 });
      x += w + 10 + rnd() * 50;
      i++;
    }
  }

  function makeSnow() {
    snow = [];
    seed = 23;
    for (var i = 0; i < SNOW; i++) snow.push({ x: rnd() * W, d: rnd() * MAX_DEPTH, r: 0.6 + rnd() * 1.4, v: 0.2 + rnd() * 0.5, a: 0.15 + rnd() * 0.35 });
  }

  function makeRocks() {
    rocks = [
      { par: 1, c: "#071a2e", pts: [[-0.02, 1380], [0.06, 1340], [0.14, 1400], [0.2, 1370], [0.27, 1440], [0.33, 1420], [0.4, 1700], [-0.02, 1700]] },
      { par: 1, c: "#040d1c", pts: [[-0.02, 1560], [0.1, 1540], [0.22, 1570], [0.36, 1530], [0.5, 1575], [0.63, 1545], [0.78, 1580], [0.9, 1550], [1.02, 1570], [1.02, 1800], [-0.02, 1800]] }
    ];
    return;
    rocks = [
      { par: 1, c: "#061427", pts: [[-0.02, 250], [0.05, 230], [0.09, 330], [0.07, 520], [0.12, 700], [0.1, 980], [0.15, 1250], [0.13, 1700], [-0.02, 1700]] },
      { par: 0.6, c: "#0b2240", pts: [[-0.02, 420], [0.14, 440], [0.2, 620], [0.17, 900], [0.24, 1150], [0.22, 1700], [-0.02, 1700]] },
      { par: 1, c: "#061427", pts: [[0.84, 560], [0.9, 520], [0.95, 640], [0.93, 860], [0.98, 1100], [0.96, 1700], [0.82, 1700], [0.86, 1300], [0.8, 1000], [0.86, 760]] },
      { par: 0.55, c: "#0b2240", pts: [[0.7, 900], [0.8, 880], [0.86, 1050], [1.02, 1150], [1.02, 1700], [0.68, 1700], [0.74, 1300]] },
      // A shallow shelf at the right, where the kelp lives.
      { par: 1, c: "#061427", pts: [[0.94, 0], [1.02, 0], [1.02, 70], [0.97, 52], [0.94, 28]] },
      { par: 1, c: "#040d1c", pts: [[-0.02, 1560], [0.1, 1540], [0.22, 1570], [0.36, 1530], [0.5, 1575], [0.63, 1545], [0.78, 1580], [0.9, 1550], [1.02, 1570], [1.02, 1800], [-0.02, 1800]] }
    ];
  }

  function makeLife() {
    seed = 41;
    fish = [];
    var cx = W * 0.3, cd = 60;
    for (var i = 0; i < FISH; i++) fish.push({ x: cx + (rnd() - 0.5) * 220, d: cd + (rnd() - 0.5) * 40, vx: 0, vd: 0, ph: rnd() * 6.28 });
    squid = [];
    for (var j = 0; j < 2; j++) squid.push({ x: W * (0.25 + rnd() * 0.5), d: 650 + rnd() * 550, ph: rnd() * 6.28, s: 0.7 + rnd() * 0.6 });
    kelp = [];
    kelp = [];
  }

  function layoutWhales() {
    var others = whales.filter(function (w) { return w !== hero; });
    var n = Math.max(1, others.length);
    others.forEach(function (w, i) {
      w.x0 = W * (0.12 + 0.76 * (i + 0.5) / n);
      w.drift = 14 + (i % 3) * 10;
      w.far = 0.55 + (i % 4) * 0.12;
    });
    if (hero) { hero.x0 = W * (W < 720 ? 0.5 : 0.4); hero.drift = 22; }
  }

  function surfaceFor(w) {
    var s = 0;
    while (s < 6 * 3600 && depthAt(w, w.sec - s) <= 50) s += 10;
    return s;
  }

  function depthAt(w, sec) {
    var k = sec / w.step;
    var i = Math.floor(k), f = k - i, n = w.depth.length;
    i = ((i % n) + n) % n;
    var a = w.depth[i], b = w.depth[(i + 1) % n];
    return a + (b - a) * f;
  }

  // Local hour of a whale at her current second, from the real start of her window.
  function localHour(w) {
    if (!w.start) return 12;
    var ms = w.start.getTime() + w.sec * 1000 + w.utc * 3600000;
    var d = new Date(ms);
    return d.getUTCHours() + d.getUTCMinutes() / 60;
  }

  function nightOf(hour) {
    // 0 by day (7 to 19), 1 at night (21 to 5), soft in between.
    if (hour >= 7 && hour <= 19) return 0;
    if (hour >= 21 || hour <= 5) return 1;
    if (hour > 19) return (hour - 19) / 2;
    return (7 - hour) / 2;
  }

  var lockKind = null;   // a species chosen by the user keeps the handover inside it

  function pickHero(force) {
    // Stay with her through her breathing at the surface (about seven minutes of
    // her time), then hand over to whoever is heading down.
    if (hero && !force && !(hero.cur < 40 && surfaceFor(hero) > 420)) return;
    var best = null, bestOther = null, lastKind = hero ? hero.kind : null;
    whales.forEach(function (w) {
      if (lockKind && w.kind !== lockKind) return;
      var ahead = depthAt(w, w.sec + 900) - w.cur;
      var score = (w.cur + ahead * 1.5) / (w.kind === "sperm" ? 1 : 0.35);   // fair to the shallower divers
      if (!best || score > best.score) best = { w: w, score: score };
      if (w.kind !== lastKind && ahead > 40 && (!bestOther || score > bestOther.score)) bestOther = { w: w, score: score };
    });
    var pick = bestOther || best;
    if (pick && pick.w !== hero) { hero = pick.w; layoutWhales(); }
  }

  function drawSky(sy) {
    if (sy <= 0) return;
    var top = Math.min(sy, H);
    var dayTop = [237, 243, 245], dayBot = [201, 221, 230], nightTop = [8, 18, 36], nightBot = [20, 44, 72];
    var g = ctx.createLinearGradient(0, sy - H * 0.3, 0, sy);
    g.addColorStop(0, rgb(mix(dayTop, nightTop, night)));
    g.addColorStop(1, rgb(mix(dayBot, nightBot, night)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, top);
    var skyH = Math.max(140, H * 0.26);
    // Stars at night.
    if (night > 0.05) {
      seed = 77;
      ctx.fillStyle = "rgba(255, 250, 235, " + (0.8 * night).toFixed(2) + ")";
      for (var i = 0; i < 70; i++) {
        var sx = rnd() * W, syy = sy - skyH * (0.35 + rnd() * 0.65) - 40 * rnd();
        if (syy > 0) { ctx.beginPath(); ctx.arc(sx, syy, 0.6 + rnd() * 0.9, 0, 6.28); ctx.fill(); }
      }
    }
    // Sun by day, moon by night: the same pale disc, smaller and cooler at night.
    var r = skyH * (0.36 - 0.2 * night);
    ctx.fillStyle = rgb(mix([255, 252, 240], [225, 232, 240], night), 0.9);
    ctx.beginPath();
    ctx.arc(W * (0.5 + 0.18 * night), sy - skyH * (0.5 + 0.2 * night), r, 0, Math.PI * 2);
    ctx.fill();
    var dayR = [[188, 213, 222], [158, 192, 205], [127, 170, 187]], nightR = [[26, 48, 76], [18, 36, 60], [12, 26, 46]];
    [{ h: 0.62, s: 3 }, { h: 0.48, s: 11 }, { h: 0.34, s: 5 }].forEach(function (rg, idx) {
      ctx.fillStyle = rgb(mix(dayR[idx], nightR[idx], night));
      ctx.beginPath();
      ctx.moveTo(0, sy);
      seed = rg.s;
      var x = 0;
      ctx.lineTo(0, sy - skyH * rg.h * 0.5);
      while (x < W) {
        var step = 60 + rnd() * 160;
        var peak = sy - skyH * rg.h * (0.45 + rnd() * 0.55);
        x += step / 2; ctx.lineTo(x, peak); x += step / 2;
        ctx.lineTo(x, sy - skyH * rg.h * (0.25 + rnd() * 0.3));
      }
      ctx.lineTo(W, sy);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = "rgba(255, 255, 255, " + (0.5 * (1 - night)).toFixed(2) + ")";
    ctx.fillRect(0, sy - 14, W, 14);
    var hz = ctx.createLinearGradient(0, sy - skyH * 0.6, 0, sy);
    hz.addColorStop(0, "rgba(237, 243, 245, 0)");
    hz.addColorStop(1, "rgba(237, 243, 245, " + (0.45 * (1 - night)).toFixed(2) + ")");
    ctx.fillStyle = hz;
    ctx.fillRect(0, Math.max(0, sy - skyH), W, Math.min(sy, skyH));
  }

  function drawCoral() {
    var y = depthToY(1392), x = W * 0.09;
    if (y < 0 || y > H + 30) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#e0604a"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    for (var i = 0; i < 7; i++) { var a = -Math.PI / 2 + (i - 3) * 0.28; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke(); }
    ctx.translate(W * 0.07, depthToY(1372) - y);
    ctx.strokeStyle = "#5fd3a2";
    for (var j = 0; j < 6; j++) { var b = -Math.PI / 2 + (j - 2.5) * 0.34; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(b) * 7, Math.sin(b) * 7 - 3, Math.cos(b) * 13, Math.sin(b) * 13); ctx.stroke(); }
    ctx.restore();
  }

  function drawRocks(parMax) {
    rocks.forEach(function (r) {
      if (parMax < 1 && r.par >= 1) return;
      if (parMax >= 1 && r.par < 1) return;
      ctx.fillStyle = r.c;
      ctx.beginPath();
      r.pts.forEach(function (p, i) {
        var y = H / 2 + (p[1] - camDepth * r.par - (1 - r.par) * 400) * pxPerM();
        if (i === 0) ctx.moveTo(p[0] * W, y); else ctx.lineTo(p[0] * W, y);
      });
      ctx.closePath();
      ctx.fill();
    });
  }

  var TONES = [
    [236, 248, 250],   // white
    [150, 214, 230],   // pale
    [72, 170, 198],    // teal
    [34, 112, 150],    // deep
    [16, 60, 96]       // navy
  ];

  function drawWater(now, sy) {
    var y0 = Math.max(0, sy), y1 = H;
    if (y0 >= y1) return;
    // Base: the depth gradient.
    var g = ctx.createLinearGradient(0, depthToY(0), 0, depthToY(MAX_DEPTH));
    STOPS.forEach(function (st) { g.addColorStop(st[0] / MAX_DEPTH, rgb(mix(st[1], [4, 10, 22], night * 0.55))); });
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);
    // Bands: each a vertical strip of its tone, strong near the surface and
    // sinking into the gradient by 900 m. Light tones fade sooner.
    var fadeY = depthToY(700), lightFadeY = depthToY(520);
    stripes.forEach(function (st) {
      var sway = Math.sin(now / 13000 + st.phase) * 3;
      var c = mix(TONES[st.tone], [4, 10, 22], night * 0.6);
      var top = st.tone <= 1 ? 0.22 : 0.1, far = st.tone <= 1 ? lightFadeY : fadeY;
      var lg = ctx.createLinearGradient(0, sy, 0, far);
      lg.addColorStop(0, rgb(c, top * (1 - night * 0.5)));
      lg.addColorStop(0.4, rgb(c, top * 0.5 * (1 - night * 0.5)));
      lg.addColorStop(1, rgb(c, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(st.x + sway, sy, st.w, Math.max(0, far - sy));
    });
    drawRocks(0.6);

    // Kelp on the shelf.
    ctx.strokeStyle = "rgba(20, 70, 70, 0.9)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    kelp.forEach(function (k) {
      var by = depthToY(k.base);
      if (by < -100 || by > H + 100) return;
      ctx.beginPath();
      ctx.moveTo(k.x, by);
      var hpx = k.h * pxPerM();
      ctx.bezierCurveTo(k.x + Math.sin(now / 2600 + k.ph) * 14, by - hpx * 0.5, k.x + Math.sin(now / 2100 + k.ph) * 22, by - hpx * 0.8, k.x + Math.sin(now / 1900 + k.ph) * 28, by - hpx);
      ctx.stroke();
    });

    // Marine snow.
    ctx.fillStyle = "rgba(220, 240, 248, 1)";
    snow.forEach(function (p) {
      p.d += p.v * 0.6;
      if (p.d > MAX_DEPTH) { p.d = 0; p.x = Math.random() * W; }
      var y = depthToY(p.d);
      if (y < sy || y > H) return;
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(now / 3000 + p.d) * 3, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (sy > -4 && sy < H + 4) {
      ctx.fillStyle = "rgba(255, 255, 255, " + (0.8 - 0.5 * night).toFixed(2) + ")";
      ctx.fillRect(0, sy - 1, W, 2);
      var band = ctx.createLinearGradient(0, sy, 0, sy + 110);
      band.addColorStop(0, "rgba(255, 255, 255, " + (0.55 * (1 - night * 0.7)).toFixed(2) + ")");
      band.addColorStop(0.35, "rgba(255, 255, 255, " + (0.22 * (1 - night * 0.7)).toFixed(2) + ")");
      band.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, sy, W, 40);
    }

    ctx.font = "11px " + mono;
    ctx.fillStyle = "rgba(234, 244, 247, 0.42)";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (var d = 100; d <= 1500; d += 100) {
      var y = depthToY(d);
      if (y < sy + 8 || y > H - 8 || y < 110) continue;
      ctx.fillRect(16, y, 10, 1);
      ctx.fillText(tickText(d), 30, y);
    }
  }

  function drawFish(now, sy, hx, hy) {
    // A school near the surface that keeps together and parts around the hero.
    var cxm = 0, cdm = 0;
    fish.forEach(function (f) { cxm += f.x; cdm += f.d; });
    cxm /= fish.length; cdm /= fish.length;
    var driftX = Math.sin(now / 20000) * 0.25;
    ctx.fillStyle = "rgba(180, 220, 235, " + (0.75 - 0.3 * night).toFixed(2) + ")";
    fish.forEach(function (f) {
      f.vx += (cxm - f.x) * 0.0006 + driftX * 0.02 + (Math.random() - 0.5) * 0.08;
      f.vd += (cdm - f.d) * 0.0008 + (Math.random() - 0.5) * 0.02;
      var fy = depthToY(f.d);
      var dx = f.x - hx, dy = fy - hy, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 190) { f.vx += dx / dist * (190 - dist) * 0.02; f.vd += dy / dist * (190 - dist) * 0.004; }
      f.vx *= 0.96; f.vd *= 0.96;
      f.x += f.vx; f.d += f.vd;
      if (f.d < 4) f.d = 4;
      var y = depthToY(f.d);
      if (y < sy + 4 || y > H) return;
      ctx.save();
      ctx.translate(f.x, y);
      ctx.rotate(Math.atan2(f.vd * pxPerM(), f.vx) * 0.5);
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo(1, -2); ctx.lineTo(4, 0); ctx.lineTo(1, 2); ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  function drawSquid(now) {
    squid.forEach(function (q) {
      var y = depthToY(q.d) + Math.sin(now / 4000 + q.ph) * 10;
      if (y < -40 || y > H + 40) return;
      var x = q.x + Math.sin(now / 9000 + q.ph) * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(q.s, q.s);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#c86a5a";
      ctx.beginPath();
      ctx.moveTo(0, -22); ctx.lineTo(7, -4); ctx.lineTo(0, 4); ctx.lineTo(-7, -4); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c86a5a";
      ctx.lineWidth = 1.4;
      for (var i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 1.6, 2);
        ctx.quadraticCurveTo(i * 3 + Math.sin(now / 700 + i) * 2, 14, i * 4, 24 + Math.sin(now / 900 + i) * 4);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  // Bodies as facet meshes, in the Buff's language: planes of four or five
  // blues, light on the back, dark on the belly, thin pale seams between them.
  // Each facet: a polygon in a 100 unit box facing left, and a shade index.
  var MESH = {
    sperm: {
      facets: [
        { p: [[-50, 2], [-47, -11], [-28, -13], [-30, -2]], s: 1 },
        { p: [[-50, 2], [-30, -2], [-34, 10], [-48, 8]], s: 3 },
        { p: [[-47, -11], [-20, -15], [-10, -6], [-28, -13]], s: 0 },
        { p: [[-28, -13], [-10, -6], [-30, -2]], s: 2 },
        { p: [[-20, -15], [10, -11], [2, -2], [-10, -6]], s: 1 },
        { p: [[-30, -2], [-10, -6], [2, -2], [-2, 10], [-18, 13], [-34, 10]], s: 2 },
        { p: [[-34, 10], [-18, 13], [-38, 12]], s: 4 },
        { p: [[10, -11], [34, -5], [24, 2], [2, -2]], s: 0 },
        { p: [[2, -2], [24, 2], [28, 7], [6, 12], [-2, 10]], s: 3 },
        { p: [[34, -5], [46, -2], [40, 4], [28, 7], [24, 2]], s: 2 },
        { p: [[46, -2], [54, -14], [44, 0]], s: 1 },
        { p: [[44, 0], [54, 14], [40, 4], [46, -2]], s: 3 },
        { p: [[-24, 10], [-19, 17], [-10, 12]], s: 4 }
      ],
      eye: [-41, 1], box: 1
    },
    blue: {
      facets: [
        { p: [[-52, 0], [-44, -7], [-26, -9], [-30, -1]], s: 1 },
        { p: [[-52, 0], [-30, -1], [-34, 7], [-44, 6]], s: 3 },
        { p: [[-44, -7], [-20, -10], [-6, -4], [-26, -9]], s: 0 },
        { p: [[-20, -10], [8, -9], [4, -2], [-6, -4]], s: 1 },
        { p: [[-30, -1], [-26, -9], [-6, -4], [4, -2], [0, 8], [-22, 9], [-34, 7]], s: 2 },
        { p: [[8, -9], [28, -6], [22, 1], [4, -2]], s: 0 },
        { p: [[4, -2], [22, 1], [30, 6], [6, 9], [0, 8]], s: 3 },
        { p: [[28, -6], [30, -11], [34, -6]], s: 2 },
        { p: [[28, -6], [34, -6], [44, -3], [44, 3], [30, 6], [22, 1]], s: 2 },
        { p: [[44, -3], [56, -16], [47, 0]], s: 1 },
        { p: [[47, 0], [56, 16], [44, 3]], s: 3 },
        { p: [[-30, 8], [-22, 16], [-12, 9]], s: 4 }
      ],
      grooves: [[-46, 1, -14, 4], [-44, 3, -12, 6], [-42, 5, -14, 8]],
      eye: [-40, -2], box: 1.25
    },
    fin: {
      facets: [
        { p: [[-52, 1], [-42, -7], [-24, -9], [-30, 0]], s: 1 },
        { p: [[-52, 1], [-30, 0], [-34, 7], [-44, 6]], s: 5 },
        { p: [[-42, -7], [-18, -10], [-6, -4], [-24, -9]], s: 0 },
        { p: [[-18, -10], [10, -9], [6, -2], [-6, -4]], s: 1 },
        { p: [[-30, 0], [-24, -9], [-6, -4], [6, -2], [0, 7], [-22, 8], [-34, 7]], s: 2 },
        { p: [[10, -9], [26, -6], [22, 1], [6, -2]], s: 0 },
        { p: [[6, -2], [22, 1], [30, 6], [6, 8], [0, 7]], s: 3 },
        { p: [[26, -6], [27, -15], [33, -6]], s: 2 },
        { p: [[26, -6], [33, -6], [44, -3], [44, 3], [30, 6], [22, 1]], s: 2 },
        { p: [[44, -3], [55, -15], [47, 0]], s: 1 },
        { p: [[47, 0], [55, 15], [44, 3]], s: 3 },
        { p: [[-28, 8], [-21, 15], [-12, 8]], s: 4 }
      ],
      grooves: [[-44, 2, -14, 4], [-42, 4, -12, 6]],
      eye: [-40, -2], box: 1.2
    }
  };

  // Beaked whales: a stout spindle, small head with a short beak, a small dorsal far back.
  MESH.cuvier = {
    facets: [
      { p: [[-50, 2], [-44, -5], [-28, -10], [-30, 0]], s: 1 },
      { p: [[-50, 2], [-30, 0], [-32, 8], [-44, 7]], s: 3 },
      { p: [[-44, -5], [-28, -10], [-8, -12], [-12, -3]], s: 0 },
      { p: [[-28, -10], [-12, -3], [-30, 0]], s: 2 },
      { p: [[-8, -12], [16, -10], [12, -2], [-12, -3]], s: 1 },
      { p: [[-30, 0], [-12, -3], [12, -2], [8, 9], [-14, 11], [-32, 8]], s: 2 },
      { p: [[16, -10], [34, -6], [36, -11], [38, -5], [46, -2], [40, 3], [30, 6], [24, 1], [12, -2]], s: 0 },
      { p: [[12, -2], [24, 1], [30, 6], [8, 9]], s: 3 },
      { p: [[46, -2], [55, -12], [45, 0]], s: 1 },
      { p: [[45, 0], [55, 12], [40, 3], [46, -2]], s: 3 },
      { p: [[-24, 10], [-19, 16], [-10, 11]], s: 4 }
    ],
    eye: [-40, -1], box: 1.05
  };
  // Blainville's: like Cuvier's with the arched lower jaw and its two tusks.
  MESH.blainville = {
    facets: MESH.cuvier.facets.concat([{ p: [[-46, 6], [-40, 10], [-38, 4]], s: 5 }]),
    eye: [-40, -1], box: 1.0
  };
  // Pilot whale: bulbous forehead, a wide sickle dorsal fin, near black.
  MESH.pilot = {
    facets: [
      { p: [[-50, 0], [-48, -10], [-34, -12], [-32, -2]], s: 1 },
      { p: [[-50, 0], [-32, -2], [-34, 8], [-46, 8]], s: 3 },
      { p: [[-48, -10], [-34, -12], [-14, -9], [-18, -2], [-32, -2]], s: 0 },
      { p: [[-14, -9], [-4, -9], [-2, -22], [10, -9], [26, -6], [20, 0], [-6, 0], [-18, -2]], s: 1 },
      { p: [[-32, -2], [-18, -2], [-6, 0], [-4, 9], [-20, 10], [-34, 8]], s: 2 },
      { p: [[20, 0], [26, -6], [44, -3], [42, 2], [30, 5], [12, 7], [-4, 9], [-6, 0]], s: 2 },
      { p: [[44, -3], [54, -12], [45, 0]], s: 1 },
      { p: [[45, 0], [54, 12], [42, 2], [44, -3]], s: 3 },
      { p: [[-28, 9], [-20, 18], [-8, 10]], s: 4 }
    ],
    eye: [-42, -2], box: 0.95
  };
  // Beluga: white, round melon, no dorsal fin, a soft ridge instead.
  MESH.beluga = {
    facets: [
      { p: [[-50, 2], [-47, -8], [-34, -12], [-32, -2]], s: 1 },
      { p: [[-50, 2], [-32, -2], [-34, 8], [-46, 9]], s: 2 },
      { p: [[-47, -8], [-34, -12], [-12, -11], [-16, -2], [-32, -2]], s: 0 },
      { p: [[-12, -11], [14, -10], [10, -1], [-16, -2]], s: 1 },
      { p: [[-32, -2], [-16, -2], [10, -1], [6, 9], [-18, 11], [-34, 8]], s: 2 },
      { p: [[14, -10], [34, -6], [44, -3], [42, 2], [30, 6], [6, 9], [10, -1]], s: 1 },
      { p: [[44, -3], [54, -12], [45, 0]], s: 0 },
      { p: [[45, 0], [54, 12], [42, 2], [44, -3]], s: 2 },
      { p: [[-26, 10], [-18, 18], [-8, 11]], s: 3 }
    ],
    eye: [-41, -3], box: 0.95
  };
  // Narwhal: mottled grey, no dorsal fin, and the tusk.
  MESH.narwhal = {
    facets: [
      { p: [[-48, 1], [-45, -8], [-32, -11], [-30, -2]], s: 1 },
      { p: [[-48, 1], [-30, -2], [-32, 8], [-44, 8]], s: 3 },
      { p: [[-45, -8], [-32, -11], [-10, -10], [-14, -2], [-30, -2]], s: 0 },
      { p: [[-10, -10], [14, -9], [10, -1], [-14, -2]], s: 1 },
      { p: [[-30, -2], [-14, -2], [10, -1], [6, 9], [-16, 10], [-32, 8]], s: 2 },
      { p: [[14, -9], [34, -5], [44, -3], [42, 2], [30, 6], [6, 9], [10, -1]], s: 2 },
      { p: [[44, -3], [54, -12], [45, 0]], s: 1 },
      { p: [[45, 0], [54, 12], [42, 2], [44, -3]], s: 3 },
      { p: [[-24, 9], [-17, 17], [-8, 10]], s: 4 },
      { p: [[-48, -1], [-96, -8], [-48, 2]], s: 5 }
    ],
    eye: [-40, -3], box: 0.95
  };

  var SHADES = {
    cuvier: { near: ["#8f8a7a", "#716c5e", "#5a5648", "#454236", "#302e26", "#302e26"], far: ["#6e7a7c", "#5b6668", "#4a5456", "#3a4345", "#2d3537", "#2d3537"] },
    blainville: { near: ["#6f7d86", "#56646e", "#424f58", "#323d45", "#242c33", "#d8dde0"], far: ["#5c6e7c", "#4b5c69", "#3c4b57", "#2f3b46", "#252f38", "#c5ccd0"] },
    pilot: { near: ["#2b3340", "#1f2630", "#161c24", "#0f131a", "#0a0d12", "#0a0d12"], far: ["#2a3a4e", "#223141", "#1b2735", "#151e2a", "#101720", "#101720"] },
    beluga: { near: ["#f4f7f8", "#dfe7eb", "#c3d1d8", "#a7b9c3", "#8ea3ae", "#8ea3ae"], far: ["#d9e6ec", "#c4d5de", "#adc3ce", "#98b0bd", "#86a0ae", "#86a0ae"] },
    narwhal: { near: ["#b9c2c6", "#949fa5", "#717c83", "#545d64", "#3b4349", "#e8ece9"], far: ["#a4b3bb", "#8a9aa3", "#71818b", "#5c6a74", "#4a565f", "#d4dbd9"] },
    sperm: { near: ["#2f5276", "#223f5e", "#182f49", "#102238", "#0a1729", "#0a1729"], far: ["#3d6487", "#2f5272", "#24425f", "#1b344d", "#142a40", "#142a40"] },
    blue:  { near: ["#8fb5cc", "#6c95b2", "#527a98", "#3d607c", "#2a475f", "#2a475f"], far: ["#8fb0c6", "#7199b3", "#5a8099", "#476882", "#36526a", "#36526a"] },
    fin:   { near: ["#6f8ea6", "#56758d", "#415c74", "#2f465b", "#223445", "#c9d6dd"], far: ["#7693a9", "#5f7c93", "#4b647a", "#3a5064", "#2c3f50", "#b9c8d2"] }
  };
  function shadeOf(w, near) { return (SHADES[w.kind] || SHADES.sperm)[near ? "near" : "far"]; }

  function drawMesh(kind, shade, seamAlpha, flat) {
    var m = MESH[kind] || MESH.sperm;
    ctx.lineJoin = "round";
    m.facets.forEach(function (f) {
      ctx.fillStyle = shade[f.s];
      ctx.beginPath();
      f.p.forEach(function (pt, i) { if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); });
      ctx.closePath();
      ctx.fill();
      if (seamAlpha > 0) {
        ctx.strokeStyle = "rgba(190, 225, 240, " + seamAlpha.toFixed(2) + ")";
        ctx.lineWidth = 0.35;
        ctx.stroke();
      }
    });
    if (m.grooves && !flat) {
      ctx.strokeStyle = "rgba(190, 225, 240, " + (seamAlpha * 0.9).toFixed(2) + ")";
      ctx.lineWidth = 0.4;
      m.grooves.forEach(function (g) { ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(g[2], g[3]); ctx.stroke(); });
    }
    if (!flat) {
      ctx.fillStyle = "rgba(215, 238, 248, 0.9)";
      ctx.beginPath(); ctx.arc(m.eye[0], m.eye[1], 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawWhale(x, y, pitch, scale, shade, alpha, kind, flat, speed, phase) {
    var m = MESH[kind] || MESH.sperm;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(pitch);
    ctx.scale(scale * m.box, scale * m.box);
    Whales.draw(ctx, kind, { shade: shade, t: performance.now(), speed: speed || 0, flat: flat, seam: 0.3, phase: phase || 0 });
    ctx.restore();
  }


  function drawTrail(w, x) {
    var pxPerSec = (W < 720 ? 3.2 : 5.5) / 60;
    ctx.beginPath();
    var first = true;
    for (var s = 0; s <= TRAIL_SEC; s += 20) {
      var px = x + s * pxPerSec, py = depthToY(depthAt(w, w.sec - s));
      if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
    }
    var g = ctx.createLinearGradient(x, 0, x + TRAIL_SEC * pxPerSec, 0);
    g.addColorStop(0, "rgba(205, 238, 247, 0.6)");
    g.addColorStop(1, "rgba(205, 238, 247, 0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  function drawBlow(now, x, sy, hs) {
    var k = (blowUntil - now) / 2200;
    if (k <= 0) return;
    var grow = 1 - k;
    ctx.save();
    ctx.globalAlpha = 0.7 * k;
    ctx.fillStyle = "#ffffff";
    for (var i = 0; i < 7; i++) {
      var ang = -Math.PI / 2 - 0.45 + i * 0.15;
      var len = (30 + i % 3 * 12) * grow * hs;
      ctx.beginPath();
      ctx.arc(x - 60 * hs + Math.cos(ang) * len, sy - 6 + Math.sin(ang) * len, 2.2 + grow * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBubbles(now, sy) {
    ctx.strokeStyle = "rgba(230, 245, 250, 0.6)";
    ctx.lineWidth = 1;
    bubbles = bubbles.filter(function (b) { return b.d > 0; });
    bubbles.forEach(function (b) {
      b.d -= b.v;
      var y = depthToY(b.d);
      if (y < sy) { b.d = 0; return; }
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(now / 500 + b.ph) * 2, y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function draw() {
    if (!running) return;
    var now = performance.now();
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    whales.forEach(function (w) {
      w.sec = (w.sec + dt * SPEED) % (w.depth.length * w.step);
      var d = depthAt(w, w.sec);
      if (w === hero && w.cur > 50 && d < 4 && now > blowUntil) blowUntil = now + 2200;
      w.prev = w.cur;
      w.cur = d;
    });
    pickHero(false);
    if (hero) {
      var n = nightOf(localHour(hero));
      night += (n - night) * Math.min(1, dt * 0.5);
      // Bubbles leave the hero now and then while she is under.
      if (hero.cur > 20 && Math.random() < dt * 1.5) bubbles.push({ x: hero.x0 - 70, d: hero.cur - 6, v: 0.5 + Math.random() * 0.6, r: 1 + Math.random() * 2, ph: Math.random() * 6 });
    }

    // Camera: the hero, plus whatever the user asked for, which eases away after a rest.
    if (now - userTouched > USER_REST) userOffset *= Math.max(0, 1 - dt * 0.8);
    var want = (hero ? Math.max(VIEW_M * 0.26, hero.cur) : VIEW_M * 0.26) + userOffset;
    want = Math.max(VIEW_M * 0.26, Math.min(MAX_DEPTH - VIEW_M * 0.3, want));
    camDepth += (want - camDepth) * Math.min(1, dt * 1.2);
    var sy = surfaceY();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawSky(sy);
    drawWater(now, sy);

    var hx = hero ? hero.x0 + Math.sin(now / 15000) * hero.drift : W / 2;
    var hy = hero ? depthToY(hero.cur) : H;
    var hs = HERO_W / 100 * (W < 720 ? 0.55 : Math.min(1, W / 1280)) * (1 + 0.2 * Math.min(1, (hero ? hero.cur : 0) / 1000)) * (hero && hero.kind === "blue" ? 1.15 : 1);
    if (hero) {
      // Keep the whole body under the surface line, whatever her angle.
      var hb = (MESH[hero.kind] || MESH.sperm).box, reach = 55 * hs * hb * Math.abs(Math.sin(hero.pitch)) + 14 * hs * hb;
      if (hy - reach < sy) hy = sy + reach;
    }

    var far = whales.filter(function (w) { return w !== hero; })
      .sort(function (a, b) { return Math.abs(a.cur - camDepth) - Math.abs(b.cur - camDepth); }).slice(0, FAR_MAX);
    whales.forEach(function (w) { if (w !== hero && far.indexOf(w) < 0) { w.sx = undefined; } });
    far.forEach(function (w) {
      var x = w.x0 + Math.sin(now / 16000 + w.x0) * w.drift;
      var y = depthToY(w.cur);
      w.sx = x; w.sy = y;
      if (y < sy - 10 || y > H + 40) return;
      var ahead = depthAt(w, w.sec + 30) - w.cur;
      var pitch = -Math.max(-0.7, Math.min(0.7, ahead / 30 * 1.1)) * Math.min(1, w.cur / 60);
      w.pitch += (pitch - w.pitch) * 0.04;
      w.speed = Math.min(1, Math.abs(ahead) / 40);
      var scale = FAR_W / 100 * w.far * (W < 720 ? 0.8 : 1) * (w.kind === "blue" ? 1.35 : w.kind === "fin" ? 1.15 : 1);
      var sil = mix([10, 24, 44], [40, 90, 120], 1 - w.far);
      var flat = [rgb(sil), rgb(sil), rgb(sil), rgb(sil), rgb(sil), rgb(mix(sil, [200, 215, 225], 0.5))];
      drawWhale(x, Math.max(sy + 8 * scale, y), w.pitch, scale, flat, 0.55 + 0.3 * w.far, w.kind, true, w.speed, w.x0);
    });

    drawSquid(now);
    drawRocks(1);
    drawCoral();
    drawFish(now, sy, hx, hy);
    drawBubbles(now, sy);

    if (hero) {
      var ahead2 = depthAt(hero, hero.sec + 30) - hero.cur;
      var pitch2 = -Math.max(-1.1, Math.min(1.1, ahead2 / 30 * 1.6));
      // Near the surface she levels out, so her tail never leaves the water.
      pitch2 *= Math.min(1, hero.cur / 140);
      hero.pitch += (pitch2 - hero.pitch) * 0.03;
      hero.speed = Math.min(1, Math.abs(ahead2) / 40);
      drawTrail(hero, hx);
      drawWhale(hx, hy, hero.pitch, hs, shadeOf(hero, true), 1, hero.kind, false, hero.speed, 0);
      drawBlow(now, hx, sy, hs / (HERO_W / 100));
    }

    // The deep is dark: a veil that grows past 500 m and with the night.
    var veil = Math.max(0, Math.min(0.62, (camDepth - 450) / 1100)) + 0.18 * night;
    if (veil > 0) {
      ctx.fillStyle = "rgba(2, 6, 14, " + veil.toFixed(3) + ")";
      ctx.fillRect(0, Math.max(0, sy), W, H);
      // Her eye keeps a spark.
      if (hero && hy > 0 && hy < H) {
        ctx.fillStyle = "rgba(220, 240, 250, " + (0.8 * veil).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(hx - 40 * hs, hy + 2 * hs, 1.6 * hs, 0, 6.28); ctx.fill();
      }
    }

    if (onTick) onTick(hero, whales, sy, { night: night, hour: hero ? localHour(hero) : 12, slope: hero ? (depthAt(hero, hero.sec + 60) - hero.cur) / 60 : 0 });
    requestAnimationFrame(draw);
  }

  function hitWhale(x, y) {
    var best = null, bd = 40;
    whales.forEach(function (w) {
      if (w === hero || w.sx === undefined) return;
      var d = Math.hypot(w.sx - x, w.sy - y);
      if (d < bd) { bd = d; best = w; }
    });
    return best;
  }

  function gallery() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#1b5a7e";
    ctx.fillRect(0, 0, W, H);
    var kinds = Whales.kinds(), cols = 2, rows = Math.ceil(kinds.length / cols);
    kinds.forEach(function (k, i) {
      var c = i % cols, r = Math.floor(i / cols);
      drawWhale(W * (0.25 + 0.5 * c), H * ((r + 0.5) / rows), 0, (W / cols) / 100 * 0.7, SHADES[k].near, 1, k);
      ctx.font = "14px " + sans; ctx.fillStyle = "#eaf4f7"; ctx.textAlign = "center";
      ctx.fillText(k, W * (0.25 + 0.5 * c), H * ((r + 0.5) / rows) + 60);
    });
  }

  window.Sea = {
    init: function (el, dataIn, opts) {
      canvas = el;
      data = dataIn;
      ctx = canvas.getContext("2d");
      var fonts = getComputedStyle(document.body);
      mono = fonts.getPropertyValue("--mono") || mono;
      sans = fonts.getPropertyValue("--sans") || sans;
      if (opts && opts.tick) tickText = opts.tick;
      onTick = opts && opts.onTick;
      whales = data.whales.map(function (w, i) {
        return { id: w.id, kind: w.kind || "sperm", depth: w.depth, step: w.step, dives: w.dives, max: w.max,
                 start: w.window_start ? new Date(w.window_start + "Z") : null, utc: w.utc_offset || 0,
                 sec: (i * 9973) % (w.depth.length * w.step), pitch: 0, cur: 0, prev: 0, x0: 0, drift: 0, far: 1 };
      });
      // ?whale=ID&at=HH: start on that whale at that local hour, for looking and sharing.
      if (opts && opts.whale) {
        whales.forEach(function (w) {
          if (w.id !== opts.whale) return;
          if (typeof opts.at === "number" && w.start) {
            var h0 = localHour({ start: w.start, sec: 0, utc: w.utc });
            w.sec = (((opts.at - h0) * 3600) % (w.depth.length * w.step) + w.depth.length * w.step) % (w.depth.length * w.step);
          }
          hero = w;
        });
      }
      whales.forEach(function (w) { w.cur = depthAt(w, w.sec); });
      if (!hero) pickHero(true); else layoutWhales();
      camDepth = VIEW_M * 0.26;
      night = hero ? nightOf(localHour(hero)) : 0;
      resize();
      window.addEventListener("resize", resize);
      // You: scroll or drag to dive, click a far whale to follow her.
      canvas.addEventListener("wheel", function (e) { e.preventDefault(); userOffset += e.deltaY * 0.6; userTouched = performance.now(); }, { passive: false });
      var dragY = null;
      canvas.addEventListener("pointerdown", function (e) { dragY = e.clientY; });
      canvas.addEventListener("pointermove", function (e) { if (dragY !== null) { userOffset -= (e.clientY - dragY) / pxPerM(); dragY = e.clientY; userTouched = performance.now(); } });
      window.addEventListener("pointerup", function (e) {
        if (dragY !== null && Math.abs(e.clientY - dragY) < 4) {
          var w = hitWhale(e.clientX, e.clientY);
          if (w) { hero = w; layoutWhales(); userOffset = 0; }
        }
        dragY = null;
      });
      if (opts && opts.gallery) { gallery(); return; }
      running = true;
      last = performance.now();
      requestAnimationFrame(draw);
    },
    speed: SPEED,
    // Choose a species: the best diver of that kind becomes the hero now, and
    // handovers stay inside the species. null means all.
    chooseKind: function (kind) {
      lockKind = kind;
      if (!kind) return;
      var best = null;
      whales.forEach(function (w) {
        if (w.kind !== kind) return;
        var ahead = depthAt(w, w.sec + 900) - w.cur;
        var score = w.cur + ahead * 1.5;
        if (!best || score > best.score) best = { w: w, score: score };
      });
      if (best) { hero = best.w; layoutWhales(); userOffset = 0; }
    },
    kinds: function () { var k = []; whales.forEach(function (w) { if (k.indexOf(w.kind) < 0) k.push(w.kind); }); return k; },
    pause: function () { running = false; },
    resume: function () { if (!running) { running = true; last = performance.now(); requestAnimationFrame(draw); } },
    underFor: function (w) {
      var s = 0;
      while (s < 6 * 3600 && depthAt(w, w.sec - s) > 50) s += 10;
      return s;
    },
    surfaceFor: surfaceFor,
    localTime: function (w) {
      if (!w.start) return null;
      return new Date(w.start.getTime() + w.sec * 1000 + w.utc * 3600000);
    }
  };
})();
