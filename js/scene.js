// The anime layer: whales as open-licence models (models/manifest.json) drawn in
// cel shading with ink outlines, over the 2D sea. The engine (sea.js) keeps the
// data, the dives, the camera and the behaviour; each frame it tells this layer
// where every whale is, in pixels, and this layer draws them under the same light.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const INK = 0x0a2438;
// Cel colours per species: back, flank, belly. Beluga white, pilot near black, the rest between.
const PAL = {
  humpback: [0x14536a, 0x1f9aa6, 0xe6fbf8],
  sperm: [0x2b3f55, 0x4a6680, 0xb9c6d2],
  blue: [0x34567a, 0x5a84a8, 0xc9dbe8],
  fin: [0x2a3d50, 0x4f6b84, 0xd8e2ea],
  cuvier: [0x4a5a5e, 0x7f8f8c, 0xd9d6c8],
  blainville: [0x3f4e58, 0x6b7c86, 0xcfd3cf],
  pilot: [0x1b2630, 0x2e3d4a, 0x9aa8b2],
  beluga: [0xd9e6ea, 0xf0f6f7, 0xffffff],
  narwhal: [0x5d6a72, 0x8f9aa0, 0xe8eef0]
};
// Where the eye sits, as fractions of the length (from the centre) and of the height.
const EYE = { humpback: [-0.31, 0.02], sperm: [-0.23, -0.04], blue: [-0.3, 0.0], fin: [-0.3, 0.0], cuvier: [-0.33, 0.01], blainville: [-0.33, 0.01], pilot: [-0.34, 0.0], beluga: [-0.33, 0.02], narwhal: [-0.2, 0.02] };
const BALEEN = { humpback: 1, blue: 1, fin: 1 };

const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;

let renderer = null, scene = null, camera = null, sun = null, amb = null, W = 0, H = 0, dpr = 1;
const kinds = {};          // kind -> { geo, detail builder }
const pool = {};           // id -> THREE.Group (one per drawn whale)
const shaders = [];
let frameReqs = [], frameInfo = null, t0 = performance.now();
const rays = new THREE.Group();

