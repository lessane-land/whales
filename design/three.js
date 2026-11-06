// 3D prototype: the whale as a real volume with flat shading under a light from
// above, over the drawn sea. Lofted body from ellipse sections along a spine,
// extruded fins and fluke, knobs as small spheres. No downloads.
import * as THREE from "three";

const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
const params = new URLSearchParams(location.search);
const NIGHT = params.has("night");

// The sea, drawn as in the mockups.
const sea = document.getElementById("sea"), sctx = sea.getContext("2d");
sea.width = W * dpr; sea.height = H * dpr; sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
const sy = Math.round(H * 0.22);
function rgb(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
function drawSea() {
  const sky = NIGHT ? ["#0a1222", "#0f1c33"] : ["#e9f1f4", "#c6dbe5"];
  const g = sctx.createLinearGradient(0, 0, 0, sy); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  sctx.fillStyle = g; sctx.fillRect(0, 0, W, sy);
  if (NIGHT) { seed = 77; sctx.fillStyle = "rgba(255,250,235,.8)"; for (let i = 0; i < 90; i++) { sctx.beginPath(); sctx.arc(rnd() * W, rnd() * sy * .7, .6 + rnd(), 0, 6.28); sctx.fill(); } }
  sctx.fillStyle = NIGHT ? "rgba(220,230,240,.85)" : "rgba(255,252,240,.9)"; sctx.beginPath(); sctx.arc(W * (NIGHT ? .72 : .5), sy * .5, sy * (NIGHT ? .2 : .36), 0, 6.28); sctx.fill();
  const mount = NIGHT ? ["#182a44", "#121f36", "#0d172a"] : ["#bcd5de", "#9ec0cd", "#7faabb"];
  [[.62, 3], [.48, 11], [.34, 5]].forEach((r, idx) => {
    sctx.fillStyle = mount[idx]; sctx.beginPath(); sctx.moveTo(0, sy); seed = r[1]; let x = 0; sctx.lineTo(0, sy - sy * r[0] * .5);
    while (x < W) { const step = 60 + rnd() * 160; const peak = sy - sy * r[0] * (.45 + rnd() * .55); x += step / 2; sctx.lineTo(x, peak); x += step / 2; sctx.lineTo(x, sy - sy * r[0] * (.25 + rnd() * .3)); }
    sctx.lineTo(W, sy); sctx.closePath(); sctx.fill();
  });
  const water = NIGHT ? [[0, [16, 44, 70]], [.15, [10, 30, 54]], [.4, [6, 18, 36]], [.75, [3, 9, 20]], [1, [1, 4, 10]]] : [[0, [70, 178, 206]], [.12, [44, 140, 174]], [.35, [26, 92, 132]], [.7, [14, 48, 86]], [1, [6, 18, 38]]];
  const wg = sctx.createLinearGradient(0, sy, 0, H); water.forEach(s => wg.addColorStop(s[0], rgb(s[1])));
  sctx.fillStyle = wg; sctx.fillRect(0, sy, W, H - sy);
  const bands = NIGHT ? [[150, 200, 220], [90, 150, 180], [40, 90, 120], [20, 50, 80], [10, 30, 50]] : [[236, 248, 250], [160, 220, 235], [80, 176, 204], [36, 116, 156], [18, 64, 100]];
  const bandAlpha = NIGHT ? .22 : .5;
  seed = 11; let x = -10, i2 = 0; const tones = [0, 1, 2, 1, 3, 2, 4, 1, 0, 2, 3, 1, 2, 4, 0, 3];
  while (x < W + 10) {
    let w = 6 + rnd() * 48; if (rnd() < .2) w += 36;
    const tone = tones[i2 % tones.length], c = bands[tone], a0 = bandAlpha * (tone <= 1 ? 1 : .7);
    const lg = sctx.createLinearGradient(0, sy, 0, H); lg.addColorStop(0, rgb(c, a0)); lg.addColorStop(.35, rgb(c, a0 * .45)); lg.addColorStop(1, rgb(c, .04));
    sctx.fillStyle = lg; sctx.fillRect(x, sy, w, H - sy); x += w + 4 + rnd() * 30; i2++;
  }
  const sb = sctx.createLinearGradient(0, sy, 0, sy + 90); sb.addColorStop(0, "rgba(255,255,255,.6)"); sb.addColorStop(1, "rgba(255,255,255,0)");
  sctx.fillStyle = sb; sctx.fillRect(0, sy, W, 90); sctx.fillStyle = "rgba(255,255,255,.85)"; sctx.fillRect(0, sy - 1, W, 2);
  if (NIGHT) { const mg = sctx.createLinearGradient(0, sy, 0, H); mg.addColorStop(0, "rgba(200,225,240,.28)"); mg.addColorStop(1, "rgba(200,225,240,0)"); sctx.fillStyle = mg; sctx.beginPath(); sctx.moveTo(W * .62, sy); sctx.lineTo(W * .82, sy); sctx.lineTo(W * .95, H); sctx.lineTo(W * .5, H); sctx.closePath(); sctx.fill(); }
  sctx.fillStyle = NIGHT ? "#04101e" : "#071a2e"; sctx.beginPath(); sctx.moveTo(0, H * .78); sctx.lineTo(W * .08, H * .74); sctx.lineTo(W * .16, H * .8); sctx.lineTo(W * .24, H * .77); sctx.lineTo(W * .3, H * .86); sctx.lineTo(W * .36, H); sctx.lineTo(0, H); sctx.closePath(); sctx.fill();
  sctx.strokeStyle = "#e0604a"; sctx.lineWidth = 2; sctx.lineCap = "round"; for (let c1 = 0; c1 < 7; c1++) { const a = -Math.PI / 2 + (c1 - 3) * .28; sctx.beginPath(); sctx.moveTo(W * .1, H * .74); sctx.lineTo(W * .1 + Math.cos(a) * 16, H * .74 + Math.sin(a) * 16); sctx.stroke(); }
  sctx.strokeStyle = "#5fd3a2"; for (let c2 = 0; c2 < 6; c2++) { const b2 = -Math.PI / 2 + (c2 - 2.5) * .34; sctx.beginPath(); sctx.moveTo(W * .2, H * .78); sctx.quadraticCurveTo(W * .2 + Math.cos(b2) * 10, H * .78 + Math.sin(b2) * 10 - 4, W * .2 + Math.cos(b2) * 18, H * .78 + Math.sin(b2) * 18); sctx.stroke(); }
}
drawSea();

// The 3D layer: an orthographic camera looking along z, world units are pixels.
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), alpha: true, antialias: true });
renderer.setPixelRatio(dpr); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -2000, 2000);
camera.position.set(0, 0, 1000); camera.lookAt(0, 0, 0);
const sun = new THREE.DirectionalLight(0xffffff, NIGHT ? 1.6 : 2.6); sun.position.set(-0.3, 1, 0.8); scene.add(sun);
const fill = new THREE.DirectionalLight(NIGHT ? 0x6a90b0 : 0x7fc0e0, 0.5); fill.position.set(0.6, -0.4, 0.5); scene.add(fill);
scene.add(new THREE.AmbientLight(NIGHT ? 0x1a2a44 : 0x2a4a6a, NIGHT ? 1.2 : 1.6));

