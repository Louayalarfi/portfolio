// Quality tier: low runs under SwiftShader, medium on integrated GPUs, high everywhere else.
// Override with ?q=low|medium|high or localStorage.quality.

const PARAMS = new URLSearchParams(location.search);
const NAMES = ['low', 'medium', 'high'];

function stored() {
  try { return localStorage.getItem('quality'); } catch { return null; }
}

export function rendererName(renderer) {
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const name = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return String(name || '');
}

export function detectTier(renderer) {
  const forced = PARAMS.get('q') || stored();
  if (NAMES.includes(forced)) return forced;
  const s = rendererName(renderer).toLowerCase();
  if (/swiftshader|software|llvmpipe|softpipe|offscreen/.test(s)) return 'low';
  if (/intel|iris|mali|adreno|powervr|videocore|apple gpu/.test(s)) return 'medium';
  if (devicePixelRatio >= 2 && (navigator.hardwareConcurrency || 8) <= 8) return 'medium';
  return 'high';
}

export const TIERS = {
  high:   { dpr: Math.min(devicePixelRatio, 2),   shadowSize: 2048, shadowSoft: true,  passes: ['ssao', 'bloom', 'bokeh'], hdri: 'room_2k', hdriBackground: true,  glassTransmission: true, plasmaOctaves: 5, fansCastShadow: true },
  medium: { dpr: Math.min(devicePixelRatio, 1.5), shadowSize: 1024, shadowSoft: false, passes: ['bloom', 'bokeh'],         hdri: 'room_1k', hdriBackground: false, glassTransmission: false, plasmaOctaves: 4, fansCastShadow: true },
  low:    { dpr: 1,                               shadowSize: 512,  shadowSoft: false, passes: [],                          hdri: 'room_1k', hdriBackground: false, glassTransmission: false, plasmaOctaves: 3, fansCastShadow: false }
};

export function getQuality(renderer) {
  const tier = detectTier(renderer);
  return { tier, gpu: rendererName(renderer), ...TIERS[tier] };
}

export function setQuality(tier) {
  if (!NAMES.includes(tier)) return;
  try { localStorage.setItem('quality', tier); } catch {}
  const url = new URL(location.href);
  url.searchParams.delete('q');
  location.replace(url.toString());
}

export function nextTier(tier) {
  return NAMES[(NAMES.indexOf(tier) + 1) % NAMES.length];
}