function bendShader(sh) {
  sh.uniforms.uTime = { value: 0 }; sh.uniforms.uBeat = { value: 1 };
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uBeat;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      float tail = max(0.0, (transformed.x - 0.05) / 0.32);
      transformed.z += sin(uTime * 1.6 * uBeat - transformed.x * 6.5) * 0.032 * uBeat * tail * tail;
      transformed.y += sin(uTime * 1.6 * uBeat - transformed.x * 6.5 + 1.2) * 0.02 * uBeat * tail * tail;`);
  shaders.push(sh);
}

// Builds the drawn whale for one species: cel body, ink outline, ridge light, mouth, pleats, eye.
function build(kind, geo) {
  const g = new THREE.Group();
  const [bk, fl, be] = (PAL[kind] || PAL.sperm).map(h => new THREE.Color(h));
  geo = geo.clone(); geo.computeBoundingBox();
  const lo = geo.boundingBox.min, hi = geo.boundingBox.max, pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const up = (pos.getY(i) - lo.y) / (hi.y - lo.y), side = Math.abs(pos.getZ(i)) / ((hi.z - lo.z) / 2);
    let c;
    if (side > 0.42 && up < 0.6) c = be;
    else if (up > 0.62) c = bk;
    else if (up > 0.5) c = bk.clone().lerp(fl, (0.62 - up) / 0.12);
    else if (up > 0.3) c = fl;
    else if (up > 0.22) c = fl.clone().lerp(be, (0.3 - up) / 0.08);
    else c = be;
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  g.userData.shaders = [];
  const body = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  body.onBeforeCompile = sh => { bendShader(sh); g.userData.shaders.push(sh); };
  const mesh = new THREE.Mesh(geo, body); g.add(mesh);
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  inkMat.onBeforeCompile = sh => { bendShader(sh); g.userData.shaders.push(sh); sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * 0.0065;"); };
  mesh.add(new THREE.Mesh(geo, inkMat));
  mesh.updateMatrixWorld(true);
  const caster = new THREE.Raycaster();
  const skin = (o, d) => { caster.set(o, d.normalize()); const h = caster.intersectObject(mesh, false)[0]; return h ? { p: h.point, n: h.face.normal } : null; };
  const tube = (pts, r, color, extra = {}) => { if (pts.length < 2) return; const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 5, false), new THREE.MeshBasicMaterial({ color, ...extra })); m.userData.detail = true; g.add(m); };
  const ht = hi.y - lo.y;
  // Ridge light along the back, from the head to two thirds back.
  const ridge = []; for (let x = -0.46; x <= 0.18; x += 0.025) { const h = skin(new THREE.Vector3(x, 2, 0.01), new THREE.Vector3(0, -1, 0)); if (h) ridge.push(h.p.clone().add(new THREE.Vector3(0, 0.001, 0.004))); }
  tube(ridge, 0.0035, 0xd8f6f2, { transparent: true, opacity: 0.8 });
  // Mouth: an ink line from the tip back along the jaw.
  const mouth = []; const mx0 = -0.49, mx1 = kind === "sperm" ? -0.2 : -0.28;
  for (let x = mx0; x <= mx1; x += 0.015) { const a = (12 + (x - mx0) / (mx1 - mx0) * 10) * Math.PI / 180; const h = skin(new THREE.Vector3(x, -2 * Math.sin(a), 2 * Math.cos(a)), new THREE.Vector3(0, Math.sin(a), -Math.cos(a))); if (h) mouth.push(h.p.clone().add(h.n.clone().multiplyScalar(0.0015))); }
  tube(mouth, 0.003, INK);
  if (BALEEN[kind]) for (const deg of [40, 55, 70, 85]) {
    const a = deg * Math.PI / 180, pts = [];
    for (let x = -0.47; x <= -0.02; x += 0.02) { const h = skin(new THREE.Vector3(x, -2 * Math.sin(a), 2 * Math.cos(a)), new THREE.Vector3(0, Math.sin(a), -Math.cos(a))); if (h) pts.push(h.p.clone().add(h.n.clone().multiplyScalar(0.0015))); }
    tube(pts, 0.0018, INK, { transparent: true, opacity: 0.5 });
  }
  if (kind === "humpback") for (const z of [0, 0.025, -0.025]) for (let x = -0.47; x <= -0.31; x += 0.027) { const h = skin(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0)); if (h) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 5), new THREE.MeshBasicMaterial({ color: INK })); b.position.copy(h.p); b.userData.detail = true; g.add(b); } }
  // The eye.
  const e = EYE[kind] || EYE.sperm, hit = skin(new THREE.Vector3(e[0], e[1] * ht, 2), new THREE.Vector3(0, 0, -1));
  const eye = new THREE.Group(); const r = 0.019;
  const white = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); white.scale.set(1.25, 0.8, 1); eye.add(white);
  const iris = new THREE.Mesh(new THREE.CircleGeometry(r * 0.64, 20), new THREE.MeshBasicMaterial({ color: 0x0d3a4a })); iris.position.set(r * 0.2, 0, 0.0005); eye.add(iris);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.34, 14), new THREE.MeshBasicMaterial({ color: INK })); pupil.position.set(r * 0.24, 0, 0.001); eye.add(pupil);
  const glint = new THREE.Mesh(new THREE.CircleGeometry(r * 0.2, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(r * 0.4, r * 0.24, 0.0015); eye.add(glint);
  const lid = new THREE.Mesh(new THREE.RingGeometry(r, r * 1.18, 20), new THREE.MeshBasicMaterial({ color: INK })); lid.scale.set(1.25, 0.8, 1); lid.position.z = 0.0002; eye.add(lid);
  if (hit) { eye.position.copy(hit.p).add(hit.n.clone().multiplyScalar(0.002)); eye.lookAt(hit.p.clone().add(hit.n)); } else eye.position.set(e[0], e[1] * ht, (hi.z - lo.z) / 2);
  eye.userData.detail = true; g.add(eye); g.userData.eye = eye;
  return g;
}

// A silhouette for the far whales: one flat colour, no outline.
function silhouette(geo) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x16556e, transparent: true, opacity: 0.7 }));
  const g = new THREE.Group(); g.add(m); g.userData.flat = m; return g;
}

function ensure(id, kind, flat) {
  const key = id + (flat ? ":flat" : "");
  let g = pool[key];
  if (g && g.userData.kind === kind) return g;
  if (g) { scene.remove(g); delete pool[key]; }
  if (!kinds[kind]) return null;
  g = flat ? silhouette(kinds[kind]) : build(kind, kinds[kind]);
  g.userData.kind = kind; g.userData.seen = 0;
  pool[key] = g; scene.add(g);
  return g;
}

function makeRays(sy) {
  while (rays.children.length) rays.remove(rays.children[0]);
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d"), img = x.createImageData(64, 128);
  for (let j = 0; j < 128; j++) for (let i = 0; i < 64; i++) { const u = (i - 31.5) / 32, v = j / 128, a = Math.max(0, 1 - u * u) ** 2 * (1 - v) ** 1.4; const k = (j * 64 + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a * 255; }
  x.putImageData(img, 0, 0); const tex = new THREE.CanvasTexture(c);
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 9; i++) {
    const w = (0.04 + rnd() * 0.1 + (rnd() < .3 ? 0.16 : 0)) * W, h = H * 1.2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, w * 1.2, -h, 0, -w * 1.2, -h, 0], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); geo.setIndex([0, 2, 1, 0, 3, 2]);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3 + rnd() * 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(rnd() * W, 0, -5); m.rotation.z = 0.16 + (rnd() - .5) * 0.1; m.userData = { k: 0.4 + rnd() * 0.6, ph: rnd() * 6, a: m.material.opacity };
    rays.add(m);
  }
}

function resize(w, h, d) {
  W = w; H = h; dpr = d;
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
  camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H; camera.updateProjectionMatrix();
  makeRays();
}

let portraitR = null, portraitScene = null, portraitCam = null, portraitWhale = null;
window.Scene = {
  ready: false,
  // The species sheet's portrait: the same cel whale, level, on a transparent canvas the app styles.
  portrait(canvas, kind) {
    if (!kinds[kind]) return false;
    const w = canvas.clientWidth, h = canvas.clientHeight, d = Math.min(devicePixelRatio || 1, 2);
    if (!portraitR) {
      portraitR = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); portraitR.setClearColor(0x000000, 0);
      portraitScene = new THREE.Scene();
      const ps = new THREE.DirectionalLight(0xffffff, 2.2); ps.position.set(-0.4, 1, 0.9); portraitScene.add(ps);
      portraitScene.add(new THREE.AmbientLight(0x4a8aa0, 0.8));
      portraitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000); portraitCam.position.set(0, 0, 1000); portraitCam.lookAt(0, 0, 0);
    }
    portraitR.setPixelRatio(d); portraitR.setSize(w, h, false);
    portraitCam.left = -w / 2; portraitCam.right = w / 2; portraitCam.top = h / 2; portraitCam.bottom = -h / 2; portraitCam.updateProjectionMatrix();
    if (portraitWhale) portraitScene.remove(portraitWhale);
    portraitWhale = build(kind, kinds[kind]);
    portraitWhale.scale.setScalar(Math.min(w * 0.82, h * 3.2)); portraitWhale.rotation.set(0, 0.36, 0); portraitWhale.position.set(0, 0, 0);
    portraitScene.add(portraitWhale);
    portraitR.render(portraitScene, portraitCam);
    return true;
  },
  init(canvas, manifestUrl) {
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return; }
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000); camera.position.set(0, 0, 1000); camera.lookAt(0, 0, 0);
    sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-0.4, 1, 0.9); scene.add(sun);
    amb = new THREE.AmbientLight(0x4a8aa0, 0.8); scene.add(amb);
    scene.add(rays);
    fetch(manifestUrl).then(r => r.json()).then(man => {
      const loader = new GLTFLoader(); let left = Object.keys(man).length;
      Object.keys(man).forEach(kind => {
        loader.load("models/" + man[kind].file, gltf => {
          let geo = null; gltf.scene.traverse(o => { if (o.isMesh && !geo) geo = o.geometry; });
          if (geo) { if (geo.index) geo = geo.toNonIndexed(); geo.computeVertexNormals(); kinds[kind] = geo; }
          if (--left === 0) Scene.ready = true;
        }, undefined, () => { if (--left === 0) Scene.ready = true; });
      });
    });
  },
  // Called once per frame before the whales: the sea's geometry in pixels.
  begin(info) {
    if (!renderer) return;
    if (info.W !== W || info.H !== H || info.dpr !== dpr) resize(info.W, info.H, info.dpr);
    frameInfo = info; frameReqs = [];
  },
  // One whale: x, y in pixels; pitch as the engine's (negative is head down); scale in pixels per
  // hundredth of the body; alpha; kind; flat for a far silhouette; speed 0..1; colour for silhouettes.
  whale(id, r) { if (frameInfo) { frameReqs.push(Object.assign({ id }, r)); if (!r.flat) Scene.last = r; } },
  // Draws the frame: veil 0..1 darkens the deep, night 0..1 dims the sun.
  end(veil, night) {
    if (!renderer || !frameInfo) return;
    const t = (performance.now() - t0) / 1000, I = frameInfo;
    const seen = {};
    frameReqs.forEach(r => {
      const g = ensure(r.id, r.kind, r.flat); if (!g) return;
      const len = 100 * r.scale;   // pixels, nose to fluke
      g.position.set(r.x, -r.y, r.flat ? -20 : 0);
      g.scale.setScalar(len);
      g.rotation.set(0, r.flat ? 0.1 : 0.36, -r.pitch);
      if (r.flat) { const m = g.userData.flat.material; m.opacity = r.alpha; m.color.set(r.color || 0x16556e); }
      else if (g.userData.eye) { const ph = (t * 0.37 + r.id.length) % 1; g.userData.eye.scale.y = ph > 0.96 ? 0.1 : 1; }
      g.visible = true; seen[r.id + (r.flat ? ":flat" : "")] = 1;
      const beat = 0.4 + (r.speed || 0) * 0.9; (g.userData.shaders || []).forEach(sh => { sh.uniforms.uBeat.value = beat; });
    });
    Object.keys(pool).forEach(k => { if (!seen[k]) pool[k].visible = false; });
    shaders.forEach(sh => { sh.uniforms.uTime.value = t; });
    // Light: the sun fades with the night and the veil of the deep; the rays hang from the surface.
    const dim = (1 - veil * 0.85) * (1 - night * 0.55);
    sun.intensity = 2.2 * dim; amb.intensity = 0.8 * (1 - veil * 0.6) * (1 - night * 0.3);
    rays.position.y = -I.sy; rays.visible = I.sy > -H;
    rays.children.forEach(m => { m.material.opacity = m.userData.a * (0.65 + 0.35 * Math.sin(t * 0.6 * m.userData.k + m.userData.ph)) * (1 - night * 0.7) * Math.max(0, 1 - veil * 2); });
    renderer.render(scene, camera);
    frameInfo = null;
  }
};

Scene.init(document.getElementById("gl"), "models/manifest.json?v=38");
