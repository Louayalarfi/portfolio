// Orbit, spark race and dive camera state machine.
//
// Click a component: 'spark-race' (sparks run the cable) then 'dive' (fly the plasma tunnel)
// then 'orbit' settled on the component with its holo cards and the tablet.
// Esc or the Up button pops one depth. Deep links can freeze a dive at any t.

import * as THREE from 'three';
import { PROJECTS } from './config.js';

const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const RACE_DUR = reduce ? 0.001 : 0.55;

// Until the world registries land, mount ids from mounts.js resolve to the rig regions.
const REGION_OF = {
  stm32_nucleo: 'embedded', stm32_disco: 'embedded', k60: 'embedded', printer: 'embedded', headset: 'embedded',
  zedboard: 'fpga', de1soc: 'fpga', nexys: 'fpga',
  maglev_rig: 'control',
  cpu: 'vlsi', pc45: 'vlsi', sram130: 'vlsi',
  monitor: 'software'
};

export function buildCamera(camera, renderer, components, holo, monitor, cables, tablet, post) {
  const BASE_FOV = camera.fov;

  const home = { target: new THREE.Vector3(0.2, 2.0, 0), r: 11, theta: 0.62, phi: 1.0 };
  const cam  = { target: home.target.clone(), r: home.r, theta: home.theta, phi: home.phi };

  let mode = 'orbit';
  let orbitAnim = null;
  let dive = null;
  let sparkRace = null;
  let focus = null;
  let frozen = false;
  const depth = [];

  const warpEl = document.getElementById('warp');
  const hintEl = document.getElementById('hint');

  function applyOrbit() {
    const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
    const st = Math.sin(cam.theta), ct = Math.cos(cam.theta);
    camera.position.set(cam.target.x + cam.r * sp * st, cam.target.y + cam.r * cp, cam.target.z + cam.r * sp * ct);
    camera.lookAt(cam.target);
  }

  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function orbitTo(v, dur = 1.0) {
    orbitAnim = {
      t: 0, dur: reduce ? 0.001 : dur,
      from: { target: cam.target.clone(), r: cam.r, theta: cam.theta, phi: cam.phi },
      to:   { target: v.target.clone(),   r: v.r,   theta: v.theta,   phi: v.phi }
    };
  }

  function deriveOrbit(center, pos) {
    const d = new THREE.Vector3().subVectors(pos, center);
    const r = Math.max(1.4, d.length());
    cam.target.copy(center); cam.r = r;
    cam.phi = Math.acos(Math.max(-1, Math.min(1, d.y / r)));
    cam.theta = Math.atan2(d.x, d.z);
  }

  function settleOrbit() {
    if (orbitAnim) {
      cam.target.copy(orbitAnim.to.target); cam.r = orbitAnim.to.r; cam.theta = orbitAnim.to.theta; cam.phi = orbitAnim.to.phi;
      orbitAnim = null;
    }
    applyOrbit();
  }

  // Dive.
  function startDive(region, opts = {}) {
    const c = components[region];
    if (!c || !c.dive) return;
    mode = 'dive'; orbitAnim = null; focus = region;
    dive = {
      region, curve: c.dive, t: 0, dur: reduce ? 0.001 : 2.0,
      fromPos: camera.position.clone(), tunnel: c.tunnel, tmat: c.tmat, center: c.center
    };
    c.tunnel.visible = true;
    if (warpEl) warpEl.classList.add('on');
    if (opts.t != null) { dive.t = opts.t; frozen = true; updateDive(0); return; }
    if (reduce) endDive();
  }

  function arrive(region) {
    const c = components[region];
    depth.push(region);
    if (region === 'software') {
      const sw = monitor.screenWorld;
      deriveOrbit(sw, camera.position);
      orbitTo({ target: sw.clone(), r: 2.7, theta: cam.theta, phi: cam.phi });
      monitor.setMode('software');
    } else {
      deriveOrbit(c.center, camera.position);
      const n = PROJECTS[region].length;
      orbitTo({ target: c.center.clone(), r: 3.0 + n * 0.4, theta: cam.theta, phi: Math.min(1.25, cam.phi) });
      holo.buildProjectHolos(region);
    }
    if (tablet) tablet.showRegion(region);
    if (hintEl) hintEl.innerHTML = '<b>Esc</b> or Up to pull back · click a card to open it';
    if (hintEl) hintEl.style.opacity = '1';
  }

  function endDive() {
    const c = components[dive.region], region = dive.region;
    c.tunnel.visible = false;
    if (warpEl) warpEl.classList.remove('on');
    camera.fov = BASE_FOV; camera.updateProjectionMatrix();
    mode = 'orbit'; frozen = false;
    dive = null;
    arrive(region);
  }

  function updateDive(dt) {
    if (!frozen) dive.t = Math.min(1, dive.t + dt / dive.dur);
    const t = dive.t, pre = 0.15, curve = dive.curve;
    const look = new THREE.Vector3();
    if (t < pre) {
      const u = t / pre;
      camera.position.lerpVectors(dive.fromPos, curve.getPointAt(0), easeIO(u));
      look.copy(curve.getPointAt(0.03));
    } else {
      const u = (t - pre) / (1 - pre), e = easeIO(u);
      camera.position.copy(curve.getPointAt(e));
      look.copy(curve.getPointAt(Math.min(1, e + 0.05)));
    }
    camera.lookAt(look);
    const warp = Math.sin(t * Math.PI);
    camera.fov = BASE_FOV + warp * 22; camera.updateProjectionMatrix();
    if (!frozen) camera.rotation.z += Math.sin(t * 46) * 0.004 * warp;
    dive.tmat.uniforms.uTime.value += dt;
    if (t >= 1 && !frozen) endDive();
  }

  function cancelDive() {
    if (cables) cables.cancelSparkRace();
    if (dive) dive.tunnel.visible = false;
    dive = null; sparkRace = null; frozen = false;
    if (mode !== 'orbit') mode = 'orbit';
    if (warpEl) warpEl.classList.remove('on');
    if (camera.fov !== BASE_FOV) { camera.fov = BASE_FOV; camera.updateProjectionMatrix(); }
  }

  // Spark race then dive.
  function diveTo(region) {
    const c = components[region]; if (!c || !c.dive) return;
    if (mode === 'dive' || mode === 'spark-race') return;

    mode = 'spark-race';
    focus = region;
    holo.clearHolos();
    holo.introGroup.visible = false;
    if (hintEl) hintEl.style.opacity = '0';
    if (tablet) tablet.hide();

    const targetPt = c.dive.getPointAt(0.5);
    orbitTo({ target: targetPt.clone(), r: cam.r * 0.85, theta: cam.theta, phi: Math.max(0.7, cam.phi) });

    sparkRace = { region, t: 0, dur: RACE_DUR };
    if (cables) {
      cables.startSparkRace(region, () => { sparkRace = null; orbitAnim = null; startDive(region); });
    } else {
      setTimeout(() => { sparkRace = null; startDive(region); }, 10);
    }
  }

  function goOverview() {
    cancelDive();
    focus = null; depth.length = 0;
    holo.clearHolos();
    monitor.setMode('home');
    holo.introGroup.visible = true;
    if (tablet) tablet.hide();
    if (hintEl) { hintEl.innerHTML = 'drag to orbit · scroll to zoom · <b>click a component to dive through the wires</b>'; hintEl.style.opacity = '1'; }
    orbitTo(home);
  }

  function goUp() {
    if (mode !== 'orbit') { cancelDive(); goOverview(); return; }
    if (depth.length) { depth.pop(); goOverview(); return; }
    goOverview();
  }

  // Deep links: jump straight to a state and settle it so a screenshot is deterministic.
  function shot(link) {
    if (!link) return;
    const region = REGION_OF[link.id] || link.id;
    if (link.kind === 'desk') { goOverview(); settleOrbit(); return; }
    if (!components[region]) { console.warn('[camera] unknown mount', link.id); goOverview(); settleOrbit(); return; }
    holo.clearHolos(); holo.introGroup.visible = false; if (tablet) tablet.hide();
    if (link.kind === 'dive') { focus = region; startDive(region, { t: link.t ?? 0.5 }); return; }
    if (link.kind === 'board' || link.kind === 'die') {
      focus = region;
      const c = components[region];
      camera.position.copy(c.center).add(new THREE.Vector3(2.2, 1.6, 2.6));
      arrive(region);
      settleOrbit();
    }
  }

  // Input.
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

  function pickFrom(x, y, list) {
    ndc.x = (x / innerWidth) * 2 - 1; ndc.y = -(y / innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(list, false);
  }

  const clickable = [];
  function rebuildClickable() {
    clickable.length = 0;
    for (const k in components) {
      components[k].group.traverse((o) => { if (o.isMesh) { o.userData.region = k; clickable.push(o); } });
    }
    if (monitor.monG) monitor.monG.traverse((o) => { if (o.isMesh) { o.userData.region = 'software'; clickable.push(o); } });
  }
  rebuildClickable();

  let dragging = false, moved = 0, lx = 0, ly = 0, pinch = 0;

  canvas.addEventListener('pointerdown', (e) => {
    if (mode === 'dive') return;
    dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (dragging && mode === 'orbit') {
      const dx = e.clientX - lx, dy = e.clientY - ly;
      moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY;
      cam.theta -= dx * 0.005;
      cam.phi = Math.max(0.2, Math.min(1.5, cam.phi - dy * 0.005));
      orbitAnim = null;
    } else if (mode === 'orbit') {
      const hH = holo.HOLO_PICK.length ? pickFrom(e.clientX, e.clientY, holo.HOLO_PICK) : [];
      const tabPick = tablet?.PICK?.length ? pickFrom(e.clientX, e.clientY, tablet.PICK) : [];
      const hC = hH.length || tabPick.length ? [] : pickFrom(e.clientX, e.clientY, clickable);
      canvas.style.cursor = (hH.length || hC.length || tabPick.length) ? 'pointer' : 'grab';
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!dragging) return; dragging = false;
    if (moved > 6) return;

    if (tablet?.PICK?.length) {
      const tabHits = pickFrom(e.clientX, e.clientY, tablet.PICK);
      if (tabHits.length) {
        const obj = tabHits[0].object;
        if (obj.userData.tabAction === 'home') { goOverview(); return; }
        if (obj.userData.tabAction === 'screen' && tabHits[0].uv) {
          const r = tablet.handleScreenClick(tabHits[0].uv);
          if (r?.action === 'project') {
            holo.focusCard(r.region, r.idx);
            if (r.region === 'software') monitor.setMode('software', r.idx);
          }
          return;
        }
      }
    }

    const hH = holo.HOLO_PICK.length ? pickFrom(e.clientX, e.clientY, holo.HOLO_PICK) : [];
    if (hH.length) { holo.handleHoloPick(hH[0].object); return; }

    if (mode === 'orbit') {
      const hC = pickFrom(e.clientX, e.clientY, clickable);
      if (hC.length) diveTo(hC[0].object.userData.region);
    }
  });

  canvas.addEventListener('wheel', (e) => {
    if (mode !== 'orbit') return;
    e.preventDefault();
    cam.r = Math.max(2.0, Math.min(20, cam.r + e.deltaY * 0.01)); orbitAnim = null;
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = d2(e.touches); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && mode === 'orbit') {
      const d = d2(e.touches); cam.r = Math.max(2, Math.min(20, cam.r + (pinch - d) * 0.01)); pinch = d; orbitAnim = null;
    }
  }, { passive: true });
  function d2(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') goUp(); });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (post) post.setSize(innerWidth, innerHeight);
  });

  // Per frame.
  function tick(dt) {
    if (mode === 'dive' && dive) {
      updateDive(dt);
    } else {
      if (orbitAnim) {
        orbitAnim.t = Math.min(1, orbitAnim.t + dt / orbitAnim.dur);
        const e = easeIO(orbitAnim.t);
        cam.target.lerpVectors(orbitAnim.from.target, orbitAnim.to.target, e);
        cam.r     = orbitAnim.from.r     + (orbitAnim.to.r     - orbitAnim.from.r)     * e;
        cam.theta = orbitAnim.from.theta + (orbitAnim.to.theta - orbitAnim.from.theta) * e;
        cam.phi   = orbitAnim.from.phi   + (orbitAnim.to.phi   - orbitAnim.from.phi)   * e;
        if (orbitAnim.t >= 1) orbitAnim = null;
      }
      applyOrbit();
    }
    if (cables && sparkRace) cables.tickRace(dt);

    if (post) {
      if (mode === 'dive') post.setFocus(0.8, 0.0012);
      else post.setFocus(cam.r, focus ? 0.0007 : 0.00025);
    }
  }

  applyOrbit();

  function state() { return { mode, focus, depth: [...depth], r: cam.r, theta: cam.theta, phi: cam.phi, diveT: dive ? dive.t : null }; }

  return { diveTo, goOverview, goUp, cancelDive, orbitTo, shot, tick, state };
}
