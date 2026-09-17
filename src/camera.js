// Orbit camera over the world's mounts.
//
// Click a device: the camera eases to it and its cards and the tablet appear. The CPU die sits far below
// the desk, so that one goes through a short fade. Back, Esc or the Desk button return to the overview.
// Deep links jump straight to a state so screenshots are deterministic.

import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

export function buildCamera(camera, renderer, world, holo, tablet, tags, post) {
  const { monitor } = world;

  const home = { target: new THREE.Vector3(0.6, 2.6, 0.2), r: 15.5, theta: 0.42, phi: 1.02 };
  const cam  = { target: home.target.clone(), r: home.r, theta: home.theta, phi: home.phi };

  let orbitAnim = null;
  let focus = null;
  let busy = false;
  const depth = [];

  const fadeEl = document.getElementById('fade');
  const hintEl = document.getElementById('hint');
  const backEl = document.getElementById('back');
  const crumbEl = document.getElementById('crumb');
  const HOME_HINT = 'drag to look around · scroll to zoom · <b>click a glowing tag to open it</b>';

  // The Back pill and the breadcrumb always say where you are and what Back will do.
  function updateNav() {
    if (!backEl) return;
    if (!focus) { backEl.hidden = true; crumbEl.textContent = ''; tags.setVisible(true); return; }
    tags.setVisible(false);
    backEl.hidden = false;
    const where = focus.kind === 'monitor' ? 'Screen' : focus.kind === 'die' ? 'CPU die' : focus.label;
    if (focus.kind === 'monitor' && monitor.mode === 'app') {
      backEl.innerHTML = '<span>◀</span> All apps';
      crumbEl.textContent = 'Desk › Screen › ' + (monitor.projects[monitor.appIdx]?.title || 'App');
    } else {
      backEl.innerHTML = '<span>◀</span> Back to desk';
      crumbEl.textContent = 'Desk › ' + where;
    }
  }

  function applyOrbit() {
    const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
    const st = Math.sin(cam.theta), ct = Math.cos(cam.theta);
    camera.position.set(cam.target.x + cam.r * sp * st, cam.target.y + cam.r * cp, cam.target.z + cam.r * sp * ct);
    camera.lookAt(cam.target);
  }

  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function orbitTo(v, dur = 1.0, onDone = null) {
    orbitAnim = {
      t: 0, dur: reduce ? 0.001 : dur, onDone,
      from: { target: cam.target.clone(), r: cam.r, theta: cam.theta, phi: cam.phi },
      to:   { target: v.target.clone(),   r: v.r,   theta: v.theta,   phi: v.phi }
    };
  }

  function settleOrbit() {
    if (orbitAnim) {
      cam.target.copy(orbitAnim.to.target); cam.r = orbitAnim.to.r; cam.theta = orbitAnim.to.theta; cam.phi = orbitAnim.to.phi;
      const done = orbitAnim.onDone; orbitAnim = null; done && done();
    }
    applyOrbit();
  }

  function setHint(html) { if (hintEl) { hintEl.innerHTML = html; hintEl.style.opacity = '1'; } }

  // Keep the orbit direction the camera already has so the move reads as a glide, not a swing.
  function thetaToward(target) {
    const d = new THREE.Vector3().subVectors(camera.position, target);
    return Math.atan2(d.x, d.z);
  }

  function fade(to, ms) {
    return new Promise((resolve) => {
      if (!fadeEl || reduce) { resolve(); return; }
      fadeEl.style.transition = `opacity ${ms}ms ease`;
      fadeEl.style.opacity = String(to);
      setTimeout(resolve, ms);
    });
  }

  function arrive(mount, dur = 1.4) {
    depth.push(mount.id);
    focus = mount;
    if (mount.kind === 'monitor') {
      const sw = monitor.screenWorld, n = monitor.screenNormal;
      orbitTo({ target: sw.clone(), r: mount.orbitR, theta: Math.atan2(n.x, n.z), phi: 1.45 }, dur);
      monitor.setMode('apps');
      holo.clearHolos();
    } else if (mount.kind === 'die' && mount.dieCenter) {
      cam.target.copy(mount.dieCenter); cam.r = mount.dieOrbitR * 1.6; cam.theta = 0.6; cam.phi = 0.9;
      applyOrbit();
      orbitTo({ target: mount.dieCenter.clone(), r: mount.dieOrbitR, theta: 0.6, phi: 1.0 }, 1.6);
      holo.buildProjectHolos(mount.projects, mount.dieCenter.clone().add(new THREE.Vector3(0, 5, 0)), mount.accent, 5);
    } else {
      // Build the cards first so the orbit can frame the tallest one together with the device.
      const theta = thetaToward(mount.center);
      const maxH = holo.buildProjectHolos(mount.projects, mount.center, mount.accent, 1, theta);
      const n = mount.projects.length;
      const target = mount.center.clone().add(new THREE.Vector3(0, 0.35 + maxH * 0.5, 0));
      const r = Math.max(mount.orbitR + n * 0.35, 1.35 * maxH + 1.4);
      orbitTo({ target, r, theta, phi: 1.22 }, dur);
    }
    if (tablet) tablet.showMount(mount);
    setHint('click a card for its images · the tablet pages through projects · <b>Back</b> to the desk');
    updateNav();
  }

  function focusBlock(block) {
    if (!block || !focus) return;
    orbitTo({ target: block.center.clone().add(new THREE.Vector3(0, 1.5, 0)), r: block.orbitR, theta: cam.theta, phi: 0.95 }, 0.8);
    holo.buildProjectHolos([block.project], block.center.clone().add(new THREE.Vector3(0, 1.6, 0)), focus.accent, 2.4);
    if (tablet) tablet.select(block.idx);
    setHint(`<b>${block.label || block.project.title}</b> · click the other block to switch`);
  }

  async function goTo(mountId) {
    const mount = typeof mountId === 'string' ? world.mountFor(mountId) : mountId;
    if (!mount || busy || mount === focus) return;
    busy = true;
    holo.clearHolos();
    holo.introGroup.visible = false;
    if (hintEl) hintEl.style.opacity = '0';
    if (tablet) tablet.hide();
    depth.length = 0;
    if (mount.kind === 'die') {
      await fade(1, 420);
      arrive(mount);
      await fade(0, 520);
    } else {
      arrive(mount);
    }
    busy = false;
  }

  async function goOverview() {
    if (busy) return;
    const fromDie = focus?.kind === 'die';
    busy = true;
    focus = null; depth.length = 0;
    holo.clearHolos();
    monitor.setMode('home');
    if (tablet) tablet.hide();
    if (fromDie) {
      await fade(1, 380);
      cam.target.copy(home.target); cam.r = home.r * 1.35; cam.theta = home.theta; cam.phi = home.phi;
      applyOrbit();
      holo.introGroup.visible = true;
      orbitTo(home, 1.2);
      await fade(0, 520);
    } else {
      holo.introGroup.visible = true;
      orbitTo(home, 1.3);
    }
    setHint(HOME_HINT);
    updateNav();
    busy = false;
  }

  function goUp() {
    if (focus?.kind === 'monitor' && monitor.mode === 'app') { monitor.setMode('apps'); updateNav(); return; }
    goOverview();
  }

  // Skills, Experience and Contact panels from the HUD behave like a place you went to, so Back works.
  function showInfo(kind, label) {
    if (busy) return;
    if (kind === 'experience') {
      window.__openDetail?.({ title: 'Experience', roles: world.experience.map((r) => ({ title: r.title, sub: r.org, dates: r.dates, bullets: r.bullets, tags: r.tags })) });
      return;
    }
    holo.clearHolos();
    holo.introGroup.visible = false;
    if (tablet) tablet.hide();
    depth.length = 0;
    focus = { id: 'info:' + kind, kind: 'info', label };
    holo.buildInfoHolo(kind, orbitTo);
    setHint('<b>Back</b> returns to the desk');
    updateNav();
  }

  // Deep links: jump to a state and settle it so a screenshot is deterministic.
  function shot(link) {
    if (!link) return;
    if (link.kind === 'desk') { goOverview(); settleOrbit(); return; }
    const mount = world.mountFor(link.id);
    if (!mount) { console.warn('[camera] unknown mount', link.id); goOverview(); settleOrbit(); return; }
    holo.clearHolos(); holo.introGroup.visible = false; if (tablet) tablet.hide();
    arrive(mount, 0.001);
    settleOrbit();
    if (link.kind === 'die' && mount.blocks?.[link.id]) { focusBlock(mount.blocks[link.id]); settleOrbit(); }
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
    if (busy) return;
    dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lx, dy = e.clientY - ly;
      moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY;
      if (moved > 6) {
        cam.theta -= dx * 0.005;
        cam.phi = Math.max(0.2, Math.min(1.5, cam.phi - dy * 0.005));
        orbitAnim = null;
      }
    } else if (!busy) {
      const hH = holo.HOLO_PICK.length ? pickFrom(e.clientX, e.clientY, holo.HOLO_PICK) : [];
      const hI = holo.introGroup.visible && holo.INTRO_PICK.length ? pickFrom(e.clientX, e.clientY, holo.INTRO_PICK) : [];
      const tabPick = tablet?.PICK?.length ? pickFrom(e.clientX, e.clientY, tablet.PICK) : [];
      const hC = hH.length || hI.length || tabPick.length ? [] : pickFrom(e.clientX, e.clientY, clickable);
      canvas.style.cursor = (hH.length || hI.length || hC.length || tabPick.length) ? 'pointer' : 'grab';
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!dragging) return; dragging = false;
    if (moved > 6 || busy) return;

    if (tablet?.PICK?.length) {
      const tabHits = pickFrom(e.clientX, e.clientY, tablet.PICK);
      if (tabHits.length) {
        const obj = tabHits[0].object;
        if (obj.userData.tabAction === 'home') { goOverview(); return; }
        if (obj.userData.tabAction === 'screen' && tabHits[0].uv) {
          const r = tablet.handleScreenClick(tabHits[0].uv);
          if (r?.action === 'project') {
            holo.focusCard(r.idx);
            if (focus?.kind === 'monitor') { monitor.setMode('app', r.idx); updateNav(); }
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
        updateNav();
        return;
      }
    }

    if (focus?.kind === 'die' && world.die) {
      ndc.x = (e.clientX / innerWidth) * 2 - 1; ndc.y = -(e.clientY / innerHeight) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObject(world.die.group, true);
      if (hits.length) { focusBlock(world.blockAt(hits[0].point)); return; }
    }

    const hH = holo.HOLO_PICK.length ? pickFrom(e.clientX, e.clientY, holo.HOLO_PICK) : [];
    if (hH.length) { holo.handleHoloPick(hH[0].object); return; }

    if (holo.introGroup.visible && holo.INTRO_PICK.length) {
      const hI = pickFrom(e.clientX, e.clientY, holo.INTRO_PICK);
      if (hI.length && holo.handleIntroPick(hI[0])) return;
    }

    const hC = pickFrom(e.clientX, e.clientY, clickable);
    if (hC.length) {
      const m = world.mountAt(hC[0].object);
      if (m && m !== focus) goTo(m);
      else if (m && m.kind === 'monitor' && monitor.mode === 'home') monitor.setMode('apps');
    }
  });

  canvas.addEventListener('wheel', (e) => {
    if (busy) return;
    e.preventDefault();
    cam.r = Math.max(1.2, Math.min(24, cam.r + e.deltaY * 0.01)); orbitAnim = null;
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = d2(e.touches); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && !busy) {
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
    if (orbitAnim) {
      orbitAnim.t = Math.min(1, orbitAnim.t + dt / orbitAnim.dur);
      const e = easeIO(orbitAnim.t);
      cam.target.lerpVectors(orbitAnim.from.target, orbitAnim.to.target, e);
      cam.r     = orbitAnim.from.r     + (orbitAnim.to.r     - orbitAnim.from.r)     * e;
      cam.theta = orbitAnim.from.theta + (orbitAnim.to.theta - orbitAnim.from.theta) * e;
      cam.phi   = orbitAnim.from.phi   + (orbitAnim.to.phi   - orbitAnim.from.phi)   * e;
      if (orbitAnim.t >= 1) { const done = orbitAnim.onDone; orbitAnim = null; done && done(); }
    }
    applyOrbit();
    tags.tick();
    if (post) post.setFocus(cam.r, focus ? 0.0007 : 0.00025);
  }

  applyOrbit();
  setHint(HOME_HINT);
  if (backEl) backEl.addEventListener('click', goUp);
  updateNav();

  function state() { return { mode: busy ? 'moving' : 'orbit', focus: focus?.id || null, depth: [...depth], r: cam.r, theta: cam.theta, phi: cam.phi }; }

  return { goTo, goOverview, goUp, showInfo, orbitTo, shot, tick, state };
}
