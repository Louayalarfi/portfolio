// Devices on the desk, on the floor, or inside the case. pos is the footprint centre on the surface.
// jack is where the cable ends, in device local space before rotY. footprint is [width, depth] in metres.
// proc is the procedural builder used until a GLB lands in public/models (model field, M4).

export const DEVICES = {
  stm32_nucleo: { label: 'STM32 Nucleo',      proc: 'board', family: 'stm', footprint: [0.70, 0.50], pos: [ 0.60, 0.18,  2.10], rotY: -0.35, jack: { pos: [-0.36, 0.04,  0.00], normal: [-1, 0, 0] }, orbitR: 2.6 },
  stm32_disco:  { label: 'STM32 Discovery',   proc: 'board', family: 'stm', footprint: [0.66, 0.46], pos: [ 1.75, 0.18,  2.55], rotY: -0.15, jack: { pos: [-0.34, 0.04,  0.00], normal: [-1, 0, 0] }, orbitR: 2.6 },
  k60:          { label: 'Freescale K60',     proc: 'board', family: 'k60', footprint: [0.60, 0.44], pos: [-0.35, 0.18,  2.65], rotY:  0.25, jack: { pos: [-0.31, 0.04,  0.00], normal: [-1, 0, 0] }, orbitR: 2.4 },
  zedboard:     { label: 'ZedBoard (Zynq)',   proc: 'board', family: 'xil', footprint: [0.88, 0.66], pos: [-4.45, 0.18,  1.05], rotY:  0.30, jack: { pos: [-0.45, 0.06, -0.18], normal: [-1, 0, 0] }, jack2: { pos: [-0.45, 0.06, 0.12], normal: [-1, 0, 0] }, orbitR: 2.9 },
  de1soc:       { label: 'DE1 SoC (Cyclone V)', proc: 'board', family: 'alt', footprint: [0.82, 0.60], pos: [ 2.55, 0.18,  1.55], rotY: -0.55, jack: { pos: [-0.42, 0.05,  0.10], normal: [-1, 0, 0] }, orbitR: 2.8 },
  nexys:        { label: 'Nexys A7 (Artix 7)', proc: 'board', family: 'xil', footprint: [0.76, 0.56], pos: [ 3.60, 0.18,  2.45], rotY: -0.30, jack: { pos: [-0.39, 0.05,  0.00], normal: [-1, 0, 0] }, orbitR: 2.7 },
  headset:      { label: 'GUIDE headset',     proc: 'headset', footprint: [1.60, 1.60], pos: [ 4.55, 0.18,  1.65], rotY: -0.60, jack: { pos: [ 0.00, 0.12,  0.28], normal: [ 0, 0, 1] }, orbitR: 2.6 },
  scope:        { label: 'Oscilloscope',      proc: 'scope', footprint: [2.40, 1.30], pos: [ 0.95, 0.18,  3.02], rotY:  0.00, jack: { pos: [-1.20, 0.30,  0.00], normal: [-1, 0, 0] }, orbitR: 3.2, prop: true },
  printer:      { label: 'Pellet printer',    proc: 'printer', footprint: [3.20, 3.20], height: 4.0, scaleBy: 'height', pos: [ 6.95, 0.00,  0.40], rotY: -0.90, jack: { pos: [-1.30, 0.60,  0.00], normal: [-1, 0, 0] }, orbitR: 5.0, floor: true },
  maglev_rig:   { label: 'MAGLEV rig',        proc: 'maglev', footprint: [0.62, 0.62], pos: [-4.55, 0.18, -1.55], rotY:  0.35, jack: { pos: [ 0.30, 0.16,  0.00], normal: [ 1, 0, 0] }, orbitR: 2.8 },
  rocket_wing:  { label: 'Rocket wing',       proc: 'wing', footprint: [0.75, 0.35], pos: [ 5.25, 0.18,  0.35], rotY:  0.50, orbitR: 2.2 },
  monitor:      { label: 'Monitor',           proc: 'monitor', footprint: [3.60, 0.50], pos: [ 3.10, 0.18, -0.80], rotY: -0.50, jack: { pos: [ 0.55, 1.85, -0.09], normal: [ 0, 0, -1] }, orbitR: 3.7 },
  cpu:          { label: 'CPU',               proc: 'cpu', footprint: [0.82, 0.82], pos: [-2.50, 2.29, -0.25], rotY: 0, jack: { pos: [ 0.00, 0.00,  0.30], normal: [ 0, 0, 1] }, orbitR: 2.2, internal: true }
};
