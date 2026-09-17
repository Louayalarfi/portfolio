// Loads a manifest GLB and fits it to a footprint: bake the manifest rotation, measure the world box,
// scale so the chosen axis matches the footprint, drop it onto the surface and centre it.
// Ported from ai-town's StaticModel. Resolves to null when the file is missing so callers keep their fallback.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let manifestPromise = null;
export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch('/models/manifest.json').then((r) => (r.ok && !/text\/html/.test(r.headers.get('content-type') || '') ? r.json() : {})).catch(() => ({}));
  }
  return manifestPromise;
}

export async function placeModel(key, { loader, footprint, scaleBy, critical = false } = {}) {
  const manifest = await loadManifest();
  const entry = manifest[key];
  if (!entry) return null;
  const url = `/models/${entry.file}`;
  loader?.track(url, critical);

  const gltf = await new Promise((resolve, reject) => new GLTFLoader(loader?.manager).load(url, resolve, undefined, reject)).catch(() => null);
  if (!gltf) return null;

  const model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    if (o.material?.map) o.material.map.anisotropy = 4;
    // Some low poly models ship near white flat colours that bloom out under the HDRI; dim tones them down.
    if (entry.dim && o.material?.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(entry.dim); }
  });

  const wrap = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(model);
  inner.rotation.set(entry.rotationX || 0, entry.rotationY || 0, 0, 'YXZ');
  wrap.add(inner);
  wrap.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(inner);
  const size = new THREE.Vector3(); box.getSize(size);
  const axis = scaleBy || entry.scaleBy || 'width';
  const span = axis === 'height' ? size.y : axis === 'depth' ? size.z : size.x;
  const target = Array.isArray(footprint) ? (axis === 'depth' ? footprint[1] : footprint[0]) : footprint;
  const s = span > 0 ? (target || span) / span : 1;
  inner.scale.setScalar(s);
  wrap.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(inner);
  const center = new THREE.Vector3(); box2.getCenter(center);
  inner.position.set(-center.x, -box2.min.y + (entry.yOff || 0), -center.z);
  wrap.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(wrap);
  const finalSize = new THREE.Vector3(); finalBox.getSize(finalSize);
  wrap.userData.center = new THREE.Vector3(0, finalSize.y * 0.5, 0);
  wrap.userData.size = finalSize;
  wrap.userData.manifest = entry;
  return wrap;
}
