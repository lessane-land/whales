// Design mockups: three directions from the Buff's DNA, one canvas, a style switch.
// The whale is a low-poly mesh built from a silhouette: top and bottom profiles at
// stations along the body, a midline, triangles between them, each lit from above.
(function () {
  "use strict";

  var canvas = document.getElementById("c"), ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  var params = new URLSearchParams(location.search);
  var STYLE = params.get("style") || "A";

  // Humpback silhouette: x along the body (head at -54, tail joint at 44), top and bottom y.
  var HUMPBACK = {
    stations: [
      [-54, -2, 3], [-48, -8, 7], [-40, -12, 10], [-30, -14, 12], [-18, -15, 13], [-6, -16, 13],
      [6, -17, 12], [16, -16, 11], [26, -12, 9], [36, -7, 6], [44, -3, 3]
    ],
    knobs: [[-52, -5], [-49, -8], [-45, -10], [-41, -12], [-36, -13], [-31, -14]],
    dorsal: [[16, -16], [19, -23], [24, -22], [24, -14]],
    fin: { at: [-28, 9], pts: [[0, 0], [10, 6], [22, 15], [34, 28], [40, 40], [36, 40], [26, 30], [14, 18], [4, 8]] },
    fluke: [[44, 0], [52, -8], [62, -18], [70, -24], [72, -20], [64, -12], [56, -4], [54, 0], [56, 4], [64, 12], [72, 20], [70, 24], [62, 18], [52, 8]],
    eye: [-46, -3]
  };

  var PALETTES = {
    A: { // Buff literal: cool blues, white light
      sky: ["#e9f1f4", "#c6dbe5"], mount: ["#bcd5de", "#9ec0cd", "#7faabb"], sun: "rgba(255,252,240,0.9)",
      water: [[0, [70, 178, 206]], [0.12, [44, 140, 174]], [0.35, [26, 92, 132]], [0.7, [14, 48, 86]], [1, [6, 18, 38]]],
      bands: [[236, 248, 250], [160, 220, 235], [80, 176, 204], [36, 116, 156], [18, 64, 100]], bandAlpha: 0.55,
      whale: [16, 32, 56], whaleLight: [92, 128, 164], belly: [214, 226, 232], far: [10, 28, 52], ink: "#0b1f3a"
    },
    B: { // Deep night: one shaft of light, near black, bioluminescence
      sky: ["#0a1222", "#0f1c33"], mount: ["#182a44", "#121f36", "#0d172a"], sun: "rgba(220,230,240,0.85)",
      water: [[0, [16, 44, 70]], [0.15, [10, 30, 54]], [0.4, [6, 18, 36]], [0.75, [3, 9, 20]], [1, [1, 4, 10]]],
      bands: [[150, 200, 220], [90, 150, 180], [40, 90, 120], [20, 50, 80], [10, 30, 50]], bandAlpha: 0.22,
      whale: [8, 16, 30], whaleLight: [70, 110, 150], belly: [160, 190, 205], far: [4, 10, 22], ink: "#eaf4f7"
    },
    C: { // Paper cut: warm teal and sand, soft layers, no facets
      sky: ["#f3eee3", "#dfe6e0"], mount: ["#c9d6cf", "#a9bfb8", "#86a4a0"], sun: "rgba(250,230,190,0.95)",
      water: [[0, [112, 190, 196]], [0.15, [78, 160, 172]], [0.4, [46, 118, 136]], [0.75, [26, 74, 96]], [1, [14, 42, 60]]],
      bands: [[246, 240, 226], [200, 226, 222], [140, 196, 196], [84, 150, 158], [46, 104, 118]], bandAlpha: 0.5,
      whale: [34, 58, 78], whaleLight: [118, 150, 168], belly: [236, 228, 210], far: [28, 60, 80], ink: "#1d3a4a"
    }
  };
  var P = PALETTES[STYLE] || PALETTES.A;

  function rgb(c, a) { return "rgba(" + c[0].toFixed(0) + "," + c[1].toFixed(0) + "," + c[2].toFixed(0) + "," + (a === undefined ? 1 : a) + ")"; }
  function mix(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  var seed = 3;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  // Build triangles from the silhouette: three rows (top edge, midline, bottom edge).
  function meshFrom(sp) {
    var tris = [];
    var st = sp.stations;
    for (var i = 0; i < st.length - 1; i++) {
      var a = st[i], b = st[i + 1];
      var am = (a[1] + a[2]) / 2 + 1, bm = (b[1] + b[2]) / 2 + 1;   // midline, a touch below centre
      // Top band: two triangles, alternating diagonal for the faceted look.
      if (i % 2 === 0) {
        tris.push({ p: [[a[0], a[1]], [b[0], b[1]], [a[0], am]], row: 0 });
        tris.push({ p: [[b[0], b[1]], [b[0], bm], [a[0], am]], row: 0.4 });
      } else {
        tris.push({ p: [[a[0], a[1]], [b[0], b[1]], [b[0], bm]], row: 0 });
        tris.push({ p: [[a[0], a[1]], [b[0], bm], [a[0], am]], row: 0.4 });
      }
      if (i % 2 === 1) {
        tris.push({ p: [[a[0], am], [b[0], bm], [a[0], a[2]]], row: 0.7 });
        tris.push({ p: [[b[0], bm], [b[0], b[2]], [a[0], a[2]]], row: 1 });
      } else {
        tris.push({ p: [[a[0], am], [b[0], bm], [b[0], b[2]]], row: 0.7 });
        tris.push({ p: [[a[0], am], [b[0], b[2]], [a[0], a[2]]], row: 1 });
      }
    }
    return tris;
  }

  function poly(pts) {
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.closePath();
  }

  // Draw the whale at the origin in body units, lit from above. flat: silhouette only.
  function drawWhale(sp, scale, flat, style) {
    var dark = P.whale, light = P.whaleLight, belly = P.belly;
    ctx.save();
    ctx.scale(scale, scale);
    // Far pectoral behind the body.
    ctx.save(); ctx.translate(sp.fin.at[0] + 6, sp.fin.at[1] - 12); ctx.rotate(-0.7);
    poly(sp.fin.pts); ctx.fillStyle = rgb(mix(dark, [0, 0, 0], 0.3)); ctx.fill(); ctx.restore();
    // Fluke: four facets.
    var f = sp.fluke;
    [[0, 1, 2, 3, 4, 5, 6, 7], [7, 8, 9, 10, 11, 12, 13, 0]].forEach(function (idx, k) {
      poly(idx.map(function (i) { return f[i]; }));
      ctx.fillStyle = flat ? rgb(P.far) : rgb(mix(dark, light, k === 0 ? 0.35 : 0.08));
      ctx.fill();
    });
    // Dorsal fin.
    poly(sp.dorsal); ctx.fillStyle = flat ? rgb(P.far) : rgb(mix(dark, light, 0.25)); ctx.fill();
    if (flat) {
      // Silhouette.
      var top = sp.stations.map(function (s) { return [s[0], s[1]]; });
      var bot = sp.stations.map(function (s) { return [s[0], s[2]]; }).reverse();
      poly(top.concat(bot)); ctx.fillStyle = rgb(P.far); ctx.fill();
      ctx.restore();
      return;
    }
    if (style === "C") {
      // Paper cut: three soft layers, no facets.
      var top2 = sp.stations.map(function (s) { return [s[0], s[1]]; });
      var bot2 = sp.stations.map(function (s) { return [s[0], s[2]]; }).reverse();
      poly(top2.concat(bot2)); ctx.fillStyle = rgb(dark); ctx.fill();
      var mid2 = sp.stations.map(function (s) { return [s[0], (s[1] + s[2]) / 2 + 2]; }).reverse();
      poly(top2.concat(mid2)); ctx.fillStyle = rgb(mix(dark, light, 0.45)); ctx.fill();
      var thr = sp.stations.slice(0, 6).map(function (s) { return [s[0], s[2]]; });
      poly([[sp.stations[0][0], sp.stations[0][1] + 4]].concat(sp.stations.slice(0, 6).map(function (s) { return [s[0], (s[1] + s[2]) / 2 + 3]; })).concat(thr.reverse()));
      ctx.fillStyle = rgb(belly); ctx.fill();
    } else {
      var tris = meshFrom(sp);
      seed = 11;
      tris.forEach(function (t) {
        var n = (rnd() - 0.5) * 0.16;
        var k = Math.max(0, Math.min(1, 1 - t.row * 0.95 + n));   // top rows light, bottom dark
        var c = mix(dark, light, k);
        if (t.row >= 0.7 && t.p[0][0] < -16) c = mix(c, belly, t.row === 1 ? 0.8 : 0.35);   // throat pleats, pale
        poly(t.p); ctx.fillStyle = rgb(c); ctx.fill();
        if (style === "A" && t.row === 0) { ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 0.35; ctx.stroke(); }
      });
      // Pleat lines on the throat.
      ctx.strokeStyle = rgb(mix(belly, dark, 0.55), 0.7); ctx.lineWidth = 0.5;
      for (var g = 0; g < 5; g++) { ctx.beginPath(); ctx.moveTo(-50 + g, 4 + g * 1.6); ctx.lineTo(-20 + g * 2, 6 + g * 1.4); ctx.stroke(); }
    }
    // Knobs on the head.
    ctx.fillStyle = rgb(mix(dark, [0, 0, 0], 0.35));
    sp.knobs.forEach(function (k) { ctx.beginPath(); ctx.arc(k[0], k[1], 1.0, 0, Math.PI * 2); ctx.fill(); });
    // Eye: a small dark facet with a glint.
    ctx.fillStyle = rgb(mix(dark, [0, 0, 0], 0.6)); poly([[sp.eye[0] - 1.6, sp.eye[1]], [sp.eye[0], sp.eye[1] - 1.2], [sp.eye[0] + 1.6, sp.eye[1]], [sp.eye[0], sp.eye[1] + 1.1]]); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(sp.eye[0] + 0.4, sp.eye[1] - 0.4, 0.35, 0, 6.28); ctx.fill();
    // Near pectoral, with bumps on its leading edge.
    ctx.save(); ctx.translate(sp.fin.at[0], sp.fin.at[1]); ctx.rotate(0.05);
    poly(sp.fin.pts); ctx.fillStyle = rgb(mix(dark, light, style === "C" ? 0.3 : 0.18)); ctx.fill();
    poly([[0, 0], [10, 6], [22, 15], [34, 28], [40, 40], [34, 34], [20, 20], [8, 9]]); ctx.fillStyle = rgb(mix(dark, light, 0.42)); ctx.fill();
    ctx.fillStyle = rgb(belly, 0.7);
    [[7, 3], [14, 8], [21, 14], [28, 22], [34, 30]].forEach(function (b) { ctx.beginPath(); ctx.arc(b[0], b[1], 0.9, 0, 6.28); ctx.fill(); });
    ctx.restore();
    ctx.restore();
  }

  function scene() {
    var sy = Math.round(H * 0.22);
    // Sky
    var g = ctx.createLinearGradient(0, 0, 0, sy); g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, sy);
    // Stars for the night
    if (STYLE === "B") { seed = 77; ctx.fillStyle = "rgba(255,250,235,0.8)"; for (var i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(rnd() * W, rnd() * sy * 0.7, 0.6 + rnd(), 0, 6.28); ctx.fill(); } }
    ctx.fillStyle = P.sun; ctx.beginPath(); ctx.arc(W * (STYLE === "B" ? 0.72 : 0.5), sy * 0.5, sy * (STYLE === "B" ? 0.2 : 0.36), 0, 6.28); ctx.fill();
    [[0.62, 3], [0.48, 11], [0.34, 5]].forEach(function (r, idx) {
      ctx.fillStyle = P.mount[idx]; ctx.beginPath(); ctx.moveTo(0, sy); seed = r[1]; var x = 0; ctx.lineTo(0, sy - sy * r[0] * 0.5);
      while (x < W) { var step = 60 + rnd() * 160; var peak = sy - sy * r[0] * (0.45 + rnd() * 0.55); x += step / 2; ctx.lineTo(x, peak); x += step / 2; ctx.lineTo(x, sy - sy * r[0] * (0.25 + rnd() * 0.3)); }
      ctx.lineTo(W, sy); ctx.closePath(); ctx.fill();
    });
    // Water
    var wg = ctx.createLinearGradient(0, sy, 0, H); P.water.forEach(function (s) { wg.addColorStop(s[0], rgb(s[1])); });
    ctx.fillStyle = wg; ctx.fillRect(0, sy, W, H - sy);
    // Bands
    seed = 11; var x = -10, i2 = 0, tones = [0, 1, 2, 1, 3, 2, 4, 1, 0, 2, 3, 1, 2, 4, 0, 3];
    while (x < W + 10) {
      var w = 6 + rnd() * 48; if (rnd() < 0.2) w += 36;
      var tone = tones[i2 % tones.length], c = P.bands[tone];
      var lg = ctx.createLinearGradient(0, sy, 0, H);
      var a0 = P.bandAlpha * (tone <= 1 ? 1 : 0.7);
      lg.addColorStop(0, rgb(c, a0)); lg.addColorStop(0.35, rgb(c, a0 * 0.45)); lg.addColorStop(1, rgb(c, STYLE === "C" ? a0 * 0.3 : 0.04));
      ctx.fillStyle = lg; ctx.fillRect(x, sy, w, H - sy);
      x += w + (STYLE === "C" ? 0 : 4 + rnd() * 30); i2++;
    }
    // Surface band
    var sb = ctx.createLinearGradient(0, sy, 0, sy + 90); sb.addColorStop(0, "rgba(255,255,255,0.6)"); sb.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sb; ctx.fillRect(0, sy, W, 90); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(0, sy - 1, W, 2);
    // Night: one shaft of moonlight
    if (STYLE === "B") { var mg = ctx.createLinearGradient(0, sy, 0, H); mg.addColorStop(0, "rgba(200,225,240,0.28)"); mg.addColorStop(1, "rgba(200,225,240,0)"); ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(W * 0.62, sy); ctx.lineTo(W * 0.82, sy); ctx.lineTo(W * 0.95, H); ctx.lineTo(W * 0.5, H); ctx.closePath(); ctx.fill(); }
    // Far whales: silhouettes
    [[W * 0.78, sy + H * 0.12, 0.9, 0.1], [W * 0.88, sy + H * 0.3, 0.6, -0.3], [W * 0.16, sy + H * 0.55, 0.75, 0.2]].forEach(function (f) {
      ctx.save(); ctx.translate(f[0], f[1]); ctx.rotate(f[3]); drawWhale(HUMPBACK, f[2], true, STYLE); ctx.restore();
    });
    // Reef and coral at the bottom left
    ctx.fillStyle = rgb(P.far); ctx.beginPath(); ctx.moveTo(0, H * 0.78); ctx.lineTo(W * 0.08, H * 0.74); ctx.lineTo(W * 0.16, H * 0.8); ctx.lineTo(W * 0.24, H * 0.77); ctx.lineTo(W * 0.3, H * 0.86); ctx.lineTo(W * 0.36, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e0604a"; ctx.lineWidth = 2; ctx.lineCap = "round"; for (var c1 = 0; c1 < 7; c1++) { var a = -Math.PI / 2 + (c1 - 3) * 0.28; ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.74); ctx.lineTo(W * 0.1 + Math.cos(a) * 16, H * 0.74 + Math.sin(a) * 16); ctx.stroke(); }
    ctx.strokeStyle = "#5fd3a2"; for (var c2 = 0; c2 < 6; c2++) { var b2 = -Math.PI / 2 + (c2 - 2.5) * 0.34; ctx.beginPath(); ctx.moveTo(W * 0.2, H * 0.78); ctx.quadraticCurveTo(W * 0.2 + Math.cos(b2) * 10, H * 0.78 + Math.sin(b2) * 10 - 4, W * 0.2 + Math.cos(b2) * 18, H * 0.78 + Math.sin(b2) * 18); ctx.stroke(); }
    // Bioluminescence for the night
    if (STYLE === "B") { seed = 99; for (var k2 = 0; k2 < 60; k2++) { ctx.fillStyle = "rgba(120,220,230," + (0.2 + rnd() * 0.6).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(rnd() * W, sy + rnd() * (H - sy), 0.8 + rnd() * 1.8, 0, 6.28); ctx.fill(); } }
    // The hero: diving steeply, head down, tail near the surface.
    ctx.save(); ctx.translate(W * 0.4, sy + H * 0.36); ctx.rotate(-1.05); drawWhale(HUMPBACK, Math.min(W, 1280) / 100 * 0.52, false, STYLE); ctx.restore();
    // A diving bird for the Buff's sake, near the surface
    ctx.fillStyle = rgb(P.far); ctx.save(); ctx.translate(W * 0.7, sy + 40); ctx.rotate(1.2); poly([[0, 0], [10, -3], [18, 2], [10, 5], [4, 8], [-6, 4]]); ctx.fill(); ctx.restore();
    // Type: minimal on the page; in the kiosk, no title, the depth huge, the story as a caption.
    var kiosk = params.has("kiosk");
    if (!kiosk) {
      ctx.fillStyle = STYLE === "A" || STYLE === "C" ? P.ink : "#eaf4f7"; ctx.font = "400 44px Georgia, serif"; ctx.textBaseline = "top"; ctx.fillText("Ballenas", 32, 28);
      ctx.font = "13px -apple-system, Helvetica, Arial, sans-serif"; ctx.fillStyle = STYLE === "B" ? "rgba(234,244,247,0.7)" : "rgba(11,31,58,0.7)"; ctx.fillText("Ballenas reales, inmersión a inmersión", 32, 80);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#ffffff";
    var big = kiosk ? 150 : 96, base = kiosk ? H - 170 : H - 150;
    ctx.font = "400 " + big + "px Georgia, serif"; ctx.fillText("30 m", W - 48, base);
    ctx.font = "400 " + (kiosk ? 28 : 22) + "px Georgia, serif"; ctx.fillStyle = "rgba(234,244,247,0.8)"; ctx.fillText("Jorobada Samovar", W - 48, base + (kiosk ? 44 : 38));
    ctx.font = "400 " + (kiosk ? 26 : 20) + "px Georgia, serif"; ctx.fillStyle = "#ffffff"; ctx.fillText("Gira de costado sobre la arena a 30 metros, barriendo lanzones.", W - 48, base + (kiosk ? 84 : 70));
    ctx.font = (kiosk ? 14 : 12) + "px -apple-system, Helvetica, Arial, sans-serif"; ctx.fillStyle = "rgba(234,244,247,0.55)"; ctx.fillText("Banco de Stellwagen, julio de 2009 · 90 veces más rápido", W - 48, base + (kiosk ? 114 : 96));
    if (kiosk) {
      // A quiet vignette so the words sit on the water.
      var vg = ctx.createRadialGradient(W * 0.85, H * 0.85, 0, W * 0.85, H * 0.85, W * 0.45);
      vg.addColorStop(0, "rgba(5,15,30,0.45)"); vg.addColorStop(1, "rgba(5,15,30,0)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  scene();
})();
