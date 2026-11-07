// Anime prototype: cel shading in three tones with ink outlines, smooth shapes,
// soft light beams, sparkles, a big expressive eye. Same teal palette as the poster.
// ?dive  ?night  ?deep  ?pal=blue
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
const p = new URLSearchParams(location.search);
const flags = new Set([...p.keys(), ...location.hash.replace("#", "").split("-")]);
const NIGHT = flags.has("night"), DEEP = flags.has("deep"), DIVE = flags.has("dive");
addEventListener("hashchange", () => location.reload());

const PALS = {
  teal: {
    ink: 0x071a2c, line: 0x0a2438,
    back: 0x14536a, flank: 0x1f9aa6, belly: 0xe6fbf8, fin: 0x1a7a8c,
    floor: 0x0c3a4c, floorLit: 0x146478, rock: 0x0b2c3c, near: 0x061a26, ridge: 0x156a80,
    surface: 0x7fe3dc, kelp: 0x1c9a80, fish: 0xffffff, coral: 0xff8a66, teal: 0x8ff0d0,
    water: { day: [[0, [84, 222, 214]], [.2, [34, 170, 176]], [.5, [18, 112, 136]], [.8, [10, 58, 88]], [1, [7, 30, 54]]], night: [[0, [18, 72, 86]], [.3, [10, 44, 62]], [.7, [5, 18, 32]], [1, [3, 8, 16]]], deep: [[0, [8, 36, 52]], [.5, [5, 20, 34]], [1, [2, 8, 16]]] },
    sky: ["#f4fbfb", "#c7ece9"], mount: ["#a8dfda", "#7cc9c6", "#56adb0"]
  },
  blue: {
    ink: 0x071327, line: 0x0b1d3a,
    back: 0x1b3f74, flank: 0x2f76b8, belly: 0xeaf5fb, fin: 0x245c98,
    floor: 0x0d2e52, floorLit: 0x174a7c, rock: 0x0c2544, near: 0x071327, ridge: 0x1f5a90,
    surface: 0x8fd4f0, kelp: 0x1f8a70, fish: 0xffffff, coral: 0xff8a66, teal: 0x6fe0c0,
    water: { day: [[0, [80, 190, 230]], [.2, [38, 136, 196]], [.5, [24, 90, 150]], [.85, [14, 46, 92]], [1, [8, 26, 54]]], night: [[0, [20, 52, 84]], [.3, [10, 30, 56]], [.7, [4, 12, 28]], [1, [2, 6, 14]]], deep: [[0, [8, 30, 56]], [.5, [4, 16, 34]], [1, [2, 8, 18]]] },
    sky: ["#eef6f9", "#bfe0ee"], mount: ["#a9d2e3", "#86bdd4", "#63a3c2"]
  }
};
const P = PALS[p.get("pal")] || PALS.teal;
const dim = DEEP ? 0.45 : NIGHT ? 0.55 : 1;
const INK = new THREE.Color(P.ink);
const col = hex => new THREE.Color(hex).lerp(INK, 1 - dim);
let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

