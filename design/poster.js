// Poster prototype: no light engine. Every triangle gets one flat colour, baked
// from its normal in four steps on a bold ramp, with a little jitter so the
// surface crystallises like a low poly print. The whale is Allie2k's (CC BY).
// ?dive  ?night  ?deep
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import * as BGU from "three/addons/utils/BufferGeometryUtils.js";

const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
const p = new URLSearchParams(location.search);
// Flags come from the query (?night) or from the hash (#night-dive), so a hosted copy can switch moods too.
const flags = new Set([...p.keys(), ...location.hash.replace("#", "").split("-")]);
const NIGHT = flags.has("night"), DEEP = flags.has("deep"), DIVE = flags.has("dive"), BOLD = flags.has("bold");
addEventListener("hashchange", () => location.reload());

// Ramps, dark to lit. Night and deep dim them toward ink.
const dim = DEEP ? 0.42 : NIGHT ? 0.5 : 1;
const ramp = (...hex) => hex.map(h => new THREE.Color(h).lerp(new THREE.Color(0x061427), 1 - dim));
const R = {
  back: ramp(0x08182e, 0x0b1f3a, 0x12305a, 0x1a4680),
  flank: ramp(0x12305a, 0x1a4680, 0x245ea0, 0x2f74b8),
  belly: ramp(0x4a8fc8, 0x7fb8dc, 0xb8e4f4, 0xffffff),
  floor: ramp(0x071a30, 0x0a2240, 0x0e2c50, 0x123660),
  rock: ramp(0x061427, 0x0b2240, 0x11315a, 0x18417a),
  near: ramp(0x040d1c, 0x061427, 0x0b2240, 0x0f2d4e),
  ridge: ramp(0x1a5080, 0x1d568a, 0x205c94, 0x24629c),
  surface: ramp(0x4fa8dc, 0x6cc0ea, 0x8fd0ee, 0xb8e4f4),
  kelp: ramp(0x0d4a3e, 0x126354, 0x1a7f6a, 0x2a9a82),
  fish: ramp(0x8fd0ee, 0xbfe6f5, 0xffffff, 0xffffff)
};
const CORAL = new THREE.Color(0xff7a59).lerp(new THREE.Color(0x061427), 1 - Math.max(dim, 0.7)), TEAL = new THREE.Color(0x4fd6b4).lerp(new THREE.Color(0x061427), 1 - Math.max(dim, 0.7));
const L = new THREE.Vector3(-0.35, 1, 0.6).normalize();
let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

// Bake: one colour per triangle from its normal. pick(cx, cy, cz, i) chooses the ramp per face.
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();
function bake(geo, pick, jitter = 0.06, bias = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "uv") g.deleteAttribute(k);
  const pos = g.attributes.position, n = pos.count, col = g.attributes.color ? g.attributes.color.array : new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    _a.fromBufferAttribute(pos, i); _b.fromBufferAttribute(pos, i + 1); _c.fromBufferAttribute(pos, i + 2);
    _n.subVectors(_b, _a).cross(_c.clone().sub(_a)).normalize();
    const shade = THREE.MathUtils.clamp(_n.dot(L) * 0.5 + 0.5 + bias, 0, 0.999);
    const r = pick((_a.x + _b.x + _c.x) / 3, (_a.y + _b.y + _c.y) / 3, (_a.z + _b.z + _c.z) / 3, i / 3);
    let step = BOLD ? (shade < 0.5 ? 0 : 3) : Math.floor(shade * r.length); if (rnd() < 0.08) step = THREE.MathUtils.clamp(step + (rnd() < .5 ? -1 : 1), 0, r.length - 1);
    const c = r[step].clone(); const j = (rnd() - .5) * jitter; c.r += j; c.g += j; c.b += j;
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  if (!g.attributes.color) g.setAttribute("color", new THREE.BufferAttribute(col, 3)); else g.attributes.color.needsUpdate = true;
  return g;
}
const paper = (extra = {}) => new THREE.MeshBasicMaterial({ vertexColors: true, ...extra });

