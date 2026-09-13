// Optimises a GLB in place: dedup, prune, weld, resize textures to 1024 and compress them to webp.
//   node tools/optimize-model.mjs public/models/monitor.glb [maxTexture]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, resample, textureCompress, flatten, join } from '@gltf-transform/functions';
import sharp from 'sharp';
import { statSync } from 'node:fs';

export async function optimizeGlb(file, maxTexture = 1024) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(file);
  const before = statSync(file).size;
  await doc.transform(
    dedup(), flatten(), join(), weld(), resample(), prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTexture, maxTexture] })
  );
  await io.write(file, doc);
  const after = statSync(file).size;
  return { before, after };
}

if (process.argv[1] && process.argv[1].endsWith('optimize-model.mjs')) {
  const file = process.argv[2];
  if (!file) { console.log('usage: node tools/optimize-model.mjs <file.glb> [maxTexture]'); process.exit(1); }
  const r = await optimizeGlb(file, +(process.argv[3] || 1024));
  console.log(`${file}: ${(r.before / 1024).toFixed(0)} KB to ${(r.after / 1024).toFixed(0)} KB`);
}
