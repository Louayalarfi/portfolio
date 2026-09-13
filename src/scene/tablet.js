// A floating aluminium tablet that slides in after a dive and pages through the mount's projects.
import * as THREE from 'three';
import { rrect, wrap } from '../ui/utils.js';

export function buildTablet(scene, camera) {
  const tabW = 0.42, tabH = 0.60, tabD = 0.028;
  const tabG = new THREE.Group();
  scene.add(tabG);
  tabG.visible = false;

  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa3b0, metalness: 0.96, roughness: 0.14, envMapIntensity: 1.5, clearcoat: 0.4, clearcoatRoughness: 0.1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(tabW, tabH, tabD), bodyMat);
  body.castShadow = true; body.receiveShadow = true; tabG.add(body);

  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x14181f, metalness: 0.4, roughness: 0.6 });
  const scW = tabW * 0.84, scH = tabH * 0.78;
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(scW + 0.012, scH + 0.012, tabD * 0.22), bezelMat);
  bezel.position.z = tabD * 0.4; tabG.add(bezel);

  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 512; screenCanvas.height = 720;
  const ctx = screenCanvas.getContext('2d');
  const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(scW, scH), screenMat);
  screenMesh.position.z = tabD * 0.52; tabG.add(screenMesh);

  const camHole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 16), new THREE.MeshStandardMaterial({ color: 0x040508, metalness: 0.5, roughness: 0.8 }));
  camHole.rotation.x = Math.PI / 2; camHole.position.set(0, tabH * 0.47, tabD * 0.52); tabG.add(camHole);

  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x888e9a, metalness: 0.9, roughness: 0.2, clearcoat: 0.6 });
  const homeBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 32), btnMat);
  homeBtn.rotation.x = Math.PI / 2; homeBtn.position.set(0, -tabH * 0.47, tabD * 0.5);
  homeBtn.userData.tabAction = 'home'; tabG.add(homeBtn);
  const btnRing = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 8, 32), new THREE.MeshStandardMaterial({ color: 0x6a7080, metalness: 0.95, roughness: 0.15 }));
  btnRing.rotation.x = Math.PI / 2; btnRing.position.set(0, -tabH * 0.47, tabD * 0.5); tabG.add(btnRing);

  const sideBtnMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa3b0, metalness: 0.95, roughness: 0.16 });
  [-0.015, 0.055].forEach((y) => { const sb = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.018), sideBtnMat); sb.position.set(-tabW * 0.5 - 0.004, y, 0); tabG.add(sb); });
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.018), sideBtnMat); pb.position.set(tabW * 0.5 + 0.004, 0.04, 0); tabG.add(pb);

  const fadeMats = [];
  tabG.traverse((o) => { if (o.isMesh && o.material && !fadeMats.includes(o.material)) { o.material.transparent = true; fadeMats.push(o.material); } });

  let mount = null, idx = 0;
  const CW = 512, CH = 720;

  function drawScreen() {
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#05080f'; ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(120,150,200,.07)'; ctx.lineWidth = 1;
    for (let y = 0; y < CH; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

    if (!mount) {
      ctx.fillStyle = '#7286a8'; ctx.font = "600 22px 'IBM Plex Mono',monospace"; ctx.textAlign = 'center';
      ctx.fillText('LAUAI.ALERFI', CW / 2, CH / 2 - 20);
      ctx.font = "400 16px 'IBM Plex Mono',monospace"; ctx.fillStyle = '#48597a';
      ctx.fillText('click a device to explore', CW / 2, CH / 2 + 18);
      ctx.textAlign = 'left'; screenTex.needsUpdate = true; return;
    }

    const projects = mount.projects, p = projects[idx], accent = mount.accent;
    ctx.fillStyle = accent; rrect(ctx, 0, 0, CW, 54, 0); ctx.fill();
    ctx.fillStyle = '#05080f'; ctx.font = "700 18px 'IBM Plex Mono',monospace"; ctx.textAlign = 'center';
    ctx.fillText(mount.label.toUpperCase(), CW / 2, 22);
    ctx.font = "400 13px 'IBM Plex Mono',monospace";
    ctx.fillText((mount.portLabel ? mount.portLabel + ' · ' : '') + (mount.cableKind || 'desk').toUpperCase(), CW / 2, 42);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(255,255,255,.07)'; rrect(ctx, CW - 80, 60, 68, 28, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1; rrect(ctx, CW - 80, 60, 68, 28, 8); ctx.stroke();
    ctx.fillStyle = '#9fb0cc'; ctx.font = "400 13px 'IBM Plex Mono',monospace"; ctx.textAlign = 'center';
    ctx.fillText(`${idx + 1} / ${projects.length}`, CW - 46, 79); ctx.textAlign = 'left';

    ctx.fillStyle = '#e9eefb'; ctx.font = "700 28px 'Chakra Petch',sans-serif";
    let yy = wrap(ctx, p.title, 24, 116, 460, 36, 2);
    ctx.fillStyle = accent; ctx.font = "500 15px 'IBM Plex Mono',monospace";
    yy = wrap(ctx, p.spec, 24, yy + 6, 460, 22, 2);
    ctx.strokeStyle = 'rgba(120,150,200,.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, yy + 10); ctx.lineTo(CW - 24, yy + 10); ctx.stroke();
    yy += 24;
    ctx.fillStyle = '#9fb0cc'; ctx.font = "400 15px Inter,sans-serif";
    for (const b of p.bullets.slice(0, 3)) {
      if (yy > CH - 150) break;
      ctx.fillStyle = accent; ctx.fillText('▸', 24, yy);
      ctx.fillStyle = '#9fb0cc'; yy = wrap(ctx, b, 42, yy, 442, 22, 3) + 4;
    }
    ctx.font = "400 12px 'IBM Plex Mono',monospace";
    let tx = 24; yy = Math.max(yy + 8, CH - 130);
    p.tags.slice(0, 6).forEach((t) => {
      const tw = ctx.measureText(t).width + 16;
      if (tx + tw > CW - 24) { tx = 24; yy += 30; }
      ctx.fillStyle = 'rgba(255,255,255,.06)'; rrect(ctx, tx, yy - 18, tw, 24, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(120,150,200,.2)'; ctx.lineWidth = 1; rrect(ctx, tx, yy - 18, tw, 24, 5); ctx.stroke();
      ctx.fillStyle = '#7286a8'; ctx.fillText(t, tx + 8, yy);
      tx += tw + 6;
    });

    const btnY = CH - 80;
    const prevOn = idx > 0, nextOn = idx < projects.length - 1;
    ctx.fillStyle = prevOn ? accent : '#2a3040'; rrect(ctx, 24, btnY, 190, 52, 10); ctx.fill();
    ctx.fillStyle = prevOn ? '#05080f' : '#48597a'; ctx.font = "700 16px 'IBM Plex Mono',monospace"; ctx.textAlign = 'center';
    ctx.fillText('◄  PREV', 24 + 95, btnY + 33);
    ctx.fillStyle = nextOn ? accent : '#2a3040'; rrect(ctx, CW - 214, btnY, 190, 52, 10); ctx.fill();
    ctx.fillStyle = nextOn ? '#05080f' : '#48597a'; ctx.fillText('NEXT  ►', CW - 214 + 95, btnY + 33);
    ctx.textAlign = 'left';
    screenTex.needsUpdate = true;
  }

  const PICK = [screenMesh, homeBtn];
  screenMesh.userData.tabAction = 'screen';

  function handleScreenClick(uv) {
    if (!mount) return null;
    const x = uv.x * 512, y = (1 - uv.y) * 720, btnY = 720 - 80;
    if (x >= 24 && x <= 214 && y >= btnY && y <= btnY + 52 && idx > 0) { idx--; drawScreen(); return { action: 'project', idx }; }
    if (x >= 512 - 214 && x <= 512 - 24 && y >= btnY && y <= btnY + 52 && idx < mount.projects.length - 1) { idx++; drawScreen(); return { action: 'project', idx }; }
    return null;
  }

  const CAM_OFFSET = new THREE.Vector3(0.55, -0.28, -0.85);
  let slideAnim = 0, targetSlide = 0, bobPhase = Math.random() * Math.PI * 2;

  function showMount(m) { mount = m; idx = 0; drawScreen(); tabG.visible = true; targetSlide = 1; }
  function select(i) { if (!mount) return; idx = Math.max(0, Math.min(mount.projects.length - 1, i)); drawScreen(); }
  function hide() { targetSlide = 0; }

  function tick(dt, cam) {
    if (!tabG.visible && targetSlide === 0) return;
    slideAnim += (targetSlide - slideAnim) * Math.min(1, dt * 3.5);
    if (slideAnim < 0.005 && targetSlide === 0) { tabG.visible = false; return; }
    if (!tabG.visible) tabG.visible = true;
    bobPhase += dt * 1.1;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const forward = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const target = cam.position.clone()
      .add(right.multiplyScalar(CAM_OFFSET.x))
      .add(up.multiplyScalar(CAM_OFFSET.y + (1 - slideAnim) * -0.5 + Math.sin(bobPhase) * 0.008))
      .add(forward.multiplyScalar(CAM_OFFSET.z));
    tabG.position.lerp(target, Math.min(1, dt * 8));
    fadeMats.forEach((m) => { m.opacity = slideAnim; });
    tabG.quaternion.copy(cam.quaternion);
    tabG.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.12));
  }

  drawScreen();
  return { tabG, showMount, select, hide, tick, handleScreenClick, PICK, get idx() { return idx; }, get mount() { return mount; } };
}
