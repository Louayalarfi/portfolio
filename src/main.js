import * as THREE from 'three';

import { getQuality, setQuality, nextTier } from './core/quality.js';
import { createLoader }      from './core/loader.js';
import { DEEP_LINK, SKIP_BOOT } from './core/deeplink.js';
import { setupEnvironment }  from './scene/environment.js';
import { buildRig }          from './scene/rig.js';
import { buildMonitor }      from './scene/monitor.js';
import { buildCables }       from './scene/cables.js';
import { buildTablet }       from './scene/tablet.js';
import { buildHoloSystem }   from './holo.js';
import { buildCamera }       from './camera.js';
import { createComposer }    from './postprocessing/composer.js';
import { startBoot }         from './ui/boot.js';
import { makeHaloTexture, halo } from './ui/utils.js';

// Canvas text is drawn once, so the web fonts must be in before anything paints.
function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  const faces = ["700 34px 'Chakra Petch'", "400 19px 'IBM Plex Mono'", "600 19px 'IBM Plex Mono'", "400 19px Inter"];
  return Promise.race([
    Promise.all(faces.map((f) => document.fonts.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500))
  ]);
}

function build() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const quality = getQuality(renderer);
  renderer.setPixelRatio(quality.dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = quality.shadowSoft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  const loader = createLoader();
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.05, 300);
  camera.position.set(6.5, 4.2, 9);

  const env = setupEnvironment(renderer, scene, quality, loader);

  const haloTex = makeHaloTexture(THREE);
  const haloAt  = (hex, size, x, y, z, parent) => halo(THREE, haloTex, hex, size, x, y, z, parent, scene);

  const { components } = buildRig(scene, { haloAt });
  if (!quality.fansCastShadow) {
    for (const k in components) {
      const c = components[k];
      (c.fans || (c.fan ? [c.fan] : [])).forEach((f) => f.traverse((o) => { o.castShadow = false; }));
    }
  }

  const pCyan = new THREE.PointLight(0x4fd8e0, 7, 8, 2); pCyan.position.set(-2.6, 2.95, 0.5); scene.add(pCyan);
  const pMag  = new THREE.PointLight(0xe7609f, 6, 8, 2); pMag.position.set(-2.35, 1.55, 0.7); scene.add(pMag);
  const pAmb  = new THREE.PointLight(0xf0a830, 3, 5, 2); pAmb.position.set(1.5, 1.5, 1.7); scene.add(pAmb);

  [[-2.2, 0, 4.4, 3.0], [1.5, 1.7, 2.2, 1.8], [2.9, 0.95, 2.0, 1.6], [3.1, -0.8, 3.6, 2.4]].forEach(([x, z, sx, sz]) => {
    const cc = document.createElement('canvas'); cc.width = cc.height = 128;
    const g = cc.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    rg.addColorStop(0, 'rgba(0,0,0,.65)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cc), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); scene.add(m);
  });

  const monitor   = buildMonitor(scene);
  const holoSys   = buildHoloSystem(scene, camera, components, haloTex, loader);
  const tablet    = buildTablet(scene, camera);
  const cablesSys = buildCables(scene, components, monitor.screenWorld, monitor.screenNormal, haloTex, quality.plasmaOctaves);
  const post      = createComposer(renderer, scene, camera, quality);
  const cam       = buildCamera(camera, renderer, components, holoSys, monitor, cablesSys, tablet, post);

  document.getElementById('overview').addEventListener('click', () => cam.goOverview());
  document.getElementById('reboot').addEventListener('click',   () => cam.goOverview());
  document.getElementById('up').addEventListener('click',       () => cam.goUp());
  document.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cam.cancelDive();
      holoSys.introGroup.visible = false;
      tablet.hide();
      holoSys.buildInfoHolo(btn.dataset.open, cam.orbitTo);
    });
  });
  const qBtn = document.getElementById('quality');
  qBtn.textContent = 'Q: ' + quality.tier.toUpperCase();
  qBtn.title = quality.gpu;
  qBtn.addEventListener('click', () => setQuality(nextTier(quality.tier)));
  document.getElementById('status').textContent = 'RIG ONLINE · ' + quality.tier.toUpperCase();

  const clock = new THREE.Clock();
  let running = false;

  function frame() {
    const dt   = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    cam.tick(dt);
    monitor.tick(dt);
    cablesSys.animateCables(time);
    tablet.tick(dt, camera);

    pCyan.intensity = 6.0 + 1.5 * Math.sin(time * 1.5);
    pMag.intensity  = 5.0 + 1.2 * Math.cos(time * 1.2);
    pAmb.intensity  = 2.5 + 0.8 * Math.sin(time * 0.9 + 1);

    if (components.vlsi?.fan)  components.vlsi.fan.rotation.y = time * 5;
    if (components.fpga?.fans) components.fpga.fans.forEach((f, i) => (f.rotation.y = time * (i ? -7 : 7)));
    if (components.control?.lev) {
      components.control.lev.position.y = 0.62 + Math.sin(time * 1.7) * 0.07;
      components.control.lev.rotation.y = time * 0.7;
      components.control.lev.rotation.x = time * 0.4;
    }

    holoSys.animateHolos(time);
    if (post) post.render(); else renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    clock.start();
    requestAnimationFrame(frame);
  }

  const app = { renderer, scene, camera, quality, loader, env, components, cam, monitor, holo: holoSys, tablet, post, start, frame };
  window.__app = app;
  return app;
}

(async () => {
  try {
    await fontsReady();
    const app = build();
    startBoot({
      loader: app.loader,
      skip: SKIP_BOOT,
      onEnter: () => {
        app.start();
        if (DEEP_LINK) {
          app.loader.whenIdle().then(() => { app.cam.shot(DEEP_LINK); app.frame(); });
        }
      }
    });
  } catch (e) {
    console.error(e);
    document.getElementById('fallback').style.display = 'flex';
  }
})();
