// 3D floating navigation tablet.
//
// A physical aluminum tablet mesh that lives in 3D space.
// It slides in after a component dive and lets the user navigate
// between projects in the current region.
//
// Usage:
//   const tablet = buildTablet(THREE, scene, camera);
//   tablet.showRegion('vlsi', camera);   // open for a region
//   tablet.hide();
//   tablet.tick(dt, camera);             // call every frame
//   tablet.PICK                          // array for raycasting

import * as THREE from 'three';
import { PROJECTS, REGIONS } from '../config.js';
import { rrect, wrap } from '../ui/utils.js';

export function buildTablet(scene, camera) {
  // ─── physical mesh ──────────────────────────────────────────────────────
  const tabW = 0.42, tabH = 0.60, tabD = 0.028;
  const tabG = new THREE.Group();
  scene.add(tabG);
  tabG.visible = false;

  // aluminum body
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x9aa3b0, metalness: 0.96, roughness: 0.14,
    envMapIntensity: 1.5, clearcoat: 0.4, clearcoatRoughness: 0.1,
  });
  const bodyGeo = new THREE.BoxGeometry(tabW, tabH, tabD);
  // chamfer corners via bounding sphere, we do it visually with a slight scale
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true; body.receiveShadow = true;
  tabG.add(body);

  // bezel (darker inset ring inside body)
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x14181f, metalness: 0.4, roughness: 0.6 });
  const scW = tabW * 0.84, scH = tabH * 0.78;
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(scW + 0.012, scH + 0.012, tabD * 0.22), bezelMat);
  bezel.position.z = tabD * 0.4;
  tabG.add(bezel);

  // screen face
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512; screenCanvas.height = 720;
  const ctx = screenCanvas.getContext('2d');
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;

  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(scW, scH), screenMat);
  screenMesh.position.z = tabD * 0.52;
  tabG.add(screenMesh);

  // camera hole
  const camHoleMat = new THREE.MeshStandardMaterial({ color: 0x040508, metalness: 0.5, roughness: 0.8 });
  const camHole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 16), camHoleMat);
  camHole.rotation.x = Math.PI / 2;
  camHole.position.set(0, tabH * 0.47, tabD * 0.52);
  tabG.add(camHole);
  // camera lens shine
  const lensGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.002, 16);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 0, roughness: 0.05, transmission: 0.5 });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, tabH * 0.47, tabD * 0.54);
  tabG.add(lens);

  // home button
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x888e9a, metalness: 0.9, roughness: 0.2, clearcoat: 0.6 });
  const homeBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 32), btnMat);
  homeBtn.rotation.x = Math.PI / 2;
  homeBtn.position.set(0, -tabH * 0.47, tabD * 0.5);
  homeBtn.userData.tabAction = 'home';
  tabG.add(homeBtn);
  // home button ring
  const btnRing = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 8, 32), new THREE.MeshStandardMaterial({ color: 0x6a7080, metalness: 0.95, roughness: 0.15 }));
  btnRing.rotation.x = Math.PI / 2;
  btnRing.position.set(0, -tabH * 0.47, tabD * 0.5);
  tabG.add(btnRing);

  // side buttons (volume)
  const sideBtnMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa3b0, metalness: 0.95, roughness: 0.16 });
  const sbGeo = new THREE.BoxGeometry(0.008, 0.06, 0.018);
  [-0.015, 0.055].forEach(y => {
    const sb = new THREE.Mesh(sbGeo, sideBtnMat);
    sb.position.set(-tabW * 0.5 - 0.004, y, 0);
    tabG.add(sb);
  });
  // power button on right
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.018), sideBtnMat);
  pb.position.set(tabW * 0.5 + 0.004, 0.04, 0);
  tabG.add(pb);

  // speaker grille (dots)
  for (let i = 0; i < 8; i++) {
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.005, 8),
      new THREE.MeshStandardMaterial({ color: 0x0a0c12, metalness: 0.3, roughness: 0.9 })
    );
    dot.rotation.x = Math.PI / 2;
    dot.position.set(-tabW * 0.25 + i * 0.07, -tabH * 0.44, tabD * 0.52);
    tabG.add(dot);
  }

  // ─── screen drawing ─────────────────────────────────────────────────────
  let currentRegion = null;
  let currentIdx    = 0;
  let accentColor   = '#4fd8e0';

  function drawScreen() {
    const CW = 512, CH = 720;
    ctx.clearRect(0, 0, CW, CH);

    // background
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, CW, CH);

    // subtle scanline
    ctx.strokeStyle = 'rgba(120,150,200,.07)';
    ctx.lineWidth = 1;
    for (let y = 0; y < CH; y += 5) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    }

    if (!currentRegion) {
      // idle / home screen
      ctx.fillStyle = '#7286a8';
      ctx.font = "600 22px 'IBM Plex Mono',monospace";
      ctx.textAlign = 'center';
      ctx.fillText('LAUAI.ALERFI', CW/2, CH/2 - 20);
      ctx.font = "400 16px 'IBM Plex Mono',monospace";
      ctx.fillStyle = '#48597a';
      ctx.fillText('click a component to explore', CW/2, CH/2 + 18);
      ctx.textAlign = 'left';
      screenTex.needsUpdate = true;
      return;
    }

    const region  = REGIONS[currentRegion];
    const projects = PROJECTS[currentRegion];
    const proj    = projects[currentIdx];
    const accent  = accentColor;

    // top status bar
    ctx.fillStyle = accent;
    rrect(ctx, 0, 0, CW, 54, 0);
    ctx.fill();
    ctx.fillStyle = '#05080f';
    ctx.font = "700 18px 'IBM Plex Mono',monospace";
    ctx.textAlign = 'center';
    ctx.fillText(region.name.toUpperCase(), CW/2, 22);
    ctx.font = "400 13px 'IBM Plex Mono',monospace";
    ctx.fillText(region.sub.toUpperCase(), CW/2, 42);
    ctx.textAlign = 'left';

    // project counter pill
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    rrect(ctx, CW - 80, 60, 68, 28, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
    rrect(ctx, CW - 80, 60, 68, 28, 8); ctx.stroke();
    ctx.fillStyle = '#9fb0cc';
    ctx.font = "400 13px 'IBM Plex Mono',monospace";
    ctx.textAlign = 'center';
    ctx.fillText(`${currentIdx+1} / ${projects.length}`, CW - 46, 79);
    ctx.textAlign = 'left';

    // project title
    ctx.fillStyle = '#e9eefb';
    ctx.font = "700 28px 'Chakra Petch',sans-serif";
    let yy = wrap(ctx, proj.t, 24, 116, 460, 36, 2);

    // spec line
    ctx.fillStyle = accent;
    ctx.font = "500 15px 'IBM Plex Mono',monospace";
    yy = wrap(ctx, proj.spec, 24, yy + 6, 460, 22, 2);

    // divider
    ctx.strokeStyle = 'rgba(120,150,200,.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, yy + 10); ctx.lineTo(CW - 24, yy + 10); ctx.stroke();
    yy += 24;

    // description
    ctx.fillStyle = '#9fb0cc';
    ctx.font = "400 15px Inter,sans-serif";
    yy = wrap(ctx, proj.d, 24, yy, 460, 24, 6);
    yy += 8;

    // tags
    ctx.font = "400 12px 'IBM Plex Mono',monospace";
    let tx = 24;
    proj.tags.forEach(t => {
      const tw = ctx.measureText(t).width + 16;
      if (tx + tw > CW - 24) { tx = 24; yy += 30; }
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      rrect(ctx, tx, yy - 18, tw, 24, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(120,150,200,.2)'; ctx.lineWidth = 1;
      rrect(ctx, tx, yy - 18, tw, 24, 5); ctx.stroke();
      ctx.fillStyle = '#7286a8'; ctx.fillText(t, tx + 8, yy);
      tx += tw + 6;
    });

    // nav buttons at bottom
    const btnY = CH - 80;
    // PREV
    const prevColor = currentIdx > 0 ? accent : '#2a3040';
    ctx.fillStyle = prevColor;
    rrect(ctx, 24, btnY, 190, 52, 10); ctx.fill();
    ctx.fillStyle = currentIdx > 0 ? '#05080f' : '#48597a';
    ctx.font = "700 16px 'IBM Plex Mono',monospace";
    ctx.textAlign = 'center';
    ctx.fillText('◄  PREV', 24 + 95, btnY + 33);

    // NEXT
    const nextColor = currentIdx < projects.length - 1 ? accent : '#2a3040';
    ctx.fillStyle = nextColor;
    rrect(ctx, CW - 214, btnY, 190, 52, 10); ctx.fill();
    ctx.fillStyle = currentIdx < projects.length - 1 ? '#05080f' : '#48597a';
    ctx.fillText('NEXT  ►', CW - 214 + 95, btnY + 33);
    ctx.textAlign = 'left';

    screenTex.needsUpdate = true;
  }

  // ─── hit zones on screen (UV → action) ─────────────────────────────────
  // We use pointer events on the screen mesh UV coordinates
  const PICK = [screenMesh, homeBtn];
  screenMesh.userData.tabAction = 'screen';

  function handleScreenClick(uv) {
    if (!currentRegion) return null;
    const x = uv.x * 512, y = (1 - uv.y) * 720;
    const btnY = 720 - 80;
    // PREV
    if (x >= 24 && x <= 214 && y >= btnY && y <= btnY + 52 && currentIdx > 0) {
      currentIdx--;
      drawScreen();
      return { action: 'project', region: currentRegion, idx: currentIdx };
    }
    // NEXT
    if (x >= 512-214 && x <= 512-24 && y >= btnY && y <= btnY + 52 && currentIdx < PROJECTS[currentRegion].length - 1) {
      currentIdx++;
      drawScreen();
      return { action: 'project', region: currentRegion, idx: currentIdx };
    }
    return null;
  }

  // ─── positioning ─────────────────────────────────────────────────────────
  // The tablet follows the camera at a fixed offset in camera space
  // Right side, slightly below center, tilted to face the user
  const CAM_OFFSET = new THREE.Vector3(0.55, -0.28, -0.85);

  let visible    = false;
  let slideAnim  = 0;   // 0=hidden, 1=fully shown
  let targetSlide= 0;
  let bobPhase   = Math.random() * Math.PI * 2;

  function showRegion(region) {
    currentRegion = region;
    currentIdx    = 0;
    accentColor   = REGIONS[region]?.color || '#4fd8e0';
    drawScreen();
    tabG.visible  = true;
    visible       = true;
    targetSlide   = 1;
  }

  function hide() {
    targetSlide = 0;
  }

  function tick(dt, cam) {
    if (!tabG.visible && targetSlide === 0) return;

    // animate slide in/out
    const speed = 3.5;
    slideAnim += (targetSlide - slideAnim) * Math.min(1, dt * speed);
    if (slideAnim < 0.005 && targetSlide === 0) {
      tabG.visible = false; visible = false; return;
    }
    if (!tabG.visible) tabG.visible = true;

    bobPhase += dt * 1.1;

    // position in camera space
    const right   = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up      = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const forward = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const camPos  = cam.position.clone();

    // start below camera and slide up
    const slideOffset = (1 - slideAnim) * -0.5;
    const bobOffset   = Math.sin(bobPhase) * 0.008;

    const target = camPos.clone()
      .add(right.clone().multiplyScalar(CAM_OFFSET.x))
      .add(up.clone().multiplyScalar(CAM_OFFSET.y + slideOffset + bobOffset))
      .add(forward.clone().multiplyScalar(CAM_OFFSET.z));

    tabG.position.lerp(target, Math.min(1, dt * 8));
    tabG.opacity = slideAnim;

    // face the camera with slight inward tilt
    tabG.quaternion.copy(cam.quaternion);
    const tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -0.12);
    tabG.quaternion.multiply(tiltQ);

    // emissive glow on screen edge when visible
    screenMat.opacity = slideAnim;
  }

  drawScreen();

  return { tabG, showRegion, hide, tick, handleScreenClick, PICK, get currentIdx() { return currentIdx; }, get currentRegion() { return currentRegion; } };
}
