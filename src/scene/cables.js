// Sleeved cables by kind, idle spark fireflies, and the pre dive spark race.
//
//   const cables = buildCables(scene, haloTex);
//   const cable = cables.addCable(pts, 'usb', accentHex);   returns { curve, mats, hex, kind }
//   cables.animateCables(time); cables.startSparkRace(cable, onDone); cables.cancelSparkRace(); cables.tickRace(dt);

import * as THREE from 'three';

export const CABLE_KINDS = {
  usb:    { radius: 0.034, color: 0x0a0b10, core: 0.5,  connector: 'usb' },
  eth:    { radius: 0.038, color: 0x1a4a8a, core: 0.45, connector: 'rj45' },
  dp:     { radius: 0.044, color: 0x0a0b10, core: 0.5,  connector: 'dp' },
  ribbon: { radius: 0.05,  color: 0x2a2f38, core: 0.3,  connector: 'idc', flat: true },
  trace:  { radius: 0.014, color: 0xc8893f, core: 0.8,  connector: null }
};

function buildSleevedCable(scene, pts, kind, hex) {
  const K = CABLE_KINDS[kind] || CABLE_KINDS.usb;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 200;
  const radius = K.radius;
  const group = new THREE.Group(); scene.add(group);

  const sleeveMat = new THREE.MeshStandardMaterial({ color: K.color, metalness: kind === 'trace' ? 0.95 : 0.05, roughness: kind === 'trace' ? 0.3 : 0.88, emissive: hex, emissiveIntensity: 0.05 });
  const sleeve = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, radius, K.flat ? 6 : 10, false), sleeveMat);
  if (K.flat) sleeve.scale.y = 0.35;
  sleeve.castShadow = true;
  group.add(sleeve);

  const coreMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: hex, emissiveIntensity: K.core, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, radius * 0.35, 8, false), coreMat);
  core.renderOrder = 1;
  group.add(core);

  if (K.connector) {
    const connMat = new THREE.MeshStandardMaterial({ color: 0x0d1018, metalness: 0.4, roughness: 0.6 });
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xd9b25a, metalness: 0.98, roughness: 0.3 });
    const addConnector = (t, size) => {
      const pt = curve.getPointAt(t), tan = curve.getTangentAt(t).normalize();
      const conn = new THREE.Mesh(new THREE.BoxGeometry(radius * size[0], radius * size[1], radius * size[2]), connMat);
      conn.position.copy(pt);
      conn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
      conn.castShadow = true;
      group.add(conn);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.014), pinMat);
        pin.position.set((c - 1) * radius * 0.8, (r - 0.5) * radius * 0.6, radius * size[2] * 0.5);
        conn.add(pin);
      }
    };
    addConnector(0.012, [3.2, 2.0, 5.0]);
    addConnector(0.988, [3.2, 2.0, 5.0]);
  }

  return { curve, sleeveMat, coreMat, group, hex, kind, radius };
}

function buildSparkSystem(scene, haloTex, count) {
  const sparks = [];
  for (let k = 0; k < count; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    s.scale.set(0.18, 0.18, 1);
    scene.add(s);
    sparks.push(s);
  }
  return sparks;
}

export function buildCables(scene, haloTex) {
  const cables = [];

  function addCable(pts, kind, hex) {
    const cable = buildSleevedCable(scene, pts, kind, hex);
    cable.sparks = buildSparkSystem(scene, haloTex, kind === 'trace' ? 3 : 4);
    cables.push(cable);
    return cable;
  }

  const RACE_COUNT = 14;
  const raceSparks = buildSparkSystem(scene, haloTex, RACE_COUNT);
  let raceState = null;

  function startSparkRace(cable, onComplete) {
    raceSparks.forEach((s) => { s.material.color.setHex(cable.hex); s.material.opacity = 1; });
    raceState = { cable, t: 0, duration: 0.55, onComplete, done: false };
  }

  function cancelSparkRace() {
    if (raceState) { raceState.cable.coreMat.emissiveIntensity = 0.5; raceState.cable.sleeveMat.emissiveIntensity = 0.05; }
    raceState = null;
    raceSparks.forEach((s) => { s.material.opacity = 0; s.position.set(0, -999, 0); });
  }

  function animateCables(time) {
    cables.forEach((cb, i) => {
      const K = CABLE_KINDS[cb.kind];
      cb.sleeveMat.emissiveIntensity = 0.04 + 0.05 * Math.sin(time * 2.5 + i);
      cb.coreMat.emissiveIntensity = K.core * (0.7 + 0.4 * Math.sin(time * 3 + i) + 0.2 * Math.sin(time * 17 + i * 5));
      cb.sparks.forEach((s, k) => {
        const tt = ((time * 0.35) + i * 0.3 + k / cb.sparks.length) % 1;
        s.position.copy(cb.curve.getPoint(tt));
        const fl = 0.08 + 0.06 * Math.abs(Math.sin(time * 18 + k * 3 + i));
        s.scale.set(fl, fl, 1);
        s.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(time * 8 + k));
        s.material.color.setHex(cb.hex);
      });
    });

    if (raceState && !raceState.done) {
      const progress = Math.min(raceState.t / raceState.duration, 1);
      raceSparks.forEach((s, k) => {
        const offset = (k / RACE_COUNT) * 0.35;
        const tt = Math.min(1, Math.max(0, progress - offset));
        if (tt <= 0) { s.material.opacity = 0; return; }
        s.position.copy(raceState.cable.curve.getPoint(tt));
        const fl = 0.22 + 0.12 * Math.sin(time * 30 + k * 2.1);
        s.scale.set(fl, fl, 1);
        s.material.opacity = 0.9 * (1 - offset / 0.35) * Math.sin(Math.min(1, tt * 6) * Math.PI);
      });
      raceState.cable.coreMat.emissiveIntensity = 1.5 + 0.5 * Math.sin(time * 40);
      raceState.cable.sleeveMat.emissiveIntensity = 0.4 + 0.2 * Math.sin(time * 40);
      if (progress >= 1) {
        raceState.done = true;
        const cb = raceState.onComplete;
        cancelSparkRace();
        cb && cb();
      }
    }
  }

  function tickRace(dt) { if (raceState && !raceState.done) raceState.t += dt; }

  return { addCable, cables, animateCables, startSparkRace, cancelSparkRace, tickRace };
}
