// Routes a cable from a case port to a device jack as a list of world points for a CatmullRom curve.
// Cables leave the port along its normal, drop to the desk, skirt the case footprint, and enter the jack
// along the jack normal. Traces stay flat on the motherboard.
import * as THREE from 'three';

const DESK_Y = 0.235;
const CASE = { x0: -3.62, x1: -0.78, z0: -0.90, z1: 0.90 };

const v = (a) => (a.isVector3 ? a.clone() : new THREE.Vector3(...a));

function crossesCase(a, b) {
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    if (x > CASE.x0 && x < CASE.x1 && z > CASE.z0 && z < CASE.z1) return true;
  }
  return false;
}

export function routeCable(port, jack, kind, opts = {}) {
  const P = v(port.pos), N = v(port.normal).normalize();
  const J = v(jack.pos), JN = v(jack.normal).normalize();

  if (kind === 'trace') {
    const mid = P.clone().lerp(J, 0.5); mid.z = P.z;
    const knee = new THREE.Vector3(J.x, P.y + (J.y - P.y) * 0.85, P.z);
    return [P, P.clone().add(N.clone().multiplyScalar(0.02)), mid, knee, J.clone().add(JN.clone().multiplyScalar(0.06)), J];
  }

  const out = P.clone().add(N.clone().multiplyScalar(0.28));
  const drop = out.clone().add(N.clone().multiplyScalar(0.14)); drop.y = opts.floor ? DESK_Y : DESK_Y;
  const enter = J.clone().add(JN.clone().multiplyScalar(0.30));
  const approach = enter.clone(); approach.y = J.y > DESK_Y + 0.5 ? enter.y : DESK_Y;

  const pts = [P, out, drop];

  if (opts.viaBack) {
    // Long runs go along the back edge of the desk, out of the way of the boards.
    pts.push(new THREE.Vector3(drop.x - 0.2, DESK_Y, -2.05));
    pts.push(new THREE.Vector3(approach.x - 0.6, DESK_Y, -2.05));
  } else if (crossesCase(drop, approach)) {
    const front = approach.z > -0.2;
    const zSide = front ? CASE.z1 + 0.30 : CASE.z0 - 0.30;
    pts.push(new THREE.Vector3(drop.x, DESK_Y, zSide));
    pts.push(new THREE.Vector3(Math.min(Math.max(approach.x, CASE.x0 - 0.3), CASE.x1 + 0.6), DESK_Y, zSide + (front ? 0.25 : -0.25)));
  }

  if (opts.floor) {
    pts.push(new THREE.Vector3(approach.x - 0.9, DESK_Y, approach.z));
    pts.push(new THREE.Vector3(approach.x - 0.45, 0.05, approach.z));
  }

  pts.push(approach, enter, J);
  return pts;
}

// The dive path is the cable itself, with a run up from outside the port and a settle above the device.
export function divePath(cablePts, port, device, jack) {
  const N = v(port.normal).normalize();
  const first = cablePts[0];
  const start = first.clone().add(N.clone().multiplyScalar(1.6)).add(new THREE.Vector3(0, 0.55, 0));
  const last = cablePts[cablePts.length - 1];
  const JN = v(jack.normal).normalize();
  const end = last.clone().add(JN.clone().multiplyScalar(-0.35)).add(new THREE.Vector3(0, 0.55, 0));
  return [start, ...cablePts, end];
}
