// Fails the build if em or en dashes appear in the 3D source, copy, or tooling.
// The classic page under public/classic is exempt, it stays verbatim.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src', 'tools', 'index.html'];
const EXT = /\.(js|mjs|json|html|css)$/;
const BAD = /[\u2013\u2014]/;

function walk(p, out) {
  const st = statSync(p);
  if (st.isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); }
  else if (EXT.test(p)) out.push(p);
  return out;
}

const files = ROOTS.flatMap((r) => { try { return walk(r, []); } catch { return []; } });
let bad = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (BAD.test(line)) { bad++; console.log(`${f}:${i + 1}: dash punctuation: ${line.trim().slice(0, 100)}`); }
  });
}
if (bad) { console.log(`lint: ${bad} line(s) with em or en dashes`); process.exit(1); }
console.log(`lint: ${files.length} files clean`);
