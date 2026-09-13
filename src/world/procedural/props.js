// Procedural stand ins for the desk props until GLBs land: oscilloscope, pellet printer, GUIDE headset,
// MAGLEV rig, rocket wing. Each returns a group whose origin sits on the surface under the object.
import * as THREE from 'three';
import { mats, std, addBox, addCyl, addSphere, labelTexture } from './materials.js';

export function buildScope(spec, quality) {
  const M = mats(quality);
  const g = new THREE.Group();
  addBox(0.95, 0.5, 0.5, M.plastic, 0, 0.25, 0, g);
  addBox(0.97, 0.06, 0.52, M.caseEdge, 0, 0.03, 0, g, false);
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const x = c.getContext('2d');
  x.fillStyle = '#04110c'; x.fillRect(0, 0, 512, 320);
  x.strokeStyle = 'rgba(63,207,142,.18)'; x.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { x.beginPath(); x.moveTo(i * 51.2, 0); x.lineTo(i * 51.2, 320); x.stroke(); }
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(0, i * 40); x.lineTo(512, i * 40); x.stroke(); }
  x.strokeStyle = '#f0a830'; x.lineWidth = 3; x.beginPath();
  for (let px = 0; px < 512; px++) { const y = 160 + Math.sin(px / 22) * 70 * (px % 128 < 64 ? 1 : 0.55); px ? x.lineTo(px, y) : x.moveTo(px, y); }
  x.stroke();
  x.fillStyle = '#3fcf8e'; x.font = "600 18px 'IBM Plex Mono',monospace"; x.fillText('CH1 1.00V  2.00ms  Trig 0.52V', 12, 300);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.35), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(-0.12, 0.27, 0.251); g.add(screen);
  for (let i = 0; i < 6; i++) addCyl(0.02, 0.02, 0.02, 12, M.alu, 0.24 + (i % 3) * 0.09, 0.36 - Math.floor(i / 3) * 0.14, 0.26, g);
  for (let i = 0; i < 2; i++) addCyl(0.018, 0.018, 0.03, 12, M.gold, 0.22 + i * 0.16, 0.09, 0.27, g);
  addBox(0.09, 0.06, 0.06, M.alu, -0.475, 0.2, 0, g, false);
  g.userData.center = new THREE.Vector3(0, 0.28, 0);
  return g;
}

export function buildPrinter(spec, quality) {
  const M = mats(quality);
  const g = new THREE.Group();
  addBox(1.0, 0.16, 1.0, M.plastic, 0, 0.08, 0, g);
  addBox(0.86, 0.02, 0.86, M.alu, 0, 0.18, 0, g, false);
  for (const sx of [-1, 1]) addBox(0.06, 1.1, 0.06, M.caseEdge, sx * 0.44, 0.7, -0.2, g);
  addBox(0.98, 0.06, 0.06, M.caseEdge, 0, 1.22, -0.2, g);
  addBox(0.98, 0.05, 0.05, M.alu, 0, 0.72, -0.2, g);
  const head = addBox(0.16, 0.2, 0.16, M.plastic, -0.1, 0.62, -0.1, g);
  addCyl(0.05, 0.05, 0.3, 16, M.alu, -0.1, 0.86, -0.1, g);
  addCyl(0.03, 0.03, 0.22, 12, M.copper, -0.1, 1.05, -0.1, g);
  addBox(0.22, 0.22, 0.06, M.caseEdge, 0.42, 0.34, 0.48, g, false);
  addBox(0.18, 0.12, 0.005, M.glow(0x4fd8e0), 0.42, 0.36, 0.515, g, false);
  addBox(0.09, 0.06, 0.06, M.alu, -0.5, 0.35, 0, g, false);
  g.userData.center = new THREE.Vector3(0, 0.6, 0);
  g.userData.head = head;
  return g;
}

export function buildHeadset(spec, quality) {
  const M = mats(quality);
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 12, 48, Math.PI * 1.35), M.plastic);
  band.rotation.x = Math.PI / 2; band.rotation.z = Math.PI * 0.18; band.position.y = 0.2; g.add(band);
  addCyl(0.05, 0.05, 0.06, 20, M.alu, 0, 0.32, 0.2, g);
  addCyl(0.035, 0.035, 0.02, 20, M.glow(0xf0a830), 0, 0.36, 0.2, g);
  addBox(0.12, 0.08, 0.06, M.pcbBlu, 0, 0.14, 0.24, g, false);
  for (const sx of [-1, 1]) addBox(0.05, 0.05, 0.05, M.plastic, sx * 0.2, 0.12, -0.02, g, false);
  addBox(0.02, 0.6, 0.02, M.alu, 0.05, 0.3, -0.25, g, false);
  addBox(0.06, 0.04, 0.06, M.glow(0xa7d96a), 0.05, 0.03, -0.25, g, false);
  g.userData.center = new THREE.Vector3(0, 0.22, 0);
  return g;
}

export function buildMaglev(spec, quality) {
  const M = mats(quality);
  const g = new THREE.Group();
  addBox(0.62, 0.08, 0.62, M.plastic, 0, 0.04, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addCyl(0.015, 0.015, 0.7, 10, M.alu, sx * 0.24, 0.43, sz * 0.24, g);
  addBox(0.58, 0.06, 0.58, M.plastic, 0, 0.8, 0, g);
  addCyl(0.12, 0.12, 0.16, 24, M.copper, 0, 0.69, 0, g);
  addCyl(0.04, 0.04, 0.2, 12, M.caseInner, 0, 0.69, 0, g);
  const ball = addSphere(0.06, 20, std({ color: 0x9aa3b0, metalness: 0.95, roughness: 0.2 }), 0, 0.45, 0, g);
  addBox(0.14, 0.02, 0.14, M.glow(0x9d84ef), 0, 0.09, 0, g, false);
  addBox(0.12, 0.09, 0.06, M.alu, 0.30, 0.16, 0, g, false);
  g.userData.center = new THREE.Vector3(0, 0.45, 0);
  g.userData.ball = ball;
  return g;
}

export function buildWing(spec, quality) {
  const M = mats(quality);
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.36, 0); shape.lineTo(0.36, 0.02); shape.lineTo(0.30, 0.16); shape.lineTo(-0.30, 0.09); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3 });
  const m = new THREE.Mesh(geo, std({ color: 0xe0e4ea, metalness: 0.05, roughness: 0.6 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.045; m.castShadow = true; g.add(m);
  addBox(0.1, 0.045, 0.16, M.plastic, -0.3, 0.02, 0.05, g, false);
  g.userData.center = new THREE.Vector3(0, 0.08, 0);
  return g;
}

// A back wall and a side wall so the desk sits in a room rather than on an infinite floor.
export function buildRoom(scene, quality) {
  const M = mats(quality);
  const wallMat = std({ color: 0x0b0f17, metalness: 0.05, roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(44, 14), wallMat);
  back.position.set(0.4, 7, -4.6); back.receiveShadow = true; scene.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), wallMat);
  side.position.set(-9.5, 7, 6); side.rotation.y = Math.PI / 2; side.receiveShadow = true; scene.add(side);
  const skirting = new THREE.Mesh(new THREE.BoxGeometry(44, 0.25, 0.06), M.caseEdge);
  skirting.position.set(0.4, 0.125, -4.57); scene.add(skirting);
  return { back, side };
}

export function labelPlane(text, sub, accent, w = 0.5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), new THREE.MeshBasicMaterial({ map: labelTexture(text, sub, accent), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