// Camera: orthographic, side on, pitched a little so the surface and the floor read as bands.
const PITCH = 0.08, VIEW_H = 30, aspect = W / H;
const camera = new THREE.OrthographicCamera(-VIEW_H * aspect / 2, VIEW_H * aspect / 2, VIEW_H / 2, -VIEW_H / 2, 1, 600);
const target = new THREE.Vector3(0, -3, 0);
camera.position.set(0, target.y + Math.sin(PITCH) * 220, Math.cos(PITCH) * 220); camera.lookAt(target); camera.updateMatrixWorld();
const SURF = DEEP ? 60 : 6, FLOOR = -16;

// Backdrop: sky, mountains and the water gradient, flat and saturated.
const back = document.getElementById("back"), bctx = back.getContext("2d");
back.width = W * dpr; back.height = H * dpr; bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
function toScreen(v) { const q = v.clone().project(camera); return { x: (q.x + 1) / 2 * W, y: (1 - q.y) / 2 * H }; }
const sy = DEEP ? -10 : toScreen(new THREE.Vector3(0, SURF, -34)).y;
function rgb(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
(function paintBack() {
  if (!DEEP) {
    const sky = NIGHT ? ["#0a1222", "#10203a"] : ["#eef6f9", "#bfe0ee"], mount = NIGHT ? ["#182a44", "#121f36", "#0d172a"] : ["#a9d2e3", "#86bdd4", "#63a3c2"];
    const g = bctx.createLinearGradient(0, 0, 0, sy); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); bctx.fillStyle = g; bctx.fillRect(0, 0, W, sy);
    if (NIGHT) { seed = 77; bctx.fillStyle = "rgba(255,250,235,.8)"; for (let i = 0; i < 90; i++) { bctx.beginPath(); bctx.arc(rnd() * W, rnd() * sy * .7, .6 + rnd(), 0, 6.28); bctx.fill(); } }
    bctx.fillStyle = NIGHT ? "rgba(220,230,240,.9)" : "#fff6dc"; bctx.beginPath(); bctx.arc(W * (NIGHT ? .72 : .5), sy * .5, sy * (NIGHT ? .2 : .36), 0, 6.28); bctx.fill();
    [[.62, 3], [.48, 11], [.34, 5]].forEach((r, idx) => {
      bctx.fillStyle = mount[idx]; bctx.beginPath(); bctx.moveTo(0, sy); seed = r[1]; let x = 0; bctx.lineTo(0, sy - sy * r[0] * .5);
      while (x < W) { const step = 60 + rnd() * 160; const peak = sy - sy * r[0] * (.45 + rnd() * .55); x += step / 2; bctx.lineTo(x, peak); x += step / 2; bctx.lineTo(x, sy - sy * r[0] * (.25 + rnd() * .3)); }
      bctx.lineTo(W, sy); bctx.closePath(); bctx.fill();
    });
  }
  const water = DEEP ? [[0, [8, 30, 56]], [.5, [4, 16, 34]], [1, [2, 8, 18]]]
    : NIGHT ? [[0, [20, 52, 84]], [.3, [10, 30, 56]], [.7, [4, 12, 28]], [1, [2, 6, 14]]]
    : [[0, [63, 180, 224]], [.2, [38, 136, 196]], [.5, [24, 90, 150]], [.85, [14, 46, 92]], [1, [8, 26, 54]]];
  const wg = bctx.createLinearGradient(0, Math.max(0, sy), 0, H); water.forEach(s => wg.addColorStop(s[0], rgb(s[1])));
  bctx.fillStyle = wg; bctx.fillRect(0, Math.max(0, sy), W, H);
})();

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), alpha: true, antialias: true });
renderer.setPixelRatio(dpr); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();

// Surface: a faceted sheet that breathes; rebaked every frame so its facets flash as they turn.
let surface = null;
if (!DEEP) {
  const g = new THREE.PlaneGeometry(260, 30, 44, 6); g.rotateX(-Math.PI / 2); g.translate(0, SURF, -19);
  const ng = g.toNonIndexed(); ng.userData.base = ng.attributes.position.array.slice();
  surface = new THREE.Mesh(bake(ng, () => R.surface, 0.04, 0.1), paper({ transparent: true, opacity: 0.9 }));
  scene.add(surface);
  const fp = []; for (let i = 0; i <= 120; i++) fp.push(-130 + i * 260 / 120, SURF, -4.2);
  const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
  surface.userData.foam = new THREE.Line(fg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: NIGHT ? 0.4 : 0.95 }));
  scene.add(surface.userData.foam);
}

