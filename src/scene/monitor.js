// Canvas-driven monitor screen.
// Renders a terminal home view or a software-projects pane onto a CanvasTexture
// mapped onto the physical monitor mesh in the scene.
//
// Usage:
//   const mon = buildMonitor(THREE, scene);
//   // mode switch:
//   mon.setMode('software');  // 'home' | 'software'
//   // in render loop (blink cursor):
//   mon.tick(time);

import * as THREE from 'three';
import { PROJECTS } from '../config.js';
import { rrect, wrap } from '../ui/utils.js';

export function buildMonitor(scene) {
  // ---- mesh ----
  const matPlastic = new THREE.MeshStandardMaterial({ color: 0x0c0f15, metalness: 0.25, roughness: 0.45 });
  const monG = new THREE.Group();
  monG.position.set(3.1, 0, -0.8);
  monG.rotation.y = -0.5;
  scene.add(monG);

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    monG.add(m); return m;
  }

  box(1.4, 0.1, 0.5, matPlastic, 0, 0.07, 0);       // base
  box(0.18, 1.2, 0.18, matPlastic, 0, 0.6, 0);       // stem
  box(3.6, 2.1, 0.14, matPlastic, 0, 2.3, 0);        // bezel

  // canvas texture
  const mc = document.createElement('canvas');
  mc.width = 1024; mc.height = 600;
  const mctx = mc.getContext('2d');
  const monTex = new THREE.CanvasTexture(mc);
  monTex.colorSpace = THREE.SRGBColorSpace;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.34, 1.86),
    new THREE.MeshBasicMaterial({ map: monTex })
  );
  screen.position.set(0, 2.3, 0.075);
  monG.add(screen);

  // world-space position + normal (used by camera dive)
  scene.updateMatrixWorld(true);
  const screenWorld  = new THREE.Vector3();
  screen.getWorldPosition(screenWorld);
  const screenNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(monG.quaternion).normalize();

  // ---- drawing ----
  let monMode = 'home';
  let blink   = true;
  let blinkTimer = 0;

  function drawMon() {
    mctx.clearRect(0, 0, 1024, 600);
    mctx.fillStyle = '#060c16';
    mctx.fillRect(0, 0, 1024, 600);
    // scan lines
    mctx.strokeStyle = 'rgba(120,150,200,.12)';
    mctx.lineWidth = 1;
    for (let y = 0; y < 600; y += 4) {
      mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(1024, y); mctx.stroke();
    }

    if (monMode === 'home') {
      mctx.fillStyle = '#c8893f';
      mctx.font = "600 26px 'IBM Plex Mono',monospace";
      mctx.fillText('lauai@guelph ~ $', 40, 60);

      mctx.fillStyle = '#e9eefb';
      mctx.font = "700 78px 'Chakra Petch',sans-serif";
      mctx.fillText('LAUAI.ALERFI', 40, 160);

      mctx.fillStyle = '#4fd8e0';
      mctx.font = "400 27px 'IBM Plex Mono',monospace";
      mctx.fillText('SYSTEMS ENGINEER', 42, 214);

      mctx.fillStyle = '#7286a8';
      mctx.font = "400 24px 'IBM Plex Mono',monospace";
      [
        '> VLSI · FPGA · EMBEDDED · CONTROL · SW',
        '> click a part to dive the wires',
        '> software modules render here',
      ].forEach((l, i) => mctx.fillText(l, 42, 290 + i * 40));

      mctx.fillStyle = '#a7d96a';
      mctx.fillText(blink ? '▮' : ' ', 42, 290 + 3 * 40);
    } else {
      // software window
      mctx.fillStyle = '#0a1018'; mctx.fillRect(0, 0, 1024, 600);
      mctx.fillStyle = '#0e1726'; mctx.fillRect(0, 0, 1024, 52);
      mctx.fillStyle = '#a7d96a';
      mctx.font = "600 22px 'IBM Plex Mono',monospace";
      mctx.fillText('● software/, 2 modules', 24, 34);
      mctx.fillStyle = '#48597a';
      mctx.font = "400 16px 'IBM Plex Mono',monospace";
      mctx.fillText('lauai@guelph', 880, 34);

      PROJECTS.software.forEach((p, i) => {
        const y = 78 + i * 250;
        mctx.fillStyle = 'rgba(167,217,106,.06)';
        rrect(mctx, 24, y, 976, 232, 14); mctx.fill();
        mctx.strokeStyle = 'rgba(167,217,106,.4)'; mctx.lineWidth = 1.5;
        rrect(mctx, 24, y, 976, 232, 14); mctx.stroke();

        mctx.fillStyle = '#a7d96a';
        mctx.font = "600 18px 'IBM Plex Mono',monospace";
        mctx.fillText('0' + (i + 1), 46, y + 38);

        mctx.fillStyle = '#e9eefb';
        mctx.font = "700 30px 'Chakra Petch',sans-serif";
        mctx.fillText(p.t, 92, y + 40);

        mctx.fillStyle = '#a7d96a';
        mctx.font = "400 18px 'IBM Plex Mono',monospace";
        mctx.fillText(p.spec, 94, y + 72);

        mctx.fillStyle = '#9fb0cc';
        mctx.font = "400 19px Inter,sans-serif";
        wrap(mctx, p.d, 94, y + 104, 880, 28, 4);

        mctx.fillStyle = '#5d6f8f';
        mctx.font = "400 15px 'IBM Plex Mono',monospace";
        mctx.fillText(p.tags.join('   ·   '), 94, y + 208);
      });
    }

    monTex.needsUpdate = true;
  }

  drawMon();

  function setMode(m) {
    monMode = m;
    drawMon();
  }

  function tick(dt) {
    blinkTimer += dt;
    if (blinkTimer > 0.56) {
      blinkTimer = 0;
      blink = !blink;
      if (monMode === 'home') drawMon();
    }
  }

  return { monG, screenWorld, screenNormal, setMode, tick };
}
