// Photo-realistic procedural PC rig.
// Every component hand-built with PBR materials and detailed sub-geometry.
// >>> When GLTF models are available, swap buildXxx() calls to loadModel().

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { pcbTex } from '../ui/utils.js';

const loader = new GLTFLoader();

export function loadModel(file, { position=[0,0,0], scale=1, rotationY=0 }={}) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = rotationY;
  loader.load(`assets/models/${file}`,
    gltf => {
      gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow=true; o.receiveShadow=true; } });
      gltf.scene.scale.setScalar(scale);
      group.add(gltf.scene);
    }, undefined,
    err => console.warn('[rig] model failed:', file, err)
  );
  return group;
}

// ─── material helpers ──────────────────────────────────────────────────────
const std = o => new THREE.MeshStandardMaterial(o);
const phys = o => new THREE.MeshPhysicalMaterial(o);

// Pre-built shared materials
function makeMats(pcbGreen, pcbBlue, pcbDark) {
  return {
    floor:    std({ color:0x070a11, metalness:0.3,  roughness:0.7  }),
    desk:     std({ color:0x14110d, metalness:0.25, roughness:0.65 }),
    caseBody: std({ color:0x12161e, metalness:0.92, roughness:0.28, envMapIntensity:1.3 }),
    caseEdge: std({ color:0x2a2f38, metalness:1,    roughness:0.18, envMapIntensity:1.4 }),
    caseInner:std({ color:0x090c12, metalness:0.5,  roughness:0.6  }),
    glass:    phys({ color:0xbfe6f0, metalness:0, roughness:0.04, transmission:0.88, transparent:true, opacity:0.25, clearcoat:1, clearcoatRoughness:0.04, envMapIntensity:1.8, side:THREE.DoubleSide }),
    mobo:     std({ map:pcbGreen, color:0x3a7558, metalness:0.18, roughness:0.65 }),
    moboBlue: std({ map:pcbBlue,  color:0x3a6080, metalness:0.18, roughness:0.65 }),
    hs:       std({ color:0xb0bac8, metalness:0.95, roughness:0.22, envMapIntensity:1.4 }),
    alu:      std({ color:0x9aa3b0, metalness:0.98, roughness:0.25, envMapIntensity:1.3 }),
    copper:   std({ color:0xc8893f, metalness:0.98, roughness:0.28, envMapIntensity:1.3 }),
    gold:     std({ color:0xd9b25a, metalness:0.98, roughness:0.32, envMapIntensity:1.2 }),
    plastic:  std({ color:0x0c0f15, metalness:0.22, roughness:0.5  }),
    dimm:     std({ color:0x14181f, metalness:0.45, roughness:0.38 }),
    rubber:   std({ color:0x060810, metalness:0.0,  roughness:0.92 }),
    pcbGrn:   std({ map:pcbGreen, color:0x2faa70, metalness:0.15, roughness:0.6 }),
    pcbBlu:   std({ map:pcbBlue,  color:0x3f6f9f, metalness:0.2,  roughness:0.58}),
    pcbDrk:   std({ map:pcbDark,  color:0x2faa70, metalness:0.15, roughness:0.6 }),
    glow:  hex => std({ color:0x060810, emissive:hex, emissiveIntensity:1.8, metalness:0.3, roughness:0.5 }),
  };
}

// ─── geometry helpers ──────────────────────────────────────────────────────
function addBox(w,h,d,mat,x,y,z,parent,shadow=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z); if(shadow){m.castShadow=true;m.receiveShadow=true;}
  parent.add(m); return m;
}
function addCyl(rt,rb,h,seg,mat,x,y,z,parent){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true;
  parent.add(m); return m;
}
function addSphere(r,seg,mat,x,y,z,parent){
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,seg,seg),mat);
  m.position.set(x,y,z); m.castShadow=true;
  parent.add(m); return m;
}

