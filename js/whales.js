// The whales, drawn: a curved silhouette per species in a 100 unit box facing
// left, shading planes clipped inside it, a tail that beats and a pectoral fin
// that sways. Cartoon bodies with the Buff's faceted light.
(function () {
  "use strict";

  // Each species: body (Path2D string), fluke (around the joint at x = jx),
  // fin (pectoral, pivot at fx, fy), optional dorsal and extras, and facets:
  // polygons clipped to the body, with a shade index 0 (light) to 4 (dark).
  var SPECIES = {
    sperm: {
      body: "M-50 -4 C-51 -12 -48 -17 -34 -17 C-16 -17 2 -14 20 -9 C30 -6 38 -3 44 -2 L44 3 C38 4 30 7 18 9 C4 12 -14 13 -32 12 C-44 11 -51 8 -50 -4 Z",
      jx: 44, jy: 0,
      fluke: "M0 0 C5 -4 11 -9 19 -14 C22 -16 24 -14 22 -11 C18 -7 13 -3 10 0 C13 3 18 7 22 11 C24 14 22 16 19 14 C11 9 5 4 0 0 Z",
      fx: -24, fy: 11, fin: "M0 0 C3 2 7 9 9 13 C7 10 3 5 10 2 Z",
      eye: [-41, -2],
      facets: [
        { p: [[-50, -20], [-20, -20], [-14, -6], [-30, -2], [-50, 2]], s: 0 },
        { p: [[-20, -20], [10, -20], [24, -9], [6, -4], [-14, -6]], s: 1 },
        { p: [[-50, 2], [-30, -2], [6, -4], [2, 8], [-30, 10], [-50, 10]], s: 2 },
        { p: [[6, -4], [24, -9], [46, -4], [46, 6], [20, 12], [2, 8]], s: 1 },
        { p: [[-50, 10], [-30, 10], [2, 8], [20, 12], [10, 20], [-50, 20]], s: 3 }
      ]
    },
    blue: {
      body: "M-54 0 C-54 -6 -47 -10 -36 -11 C-18 -13 4 -12 24 -9 C34 -7 42 -4 46 -2 L46 3 C42 6 34 8 22 9 C2 11 -20 11 -38 9 C-48 7 -54 5 -54 0 Z",
      jx: 46, jy: 0,
      fluke: "M0 0 C6 -5 13 -11 22 -17 C25 -19 27 -17 25 -14 C21 -9 15 -4 11 0 C15 4 21 9 25 14 C27 17 25 19 22 17 C13 11 6 5 0 0 Z",
      dorsal: "M26 -9 C28 -14 31 -15 33 -14 C32 -12 31 -10 31 -8 Z",
      fx: -30, fy: 9, fin: "M0 0 C4 2 12 10 16 16 C12 13 5 8 0 4 Z",
      grooves: [[-48, 1, -16, 4], [-46, 3, -14, 6], [-44, 5, -16, 8]],
      eye: [-43, -3],
      facets: [
        { p: [[-54, -20], [-20, -20], [-12, -5], [-32, -1], [-54, 1]], s: 0 },
        { p: [[-20, -20], [14, -20], [26, -8], [8, -3], [-12, -5]], s: 1 },
        { p: [[-54, 1], [-32, -1], [8, -3], [4, 6], [-30, 7], [-54, 6]], s: 2 },
        { p: [[8, -3], [26, -8], [48, -3], [48, 5], [20, 9], [4, 6]], s: 1 },
        { p: [[-54, 6], [-30, 7], [4, 6], [20, 9], [12, 20], [-54, 20]], s: 3 }
      ]
    },
    fin: {
      body: "M-54 1 C-54 -5 -47 -9 -36 -10 C-18 -12 4 -11 24 -8 C34 -6 42 -4 46 -2 L46 3 C42 6 34 8 22 9 C2 10 -20 10 -38 8 C-48 7 -54 5 -54 1 Z",
      jx: 46, jy: 0,
      fluke: "M0 0 C6 -5 13 -11 22 -17 C25 -19 27 -17 25 -14 C21 -9 15 -4 11 0 C15 4 21 9 25 14 C27 17 25 19 22 17 C13 11 6 5 0 0 Z",
      dorsal: "M24 -8 C26 -15 30 -18 33 -17 C31 -13 31 -10 31 -7 Z",
      fx: -28, fy: 8, fin: "M0 0 C4 2 10 9 13 14 C10 11 4 7 0 3 Z",
      grooves: [[-46, 2, -16, 4], [-44, 4, -14, 6]],
      jaw: [[-54, 1], [-30, 2], [-30, 8], [-44, 7]],
      eye: [-43, -3],
      facets: [
        { p: [[-54, -20], [-20, -20], [-12, -5], [-32, -1], [-54, 1]], s: 0 },
        { p: [[-20, -20], [14, -20], [26, -8], [8, -3], [-12, -5]], s: 1 },
        { p: [[-54, 1], [-32, -1], [8, -3], [4, 6], [-30, 7], [-54, 6]], s: 2 },
        { p: [[8, -3], [26, -8], [48, -3], [48, 5], [20, 9], [4, 6]], s: 1 },
        { p: [[-54, 6], [-30, 7], [4, 6], [20, 9], [12, 20], [-54, 20]], s: 3 }
      ]
    },
    cuvier: {
      body: "M-50 1 C-52 -2 -50 -6 -44 -8 C-34 -12 -14 -14 6 -12 C22 -10 36 -6 44 -2 L44 3 C36 6 22 9 6 10 C-14 11 -34 10 -44 7 C-50 5 -52 3 -50 1 Z",
      jx: 44, jy: 0,
      fluke: "M0 0 C5 -4 11 -9 19 -14 C22 -16 24 -14 22 -11 C18 -7 13 -3 10 0 C13 3 18 7 22 11 C24 14 22 16 19 14 C11 9 5 4 0 0 Z",
      dorsal: "M26 -7 C28 -12 31 -13 33 -12 C32 -10 31 -8 31 -6 Z",
      fx: -24, fy: 9, fin: "M0 0 C3 2 7 8 9 12 C7 9 3 5 0 2 Z",
      eye: [-40, -2],
      facets: [
        { p: [[-52, -20], [-18, -20], [-10, -5], [-30, -1], [-52, 1]], s: 0 },
        { p: [[-18, -20], [14, -20], [26, -7], [8, -3], [-10, -5]], s: 1 },
        { p: [[-52, 1], [-30, -1], [8, -3], [4, 6], [-28, 7], [-52, 6]], s: 2 },
        { p: [[8, -3], [26, -7], [46, -3], [46, 5], [20, 9], [4, 6]], s: 1 },
        { p: [[-52, 6], [-28, 7], [4, 6], [20, 9], [12, 20], [-52, 20]], s: 3 }
      ]
    },
    blainville: {
      body: "M-50 0 C-52 -3 -50 -7 -44 -9 C-34 -12 -14 -14 6 -12 C22 -10 36 -6 44 -2 L44 3 C36 6 22 9 6 10 C-14 11 -34 10 -44 7 C-48 6 -50 3 -50 0 Z",
      jx: 44, jy: 0,
      fluke: "M0 0 C5 -4 11 -9 19 -14 C22 -16 24 -14 22 -11 C18 -7 13 -3 10 0 C13 3 18 7 22 11 C24 14 22 16 19 14 C11 9 5 4 0 0 Z",
      dorsal: "M26 -7 C28 -12 31 -13 33 -12 C32 -10 31 -8 31 -6 Z",
      fx: -24, fy: 9, fin: "M0 0 C3 2 7 8 9 12 C7 9 3 5 0 2 Z",
      tusks: [[-40, 7], [-38, 2], [-36, 7]],
      eye: [-40, -2],
      facets: [
        { p: [[-52, -20], [-18, -20], [-10, -5], [-30, -1], [-52, 1]], s: 0 },
        { p: [[-18, -20], [14, -20], [26, -7], [8, -3], [-10, -5]], s: 1 },
        { p: [[-52, 1], [-30, -1], [8, -3], [4, 6], [-28, 7], [-52, 6]], s: 2 },
        { p: [[8, -3], [26, -7], [46, -3], [46, 5], [20, 9], [4, 6]], s: 1 },
        { p: [[-52, 6], [-28, 7], [4, 6], [20, 9], [12, 20], [-52, 20]], s: 3 }
      ]
    },
    pilot: {
      body: "M-50 0 C-50 -9 -44 -14 -34 -14 C-14 -14 6 -11 26 -7 C36 -5 42 -3 45 -2 L45 3 C42 4 36 6 24 8 C4 10 -16 11 -34 10 C-44 9 -50 7 -50 0 Z",
      jx: 45, jy: 0,
      fluke: "M0 0 C5 -4 11 -9 19 -14 C22 -16 24 -14 22 -11 C18 -7 13 -3 10 0 C13 3 18 7 22 11 C24 14 22 16 19 14 C11 9 5 4 0 0 Z",
      dorsal: "M2 -10 C6 -22 14 -25 18 -23 C14 -18 13 -13 15 -8 Z",
      fx: -26, fy: 9, fin: "M0 0 C4 1 12 9 16 15 C12 12 4 8 0 4 Z",
      eye: [-42, -3],
      facets: [
        { p: [[-50, -20], [-20, -20], [-14, -6], [-32, -2], [-50, 0]], s: 0 },
        { p: [[-20, -20], [14, -20], [26, -8], [8, -4], [-14, -6]], s: 1 },
        { p: [[-50, 0], [-32, -2], [8, -4], [4, 6], [-30, 7], [-50, 6]], s: 2 },
        { p: [[8, -4], [26, -8], [46, -3], [46, 5], [20, 9], [4, 6]], s: 1 },
        { p: [[-50, 6], [-30, 7], [4, 6], [20, 9], [12, 20], [-50, 20]], s: 3 }
      ]
    },
    beluga: {
      body: "M-50 1 C-50 -8 -44 -14 -34 -14 C-16 -14 2 -12 20 -9 C32 -7 40 -4 45 -2 L45 3 C40 6 32 8 20 9 C2 10 -16 11 -34 10 C-44 9 -50 7 -50 1 Z",
      jx: 45, jy: 0,
      fluke: "M0 0 C5 -4 11 -9 19 -14 C22 -16 24 -14 22 -11 C18 -7 13 -3 10 0 C13 3 18 7 22 11 C24 14 22 16 19 14 C11 9 5 4 0 0 Z",
      fx: -26, fy: 9, fin: "M0 0 C4 1 10 7 13 12 C10 10 4 6 0 3 Z",
      eye: [-41, -3],
      facets: [
        { p: [[-50, -20], [-20, -20], [-14, -6], [-32, -2], [-50, 1]], s: 0 },
        { p: [[-20, -20], [14, -20], [26, -8], [8, -4], [-14, -6]], s: 1 },
        { p: [[-50, 1], [-32, -2], [8, -4], [4, 6], [-30, 7], [-50, 6]], s: 1 },
        { p: [[8, -4], [26, -8], [46, -3], [46, 5], [20, 9], [4, 6]], s: 2 },
        { p: [[-50, 6], [-30, 7], [4, 6], [20, 9], [12, 20], [-50, 20]], s: 3 }
      ]
    },
    narwhal: {
      body: "M-48 1 C-48 -7 -43 -12 -33 -12 C-15 -12 3 -11 20 -8 C32 -6 40 -4 45 -2 L45 3 C40 5 32 7 20 8 C3 9 -15 10 -33 9 C-43 8 -48 6 -48 1 Z",
      jx: 45, jy: 0,
      fluke: "M0 0 C5 -4 11 -9 19 -14 C22 -16 24 -14 22 -11 C18 -7 13 -3 10 0 C13 3 18 7 22 11 C24 14 22 16 19 14 C11 9 5 4 0 0 Z",
      fx: -24, fy: 8, fin: "M0 0 C3 1 8 6 10 10 C8 8 3 5 0 2 Z",
      tusk: [[-47, -2], [-100, -9], [-47, 1]],
      eye: [-39, -3],
      facets: [
        { p: [[-50, -20], [-20, -20], [-14, -6], [-32, -2], [-50, 1]], s: 0 },
        { p: [[-20, -20], [14, -20], [26, -8], [8, -4], [-14, -6]], s: 1 },
        { p: [[-50, 1], [-32, -2], [8, -4], [4, 6], [-30, 7], [-50, 6]], s: 2 },
        { p: [[8, -4], [26, -8], [46, -3], [46, 5], [20, 9], [4, 6]], s: 1 },
        { p: [[-50, 6], [-30, 7], [4, 6], [20, 9], [12, 20], [-50, 20]], s: 3 }
      ]
    }
  };

  var paths = {};
  function path(key, d) {
    if (!paths[key]) paths[key] = new Path2D(d);
    return paths[key];
  }

  function poly(ctx, pts) {
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.closePath();
  }

  // Draw at the origin, facing left, in the 100 unit box. opts: shade (array of
  // six colours, light to dark, the sixth for pale marks), t (ms for the beat),
  // speed (0 to 1, how hard she swims), flat (a silhouette only), seam alpha.
  window.Whales = {
    kinds: function () { return Object.keys(SPECIES); },
    draw: function (ctx, kind, opts) {
      var sp = SPECIES[kind] || SPECIES.sperm;
      var shade = opts.shade, t = opts.t || 0, speed = opts.speed || 0, flat = !!opts.flat;
      var beat = Math.sin(t / (420 - 160 * speed) + (opts.phase || 0)) * (0.07 + 0.16 * speed);
      var body = path(kind + ":body", sp.body);

      // Pectoral fin behind the body first (the far one), then the body, then the near fin.
      ctx.save();
      ctx.translate(sp.fx + 4, sp.fy - 10);
      ctx.rotate(-0.5 + Math.sin(t / 900) * 0.05);
      ctx.fillStyle = shade[4];
      ctx.fill(path(kind + ":fin", sp.fin));
      ctx.restore();

      // Tail: fluke rotates about the joint.
      ctx.save();
      ctx.translate(sp.jx, sp.jy);
      ctx.rotate(beat);
      ctx.fillStyle = shade[3];
      ctx.fill(path(kind + ":fluke", sp.fluke));
      if (!flat) {
        ctx.strokeStyle = "rgba(190, 225, 240, " + (opts.seam || 0.3) + ")";
        ctx.lineWidth = 0.4;
        ctx.stroke(path(kind + ":fluke", sp.fluke));
      }
      ctx.restore();

      // Dorsal fin.
      if (sp.dorsal) { ctx.fillStyle = shade[2]; ctx.fill(path(kind + ":dorsal", sp.dorsal)); }

      // Body: base, then facets clipped inside.
      ctx.fillStyle = shade[2];
      ctx.fill(body);
      if (!flat) {
        ctx.save();
        ctx.clip(body);
        sp.facets.forEach(function (f) {
          poly(ctx, f.p);
          ctx.fillStyle = shade[f.s];
          ctx.fill();
          ctx.strokeStyle = "rgba(190, 225, 240, " + (opts.seam || 0.3) + ")";
          ctx.lineWidth = 0.4;
          ctx.stroke();
        });
        if (sp.jaw) { poly(ctx, sp.jaw); ctx.fillStyle = shade[5]; ctx.fill(); }
        if (sp.grooves) {
          ctx.strokeStyle = "rgba(190, 225, 240, " + ((opts.seam || 0.3) * 0.9) + ")";
          ctx.lineWidth = 0.5;
          sp.grooves.forEach(function (g) { ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(g[2], g[3]); ctx.stroke(); });
        }
        ctx.restore();
        // A soft darker edge all round, the cartoon line.
        ctx.strokeStyle = "rgba(5, 12, 24, 0.35)";
        ctx.lineWidth = 0.6;
        ctx.stroke(body);
      }
      if (sp.tusk) { poly(ctx, sp.tusk); ctx.fillStyle = shade[5]; ctx.fill(); }
      if (sp.tusks && !flat) { poly(ctx, sp.tusks); ctx.fillStyle = shade[5]; ctx.fill(); }

      // Near pectoral fin, swaying.
      ctx.save();
      ctx.translate(sp.fx, sp.fy);
      ctx.rotate(0.15 + Math.sin(t / 700 + 1) * 0.12 + speed * 0.2);
      ctx.fillStyle = shade[3];
      ctx.fill(path(kind + ":fin", sp.fin));
      if (!flat) { ctx.strokeStyle = "rgba(5, 12, 24, 0.3)"; ctx.lineWidth = 0.5; ctx.stroke(path(kind + ":fin", sp.fin)); }
      ctx.restore();

      if (!flat) {
        ctx.fillStyle = "rgba(10, 18, 30, 0.9)";
        ctx.beginPath(); ctx.arc(sp.eye[0], sp.eye[1], 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(230, 240, 245, 0.9)";
        ctx.beginPath(); ctx.arc(sp.eye[0] - 0.3, sp.eye[1] - 0.3, 0.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  };
})();
