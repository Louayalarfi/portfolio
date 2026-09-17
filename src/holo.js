// Holographic panels: project cards around a device, the intro and experience panels on the landing view,
// and the Skills and Contact panels. Every canvas is sized to its text, nothing is cut off.
import * as THREE from 'three';
import { HERO, SKILLS, EXPERIENCE, CONTACT, EDUCATION } from './content/index.js';
import { EXPERIENCE_BULLETS } from './content/extras.js';
import { rrect, wrap, halo } from './ui/utils.js';

const NO_CAP = 999;

// Draws with `paint(g, width)` on a tall scratch canvas, then crops to the height paint reports.
function fitCanvas(width, paint) {
  const scratch = document.createElement('canvas');
  scratch.width = width; scratch.height = 3000;
  const g = scratch.getContext('2d');
  const used = Math.ceil(paint(g, width));
  const c = document.createElement('canvas');
  c.width = width; c.height = Math.max(120, used);
  c.getContext('2d').drawImage(scratch, 0, 0);
  return c;
}

function texOf(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Holograms are drawn last with no depth test, so a tall card never clips into the case or the monitor.
function onTop(obj, order = 20) {
  obj.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.depthWrite = false; o.renderOrder = order; } });
  return obj;
}

function frameBox(g, w, h, accent, alpha = 0.86, radius = 18) {
  g.fillStyle = `rgba(8,14,26,${alpha})`; rrect(g, 6, 6, w - 12, h - 12, radius); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = accent; rrect(g, 6, 6, w - 12, h - 12, radius); g.stroke();
}

// Bullets for a role: the verified resume bullets when we have them, else the classic description split up.
export function bulletsFor(role) {
  const key = Object.keys(EXPERIENCE_BULLETS).find((k) => role.title.startsWith(k));
  if (key) return EXPERIENCE_BULLETS[key].bullets;
  return role.desc.split(/;\s+/).map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
}

