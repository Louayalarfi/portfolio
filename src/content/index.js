// One import for all content: the generated classic data, the 3D only extras, and the world map.
import generated from './generated.json';
import { EXTRAS, REPLACES } from './extras.js';
import { MOUNTS } from './mounts.js';

export const HERO = generated.hero;
export const EXPERIENCE = generated.experience;
export const EDUCATION = generated.education;
export const SKILLS = generated.skills;
export const CONTACT = generated.contact;
export const GROUPS = generated.groups.map((g) => ({ id: g.id, ref: g.ref, name: g.name, sub: g.sub, col: g.col }));

const replaced = new Set(Object.keys(REPLACES));
const live = (p) => !p.draft;

export const PROJECTS = [
  ...generated.projects.filter((p) => !replaced.has(p.slug)),
  ...EXTRAS.filter(live)
];

export const BY_SLUG = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]));
export const BY_GROUP = Object.fromEntries(GROUPS.map((g) => [g.id, PROJECTS.filter((p) => p.group === g.id)]));
export const GROUP_COLOR = Object.fromEntries(GROUPS.map((g) => [g.id, g.col]));

export { MOUNTS };

export function mountOf(slug) {
  return MOUNTS[slug] || null;
}

// Projects that share a port and device form one mount in the world.
export function groupedMounts() {
  const out = new Map();
  for (const p of PROJECTS) {
    const m = MOUNTS[p.slug];
    if (!m) continue;
    const key = `${m.port || 'desk'}|${m.device}`;
    if (!out.has(key)) out.set(key, { id: m.device + (m.chip ? ':' + m.chip : ''), ...m, projects: [] });
    out.get(key).projects.push(p);
  }
  return [...out.values()];
}

export function unmounted() {
  return PROJECTS.filter((p) => !MOUNTS[p.slug]).map((p) => p.slug);
}
