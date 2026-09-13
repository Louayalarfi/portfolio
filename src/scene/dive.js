// Builds the plasma tunnel a dive flies through. The curve is the cable's own path.
import * as THREE from 'three';
import { PLASMA_VERT, plasmaFrag } from '../shaders/plasma.js';

export function makeDive(scene, pts, hex, radius, octaves = 5) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 200;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(hex) } },
    vertexShader: PLASMA_VERT, fragmentShader: plasmaFrag(octaves),
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, fog: false
  });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, radius, 24, false), mat);
  tube.visible = false; tube.renderOrder = 3; scene.add(tube);
  return { curve, tunnel: tube, tmat: mat };
}
