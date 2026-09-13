// The monitor is the software layer: a canvas screen with three modes, home (terminal), apps (tiles
// for every monitor project) and app:<slug> (one project). Click zones are resolved from the UV hit.
import * as THREE from 'three';
import { rrect, wrap } from '../ui/utils.js';

const W = 1024, H = 600;

export function buildMonitor(scene, spec) {
  const matPlastic = new THREE.MeshStandardMaterial({ color: 0x0c0f15, metalness: 0.25, roughness: 0.45 });
  const monG = new THREE.Group();
  monG.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
  monG.rotation.y = spec.rotY;
  scene.add(monG);

  const bodyG = new THREE.Group(); monG.add(bodyG);
  const box = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matPlastic);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; bodyG.add(m); return m;
  };
  box(1.4, 0.1, 0.5, 0, 0.05, 0);
  box(0.18, 1.2, 0.18, 0, 0.6, 0);
  box(3.6, 2.1, 0.14, 0, 2.3, 0);
  // DisplayPort jack on the back of the panel.
  const jack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x0a0d14, metalness: 0.4, roughness: 0.6 }));
  jack.position.set(0.55, 1.85, -0.09); bodyG.add(jack);

  const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
  const g = mc.getContext('2d');
  const tex = new THREE.CanvasTexture(mc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.34, 1.86), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0, 2.3, 0.075);
  screen.userData.monitorScreen = true;
  monG.add(screen);

  scene.updateMatrixWorld(true);
  const screenWorld = new THREE.Vector3(); screen.getWorldPosition(screenWorld);
  const screenNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(monG.quaternion).normalize();

  let projects = [];
  let mode = 'home';
  let appIdx = -1;
  let blink = true, blinkTimer = 0;
  let zones = [];

  function bg() {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#060c16'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,150,200,.10)'; g.lineWidth = 1;
    for (let y = 0; y < H; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  }

  function drawHome() {
    bg();
    g.fillStyle = '#c8893f'; g.font = "600 26px 'IBM Plex Mono',monospace"; g.fillText('lauai@guelph ~ $', 40, 60);
    g.fillStyle = '#e9eefb'; g.font = "700 78px 'Chakra Petch',sans-serif"; g.fillText('LAUAI.ALERFI', 40, 160);
    g.fillStyle = '#4fd8e0'; g.font = "400 27px 'IBM Plex Mono',monospace"; g.fillText('SYSTEMS ENGINEER', 42, 214);
    g.fillStyle = '#7286a8'; g.font = "400 24px 'IBM Plex Mono',monospace";
    ['> software runs here, hardware sits on the desk', '> click the monitor to open the software modules', `> ${projects.length} modules installed`]
      .forEach((l, i) => g.fillText(l, 42, 290 + i * 40));
    g.fillStyle = '#a7d96a'; g.fillText(blink ? '▮' : ' ', 42, 410);
  }

  function drawApps() {
    bg(); zones = [];
    g.fillStyle = '#0e1726'; g.fillRect(0, 0, W, 52);
    g.fillStyle = '#a7d96a'; g.font = "600 22px 'IBM Plex Mono',monospace"; g.fillText(`● software/  ·  ${projects.length} modules`, 24, 34);
    g.fillStyle = '#48597a'; g.font = "400 16px 'IBM Plex Mono',monospace"; g.fillText('lauai@guelph', 880, 34);
    const cols = 2, tw = (W - 72) / cols, th = 160, gap = 24;
    projects.forEach((p, i) => {
      const x = 24 + (i % cols) * (tw + gap), y = 72 + Math.floor(i / cols) * (th + gap);
      if (y + th > H) return;
      const accent = p.accent || '#a7d96a';
      g.fillStyle = 'rgba(167,217,106,.06)'; rrect(g, x, y, tw, th, 12); g.fill();
      g.strokeStyle = accent + '66'; g.lineWidth = 1.5; rrect(g, x, y, tw, th, 12); g.stroke();
      g.fillStyle = accent; g.font = "600 16px 'IBM Plex Mono',monospace"; g.fillText(String(i + 1).padStart(2, '0'), x + 18, y + 32);
      g.fillStyle = '#e9eefb'; g.font = "700 24px 'Chakra Petch',sans-serif"; wrap(g, p.title, x + 56, y + 34, tw - 76, 28, 2);
      g.fillStyle = accent; g.font = "400 15px 'IBM Plex Mono',monospace"; wrap(g, p.spec, x + 56, y + 92, tw - 76, 20, 2);
      g.fillStyle = '#5d6f8f'; g.font = "400 13px 'IBM Plex Mono',monospace"; g.fillText(p.tags.slice(0, 4).join('  ·  '), x + 56, y + th - 18);
      zones.push({ x, y, w: tw, h: th, action: 'app', idx: i });
    });
  }

  function drawApp() {
    bg(); zones = [];
    const p = projects[appIdx]; if (!p) { drawApps(); return; }
    const accent = p.accent || '#a7d96a';
    g.fillStyle = '#0e1726'; g.fillRect(0, 0, W, 52);
    g.fillStyle = accent; g.font = "600 20px 'IBM Plex Mono',monospace"; g.fillText('◄ apps', 24, 34);
    zones.push({ x: 0, y: 0, w: 160, h: 52, action: 'apps' });
    g.fillStyle = '#48597a'; g.font = "400 16px 'IBM Plex Mono',monospace"; g.fillText(p.domain || '', 200, 34);
    g.fillStyle = '#e9eefb'; g.font = "700 40px 'Chakra Petch',sans-serif"; let y = wrap(g, p.title, 32, 108, 940, 44, 2);
    g.fillStyle = accent; g.font = "400 19px 'IBM Plex Mono',monospace"; y = wrap(g, p.spec, 32, y + 4, 940, 26, 2);
    g.fillStyle = '#aeb9d2'; g.font = "400 19px Inter,sans-serif";
    y += 10;
    for (const b of p.bullets.slice(0, 4)) {
      if (y > H - 90) break;
      g.fillStyle = accent; g.fillText('▸', 32, y);
      g.fillStyle = '#aeb9d2'; y = wrap(g, b, 56, y, 920, 25, 3) + 6;
    }
    g.fillStyle = '#5d6f8f'; g.font = "400 14px 'IBM Plex Mono',monospace"; g.fillText(p.tags.join('  ·  '), 32, H - 26);
    if (p.links?.length) {
      const bx = W - 232, by = H - 58, bw = 200, bh = 40;
      g.fillStyle = accent; rrect(g, bx, by, bw, bh, 8); g.fill();
      g.fillStyle = '#06101c'; g.font = "700 16px 'IBM Plex Mono',monospace"; g.textAlign = 'center';
      g.fillText('OPEN ' + p.links[0].label.toUpperCase().slice(0, 14) + ' ↗', bx + bw / 2, by + 26); g.textAlign = 'left';
      zones.push({ x: bx, y: by, w: bw, h: bh, action: 'link', url: p.links[0].url });
    }
  }

  function draw() {
    if (mode === 'home') drawHome(); else if (mode === 'apps') drawApps(); else drawApp();
    tex.needsUpdate = true;
  }

  function setProjects(list) { projects = list; draw(); }

  function setMode(m, idx) {
    if (typeof m === 'string' && m.startsWith('app:')) {
      const slug = m.slice(4);
      appIdx = projects.findIndex((p) => p.slug === slug);
      mode = appIdx >= 0 ? 'app' : 'apps';
    } else if (m === 'app' && idx !== undefined) { appIdx = idx; mode = 'app'; }
    else mode = m;
    draw();
  }

  function handleScreenClick(uv) {
    const x = uv.x * W, y = (1 - uv.y) * H;
    if (mode === 'home') { setMode('apps'); return { action: 'apps' }; }
    const z = zones.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!z) return null;
    if (z.action === 'app') { setMode('app', z.idx); return { action: 'app', idx: z.idx, project: projects[z.idx] }; }
    if (z.action === 'apps') { setMode('apps'); return { action: 'apps' }; }
    if (z.action === 'link') { window.open(z.url, '_blank', 'noopener'); return { action: 'link', url: z.url }; }
    return null;
  }

  function tick(dt) {
    blinkTimer += dt;
    if (blinkTimer > 0.56) { blinkTimer = 0; blink = !blink; if (mode === 'home') draw(); }
  }

  // Swap the procedural body for a GLB and move our screen plane onto its display rectangle.
  function useModel(wrap, screenSpec) {
    bodyG.visible = false;
    wrap.traverse((o) => { if (o.isMesh) o.userData.monitorBody = true; });
    monG.add(wrap);
    if (screenSpec) {
      screen.geometry.dispose();
      screen.geometry = new THREE.PlaneGeometry(screenSpec.w, screenSpec.h);
      screen.position.set(screenSpec.x || 0, screenSpec.y, screenSpec.z + 0.004);
    }
    scene.updateMatrixWorld(true);
    screen.getWorldPosition(screenWorld);
  }

  draw();
  return { monG, bodyG, screen, screenWorld, screenNormal, setMode, setProjects, handleScreenClick, useModel, tick, get mode() { return mode; }, get projects() { return projects; } };
}
