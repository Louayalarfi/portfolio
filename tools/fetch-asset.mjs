// Fetches a CC BY / CC0 model from Poly Pizza by search term, verifies the GLB, optimises it, measures it
// and writes the manifest entry. Placement fields (rotationY, scaleBy, footprint) are set by hand afterwards
// once preview.html shows which way the model faces.
//   node tools/fetch-asset.mjs <key> "<search term>" [--pick N] [--tex 1024]
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { measureGlb } from './measure.mjs';
import { optimizeGlb } from './optimize-model.mjs';

const [key, term] = process.argv.slice(2);
if (!key || !term) { console.log('usage: node tools/fetch-asset.mjs <key> "<search term>" [--pick N] [--tex 1024]'); process.exit(1); }
const pick = +(process.argv[process.argv.indexOf('--pick') + 1] || 0) || 0;
const tex = +(process.argv[process.argv.indexOf('--tex') + 1] || 0) || 1024;

mkdirSync('public/models', { recursive: true });
const manifestPath = 'public/models/manifest.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const searchHtml = await (await fetch(`https://poly.pizza/search/${encodeURIComponent(term)}`)).text();
const ids = [...new Set([...searchHtml.matchAll(/"\/m\/([A-Za-z0-9]+)"/g)].map((m) => m[1]))];
if (!ids.length) { console.log('NO HIT for', term); process.exit(2); }
const id = ids[Math.min(pick, ids.length - 1)];
console.log(`hits: ${ids.length}, using #${pick} ${id}`);

const pageHtml = await (await fetch(`https://poly.pizza/m/${id}`)).text();
const url = (pageHtml.match(/https:\/\/static\.poly\.pizza\/[A-Za-z0-9_-]+\.glb/) || [])[0];
// The page embeds the model record as JSON: "Title":"...", "Creator":{"Username":"..."}, "Licence":"CC-BY 3.0" | "CC0".
// Fall back to the <title> ("Name - Free 3D Model By Author - Poly Pizza") and the avatar alt text.
const unescape = (s) => JSON.parse(`"${s}"`);
const pageTitle = (pageHtml.match(/<title[^>]*>(.*?)<\/title>/) || [])[1] || '';
const title = (pageHtml.match(/"Title":"((?:[^"\\]|\\.)*)"/) || [null, pageTitle.replace(/ - Free (3D )?Model By .*$/, '')])[1] || term;
const author = (pageHtml.match(/"Creator":\{"Username":"((?:[^"\\]|\\.)*)"/) || pageHtml.match(/alt="Avatar for ((?:[^"\\]|\\.)*)"/)
  || pageHtml.match(/ - Free (?:3D )?Model By (.*?) - Poly Pizza/) || [])[1] || 'unknown';
const licRaw = (pageHtml.match(/"Licen[cs]e":"((?:[^"\\]|\\.)*)"/) || [])[1]
  || (pageHtml.match(/creativecommons\.org\/(licenses\/[a-z-]+\/[0-9.]+|publicdomain\/zero\/1\.0)/) || [])[1] || '';
const license = /zero|CC0/i.test(licRaw) ? 'CC0'
  : /-sa|cc-by-sa|by-sa/i.test(licRaw) ? 'CC BY-SA'
  : /-nc|by-nc/i.test(licRaw) ? 'CC BY-NC'
  : /-nd|by-nd/i.test(licRaw) ? 'CC BY-ND'
  : /licenses\/by\/|cc-by|cc by/i.test(licRaw) ? `CC BY ${(licRaw.match(/[0-9]\.[0-9]/) || [''])[0]}`.trim() : 'unknown';
console.log(`page: "${unescape(title)}" by ${unescape(author)}, licence raw "${licRaw}" -> ${license}`);
if (license === 'unknown' || /SA|NC|ND/.test(license)) { console.log(`LICENSE NOT USABLE (${license}), try the next --pick`); process.exit(3); }
if (!url) { console.log('NO GLB on page', id); process.exit(2); }

const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
if (buf.slice(0, 4).toString() !== 'glTF') { console.log('BAD BINARY', url); process.exit(2); }
const file = `public/models/${key}.glb`;
writeFileSync(file, buf);
const opt = await optimizeGlb(file, tex);
const m = await measureGlb(file);

manifest[key] = {
  file: `${key}.glb`, source: `https://poly.pizza/m/${id}`, title: unescape(title).replace(/ \| Poly Pizza.*$/, ''), author: unescape(author), license,
  nativeWHD: [+m.W.toFixed(3), +m.H.toFixed(3), +m.D.toFixed(3)], minY: +m.min[1].toFixed(3), tris: m.tris,
  rotationY: manifest[key]?.rotationY ?? 0, rotationX: manifest[key]?.rotationX ?? 0,
  scaleBy: manifest[key]?.scaleBy ?? 'width', yOff: manifest[key]?.yOff ?? 0
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`fetched ${key}: ${title} by ${author} (${license}), ${(opt.before / 1024).toFixed(0)} KB to ${(opt.after / 1024).toFixed(0)} KB, WHD ${m.W.toFixed(2)} x ${m.H.toFixed(2)} x ${m.D.toFixed(2)}, ${m.tris} tris`);
if (opt.after > 2.5 * 1048576) console.log('WARNING: over 2.5 MB, consider another hit (--pick) or a lower --tex');