export function buildHoloSystem(scene, camera, haloTex, loader) {
  const holoGroup = new THREE.Group();
  scene.add(holoGroup);

  let HOLO_PICK = [];

  function clearHolos() {
    HOLO_PICK = [];
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

  // A project card: header, title, spec, every bullet in full, tags, footer.
  function cardCanvas(p, idx, accent) {
    const W = 760;
    return fitCanvas(W, (g) => {
      const paint = (measureOnly) => {
        let y = 108;
        if (!measureOnly) {
          g.fillStyle = accent; rrect(g, 6, 6, W - 12, 52, 18); g.fill();
          g.fillRect(6, 30, W - 12, 28);
          g.fillStyle = '#06101c'; g.font = "700 22px 'IBM Plex Mono',monospace";
          g.fillText('0' + (idx + 1) + '  ·  ' + (p.domain || 'PROJECT').toUpperCase().slice(0, 44), 28, 40);
        }
        g.fillStyle = '#e9eefb'; g.font = "700 34px 'Chakra Petch',sans-serif";
        y = wrap(g, p.title, 30, y, W - 60, 40, NO_CAP);
        g.fillStyle = accent; g.font = "400 19px 'IBM Plex Mono',monospace";
        y = wrap(g, p.spec, 30, y + 4, W - 60, 26, NO_CAP) + 10;
        g.font = "400 19px Inter,sans-serif";
        for (const b of p.bullets) {
          g.fillStyle = accent; g.fillText('▸', 30, y);
          g.fillStyle = '#c3cce0';
          y = wrap(g, b, 54, y, W - 90, 27, NO_CAP) + 8;
        }
        y += 10;
        g.font = "400 15px 'IBM Plex Mono',monospace";
        let tx = 30;
        for (const t of p.tags) {
          const w = g.measureText(t).width + 22;
          if (tx + w > W - 30) { tx = 30; y += 36; }
          g.fillStyle = 'rgba(255,255,255,.05)'; rrect(g, tx, y - 20, w, 28, 7); g.fill();
          g.strokeStyle = 'rgba(120,150,200,.25)'; g.lineWidth = 1; rrect(g, tx, y - 20, w, 28, 7); g.stroke();
          g.fillStyle = '#90a0c0'; g.fillText(t, tx + 11, y);
          tx += w + 8;
        }
        y += 40;
        const foot = p.imgs?.length ? `▣ CLICK TO VIEW ${p.imgs.length} IMAGE${p.imgs.length === 1 ? '' : 'S'}` : (p.links?.length ? '▸ CLICK TO OPEN ' + p.links[0].label.toUpperCase() : '');
        if (foot) { g.fillStyle = accent; g.font = "600 15px 'IBM Plex Mono',monospace"; g.fillText(foot, 30, y); y += 12; }
        return y + 22;
      };
      const h = paint(true);
      g.clearRect(0, 0, W, 3000);
      frameBox(g, W, h, accent);
      paint(false);
      return h;
    });
  }

  // viewTheta lets the caller build the cards for where the camera is going, not where it is now.
  function buildProjectHolos(list, center, accent, scale = 1, viewTheta = null) {
    clearHolos();
    const col = new THREE.Color(accent);
    const dirToCam = viewTheta === null
      ? new THREE.Vector3().subVectors(camera.position, center).normalize()
      : new THREE.Vector3(Math.sin(viewTheta), 0.35, Math.cos(viewTheta)).normalize();
    const right = viewTheta === null
      ? new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize()
      : new THREE.Vector3(Math.cos(viewTheta), 0, -Math.sin(viewTheta));
    const n = list.length, cw = 1.18 * scale, gap = 0.18 * scale;
    const canvases = list.map((p, i) => cardCanvas(p, i, accent));
    const heights = canvases.map((c) => cw * c.height / c.width);
    // Cards rest on a common base line just above the device, so tall ones grow upward.
    const base = center.clone().add(dirToCam.multiplyScalar(0.5 * scale)).add(new THREE.Vector3(0, 0.55 * scale, 0));
    const spacing = cw + gap;

    list.forEach((p, i) => {
      const ch = heights[i];
      const g = new THREE.Group();
      g.position.copy(base).add(right.clone().multiplyScalar((i - (n - 1) / 2) * spacing)).add(new THREE.Vector3(0, ch / 2, 0));
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshBasicMaterial({ map: texOf(canvases[i]), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      panel.userData = { idx: i, project: p };
      g.add(panel); HOLO_PICK.push(panel);
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(cw + 0.06, ch + 0.06), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      fr.position.z = -0.01; g.add(fr);
      const hb = halo(THREE, haloTex, accent, 0.26 * scale, 0, -ch / 2, 0.02, g);
      hb.material.opacity = 0.5;
      g.userData.idx = i; g.userData.target = 1;
      holoGroup.add(onTop(g));
    });
    return Math.max(...heights);
  }

  function infoCanvas(kind) {
    const W = 900;
    return fitCanvas(W, (g) => {
      const paint = (measureOnly) => {
        let y = 110;
        if (!measureOnly) {
          g.fillStyle = '#c8893f'; rrect(g, 6, 6, W - 12, 56, 20); g.fill(); g.fillRect(6, 34, W - 12, 28);
          g.fillStyle = '#06101c'; g.font = "700 24px 'IBM Plex Mono',monospace";
          g.fillText(kind === 'skills' ? 'SKILLS' : 'CONTACT', 30, 44);
        }
        if (kind === 'skills') {
          SKILLS.forEach(({ group, tags }) => {
            g.fillStyle = '#4fd8e0'; g.font = "600 20px 'IBM Plex Mono',monospace"; g.fillText(group.toUpperCase(), 30, y);
            y += 36; g.font = "400 17px 'IBM Plex Mono',monospace";
            let tx = 30;
            tags.forEach((s) => {
              const w = g.measureText(s).width + 22;
              if (tx + w > W - 40) { tx = 30; y += 38; }
              g.fillStyle = 'rgba(255,255,255,.05)'; rrect(g, tx, y - 22, w, 30, 7); g.fill();
              g.strokeStyle = 'rgba(120,150,200,.25)'; g.lineWidth = 1; rrect(g, tx, y - 22, w, 30, 7); g.stroke();
              g.fillStyle = '#b8c4dc'; g.fillText(s, tx + 11, y);
              tx += w + 8;
            });
            y += 54;
          });
        } else {
          y = 130;
          CONTACT.forEach((p) => {
            g.fillStyle = 'rgba(255,255,255,.04)'; rrect(g, 30, y - 34, W - 60, 64, 12); g.fill();
            g.strokeStyle = 'rgba(212,162,86,.4)'; g.lineWidth = 1.5; rrect(g, 30, y - 34, W - 60, 64, 12); g.stroke();
            g.fillStyle = '#d4a256'; g.font = "600 16px 'IBM Plex Mono',monospace"; g.fillText(p.label, 52, y + 4);
            g.fillStyle = '#e9eefb'; g.font = "500 24px Inter,sans-serif"; g.fillText(p.value, 200, y + 6);
            y += 88;
          });
          g.fillStyle = '#7286a8'; g.font = "400 15px 'IBM Plex Mono',monospace";
          y = wrap(g, EDUCATION.certs.map((c) => c.name).join(' · '), 34, y + 6, W - 68, 22, NO_CAP);
        }
        return y + 20;
      };
      const h = paint(true);
      g.clearRect(0, 0, W, 3000);
      frameBox(g, W, h, '#c8893f', 0.9, 20);
      paint(false);
      return h;
    });
  }

  function buildInfoHolo(kind, orbitTo) {
    clearHolos();
    const c = infoCanvas(kind);
    const w = 4.2, h = w * c.height / c.width;
    const g = new THREE.Group();
    g.position.set(0.5, 1.6 + h / 2, 1.4);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texOf(c), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    g.add(panel);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.08, h + 0.08), new THREE.MeshBasicMaterial({ color: 0xc8893f, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    fr.position.z = -0.01; g.add(fr);
    halo(THREE, haloTex, 0xc8893f, 0.6, 0, h / 2, 0.02, g);
    halo(THREE, haloTex, 0xc8893f, 0.6, 0, -h / 2, 0.02, g);
    holoGroup.add(onTop(g));
    orbitTo({ target: new THREE.Vector3(0.5, 1.6 + h / 2, 0.2), r: Math.max(6.2, h * 1.9), theta: 0.1, phi: 1.02 });
  }

  // Landing view: the intro panel and the experience timeline, both sized to their text.
  const introGroup = new THREE.Group();
  scene.add(introGroup);
  let INTRO_PICK = [];
  let expRows = [];
  let introHeight = 2;

  function introCanvas() {
    const W = 1400;
    return fitCanvas(W, (g) => {
      const paint = () => {
        g.fillStyle = '#c8893f'; g.font = "600 30px 'IBM Plex Mono',monospace"; g.fillText('// who_am_i.init()', 60, 90);
        g.fillStyle = '#e9eefb'; g.font = "700 150px 'Chakra Petch',sans-serif"; g.fillText(HERO.name.toUpperCase(), 56, 236);
        g.fillStyle = '#4fd8e0'; g.font = "500 36px 'IBM Plex Mono',monospace"; g.fillText(HERO.title.toUpperCase() + '  ·  B.ENG, UNIVERSITY OF GUELPH, 2026', 60, 300);
        let y = 372;
        g.fillStyle = '#c3cce0'; g.font = "400 30px Inter,sans-serif";
        for (const para of HERO.overview.slice(1)) y = wrap(g, para, 60, y, W - 120, 41, NO_CAP) + 16;
        y += 20;
        let x = 60;
        HERO.stats.forEach((s) => {
          g.fillStyle = 'rgba(79,216,224,.08)'; rrect(g, x, y, 300, 150, 16); g.fill();
          g.strokeStyle = 'rgba(79,216,224,.4)'; g.lineWidth = 1.5; rrect(g, x, y, 300, 150, 16); g.stroke();
          g.fillStyle = '#4fd8e0'; g.font = "700 64px 'Chakra Petch',sans-serif"; g.fillText(s.value, x + 28, y + 80);
          g.fillStyle = '#7286a8'; g.font = "400 24px 'IBM Plex Mono',monospace"; g.fillText(s.label, x + 30, y + 124);
          x += 330;
        });
        return y + 200;
      };
      const h = paint();
      g.clearRect(0, 0, W, 3000);
      g.fillStyle = 'rgba(7,13,24,.62)'; rrect(g, 8, 8, W - 16, h - 16, 26); g.fill();
      g.lineWidth = 2.5; g.strokeStyle = 'rgba(79,216,224,.55)'; rrect(g, 8, 8, W - 16, h - 16, 26); g.stroke();
      paint();
      return h;
    });
  }

  function experienceCanvas() {
    const W = 1000;
    return fitCanvas(W, (g) => {
      const rows = [];
      const paint = (measureOnly) => {
        g.fillStyle = '#c8893f'; g.font = "600 30px 'IBM Plex Mono',monospace"; g.fillText('// experience.log', 52, 84);
        g.fillStyle = '#e9eefb'; g.font = "700 56px 'Chakra Petch',sans-serif"; g.fillText('EXPERIENCE', 50, 148);
        g.fillStyle = '#7286a8'; g.font = "400 22px 'IBM Plex Mono',monospace"; g.fillText('click a role for the details', 52, 186);
        let y = 250;
        const rail = 66, top = y - 30;
        EXPERIENCE.forEach((r, i) => {
          const rowTop = y - 40;
          if (!measureOnly) {
            g.fillStyle = 'rgba(255,255,255,.035)'; rrect(g, 40, rowTop, W - 80, 104, 14); g.fill();
            g.strokeStyle = 'rgba(200,137,63,.28)'; g.lineWidth = 1; rrect(g, 40, rowTop, W - 80, 104, 14); g.stroke();
            g.fillStyle = i === 0 ? '#a7d96a' : '#c8893f';
            g.beginPath(); g.arc(rail, y - 6, 8, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#c8893f'; g.font = "500 20px 'IBM Plex Mono',monospace"; g.fillText(r.dates.toUpperCase(), 96, y - 16);
            g.fillStyle = '#e9eefb'; g.font = "700 30px 'Chakra Petch',sans-serif"; g.fillText(r.title, 96, y + 18);
            g.fillStyle = '#7fb1c9'; g.font = "400 21px 'IBM Plex Mono',monospace"; g.fillText(r.org, 96, y + 48);
            g.fillStyle = '#c8893f'; g.font = "700 34px 'IBM Plex Mono',monospace"; g.fillText('›', W - 84, y + 22);
          }
          rows.push({ top: rowTop, bottom: rowTop + 104, role: r });
          y += 120;
        });
        if (!measureOnly) {
          g.strokeStyle = 'rgba(200,137,63,.3)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(rail, top); g.lineTo(rail, y - 60); g.stroke();
        }
        return y + 10;
      };
      const h = paint(true);
      rows.length = 0;
      g.clearRect(0, 0, W, 3000);
      g.fillStyle = 'rgba(7,13,24,.68)'; rrect(g, 8, 8, W - 16, h - 16, 26); g.fill();
      g.lineWidth = 2.5; g.strokeStyle = 'rgba(200,137,63,.6)'; rrect(g, 8, 8, W - 16, h - 16, 26); g.stroke();
      paint(false);
      expRows = rows.map((r) => ({ ...r, h }));
      return h;
    });
  }

  function buildIntro() {
    while (introGroup.children.length) introGroup.remove(introGroup.children[0]);
    INTRO_PICK = [];
    const ic = introCanvas(), ec = experienceCanvas();
    const iw = 4.3, ih = iw * ic.height / ic.width;
    const ew = 3.1, eh = ew * ec.height / ec.width;
    const H = Math.max(ih, eh);
    const gapX = 0.35;
    const ix = -(ew + gapX) / 2, ex = (iw + gapX) / 2;

    const ip = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshBasicMaterial({ map: texOf(ic), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    ip.position.set(ix, (ih - H) / 2, 0); introGroup.add(ip);
    const ifr = new THREE.Mesh(new THREE.PlaneGeometry(iw + 0.1, ih + 0.1), new THREE.MeshBasicMaterial({ color: 0x4fd8e0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ifr.position.set(ix, (ih - H) / 2, -0.01); introGroup.add(ifr);
    halo(THREE, haloTex, 0x4fd8e0, 0.8, ix - iw / 2, (ih - H) / 2 + ih / 2, 0.02, introGroup);

    const ep = new THREE.Mesh(new THREE.PlaneGeometry(ew, eh), new THREE.MeshBasicMaterial({ map: texOf(ec), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    ep.position.set(ex, (eh - H) / 2, 0); ep.userData.experience = true; introGroup.add(ep); INTRO_PICK.push(ep);
    const efr = new THREE.Mesh(new THREE.PlaneGeometry(ew + 0.1, eh + 0.1), new THREE.MeshBasicMaterial({ color: 0xc8893f, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    efr.position.set(ex, (eh - H) / 2, -0.01); introGroup.add(efr);
    halo(THREE, haloTex, 0xc8893f, 0.7, ex + ew / 2, (eh - H) / 2 + eh / 2, 0.02, introGroup);

    onTop(introGroup, 19);
    introHeight = H;
    introGroup.position.set(1.1, 3.9 + H / 2, -1.6);
  }
  buildIntro();
  if (document.fonts?.ready) document.fonts.ready.then(buildIntro);

  function handleIntroPick(hit) {
    if (!hit.object.userData.experience || !hit.uv) return false;
    const y = (1 - hit.uv.y) * (expRows[0]?.h || 1);
    const row = expRows.find((r) => y >= r.top && y <= r.bottom);
    if (!row) return false;
    const r = row.role;
    window.__openDetail?.({ title: r.title, sub: r.org, dates: r.dates, bullets: bulletsFor(r), tags: r.tags });
    return true;
  }

  function animateHolos(time) {
    holoGroup.children.forEach((g) => {
      g.quaternion.copy(camera.quaternion);
      if (g.userData.target !== undefined) g.scale.setScalar(g.scale.x + (g.userData.target - g.scale.x) * 0.12);
    });
    if (introGroup.visible) {
      introGroup.quaternion.copy(camera.quaternion);
      introGroup.position.y = 3.9 + introHeight / 2 + Math.sin(time * 0.8) * 0.06;
    }
  }

  function handleHoloPick(hit) {
    const p = hit.userData.project; if (!p) return;
    focusCard(hit.userData.idx);
    if (p.imgs?.length) window.__openGallery?.(p.imgs, p.alts || [], 0, p.title);
    else if (p.links?.length) window.open(p.links[0].url, '_blank', 'noopener');
  }

  return {
    buildProjectHolos, buildInfoHolo, clearHolos, animateHolos, handleHoloPick, handleIntroPick, focusCard, introGroup,
    get HOLO_PICK() { return HOLO_PICK; }, get INTRO_PICK() { return INTRO_PICK; }
  };
}
