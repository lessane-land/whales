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
const rim = new THREE.DirectionalLight(0xbfe8ff, NIGHT ? 1.2 : 0.9); rim.position.set(0.4, 0.6, -1); scene.add(rim);

// Humpback as a lofted body drawn from real proportions: a side profile (top line
// and belly line, both absolute) and a plan width, station by station along x.
// Head tip at -50, fluke joint at +46; length 100, height about 24 (a humpback is stout).
// [x, top, bottom, half width, top exponent, belly exponent]
// exponent < 1 gives a boxy flat section (the rostrum, the throat), > 1 a ridge (the tail stock keel).
const STATIONS = [
  [-50, 0.8, -1.6, 1.2, 0.5, 0.7], [-48, 1.6, -4.2, 3.6, 0.45, 0.7], [-45, 2.6, -6.8, 6, 0.45, 0.75], [-41, 3.6, -9.2, 8.4, 0.5, 0.8],
  [-35, 5, -11.2, 10.6, 0.6, 0.85], [-28, 7, -12.4, 12, 0.75, 0.9], [-19, 9.2, -12.6, 12.6, 0.9, 0.95],
  [-8, 10.4, -12.2, 12.2, 1, 1], [3, 11, -10.8, 11, 1, 1], [11, 11.8, -8.8, 9.2, 1.1, 1.05], [17, 11.4, -7, 7, 1.3, 1.1],
  [23, 8.8, -5.2, 5, 1.5, 1.2], [29, 6.6, -3.8, 3.5, 1.6, 1.3], [35, 5, -2.8, 2.6, 1.6, 1.3], [41, 3.6, -1.8, 2, 1.5, 1.3], [46, 2.6, -1.2, 1.8, 1.4, 1.3]
];
const DARK = new THREE.Color(0x14263e), MID = new THREE.Color(0x3b5f84), LIGHT = new THREE.Color(0x7fa3c2), BELLY = new THREE.Color(0xd6e2e8);

function loft(stations, segs = 18) {
  const pos = [], col = [], idx = [];
  stations.forEach((s, i) => {
    const [x, top, bottom, rz, eT, eB] = s;
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      const up = Math.sin(a);
      const y = up > 0 ? Math.pow(up, eT) * top : Math.pow(-up, eB) * bottom;
      const z = Math.cos(a) * rz;
      pos.push(x, y, z);
      // Colour by height: back dark, flank mid, the belly and the whole lower jaw pale,
      // the throat pleats as alternating facets from the chin to the navel.
      let c;
      if (up > 0.4) c = DARK.clone().lerp(MID, 0.3 * (1 - up));
      else if (up > -0.15) c = MID.clone().lerp(DARK, 0.2);
      else if (x < 8) c = (k % 2 ? BELLY : BELLY.clone().lerp(MID, 0.2));
      else c = MID.clone().lerp(LIGHT, 0.5);
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
const matFinPale = new THREE.MeshStandardMaterial({ color: 0xcfdde4, flatShading: true, roughness: 0.9 });
const matKnob = new THREE.MeshStandardMaterial({ color: 0x0c182a, flatShading: true });

function plate(points, depth, mat, capMat) {
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.5, bevelSize: 0.7, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -depth / 2);
  return new THREE.Mesh(g, capMat ? [capMat, mat] : mat);
}

const whale = new THREE.Group();
const body = new THREE.Mesh(loft(STATIONS), matBody); whale.add(body);
// Fluke: two blades with a scalloped trailing edge, lying almost flat, tilted so the camera sees their face.
const fluke = new THREE.Group();
function blade(sign) {
  const m = plate([[0, 0], [5, sign * 7], [12, sign * 15], [20, sign * 23], [30, sign * 29], [34, sign * 28], [29, sign * 20], [24, sign * 13], [20, sign * 8], [16, sign * 4], [13, 0]], 0.7, matFin, matFinPale);
  m.rotation.x = Math.PI / 2 - 0.5;
  m.rotation.y = sign * 0.16;
  return m;
}
fluke.add(blade(1)); fluke.add(blade(-1)); fluke.position.set(46, 0.6, 0); whale.add(fluke);
// Dorsal fin: small and falcate, sitting on the hump.
const dorsal = plate([[0, 0], [2, 2.6], [4.5, 4.2], [6.5, 3.6], [7.5, 2], [9, 0]], 0.9, matFinLight); dorsal.position.set(12.5, 10.6, 0); whale.add(dorsal);
// Pectorals: a third of the body, paddle shaped, knobs along the leading edge, pale underside on the near one.
function pectoral(sign) {
  const p = plate([[0, 0], [4, -4], [9, -10], [14, -18], [19, -27], [24, -36], [28, -43], [27, -46], [22, -44], [15, -36], [9, -25], [4, -13], [1, -5]], 0.9, matFinLight, sign > 0 ? matFinPale : null);
  const g = new THREE.Group(); g.add(p);
  for (let i = 0; i < 7; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.7, 5, 4), matKnob); k.position.set(3 + i * 3.6, -(2.5 + i * 6.2), 0); g.add(k); }
  // Hangs from the flank behind the eye, sweeping back and down, opened toward the camera on the near side.
  g.position.set(-25, -9.5, sign * 10.5); g.rotation.set(sign * 0.75, 0, 0.8);
  return g;
}
whale.add(pectoral(1)); whale.add(pectoral(-1));
// Knobs (tubercles) in rows on the rostrum: a midline ridge and two side rows, and along the chin.
[[-48, 1.9, 0], [-45, 2.9, 0], [-42, 3.6, 0], [-39, 4.3, 0], [-36, 4.9, 0], [-33, 5.5, 0],
 [-46, 2.5, 4.5], [-43, 3.2, 6.6], [-40, 3.9, 8.1], [-37, 4.6, 9.4], [-46, 2.5, -4.5], [-43, 3.2, -6.6], [-40, 3.9, -8.1], [-37, 4.6, -9.4],
 [-48, -4.4, 1], [-46, -6.2, 2.5], [-44, -7.6, 4], [-42, -8.8, 5.5]].forEach(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 5, 4), matKnob); m.position.set(k[0], k[1], k[2]); whale.add(m); });
// The mouth: a long line from the tip of the rostrum back along the jaw, curving up toward the eye.
const mouthCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-50, -0.8, 1), new THREE.Vector3(-45, -2.4, 5.8), new THREE.Vector3(-39, -4.2, 9), new THREE.Vector3(-33, -5.6, 10.8), new THREE.Vector3(-29, -5.2, 11.6)]);
const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 16, 0.45, 5, false), matKnob); whale.add(mouth);
// Eye: just above and behind the corner of the mouth.
const eye = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 5), matKnob); eye.position.set(-29, -3.2, 11.6); whale.add(eye);

const scale = Math.min(W, 1280) / 100 * 0.5;
whale.scale.setScalar(scale);
scene.add(whale);

// Pose: diving steeply, head down, the flukes up near the surface. World y is up; the surface is at sy.
const headDown = params.has("level") ? 0 : 1.05;
whale.rotation.z = headDown;   // head (at -x) goes down when rotated positive around z
whale.position.set(-W * 0.1, H / 2 - sy - H * 0.3, 0);

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
