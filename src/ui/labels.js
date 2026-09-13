// A single DOM label that follows the hovered mount, projected from world space each frame.
import * as THREE from 'three';

export function createLabels(camera) {
  const el = document.createElement('div');
  el.className = 'mount-label';
  el.innerHTML = '<b></b><small></small>';
  document.body.appendChild(el);
  const title = el.querySelector('b'), sub = el.querySelector('small');
  const pos = new THREE.Vector3();
  let target = null;

  function show(mount, worldPos) {
    if (target?.mount === mount) return;
    target = { mount, pos: worldPos.clone() };
    title.textContent = mount.label;
    const n = mount.projects.length;
    sub.textContent = `${mount.port ? mount.portLabel + ' · ' : ''}${n} project${n === 1 ? '' : 's'}`;
    el.style.setProperty('--accent', mount.accent);
    el.classList.add('on');
  }

  function hide() { target = null; el.classList.remove('on'); }

  function tick() {
    if (!target) return;
    pos.copy(target.pos).project(camera);
    if (pos.z > 1) { el.style.opacity = '0'; return; }
    el.style.opacity = '';
    el.style.transform = `translate(${((pos.x + 1) / 2 * innerWidth).toFixed(0)}px, ${((1 - pos.y) / 2 * innerHeight).toFixed(0)}px)`;
  }

  return { show, hide, tick, get current() { return target?.mount || null; } };
}