// Rays: crisp wedges, bright at the top, fading to nothing, all leaning away from the sun.
function wedge(wTop, wBottom, h) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-wTop / 2, 0, 0, wTop / 2, 0, 0, wBottom / 2, -h, 0, -wBottom / 2, -h, 0], 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], 3)); g.setIndex([0, 2, 1, 0, 3, 2]); return g;
}
const rays = new THREE.Group(); seed = 11;
const RAY_A = NIGHT ? 0.07 : 0.13;
for (let i = 0; i < (DEEP ? 0 : 10); i++) {
  const w = 1 + rnd() * 2.5 + (rnd() < .25 ? 4 : 0), h = 28;
  const m = new THREE.Mesh(wedge(w, w * 2.2, h), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: RAY_A * (0.6 + rnd() * 0.6), blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(-56 + rnd() * 112, SURF - 0.2, -30 + rnd() * 22); m.rotation.z = 0.14 + (rnd() - .5) * 0.08;
  m.userData = { x: m.position.x, z0: m.rotation.z, k: 0.4 + rnd() * 0.6, a: m.material.opacity };
  rays.add(m);
}
scene.add(rays);

// Snow.
const snowN = DEEP ? 2200 : 700, snowPos = new Float32Array(snowN * 3); seed = 5;
for (let i = 0; i < snowN; i++) { snowPos[i * 3] = -80 + rnd() * 160; snowPos[i * 3 + 1] = -20 + rnd() * 28; snowPos[i * 3 + 2] = -50 + rnd() * 70; }
const snowG = new THREE.BufferGeometry(); snowG.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xffffff, size: DEEP ? 0.22 : 0.16, transparent: true, opacity: DEEP ? 0.8 : 0.5, sizeAttenuation: false }));
scene.add(snow);

// Floor: big facets, a reef rising on the left; a far ridge; two near rocks framing the picture.
const reefY = x => (x < -18 ? Math.min(9, (-18 - x) * 0.4) : 0);
(function floor() {
  const g = new THREE.PlaneGeometry(300, 130, 42, 15); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position; seed = 21;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let y = FLOOR + Math.sin(x * 0.11) * 0.9 + Math.sin(z * 0.17 + 1) * 0.7 + Math.sin((x + z) * 0.23) * 0.5 + (rnd() - .5) * 1.2;
    if (x < -18) y += reefY(x) + Math.sin(x * 0.4) * 1.2 + Math.sin(z * 0.3) * 0.9;
    pos.setY(i, y);
  }
  const m = new THREE.Mesh(bake(g, (x) => x < -18 ? R.rock : R.floor, 0.04, -0.25), paper()); m.position.z = -20; scene.add(m);
  const rg = new THREE.PlaneGeometry(320, 40, 30, 4); rg.rotateX(-Math.PI / 2);
  const rp = rg.attributes.position; seed = 41;
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i); rp.setY(i, FLOOR + 1.5 + Math.sin(x * 0.06) * 2.2 + Math.sin(x * 0.17 + 2) * 1.3 + rnd() * 0.8); }
  const ridge = new THREE.Mesh(bake(rg, () => R.ridge, 0.02, -0.3), paper()); ridge.position.z = -78; scene.add(ridge);
  [[-30, 34, 7], [36, 30, 5.5]].forEach(([x, z, r]) => { const fr = new THREE.Mesh(bake(new THREE.IcosahedronGeometry(r, 0), () => R.near, 0.03), paper()); fr.position.set(x, FLOOR - 4, z); fr.rotation.set(0.4, 0.8, 0.2); fr.scale.set(1.4, 0.8, 1); scene.add(fr); });
})();
seed = 8;
for (let i = 0; i < 14; i++) {
  const r = 1.2 + rnd() * 3.2, m = new THREE.Mesh(bake(new THREE.IcosahedronGeometry(r, 0), () => R.rock, 0.05), paper());
  const x = -60 + rnd() * 120; m.position.set(x, FLOOR - 0.6 + reefY(x) + r * 0.3, -46 + rnd() * 36);
  m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.scale.set(1 + rnd() * 0.8, 0.6 + rnd() * 0.5, 1 + rnd() * 0.6); scene.add(m);
}
// Kelp: ribbons in clumps, swaying.
const kelps = []; seed = 13;
for (let i = 0; i < 9; i++) {
  const h = 3 + rnd() * 5, g = new THREE.PlaneGeometry(0.8 + rnd() * 0.5, h, 1, 8); g.translate(0, h / 2, 0);
  const ng = bake(g, () => R.kelp, 0.08, 0.15); const m = new THREE.Mesh(ng, paper({ side: THREE.DoubleSide }));
  const x = (i < 4 ? 15 + rnd() * 4 : i < 7 ? -19 - rnd() * 3 : 30 + rnd() * 4); m.position.set(x, FLOOR - 0.3 + reefY(x), -40 + rnd() * 38);
  m.rotation.y = (rnd() - .5) * 1.2; m.userData = { base: ng.attributes.position.array.slice(), k: 0.6 + rnd() * 0.6, ph: rnd() * 6 };
  kelps.push(m); scene.add(m);
}
// Sea fans: lacy nets of lines.
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
scene.add(fan(CORAL, -27, FLOOR - 0.3 + reefY(-27), -8, 1.1), fan(CORAL, -21, FLOOR - 0.2 + reefY(-21), -16, 0.8), fan(TEAL, -24, FLOOR - 0.3 + reefY(-24), -4, 0.9), fan(TEAL, -33, FLOOR - 0.1 + reefY(-33), -14, 1.0), fan(CORAL, 34, FLOOR - 0.2, -6, 0.9));

