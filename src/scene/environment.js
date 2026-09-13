import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Sets scene.environment (reflections) + scene.background, and adds the lights.
// Tries to load an HDRI from public/assets/hdri/. If none is present, it bakes a
// procedural studio environment so the scene still looks good out of the box.
//
// >>> TO GO PHOTOREAL: drop a .hdr into public/assets/hdri/ (see ASSETS.md) and set
//     HDRI_FILE below. That single change is the biggest realism upgrade available.

const HDRI_FILE = 'studio.hdr'; // place file at public/assets/hdri/studio.hdr

export function setupEnvironment(renderer, scene) {
  scene.background = new THREE.Color(0x04060c);
  scene.fog = new THREE.FogExp2(0x04060c, 0.028);

  // ---- lights (kept even with HDRI: HDRI handles reflections, lights cast shadow) ----
  scene.add(new THREE.HemisphereLight(0x8ea7d8, 0x0a0e16, 0.42));

  const key = new THREE.DirectionalLight(0xdfe8ff, 1.5);
  key.position.set(7, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 44;
  key.shadow.camera.left = -12; key.shadow.camera.right = 12;
  key.shadow.camera.top = 13; key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8893f, 0.5);
  fill.position.set(-9, 5, -7);
  scene.add(fill);

  // ---- environment map ----
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  new RGBELoader()
    .setPath('assets/hdri/')
    .load(
      HDRI_FILE,
      (hdr) => {
        const env = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = env;
        // Optional: also use the HDRI as the visible background:
        // scene.background = env;
        hdr.dispose(); pmrem.dispose();
        console.log('[env] HDRI loaded:', HDRI_FILE);
      },
      undefined,
      () => {
        console.warn('[env] no HDRI found, using procedural studio env. Drop a .hdr in public/assets/hdri/ for realism.');
        scene.environment = bakeProceduralEnv(renderer);
        pmrem.dispose();
      }
    );

  return { key, fill };
}

function bakeProceduralEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(
    new THREE.BoxGeometry(50, 40, 50),
    new THREE.MeshBasicMaterial({ color: 0x0e131c, side: THREE.BackSide })
  ));
  const lite = (c, w, h, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c }));
    m.position.set(x, y, z); m.lookAt(0, 4, 0); es.add(m);
  };
  lite(0xffffff, 18, 7, 0, 18, -8);
  lite(0x9fd0ff, 12, 14, -18, 9, 5);
  lite(0xffd9a0, 9, 12, 18, 8, 4);
  lite(0x4fd8e0, 4, 4, -5, 6, 9);
  lite(0xe7609f, 4, 4, 5, 5, 9);
  const tex = pmrem.fromScene(es, 0.04).texture;
  pmrem.dispose();
  return tex;
}
