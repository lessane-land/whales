// Candidate models from Sketchfab (CC BY), shown in the sea with our light.
// ?m=<file in candidates/>  ?rx= ?ry= ?rz= (degrees)  ?flat (our palette, flat shaded)  ?night  ?s= (scale factor)
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import { paintSea } from "./sea2d.js";

const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
const p = new URLSearchParams(location.search);
const NIGHT = p.has("night");
const sy = paintSea(document.getElementById("sea"), W, H, dpr, NIGHT);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), alpha: true, antialias: true });
renderer.setPixelRatio(dpr); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -5000, 5000);
camera.position.set(0, 0, 1000); camera.lookAt(0, 0, 0);
const sun = new THREE.DirectionalLight(0xffffff, NIGHT ? 1.6 : 2.6); sun.position.set(-0.3, 1, 0.8); scene.add(sun);
const fill = new THREE.DirectionalLight(NIGHT ? 0x6a90b0 : 0x7fc0e0, 0.5); fill.position.set(0.6, -0.4, 0.5); scene.add(fill);
scene.add(new THREE.AmbientLight(NIGHT ? 0x1a2a44 : 0x2a4a6a, NIGHT ? 1.2 : 1.6));
const rim = new THREE.DirectionalLight(0xbfe8ff, NIGHT ? 1.2 : 0.9); rim.position.set(0.4, 0.6, -1); scene.add(rim);

const DARK = new THREE.Color(0x14263e), MID = new THREE.Color(0x3b5f84), BELLY = new THREE.Color(0xd6e2e8);
const file = p.get("m");
document.getElementById("tag").textContent = file || "";
let mixer = null, root = null;
new GLTFLoader().load("candidates/" + file, gltf => {
  root = gltf.scene;
  // Orientation first, then measure: the longest axis becomes x.
  root.rotation.set(THREE.MathUtils.degToRad(+p.get("rx") || 0), THREE.MathUtils.degToRad(+p.get("ry") || 0), THREE.MathUtils.degToRad(+p.get("rz") || 0));
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(); root.traverse(o => { if (!o.isMesh) return; if (o.isSkinnedMesh) { o.computeBoundingBox(); box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); } else { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  const size = new THREE.Vector3(); box.getSize(size);
  const length = Math.max(size.x, size.y, size.z);
  const s = (Math.min(W, 1280) * 0.52 / length) * (+p.get("s") || 1);
  const c = new THREE.Vector3(); box.getCenter(c);
  const holder = new THREE.Group();
  root.position.sub(c.multiplyScalar(1)); // centre at the origin (approximately: rotation is applied inside root)
  holder.add(root); holder.scale.setScalar(s);
  holder.position.set(-W * 0.1, H / 2 - sy - H * 0.3, 0);
  scene.add(holder);
  if (p.has("flat")) {
    // Our palette on the real shape: optionally simplified to ?simp=<triangles> for bigger facets,
    // flat shaded, coloured by height (dark back, pale belly) and by distance from the axis (the pectorals pale).
    const simp = +p.get("simp") || 0;
    root.traverse(o => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry : THREE.BufferGeometryUtils ? o.geometry : o.geometry;
      if (simp) {
        const tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        if (tris > simp) { const base = g.clone(); for (const k of Object.keys(base.attributes)) if (k !== "position") base.deleteAttribute(k); g = new SimplifyModifier().modify(base, Math.floor(base.attributes.position.count * (1 - simp / tris))); }
      }
      g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals();
      const pos = g.attributes.position, col = new Float32Array(pos.count * 3), v = new THREE.Vector3();
      const lo = box.min, hi = box.max, ht = hi.y - lo.y, wd = hi.z - lo.z;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const up = (v.y - lo.y) / ht, side = Math.abs(v.z - (lo.z + hi.z) / 2) / (wd / 2);
        let c; if (side > 0.42 && up < 0.6) c = BELLY; else if (up > 0.55) c = DARK; else if (up > 0.3) c = MID; else c = BELLY.clone().lerp(MID, 0.15);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      o.geometry = g; o.material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
    });
  } else {
    root.traverse(o => { if (o.isMesh && o.material) { o.material.side = THREE.DoubleSide; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
  }
  if (gltf.animations.length && !p.has("still")) { mixer = new THREE.AnimationMixer(root); mixer.clipAction(gltf.animations[+p.get("a") || 0]).play(); }
  const info = []; root.traverse(o => { if (o.isMesh) info.push(o.name + ":" + (o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3)); });
  console.log("loaded", file, "size", size.toArray().map(v => v.toFixed(1)).join("x"), "anims", gltf.animations.map(a => a.name).join(","), "meshes", info.join(" "));
}, undefined, e => console.error("load failed", e));

const clock = new THREE.Clock();
function frame() { if (mixer) mixer.update(clock.getDelta()); renderer.render(scene, camera); requestAnimationFrame(frame); }
frame();
