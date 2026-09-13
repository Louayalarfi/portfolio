import * as THREE from 'three';

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

// Toggle cinematic postprocessing. Bloom + SSAO cost GPU; turn off for debugging.
const USE_POST = true;

function init() {
  // ── renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace   = THREE.SRGBColorSpace;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure= 1.12;
  renderer.shadowMap.enabled  = true;
  renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  // ── scene + camera ─────────────────────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.05, 300);
  camera.position.set(6.5, 4.2, 9);

  // ── environment (HDRI or procedural studio) ────────────────────────────────
  setupEnvironment(renderer, scene);

  // ── shared glow texture ────────────────────────────────────────────────────
  const haloTex = makeHaloTexture(THREE);
  const haloAt  = (hex, size, x, y, z, parent) => halo(THREE, haloTex, hex, size, x, y, z, parent, scene);

  // ── rig geometry ───────────────────────────────────────────────────────────
  const { components } = buildRig(scene, { haloAt });

  // ── point lights (per region colors) ──────────────────────────────────────
  const pCyan = new THREE.PointLight(0x4fd8e0, 7, 8, 2);
  pCyan.position.set(-2.6, 2.95, 0.5); scene.add(pCyan);
  const pMag  = new THREE.PointLight(0xe7609f, 6, 8, 2);
  pMag.position.set(-2.35, 1.55, 0.7); scene.add(pMag);
  const pAmb  = new THREE.PointLight(0xf0a830, 3, 5, 2);
  pAmb.position.set(1.5, 1.5, 1.7); scene.add(pAmb);

  // ── contact shadows ────────────────────────────────────────────────────────
  [[-2.2,0,4.4,3.0],[1.5,1.7,2.2,1.8],[2.9,0.95,2.0,1.6],[3.1,-0.8,3.6,2.4]].forEach(([x,z,sx,sz])=>{
    const cc=document.createElement('canvas'); cc.width=cc.height=128;
    const g=cc.getContext('2d');
    const rg=g.createRadialGradient(64,64,4,64,64,62);
    rg.addColorStop(0,'rgba(0,0,0,.65)'); rg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=rg; g.fillRect(0,0,128,128);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cc),transparent:true,depthWrite:false}));
    m.rotation.x=-Math.PI/2; m.position.set(x,0.012,z); scene.add(m);
  });

  // ── monitor ────────────────────────────────────────────────────────────────
  const monitor = buildMonitor(scene);

  // ── holographic panel system ───────────────────────────────────────────────
  const holoSys = buildHoloSystem(scene, camera, components, haloTex);

  // ── tablet (3D floating nav) ──────────────────────────────────────────────
  const tablet = buildTablet(scene, camera);

  // ── cables + plasma tunnels ────────────────────────────────────────────────
  const cablesSys = buildCables(scene, components, monitor.screenWorld, monitor.screenNormal, haloTex);

  // ── camera state machine ───────────────────────────────────────────────────
  const cam = buildCamera(camera, renderer, components, holoSys, monitor, cablesSys, tablet);

  // ── HUD buttons ────────────────────────────────────────────────────────────
  document.getElementById('overview').addEventListener('click', () => cam.goOverview());
  document.getElementById('reboot').addEventListener('click',   () => cam.goOverview());
  document.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      holoSys.introGroup.visible = false;
      tablet.hide();
      holoSys.buildInfoHolo(btn.dataset.open, cam.orbitTo);
    });
  });

  // ── postprocessing ─────────────────────────────────────────────────────────
  let post = null;
  if (USE_POST) {
    post = createComposer(renderer, scene, camera);
    window.addEventListener('resize', () => {
      if (post) post.composer.setSize(innerWidth, innerHeight);
    });
  }

  // ── render loop ────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    const dt   = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    cam.tick(dt);
    monitor.tick(dt);
    cablesSys.animateCables(time);
    tablet.tick(dt, camera);

    // pulsing component lights
    pCyan.intensity = 6.0 + 1.5*Math.sin(time*1.5);
    pMag.intensity  = 5.0 + 1.2*Math.cos(time*1.2);
    pAmb.intensity  = 2.5 + 0.8*Math.sin(time*0.9+1);

    // component animations
    if (components.vlsi?.fan)    components.vlsi.fan.rotation.y = time * 5;
    if (components.fpga?.fans)   components.fpga.fans.forEach((f,i) => (f.rotation.y = time*(i?-7:7)));
    if (components.control?.lev) {
      components.control.lev.position.y = 0.62 + Math.sin(time*1.7)*0.07;
      components.control.lev.rotation.y = time*0.7;
      components.control.lev.rotation.x = time*0.4;
    }

    holoSys.animateHolos(time);

    if (post) post.composer.render();
    else      renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  animate();
}

try {
  startBoot(init);
} catch(e) {
  console.error(e);
  document.getElementById('fallback').style.display = 'flex';
}
