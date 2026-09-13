// Prints the native bounding box of a GLB in metres: width (x), height (y), depth (z), and the min corner.
//   node tools/measure.mjs public/models/monitor.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

export async function measureGlb(file) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(file);
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const wm = node.getWorldMatrix(); const v = [0, 0, 0];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const idx = prim.getIndices();
      tris += (idx ? idx.getCount() : pos.getCount()) / 3;
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        const x = wm[0] * v[0] + wm[4] * v[1] + wm[8] * v[2] + wm[12];
        const y = wm[1] * v[0] + wm[5] * v[1] + wm[9] * v[2] + wm[13];
        const z = wm[2] * v[0] + wm[6] * v[1] + wm[10] * v[2] + wm[14];
        mn = [Math.min(mn[0], x), Math.min(mn[1], y), Math.min(mn[2], z)];
        mx = [Math.max(mx[0], x), Math.max(mx[1], y), Math.max(mx[2], z)];
      }
    }
  }
  const textures = doc.getRoot().listTextures().length;
  return { W: mx[0] - mn[0], H: mx[1] - mn[1], D: mx[2] - mn[2], min: mn, max: mx, tris: Math.round(tris), textures };
}

if (process.argv[1] && process.argv[1].endsWith('measure.mjs')) {
  const file = process.argv[2];
  if (!file) { console.log('usage: node tools/measure.mjs <file.glb>'); process.exit(1); }
  const m = await measureGlb(file);
  console.log(`${file}: W ${m.W.toFixed(3)} H ${m.H.toFixed(3)} D ${m.D.toFixed(3)}  min y ${m.min[1].toFixed(3)}  tris ${m.tris}  textures ${m.textures}`);
}
