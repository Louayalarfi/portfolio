import * as THREE from 'three';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass }        from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js';
// BokehPass not available in all Three.js builds, use ShaderPass with a custom DOF instead
// import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // ── Unreal Bloom, makes neon cables / RGB glow pop ──────────────────────
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85,   // strength  (raise for more glow)
    0.55,   // radius
    0.78    // threshold (only pixels brighter than this bloom)
  );
  composer.addPass(bloom);

  // ── SSAO, adds deep contact shadows between components ──────────────────
  const ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
  ssao.kernelRadius  = 0.55;
  ssao.minDistance   = 0.002;
  ssao.maxDistance   = 0.07;
  ssao.output        = SSAOPass.OUTPUT.Default;
  composer.addPass(ssao);

  // OutputPass keeps tone mapping + color space correct, must stay last
  composer.addPass(new OutputPass());

  composer.setSize(window.innerWidth, window.innerHeight);
  return { composer, bloom, ssao };
}
