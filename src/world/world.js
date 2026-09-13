// Builds the scene graph from the registries and the content, and returns the mounts:
// one per (port, device) pair, each with its cable, its dive tunnel and its projects.
import * as THREE from 'three';
import { PORTS } from './ports.js';
import { DEVICES } from './devices.js';
import { routeCable, divePath } from './routing.js';
import { buildCase } from './procedural/case.js';
import { buildBoard } from './procedural/pcb.js';
import { buildScope, buildPrinter, buildHeadset, buildMaglev, buildWing } from './procedural/props.js';
import { buildMonitor } from '../scene/monitor.js';
import { buildCables } from '../scene/cables.js';
import { makeDive } from '../scene/dive.js';
import { GROUP_COLOR, DRAFT_DEVICES, groupedMounts, unmounted } from '../content/index.js';

const BUILDERS = { board: buildBoard, scope: buildScope, printer: buildPrinter, headset: buildHeadset, maglev: buildMaglev, wing: buildWing };

export function buildWorld(scene, { quality, haloAt, haloTex }) {
  const rig = buildCase(scene, quality, haloAt);
  const cablesSys = buildCables(scene, haloTex);
  const monitor = buildMonitor(scene, DEVICES.monitor);
  const devices = {};
  const unresolved = [];

  // Devices.
  for (const [id, spec] of Object.entries(DEVICES)) {
    let group;
    if (spec.proc === 'monitor') group = monitor.monG;
    else if (spec.proc === 'cpu') group = rig.anchors.cpuGroup;
    else {
      group = BUILDERS[spec.proc](spec, quality);
      group.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      group.rotation.y = spec.rotY || 0;
      scene.add(group);
    }
    group.updateMatrixWorld(true);
    group.traverse((o) => { if (o.isMesh) o.userData.deviceId = id; });

    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spec.rotY || 0);
    const toWorld = (local) => spec.proc === 'cpu'
      ? new THREE.Vector3(...spec.pos).add(new THREE.Vector3(...local))
      : group.localToWorld(new THREE.Vector3(...local));
    const jackOf = (j) => j ? { pos: toWorld(j.pos), normal: new THREE.Vector3(...j.normal).applyQuaternion(rot).normalize() } : null;

    const center = spec.proc === 'cpu' ? rig.anchors.cpuCenter.clone()
      : spec.proc === 'monitor' ? monitor.screenWorld.clone()
      : group.localToWorld((group.userData.center || new THREE.Vector3(0, 0.1, 0)).clone());

    devices[id] = { id, spec, group, center, jack: jackOf(spec.jack), jack2: jackOf(spec.jack2), mountId: null };
  }

  // Port markers, a faint glow at every port that has a cable.
  const portDots = new THREE.Group(); scene.add(portDots);

  // Mounts.
  const mounts = {};
  for (const gm of groupedMounts()) {
    const dev = devices[gm.device];
    if (!dev) { unresolved.push(`${gm.id}: device ${gm.device} missing`); continue; }
    const accent = GROUP_COLOR[gm.projects[0].group] || '#4fd8e0';
    const hex = parseInt(accent.slice(1), 16);
    const port = gm.port ? PORTS[gm.port] : null;
    if (gm.port && !port) { unresolved.push(`${gm.id}: port ${gm.port} missing`); continue; }

    let cable = null, dive = null;
    if (port && dev.jack) {
      const pts = routeCable(port, dev.jack, gm.cable, { viaBack: gm.device === 'monitor' || gm.device === 'printer', floor: !!dev.spec.floor });
      cable = cablesSys.addCable(pts, gm.cable, hex);
      dive = makeDive(scene, divePath(pts, port, dev, dev.jack), hex, cable.radius * 9, quality.plasmaOctaves);
      if (haloAt) haloAt(hex, 0.22, port.pos[0], port.pos[1], port.pos[2], portDots);
      (gm.also || []).forEach((pid) => {
        const p2 = PORTS[pid]; if (!p2 || !dev.jack2) return;
        const pts2 = routeCable(p2, dev.jack2, p2.kind, {});
        cablesSys.addCable(pts2, p2.kind, hex);
        if (haloAt) haloAt(hex, 0.18, p2.pos[0], p2.pos[1], p2.pos[2], portDots);
      });
    }

    const kind = gm.device === 'monitor' ? 'monitor' : gm.chip ? 'die' : port ? 'device' : 'desk';
    const mount = {
      id: gm.id, label: dev.spec.label, projects: gm.projects.map((p) => ({ ...p, accent: GROUP_COLOR[p.group] })),
      accent, hex, port: gm.port, portLabel: port?.label || '', cableKind: gm.cable,
      cable, curve: dive?.curve || null, tunnel: dive?.tunnel || null, tmat: dive?.tmat || null,
      device: dev, center: dev.center.clone(), orbitR: dev.spec.orbitR || 2.6,
      kind, chip: gm.chip || null, internal: !!dev.spec.internal, extras: gm.extras || []
    };
    mounts[gm.id] = mount;
    dev.mountId = gm.id;
    (gm.extras || []).forEach((eid) => { if (devices[eid]) devices[eid].mountId = gm.id; });
  }

  for (const slug of unmounted()) unresolved.push(`${slug}: no mount`);
  const drafts = [];
  for (const [id, d] of Object.entries(devices)) {
    if (d.mountId || d.spec.prop) continue;
    if (DRAFT_DEVICES.has(id)) drafts.push(id); else unresolved.push(`device ${id}: no projects`);
  }

  // Every mesh of a mounted device answers to its mount.
  const clickables = [];
  for (const d of Object.values(devices)) {
    if (!d.mountId) continue;
    d.group.traverse((o) => { if (o.isMesh) { o.userData.mountId = d.mountId; clickables.push(o); } });
  }

  const monitorMount = Object.values(mounts).find((m) => m.kind === 'monitor');
  if (monitorMount) monitor.setProjects(monitorMount.projects);

  function mountAt(object) {
    let o = object;
    while (o) { if (o.userData?.mountId) return mounts[o.userData.mountId]; o = o.parent; }
    return null;
  }

  function mountFor(id) {
    if (mounts[id]) return mounts[id];
    return Object.values(mounts).find((m) => m.device.id === id || m.chip === id) || null;
  }

  // Side panel lift and the small idle animations.
  const side = rig.sidePanel;
  let sideTarget = 0;
  function liftPanel(open) { sideTarget = open ? 3.95 : 0; }

  function tick(dt, time) {
    side.position.y += (sideTarget - side.position.y) * Math.min(1, dt * 2.5);
    for (const f of rig.animated.fans) f.pivot.rotation.y = time * f.speed;
    const ball = devices.maglev_rig?.group.userData.ball;
    if (ball) { ball.position.y = 0.45 + Math.sin(time * 1.7) * 0.03; }
    const head = devices.printer?.group.userData.head;
    if (head) { head.position.x = -0.1 + Math.sin(time * 0.8) * 0.28; head.position.z = -0.1 + Math.cos(time * 0.55) * 0.22; }
  }

  function report() {
    const rows = Object.values(mounts).map((m) => ({
      mount: m.id, kind: m.kind, port: m.port || '(desk)', cable: m.cableKind || '', device: m.device.id,
      projects: m.projects.length, cableLen: m.curve ? m.curve.getLength().toFixed(2) : ''
    }));
    console.table(rows);
    if (unresolved.length) console.warn('unresolved:', unresolved); else console.log('world: all mounts resolved');
    if (drafts.length) console.log('draft devices (copy not reviewed yet):', drafts.join(', '));
    return { mounts: rows, unresolved, drafts };
  }

  return { mounts, devices, monitor, cablesSys, rig, clickables, mountAt, mountFor, liftPanel, tick, report, unresolved };
}