// Humpback as a lofted body: stations along x (head at -54, tail joint at 44) with
// vertical half-height and width, and where the belly starts (for the pale colour).
const STATIONS = [
  [-56, 1, 0.5], [-54, 4, 3], [-48, 8, 6], [-40, 11, 8.5], [-30, 13, 10], [-18, 14, 11], [-6, 15, 11.5],
  [6, 16, 11], [16, 15, 10], [26, 12, 8], [36, 7, 5], [44, 4, 3.5]
];
const DARK = new THREE.Color(0x14263e), MID = new THREE.Color(0x3b5f84), LIGHT = new THREE.Color(0x7fa3c2), BELLY = new THREE.Color(0xd6e2e8);

function loft(stations, segs = 14) {
  const pos = [], col = [], idx = [];
  stations.forEach((s, i) => {
    const [x, ry, rz] = s;
    const yOff = i < 7 ? (ry * 0.15) : -(ry * 0.1);   // the back carries the hump, the tail stock rises
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      const y = Math.sin(a) * ry * (Math.sin(a) > 0 ? 1 : 0.9) - yOff;   // slightly flatter belly
      const z = Math.cos(a) * rz;
      pos.push(x, y, z);
      // Colour by height: back dark, flank mid, belly pale (only on the front two thirds, the throat pleats).
      const up = Math.sin(a);
      const c = up > 0.3 ? DARK.clone().lerp(MID, 0.3 * (1 - up)) : up > -0.3 ? MID.clone().lerp(DARK, 0.2) : (x < 10 ? BELLY : MID.clone().lerp(LIGHT, 0.5));
      col.push(c.r, c.g, c.b);
    }
  });
  for (let i = 0; i < stations.length - 1; i++) {
    for (let k = 0; k < segs; k++) {
      const a = i * segs + k, b = i * segs + (k + 1) % segs, c = (i + 1) * segs + k, d = (i + 1) * segs + (k + 1) % segs;
      if ((i + k) % 2) { idx.push(a, c, b, b, c, d); } else { idx.push(a, c, d, a, d, b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();   // flat shading needs unshared vertices
}

const matBody = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0.05 });
const matFin = new THREE.MeshStandardMaterial({ color: 0x1c324c, flatShading: true, roughness: 0.9 });
const matFinLight = new THREE.MeshStandardMaterial({ color: 0x2e4d6e, flatShading: true, roughness: 0.9 });
const matKnob = new THREE.MeshStandardMaterial({ color: 0x0c182a, flatShading: true });

function plate(points, depth, mat) {
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.6, bevelSize: 1.2, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -depth / 2);
  return new THREE.Mesh(g, mat);
}

