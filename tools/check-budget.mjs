// Sums the built site by asset class and fails if the first load budget is blown.
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const CEILING_MB = 30;
const CLASSES = {
  models: /\.(glb|gltf)$/i,
  hdri: /\.(hdr|exr)$/i,
  images: /\.(png|jpe?g|webp|svg)$/i,
  code: /\.(js|css|html)$/i,
  docs: /\.pdf$/i
};

function walk(p, out) {
  for (const f of readdirSync(p)) {
    const q = join(p, f);
    const st = statSync(q);
    if (st.isDirectory()) walk(q, out); else out.push({ path: q, size: st.size });
  }
  return out;
}

const files = walk(DIST, []);
const totals = {};
for (const f of files) {
  const cls = Object.entries(CLASSES).find(([, re]) => re.test(f.path))?.[0] || 'other';
  totals[cls] = (totals[cls] || 0) + f.size;
}
// The classic fallback ships its own images and PDFs, they are not part of the 3D first load.
const classic = files.filter((f) => f.path.replace(/\\/g, '/').includes('/classic/')).reduce((a, f) => a + f.size, 0);
const total = files.reduce((a, f) => a + f.size, 0);
const firstLoad = total - classic;
const mb = (b) => (b / 1048576).toFixed(2) + ' MB';

console.log('budget:');
for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(8)} ${mb(v)}`);
console.log(`  classic  ${mb(classic)} (fallback, excluded from first load)`);
console.log(`  3D site  ${mb(firstLoad)} of ${CEILING_MB} MB ceiling, ${files.length} files`);
const big = files.filter((f) => f.size > 2.5 * 1048576 && !f.path.includes('classic'));
for (const f of big) console.log(`  large: ${f.path} ${mb(f.size)}`);
if (firstLoad > CEILING_MB * 1048576) { console.log('budget: FAIL'); process.exit(1); }
console.log('budget: ok');
