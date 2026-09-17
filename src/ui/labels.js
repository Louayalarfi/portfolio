// Always on tags over every clickable device, projected from world space each frame.
// They are the site's affordance: a glowing pill that says what the thing is and how many projects it holds.
import * as THREE from 'three';

export function createTags(camera, mounts, onPick) {
  const root = document.createElement('div');
  root.className = 'tags';
  document.body.appendChild(root);

  const items = Object.values(mounts).map((mount) => {
    const el = document.createElement('button');
    el.className = 'tag';
    el.type = 'button';
    const n = mount.projects.length;
    const what = mount.kind === 'monitor' ? 'Screen' : mount.kind === 'die' ? 'CPU' : mount.label;
    el.innerHTML = `<i></i><b>${what}</b><small>${n} project${n === 1 ? '' : 's'}</small>`;
    el.style.setProperty('--accent', mount.accent);
    el.addEventListener('click', (e) => { e.stopPropagation(); onPick(mount); });
    root.appendChild(el);
    const lift = mount.kind === 'die' ? 0.15 : mount.kind === 'monitor' ? 1.1 : 0.45;
    return { mount, el, anchor: () => mount.center.clone().add(new THREE.Vector3(0, lift, 0)) };
  });

  let visible = true;
  const pos = new THREE.Vector3();

  function setVisible(v) { visible = v; root.classList.toggle('hidden', !v); }

  function tick() {
    if (!visible) return;
    for (const it of items) {
      pos.copy(it.anchor()).project(camera);
      const behind = pos.z > 1;
      const x = (pos.x + 1) / 2 * innerWidth, y = (1 - pos.y) / 2 * innerHeight;
      const off = behind || x < -80 || x > innerWidth + 80 || y < 40 || y > innerHeight + 40;
      it.el.style.opacity = off ? '0' : '';
      it.el.style.pointerEvents = off ? 'none' : '';
      if (!off) it.el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    }
  }

  return { setVisible, tick, root };
}
