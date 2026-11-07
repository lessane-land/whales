// World prototype: the whale (Allie2k, CC BY) and everything around it in one
// three.js scene, flat shaded in the site's palette, under one light.
// ?dive (head down)  ?night  ?deep (no surface, 300 m mood)
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
const p = new URLSearchParams(location.search);
const NIGHT = p.has("night"), DEEP = p.has("deep"), DIVE = p.has("dive");

// Palette.
const PAL = {
  skyTop: NIGHT ? "#0a1222" : "#e9f1f4", skyBottom: NIGHT ? "#0f1c33" : "#c6dbe5",
  mount: NIGHT ? ["#182a44", "#121f36", "#0d172a"] : ["#bcd5de", "#9ec0cd", "#7faabb"],
  water: DEEP ? [[0, [8, 28, 52]], [.5, [4, 14, 30]], [1, [1, 5, 12]]]
    : NIGHT ? [[0, [16, 44, 70]], [.3, [8, 24, 46]], [.7, [3, 9, 20]], [1, [1, 4, 10]]]
    : [[0, [70, 178, 206]], [.18, [38, 128, 166]], [.5, [22, 80, 122]], [.85, [12, 40, 76]], [1, [6, 18, 38]]],
  fog: DEEP ? 0x071a30 : NIGHT ? 0x08203a : 0x1a5c84,
  surface: NIGHT ? 0x34506a : 0x9fd3e6, foam: 0xffffff,
  floor: DEEP ? 0x050f1c : NIGHT ? 0x04101e : 0x071a2e, sand: DEEP ? 0x0a1a30 : NIGHT ? 0x0a1e36 : 0x123553, ridge: DEEP ? 0x0b2240 : NIGHT ? 0x0e2a48 : 0x255f88, near: DEEP ? 0x030a14 : 0x040e1c, rock: NIGHT ? 0x0a1a2e : 0x0d2440,
  kelp: NIGHT ? 0x0f3a34 : 0x1a6b5a, coral: 0xe0604a, teal: 0x5fd3a2,
  dark: 0x14263e, mid: 0x3b5f84, belly: 0xd6e2e8
};

// Camera: orthographic, side on, pitched down a little so the surface and the floor read as bands.
const PITCH = 0.08, VIEW_H = 30, aspect = W / H;
const camera = new THREE.OrthographicCamera(-VIEW_H * aspect / 2, VIEW_H * aspect / 2, VIEW_H / 2, -VIEW_H / 2, 1, 600);
const target = new THREE.Vector3(0, -3, 0);
camera.position.set(0, target.y + Math.sin(PITCH) * 220, Math.cos(PITCH) * 220); camera.lookAt(target);
camera.updateMatrixWorld();
const SURF = DEEP ? 60 : 6;   // the surface height; in the deep it is out of the frame

