// The sea: a vertical world. One hero whale, close, and the camera goes down
// with her. The others are small and far. Rock walls, a floor, light from above.
(function () {
  "use strict";

  var MAX_DEPTH = 1600;        // metres: the floor
  var SPEED = 90;              // seconds of whale life per second on screen
  var VIEW_M = 720;            // metres of water visible top to bottom at desktop height
  var TRAIL_SEC = 45 * 60;     // seconds of dive profile trailing behind the hero
  var HERO_W = 230;            // hero width in px
  var FAR_W = 62;              // far whale width in px
  var SNOW = 90;

  var canvas, ctx, W = 0, H = 0, dpr = 1, whales = [], data = null, hero = null;
  var last = 0, running = false, onTick = null, stripes = [], snow = [], rocks = [];
  var camDepth = 0, camTarget = 0, blowUntil = 0, blowX = 0;
  var mono = "monospace", sans = "sans-serif";
  var tickText = function (d) { return d + " m"; };

  var STOPS = [
    [0, [66, 174, 203]],
    [100, [41, 136, 170]],
    [300, [27, 88, 128]],
    [650, [16, 52, 90]],
    [1050, [10, 31, 60]],
    [1600, [5, 13, 30]]
  ];

  function lerpColor(d) {
    d = Math.max(0, Math.min(MAX_DEPTH, d));
    for (var i = 1; i < STOPS.length; i++) {
      if (d <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], f = (d - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
      }
    }
    return STOPS[STOPS.length - 1][1];
  }

  function rgb(c, a) { return "rgba(" + c[0].toFixed(0) + "," + c[1].toFixed(0) + "," + c[2].toFixed(0) + "," + (a === undefined ? 1 : a) + ")"; }

  // Camera: camDepth is the depth at the vertical centre of the screen.
  function pxPerM() { return H / VIEW_M; }
  function depthToY(d) { return H / 2 + (d - camDepth) * pxPerM(); }
  function surfaceY() { return depthToY(0); }

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
  }

  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  function makeStripes() {
    stripes = [];
    seed = 11;
    var x = -40;
    while (x < W + 40) {
      var w = 10 + rnd() * 70;
      stripes.push({ x: x, w: w, a: 0.06 + rnd() * 0.2, phase: rnd() * Math.PI * 2, tilt: (rnd() - 0.5) * 0.12 });
      x += w + 6 + rnd() * 40;
    }
  }

  function makeSnow() {
    snow = [];
    seed = 23;
    for (var i = 0; i < SNOW; i++) snow.push({ x: rnd() * W, d: rnd() * MAX_DEPTH, r: 0.6 + rnd() * 1.4, v: 0.2 + rnd() * 0.5, a: 0.15 + rnd() * 0.35 });
  }

  // Rock walls in depth space: polygons of [x fraction, depth]. Far walls move slower.
  function makeRocks() {
    rocks = [
      // Left wall, near
      { par: 1, c: "#061427", pts: [[-0.02, 250], [0.05, 230], [0.09, 330], [0.07, 520], [0.12, 700], [0.1, 980], [0.15, 1250], [0.13, 1700], [-0.02, 1700]] },
      // Left wall, far, hazier
      { par: 0.6, c: "#0b2240", pts: [[-0.02, 420], [0.14, 440], [0.2, 620], [0.17, 900], [0.24, 1150], [0.22, 1700], [-0.02, 1700]] },
      // Right pillar, near
      { par: 1, c: "#061427", pts: [[0.84, 560], [0.9, 520], [0.95, 640], [0.93, 860], [0.98, 1100], [0.96, 1700], [0.82, 1700], [0.86, 1300], [0.8, 1000], [0.86, 760]] },
      // Right wall, far
      { par: 0.55, c: "#0b2240", pts: [[0.7, 900], [0.8, 880], [0.86, 1050], [1.02, 1150], [1.02, 1700], [0.68, 1700], [0.74, 1300]] },
      // Floor
      { par: 1, c: "#040d1c", pts: [[-0.02, 1560], [0.1, 1540], [0.22, 1570], [0.36, 1530], [0.5, 1575], [0.63, 1545], [0.78, 1580], [0.9, 1550], [1.02, 1570], [1.02, 1800], [-0.02, 1800]] }
    ];
  }

  function layoutWhales() {
    var others = whales.filter(function (w) { return w !== hero; });
    var n = Math.max(1, others.length);
    others.forEach(function (w, i) {
      w.x0 = W * (0.12 + 0.76 * (i + 0.5) / n);
      w.drift = 14 + (i % 3) * 10;
      w.far = 0.55 + (i % 4) * 0.12;   // distance: smaller and hazier
    });
    if (hero) { hero.x0 = W * (W < 720 ? 0.5 : 0.42); hero.drift = 18; }
  }

  function depthAt(w, sec) {
    var k = sec / w.step;
    var i = Math.floor(k), f = k - i, n = w.depth.length;
    i = ((i % n) + n) % n;
    var a = w.depth[i], b = w.depth[(i + 1) % n];
    return a + (b - a) * f;
  }

  function pickHero() {
    // The deepest whale that is still on her way down or at the bottom of a dive.
    // Change only when the current hero has surfaced, so the camera never jumps.
    if (hero && hero.cur > 40) return;
    var best = null;
    whales.forEach(function (w) {
      var ahead = depthAt(w, w.sec + 900) - w.cur;   // where she is in 15 min
      var score = w.cur + ahead * 1.5;
      if (!best || score > best.score) best = { w: w, score: score };
    });
    if (best && best.w !== hero) {
      hero = best.w;
      layoutWhales();
    }
  }

  function drawSky(sy) {
    if (sy <= 0) return;
    var top = Math.min(sy, H);
    var g = ctx.createLinearGradient(0, sy - H * 0.3, 0, sy);
    g.addColorStop(0, "#edf3f5");
    g.addColorStop(1, "#c9dde6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, top);
    var skyH = Math.max(140, H * 0.26);
    ctx.fillStyle = "rgba(255, 252, 240, 0.9)";
    ctx.beginPath();
    ctx.arc(W * 0.5, sy - skyH * 0.5, skyH * 0.36, 0, Math.PI * 2);
    ctx.fill();
    var ranges = [{ h: 0.62, c: "#bcd5de", s: 3 }, { h: 0.48, c: "#9ec0cd", s: 11 }, { h: 0.34, c: "#7faabb", s: 5 }];
    ranges.forEach(function (r) {
      ctx.fillStyle = r.c;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      seed = r.s;
      var x = 0;
      ctx.lineTo(0, sy - skyH * r.h * 0.5);
      while (x < W) {
        var step = 60 + rnd() * 160;
        var peak = sy - skyH * r.h * (0.45 + rnd() * 0.55);
        x += step / 2;
        ctx.lineTo(x, peak);
        x += step / 2;
        ctx.lineTo(x, sy - skyH * r.h * (0.25 + rnd() * 0.3));
      }
      ctx.lineTo(W, sy);
      ctx.closePath();
      ctx.fill();
    });
    var hz = ctx.createLinearGradient(0, sy - skyH * 0.6, 0, sy);
    hz.addColorStop(0, "rgba(237, 243, 245, 0)");
    hz.addColorStop(1, "rgba(237, 243, 245, 0.45)");
    ctx.fillStyle = hz;
    ctx.fillRect(0, Math.max(0, sy - skyH), W, Math.min(sy, skyH));
  }

  function drawWater(now, sy) {
    var y0 = Math.max(0, sy), y1 = H;
    if (y0 >= y1) return;
    var g = ctx.createLinearGradient(0, depthToY(0), 0, depthToY(MAX_DEPTH));
    STOPS.forEach(function (s) { g.addColorStop(s[0] / MAX_DEPTH, rgb(s[1])); });
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);

    // Far rocks first, then light, then near rocks later (over the far whales).
    drawRocks(0.6);

    // Light: shafts from the surface, fading by 420 m, swaying.
    var fadeY = depthToY(420);
    if (fadeY > 0) {
      stripes.forEach(function (s) {
        var sway = Math.sin(now / 11000 + s.phase) * 8;
        var lg = ctx.createLinearGradient(0, sy, 0, fadeY);
        lg.addColorStop(0, "rgba(225, 247, 252, " + s.a.toFixed(3) + ")");
        lg.addColorStop(0.35, "rgba(225, 247, 252, " + (s.a * 0.5).toFixed(3) + ")");
        lg.addColorStop(1, "rgba(225, 247, 252, 0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(s.x + sway, sy);
        ctx.lineTo(s.x + sway + s.w, sy);
        ctx.lineTo(s.x + sway + s.w + s.tilt * (fadeY - sy), fadeY);
        ctx.lineTo(s.x + sway + s.tilt * (fadeY - sy), fadeY);
        ctx.closePath();
        ctx.fill();
      });
    }

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

    // Surface: foam line and a soft band under it.
    if (sy > -4 && sy < H + 4) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(0, sy - 1, W, 2);
      var band = ctx.createLinearGradient(0, sy, 0, sy + 40);
      band.addColorStop(0, "rgba(255, 255, 255, 0.28)");
      band.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, sy, W, 40);
    }

    // Depth ticks.
    ctx.font = "11px " + mono;
    ctx.fillStyle = "rgba(234, 244, 247, 0.42)";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500].forEach(function (d) {
      var y = depthToY(d);
      if (y < sy + 8 || y > H - 8 || y < 110) return;
      ctx.fillRect(16, y, 10, 1);
      ctx.fillText(tickText(d), 30, y);
    });
  }

  function drawRocks(parMax) {
    rocks.forEach(function (r) {
      if (parMax < 1 && r.par >= 1) return;
      if (parMax >= 1 && r.par < 1) return;
      ctx.fillStyle = r.c;
      ctx.beginPath();
      r.pts.forEach(function (p, i) {
        // Parallax: far rocks move less with the camera.
        var y = H / 2 + (p[1] - camDepth * r.par - (1 - r.par) * 400) * pxPerM();
        if (i === 0) ctx.moveTo(p[0] * W, y); else ctx.lineTo(p[0] * W, y);
      });
      ctx.closePath();
      ctx.fill();
    });
  }

  // A sperm whale, low poly, facing left, in a 100 x 44 box.
  function drawWhale(x, y, pitch, scale, shade, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(pitch);
    ctx.scale(scale, scale);
    var body = shade[0], mid = shade[1], lite = shade[2];
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-50, 2); ctx.lineTo(-46, -12); ctx.lineTo(-20, -15); ctx.lineTo(10, -11); ctx.lineTo(34, -4);
    ctx.lineTo(46, -2); ctx.lineTo(50, -10); ctx.lineTo(44, 0); ctx.lineTo(50, 10); ctx.lineTo(40, 4);
    ctx.lineTo(28, 7); ctx.lineTo(6, 12); ctx.lineTo(-18, 13); ctx.lineTo(-38, 12); ctx.lineTo(-48, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.moveTo(-46, -12); ctx.lineTo(-20, -15); ctx.lineTo(-24, 0); ctx.lineTo(-50, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-20, -15); ctx.lineTo(10, -11); ctx.lineTo(0, 0); ctx.lineTo(-24, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lite;
    ctx.beginPath(); ctx.moveTo(10, -11); ctx.lineTo(34, -4); ctx.lineTo(28, 7); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(0, 0); ctx.lineTo(6, 12); ctx.lineTo(-18, 13); ctx.closePath();
    ctx.fillStyle = mid; ctx.fill();
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.moveTo(-26, 12); ctx.lineTo(-18, 21); ctx.lineTo(-8, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(200, 230, 240, 0.85)";
    ctx.beginPath(); ctx.arc(-40, 2, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  var NEAR = ["#071428", "#0d2140", "#153358"];
  var FAR = ["#0f2d4e", "#15395f", "#1c4670"];

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

  function drawBlow(now, x, sy) {
    var k = (blowUntil - now) / 2200;
    if (k <= 0) return;
    var grow = 1 - k;
    ctx.save();
    ctx.globalAlpha = 0.7 * k;
    ctx.fillStyle = "#ffffff";
    for (var i = 0; i < 7; i++) {
      var ang = -Math.PI / 2 - 0.45 + i * 0.15;
      var len = (30 + i % 3 * 12) * grow * (W < 720 ? 0.6 : 1);
      ctx.beginPath();
      ctx.arc(x - 60 * (W < 720 ? 0.6 : 1) + Math.cos(ang) * len, sy - 6 + Math.sin(ang) * len, 2.2 + grow * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    if (!running) return;
    var now = performance.now();
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    whales.forEach(function (w) {
      w.sec = (w.sec + dt * SPEED) % (w.depth.length * w.step);
      var d = depthAt(w, w.sec);
      if (w === hero && w.cur > 50 && d < 4 && now > blowUntil) { blowUntil = now + 2200; }
      w.prev = w.cur;
      w.cur = d;
    });
    pickHero();

    // Camera eases toward the hero, keeping the surface in view when she is shallow.
    var want = hero ? Math.max(VIEW_M * 0.26, hero.cur) : VIEW_M * 0.26;
    camTarget = want;
    camDepth += (camTarget - camDepth) * Math.min(1, dt * 1.2);
    var sy = surfaceY();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawSky(sy);
    drawWater(now, sy);

    // Far whales.
    whales.forEach(function (w) {
      if (w === hero) return;
      var x = w.x0 + Math.sin(now / 16000 + w.x0) * w.drift;
      var y = depthToY(w.cur);
      if (y < sy - 10 || y > H + 40) return;
      var ahead = depthAt(w, w.sec + 30) - w.cur;
      var pitch = Math.max(-0.6, Math.min(0.6, ahead / 30 * 0.9));
      w.pitch += (pitch - w.pitch) * 0.04;
      var scale = FAR_W / 100 * w.far * (W < 720 ? 0.8 : 1);
      drawWhale(x, Math.max(sy + 8 * scale, y), w.pitch, scale, FAR, 0.5 + 0.35 * w.far);
    });

    drawRocks(1);

    // Hero, near, with her trail and her light.
    if (hero) {
      var hx = hero.x0 + Math.sin(now / 15000) * hero.drift;
      var hy = depthToY(hero.cur);
      var ahead2 = depthAt(hero, hero.sec + 30) - hero.cur;
      var pitch2 = Math.max(-0.5, Math.min(0.5, ahead2 / 30 * 0.8));
      hero.pitch += (pitch2 - hero.pitch) * 0.03;
      var hs = HERO_W / 100 * (W < 720 ? 0.62 : 1);
      if (hero.cur < 5) hy = sy + 9 * hs;
      drawTrail(hero, hx);
      drawWhale(hx, hy, hero.pitch, hs, NEAR, 1);
      drawBlow(now, hx, sy);
    }

    if (onTick) onTick(hero, whales, sy);
    requestAnimationFrame(draw);
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
        return { id: w.id, depth: w.depth, step: w.step, dives: w.dives, max: w.max,
                 sec: (i * 9973) % (w.depth.length * w.step), pitch: 0, cur: 0, prev: 0, x0: 0, drift: 0, far: 1 };
      });
      whales.forEach(function (w) { w.cur = depthAt(w, w.sec); });
      hero = null;
      pickHero();
      camDepth = VIEW_M * 0.26;
      resize();
      window.addEventListener("resize", resize);
      running = true;
      last = performance.now();
      requestAnimationFrame(draw);
    },
    speed: SPEED,
    pause: function () { running = false; },
    resume: function () { if (!running) { running = true; last = performance.now(); requestAnimationFrame(draw); } },
    underFor: function (w) {
      var s = 0;
      while (s < 6 * 3600 && depthAt(w, w.sec - s) > 50) s += 10;
      return s;
    }
  };
})();