const whale = new THREE.Group();
const body = new THREE.Mesh(loft(STATIONS), matBody); whale.add(body);
// Fluke: wide, scalloped, a flat plate rotated to lie horizontal (we see it edge-on from the side, so tilt it toward the camera).
const fluke = new THREE.Group();
const flukeMesh = plate([[0, 0], [8, -7], [16, -15], [25, -22], [28, -20], [22, -12], [16, -6], [12, -2], [12, 2], [16, 6], [22, 12], [28, 20], [25, 22], [16, 15], [8, 7]], 1.6, matFin);
flukeMesh.rotation.x = Math.PI / 2 - 0.55;   // mostly horizontal, tilted so the camera sees its face
fluke.add(flukeMesh); fluke.position.set(44, 1, 0); whale.add(fluke);
// Dorsal fin on the hump.
const dorsal = plate([[0, 0], [3, 7], [8, 6], [8, 0]], 1.2, matFinLight); dorsal.position.set(14, 15, 0); whale.add(dorsal);
// Pectorals: long, with bumps along the leading edge; the near one angled toward the camera.
function pectoral(sign) {
  const p = plate([[0, 0], [10, -6], [22, -15], [34, -28], [40, -40], [36, -40], [26, -30], [14, -18], [4, -8]], 1.4, matFinLight);
  const g = new THREE.Group(); g.add(p);
  for (let i = 0; i < 5; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(1.1, 5, 4), matKnob); k.position.set(7 + i * 7, -(3 + i * 6.5), 0); g.add(k); }
  g.position.set(-28, -9, sign * 9); g.rotation.set(sign * 0.9, 0, -0.1);
  return g;
}
whale.add(pectoral(1)); whale.add(pectoral(-1));
// Knobs on the head and jaw.
[[-52, 5, 0], [-49, 8, 2], [-45, 10, -2], [-41, 12, 1], [-36, 13, -1], [-31, 14, 2], [-53, -4, 2], [-49, -7, -2], [-44, -9, 1]].forEach(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 5, 4), matKnob); m.position.set(k[0], k[1], k[2] + 8); whale.add(m); });
// Eye.
const eye = new THREE.Mesh(new THREE.SphereGeometry(1.3, 6, 5), matKnob); eye.position.set(-46, 3, 11); whale.add(eye);

const scale = Math.min(W, 1280) / 100 * 0.62;
whale.scale.setScalar(scale);
scene.add(whale);

// Pose: diving steeply, head down, the flukes up near the surface. World y is up; the surface is at sy.
const headDown = params.has("level") ? 0 : 1.05;
whale.rotation.z = headDown;   // head (at -x) goes down when rotated positive around z
whale.position.set(-W * 0.1, H / 2 - sy - H * 0.36, 0);

let t = 0;
function frame() {
  t += 0.016;
  fluke.rotation.z = Math.sin(t * 2.2) * 0.14;
  whale.children.forEach(c => { if (c.isGroup && c !== fluke) c.rotation.y = Math.sin(t * 1.5 + c.position.z) * 0.08; });
  whale.rotation.y = Math.sin(t * 0.4) * 0.12;   // a slow turn toward and away from us
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
