// Procedural dev boards: a PCB slab sized to the footprint with a big chip, headers, a jack block,
// LEDs and a silkscreen label. A photo decal replaces the top face when one exists (M4).
import * as THREE from 'three';
import { mats, std, addBox, addCyl, addChip, addCap, labelTexture } from './materials.js';

const FAMILY = {
  stm: { pcb: 'pcbBlu', accent: '#f0a830', chip: 0.24 },
  k60: { pcb: 'pcbDrk', accent: '#f0a830', chip: 0.22 },
  xil: { pcb: 'pcbGrn', accent: '#e7609f', chip: 0.34 },
  alt: { pcb: 'pcbBlu', accent: '#e7609f', chip: 0.32 }
};

export function buildBoard(spec, quality) {
  const M = mats(quality);
  const fam = FAMILY[spec.family] || FAMILY.stm;
  const [w, d] = spec.footprint;
  const g = new THREE.Group();

  addBox(w, 0.05, d, M[fam.pcb], 0, 0.025, 0, g);
  // Standoffs.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addCyl(0.012, 0.012, 0.03, 8, M.alu, sx * (w / 2 - 0.04), 0.015, sz * (d / 2 - 0.04), g);

  const chip = fam.chip;
  addChip(chip, 0.035, chip, M.chip, 0.05, 0.068, 0.0, g, M.lead);
  if (spec.family === 'xil' || spec.family === 'alt') addBox(chip * 0.9, 0.03, chip * 0.9, M.hs, 0.05, 0.10, 0.0, g, false);

  // Headers along the long edges.
  const n = Math.floor((w - 0.16) / 0.032);
  for (let i = 0; i < n; i++) {
    addBox(0.014, 0.05, 0.014, M.plastic, -w / 2 + 0.08 + i * 0.032, 0.075, d / 2 - 0.05, g, false);
    addBox(0.014, 0.05, 0.014, M.plastic, -w / 2 + 0.08 + i * 0.032, 0.075, -d / 2 + 0.05, g, false);
  }
  for (let i = 0; i < 3; i++) addCap(0.02, 0.06, M.cap, w / 2 - 0.12, 0.05, -0.12 + i * 0.1, g);
  for (let i = 0; i < 4; i++) addChip(0.05, 0.02, 0.05, M.smd, -0.2 + i * 0.1, 0.06, d * 0.28, g, M.lead);

  // Jack block where the cable lands.
  if (spec.jack) {
    const j = spec.jack.pos;
    addBox(0.09, 0.09, 0.11, M.alu, j[0] + 0.045 * -spec.jack.normal[0], 0.095, j[2], g, false);
    addBox(0.005, 0.06, 0.08, std({ color: 0x1e2226, metalness: 0.3, roughness: 0.7 }), j[0], 0.095, j[2], g, false);
  }
  if (spec.jack2) {
    const j = spec.jack2.pos;
    addBox(0.09, 0.09, 0.11, M.alu, j[0] + 0.045 * -spec.jack2.normal[0], 0.095, j[2], g, false);
  }

  // LEDs.
  addBox(0.02, 0.012, 0.02, M.glow(0x00ff44), w / 2 - 0.08, 0.056, d / 2 - 0.1, g, false);
  addBox(0.02, 0.012, 0.02, M.glow(parseInt(fam.accent.slice(1), 16)), w / 2 - 0.12, 0.056, d / 2 - 0.1, g, false);

  // Silkscreen label.
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.55, w * 0.55 * 0.5), new THREE.MeshBasicMaterial({ map: labelTexture(spec.label, spec.sub || '', fam.accent), transparent: true, depthWrite: false }));
  lab.rotation.x = -Math.PI / 2; lab.position.set(-w * 0.12, 0.052, -d * 0.02);
  g.add(lab);

  g.userData.center = new THREE.Vector3(0, 0.08, 0);
  return g;
}
