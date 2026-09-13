// The world map as data. Every project hangs off a real part of the machine.
// port: a port id from world/ports.js. cable: usb | eth | dp | ribbon | trace.
// device: a device id from world/devices.js. chip: a die block for cpu mounts.

export const MOUNTS = {
  // STM32 boards on the desk, rear USB through ST Link
  'real-time-hot-air-plant-control':      { port: 'rear.usb.1', cable: 'usb',    device: 'stm32_nucleo' },
  'embedded-digital-voltmeter-system':    { port: 'rear.usb.2', cable: 'usb',    device: 'stm32_disco', extras: ['scope'] },
  'direct-polymer-extrusion-3d-printer':  { port: 'rear.usb.3', cable: 'usb',    device: 'printer' },
  'k60-microcomputer-interfacing':        { port: 'rear.usb.5', cable: 'usb',    device: 'k60' },

  // ZedBoard, Ethernet plus USB JTAG
  'arinc-429-multi-lane-system':          { port: 'rear.eth',   cable: 'eth',    device: 'zedboard', also: ['rear.usb.4'] },

  // FPGA boards on the desk, front USB JTAG
  'aes-128-hardware-coprocessor':         { port: 'front.usb.1', cable: 'usb',   device: 'de1soc' },
  'fpga-accelerator-vivado-hls':          { port: 'front.usb.3', cable: 'usb',   device: 'nexys' },
  'custom-synchronous-cpu':               { port: 'front.usb.3', cable: 'usb',   device: 'nexys' },

  // Wearable, front USB
  'guide-wearable-lidar-system':          { port: 'front.usb.2', cable: 'usb',   device: 'headset' },

  // MAGLEV rig hangs off a DAQ card in a PCIe slot
  'maglev-control-system':                { port: 'daq.ribbon', cable: 'ribbon', device: 'maglev_rig', via: 'daq' },

  // Physical object on the desk, its page opens on the monitor
  'rocket-wing-cad':                      { port: null,         cable: null,     device: 'rocket_wing', opensOn: 'monitor' },

  // Inside the CPU die, reached by a motherboard trace into the socket
  '8-bit-cmos-program-counter':           { port: 'mobo.cpu_socket', cable: 'trace', device: 'cpu', chip: 'pc45' },
  '8x8-6t-sram-macro-sky130':             { port: 'mobo.cpu_socket', cable: 'trace', device: 'cpu', chip: 'sram130' },

  // Software lives on the monitor, fed by the GPU DisplayPort
  'ecng-production-systems':              { port: 'gpu.dp', cable: 'dp', device: 'monitor' },
  'ai-agent-town-simulation':             { port: 'gpu.dp', cable: 'dp', device: 'monitor' },
  'job-scanner':                          { port: 'gpu.dp', cable: 'dp', device: 'monitor' },
  'diet-optimization-sugarscape-simulation': { port: 'gpu.dp', cable: 'dp', device: 'monitor' },
  'enhanced-system-monitoring-glances':   { port: 'gpu.dp', cable: 'dp', device: 'monitor' },
  'signal-processing':                    { port: 'gpu.dp', cable: 'dp', device: 'monitor' }
};
