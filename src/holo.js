// Holographic panels: project cards around a device, info panels (Pinout, Changelog, I/O), and the intro.
import * as THREE from 'three';
import { HERO, SKILLS, EXPERIENCE, CONTACT, EDUCATION } from './content/index.js';
import { rrect, wrap, halo } from './ui/utils.js';

export function buildHoloSystem(scene, camera, haloTex, loader) {
  const texLoader = new THREE.TextureLoader(loader?.manager);
  const holoGroup = new THREE.Group();
  scene.add(holoGroup);

  let HOLO_PICK = [];
  let current = [];

  function clearHolos() {
    HOLO_PICK = []; current = [];
    while (holoGroup.children.length) {
      const c = holoGroup.children.pop();
      c.traverse((o) => {
        if (o.material) { if (o.material.map && o.material.map !== haloTex) o.material.map.dispose(); o.material.dispose(); }
        if (o.geometry) o.geometry.dispose();
      });
      holoGroup.remove(c);
    }
  }

  function focusCard(idx) {
    holoGroup.children.forEach((g) => { if (g.userData.idx !== undefined) g.userData.target = g.userData.idx === idx ? 1.14 : 0.92; });
  }

  function cardCanvas(p, idx, accent) {
    const c = document.createElement('canvas');
    c.width = 760; c.height = 480;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(8,14,26,.86)'; rrect(g, 6, 6, 748, 468, 18); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = accent; rrect(g, 6, 6, 748, 468, 18); g.stroke();
    g.fillStyle = accent; rrect(g, 6, 6, 748, 52, 18); g.fill();
    g.fillStyle = '#06101c'; g.font = "700 22px 'IBM Plex Mono',monospace";
    g.fillText('0' + (idx + 1) + '  ·  ' + (p.domain || 'PROJECT').toUpperCase().slice(0, 40), 28, 40);
    g.fillStyle = '#e9eefb'; g.font = "700 34px 'Chakra Petch',sans-serif";
    let yy = wrap(g, p.title, 30, 108, 700, 40, 2);
    g.fillStyle = accent; g.font = "400 19px 'IBM Plex Mono',monospace";
    yy = wrap(g, p.spec, 30, yy + 4, 700, 26, 2);
    g.fillStyle = '#aeb9d2'; g.font = "400 19px Inter,sans-serif";
    yy = wrap(g, p.bullets.slice(0, 2).join('. '), 30, yy + 14, 700, 28, 5);
    g.font = "400 15px 'IBM Plex Mono',monospace";
    let tx = 30; const ty = 430;
    p.tags.slice(0, 6).forEach((t) => {
      const w = g.measureText(t).width + 22;
      if (tx + w > 730) return;
      g.fillStyle = 'rgba(255,255,255,.05)'; rrect(g, tx, ty - 20, w, 28, 7); g.fill();
      g.strokeStyle = 'rgba(120,150,200,.25)'; g.lineWidth = 1; rrect(g, tx, ty - 20, w, 28, 7); g.stroke();
      g.fillStyle = '#90a0c0'; g.fillText(t, tx + 11, ty);
      tx += w + 8;
    });
    const foot = p.links?.length ? '▸ OPEN ' + p.links[0].label.toUpperCase() : (p.imgs?.length ? '▣ TAP TO VIEW IMAGES' : '');
    if (foot) { g.fillStyle = accent; g.font = "600 15px 'IBM Plex Mono',monospace"; g.fillText(foot, 30, 468); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  function buildProjectHolos(list, center, accent, scale = 1) {
    clearHolos();
    current = list;
    const col = new THREE.Color(accent);
    const dirToCam = new THREE.Vector3().subVectors(camera.position, center).normalize();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const base = center.clone().add(dirToCam.multiplyScalar(0.45 * scale)).add(new THREE.Vector3(0, 0.95 * scale, 0));
    const n = list.length, spacing = 1.28 * scale, cw = 1.12 * scale, ch = 0.708 * scale;

    list.forEach((p, i) => {
      const g = new THREE.Group();
      g.position.copy(base).add(right.clone().multiplyScalar((i - (n - 1) / 2) * spacing));
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshBasicMaterial({ map: cardCanvas(p, i, accent), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      panel.userData = { idx: i, project: p };
      g.add(panel); HOLO_PICK.push(panel);
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(cw + 0.06, ch + 0.06), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      fr.position.z = -0.01; g.add(fr);
      const hb = halo(THREE, haloTex, accent, 0.26 * scale, 0, -ch / 2, 0.02, g);
      hb.material.opacity = 0.5;

      if (p.imgs?.length) {
        const ip = new THREE.Mesh(new THREE.PlaneGeometry(cw, cw * 0.52), new THREE.MeshBasicMaterial({ color: 0x0a121f, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        ip.position.y = ch / 2 + cw * 0.52 / 2 + 0.08; ip.visible = false;
        ip.userData = { idx: i, project: p };
        g.add(ip); HOLO_PICK.push(ip);
        texLoader.load(p.imgs[0], (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          ip.material.map = tex; ip.material.color.set(0xffffff); ip.material.opacity = 1; ip.material.needsUpdate = true; ip.visible = true;
          const frm = new THREE.Mesh(new THREE.PlaneGeometry(cw + 0.04, cw * 0.52 + 0.04), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
          frm.position.set(0, ip.position.y, -0.01); g.add(frm);
        }, undefined, () => { ip.visible = false; });
      }
      g.userData.spin = Math.random() * 6; g.userData.idx = i; g.userData.target = 1;
      holoGroup.add(g);
    });
  }

  function infoCanvas(kind) {
    const c = document.createElement('canvas'); c.width = 900; c.height = 760;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(8,14,26,.9)'; rrect(g, 6, 6, 888, 748, 20); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = '#c8893f'; rrect(g, 6, 6, 888, 748, 20); g.stroke();
    g.fillStyle = '#c8893f'; rrect(g, 6, 6, 888, 56, 20); g.fill();
    g.fillStyle = '#06101c'; g.font = "700 24px 'IBM Plex Mono',monospace";
    g.fillText(kind === 'skills' ? 'PINOUT  ·  CAPABILITY MAP' : kind === 'experience' ? 'CHANGELOG  ·  COMMIT HISTORY' : 'I/O PORTS  ·  CONNECT', 30, 44);

    if (kind === 'skills') {
      let y = 110;
      SKILLS.forEach(({ group, tags }) => {
        g.fillStyle = '#4fd8e0'; g.font = "600 20px 'IBM Plex Mono',monospace"; g.fillText(group.toUpperCase(), 30, y);
        y += 14; g.font = "400 17px 'IBM Plex Mono',monospace";
        let tx = 30; y += 22;
        tags.forEach((s) => {
          const w = g.measureText(s).width + 22;
          if (tx + w > 860) { tx = 30; y += 38; }
          g.fillStyle = 'rgba(255,255,255,.05)'; rrect(g, tx, y - 22, w, 30, 7); g.fill();
          g.strokeStyle = 'rgba(120,150,200,.25)'; g.lineWidth = 1; rrect(g, tx, y - 22, w, 30, 7); g.stroke();
          g.fillStyle = '#b8c4dc'; g.fillText(s, tx + 11, y);
          tx += w + 8;
        });
        y += 54;
      });
    } else if (kind === 'experience') {
      let y = 104;
      EXPERIENCE.forEach((r) => {
        if (y > 700) return;
        g.fillStyle = '#c8893f'; g.font = "400 15px 'IBM Plex Mono',monospace"; g.fillText(r.dates, 30, y);
        g.fillStyle = '#e9eefb'; g.font = "700 23px 'Chakra Petch',sans-serif"; g.fillText(r.title, 30, y + 28);
        g.fillStyle = '#7286a8'; g.font = "400 16px 'IBM Plex Mono',monospace"; g.fillText(r.org, 30, y + 52);
        g.fillStyle = '#9fb0cc'; g.font = "400 16px Inter,sans-serif";
        y = wrap(g, r.desc, 30, y + 78, 840, 23, 2) + 18;
      });
    } else {
      let y = 130;
      CONTACT.forEach((p) => {
        g.fillStyle = 'rgba(255,255,255,.04)'; rrect(g, 30, y - 34, 840, 64, 12); g.fill();
        g.strokeStyle = 'rgba(212,162,86,.4)'; g.lineWidth = 1.5; rrect(g, 30, y - 34, 840, 64, 12); g.stroke();
        g.fillStyle = '#d4a256'; g.font = "600 16px 'IBM Plex Mono',monospace"; g.fillText(p.label, 52, y + 4);
        g.fillStyle = '#e9eefb'; g.font = "500 24px Inter,sans-serif"; g.fillText(p.value, 200, y + 6);
        y += 88;
      });
      g.fillStyle = '#7286a8'; g.font = "400 15px 'IBM Plex Mono',monospace";
      wrap(g, EDUCATION.certs.map((c) => c.name).join(' · '), 34, y + 6, 840, 22, 3);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  function buildInfoHolo(kind, orbitTo) {
    clearHolos();
    const w = 4.2, h = w * 760 / 900;
    const g = new THREE.Group();
    g.position.set(0.5, 2.7, 1.4);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: infoCanvas(kind), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    g.add(panel);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.08, h + 0.08), new THREE.MeshBasicMaterial({ color: 0xc8893f, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    fr.position.z = -0.01; g.add(fr);
    halo(THREE, haloTex, 0xc8893f, 0.6, 0, h / 2, 0.02, g);
    halo(THREE, haloTex, 0xc8893f, 0.6, 0, -h / 2, 0.02, g);
    holoGroup.add(g);
    orbitTo({ target: new THREE.Vector3(0.5, 2.4, 0.2), r: 6.2, theta: 0.1, phi: 1.02 });
  }

  // Intro hologram.
  const introGroup = new THREE.Group();
  scene.add(introGroup);
  {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 760;
    const g = c.getContext('2d');
    const introTex = new THREE.CanvasTexture(c); introTex.colorSpace = THREE.SRGBColorSpace; introTex.anisotropy = 4;
    function drawIntro() {
      g.clearRect(0, 0, 1400, 760);
      g.fillStyle = 'rgba(7,13,24,.55)'; rrect(g, 8, 8, 1384, 744, 26); g.fill();
      g.lineWidth = 2.5; g.strokeStyle = 'rgba(79,216,224,.55)'; rrect(g, 8, 8, 1384, 744, 26); g.stroke();
      g.fillStyle = '#c8893f'; g.font = "600 30px 'IBM Plex Mono',monospace"; g.fillText('// who_am_i.init()', 60, 90);
      g.fillStyle = '#e9eefb'; g.font = "700 150px 'Chakra Petch',sans-serif"; g.fillText(HERO.name.toUpperCase(), 56, 236);
      g.fillStyle = '#4fd8e0'; g.font = "500 36px 'IBM Plex Mono',monospace"; g.fillText(HERO.title.toUpperCase() + '  ·  B.ENG, UNIVERSITY OF GUELPH, 2026', 60, 300);
      g.fillStyle = '#aeb9d2'; g.font = "400 33px Inter,sans-serif";
      wrap(g, HERO.overview[1] || HERO.overview[0], 60, 372, 1280, 46, 3);
      let x = 60;
      HERO.stats.forEach((s) => {
        g.fillStyle = 'rgba(79,216,224,.08)'; rrect(g, x, 560, 300, 150, 16); g.fill();
        g.strokeStyle = 'rgba(79,216,224,.4)'; g.lineWidth = 1.5; rrect(g, x, 560, 300, 150, 16); g.stroke();
        g.fillStyle = '#4fd8e0'; g.font = "700 64px 'Chakra Petch',sans-serif"; g.fillText(s.value, x + 28, 640);
        g.fillStyle = '#7286a8'; g.font = "400 24px 'IBM Plex Mono',monospace"; g.fillText(s.label, x + 30, 684);
        x += 330;
      });
      introTex.needsUpdate = true;
    }
    const w = 5.2, h = w * 760 / 1400;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: introTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    introGroup.add(panel);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.1, h + 0.1), new THREE.MeshBasicMaterial({ color: 0x4fd8e0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    fr.position.z = -0.01; introGroup.add(fr);
    halo(THREE, haloTex, 0x4fd8e0, 0.8, -w / 2, h / 2, 0.02, introGroup);
    halo(THREE, haloTex, 0x4fd8e0, 0.8, w / 2, -h / 2, 0.02, introGroup);
    introGroup.position.set(1.4, 4.9, -1.2);
    drawIntro();
    if (document.fonts?.ready) document.fonts.ready.then(drawIntro);
  }

  function animateHolos(time) {
    holoGroup.children.forEach((g) => {
      g.quaternion.copy(camera.quaternion);
      g.position.y += Math.sin(time * 1.5 + g.userData.spin) * 0.0008;
      if (g.userData.target !== undefined) g.scale.setScalar(g.scale.x + (g.userData.target - g.scale.x) * 0.12);
    });
    if (introGroup.visible) {
      introGroup.quaternion.copy(camera.quaternion);
      introGroup.position.y = 4.9 + Math.sin(time * 0.8) * 0.08;
    }
  }

  function handleHoloPick(hit) {
    const p = hit.userData.project; if (!p) return;
    focusCard(hit.userData.idx);
    if (p.links?.length) window.open(p.links[0].url, '_blank', 'noopener');
    else if (p.imgs?.length) window.__openImg?.(p.imgs[0]);
  }

  return { buildProjectHolos, buildInfoHolo, clearHolos, animateHolos, handleHoloPick, focusCard, introGroup, get HOLO_PICK() { return HOLO_PICK; } };
}
