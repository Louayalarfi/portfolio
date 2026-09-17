// Downloads a Poly Haven HDRI (CC0) at 2k and 1k into public/hdri/room_2k.hdr and room_1k.hdr.
//   node tools/fetch-polyhaven.mjs <asset-id> [prefix]     e.g. studio_small_09, prefix defaults to room
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';

const id = process.argv[2];
const prefix = process.argv[3] || 'room';
if (!id) { console.log('usage: node tools/fetch-polyhaven.mjs <asset-id> [prefix]'); process.exit(1); }
mkdirSync('public/hdri', { recursive: true });

const meta = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
const info = await (await fetch(`https://api.polyhaven.com/info/${id}`)).json();
if (!meta.hdri) { console.log('not an HDRI:', id); process.exit(1); }

for (const res of ['2k', '1k']) {
  const entry = meta.hdri[res]?.hdr;
  if (!entry) { console.log('no', res, 'hdr for', id); continue; }
  const out = `public/hdri/${prefix}_${res}.hdr`;
  const buf = Buffer.from(await (await fetch(entry.url)).arrayBuffer());
  if (buf.slice(0, 10).toString() !== '#?RADIANCE' && buf.slice(0, 6).toString() !== '#?RGBE') { console.log('not a radiance file', res); continue; }
  writeFileSync(out, buf);
  console.log(`saved ${out} ${(buf.length / 1048576).toFixed(2)} MB`);
}

const creditsPath = 'public/credits.json';
const credits = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : [];
credits.push({ kind: 'hdri', id, name: info.name, authors: Object.keys(info.authors || {}), license: 'CC0', url: `https://polyhaven.com/a/${id}` });
writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + '\n');
console.log('credit recorded:', info.name);
