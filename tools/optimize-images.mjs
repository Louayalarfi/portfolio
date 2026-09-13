// Converts the classic project images to 1024 wide webp under public/images for the holo cards and die textures.
//   node tools/optimize-images.mjs
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const SRC = 'public/classic/images', OUT = 'public/images';
mkdirSync(OUT, { recursive: true });
let total = 0, n = 0;
for (const f of readdirSync(SRC)) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  const out = join(OUT, parse(f).name + '.webp');
  await sharp(join(SRC, f)).resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  const s = statSync(out).size; total += s; n++;
  console.log(`${f} -> ${parse(f).name}.webp ${(s / 1024).toFixed(0)} KB`);
}
console.log(`${n} images, ${(total / 1048576).toFixed(2)} MB`);