// Backdrop: sky, mountains and the water gradient, in 2D behind the scene.
const back = document.getElementById("back"), bctx = back.getContext("2d");
back.width = W * dpr; back.height = H * dpr; bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
function toScreen(v) { const q = v.clone().project(camera); return { x: (q.x + 1) / 2 * W, y: (1 - q.y) / 2 * H }; }
const sy = DEEP ? -10 : toScreen(new THREE.Vector3(0, SURF, -34)).y;   // where the far edge of the surface sits
let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
function rgb(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
(function paintBack() {
  if (!DEEP) {
    const g = bctx.createLinearGradient(0, 0, 0, sy); g.addColorStop(0, PAL.skyTop); g.addColorStop(1, PAL.skyBottom);
    bctx.fillStyle = g; bctx.fillRect(0, 0, W, sy);
    if (NIGHT) { seed = 77; bctx.fillStyle = "rgba(255,250,235,.8)"; for (let i = 0; i < 90; i++) { bctx.beginPath(); bctx.arc(rnd() * W, rnd() * sy * .7, .6 + rnd(), 0, 6.28); bctx.fill(); } }
    bctx.fillStyle = NIGHT ? "rgba(220,230,240,.85)" : "rgba(255,252,240,.9)"; bctx.beginPath(); bctx.arc(W * (NIGHT ? .72 : .5), sy * .5, sy * (NIGHT ? .2 : .36), 0, 6.28); bctx.fill();
    [[.62, 3], [.48, 11], [.34, 5]].forEach((r, idx) => {
      bctx.fillStyle = PAL.mount[idx]; bctx.beginPath(); bctx.moveTo(0, sy); seed = r[1]; let x = 0; bctx.lineTo(0, sy - sy * r[0] * .5);
      while (x < W) { const step = 60 + rnd() * 160; const peak = sy - sy * r[0] * (.45 + rnd() * .55); x += step / 2; bctx.lineTo(x, peak); x += step / 2; bctx.lineTo(x, sy - sy * r[0] * (.25 + rnd() * .3)); }
      bctx.lineTo(W, sy); bctx.closePath(); bctx.fill();
    });
  }
  const wg = bctx.createLinearGradient(0, Math.max(0, sy), 0, H); PAL.water.forEach(s => wg.addColorStop(s[0], rgb(s[1])));
  bctx.fillStyle = wg; bctx.fillRect(0, Math.max(0, sy), W, H);
})();

// Renderer and lights.
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), alpha: true, antialias: true });
renderer.setPixelRatio(dpr); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAL.fog, 225, 320);
const sun = new THREE.DirectionalLight(0xffffff, DEEP ? 0.9 : NIGHT ? 1.5 : 2.5); sun.position.set(-0.3, 1, 0.7); scene.add(sun);
const fill = new THREE.DirectionalLight(NIGHT || DEEP ? 0x5a80a0 : 0x7fc0e0, 0.5); fill.position.set(0.6, -0.4, 0.5); scene.add(fill);
scene.add(new THREE.AmbientLight(NIGHT || DEEP ? 0x1a2a44 : 0x2a4a6a, DEEP ? 1.0 : NIGHT ? 1.2 : 1.6));
const rim = new THREE.DirectionalLight(0xbfe8ff, NIGHT ? 1.2 : 0.9); rim.position.set(0.4, 0.6, -1); scene.add(rim);

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0, ...extra });

// Surface: a faceted sheet that breathes, seen from just above, with a foam edge toward us.
let surface = null;
if (!DEEP) {
  const g = new THREE.PlaneGeometry(260, 30, 52, 7); g.rotateX(-Math.PI / 2); g.translate(0, SURF, -19);
  surface = new THREE.Mesh(g, flat(PAL.surface, { roughness: 0.4, transparent: true, opacity: 0.84 }));
  surface.userData.base = g.attributes.position.array.slice();
  scene.add(surface);
  // Foam: a bright line that rides the near edge of the sheet.
  const fp = []; for (let i = 0; i <= 120; i++) fp.push(-130 + i * 260 / 120, SURF, -4.2);
  const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
  surface.userData.foam = new THREE.Line(fg, new THREE.LineBasicMaterial({ color: PAL.foam, transparent: true, opacity: NIGHT ? 0.35 : 0.8, fog: false }));
  scene.add(surface.userData.foam);
}

// Light rays: soft wedges leaning away from the sun, fading toward the bottom and at their edges.
const rayTex = (() => {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d"), img = x.createImageData(64, 128);
  for (let j = 0; j < 128; j++) for (let i = 0; i < 64; i++) {
    const u = (i - 31.5) / 32, v = j / 128, a = Math.max(0, 1 - u * u) ** 1.5 * (1 - v) ** 1.6;
    const k = (j * 64 + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a * 255;
  }
  x.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
})();
function wedge(wTop, wBottom, h) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-wTop / 2, 0, 0, wTop / 2, 0, 0, wBottom / 2, -h, 0, -wBottom / 2, -h, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 2, 1, 0, 3, 2]); return g;
}
const rays = new THREE.Group(); seed = 11;
const rayCount = DEEP ? 0 : 11, RAY_A = NIGHT ? 0.12 : 0.42;
for (let i = 0; i < rayCount; i++) {
  const w = 1.2 + rnd() * 3 + (rnd() < .25 ? 5 : 0), h = 30;
  const m = new THREE.Mesh(wedge(w, w * 2.6, h), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: RAY_A * (0.6 + rnd() * 0.5), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.position.set(-56 + rnd() * 112, SURF - 0.2, -30 + rnd() * 22); m.rotation.z = 0.14 + (rnd() - .5) * 0.08;
  m.userData = { x: m.position.x, z0: m.rotation.z, k: 0.4 + rnd() * 0.6, a: m.material.opacity };
  rays.add(m);
}
scene.add(rays);

// Marine snow.
const snowN = DEEP ? 2200 : 900, snowPos = new Float32Array(snowN * 3); seed = 5;
for (let i = 0; i < snowN; i++) { snowPos[i * 3] = -80 + rnd() * 160; snowPos[i * 3 + 1] = -20 + rnd() * 28; snowPos[i * 3 + 2] = -50 + rnd() * 70; }
const snowG = new THREE.BufferGeometry(); snowG.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xdff0f6, size: DEEP ? 0.22 : 0.16, transparent: true, opacity: DEEP ? 0.75 : 0.45, sizeAttenuation: false, fog: false }));
scene.add(snow);

