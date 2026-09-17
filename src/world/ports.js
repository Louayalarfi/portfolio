// Every cable leaves a real port. Positions are world space, the desk top is y = 0.18.
// The case sits at x from -3.5 to -0.9, z from -0.7 to 0.72. Rear I/O faces -x, front I/O faces +x.

export const PORTS = {
  'rear.eth':    { parent: 'case', pos: [-3.47, 3.62, -0.30], normal: [-1, 0, 0], kind: 'eth',    label: 'Ethernet' },
  'rear.usb.1':  { parent: 'case', pos: [-3.47, 3.50, -0.62], normal: [-1, 0, 0], kind: 'usb',    label: 'USB 3.0' },
  'rear.usb.2':  { parent: 'case', pos: [-3.47, 3.40, -0.62], normal: [-1, 0, 0], kind: 'usb',    label: 'USB 3.0' },
  'rear.usb.3':  { parent: 'case', pos: [-3.47, 3.30, -0.62], normal: [-1, 0, 0], kind: 'usb',    label: 'USB 2.0' },
  'rear.usb.4':  { parent: 'case', pos: [-3.47, 3.50, -0.48], normal: [-1, 0, 0], kind: 'usb',    label: 'USB 3.0' },
  'rear.usb.5':  { parent: 'case', pos: [-3.47, 3.40, -0.48], normal: [-1, 0, 0], kind: 'usb',    label: 'USB 2.0' },
  'gpu.dp':      { parent: 'case', pos: [-3.47, 1.50, -0.44], normal: [-1, 0, 0], kind: 'dp',     label: 'DisplayPort' },
  'daq.ribbon':  { parent: 'case', pos: [-3.47, 1.16, -0.44], normal: [-1, 0, 0], kind: 'ribbon', label: 'DAQ' },
  'front.usb.1': { parent: 'case', pos: [-0.92, 3.46, -0.14], normal: [ 1, 0, 0], kind: 'usb',    label: 'USB C' },
  'front.usb.2': { parent: 'case', pos: [-0.92, 3.46,  0.04], normal: [ 1, 0, 0], kind: 'usb',    label: 'USB 3.0' },
  'front.usb.3': { parent: 'case', pos: [-0.92, 3.46,  0.22], normal: [ 1, 0, 0], kind: 'usb',    label: 'USB 3.0' },
  'mobo.cpu_socket': { parent: 'case', pos: [-1.95, 1.30, -0.54], normal: [0, 0, 1], kind: 'trace', label: 'PCIe root' }
};