// Curved fan blade via ExtrudeGeometry
function makeFanBlade(bladeLen, bladeW, bladeThick, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(bladeW*0.3, bladeLen*0.1, bladeW*0.7, bladeLen*0.4, bladeW, bladeLen);
  shape.lineTo(bladeW*0.7, bladeLen);
  shape.bezierCurveTo(bladeW*0.4, bladeLen*0.4, bladeW*0.05, bladeLen*0.1, -bladeThick, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth:bladeThick*0.5, bevelEnabled:true, bevelSize:0.004, bevelThickness:0.004, bevelSegments:2 });
  geo.rotateX(-Math.PI/2);
  return new THREE.Mesh(geo, mat);
}

// Build a realistic fan assembly and return { group, pivot }
function buildFan(diameter, bladeCount, mat_plastic, mat_blade, glow_hex, glow_mat, scene_or_parent) {
  const radius = diameter/2;
  const group  = new THREE.Group();

  // outer ring frame
  addCyl(radius, radius, 0.04, 32, mat_plastic, 0, 0, 0, group);
  addCyl(radius-0.04, radius-0.04, 0.06, 32, mat_plastic, 0, 0, 0, group);

  // hub
  addCyl(0.065, 0.065, 0.07, 20, std({color:0x222831, metalness:0.5, roughness:0.4}), 0, 0, 0, group);
  addCyl(0.028, 0.028, 0.04, 12, std({color:0x1a1e24, metalness:0.6, roughness:0.3}), 0, 0.02, 0, group);

  // spinning pivot group
  const pivot = new THREE.Group();
  group.add(pivot);

  for (let i=0; i<bladeCount; i++) {
    const blade = makeFanBlade(radius*0.84, radius*0.22, 0.012, mat_blade);
    blade.position.y = 0.005;
    blade.rotation.y = (i/bladeCount)*Math.PI*2;
    pivot.add(blade);
  }

  // RGB ring sprite
  if (glow_hex) {
    const ringGeo = new THREE.TorusGeometry(radius-0.008, 0.006, 8, 64);
    const ringMat = std({ color:0x080808, emissive:glow_hex, emissiveIntensity:2.2, metalness:0.3, roughness:0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI/2;
    group.add(ring);
  }

  return { group, pivot };
}

// Connector housing (modular PSU / PCIe / SATA)
function addConnector(w,h,d,mat,x,y,z,parent,pinRows=2,pinCols=4) {
  addBox(w,h,d,mat,x,y,z,parent);
  const pinMat = std({color:0xd9b25a,metalness:0.98,roughness:0.3,envMapIntensity:1.2});
  const pw=w/(pinCols*1.6), ph=h*0.6, spacing_x=w/pinCols, spacing_z=d*0.08;
  for(let r=0;r<pinRows;r++) for(let c=0;c<pinCols;c++) {
    const px = x - w/2 + spacing_x*(c+0.5);
    const py = y - h/2 + ph/2 + 0.005;
    const pz = z + d/2 - spacing_z*(r+1);
    addBox(pw*0.4, ph, 0.006, pinMat, px, py, pz, parent, false);
  }
}

// SMD chip
function addChip(w,h,d,mat,x,y,z,parent) {
  addBox(w,h,d,mat,x,y,z,parent,false);
  // leads
  const leadMat = std({color:0xb0b8c0,metalness:0.95,roughness:0.2});
  const leads = Math.floor(w/0.018);
  for(let i=0;i<leads;i++){
    const lx = x - w/2 + (w/(leads))*i + w/(leads*2);
    addBox(0.006,0.003,0.01,leadMat,lx,y-h/2,z+d/2+0.004,parent,false);
    addBox(0.006,0.003,0.01,leadMat,lx,y-h/2,z-d/2-0.004,parent,false);
  }
}

// Capacitor
function addCap(r,h,mat,x,y,z,parent) {
  addCyl(r,r,h,12,mat,x,y+h/2,z,parent);
  addBox(r*1.8,0.004,r*1.8,std({color:0x888,metalness:0.9,roughness:0.3}),x,y+h+0.001,z,parent,false);
}

// ─── MAIN BUILD FUNCTION ───────────────────────────────────────────────────
export function buildRig(scene, extras={}) {
  const { haloAt } = extras;
  const pcbGreen = pcbTex(THREE, '#0c2e22','#3fcf8e');
  const pcbBlue  = pcbTex(THREE, '#0d2038','#3f8fd0');
  const pcbDark  = pcbTex(THREE, '#08130e','#2fae78');
  const M = makeMats(pcbGreen, pcbBlue, pcbDark);

  const components = {};

  // ── FLOOR + DESK ──────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90,90), M.floor);
  floor.rotation.x = -Math.PI/2; floor.receiveShadow=true; scene.add(floor);
  const grid = new THREE.GridHelper(90,90,0x1d3354,0x101d31);
  grid.position.y=0.005; grid.material.opacity=0.4; grid.material.transparent=true; scene.add(grid);

  // Desk surface
  const deskG = new THREE.Group();
  deskG.position.set(0.4,0,0.4); scene.add(deskG);
  addBox(11,0.18,6,M.desk,0,0.09,0,deskG);
  // desk edge trim
  addBox(11,0.022,0.022,M.caseEdge,0,0.185,-3.0,deskG,false);
  addBox(11,0.022,0.022,M.caseEdge,0,0.185, 3.0,deskG,false);

  // ── CASE ──────────────────────────────────────────────────────────────────
  const cg = new THREE.Group(); cg.position.set(-2.2,0.18,0); scene.add(cg);

  // main panels
  addBox(2.6,3.7,0.1,M.caseInner,0,2.0,-0.7,cg);        // back panel
  addBox(2.6,0.12,1.5,M.caseBody,0,0.18,0,cg);           // bottom
  addBox(2.6,0.12,1.5,M.caseBody,0,3.85,0,cg);           // top
  addBox(0.12,3.7,1.5,M.caseBody,-1.3,2.0,0,cg);         // left
  addBox(0.12,3.7,1.5,M.caseBody,1.3,2.0,-0.35,cg,false);// right (behind glass)
  // tempered glass side panel
  addBox(2.55,3.6,0.05,M.glass,0,2.0,0.72,cg,false);
  // glass frame edges
  [[0,0.2,0.72,2.6,0.055,0.055],[0,3.82,0.72,2.6,0.055,0.055],
   [-1.3,2.0,0.72,0.055,3.65,0.055],[1.3,2.0,0.72,0.055,3.65,0.055]
  ].forEach(f=>addBox(f[3],f[4],f[5],M.caseEdge,f[0],f[1],f[2],cg,false));
  // front panel I/O strip
  addBox(0.08,0.35,1.45,M.caseEdge,1.26,3.4,0,cg,false);
  addBox(0.06,0.06,0.06,M.glow(0xa7d96a),1.28,3.55,0.3,cg,false); // power LED
  addBox(0.06,0.06,0.06,M.glow(0x4fd8e0),1.28,3.55,0.0,cg,false); // activity LED

  // motherboard tray
  addBox(2.25,3.25,0.06,M.mobo,-0.02,2.05,-0.58,cg);
  // mobo capacitors
  const capMat = std({color:0x1a2538,metalness:0.55,roughness:0.4});
  for(let i=0;i<8;i++) addCap(0.05,0.17,capMat,-0.8+i*0.12,0.79,-0.52,cg);
  for(let i=0;i<4;i++) addCap(0.04,0.12,capMat,-0.55+i*0.15,1.85,-0.52,cg);
  // PCIe slots
  for(let i=0;i<3;i++) addBox(2.0,0.025,0.09,M.caseEdge,-0.02,1.0+i*0.18,-0.52,cg,false);
  // RAM slots outlines
  for(let i=0;i<4;i++) addBox(0.09,1.1,0.65,std({color:0x1c1f24,metalness:0.4,roughness:0.5}),-1.3+i*0.16,2.63,-0.32,cg,false);
  // IO shield
  addBox(0.06,0.55,0.72,M.caseEdge,-1.25,3.35,-0.52,cg,false);

  // PSU
  addBox(2.2,0.62,1.2,M.plastic,0,0.62,0,cg);
  addCyl(0.24,0.24,0.04,32,M.plastic,-0.5,0.945,0.3,cg);  // PSU fan
  addBox(1.7,0.04,0.04,M.glow(0xc8893f),0,0.956,0.55,cg,false); // PSU LED strip
  // PSU fan grille
  for(let i=-2;i<=2;i++) addBox(0.4,0.008,0.008,M.caseEdge,-0.5,0.945,0.3+i*0.04,cg,false);
  for(let i=-2;i<=2;i++) addBox(0.008,0.008,0.4,M.caseEdge,-0.5+i*0.04,0.945,0.3,cg,false);
  if(haloAt) haloAt(0xc8893f,1.1,0,0.95,0.6,cg);

  // modular PSU cables coming out bottom
  [[-0.4,0.32,0.55],[0,0.32,0.55],[0.4,0.32,0.55]].forEach(([x,y,z])=>{
    addBox(0.06,0.18,0.06,M.plastic,x,y,z,cg,false);
    addBox(0.05,0.004,0.05,M.gold,x,y+0.08,z,cg,false);
  });

  // ── CPU COOLER (vlsi region) ──────────────────────────────────────────────
  const cpuG = new THREE.Group(); cpuG.position.set(-2.5,2.95,-0.25); scene.add(cpuG);

  // IHS (integrated heat spreader), nickel-plated copper
  addBox(0.82,0.05,0.82,M.hs,0,-0.66,0,cpuG);
  addBox(0.66,0.14,0.66,M.copper,0,-0.62,0,cpuG);    // copper base
  // mounting brackets
  for(let sx=-1;sx<=1;sx+=2) for(let sz=-1;sz<=1;sz+=2)
    addBox(0.06,0.22,0.06,M.alu,sx*0.5,-.55,sz*0.5,cpuG,false);

  // 6 copper heat pipes through fins
  for(let i=0;i<6;i++) {
    const xp = -0.22 + i*0.088;
    addCyl(0.018,0.018,1.1,10,M.copper,xp,0,0,cpuG);
  }

  // 28 heatsink fins (InstancedMesh for performance)
  const finGeo = new THREE.BoxGeometry(0.78,0.02,0.75);
  const finMesh = new THREE.InstancedMesh(finGeo,M.hs,28);
  finMesh.castShadow=true;
  const dummy = new THREE.Object3D();
  for(let i=0;i<28;i++){
    dummy.position.set(0,-0.2+i*0.042,0);
    dummy.rotation.set(0,0,0); dummy.scale.set(1,1,1);
    dummy.updateMatrix(); finMesh.setMatrixAt(i,dummy.matrix);
  }
  cpuG.add(finMesh);

  // fan assembly (120mm)
  const cpuFanMat = std({color:0x111520,metalness:0.3,roughness:0.5});
  const cpuBladeMat = std({color:0x1a1e28,metalness:0.25,roughness:0.55});
  const { group:fanGroup, pivot:fanPivot } = buildFan(0.72, 9, cpuFanMat, cpuBladeMat, 0x4fd8e0, null, cpuG);
  fanGroup.position.set(0,0.44,0);
  cpuG.add(fanGroup);
  if(haloAt) haloAt(0x4fd8e0,1.0,0,-0.55,0,cpuG);

  components.vlsi = { group:cpuG, center:new THREE.Vector3(-2.5,2.9,-0.1), fan:fanPivot };

  // ── RAM STICKS (software region) ──────────────────────────────────────────
  const ramG = new THREE.Group(); ramG.position.set(-1.45,2.65,-0.4); scene.add(ramG);
  for(let i=0;i<4;i++){
    const stickG = new THREE.Group(); stickG.position.set(i*0.16,0,0); ramG.add(stickG);
    // PCB
    addBox(0.07,1.05,0.6,M.dimm,0,0,0,stickG);
    // heat spreader (angled top)
    addBox(0.075,0.92,0.58,std({color:0x181e28,metalness:0.75,roughness:0.22,envMapIntensity:1.2}),0,0,0,stickG,false);
    // angled top edge (wedge)
    const wGeo = new THREE.BoxGeometry(0.076,0.12,0.58);
    const wMesh = new THREE.Mesh(wGeo, std({color:0x181e28,metalness:0.75,roughness:0.22}));
    wMesh.position.set(0,0.52,0); wMesh.rotation.z = Math.PI/8; stickG.add(wMesh);
    // RGB bar
    addBox(0.076,0.14,0.5,M.glow(0xa7d96a),0,0.56,0,stickG,false);
    // gold contacts at bottom
    const contactMat = M.gold;
    for(let c=0;c<18;c++) addBox(0.006,0.12,0.008,contactMat,0,-0.52,-0.24+c*0.027,stickG,false);
    // notch
    addBox(0.08,0.035,0.008,M.caseInner,0,-0.46,0.06,stickG,false);
  }
  if(haloAt) haloAt(0xa7d96a,0.85,0.24,0.65,0,ramG);
  components.software = { group:ramG, center:new THREE.Vector3(-1.2,2.7,-0.2) };

  // ── GPU (fpga region) ─────────────────────────────────────────────────────
  const gpuG = new THREE.Group(); gpuG.position.set(-2.35,1.55,0.05); scene.add(gpuG);

  // Main PCB
  addBox(2.0,0.2,0.92,M.pcbBlu,0,-0.16,0,gpuG);
  // Backplate
  addBox(2.0,0.22,0.94,M.alu,0,0.11,0,gpuG);
  // Body shroud, assembled from panels
  addBox(2.0,0.52,0.92,M.plastic,0,0,0,gpuG);         // main body
  addBox(1.92,0.06,0.88,M.caseEdge,0,0.26,0,gpuG,false); // top trim
  addBox(1.92,0.06,0.88,M.caseEdge,0,-0.26,0,gpuG,false);// bottom trim
  // RGB strip
  addBox(1.85,0.045,0.04,M.glow(0xe7609f),0,0.065,0.46,gpuG,false);
  // PCIe power connector
  addConnector(0.36,0.28,0.1,M.plastic,0.7,0.16,-0.44,gpuG);
  // Display port connectors
  for(let i=0;i<3;i++) addBox(0.1,0.065,0.06,M.alu,-0.98+i*0.14,0,0.44,gpuG,false);
  addBox(0.14,0.09,0.06,M.alu,-0.98+3*0.14+0.07,0,0.44,gpuG,false); // HDMI wider
  // PCIe fingers
  addBox(0.5,0.025,0.02,M.gold,0.6,-0.26,-0.44,gpuG,false);
  // vent slots on shroud
  for(let i=0;i<12;i++) addBox(0.014,0.28,0.008,M.caseEdge,-0.85+i*0.08,0,-0.44,gpuG,false);

  // dual fans
  const gpuBladeMat = std({color:0x14181f,metalness:0.3,roughness:0.5});
  const gf = [];
  for(let s=-1;s<=1;s+=2){
    const { group:fg, pivot:fp } = buildFan(0.62, 9, M.plastic, gpuBladeMat, null, null);
    fg.rotation.x = Math.PI/2;
    fg.position.set(s*0.46,0.28,0.12);
    gpuG.add(fg);
    gf.push(fp);
  }
  if(haloAt) haloAt(0xe7609f,1.05,0,0.065,0.5,gpuG);
  components.fpga = { group:gpuG, center:new THREE.Vector3(-2.1,1.6,0.2), fans:gf };

  // ── EMBEDDED DEV BOARD (Arduino Mega-style) ───────────────────────────────
  const ardG = new THREE.Group(); ardG.position.set(1.5,0.97,1.7); ardG.rotation.y=-0.5; scene.add(ardG);
  // PCB
  addBox(1.28,0.055,0.85,M.pcbDrk,0,0,0,ardG);
  // Aluminum heatsink plate on MCU
  addBox(0.38,0.14,0.52,M.alu,-0.34,0.1,0,ardG);
  // Main MCU (ATMega/Zynq chip)
  addChip(0.26,0.04,0.28,std({color:0x0a0c10,metalness:0.15,roughness:0.7}),0.28,0.05,0,ardG);
  // SMD components
  for(let i=0;i<5;i++) addChip(0.05,0.022,0.05,std({color:0x12141a,metalness:0.2,roughness:0.6}),0.1+i*0.14,0.04,0.28,ardG);
  for(let i=0;i<3;i++) addCap(0.022,0.065,capMat,0.55,0.04,-0.25+i*0.12,ardG);
  // Crystal oscillator
  addBox(0.055,0.03,0.024,M.alu,0.18,0.04,0.25,ardG,false);
  // USB-B connector
  addBox(0.1,0.1,0.08,M.alu,-0.6,0.06,-0.38,ardG,false);
  addBox(0.07,0.072,0.005,std({color:0x1e2226,metalness:0.3,roughness:0.7}),-0.6,0.06,-0.35,ardG,false);
  // 40-pin header rows
  for(let i=0;i<20;i++){
    addBox(0.014,0.05,0.014,M.plastic,-0.55+i*0.032,0.038,0.35,ardG,false);
    addBox(0.014,0.05,0.014,M.plastic,-0.55+i*0.032,0.038,0.28,ardG,false);
  }
  // Power barrel jack
  addCyl(0.03,0.03,0.05,12,M.alu,-0.58,0.04,-0.22,ardG);
  // Status LEDs
  addSphere(0.014,8,std({color:0x0a0,emissive:0x00ff44,emissiveIntensity:2.5}),0.55,0.046,-0.35,ardG);
  addSphere(0.014,8,M.glow(0xf0a830),0.55,0.046,-0.32,ardG);
  if(haloAt) haloAt(0xf0a830,0.65,0.28,0.12,0,ardG);
  components.embedded = { group:ardG, center:new THREE.Vector3(1.5,1.12,1.7) };

  // ── CONTROL BOARD (DSP / FPGA eval board) ────────────────────────────────
  const ctlG = new THREE.Group(); ctlG.position.set(2.9,0.97,0.95); ctlG.rotation.y=-0.7; scene.add(ctlG);
  addBox(1.1,0.055,0.88,M.pcbBlu,0,0,0,ctlG);
  // Main FPGA chip
  addChip(0.3,0.04,0.3,std({color:0x0b0d12,metalness:0.18,roughness:0.65}),-0.18,0.05,0,ctlG);
  addBox(0.3,0.02,0.3,M.hs,-0.18,0.07,0,ctlG,false); // heatsink on top
  // Op-amp chips
  for(let i=0;i<4;i++) addChip(0.07,0.025,0.05,std({color:0x14161c,metalness:0.2,roughness:0.6}),0.2+i*0.1,0.04,0.22,ctlG);
  // BNC connector
  addCyl(0.042,0.042,0.065,16,M.alu,0.46,0.065,-0.42,ctlG);
  addCyl(0.024,0.024,0.04,12,M.gold,0.46,0.065,-0.38,ctlG);
  // Potentiometers
  for(let i=0;i<3;i++) { addCyl(0.024,0.024,0.04,12,M.alu,-0.35+i*0.1,0.06,0.38,ctlG); addCyl(0.006,0.006,0.06,8,M.alu,-0.35+i*0.1,0.095,0.38,ctlG); }
  // Caps
  for(let i=0;i<4;i++) addCap(0.028,0.075,capMat,0.3,0.03,-0.3+i*0.09,ctlG);
  // Glow component
  addBox(0.3,0.2,0.3,M.glow(0x9d84ef),-0.22,0.13,0,ctlG);
  if(haloAt) haloAt(0x9d84ef,0.7,0,0.13,0,ctlG);
  // Levitation display cube
  const levCube = addBox(0.24,0.24,0.24,M.glow(0x9d84ef),0,0.62,-0.2,ctlG,false);
  if(haloAt) haloAt(0x9d84ef,0.6,0,0.62,-0.2,ctlG);
  components.control = { group:ctlG, center:new THREE.Vector3(2.9,1.12,0.95), lev:levCube };

  // ── MONITOR ───────────────────────────────────────────────────────────────
  // (monitor.js builds its own mesh, we just return the component map here)
  // The monitor Group is added by monitor.js

  return { components };
}
