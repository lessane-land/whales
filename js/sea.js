// The sea: a vertical world. Sky and mountains above the line, light falling in
// stripes, and the whales at their real recorded depths, each on her own clock.
(function () {
  "use strict";

  var MAX_DEPTH = 1600;       // metres at the bottom of the screen
  var SPEED = 90;             // seconds of whale life per second on screen
  var TRAIL_SEC = 40 * 60;    // seconds of dive profile trailing behind each whale
  var TRAIL_PX_PER_MIN = 2.6; // horizontal scale of the trail
  var WHALE_W = 84;

  var canvas, ctx, W = 0, H = 0, dpr = 1, surfaceY = 0, whales = [], data = null;
  var last = 0, running = false, onTick = null, stripes = [];

  // Depth colours, top to bottom.
  var STOPS = [
    [0, [63, 169, 197]],
    [120, [40, 132, 165]],
    [350, [27, 86, 124]],
    [700, [16, 50, 86]],
    [1100, [10, 30, 58]],
    [1600, [5, 13, 30]]
  ];

  function lerpColor(d) {
    for (var i = 1; i < STOPS.length; i++) {
      if (d <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], f = (d - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
      }
    }
    return STOPS[STOPS.length - 1][1];
  }

  function rgb(c, a) { return "rgba(" + c[0].toFixed(0) + "," + c[1].toFixed(0) + "," + c[2].toFixed(0) + "," + (a === undefined ? 1 : a) + ")"; }

  function depthToY(d) { return surfaceY + (d / MAX_DEPTH) * (H - surfaceY - 24); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    surfaceY = Math.round(H * (W < 720 ? 0.2 : 0.24));
    layoutWhales();
    makeStripes();
  }

  function makeStripes() {
    stripes = [];
    var x = 0, seed = 7;
    while (x < W) {
      seed = (seed * 9301 + 49297) % 233280;
      var w = 8 + (seed / 233280) * 60;
      seed = (seed * 9301 + 49297) % 233280;
      var a = 0.05 + (seed / 233280) * 0.16;
      stripes.push({ x: x, w: w, a: a, phase: seed / 233280 * Math.PI * 2 });
      x += w + 4 + (seed % 23);
    }
  }

  function layoutWhales() {
    // Narrow screens show the five deepest divers; the rest wait for a wider sea.
    var shown = whales.filter(function (w, i) { return W >= 720 || i < 5; });
    whales.forEach(function (w) { w.hidden = shown.indexOf(w) < 0; });
    var n = shown.length;
    shown.forEach(function (w, i) {
      w.x0 = W * (0.1 + 0.8 * (i + 0.5) / n);
      w.drift = 10 + (i % 3) * 8;
    });
  }

  // Depth of a whale at a fractional second of her window.
  function depthAt(w, sec) {
    var k = sec / w.step;
    var i = Math.floor(k), f = k - i, n = w.depth.length;
    i = ((i % n) + n) % n;
    var a = w.depth[i], b = w.depth[(i + 1) % n];
    return a + (b - a) * f;
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, surfaceY);
    g.addColorStop(0, "#e9f1f4");
    g.addColorStop(1, "#c7dde6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, surfaceY);
    // Sun, pale.
    ctx.fillStyle = "rgba(255, 252, 240, 0.85)";
    ctx.beginPath();
    ctx.arc(W * 0.5, surfaceY * 0.52, surfaceY * 0.36, 0, Math.PI * 2);
    ctx.fill();
    // Mountains: three geometric ranges, far to near.
    var ranges = [
      { h: 0.62, c: "#b9d3dd", seed: 3 },
      { h: 0.48, c: "#9cbfcc", seed: 11 },
      { h: 0.34, c: "#7faabb", seed: 5 }
    ];
    ranges.forEach(function (r) {
      ctx.fillStyle = r.c;
      ctx.beginPath();
      ctx.moveTo(0, surfaceY);
      var s = r.seed, x = 0;
      ctx.lineTo(0, surfaceY - surfaceY * r.h * 0.5);
      while (x < W) {
        s = (s * 9301 + 49297) % 233280;
        var step = 60 + (s / 233280) * 160;
        s = (s * 9301 + 49297) % 233280;
        var peak = surfaceY - surfaceY * r.h * (0.45 + (s / 233280) * 0.55);
        x += step / 2;
        ctx.lineTo(x, peak);
        x += step / 2;
        s = (s * 9301 + 49297) % 233280;
        ctx.lineTo(x, surfaceY - surfaceY * r.h * (0.25 + (s / 233280) * 0.3));
      }
      ctx.lineTo(W, surfaceY);
      ctx.closePath();
      ctx.fill();
    });
    // Haze over the far ranges.
    var hz = ctx.createLinearGradient(0, surfaceY * 0.4, 0, surfaceY);
    hz.addColorStop(0, "rgba(233, 241, 244, 0)");
    hz.addColorStop(1, "rgba(233, 241, 244, 0.5)");
    ctx.fillStyle = hz;
    ctx.fillRect(0, 0, W, surfaceY);
  }

  function drawWater(now) {
    var g = ctx.createLinearGradient(0, surfaceY, 0, H);
    STOPS.forEach(function (s) { g.addColorStop(s[0] / MAX_DEPTH, rgb(s[1])); });
    ctx.fillStyle = g;
    ctx.fillRect(0, surfaceY, W, H - surfaceY);
    // Light stripes falling from the surface, fading by 500 m, swaying slowly.
    var fadeY = depthToY(520);
    stripes.forEach(function (s) {
      var sway = Math.sin(now / 9000 + s.phase) * 6;
      var lg = ctx.createLinearGradient(0, surfaceY, 0, fadeY);
      lg.addColorStop(0, "rgba(220, 245, 250, " + s.a.toFixed(3) + ")");
      lg.addColorStop(1, "rgba(220, 245, 250, 0)");
      ctx.fillStyle = lg;
      ctx.fillRect(s.x + sway, surfaceY, s.w, fadeY - surfaceY);
    });
    // Surface line.
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(0, surfaceY - 1, W, 2);
    // Depth ticks.
    ctx.font = "11px " + mono;
    ctx.fillStyle = "rgba(234, 244, 247, 0.38)";
    ctx.textBaseline = "middle";
    [200, 500, 1000, 1500].forEach(function (d) {
      var y = depthToY(d);
      ctx.fillRect(16, y, 10, 1);
      ctx.fillText(tickText(d), 30, y);
    });
  }

  // A sperm whale, low poly, facing left, in a 100 x 44 box. Three shades.
  function drawWhale(x, y, pitch, scale, dark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pitch);
    ctx.scale(scale, scale);
    var body = dark ? "#0a1628" : "#102642";
    var mid = dark ? "#0f1f36" : "#173453";
    var lite = dark ? "#142844" : "#1f4164";
    // Body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-50, 2);    // head front, blunt
    ctx.lineTo(-46, -12);
    ctx.lineTo(-20, -15);
    ctx.lineTo(10, -11);
    ctx.lineTo(34, -4);
    ctx.lineTo(46, -2);
    ctx.lineTo(50, -10);   // fluke top
    ctx.lineTo(44, 0);
    ctx.lineTo(50, 10);    // fluke bottom
    ctx.lineTo(40, 4);
    ctx.lineTo(28, 7);
    ctx.lineTo(6, 12);
    ctx.lineTo(-18, 13);
    ctx.lineTo(-38, 12);
    ctx.lineTo(-48, 8);
    ctx.closePath();
    ctx.fill();
    // Facets: lighter planes on the back and head.
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(-46, -12); ctx.lineTo(-20, -15); ctx.lineTo(-24, 0); ctx.lineTo(-50, 2); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-20, -15); ctx.lineTo(10, -11); ctx.lineTo(0, 0); ctx.lineTo(-24, 0); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lite;
    ctx.beginPath();
    ctx.moveTo(10, -11); ctx.lineTo(34, -4); ctx.lineTo(28, 7); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fill();
    // Fin
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(-26, 12); ctx.lineTo(-18, 20); ctx.lineTo(-8, 13); ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = "rgba(200, 230, 240, 0.8)";
    ctx.beginPath(); ctx.arc(-40, 2, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTrail(w, sec, x, now) {
    // The dive profile of the last TRAIL_SEC, trailing to the right of the whale.
    ctx.beginPath();
    var pxPerSec = TRAIL_PX_PER_MIN / 60;
    var first = true;
    for (var s = 0; s <= TRAIL_SEC; s += 20) {
      var d = depthAt(w, sec - s);
      var px = x + s * pxPerSec, py = depthToY(d);
      if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
    }
    var g = ctx.createLinearGradient(x, 0, x + TRAIL_SEC * pxPerSec, 0);
    g.addColorStop(0, "rgba(200, 236, 245, 0.55)");
    g.addColorStop(1, "rgba(200, 236, 245, 0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  var mono = "monospace", serif = "serif", sans = "sans-serif";
  var tickText = function (d) { return d + " m"; };

  function draw() {
    if (!running) return;
    var now = performance.now();
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky();
    drawWater(now);

    var deepest = null;
    whales.forEach(function (w) {
      w.sec = (w.sec + dt * SPEED) % (w.depth.length * w.step);
      if (w.hidden) { w.cur = depthAt(w, w.sec); return; }
      var d = depthAt(w, w.sec);
      var ahead = depthAt(w, w.sec + 30);
      var slope = (ahead - d) / 30;               // metres per second, positive going down
      var pitch = Math.max(-0.6, Math.min(0.6, slope * 0.9));
      w.pitch += (pitch - w.pitch) * 0.04;
      var x = w.x0 + Math.sin(now / 14000 + w.x0) * w.drift;
      var y = depthToY(d);
      if (d < 6) y = surfaceY + 6;
      drawTrail(w, w.sec, x, now);
      var scale = WHALE_W / 100 * (W < 720 ? 0.7 : 1);
      drawWhale(x, y, w.pitch, scale, d > 600);
      // Label
      ctx.font = (W < 720 ? "11px " : "12px ") + sans;
      ctx.fillStyle = "rgba(234, 244, 247, " + (d > 900 ? 0.5 : 0.75) + ")";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(w.label(d, w), x - WHALE_W / 2 * scale, y + 22 * scale);
      w.cur = d;
      if (!w.hidden && (!deepest || d > deepest.cur)) deepest = w;
    });

    if (onTick) onTick(deepest, whales);
    requestAnimationFrame(draw);
  }

  window.Sea = {
    init: function (el, dataIn, opts) {
      canvas = el;
      data = dataIn;
      ctx = canvas.getContext("2d");
      var fonts = getComputedStyle(document.body);
      mono = fonts.getPropertyValue("--mono") || mono;
      serif = fonts.getPropertyValue("--serif") || serif;
      sans = fonts.getPropertyValue("--sans") || sans;
      if (opts && opts.tick) tickText = opts.tick;
      onTick = opts && opts.onTick;
      whales = data.whales.map(function (w, i) {
        // Start each whale at a different point of her day, so the sea is never in step.
        return { id: w.id, depth: w.depth, step: w.step, dives: w.dives, max: w.max,
                 sec: (i * 9973) % (w.depth.length * w.step), pitch: 0, cur: 0, x0: 0, drift: 0,
                 label: opts && opts.label ? opts.label : function (d) { return Math.round(d) + " m"; } };
      });
      resize();
      window.addEventListener("resize", resize);
      running = true;
      last = performance.now();
      requestAnimationFrame(draw);
    },
    speed: SPEED,
    pause: function () { running = false; },
    resume: function () { if (!running) { running = true; last = performance.now(); requestAnimationFrame(draw); } },
    // Seconds spent under 50 m in the current dive, for the headline.
    underFor: function (w) {
      var s = 0;
      while (s < 6 * 3600 && depthAt(w, w.sec - s) > 50) s += 10;
      return s;
    }
  };
})();
