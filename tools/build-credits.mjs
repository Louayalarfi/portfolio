// Writes public/credits.html from public/credits.json (HDRIs, from fetch-polyhaven.mjs)
// and public/models/manifest.json (models, from fetch-asset.mjs). Either file may be missing.
//   node tools/build-credits.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const HDRI_JSON = 'public/credits.json';
const MODELS_JSON = 'public/models/manifest.json';
const OUT = 'public/credits.html';

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { console.log(`credits: ${path} not found or invalid, skipping`); return fallback; }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Each entry becomes: title, by author, license, link to source
function line({ title, author, license, url }) {
  const src = url ? `<a href="${esc(url)}" rel="noopener">source</a>` : 'source not recorded';
  return `      <li>${esc(title)}, by ${esc(author || 'unknown')}, ${esc(license || 'license not recorded')}, ${src}</li>`;
}

const hdris = readJson(HDRI_JSON, [])
  .filter((e) => !e.kind || e.kind === 'hdri')
  .map((e) => ({ title: e.name || e.id, author: (e.authors || []).join(', '), license: e.license, url: e.url }));

const models = Object.values(readJson(MODELS_JSON, {}))
  .map((m) => ({ title: m.title || m.file, author: m.author, license: m.license, url: m.source }));

function section(heading, items) {
  const body = items.length ? `    <ul>\n${items.map(line).join('\n')}\n    </ul>` : '    <p class="none">none recorded</p>';
  return `    <h2>${heading}</h2>\n${body}`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Credits</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; background: #060f07; color: #cfe3d2; font-family: ui-monospace, Consolas, "DejaVu Sans Mono", monospace; font-size: 14px; line-height: 1.6; }
    main { max-width: 760px; margin: 0 auto; padding: 48px 24px 64px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 8px; color: #e9f5eb; }
    h2 { font-size: 15px; font-weight: 600; margin: 32px 0 8px; color: #8fd19e; text-transform: uppercase; letter-spacing: 0.08em; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: 4px 0; border-bottom: 1px solid #12261a; }
    a { color: #8fd19e; text-decoration: none; border-bottom: 1px solid #2c5a3a; }
    a:hover { color: #e9f5eb; border-bottom-color: #8fd19e; }
    .none { color: #6f8a75; margin: 0; }
    footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #12261a; color: #9cb8a3; }
    .back { display: inline-block; margin-bottom: 24px; color: #6f8a75; border: 0; }
  </style>
</head>
<body>
  <main>
    <a class="back" href="/">back to the site</a>
    <h1>Credits</h1>
    <p>Third party assets used on this site, with their authors and licenses.</p>
${section('HDRI', hdris)}
${section('Models', models)}
    <footer>Site by Lauai Alerfi, built with Three.js and Vite</footer>
  </main>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`credits: ${hdris.length} HDRI, ${models.length} models -> ${OUT}`);
