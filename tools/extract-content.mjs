// Reads public/classic/index.html, the single source of truth, and writes src/content/generated.json.
// Never hand edit the output. Classic copy stays verbatim, the 3D copy gets dash punctuation removed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const SRC = 'public/classic/index.html';
const OUT = 'src/content/generated.json';
const html = readFileSync(SRC, 'utf8');

const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();

// 3D copy rules: em dashes become commas, en dash ranges become "to", stray en dashes become commas.
const copy = (s) => typeof s === 'string'
  ? s.replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1 to $2')
     .replace(/\s*[\u2014\u2013]\s*/g, ', ')
     .replace(/, ,/g, ',')
  : s;
const dateCopy = (s) => s.replace(/\s*[\u2014\u2013]\s*/g, ' to ');

const slug = (s) => s.toLowerCase()
  .replace(/×/g, 'x').replace(/&/g, ' and ').replace(/[\u2014\u2013]/g, ' ').replace(/\./g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Projects: run the classic D array in a sandbox so the data model is the classic page's own.
const dStart = html.indexOf('const D=[');
const dEnd = html.indexOf('const NETS=');
if (dStart < 0 || dEnd < 0) throw new Error('classic D array not found');
const ctx = vm.createContext({ IMG: 'images/' });
vm.runInContext(html.slice(dStart, dEnd) + '\n__D = D;', ctx);
const D = ctx.__D;

const groups = D.map((g) => ({
  id: g.id, ref: g.ref, name: g.name, sub: copy(g.sub), col: g.col,
  projects: g.proj.map((p) => ({
    slug: slug(p.t),
    group: g.id,
    title: copy(p.t),
    spec: copy(p.s),
    domain: copy(p.domain),
    bullets: p.bullets.map(copy),
    imgs: (p.imgs || []).map((f) => '/classic/images/' + f),
    alts: (p.alts || []).map(copy),
    links: (p.links || []).map((l) => ({ label: copy(l.l.replace(/^\S+\s/, '')), url: l.u.startsWith('images/') ? '/classic/' + l.u : l.u })),
    tags: p.tags.map(copy)
  }))
}));
const projects = groups.flatMap((g) => g.projects);

// Experience cards.
const experience = [...html.matchAll(/<div class="xcard (\w+)">\s*<div class="xdate">(.*?)<\/div><div class="xtitle">(.*?)<\/div>\s*<div class="xorg"[^>]*>(.*?)<\/div>\s*<div class="xdesc">(.*?)<\/div>\s*<div class="xtags">(.*?)<\/div>/gs)]
  .map((m) => ({
    accent: m[1],
    dates: dateCopy(decode(m[2])),
    title: copy(decode(m[3])),
    org: decode(m[4]),
    desc: copy(decode(m[5])),
    tags: [...m[6].matchAll(/<span class="xtag">(.*?)<\/span>/g)].map((t) => copy(decode(t[1])))
  }));

// Education.
const degree = decode(html.match(/<div class="edu-deg">(.*?)<\/div>/)[1]);
const eduLine = copy(decode(html.match(/<div class="edu-uni">(.*?)<\/div>/)[1]));
const badges = [...html.matchAll(/<span class="edu-badge [^"]*">(.*?)<\/span>/g)].map((m) => copy(decode(m[1])));
const focus = decode(html.match(/<div class="edu-focus">(.*?)<\/div>/)[1]);
const courses = [...html.matchAll(/<div class="ccard"><div class="ccode">(.*?)<\/div><div class="cname">(.*?)<\/div><div class="cnote">(.*?)<\/div><\/div>/g)]
  .map((m) => {
    const [code, term] = decode(m[1]).split('·').map((s) => s.trim());
    const note = decode(m[3]);
    const grade = note.match(/(\d+)%$/);
    return { code, term, name: copy(decode(m[2])), note: copy(note.replace(/\s*·\s*\d+%$/, '')), grade: grade ? +grade[1] : null };
  });
const certs = [...html.matchAll(/<div class="cert"><div class="cert-name">(.*?)<\/div><div class="cert-org">(.*?)<\/div>(?:<div class="cert-date">(.*?)<\/div>)?<\/div>/g)]
  .map((m) => ({ name: copy(decode(m[1])), org: decode(m[2]), date: m[3] ? copy(decode(m[3])) : '' }));

// Skills and contact.
const skills = [...html.matchAll(/<div class="sg"><div class="sg-t">(.*?)<\/div><div class="sg-tags">(.*?)<\/div><\/div>/g)]
  .map((m) => ({ group: decode(m[1]), tags: [...m[2].matchAll(/<span class="sgtag">(.*?)<\/span>/g)].map((t) => decode(t[1])) }));
const contact = [...html.matchAll(/<(a|div)(?: href="([^"]*)")?[^>]*class="cc"><div class="cc-l">(.*?)<\/div><div class="cc-v">(.*?)<\/div><\/\1>/g)]
  .map((m) => ({ label: decode(m[3]), value: copy(decode(m[4])), href: m[2] || '' }));

// Hero.
const stats = [...html.matchAll(/<div class="hs-v">(.*?)<\/div><div class="hs-l">(.*?)<\/div>/g)].map((m) => ({ value: decode(m[1]), label: decode(m[2]) }));
const overview = [...html.match(/<div class="h-overview">([\s\S]*?)<\/div>/)[1].matchAll(/<p>(.*?)<\/p>/gs)].map((m) => copy(decode(m[1])));
const hero = {
  name: decode(html.match(/<h1 class="h-name">(.*?)<\/h1>/s)[1].replace(/<br>/g, ' ')),
  title: decode(html.match(/<div class="h-title">(.*?)<\/div>/)[1]),
  desc: copy(decode(html.match(/<div class="h-desc">(.*?)<\/div>/)[1])),
  stats, overview
};

const out = {
  generatedAt: new Date().toISOString(),
  source: SRC,
  hero, experience,
  education: { degree, line: eduLine, badges, focus, courses, certs },
  skills, contact, groups, projects
};
mkdirSync('src/content', { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

const perGroup = groups.map((g) => g.projects.length).join('/');
console.log(`content: ${projects.length} projects (${perGroup}), ${experience.length} roles, ${courses.length} courses, ${certs.length} certs, ${skills.length} skill groups, ${contact.length} contacts, ${stats.length} stats`);
const missing = projects.filter((p) => !p.imgs.length).map((p) => p.slug);
if (missing.length) console.log(`content: no images for ${missing.join(', ')}`);
