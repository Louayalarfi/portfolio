import * as THREE from 'three';
import { pcbTex } from '../../ui/utils.js';

export const std = (o) => new THREE.MeshStandardMaterial(o);
export const phys = (o) => new THREE.MeshPhysicalMaterial(o);

let cached = null;
export function mats(quality) {
  if (cached) return cached;
  const pcbGreen = pcbTex(THREE, '#0c2e22', '#3fcf8e');
  const pcbBlue  = pcbTex(THREE, '#0d2038', '#3f8fd0');
  const pcbDark  = pcbTex(THREE, '#08130e', '#2fae78');
  const pcbBlack = pcbTex(THREE, '#0a0b0e', '#3a4a5a');
  const glass = quality?.glassTransmission
    ? phys({ color: 0xbfe6f0, metalness: 0, roughness: 0.04, transmission: 0.88, transparent: true, opacity: 0.25, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.8, side: THREE.DoubleSide })
    : phys({ color: 0xbfe6f0, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.22, clearcoat: 1, envMapIntensity: 1.4, side: THREE.DoubleSide });
  cached = {
    floor:     std({ color: 0x070a11, metalness: 0.3,  roughness: 0.7 }),
    desk:      std({ color: 0x14110d, metalness: 0.25, roughness: 0.65 }),
    caseBody:  std({ color: 0x12161e, metalness: 0.92, roughness: 0.28, envMapIntensity: 1.3 }),
    caseEdge:  std({ color: 0x2a2f38, metalness: 1,    roughness: 0.18, envMapIntensity: 1.4 }),
    caseInner: std({ color: 0x090c12, metalness: 0.5,  roughness: 0.6 }),
    glass,
    mobo:      std({ map: pcbGreen, color: 0x3a7558, metalness: 0.18, roughness: 0.65 }),
    moboBlue:  std({ map: pcbBlue,  color: 0x3a6080, metalness: 0.18, roughness: 0.65 }),
    hs:        std({ color: 0xb0bac8, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.4 }),
    alu:       std({ color: 0x9aa3b0, metalness: 0.98, roughness: 0.25, envMapIntensity: 1.3 }),
    copper:    std({ color: 0xc8893f, metalness: 0.98, roughness: 0.28, envMapIntensity: 1.3 }),
    gold:      std({ color: 0xd9b25a, metalness: 0.98, roughness: 0.32, envMapIntensity: 1.2 }),
    plastic:   std({ color: 0x0c0f15, metalness: 0.22, roughness: 0.5 }),
    dimm:      std({ color: 0x14181f, metalness: 0.45, roughness: 0.38 }),
    rubber:    std({ color: 0x060810, metalness: 0.0,  roughness: 0.92 }),
    pcbGrn:    std({ map: pcbGreen, color: 0x2faa70, metalness: 0.15, roughness: 0.6 }),
    pcbBlu:    std({ map: pcbBlue,  color: 0x3f6f9f, metalness: 0.2,  roughness: 0.58 }),
    pcbDrk:    std({ map: pcbDark,  color: 0x2faa70, metalness: 0.15, roughness: 0.6 }),
    pcbBlk:    std({ map: pcbBlack, color: 0x4a5566, metalness: 0.2,  roughness: 0.6 }),
    chip:      std({ color: 0x0a0c10, metalness: 0.15, roughness: 0.7 }),
    smd:       std({ color: 0x12141a, metalness: 0.2,  roughness: 0.6 }),
    cap:       std({ color: 0x1a2538, metalness: 0.55, roughness: 0.4 }),
    lead:      std({ color: 0xb0b8c0, metalness: 0.95, roughness: 0.2 }),
    glow: (hex) => std({ color: 0x060810, emissive: hex, emissiveIntensity: 1.8, metalness: 0.3, roughness: 0.5 })
  };
  return cached;
}

