// Holographic panel system:
//   - Floating project cards (one per project in the clicked region)
//   - Info panels: Pinout (skills), Changelog (experience), I/O (contact)
//   - Floating intro hologram (home view "who am I")
//
// Usage:
//   const holoSys = buildHoloSystem(THREE, scene, camera, components, haloTex);
//   holoSys.buildProjectHolos(region);  // show project cards for a region
//   holoSys.buildInfoHolo(kind);        // 'skills' | 'experience' | 'contact'
//   holoSys.clearHolos();
//   holoSys.animateHolos(time, camera);
//   holoSys.introGroup                 // show/hide this
//   holoSys.HOLO_PICK                  // live array for raycasting

import * as THREE from 'three';
import { PROJECTS, SKILLS, EXPERIENCE, CONTACT, STATS, IMG_BASE, REGIONS } from './config.js';
import { rrect, wrap, halo } from './ui/utils.js';

export function buildHoloSystem(scene, camera, components, haloTex, loader) {
  const texLoader = new THREE.TextureLoader(loader?.manager);

  const holoGroup = new THREE.Group();
  scene.add(holoGroup);

  let HOLO_PICK = [];
  let focusIdx = -1;

  function focusCard(region, idx) {
    focusIdx = idx;
    holoGroup.children.forEach((g) => { if (g.userData.idx !== undefined) g.userData.target = g.userData.idx === idx ? 1.14 : 0.92; });
  }

  function clearHolos() {
    HOLO_PICK = [];
    while (holoGroup.children.length) {
      const c = holoGroup.children.pop();
      c.traverse(o => {
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
        if (o.geometry) o.geometry.dispose();
      });
      holoGroup.remove(c);
    }
  }

  // ---- project card canvas ----
  function cardCanvas(p, idx, accent) {
    const c = document.createElement('canvas');
    c.width = 760; c.height = 480;
    const g = c.getContext('2d');

    g.clearRect(0, 0, 760, 480);
    g.fillStyle = 'rgba(8,14,26,.86)';
    rrect(g, 6, 6, 748, 468, 18); g.fill();

    g.lineWidth = 2.5; g.strokeStyle = accent;
    rrect(g, 6, 6, 748, 468, 18); g.stroke();

    // header bar
    g.fillStyle = accent;
    rrect(g, 6, 6, 748, 52, 18); g.fill();
    g.fillStyle = '#06101c';
    g.font = "700 22px 'IBM Plex Mono',monospace";
    g.fillText('0' + (idx + 1) + '  ·  PROJECT MODULE', 28, 40);

    // title
    g.fillStyle = '#e9eefb';
    g.font = "700 34px 'Chakra Petch',sans-serif";
    let yy = wrap(g, p.t, 30, 108, 700, 40, 2);

    // spec line
    g.fillStyle = accent;
    g.font = "400 19px 'IBM Plex Mono',monospace";
    yy = wrap(g, p.spec, 30, yy + 4, 700, 26, 2);

    // description
    g.fillStyle = '#aeb9d2';
    g.font = "400 19px Inter,sans-serif";
    yy = wrap(g, p.d, 30, yy + 14, 700, 28, 5);

    // tags
    g.font = "400 15px 'IBM Plex Mono',monospace";
    let tx = 30;
    const ty = 430;
    p.tags.forEach(t => {
      const w = g.measureText(t).width + 22;
      g.fillStyle = 'rgba(255,255,255,.05)';
      rrect(g, tx, ty - 20, w, 28, 7); g.fill();
      g.strokeStyle = 'rgba(120,150,200,.25)'; g.lineWidth = 1;
      rrect(g, tx, ty - 20, w, 28, 7); g.stroke();
      g.fillStyle = '#90a0c0';
      g.fillText(t, tx + 11, ty);
      tx += w + 8;
    });

    // footer CTA
    const foot = p.links.length
      ? '▸ OPEN ' + p.links[0].l.toUpperCase()
      : (p.imgs.length ? '▣ TAP TO VIEW IMAGES' : '');
    if (foot) {
      g.fillStyle = accent;
      g.font = "600 15px 'IBM Plex Mono',monospace";
      g.fillText(foot, 30, 468);
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  // ---- project hologram layout ----
  function buildProjectHolos(region) {
    clearHolos();
    const accent = REGIONS[region].color;
    const col    = new THREE.Color(accent);
    const list   = PROJECTS[region];
    const center = components[region].center;

    const dirToCam = new THREE.Vector3().subVectors(camera.position, center).normalize();
    const right    = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const up       = new THREE.Vector3(0, 1, 0);
    const base     = center.clone()
      .add(dirToCam.multiplyScalar(1.3))
      .add(up.clone().multiplyScalar(0.35));

    const n = list.length, spacing = 1.62, cw = 1.4, ch = 0.885;

    list.forEach((p, i) => {
      const g    = new THREE.Group();
      const off  = (i - (n - 1) / 2) * spacing;
      g.position.copy(base).add(right.clone().multiplyScalar(off));

      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(cw, ch),
        new THREE.MeshBasicMaterial({ map: cardCanvas(p, i, accent), transparent: true, depthWrite: false, side: THREE.DoubleSide })
      );
      panel.userData = { region, idx: i };
      g.add(panel);
      HOLO_PICK.push(panel);

      // glow frame
      const fr = new THREE.Mesh(
        new THREE.PlaneGeometry(cw + 0.06, ch + 0.06),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      fr.position.z = -0.01;
      g.add(fr);

      halo(THREE, haloTex, accent, 0.5, 0,  ch / 2, 0.02, g);
      halo(THREE, haloTex, accent, 0.5, 0, -ch / 2, 0.02, g);

      // project image plane
      if (p.imgs.length) {
        const ip = new THREE.Mesh(
          new THREE.PlaneGeometry(cw, cw * 0.52),
          new THREE.MeshBasicMaterial({ color: 0x0a121f, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
        );
        ip.position.y = ch / 2 + cw * 0.52 / 2 + 0.08;
        ip.visible = false;
        ip.userData = { region, idx: i };
        g.add(ip);
        HOLO_PICK.push(ip);

        texLoader.load(
          IMG_BASE + encodeURIComponent(p.imgs[0]),
          tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            ip.material.map = tex;
            ip.material.color.set(0xffffff);
            ip.material.opacity = 1;
            ip.material.needsUpdate = true;
            ip.visible = true;
            const frm = new THREE.Mesh(
              new THREE.PlaneGeometry(cw + 0.04, cw * 0.52 + 0.04),
              new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
            );
            frm.position.set(0, ip.position.y, -0.01);
            g.add(frm);
          },
          undefined,
          () => { ip.visible = false; }
        );
      }

      g.userData.spin = Math.random() * 6;
      g.userData.idx = i;
      g.userData.target = 1;
      holoGroup.add(g);
    });
    focusIdx = -1;
  }

  // ---- info canvas (skills / experience / contact) ----
  const CERTS = 'Lean Six Sigma Green/Yellow · CSWA Mechanical · VEX Coach · Responsible AI · $8,500 Entrance Scholarship';

  function infoCanvas(kind) {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 760;
    const g = c.getContext('2d');

    g.fillStyle = 'rgba(8,14,26,.9)';
    rrect(g, 6, 6, 888, 748, 20); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = '#c8893f';
    rrect(g, 6, 6, 888, 748, 20); g.stroke();

    // header
    g.fillStyle = '#c8893f';
    rrect(g, 6, 6, 888, 56, 20); g.fill();
    g.fillStyle = '#06101c';
    g.font = "700 24px 'IBM Plex Mono',monospace";
    g.fillText(
      kind === 'skills'     ? 'PINOUT  ·  CAPABILITY MAP'
      : kind === 'experience' ? 'CHANGELOG  ·  COMMIT HISTORY'
      :                         'I/O PORTS  ·  CONNECT',
      30, 44
    );

    if (kind === 'skills') {
      let y = 110;
      SKILLS.forEach(([grp, arr]) => {
        g.fillStyle = '#4fd8e0';
        g.font = "600 20px 'IBM Plex Mono',monospace";
        g.fillText(grp.toUpperCase(), 30, y);
        y += 14;
        g.font = "400 17px 'IBM Plex Mono',monospace";
        let tx = 30; y += 22;
        arr.forEach(s => {
          const w = g.measureText(s).width + 22;
          if (tx + w > 860) { tx = 30; y += 38; }
          g.fillStyle = 'rgba(255,255,255,.05)';
          rrect(g, tx, y - 22, w, 30, 7); g.fill();
          g.strokeStyle = 'rgba(120,150,200,.25)'; g.lineWidth = 1;
          rrect(g, tx, y - 22, w, 30, 7); g.stroke();
          g.fillStyle = '#b8c4dc'; g.fillText(s, tx + 11, y);
          tx += w + 8;
        });
        y += 54;
      });
    } else if (kind === 'experience') {
      let y = 104;
      EXPERIENCE.forEach(r => {
        g.fillStyle = '#c8893f';
        g.font = "400 15px 'IBM Plex Mono',monospace"; g.fillText(r[0], 30, y);
        g.fillStyle = '#e9eefb';
        g.font = "700 23px 'Chakra Petch',sans-serif"; g.fillText(r[1], 30, y + 28);
        g.fillStyle = '#7286a8';
        g.font = "400 16px 'IBM Plex Mono',monospace"; g.fillText(r[2], 30, y + 52);
        g.fillStyle = '#9fb0cc';
        g.font = "400 16px Inter,sans-serif";
        const ny = wrap(g, r[3], 30, y + 78, 840, 23, 3);
        y = ny + 22;
      });
    } else {
      let y = 130;
      CONTACT.forEach(p => {
        g.fillStyle = 'rgba(255,255,255,.04)';
        rrect(g, 30, y - 34, 840, 64, 12); g.fill();
        g.strokeStyle = 'rgba(212,162,86,.4)'; g.lineWidth = 1.5;
        rrect(g, 30, y - 34, 840, 64, 12); g.stroke();
        g.fillStyle = '#d4a256';
        g.font = "600 16px 'IBM Plex Mono',monospace"; g.fillText(p[0], 52, y + 4);
        g.fillStyle = '#e9eefb';
        g.font = "500 24px Inter,sans-serif"; g.fillText(p[1], 200, y + 6);
        y += 88;
      });
      g.fillStyle = '#7286a8';
      g.font = "400 15px 'IBM Plex Mono',monospace";
      wrap(g, CERTS, 34, y + 6, 840, 22, 3);
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function buildInfoHolo(kind, orbitTo) {
    clearHolos();
    const w = 4.2, h = w * 760 / 900;
    const center = new THREE.Vector3(0.5, 2.7, 1.4);
    const g = new THREE.Group();
    g.position.copy(center);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: infoCanvas(kind), transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    g.add(panel);

    const fr = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.08, h + 0.08),
      new THREE.MeshBasicMaterial({ color: 0xc8893f, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    fr.position.z = -0.01; g.add(fr);

    halo(THREE, haloTex, 0xc8893f, 0.6, 0,  h / 2, 0.02, g);
    halo(THREE, haloTex, 0xc8893f, 0.6, 0, -h / 2, 0.02, g);
    holoGroup.add(g);

    orbitTo({ target: new THREE.Vector3(0.5, 2.4, 0.2), r: 6.2, theta: 0.1, phi: 1.02 });
  }

  // ---- floating intro hologram ----
  const introGroup = new THREE.Group();
  scene.add(introGroup);

  {
    const c = document.createElement('canvas');
    c.width = 1400; c.height = 760;
    const g = c.getContext('2d');

    function drawIntro() {
      g.clearRect(0, 0, 1400, 760);
      g.fillStyle = 'rgba(7,13,24,.55)';
      rrect(g, 8, 8, 1384, 744, 26); g.fill();
      g.lineWidth = 2.5; g.strokeStyle = 'rgba(79,216,224,.55)';
      rrect(g, 8, 8, 1384, 744, 26); g.stroke();

      g.fillStyle = '#c8893f';
      g.font = "600 30px 'IBM Plex Mono',monospace";
      g.fillText('// who_am_i.init()', 60, 90);

      g.fillStyle = '#e9eefb';
      g.font = "700 150px 'Chakra Petch',sans-serif";
      g.fillText('LAUAI ALERFI', 56, 236);

      g.fillStyle = '#4fd8e0';
      g.font = "500 40px 'IBM Plex Mono',monospace";
      g.fillText('SYSTEMS ENGINEER  ·  UNIVERSITY OF GUELPH  ·  APR 2026', 60, 300);

      g.fillStyle = '#aeb9d2';
      g.font = "400 33px Inter,sans-serif";
      wrap(
        g,
        'One engineer across every layer of the stack, from transistors hand-placed in a die to FPGA fabric, embedded firmware, and the software that runs on top. Originally from Damascus, now building in Canada.',
        60, 372, 1280, 46, 3
      );

      let x = 60;
      STATS.forEach(s => {
        g.fillStyle = 'rgba(79,216,224,.08)';
        rrect(g, x, 560, 300, 150, 16); g.fill();
        g.strokeStyle = 'rgba(79,216,224,.4)'; g.lineWidth = 1.5;
        rrect(g, x, 560, 300, 150, 16); g.stroke();
        g.fillStyle = '#4fd8e0';
        g.font = "700 64px 'Chakra Petch',sans-serif"; g.fillText(s[0], x + 28, 640);
        g.fillStyle = '#7286a8';
        g.font = "400 24px 'IBM Plex Mono',monospace"; g.fillText(s[1], x + 30, 684);
        x += 330;
      });

      introTex.needsUpdate = true;
    }

    const introTex = new THREE.CanvasTexture(c);
    introTex.colorSpace = THREE.SRGBColorSpace;
    introTex.anisotropy = 4;

    const w = 6.4, h = w * 760 / 1400;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: introTex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    introGroup.add(panel);

    const fr = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.1, h + 0.1),
      new THREE.MeshBasicMaterial({ color: 0x4fd8e0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    fr.position.z = -0.01; introGroup.add(fr);

    halo(THREE, haloTex, 0x4fd8e0, 0.8, -w / 2,  h / 2, 0.02, introGroup);
    halo(THREE, haloTex, 0x4fd8e0, 0.8,  w / 2, -h / 2, 0.02, introGroup);

    introGroup.position.set(0.4, 5.0, 0.8);

    // draw after fonts are ready
    if (document.fonts?.ready) {
      document.fonts.ready.then(drawIntro);
    } else {
      drawIntro();
    }
  }

  // ---- animation ----
  function animateHolos(time) {
    holoGroup.children.forEach(g => {
      g.quaternion.copy(camera.quaternion);
      g.position.y += Math.sin(time * 1.5 + g.userData.spin) * 0.0008;
      if (g.userData.target !== undefined) {
        const s = g.scale.x + (g.userData.target - g.scale.x) * 0.12;
        g.scale.setScalar(s);
      }
    });
    if (introGroup.visible) {
      introGroup.quaternion.copy(camera.quaternion);
      introGroup.position.y = 5.0 + Math.sin(time * 0.8) * 0.08;
    }
  }

  // ---- click on holo card ----
  function handleHoloPick(hit) {
    const u = hit.userData;
    const p = PROJECTS[u.region][u.idx];
    if (p.links.length) {
      const u = p.links[0].u;
      window.open(/^https?:/.test(u) ? u : IMG_BASE + encodeURIComponent(u), '_blank', 'noopener');
    } else if (p.imgs.length) {
      const lb  = document.getElementById('lightbox');
      const img = document.getElementById('lbimg');
      if (lb && img) { img.src = IMG_BASE + encodeURIComponent(p.imgs[0]); lb.classList.add('open'); }
    }
  }

  return { buildProjectHolos, buildInfoHolo, clearHolos, animateHolos, handleHoloPick, focusCard, introGroup, get HOLO_PICK() { return HOLO_PICK; } };
}
