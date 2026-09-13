// The desk, the PC case and everything inside it. Ported from the rig with the desk boards removed,
// those are devices now. Returns the anchors the world needs and the meshes that animate.
import * as THREE from 'three';
import { mats, std, addBox, addCyl, addCap, addConnector, buildFan } from './materials.js';

export function buildCase(scene, quality, haloAt) {
  const M = mats(quality);
  const anchors = {};
  const animated = { fans: [] };

  // Floor and desk.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(90, 90, 0x1d3354, 0x101d31);
  grid.position.y = 0.005; grid.material.opacity = 0.4; grid.material.transparent = true; scene.add(grid);

  const deskG = new THREE.Group();
  deskG.position.set(0.4, 0, 0.4); scene.add(deskG);
  addBox(11, 0.18, 6, M.desk, 0, 0.09, 0, deskG);
  addBox(11, 0.022, 0.022, M.caseEdge, 0, 0.185, -3.0, deskG, false);
  addBox(11, 0.022, 0.022, M.caseEdge, 0, 0.185, 3.0, deskG, false);
  anchors.desk = { top: 0.18, x0: -5.1, x1: 5.9, z0: -2.6, z1: 3.4 };

  // Case shell.
  const cg = new THREE.Group(); cg.position.set(-2.2, 0.18, 0); scene.add(cg);
  anchors.caseGroup = cg;
  addBox(2.6, 3.7, 0.1, M.caseInner, 0, 2.0, -0.7, cg);
  addBox(2.6, 0.12, 1.5, M.caseBody, 0, 0.18, 0, cg);
  addBox(2.6, 0.12, 1.5, M.caseBody, 0, 3.85, 0, cg);
  addBox(0.12, 3.7, 1.5, M.caseBody, -1.3, 2.0, 0, cg);
  addBox(0.12, 3.7, 1.5, M.caseBody, 1.3, 2.0, -0.35, cg, false);

  // Glass side panel in its own group so it can lift when the camera goes inside.
  const sideG = new THREE.Group(); cg.add(sideG);
  addBox(2.55, 3.6, 0.05, M.glass, 0, 2.0, 0.72, sideG, false);
  [[0, 0.2, 0.72, 2.6, 0.055, 0.055], [0, 3.82, 0.72, 2.6, 0.055, 0.055],
   [-1.3, 2.0, 0.72, 0.055, 3.65, 0.055], [1.3, 2.0, 0.72, 0.055, 3.65, 0.055]
  ].forEach((f) => addBox(f[3], f[4], f[5], M.caseEdge, f[0], f[1], f[2], sideG, false));
  anchors.sidePanel = sideG;

  // Front I/O strip and rear I/O shield with visible port blocks.
  addBox(0.08, 0.35, 1.45, M.caseEdge, 1.26, 3.4, 0, cg, false);
  addBox(0.06, 0.06, 0.06, M.glow(0xa7d96a), 1.28, 3.55, 0.3, cg, false);
  addBox(0.06, 0.06, 0.06, M.glow(0x4fd8e0), 1.28, 3.55, 0.0, cg, false);
  [-0.14, 0.04, 0.22].forEach((z) => addBox(0.03, 0.05, 0.10, std({ color: 0x0a0d14, metalness: 0.4, roughness: 0.6 }), 1.30, 3.28, z, cg, false));
  addBox(0.06, 0.55, 0.72, M.caseEdge, -1.25, 3.35, -0.52, cg, false);
  const portMat = std({ color: 0x0a0d14, metalness: 0.4, roughness: 0.6 });
  [[3.32, -0.62], [3.22, -0.62], [3.12, -0.62], [3.32, -0.48], [3.22, -0.48]].forEach(([y, z]) => addBox(0.03, 0.06, 0.10, portMat, -1.29, y, z, cg, false));
  addBox(0.03, 0.08, 0.12, std({ color: 0x0a1a22, metalness: 0.4, roughness: 0.6 }), -1.29, 3.44, -0.30, cg, false);
  addBox(0.02, 0.05, 0.03, M.glow(0xa7d96a), -1.30, 3.49, -0.36, cg, false);

  // Motherboard.
  addBox(2.25, 3.25, 0.06, M.mobo, -0.02, 2.05, -0.58, cg);
  for (let i = 0; i < 8; i++) addCap(0.05, 0.17, M.cap, -0.8 + i * 0.12, 0.79, -0.52, cg);
  for (let i = 0; i < 4; i++) addCap(0.04, 0.12, M.cap, -0.55 + i * 0.15, 1.85, -0.52, cg);
  for (let i = 0; i < 3; i++) addBox(2.0, 0.025, 0.09, M.caseEdge, -0.02, 1.0 + i * 0.18, -0.52, cg, false);
  for (let i = 0; i < 4; i++) addBox(0.09, 1.1, 0.65, std({ color: 0x1c1f24, metalness: 0.4, roughness: 0.5 }), -1.3 + i * 0.16, 2.63, -0.32, cg, false);
  // Copper trace from the PCIe root to the CPU socket, the "cable" for the die dive.
  addBox(0.02, 1.0, 0.004, M.copper, 0.25, 1.80, -0.545, cg, false);
  addBox(0.55, 0.02, 0.004, M.copper, -0.02, 2.30, -0.545, cg, false);
  addBox(0.02, 0.5, 0.004, M.copper, 0.25, 1.35, -0.545, cg, false);

  // PSU.
  addBox(2.2, 0.62, 1.2, M.plastic, 0, 0.62, 0, cg);
  addCyl(0.24, 0.24, 0.04, 32, M.plastic, -0.5, 0.945, 0.3, cg);
  addBox(1.7, 0.04, 0.04, M.glow(0xc8893f), 0, 0.956, 0.55, cg, false);
  for (let i = -2; i <= 2; i++) addBox(0.4, 0.008, 0.008, M.caseEdge, -0.5, 0.945, 0.3 + i * 0.04, cg, false);
  for (let i = -2; i <= 2; i++) addBox(0.008, 0.008, 0.4, M.caseEdge, -0.5 + i * 0.04, 0.945, 0.3, cg, false);
  if (haloAt) haloAt(0xc8893f, 1.1, 0, 0.95, 0.6, cg);
  [[-0.4, 0.32, 0.55], [0, 0.32, 0.55], [0.4, 0.32, 0.55]].forEach(([x, y, z]) => {
    addBox(0.06, 0.18, 0.06, M.plastic, x, y, z, cg, false);
    addBox(0.05, 0.004, 0.05, M.gold, x, y + 0.08, z, cg, false);
  });

  // CPU cooler on the socket.
  const cpuG = new THREE.Group(); cpuG.position.set(-2.5, 2.95, -0.25); scene.add(cpuG);
  addBox(0.82, 0.05, 0.82, M.hs, 0, -0.66, 0, cpuG);
  addBox(0.66, 0.14, 0.66, M.copper, 0, -0.62, 0, cpuG);
  for (let sx = -1; sx <= 1; sx += 2) for (let sz = -1; sz <= 1; sz += 2) addBox(0.06, 0.22, 0.06, M.alu, sx * 0.5, -0.55, sz * 0.5, cpuG, false);
  for (let i = 0; i < 6; i++) addCyl(0.018, 0.018, 1.1, 10, M.copper, -0.22 + i * 0.088, 0, 0, cpuG);
  const finMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.78, 0.02, 0.75), M.hs, 28);
  finMesh.castShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 28; i++) { dummy.position.set(0, -0.2 + i * 0.042, 0); dummy.updateMatrix(); finMesh.setMatrixAt(i, dummy.matrix); }
  cpuG.add(finMesh);
  const cpuFan = buildFan(0.72, 9, std({ color: 0x111520, metalness: 0.3, roughness: 0.5 }), std({ color: 0x1a1e28, metalness: 0.25, roughness: 0.55 }), 0x4fd8e0);
  cpuFan.group.position.set(0, 0.44, 0); cpuG.add(cpuFan.group);
  animated.fans.push({ pivot: cpuFan.pivot, speed: 5 });
  if (haloAt) haloAt(0x4fd8e0, 1.0, 0, -0.55, 0, cpuG);
  anchors.cpuGroup = cpuG;
  anchors.cpuCenter = new THREE.Vector3(-2.5, 2.9, -0.1);

  // RAM.
  const ramG = new THREE.Group(); ramG.position.set(-1.45, 2.65, -0.4); scene.add(ramG);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Group(); s.position.set(i * 0.16, 0, 0); ramG.add(s);
    addBox(0.07, 1.05, 0.6, M.dimm, 0, 0, 0, s);
    addBox(0.075, 0.92, 0.58, std({ color: 0x181e28, metalness: 0.75, roughness: 0.22, envMapIntensity: 1.2 }), 0, 0, 0, s, false);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.12, 0.58), std({ color: 0x181e28, metalness: 0.75, roughness: 0.22 }));
    w.position.set(0, 0.52, 0); w.rotation.z = Math.PI / 8; s.add(w);
    addBox(0.076, 0.14, 0.5, M.glow(0xa7d96a), 0, 0.56, 0, s, false);
    for (let c = 0; c < 18; c++) addBox(0.006, 0.12, 0.008, M.gold, 0, -0.52, -0.24 + c * 0.027, s, false);
    addBox(0.08, 0.035, 0.008, M.caseInner, 0, -0.46, 0.06, s, false);
  }
  if (haloAt) haloAt(0xa7d96a, 0.85, 0.24, 0.65, 0, ramG);

  // GPU, bracket at the rear so the DisplayPort is a real rear port.
  const gpuG = new THREE.Group(); gpuG.position.set(-2.35, 1.55, 0.05); scene.add(gpuG);
  addBox(2.0, 0.2, 0.92, M.pcbBlu, 0, -0.16, 0, gpuG);
  addBox(2.0, 0.22, 0.94, M.alu, 0, 0.11, 0, gpuG);
  addBox(2.0, 0.52, 0.92, M.plastic, 0, 0, 0, gpuG);
  addBox(1.92, 0.06, 0.88, M.caseEdge, 0, 0.26, 0, gpuG, false);
  addBox(1.92, 0.06, 0.88, M.caseEdge, 0, -0.26, 0, gpuG, false);
  addBox(1.85, 0.045, 0.04, M.glow(0xe7609f), 0, 0.065, 0.46, gpuG, false);
  addConnector(0.36, 0.28, 0.1, M.plastic, 0.7, 0.16, -0.44, gpuG);
  addBox(0.06, 0.55, 0.16, M.alu, -1.05, 0, -0.42, gpuG, false);
  for (let i = 0; i < 3; i++) addBox(0.03, 0.065, 0.1, portMat, -1.09, -0.15 + i * 0.13, -0.44, gpuG, false);
  addBox(0.5, 0.025, 0.02, M.gold, 0.6, -0.26, -0.44, gpuG, false);
  for (let i = 0; i < 12; i++) addBox(0.014, 0.28, 0.008, M.caseEdge, -0.85 + i * 0.08, 0, -0.44, gpuG, false);
  for (let s = -1; s <= 1; s += 2) {
    const f = buildFan(0.62, 9, M.plastic, std({ color: 0x14181f, metalness: 0.3, roughness: 0.5 }), null);
    f.group.rotation.x = Math.PI / 2; f.group.position.set(s * 0.46, 0.28, 0.12); gpuG.add(f.group);
    animated.fans.push({ pivot: f.pivot, speed: s * 7 });
  }
  if (haloAt) haloAt(0xe7609f, 1.05, 0, 0.065, 0.5, gpuG);
  anchors.gpuGroup = gpuG;

  // DAQ card in the lowest PCIe slot, ribbon header at the bracket.
  const daqG = new THREE.Group(); daqG.position.set(-2.22, 1.18, -0.40); scene.add(daqG);
  addBox(1.2, 0.38, 0.05, M.pcbGrn, 0, 0.19, 0, daqG);
  addBox(0.06, 0.5, 0.16, M.alu, -1.25 + 0.03, 0.2, -0.04, daqG, false);
  addBox(0.03, 0.09, 0.14, std({ color: 0x1c2430, metalness: 0.3, roughness: 0.7 }), -1.25, 0.16, -0.04, daqG, false);
  for (let i = 0; i < 4; i++) addBox(0.16, 0.05, 0.03, M.chip, -0.45 + i * 0.28, 0.2, 0.04, daqG, false);
  addBox(0.3, 0.12, 0.03, M.glow(0x9d84ef), 0.35, 0.2, 0.04, daqG, false);
  if (haloAt) haloAt(0x9d84ef, 0.6, 0.35, 0.2, 0.1, daqG);
  anchors.daqGroup = daqG;

  // NIC on the rear I/O, a small card beside the shield.
  addBox(0.06, 0.12, 0.16, std({ color: 0x0a1a22, metalness: 0.4, roughness: 0.6 }), -1.27, 3.44, -0.30, cg, false);

  return { M, anchors, animated, caseGroup: cg, sidePanel: sideG };
}