export function addBox(w, h, d, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  parent.add(m); return m;
}
export function addCyl(rt, rb, h, seg, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function addSphere(r, seg, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
  m.position.set(x, y, z); m.castShadow = true;
  parent.add(m); return m;
}

function makeFanBlade(bladeLen, bladeW, bladeThick, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(bladeW * 0.3, bladeLen * 0.1, bladeW * 0.7, bladeLen * 0.4, bladeW, bladeLen);
  shape.lineTo(bladeW * 0.7, bladeLen);
  shape.bezierCurveTo(bladeW * 0.4, bladeLen * 0.4, bladeW * 0.05, bladeLen * 0.1, -bladeThick, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: bladeThick * 0.5, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

export function buildFan(diameter, bladeCount, matPlastic, matBlade, glowHex) {
  const radius = diameter / 2;
  const group = new THREE.Group();
  addCyl(radius, radius, 0.04, 32, matPlastic, 0, 0, 0, group);
  addCyl(radius - 0.04, radius - 0.04, 0.06, 32, matPlastic, 0, 0, 0, group);
  addCyl(0.065, 0.065, 0.07, 20, std({ color: 0x222831, metalness: 0.5, roughness: 0.4 }), 0, 0, 0, group);
  addCyl(0.028, 0.028, 0.04, 12, std({ color: 0x1a1e24, metalness: 0.6, roughness: 0.3 }), 0, 0.02, 0, group);
  const pivot = new THREE.Group();
  group.add(pivot);
  for (let i = 0; i < bladeCount; i++) {
    const blade = makeFanBlade(radius * 0.84, radius * 0.22, 0.012, matBlade);
    blade.position.y = 0.005;
    blade.rotation.y = (i / bladeCount) * Math.PI * 2;
    pivot.add(blade);
  }
  if (glowHex) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.008, 0.006, 8, 64), std({ color: 0x080808, emissive: glowHex, emissiveIntensity: 2.2, metalness: 0.3, roughness: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  return { group, pivot };
}

export function addConnector(w, h, d, mat, x, y, z, parent, pinRows = 2, pinCols = 4) {
  addBox(w, h, d, mat, x, y, z, parent);
  const pinMat = std({ color: 0xd9b25a, metalness: 0.98, roughness: 0.3, envMapIntensity: 1.2 });
  const pw = w / (pinCols * 1.6), ph = h * 0.6, sx = w / pinCols, sz = d * 0.08;
  for (let r = 0; r < pinRows; r++) for (let c = 0; c < pinCols; c++) {
    addBox(pw * 0.4, ph, 0.006, pinMat, x - w / 2 + sx * (c + 0.5), y - h / 2 + ph / 2 + 0.005, z + d / 2 - sz * (r + 1), parent, false);
  }
}

export function addChip(w, h, d, mat, x, y, z, parent, leadMat) {
  addBox(w, h, d, mat, x, y, z, parent, false);
  const lm = leadMat || std({ color: 0xb0b8c0, metalness: 0.95, roughness: 0.2 });
  const leads = Math.max(2, Math.floor(w / 0.018));
  for (let i = 0; i < leads; i++) {
    const lx = x - w / 2 + (w / leads) * i + w / (leads * 2);
    addBox(0.006, 0.003, 0.01, lm, lx, y - h / 2, z + d / 2 + 0.004, parent, false);
    addBox(0.006, 0.003, 0.01, lm, lx, y - h / 2, z - d / 2 - 0.004, parent, false);
  }
}

export function addCap(r, h, mat, x, y, z, parent) {
  addCyl(r, r, h, 12, mat, x, y + h / 2, z, parent);
  addBox(r * 1.8, 0.004, r * 1.8, std({ color: 0x888888, metalness: 0.9, roughness: 0.3 }), x, y + h + 0.001, z, parent, false);
}

// A canvas texture with a silkscreen style label, used on procedural boards and props.
export function labelTexture(text, sub, accent = '#e9eefb', w = 512, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
  g.fillStyle = accent; g.font = `700 ${Math.round(h * 0.22)}px 'Chakra Petch',sans-serif`;
  g.textAlign = 'center'; g.fillText(text, w / 2, h * 0.5);
  if (sub) { g.fillStyle = 'rgba(233,238,251,.7)'; g.font = `400 ${Math.round(h * 0.11)}px 'IBM Plex Mono',monospace`; g.fillText(sub, w / 2, h * 0.68); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
