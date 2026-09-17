import * as THREE from 'three';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass }        from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { BokehPass }       from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js';

// Pass order matters: SSAO needs the raw render, bloom must not be darkened by SSAO,
// bokeh blurs the lit result, OutputPass applies tone mapping and colour space last.
export function createComposer(renderer, scene, camera, quality) {
  if (!quality.passes.length) return null;

  const w = innerWidth, h = innerHeight;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  let ssao = null, bloom = null, bokeh = null;

  if (quality.passes.includes('ssao')) {
    ssao = new SSAOPass(scene, camera, w, h);
    ssao.kernelRadius = 0.55;
    ssao.minDistance = 0.002;
    ssao.maxDistance = 0.07;
    ssao.output = SSAOPass.OUTPUT.Default;
    composer.addPass(ssao);
  }

  if (quality.passes.includes('bloom')) {
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.5, 0.92);
    composer.addPass(bloom);
  }

  if (quality.passes.includes('bokeh')) {
    bokeh = new BokehPass(scene, camera, { focus: 11, aperture: 0.00025, maxblur: 0.008 });
    composer.addPass(bokeh);
  }

  composer.addPass(new OutputPass());
  composer.setSize(w, h);

  function setFocus(distance, aperture) {
    if (!bokeh) return;
    bokeh.uniforms.focus.value = distance;
    if (aperture !== undefined) bokeh.uniforms.aperture.value = aperture;
  }

  function setSize(width, height) {
    composer.setSize(width, height);
    if (ssao) ssao.setSize(width, height);
    if (bloom) bloom.setSize(width, height);
  }

  return { composer, bloom, ssao, bokeh, setFocus, setSize, render: () => composer.render() };
}