// Cel: three tones. The gradient map quantises the light into shadow, mid and lit.
const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const cel = (hex, extra = {}) => new THREE.MeshToonMaterial({ color: col(hex), gradientMap: grad, ...extra });
// Ink outline: the same mesh pushed out along its normals, drawn inside out.
function inked(mesh, width = 0.12, bend = null) {
  const m = new THREE.MeshBasicMaterial({ color: P.line, side: THREE.BackSide });
  m.onBeforeCompile = sh => {
    if (bend) bend(sh);
    sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\ntransformed += normalize(normal) * ${width.toFixed(3)};`);
  };
  const o = new THREE.Mesh(mesh.geometry, m); mesh.add(o); return o;
}

// Camera and backdrop, as in the poster.
const PITCH = 0.08, VIEW_H = 30, aspect = W / H;
const camera = new THREE.OrthographicCamera(-VIEW_H * aspect / 2, VIEW_H * aspect / 2, VIEW_H / 2, -VIEW_H / 2, 1, 600);
const target = new THREE.Vector3(0, -3, 0);
camera.position.set(0, target.y + Math.sin(PITCH) * 220, Math.cos(PITCH) * 220); camera.lookAt(target); camera.updateMatrixWorld();
const SURF = DEEP ? 60 : 6, FLOOR = -16;
const back = document.getElementById("back"), bctx = back.getContext("2d");
back.width = W * dpr; back.height = H * dpr; bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
function toScreen(v) { const q = v.clone().project(camera); return { x: (q.x + 1) / 2 * W, y: (1 - q.y) / 2 * H }; }
const sy = DEEP ? -10 : toScreen(new THREE.Vector3(0, SURF, -34)).y;
function rgb(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
(function paintBack() {
  if (!DEEP) {
    const sky = NIGHT ? ["#0a1222", "#10203a"] : P.sky, mount = NIGHT ? ["#182a44", "#121f36", "#0d172a"] : P.mount;
    const g = bctx.createLinearGradient(0, 0, 0, sy); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); bctx.fillStyle = g; bctx.fillRect(0, 0, W, sy);
    if (NIGHT) { seed = 77; bctx.fillStyle = "rgba(255,250,235,.8)"; for (let i = 0; i < 90; i++) { bctx.beginPath(); bctx.arc(rnd() * W, rnd() * sy * .7, .6 + rnd(), 0, 6.28); bctx.fill(); } }
    bctx.fillStyle = NIGHT ? "rgba(220,230,240,.9)" : "#fff3d6"; bctx.beginPath(); bctx.arc(W * (NIGHT ? .72 : .5), sy * .5, sy * (NIGHT ? .2 : .36), 0, 6.28); bctx.fill();
    [[.62, 3], [.48, 11], [.34, 5]].forEach((r, idx) => {
      bctx.fillStyle = mount[idx]; bctx.beginPath(); bctx.moveTo(0, sy); seed = r[1]; let x = 0; bctx.lineTo(0, sy - sy * r[0] * .5);
      while (x < W) { const step = 60 + rnd() * 160; const peak = sy - sy * r[0] * (.45 + rnd() * .55); x += step / 2; bctx.lineTo(x, peak); x += step / 2; bctx.lineTo(x, sy - sy * r[0] * (.25 + rnd() * .3)); }
      bctx.lineTo(W, sy); bctx.closePath(); bctx.fill();
    });
  }
  const water = DEEP ? P.water.deep : NIGHT ? P.water.night : P.water.day;
  const wg = bctx.createLinearGradient(0, Math.max(0, sy), 0, H); water.forEach(s => wg.addColorStop(s[0], rgb(s[1])));
  bctx.fillStyle = wg; bctx.fillRect(0, Math.max(0, sy), W, H);
  // A soft glow under the surface, the anime bloom.
  if (!DEEP) { const gl = bctx.createLinearGradient(0, sy, 0, sy + H * 0.35); gl.addColorStop(0, NIGHT ? "rgba(180,220,230,.25)" : "rgba(255,255,255,.45)"); gl.addColorStop(1, "rgba(255,255,255,0)"); bctx.fillStyle = gl; bctx.fillRect(0, sy, W, H * 0.35); }
})();

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), alpha: true, antialias: true });
renderer.setPixelRatio(dpr); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
// Toon lighting: one sun from above and front, a cool ambient. Night turns the sun into moon.
const sun = new THREE.DirectionalLight(0xffffff, NIGHT ? 1.4 : 2.2); sun.position.set(-0.4, 1, 0.9); scene.add(sun);
scene.add(new THREE.AmbientLight(NIGHT || DEEP ? 0x2a4a60 : 0x4a8aa0, NIGHT || DEEP ? 0.9 : 0.8));

// Surface: smooth waves, bright, with highlight lines drawn as ink in white.
let surface = null;
if (!DEEP) {
  const g = new THREE.PlaneGeometry(260, 30, 80, 10); g.rotateX(-Math.PI / 2); g.translate(0, SURF, -19);
  g.userData.base = g.attributes.position.array.slice();
  surface = new THREE.Mesh(g, cel(P.surface, { transparent: true, opacity: 0.9 })); scene.add(surface);
  const fp = []; for (let i = 0; i <= 120; i++) fp.push(-130 + i * 260 / 120, SURF, -4.2);
  const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
  surface.userData.foam = new THREE.Line(fg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: NIGHT ? 0.5 : 1 })); scene.add(surface.userData.foam);
  // Two fainter wave lines further back, the banding of a drawn sea.
  surface.userData.lines = [-12, -21].map((z, k) => { const q = []; for (let i = 0; i <= 120; i++) q.push(-130 + i * 260 / 120, SURF, z); const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(q, 3)); const l = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: (NIGHT ? 0.2 : 0.45) / (k + 1) })); l.userData.z = z; scene.add(l); return l; });
}

// Light beams: wide, soft, diagonal, breathing. The anime kind.
const rayTex = (() => {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d"), img = x.createImageData(64, 128);
  for (let j = 0; j < 128; j++) for (let i = 0; i < 64; i++) { const u = (i - 31.5) / 32, v = j / 128, a = Math.max(0, 1 - u * u) ** 2 * (1 - v) ** 1.4; const k = (j * 64 + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a * 255; }
  x.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
})();
function wedge(wTop, wBottom, h) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-wTop / 2, 0, 0, wTop / 2, 0, 0, wBottom / 2, -h, 0, -wBottom / 2, -h, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 2, 1, 0, 3, 2]); return g;
}
const rays = new THREE.Group(); seed = 11;
const RAY_A = NIGHT ? 0.16 : 0.6;
for (let i = 0; i < (DEEP ? 0 : 9); i++) {
  const w = 2 + rnd() * 5 + (rnd() < .3 ? 8 : 0), h = 32;
  const m = new THREE.Mesh(wedge(w, w * 2.4, h), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: RAY_A * (0.5 + rnd() * 0.6), blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(-56 + rnd() * 112, SURF - 0.2, -30 + rnd() * 22); m.rotation.z = 0.18 + (rnd() - .5) * 0.1;
  m.userData = { x: m.position.x, z0: m.rotation.z, k: 0.4 + rnd() * 0.6, a: m.material.opacity }; rays.add(m);
}
scene.add(rays);

// Sparkles: bright specks of three sizes that twinkle, and slow snow.
const sparkTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const sparkN = DEEP ? 1600 : 420, sparkPos = new Float32Array(sparkN * 3), sparkPh = new Float32Array(sparkN); seed = 5;
for (let i = 0; i < sparkN; i++) { sparkPos[i * 3] = -80 + rnd() * 160; sparkPos[i * 3 + 1] = -20 + rnd() * 28; sparkPos[i * 3 + 2] = -50 + rnd() * 70; sparkPh[i] = rnd() * 6; }
const sparkG = new THREE.BufferGeometry(); sparkG.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
const sparks = new THREE.Points(sparkG, new THREE.PointsMaterial({ map: sparkTex, color: 0xffffff, size: DEEP ? 0.5 : 0.7, transparent: true, opacity: DEEP ? 0.8 : 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(sparks);

// Floor, ridge, near rocks, pillars: smooth cel with ink edges.
const reefY = x => (x < -18 ? Math.min(9, (-18 - x) * 0.4) : 0);
// Height of the sand at world x, z (the floor mesh sits at z = -20).
function floorH(x, zw) { const z = zw + 20; let y = FLOOR + Math.sin(x * 0.11) * 0.9 + Math.sin(z * 0.17 + 1) * 0.7 + Math.sin((x + z) * 0.23) * 0.5; if (x < -18) y += reefY(x) + Math.sin(x * 0.4) * 1.2 + Math.sin(z * 0.3) * 0.9; return y; }
(function floor() {
  const g = new THREE.PlaneGeometry(300, 130, 60, 26); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, floorH(pos.getX(i), pos.getZ(i) - 20) );
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, cel(P.floor)); m.position.z = -20; scene.add(m);
  const rg = new THREE.PlaneGeometry(320, 40, 40, 6); rg.rotateX(-Math.PI / 2);
  const rp = rg.attributes.position; seed = 41;
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i); rp.setY(i, FLOOR + 1.5 + Math.sin(x * 0.06) * 2.2 + Math.sin(x * 0.17 + 2) * 1.3); }
  rg.computeVertexNormals(); const ridge = new THREE.Mesh(rg, cel(P.ridge)); ridge.position.z = -78; scene.add(ridge);
  [[-30, 34, 7], [36, 30, 5.5]].forEach(([x, z, r]) => { const fr = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cel(P.near)); fr.position.set(x, FLOOR - 4, z); fr.rotation.set(0.4, 0.8, 0.2); fr.scale.set(1.4, 0.8, 1); inked(fr, 0.2); scene.add(fr); });
})();
seed = 19;
[[-30, -40, 12, 3], [-24, -30, 8, 2.2], [36, -36, 10, 2.6], [30, -26, 6, 2]].forEach(([x, z, h, r]) => {
  const g = new THREE.CylinderGeometry(r * 0.55, r, h, 7, 1); g.translate(0, h / 2, 0); g.computeVertexNormals();
  const m = new THREE.Mesh(g, cel(P.rock)); m.position.set(x, FLOOR - 1 + reefY(x), z); m.rotation.y = rnd() * 3; inked(m, 0.14); scene.add(m);
});
seed = 8;
for (let i = 0; i < 8; i++) {
  const r = 1.2 + rnd() * 3, m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cel(P.rock));
  const x = -60 + rnd() * 120; m.position.set(x, FLOOR - 0.6 + reefY(x) + r * 0.3, -46 + rnd() * 36);
  m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.scale.set(1 + rnd() * 0.8, 0.6 + rnd() * 0.5, 1 + rnd() * 0.6); inked(m, 0.12); scene.add(m);
}
// Kelp: smooth ribbons.
const kelps = []; seed = 13;
for (let i = 0; i < 9; i++) {
  const h = 3 + rnd() * 5, g = new THREE.PlaneGeometry(0.8 + rnd() * 0.5, h, 1, 12); g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, cel(P.kelp, { side: THREE.DoubleSide }));
  const x = (i < 4 ? 15 + rnd() * 4 : i < 7 ? -19 - rnd() * 3 : 30 + rnd() * 4); m.position.set(x, FLOOR - 0.3 + reefY(x), -40 + rnd() * 38);
  m.rotation.y = (rnd() - .5) * 1.2; m.userData = { base: g.attributes.position.array.slice(), k: 0.6 + rnd() * 0.6, ph: rnd() * 6 };
  kelps.push(m); scene.add(m);
}
// Sea fans.
function fan(color, x, y, z, sc) {
  const pts = [];
  function branch(x0, y0, ang, len, depth) {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len; pts.push(x0, y0, 0, x1, y1, 0);
    if (depth === 0) return;
    branch(x1, y1, ang + 0.32 + rnd() * 0.15, len * 0.68, depth - 1); branch(x1, y1, ang - 0.32 - rnd() * 0.15, len * 0.68, depth - 1);
    if (rnd() < 0.5) branch(x1, y1, ang + (rnd() - .5) * 0.2, len * 0.6, depth - 1);
  }
  seed = Math.abs(x | 0) + 3;
  for (let i = -2; i <= 2; i++) branch(0, 0, Math.PI / 2 + i * 0.28, 1.6, 3);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color })); m.position.set(x, y, z); m.scale.setScalar(sc); return m;
}
scene.add(fan(P.coral, -27, FLOOR - 0.3 + reefY(-27), -8, 1.1), fan(P.coral, -21, FLOOR - 0.2 + reefY(-21), -16, 0.8), fan(P.teal, -24, FLOOR - 0.3 + reefY(-24), -4, 0.9), fan(P.teal, -33, FLOOR - 0.1 + reefY(-33), -14, 1.0), fan(P.coral, 34, FLOOR - 0.2, -6, 0.9));

// Fish: bright chips.
const fishN = DEEP ? 0 : 48, fishG = new THREE.ConeGeometry(0.12, 0.5, 3).rotateZ(-Math.PI / 2);
const fish = new THREE.InstancedMesh(fishG, new THREE.MeshBasicMaterial({ color: P.fish }), Math.max(1, fishN)); fish.count = fishN;
const fishSeed = []; seed = 31;
for (let i = 0; i < fishN; i++) fishSeed.push({ ox: (rnd() - .5) * 6, oy: (rnd() - .5) * 2.4, oz: (rnd() - .5) * 4, ph: rnd() * 6 });
scene.add(fish);

// Bubbles: rings, the anime way.
const bubN = 30, bubPos = new Float32Array(bubN * 3), bubAge = new Float32Array(bubN).fill(2);
const bubTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 3; x.beginPath(); x.arc(16, 16, 11, 0, 6.28); x.stroke(); x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.arc(12, 11, 3, 0, 6.28); x.fill(); return new THREE.CanvasTexture(c); })();
const bubG = new THREE.BufferGeometry(); bubG.setAttribute("position", new THREE.BufferAttribute(bubPos, 3));
scene.add(new THREE.Points(bubG, new THREE.PointsMaterial({ map: bubTex, size: 0.7, transparent: true, opacity: 0.9, depthWrite: false })));


// Caustic ripples: wobbling bright lines lying on the sand.
const ripples = [];
if (!DEEP) {
  seed = 23;
  for (let i = 0; i < 7; i++) {
    const z = -36 + i * 6 + rnd() * 3, n = 70, pts = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: NIGHT ? 0.08 : 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.userData = { z, ph: rnd() * 6, k: 0.5 + rnd() * 0.5 }; ripples.push(m); scene.add(m);
  }
}
// Coral clusters on the reef: round heads and tubes in coral and pale pink, inked.
seed = 29;
function cluster(x, z, sc) {
  const g = new THREE.Group(); const y = floorH(x, z);
  for (let i = 0; i < 6; i++) {
    const r = (0.5 + rnd() * 0.7) * sc, m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cel(rnd() < .6 ? P.coral : 0xffb8c8));
    m.position.set(x + (rnd() - .5) * 3 * sc, y + r * 0.6 + rnd() * 0.6 * sc, z + (rnd() - .5) * 2 * sc); inked(m, 0.08); g.add(m);
  }
  for (let i = 0; i < 4; i++) {
    const h = (1 + rnd() * 1.6) * sc, m = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * sc, 0.24 * sc, h, 8), cel(0xffd2a8));
    m.position.set(x + (rnd() - .5) * 3 * sc, y + h / 2, z + (rnd() - .5) * 2 * sc); m.rotation.z = (rnd() - .5) * 0.5; inked(m, 0.06); g.add(m);
  }
  scene.add(g);
}
cluster(-26, -10, 1); cluster(-21, -16, 0.8); cluster(33, -8, 0.9); cluster(-31, -4, 0.7);
// Jellyfish: pale bells with trailing threads, drifting up and swaying.
const jellies = [];
if (!DEEP) {
  seed = 37;
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(), r = 0.45 + rnd() * 0.5;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), cel(0xfbeff8, { transparent: true, opacity: 0.6 }));
    inked(bell, 0.07); g.add(bell);
    const tn = 7, pts = [];
    for (let k = 0; k < tn; k++) { const a = k / tn * Math.PI * 2, x = Math.cos(a) * r * 0.6, z = Math.sin(a) * r * 0.6; for (let j = 0; j < 8; j++) pts.push(x, -j * 0.3, z); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const idx = []; for (let k = 0; k < tn; k++) for (let j = 0; j < 7; j++) idx.push(k * 8 + j, k * 8 + j + 1);
    tg.setIndex(idx); const threads = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xf4e6f6, transparent: true, opacity: 0.7 }));
    threads.userData.base = pts.slice(); g.add(threads);
    g.position.set(24 + rnd() * 20 - (i === 2 ? 50 : 0), -14 + rnd() * 8, -22 + rnd() * 10); g.userData = { x0: g.position.x, y0: g.position.y, ph: rnd() * 6, k: 0.3 + rnd() * 0.3, threads, bell };
    jellies.push(g); scene.add(g);
  }
}
// A second, smaller school, darker, further back.
const fish2N = DEEP ? 0 : 32, fish2 = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.42, 3).rotateZ(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col(0x9fe6e0) }), Math.max(1, fish2N)); fish2.count = fish2N;
const fish2Seed = []; seed = 43;
for (let i = 0; i < fish2N; i++) fish2Seed.push({ ox: (rnd() - .5) * 5, oy: (rnd() - .5) * 2, oz: (rnd() - .5) * 3, ph: rnd() * 6 });
scene.add(fish2);

// The whale: smooth, cel shaded, vertex coloured by region, inked, with a big eye placed on the skin.
const whale = new THREE.Group(); scene.add(whale);
let whaleMat = null, inkMat = null;
const bend = sh => {
  sh.uniforms.uTime = { value: 0 }; (sh.__mats || (sh.__mats = []));
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      float tail = max(0.0, (transformed.x - 1.0) / 7.0);
      transformed.z += sin(uTime * 1.6 - transformed.x * 0.3) * 0.7 * tail * tail;
      transformed.y += sin(uTime * 1.6 - transformed.x * 0.3 + 1.2) * 0.45 * tail * tail;`);
};
const shaders = [];
new GLTFLoader().load("../models/humpback.glb", gltf => {
  const root = gltf.scene; root.rotation.y = -Math.PI / 2; root.updateMatrixWorld(true);
  let geo = null; root.traverse(o => { if (o.isMesh && !geo) geo = o.geometry.clone().applyMatrix4(o.matrixWorld); });
  for (const k of Object.keys(geo.attributes)) if (k !== "position" && k !== "normal") geo.deleteAttribute(k);
  geo.computeBoundingBox(); const b = geo.boundingBox, size = new THREE.Vector3(); b.getSize(size); const c = new THREE.Vector3(); b.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z); geo.scale(22 / size.x, 22 / size.x, 22 / size.x); geo.computeBoundingBox(); geo.computeVertexNormals();
  const lo = geo.boundingBox.min, hi = geo.boundingBox.max, pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  const BACK = col(P.back), FLANK = col(P.flank), BELLY = col(P.belly);
  for (let i = 0; i < pos.count; i++) {
    const up = (pos.getY(i) - lo.y) / (hi.y - lo.y), side = Math.abs(pos.getZ(i)) / ((hi.z - lo.z) / 2);
    let cc;
    if (side > 0.42 && up < 0.6) cc = BELLY;
    else if (up > 0.62) cc = BACK;
    else if (up > 0.5) cc = BACK.clone().lerp(FLANK, (0.62 - up) / 0.12);
    else if (up > 0.3) cc = FLANK;
    else if (up > 0.22) cc = FLANK.clone().lerp(BELLY, (0.3 - up) / 0.08);
    else cc = BELLY;
    cols[i * 3] = cc.r; cols[i * 3 + 1] = cc.g; cols[i * 3 + 2] = cc.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  whaleMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  whaleMat.onBeforeCompile = sh => { bend(sh); shaders.push(sh); };
  const mesh = new THREE.Mesh(geo, whaleMat); whale.add(mesh);
  const ink = inked(mesh, 0.16, sh => { bend(sh); shaders.push(sh); });
  mesh.updateMatrixWorld(true);
  // Helpers: a point on the skin found by a ray, and a thin tube through points.
  const caster = new THREE.Raycaster();
  const skin = (origin, dir) => { caster.set(origin, dir.normalize()); const h = caster.intersectObject(mesh, false)[0]; return h ? { p: h.point, n: h.face.normal } : null; };
  const tube = (pts, r, color, extra = {}) => { if (pts.length < 2) return null; const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 5, false), new THREE.MeshBasicMaterial({ color, ...extra })); whale.add(m); return m; };
  // A pale highlight along the ridge of the back, head to dorsal.
  const ridge = []; for (let x = -10.2; x <= 4; x += 0.5) { const h = skin(new THREE.Vector3(x, 30, 0.2), new THREE.Vector3(0, -1, 0)); if (h) ridge.push(h.p.clone().add(new THREE.Vector3(0, 0.03, 0.08))); }
  tube(ridge, 0.07, 0xd8f6f2, { transparent: true, opacity: NIGHT || DEEP ? 0.35 : 0.8 });
  // Throat pleats: ink lines under the chin, on the side we see.
  for (const deg of [38, 52, 66, 80]) {
    const a = deg * Math.PI / 180, pts = [];
    for (let x = -10.4; x <= -0.5; x += 0.45) { const h = skin(new THREE.Vector3(x, -30 * Math.sin(a), 30 * Math.cos(a)), new THREE.Vector3(0, Math.sin(a), -Math.cos(a))); if (h) pts.push(h.p.clone().add(h.n.clone().multiplyScalar(0.03))); }
    tube(pts, 0.035, P.line, { transparent: true, opacity: 0.55 });
  }
  // The mouth: one ink line from the tip back along the jaw.
  const mouth = []; for (let x = -10.9; x <= -6.4; x += 0.3) { const a = (14 + (x + 10.9) * 2) * Math.PI / 180; const h = skin(new THREE.Vector3(x, -30 * Math.sin(a), 30 * Math.cos(a)), new THREE.Vector3(0, Math.sin(a), -Math.cos(a))); if (h) mouth.push(h.p.clone().add(h.n.clone().multiplyScalar(0.03))); }
  tube(mouth, 0.06, P.line);
  // Tubercles: small bumps in rows on the rostrum.
  for (const z of [0, 0.55, -0.55]) for (let x = -10.4; x <= -6.8; x += 0.6) { const h = skin(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0)); if (h) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), new THREE.MeshBasicMaterial({ color: P.line })); b.position.copy(h.p); whale.add(b); } }
  // The eye: almond, with a dark iris and a glint, laid on the skin behind the mouth corner.
  const hit = skin(new THREE.Vector3(-6.6, 0.3, 30), new THREE.Vector3(0, 0, -1));
  const eye = new THREE.Group();
  const white = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0xffffff })); white.scale.set(1.25, 0.8, 1); eye.add(white);
  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), new THREE.MeshBasicMaterial({ color: col(0x0d3a4a) })); iris.position.set(0.08, 0, 0.01); eye.add(iris);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshBasicMaterial({ color: P.line })); pupil.position.set(0.1, 0, 0.02); eye.add(pupil);
  const glint = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.17, 0.1, 0.03); eye.add(glint);
  const lid = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 24), new THREE.MeshBasicMaterial({ color: P.line })); lid.scale.set(1.25, 0.8, 1); lid.position.z = 0.005; eye.add(lid);
  if (hit) { eye.position.copy(hit.p).add(hit.n.clone().multiplyScalar(0.05)); eye.lookAt(hit.p.clone().add(hit.n)); }
  else eye.position.set(-6.6, 0.3, 1.5);
  // A far whale, a silhouette in the haze, crossing slowly.
  const farMat = new THREE.MeshBasicMaterial({ color: col(DEEP ? 0x0a3044 : 0x12607a), transparent: true, opacity: 0.55 });
  const far = new THREE.Mesh(geo, farMat); far.scale.setScalar(0.34); far.position.set(30, -11, -48); far.rotation.set(0, 0.25, 0.06); scene.add(far); whale.userData.far = far;
  whale.add(eye); whale.userData.eye = eye;
  whale.rotation.set(0, DIVE ? 0.3 : 0.42, DIVE ? 0.95 : 0);
  whale.position.set(DIVE ? -1 : -4, DIVE ? -6 : -5, 0);
}, undefined, e => console.error("load failed", e));