// Sea floor: a faceted terrain with a reef rising on the left and a sand plain to the right.
const FLOOR = -16;
(function floor() {
  const g = new THREE.PlaneGeometry(300, 130, 50, 18); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position; seed = 21; const colA = new THREE.Color(PAL.floor), colB = new THREE.Color(PAL.sand), cols = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let y = FLOOR + Math.sin(x * 0.11) * 0.9 + Math.sin(z * 0.17 + 1) * 0.7 + Math.sin((x + z) * 0.23) * 0.5 + (rnd() - .5) * 0.9;
    if (x < -18) y += Math.min(9, (-18 - x) * 0.4) + Math.sin(x * 0.4) * 1.2 + Math.sin(z * 0.3) * 0.9;   // the reef
    pos.setY(i, y);
    const c = colA.clone().lerp(colB, x < -18 ? 0.1 : 0.35 + 0.4 * Math.abs(Math.sin(x * 0.07 + z * 0.11)) + (rnd() - .5) * 0.2); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, flat(0xffffff, { vertexColors: true })); m.position.z = -20; scene.add(m);
  // A far ridge, lost in the blue.
  const rg = new THREE.PlaneGeometry(320, 40, 40, 6); rg.rotateX(-Math.PI / 2);
  const rp = rg.attributes.position; seed = 41;
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i); rp.setY(i, FLOOR + 1.5 + Math.sin(x * 0.06) * 2.2 + Math.sin(x * 0.17 + 2) * 1.3 + rnd() * 0.8); }
  rg.computeVertexNormals(); const ridge = new THREE.Mesh(rg, flat(PAL.ridge)); ridge.position.z = -78; scene.add(ridge);
  // Foreground: two big dark rocks close to us, framing the picture.
  [[-30, 34, 7], [36, 30, 5.5]].forEach(([x, z, r]) => { const fr = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), flat(PAL.near)); fr.position.set(x, FLOOR - 4, z); fr.rotation.set(0.4, 0.8, 0.2); fr.scale.set(1.4, 0.8, 1); scene.add(fr); });
})();
// Caustics: a few soft light patches sliding over the sand.
const caus = new THREE.Group();
if (!DEEP) {
  const ct = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  seed = 17;
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6 + rnd() * 8, 3 + rnd() * 3), new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: NIGHT ? 0.05 : 0.14, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(-10 + rnd() * 60, FLOOR + 0.9, -34 + rnd() * 26); m.userData = { x: m.position.x, k: 0.2 + rnd() * 0.3, ph: rnd() * 6 };
    caus.add(m);
  }
  scene.add(caus);
}
// Rocks.
seed = 8; const rocks = new THREE.Group();
for (let i = 0; i < 16; i++) {
  const r = 1.2 + rnd() * 3.2, m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), flat(PAL.rock));
  const x = -60 + rnd() * 120; m.position.set(x, FLOOR - 0.6 + (x < -18 ? Math.min(9, (-18 - x) * 0.4) : 0) + r * 0.3, -46 + rnd() * 36);
  m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.scale.set(1 + rnd() * 0.8, 0.6 + rnd() * 0.5, 1 + rnd() * 0.6); rocks.add(m);
}
scene.add(rocks);
// Kelp: ribbons that sway, planted on the plain.
const kelps = []; seed = 13;
for (let i = 0; i < 9; i++) {
  const h = 3 + rnd() * 5, g = new THREE.PlaneGeometry(0.8 + rnd() * 0.5, h, 1, 10); g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, flat(PAL.kelp, { side: THREE.DoubleSide }));
  const x = (i < 4 ? 15 + rnd() * 4 : i < 7 ? -19 - rnd() * 3 : 30 + rnd() * 4); m.position.set(x, FLOOR - 0.3 + (x < -18 ? Math.min(9, (-18 - x) * 0.4) : 0), -40 + rnd() * 38);
  m.rotation.y = (rnd() - .5) * 1.2; m.userData = { base: g.attributes.position.array.slice(), k: 0.6 + rnd() * 0.6, ph: rnd() * 6 };
  kelps.push(m); scene.add(m);
}
// Corals on the reef: orange fans and a teal branch.
function fan(color, x, y, z, sc) {
  // A sea fan: a lacy net of thin branches, drawn as lines so it stays delicate at any size.
  const pts = [];
  function branch(x0, y0, ang, len, depth) {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    pts.push(x0, y0, 0, x1, y1, 0);
    if (depth === 0) return;
    branch(x1, y1, ang + 0.32 + rnd() * 0.15, len * 0.68, depth - 1);
    branch(x1, y1, ang - 0.32 - rnd() * 0.15, len * 0.68, depth - 1);
    if (rnd() < 0.5) branch(x1, y1, ang + (rnd() - .5) * 0.2, len * 0.6, depth - 1);
  }
  seed = Math.abs(x | 0) + 3;
  for (let i = -2; i <= 2; i++) branch(0, 0, Math.PI / 2 + i * 0.28, 1.6, 3);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, fog: false }));
  m.position.set(x, y, z); m.scale.setScalar(sc); m.rotation.y = (x % 2) * 0.3;
  return m;
}
const reefY = x => FLOOR - 0.3 + (x < -18 ? Math.min(9, (-18 - x) * 0.4) : 0);
scene.add(fan(PAL.coral, -27, reefY(-27), -8, 1.1), fan(PAL.coral, -21, reefY(-21) + 0.1, -16, 0.8), fan(PAL.teal, -24, reefY(-24), -4, 0.9), fan(PAL.teal, -33, reefY(-33) + 0.2, -14, 1.0), fan(PAL.coral, 34, FLOOR - 0.2, -6, 0.9));