// Fish: a school of bright chips.
const fishN = DEEP ? 0 : 48, fishG = bake(new THREE.ConeGeometry(0.12, 0.5, 3).rotateZ(-Math.PI / 2), () => R.fish, 0.02, 0.2);
const fish = new THREE.InstancedMesh(fishG, paper(), Math.max(1, fishN)); fish.count = fishN;
const fishSeed = []; seed = 31;
for (let i = 0; i < fishN; i++) fishSeed.push({ ox: (rnd() - .5) * 6, oy: (rnd() - .5) * 2.4, oz: (rnd() - .5) * 4, ph: rnd() * 6 });
scene.add(fish);

// Bubbles from the blowhole.
const bubN = 36, bubPos = new Float32Array(bubN * 3), bubAge = new Float32Array(bubN).fill(2);
const bubG = new THREE.BufferGeometry(); bubG.setAttribute("position", new THREE.BufferAttribute(bubPos, 3));
scene.add(new THREE.Points(bubG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.8 })));

// The whale: baked by region. Back ramp above, flank in the middle, belly ramp below and on the pectorals.
const whale = new THREE.Group(); scene.add(whale);
let whaleMat = null;
new GLTFLoader().load("../models/humpback.glb", gltf => {
  const root = gltf.scene; root.rotation.y = -Math.PI / 2; root.updateMatrixWorld(true);
  let geo = null; root.traverse(o => { if (o.isMesh && !geo) geo = o.geometry.clone().applyMatrix4(o.matrixWorld); });
  const simp = p.has("simp") ? +p.get("simp") : 2000;   // about 1500 triangles: big facets, the shape kept
  if (simp) {
    let ig = BGU.mergeVertices(geo.index ? geo.toNonIndexed() : geo, 1e-4);
    for (const k of Object.keys(ig.attributes)) if (k !== "position") ig.deleteAttribute(k);
    const tris = ig.index.count / 3;
    try { geo = new SimplifyModifier().modify(ig, Math.floor(ig.attributes.position.count * (1 - simp / tris))); } catch (e) { console.error("simplify failed", e); geo = ig; }
    console.log("whale triangles", tris, "to", geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3);
  }
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.computeBoundingBox(); const b = geo.boundingBox, size = new THREE.Vector3(); b.getSize(size); const c = new THREE.Vector3(); b.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z); geo.scale(17 / size.x, 17 / size.x, 17 / size.x); geo.computeBoundingBox();
  const lo = geo.boundingBox.min, hi = geo.boundingBox.max;
  seed = 9;
  bake(geo, (x, y, z) => {
    const up = (y - lo.y) / (hi.y - lo.y), side = Math.abs(z) / ((hi.z - lo.z) / 2);
    if (side > 0.42 && up < 0.6) return R.belly;
    if (up > 0.5) return R.back;
    if (up > 0.3) return R.flank;
    return R.belly;
  }, 0.03, -0.1);
  whaleMat = paper();
  whaleMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = { value: 0 }; whaleMat.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float tail = max(0.0, (transformed.x - 1.0) / 6.0);
        transformed.z += sin(uTime * 1.6 - transformed.x * 0.35) * 0.55 * tail * tail;
        transformed.y += sin(uTime * 1.6 - transformed.x * 0.35 + 1.2) * 0.35 * tail * tail;`);
  };
  whale.add(new THREE.Mesh(geo, whaleMat));
  whale.rotation.set(0, DIVE ? 0.3 : 0.42, DIVE ? 0.95 : 0);
  whale.position.set(DIVE ? -2 : -5, DIVE ? -7 : -5.5, 0);
}, undefined, e => console.error("load failed", e));

// Animation.
let t = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), v3 = new THREE.Vector3();
const wave = (x, z) => Math.sin(x * 0.25 + t * 0.9) * 0.55 + Math.sin(z * 0.4 - t * 0.7) * 0.4 + Math.sin((x + z) * 0.5 + t * 1.3) * 0.25;
function frame() {
  t += 0.016;
  if (surface) {
    const pos = surface.geometry.attributes.position, base = surface.geometry.userData.base;
    for (let i = 0; i < pos.count; i++) pos.setY(i, base[i * 3 + 1] + wave(base[i * 3], base[i * 3 + 2]));
    pos.needsUpdate = true; seed = 4; bake(surface.geometry, () => R.surface, 0.04, 0.1);
    const fpos = surface.userData.foam.geometry.attributes.position;
    for (let i = 0; i < fpos.count; i++) fpos.setY(i, SURF + 0.1 + wave(fpos.getX(i), -4.2));
    fpos.needsUpdate = true;
  }
  rays.children.forEach(r => { r.rotation.z = r.userData.z0 + Math.sin(t * 0.3 * r.userData.k + r.userData.x) * 0.03; r.material.opacity = r.userData.a * (0.7 + 0.3 * Math.sin(t * 0.5 * r.userData.k + r.userData.x * 3)); });
  const sp = snow.geometry.attributes.position; for (let i = 0; i < snowN; i++) { let y = sp.getY(i) - 0.012; if (y < -20) y = 8; sp.setY(i, y); sp.setX(i, sp.getX(i) + Math.sin(t * 0.4 + i) * 0.004); } sp.needsUpdate = true;
  kelps.forEach(k => { const pos = k.geometry.attributes.position, base = k.userData.base; for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1]; pos.setX(i, base[i * 3] + Math.sin(t * k.userData.k + k.userData.ph + y * 0.5) * y * 0.14); } pos.needsUpdate = true; });
  for (let i = 0; i < fishN; i++) {
    const f = fishSeed[i], cx = 18 + Math.sin(t * 0.15) * 12, cy = -3 + Math.sin(t * 0.21 + 1) * 3, dir = Math.cos(t * 0.15) * 12 * 0.15;
    v3.set(cx + f.ox + Math.sin(t * 2 + f.ph) * 0.3, cy + f.oy + Math.sin(t * 1.3 + f.ph) * 0.25, -14 + f.oz);
    e3.set(0, 0, Math.atan2(Math.cos(t * 0.21 + 1) * 3 * 0.21, dir) + (dir < 0 ? Math.PI : 0)); q.setFromEuler(e3);
    m4.compose(v3, q, one); fish.setMatrixAt(i, m4);
  }
  if (fishN) fish.instanceMatrix.needsUpdate = true;
  if (whaleMat && whaleMat.userData.sh) whaleMat.userData.sh.uniforms.uTime.value = t;
  if (whale.children.length) {
    const hole = whale.localToWorld(new THREE.Vector3(-4.5, 1.7, 0));
    for (let i = 0; i < bubN; i++) {
      bubAge[i] += 0.016 * (0.6 + (i % 5) * 0.12);
      if (bubAge[i] > 1 && Math.random() < 0.02) { bubAge[i] = 0; bubPos[i * 3] = hole.x; bubPos[i * 3 + 1] = hole.y; bubPos[i * 3 + 2] = hole.z; }
      if (bubAge[i] <= 1) { bubPos[i * 3 + 1] += 0.05; bubPos[i * 3] += Math.sin(t * 3 + i) * 0.01; if (bubPos[i * 3 + 1] > SURF - 0.3) bubAge[i] = 2; }
      else bubPos[i * 3 + 1] = -999;
    }
    bubG.attributes.position.needsUpdate = true;
  }
  whale.position.y += Math.sin(t * 0.5) * 0.004;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