// Animation.
let t = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), v3 = new THREE.Vector3();
const wave = (x, z) => Math.sin(x * 0.25 + t * 0.9) * 0.5 + Math.sin(z * 0.4 - t * 0.7) * 0.35 + Math.sin((x + z) * 0.5 + t * 1.3) * 0.2;
function frame() {
  t += 0.016;
  if (surface) {
    const pos = surface.geometry.attributes.position, base = surface.geometry.userData.base;
    for (let i = 0; i < pos.count; i++) pos.setY(i, base[i * 3 + 1] + wave(base[i * 3], base[i * 3 + 2]));
    pos.needsUpdate = true; surface.geometry.computeVertexNormals();
    const fpos = surface.userData.foam.geometry.attributes.position;
    for (let i = 0; i < fpos.count; i++) fpos.setY(i, SURF + 0.1 + wave(fpos.getX(i), -4.2));
    fpos.needsUpdate = true;
    surface.userData.lines.forEach(l => { const lp = l.geometry.attributes.position; for (let i = 0; i < lp.count; i++) lp.setY(i, SURF + 0.08 + wave(lp.getX(i), l.userData.z)); lp.needsUpdate = true; });
  }
  rays.children.forEach(r => { r.rotation.z = r.userData.z0 + Math.sin(t * 0.3 * r.userData.k + r.userData.x) * 0.03; r.material.opacity = r.userData.a * (0.65 + 0.35 * Math.sin(t * 0.6 * r.userData.k + r.userData.x * 3)); });
  const sp = sparks.geometry.attributes.position; for (let i = 0; i < sparkN; i++) { let y = sp.getY(i) - 0.008; if (y < -20) y = 8; sp.setY(i, y); sp.setX(i, sp.getX(i) + Math.sin(t * 0.4 + i) * 0.004); } sp.needsUpdate = true;
  sparks.material.opacity = (DEEP ? 0.8 : 0.7) * (0.75 + 0.25 * Math.sin(t * 2.1));
  kelps.forEach(k => { const pos = k.geometry.attributes.position, base = k.userData.base; for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1]; pos.setX(i, base[i * 3] + Math.sin(t * k.userData.k + k.userData.ph + y * 0.5) * y * 0.14); } pos.needsUpdate = true; });
  for (let i = 0; i < fishN; i++) {
    const f = fishSeed[i], cx = 18 + Math.sin(t * 0.15) * 12, cy = -3 + Math.sin(t * 0.21 + 1) * 3, dir = Math.cos(t * 0.15) * 12 * 0.15;
    v3.set(cx + f.ox + Math.sin(t * 2 + f.ph) * 0.3, cy + f.oy + Math.sin(t * 1.3 + f.ph) * 0.25, -14 + f.oz);
    e3.set(0, 0, Math.atan2(Math.cos(t * 0.21 + 1) * 3 * 0.21, dir) + (dir < 0 ? Math.PI : 0)); q.setFromEuler(e3);
    m4.compose(v3, q, one); fish.setMatrixAt(i, m4);
  }
  if (fishN) fish.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < fish2N; i++) {
    const f = fish2Seed[i], cx = -20 + Math.sin(t * 0.11 + 2) * 16, cy = -8 + Math.sin(t * 0.17) * 2.5, dir = Math.cos(t * 0.11 + 2) * 16 * 0.11;
    v3.set(cx + f.ox + Math.sin(t * 2 + f.ph) * 0.3, cy + f.oy + Math.sin(t * 1.3 + f.ph) * 0.2, -30 + f.oz);
    e3.set(0, 0, Math.atan2(Math.cos(t * 0.17) * 2.5 * 0.17, dir) + (dir < 0 ? Math.PI : 0)); q.setFromEuler(e3);
    m4.compose(v3, q, one); fish2.setMatrixAt(i, m4);
  }
  if (fish2N) fish2.instanceMatrix.needsUpdate = true;
  ripples.forEach(r => { const pos = r.geometry.attributes.position, n = pos.count; for (let i = 0; i < n; i++) { const x = -70 + i * 140 / (n - 1), z = r.userData.z + Math.sin(x * 0.35 + t * r.userData.k + r.userData.ph) * 1.6 + Math.sin(x * 0.9 - t * 0.7) * 0.5; pos.setXYZ(i, x, floorH(x, z) + 0.25, z); } pos.needsUpdate = true; });
  jellies.forEach(j => {
    j.position.x = j.userData.x0 + Math.sin(t * 0.2 * j.userData.k + j.userData.ph) * 3; j.position.y = j.userData.y0 + ((t * 0.25 * j.userData.k + j.userData.ph) % 14) - 2;
    const pulse = 1 + Math.sin(t * 1.8 + j.userData.ph) * 0.08; j.userData.bell.scale.set(pulse, 1 / pulse, pulse);
    const pos = j.userData.threads.geometry.attributes.position, base = j.userData.threads.userData.base;
    for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1]; pos.setX(i, base[i * 3] + Math.sin(t * 1.2 + j.userData.ph + y * 1.5) * y * -0.12); } pos.needsUpdate = true;
  });
  if (whale.userData.far) { const f = whale.userData.far; f.position.x = 28 - ((t * 0.3 + 20) % 90); }
  shaders.forEach(sh => sh.uniforms.uTime.value = t);
  if (whale.children.length) {
    const hole = whale.localToWorld(new THREE.Vector3(-5.5, 2.2, 0));
    for (let i = 0; i < bubN; i++) {
      bubAge[i] += 0.016 * (0.6 + (i % 5) * 0.12);
      if (bubAge[i] > 1 && Math.random() < 0.02) { bubAge[i] = 0; bubPos[i * 3] = hole.x; bubPos[i * 3 + 1] = hole.y; bubPos[i * 3 + 2] = hole.z; }
      if (bubAge[i] <= 1) { bubPos[i * 3 + 1] += 0.05; bubPos[i * 3] += Math.sin(t * 3 + i) * 0.012; if (bubPos[i * 3 + 1] > SURF - 0.3) bubAge[i] = 2; }
      else bubPos[i * 3 + 1] = -999;
    }
    bubG.attributes.position.needsUpdate = true;
    // A blink now and then.
    const eye = whale.userData.eye; if (eye) { const ph = (t * 0.37) % 1; eye.scale.y = ph > 0.95 ? Math.max(0.08, 1 - (ph - 0.95) * 20 * (ph < 0.975 ? 1 : -1) - (ph >= 0.975 ? -1 : 0)) : 1; }
  }
  whale.position.y += Math.sin(t * 0.5) * 0.004;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