// A school of small fish.
const fishN = DEEP ? 0 : 48, fishG = new THREE.ConeGeometry(0.1, 0.42, 3); fishG.rotateZ(-Math.PI / 2);
const fish = new THREE.InstancedMesh(fishG, flat(0x7fa8c0, { emissive: 0x2b5a7a, emissiveIntensity: 0.15 }), Math.max(1, fishN));
fish.count = fishN; const fishSeed = []; seed = 31;
for (let i = 0; i < fishN; i++) fishSeed.push({ ox: (rnd() - .5) * 6, oy: (rnd() - .5) * 2.4, oz: (rnd() - .5) * 4, ph: rnd() * 6 });
scene.add(fish);

// Bubbles: a thin trickle from the blowhole, rising to the surface.
const bubN = 36, bubPos = new Float32Array(bubN * 3), bubAge = new Float32Array(bubN).fill(2);
const bubG = new THREE.BufferGeometry(); bubG.setAttribute("position", new THREE.BufferAttribute(bubPos, 3));
const bubbles = new THREE.Points(bubG, new THREE.PointsMaterial({ color: 0xeaf6fa, size: 0.28, transparent: true, opacity: 0.7, sizeAttenuation: true, fog: false }));
scene.add(bubbles);

// The whale: the Allie2k model baked into our axes (length along x, head toward -x), painted by height.
const DARK = new THREE.Color(PAL.dark), MID = new THREE.Color(PAL.mid), BELLY = new THREE.Color(PAL.belly);
const whale = new THREE.Group(); scene.add(whale);
let whaleMat = null;
new GLTFLoader().load("../models/humpback.glb", gltf => {
  const root = gltf.scene; root.rotation.y = -Math.PI / 2; root.updateMatrixWorld(true);
  let geo = null; root.traverse(o => { if (o.isMesh && !geo) { geo = o.geometry.clone().applyMatrix4(o.matrixWorld); } });
  geo = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(geo.attributes)) if (k !== "position") geo.deleteAttribute(k);
  geo.computeBoundingBox(); const b = geo.boundingBox, size = new THREE.Vector3(); b.getSize(size); const c = new THREE.Vector3(); b.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z); geo.scale(17 / size.x, 17 / size.x, 17 / size.x); geo.computeBoundingBox(); geo.computeVertexNormals();
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), lo = geo.boundingBox.min, hi = geo.boundingBox.max;
  for (let i = 0; i < pos.count; i++) {
    const up = (pos.getY(i) - lo.y) / (hi.y - lo.y), side = Math.abs(pos.getZ(i)) / ((hi.z - lo.z) / 2);
    let cc; if (side > 0.42 && up < 0.6) cc = BELLY; else if (up > 0.55) cc = DARK; else if (up > 0.3) cc = MID; else cc = BELLY.clone().lerp(MID, 0.15);
    col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  whaleMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
  // A slow tail beat, bent in the vertex shader: the stock and the fluke swing sideways and a little up and down.
  whaleMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = { value: 0 }; whaleMat.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float tail = max(0.0, (transformed.x - 1.0) / 6.0);
        transformed.z += sin(uTime * 1.6 - transformed.x * 0.35) * 0.55 * tail * tail;
        transformed.y += sin(uTime * 1.6 - transformed.x * 0.35 + 1.2) * 0.35 * tail * tail;`);
  };
  const mesh = new THREE.Mesh(geo, whaleMat); whale.add(mesh);
  // Turned a little toward us so the pectorals show; diving when asked.
  whale.rotation.set(0, DIVE ? 0.3 : 0.42, DIVE ? 0.95 : 0);
  whale.position.set(DIVE ? -2 : -5, DIVE ? -7 : -5.5, 0);
}, undefined, e => console.error("load failed", e));

// Animation.
let t = 0;
function frame() {
  t += 0.016;
  if (surface) {
    const pos = surface.geometry.attributes.position, base = surface.userData.base;
    for (let i = 0; i < pos.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; pos.setY(i, base[i * 3 + 1] + Math.sin(x * 0.25 + t * 0.9) * 0.55 + Math.sin(z * 0.4 - t * 0.7) * 0.4 + Math.sin((x + z) * 0.5 + t * 1.3) * 0.25); }
    pos.needsUpdate = true; surface.geometry.computeVertexNormals();
    const fpos = surface.userData.foam.geometry.attributes.position;
    for (let i = 0; i < fpos.count; i++) { const x = fpos.getX(i), z = -4.2; fpos.setY(i, SURF + 0.1 + Math.sin(x * 0.25 + t * 0.9) * 0.55 + Math.sin(z * 0.4 - t * 0.7) * 0.4 + Math.sin((x + z) * 0.5 + t * 1.3) * 0.25); }
    fpos.needsUpdate = true;
  }
  rays.children.forEach(r => { r.rotation.z = r.userData.z0 + Math.sin(t * 0.3 * r.userData.k + r.userData.x) * 0.03; r.material.opacity = r.userData.a * (0.7 + 0.3 * Math.sin(t * 0.5 * r.userData.k + r.userData.x * 3)); });
  const sp = snow.geometry.attributes.position; for (let i = 0; i < snowN; i++) { let y = sp.getY(i) - 0.012; if (y < -20) y = 8; sp.setY(i, y); sp.setX(i, sp.getX(i) + Math.sin(t * 0.4 + i) * 0.004); } sp.needsUpdate = true;
  caus.children.forEach(c => { c.position.x = c.userData.x + Math.sin(t * c.userData.k + c.userData.ph) * 3; c.material.opacity = (NIGHT ? 0.05 : 0.14) * (0.6 + 0.4 * Math.sin(t * 0.7 + c.userData.ph)); });
  kelps.forEach(k => { const pos = k.geometry.attributes.position, base = k.userData.base; for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1]; pos.setX(i, base[i * 3] + Math.sin(t * k.userData.k + k.userData.ph + y * 0.5) * y * 0.14); } pos.needsUpdate = true; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < fishN; i++) {
    const f = fishSeed[i], cx = 18 + Math.sin(t * 0.15) * 12, cy = -3 + Math.sin(t * 0.21 + 1) * 3, dir = Math.cos(t * 0.15) * 22 * 0.15;
    const x = cx + f.ox + Math.sin(t * 2 + f.ph) * 0.3, y = cy + f.oy + Math.sin(t * 1.3 + f.ph) * 0.25, z = -14 + f.oz;
    e.set(0, 0, Math.atan2(Math.cos(t * 0.21 + 1) * 4 * 0.21, dir) + (dir < 0 ? Math.PI : 0)); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, y, z), q, s3); fish.setMatrixAt(i, m4);
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
