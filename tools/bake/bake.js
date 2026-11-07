// Bakes a downloaded model into a clean file for the site: one merged geometry, head toward -x,
// length 1 along x, centred, optionally simplified. Driven by Playwright (tools/bake/run.js):
// ?src=<url>&ry=<deg>&rx=<deg>&rz=<deg>&simp=<triangles>&strategy=world|bone
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import * as BGU from "three/addons/utils/BufferGeometryUtils.js";

const p = new URLSearchParams(location.search);
const deg = k => (+p.get(k) || 0) * Math.PI / 180;
window.baked = null; window.report = null;
new GLTFLoader().load(p.get("src"), gltf => {
  const root = gltf.scene; root.rotation.set(deg("rx"), deg("ry"), deg("rz")); root.updateMatrixWorld(true);
  root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
  const parts = [], names = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    if (o.isSkinnedMesh && p.get("strategy") === "bone") { const pos = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pos.count; i++) { o.applyBoneTransform(i, v); pos.setXYZ(i, v.x, v.y, v.z); } }
    for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
    g.deleteAttribute("normal");
    parts.push((g.index ? g.toNonIndexed() : g).applyMatrix4(o.matrixWorld)); names.push(o.name + (o.isSkinnedMesh ? "(skinned)" : ""));
  });
  let geo = parts.length === 1 ? parts[0] : BGU.mergeGeometries(parts, false);
  const simp = +p.get("simp") || 0;
  if (simp) {
    let ig = BGU.mergeVertices(geo, 1e-5); const tris = ig.index.count / 3;
    if (tris > simp) { try { geo = new SimplifyModifier().modify(ig, Math.floor(ig.attributes.position.count * (1 - simp / tris))); geo = geo.toNonIndexed(); } catch (e) { console.error("simplify", e); } }
  }
  // ?cutx=<fraction>: drop the triangles in the front fraction of the length (a narwhal's tusk, to make a beluga).
  const cutx = +p.get("cutx") || 0;
  if (cutx) {
    geo.computeBoundingBox(); const b0 = geo.boundingBox, limit = b0.min.x + (b0.max.x - b0.min.x) * cutx;
    const pos = geo.attributes.position, keep = [];
    for (let i = 0; i < pos.count; i += 3) { const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3; if (cx >= limit) for (let k = 0; k < 3; k++) keep.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)); }
    geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
  }
  geo.computeBoundingBox(); const b = geo.boundingBox, size = new THREE.Vector3(); b.getSize(size); const c = new THREE.Vector3(); b.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z); geo.scale(1 / size.x, 1 / size.x, 1 / size.x); geo.computeVertexNormals();
  const tris = geo.attributes.position.count / 3;
  new GLTFExporter().parse(new THREE.Mesh(geo, new THREE.MeshStandardMaterial()), buf => {
    const bytes = new Uint8Array(buf); let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    window.baked = btoa(s); window.report = { meshes: names, size: size.toArray(), tris };
  }, e => { window.report = { error: String(e) }; }, { binary: true });
}, undefined, e => { window.report = { error: String(e) }; });
