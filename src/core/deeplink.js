// URL state for screenshots and sharing.
//   ?shot=desk                  overview, boot skipped
//   ?shot=dive:<mount>:<t>      frozen mid dive at t in [0, 1]
//   ?shot=board:<mount>         arrived at a device
//   ?shot=die:<chip>            inside the die
//   ?noboot=1                   skip the boot screen only
//   ?3d=1                       bypass the phone and WebGL2 gate

const PARAMS = new URLSearchParams(location.search);

export function parseDeepLink() {
  const shot = PARAMS.get('shot');
  if (!shot) return null;
  const [kind, id, t] = shot.split(':');
  return { kind, id: id || null, t: t !== undefined ? Math.max(0, Math.min(1, parseFloat(t))) : null, raw: shot };
}

export const DEEP_LINK = parseDeepLink();
export const SKIP_BOOT = !!DEEP_LINK || PARAMS.has('noboot');
export const FORCE_3D = PARAMS.get('3d') === '1';

export function linkFor(state) {
  const url = new URL(location.href);
  url.searchParams.delete('shot');
  if (state) url.searchParams.set('shot', state);
  return url.toString();
}
