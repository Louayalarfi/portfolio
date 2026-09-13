import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Lights, shadows and the environment map. The HDRI is tiered (room_2k on high, room_1k below)
// and preflighted, because a dev server answers a missing file with index.html and status 200,
// which makes the RGBE parser return nothing and throw inside the loader promise.

export function setupEnvironment(renderer, scene, quality, loader) {
  scene.background = new THREE.Color(0x04060c);
  scene.fog = new THREE.FogExp2(0x04060c, 0.028);

  scene.add(new THREE.HemisphereLight(0x8ea7d8, 0x0a0e16, 0.42));

  const key = new THREE.DirectionalLight(0xdfe8ff, 1.5);
  key.position.set(7, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  key.shadow.camera.near = 1; key.shadow.camera.far = 44;
  key.shadow.camera.left = -12; key.shadow.camera.right = 12;
  key.shadow.camera.top = 13; key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8893f, 0.5);
  fill.position.set(-9, 5, -7);
  scene.add(fill);

  const state = { key, fill, hdri: null, source: 'procedural' };
  // ?hdri=workshop swaps the room prefix so two candidate HDRIs can be compared without a rebuild.
  const prefix = new URLSearchParams(location.search).get('hdri') || 'room';
  const file = `/hdri/${quality.hdri.replace(/^room/, prefix)}.hdr`;

  const useProcedural = () => {
    scene.environment = bakeProceduralEnv(renderer);
    state.source = 'procedural';
  };

  const loadHdri = () => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    loader.track(file, true);
    new RGBELoader(loader.manager).load(
      file,
      (hdr) => {
        const env = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = env;
        if (quality.hdriBackground) {
          scene.background = env;
          scene.backgroundBlurriness = 0.5;
          scene.backgroundIntensity = 0.06;
        }
        // Studio HDRIs are bright, the desk scene is meant to read as a dim room lit by its screens.
        renderer.toneMappingExposure = 0.78;
        key.intensity = 0.9;
        hdr.dispose(); pmrem.dispose();
        state.hdri = file; state.source = 'hdri';
      },
      undefined,
      () => { pmrem.dispose(); useProcedural(); }
    );
  };

  fetch(file, { method: 'HEAD' })
    .then((r) => {
      const type = r.headers.get('content-type') || '';
      if (r.ok && !/text\/html/i.test(type)) loadHdri();
      else useProcedural();
    })
    .catch(useProcedural);

  return state;
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
