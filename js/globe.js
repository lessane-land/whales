// A small globe: the Earth seen from above the whale, land in ink, a red point
// where she was tagged, pulsing. Orthographic, drawn on a canvas, no library.
(function () {
  "use strict";
  var canvas = null, ctx = null, land = null, size = 0, dpr = 1;
  var lat = 0, lon = 0, want = { lat: 0, lon: 0 }, have = { lat: 20, lon: 0 }, raf = 0, t0 = 0;
  var INK = "#0a2438", SEA = "#1f9aa6", PALE = "#9ee9e2", RED = "#ff4d4d";

  function toRad(d) { return d * Math.PI / 180; }

  // Orthographic projection centred on (have.lat, have.lon). Points on the far side are
  // pushed to the limb so the land fills close as the globe turns.
  function project(plon, plat, R) {
    var la = toRad(plat), lo = toRad(plon - have.lon), c0 = toRad(have.lat);
    var x = Math.cos(la) * Math.sin(lo);
    var y = Math.cos(c0) * Math.sin(la) - Math.sin(c0) * Math.cos(la) * Math.cos(lo);
    var z = Math.sin(c0) * Math.sin(la) + Math.cos(c0) * Math.cos(la) * Math.cos(lo);
    if (z < 0) { var n = Math.sqrt(x * x + y * y) || 1; x /= n; y /= n; }
    return [x * R, -y * R, z];
  }

  function draw(now) {
    if (!ctx || !land) return;
    var R = size / 2 - 3, cx = size / 2, cy = size / 2;
    // Ease toward the whale.
    var dlon = ((want.lon - have.lon + 540) % 360) - 180;
    have.lon += dlon * 0.06; have.lat += (want.lat - have.lat) * 0.06;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = SEA; ctx.fillRect(0, 0, size, size);
    // Graticule, faint.
    ctx.strokeStyle = "rgba(234, 247, 246, 0.18)"; ctx.lineWidth = 0.8;
    for (var g = -60; g <= 60; g += 30) {
      ctx.beginPath();
      for (var i = 0; i <= 72; i++) { var p = project(i * 5 - 180, g, R); if (p[2] < 0) { ctx.moveTo(cx + p[0], cy + p[1]); continue; } if (i === 0) ctx.moveTo(cx + p[0], cy + p[1]); else ctx.lineTo(cx + p[0], cy + p[1]); }
      ctx.stroke();
    }
    for (var m = -180; m < 180; m += 30) {
      ctx.beginPath();
      for (var j = 0; j <= 36; j++) { var q = project(m, j * 5 - 90, R); if (q[2] < 0) { ctx.moveTo(cx + q[0], cy + q[1]); continue; } if (j === 0) ctx.moveTo(cx + q[0], cy + q[1]); else ctx.lineTo(cx + q[0], cy + q[1]); }
      ctx.stroke();
    }
    // Land.
    ctx.fillStyle = INK;
    land.forEach(function (ring) {
      var front = 0;
      ctx.beginPath();
      ring.forEach(function (pt, i) { var p = project(pt[0], pt[1], R); if (p[2] >= 0) front++; if (i === 0) ctx.moveTo(cx + p[0], cy + p[1]); else ctx.lineTo(cx + p[0], cy + p[1]); });
      ctx.closePath();
      if (front > 0) ctx.fill();
    });
    // A soft shadow toward the edge, so it reads as a ball.
    var sh = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
    sh.addColorStop(0, "rgba(255, 255, 255, 0.08)"); sh.addColorStop(0.7, "rgba(0, 0, 0, 0)"); sh.addColorStop(1, "rgba(5, 20, 35, 0.45)");
    ctx.fillStyle = sh; ctx.fillRect(0, 0, size, size);
    ctx.restore();
    // The whale: a red point with a pulse ring.
    var w = project(lon, lat, R), k = ((now - t0) / 1800) % 1;
    ctx.strokeStyle = "rgba(255, 77, 77, " + (0.8 * (1 - k)).toFixed(2) + ")"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx + w[0], cy + w[1], 3 + k * 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(cx + w[0], cy + w[1], 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.stroke();
    // The rim.
    ctx.strokeStyle = PALE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    if (Math.abs(dlon) > 0.05 || Math.abs(want.lat - have.lat) > 0.05 || true) raf = requestAnimationFrame(draw);
  }

  window.Globe = {
    init: function (el, landUrl) {
      canvas = el; ctx = canvas.getContext("2d");
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth || 72;
      canvas.width = size * dpr; canvas.height = size * dpr;
      t0 = performance.now();
      fetch(landUrl).then(function (r) { return r.json(); }).then(function (rings) { land = rings; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
      window.addEventListener("resize", function () { var s = canvas.clientWidth || size; if (s !== size) { size = s; canvas.width = size * dpr; canvas.height = size * dpr; } });
    },
    // Point the globe at her: the view centres a little north of the point, so the coast around her shows.
    show: function (plat, plon) {
      lat = plat; lon = plon; want.lat = Math.max(-70, Math.min(70, plat + 8)); want.lon = plon;
      if (!raf && land) raf = requestAnimationFrame(draw);
    }
  };
})();
