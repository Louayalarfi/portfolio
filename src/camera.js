// Orbit, spark race and dive camera state machine over the world's mounts.
//
// Click a device: 'spark-race' (sparks run its cable) then 'dive' (fly the cable's tunnel) then 'orbit'
// settled on the device with its holo cards and the tablet. Esc or Up pops one depth.
// Deep links freeze a dive at any t or jump to an arrival.

import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const RACE_DUR = reduce ? 0.001 : 0.55;

export function buildCamera(camera, renderer, world, holo, tablet, labels, post) {
  const BASE_FOV = camera.fov;
  const { mounts, monitor } = world;

  const home = { target: new THREE.Vector3(0.6, 1.7, 0.2), r: 13.5, theta: 0.42, phi: 0.98 };
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
  const HOME_HINT = 'drag to orbit · scroll to zoom · <b>click a device to dive through its cable</b>';

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

  function setHint(html) { if (hintEl) { hintEl.innerHTML = html; hintEl.style.opacity = '1'; } }

  // Dive.
  function startDive(mount, opts = {}) {
    if (!mount.curve) { arrive(mount); return; }
    mode = 'dive'; orbitAnim = null; focus = mount;
    labels.hide();
    dive = { mount, curve: mount.curve, t: 0, dur: reduce ? 0.001 : 2.2, fromPos: camera.position.clone(), tunnel: mount.tunnel, tmat: mount.tmat };
    mount.tunnel.visible = true;
    if (mount.internal) world.liftPanel(true);
    if (warpEl) warpEl.classList.add('on');
    if (opts.t != null) { dive.t = opts.t; frozen = true; updateDive(0); return; }
    if (reduce) endDive();
  }

  function arrive(mount) {
    depth.push(mount.id);
    focus = mount;
    if (mount.kind === 'monitor') {
      const sw = monitor.screenWorld;
      deriveOrbit(sw, camera.position);
      const n = monitor.screenNormal;
      orbitTo({ target: sw.clone(), r: mount.orbitR, theta: Math.atan2(n.x, n.z), phi: 1.45 });
      monitor.setMode('apps');
      holo.clearHolos();
    } else {
      deriveOrbit(mount.center, camera.position);
      const n = mount.projects.length;
      orbitTo({ target: mount.center.clone().add(new THREE.Vector3(0, 0.45, 0)), r: mount.orbitR + n * 0.35, theta: cam.theta, phi: Math.min(1.25, Math.max(1.0, cam.phi)) });
      holo.buildProjectHolos(mount.projects, mount.center, mount.accent);
    }
    if (tablet) tablet.showMount(mount);
    setHint('<b>Esc</b> or Up to pull back · click a card or the tablet to read a project');
  }

  function endDive() {
    const mount = dive.mount;
    mount.tunnel.visible = false;
    if (warpEl) warpEl.classList.remove('on');
    camera.fov = BASE_FOV; camera.updateProjectionMatrix();
    mode = 'orbit'; frozen = false;
    dive = null;
    arrive(mount);
  }

  function updateDive(dt) {
    if (!frozen) dive.t = Math.min(1, dive.t + dt / dive.dur);
    const t = dive.t, pre = 0.18, curve = dive.curve;
    const look = new THREE.Vector3();
    if (t < pre) {
      const u = t / pre;
      camera.position.lerpVectors(dive.fromPos, curve.getPointAt(0), easeIO(u));
      look.copy(curve.getPointAt(0.03));
    } else {
      const u = (t - pre) / (1 - pre), e = easeIO(u);
      camera.position.copy(curve.getPointAt(e));
      look.copy(curve.getPointAt(Math.min(1, e + 0.04)));
    }
    camera.lookAt(look);
    const warp = Math.sin(t * Math.PI);
    camera.fov = BASE_FOV + warp * 22; camera.updateProjectionMatrix();
    if (!frozen) camera.rotation.z += Math.sin(t * 46) * 0.004 * warp;
    dive.tmat.uniforms.uTime.value += dt;
    if (t >= 1 && !frozen) endDive();
  }

  function cancelDive() {
    world.cablesSys.cancelSparkRace();
    if (dive) dive.tunnel.visible = false;
    dive = null; sparkRace = null; frozen = false;
    mode = 'orbit';
    if (warpEl) warpEl.classList.remove('on');
    if (camera.fov !== BASE_FOV) { camera.fov = BASE_FOV; camera.updateProjectionMatrix(); }
  }

  // Spark race then dive.
  function diveTo(mountId) {
    const mount = typeof mountId === 'string' ? world.mountFor(mountId) : mountId;
    if (!mount) return;
    if (mode === 'dive' || mode === 'spark-race') return;

    holo.clearHolos();
    holo.introGroup.visible = false;
    labels.hide();
    if (hintEl) hintEl.style.opacity = '0';
    if (tablet) tablet.hide();

    if (!mount.cable) { focus = mount; depth.length = 0; arrive(mount); return; }

    mode = 'spark-race';
    focus = mount;
    const targetPt = mount.cable.curve.getPointAt(0.5);
    orbitTo({ target: targetPt.clone(), r: Math.max(4, cam.r * 0.8), theta: cam.theta, phi: Math.max(0.7, cam.phi) }, 0.6);

    sparkRace = { mount, t: 0, dur: RACE_DUR };
    world.cablesSys.startSparkRace(mount.cable, () => { sparkRace = null; orbitAnim = null; startDive(mount); });
  }

  function goOverview() {
    cancelDive();
    focus = null; depth.length = 0;
    holo.clearHolos();
    monitor.setMode('home');
    holo.introGroup.visible = true;
    world.liftPanel(false);
    if (tablet) tablet.hide();
    setHint(HOME_HINT);
    orbitTo(home);
  }

  function goUp() {
    if (mode !== 'orbit') { cancelDive(); goOverview(); return; }
    if (focus?.kind === 'monitor' && monitor.mode === 'app') { monitor.setMode('apps'); return; }
    goOverview();
  }

  // Deep links: jump to a state and settle it so a screenshot is deterministic.
  function shot(link) {
    if (!link) return;
    if (link.kind === 'desk') { goOverview(); settleOrbit(); return; }
    const mount = world.mountFor(link.id);
    if (!mount) { console.warn('[camera] unknown mount', link.id); goOverview(); settleOrbit(); return; }
    holo.clearHolos(); holo.introGroup.visible = false; if (tablet) tablet.hide();
    if (link.kind === 'dive') { focus = mount; if (mount.internal) { world.liftPanel(true); } startDive(mount, { t: link.t ?? 0.5 }); return; }
    if (link.kind === 'board' || link.kind === 'die') {
      if (mount.internal) world.liftPanel(true);
      camera.position.copy(mount.center).add(new THREE.Vector3(1.8, 1.4, 2.2));
      arrive(mount);
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

  const clickable = world.clickables;
  const screenPick = [monitor.screen];
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
      if (hC.length && !focus) {
        const m = world.mountAt(hC[0].object);
        if (m) labels.show(m, m.center.clone().add(new THREE.Vector3(0, 0.35, 0))); else labels.hide();
      } else labels.hide();
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
            holo.focusCard(r.idx);
            if (focus?.kind === 'monitor') monitor.setMode('app', r.idx);
          }
          return;
        }
      }
    }

    if (focus?.kind === 'monitor') {
      const sh = pickFrom(e.clientX, e.clientY, screenPick);
      if (sh.length && sh[0].uv) {
        const r = monitor.handleScreenClick(sh[0].uv);
        if (r?.action === 'app' && tablet) tablet.select(r.idx);
        return;
      }
    }

    const hH = holo.HOLO_PICK.length ? pickFrom(e.clientX, e.clientY, holo.HOLO_PICK) : [];
    if (hH.length) { holo.handleHoloPick(hH[0].object); return; }

    if (mode === 'orbit') {
      const hC = pickFrom(e.clientX, e.clientY, clickable);
      if (hC.length) {
        const m = world.mountAt(hC[0].object);
        if (m && m !== focus) diveTo(m);
        else if (m && m.kind === 'monitor' && monitor.mode === 'home') monitor.setMode('apps');
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    if (mode !== 'orbit') return;
    e.preventDefault();
    cam.r = Math.max(1.2, Math.min(24, cam.r + e.deltaY * 0.01)); orbitAnim = null;
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = d2(e.touches); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && mode === 'orbit') {
      const d = d2(e.touches); cam.r = Math.max(1.2, Math.min(24, cam.r + (pinch - d) * 0.01)); pinch = d; orbitAnim = null;
    }
  }, { passive: true });
  function d2(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') goUp(); });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (post) post.setSize(innerWidth, innerHeight);
  });

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
    if (sparkRace) world.cablesSys.tickRace(dt);
    labels.tick();
    if (post) {
      if (mode === 'dive') post.setFocus(0.8, 0.0012);
      else post.setFocus(cam.r, focus ? 0.0007 : 0.00025);
    }
  }

  applyOrbit();
  setHint(HOME_HINT);

  function state() { return { mode, focus: focus?.id || null, depth: [...depth], r: cam.r, theta: cam.theta, phi: cam.phi, diveT: dive ? dive.t : null }; }

  return { diveTo, goOverview, goUp, cancelDive, orbitTo, shot, tick, state };
}
