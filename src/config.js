// All portfolio content, extracted so geometry/UI code stays clean.
// Edit text here once; every module reads from this file.

export const REGIONS = {
  vlsi:     { name: 'VLSI / IC Core', sub: 'CPU · transistor-level', color: '#4fd8e0' },
  fpga:     { name: 'FPGA Fabric',    sub: 'GPU · RTL & HLS',        color: '#e7609f' },
  software: { name: 'Software',       sub: 'runs on the monitor',    color: '#a7d96a' },
  embedded: { name: 'Embedded MCU',   sub: 'dev board · firmware',   color: '#f0a830' },
  control:  { name: 'Control DSP',    sub: 'control board · DSP',    color: '#9d84ef' }
};

export const PROJECTS = {
  vlsi: [
    { t: '8-bit CMOS Program Counter', tag: 'Cadence Virtuoso · Spectre · 45nm', spec: '906 ps · 58.08 µW · 1.10 GHz · gpdk045',
      d: 'Fully functional 8-bit program counter at the transistor level, transmission-gate MUX, mirror-adder full adder, and master-slave DFF register, verified with full Spectre transient simulation.',
      tags: ['Cadence','Spectre','45nm','DFF'], imgs: ['TOP_LEVEL_SCHEMATIC.png','TOPLEVELTEST.png'], links: [] },
    { t: '8x8 6T SRAM Macro, Sky130', tag: 'Magic 8.3 · ngspice · 130nm', spec: '716 mV SNM · DRC/LVS-clean · AI-driven',
      d: 'Full-custom 64-bit SRAM macro in SkyWater Sky130, every transistor hand-placed in Magic, DRC/LVS sign-off, SNM characterization, headless flow orchestrated by Claude AI agents.',
      tags: ['Magic','ngspice','Sky130','SNM','AI Agents'], imgs: ['03_array_layout.png','07_snm_butterfly.png'], links: [{ l: 'Engineering Report', u: 'SRAM_Report.pdf' }] }
  ],
  fpga: [
    { t: 'AES-128 Hardware Coprocessor', tag: 'Verilog · Quartus · FPGA SoC', spec: 'NIST verified · APB-integrated · CBC/OFB',
      d: '128-bit AES coprocessor in Verilog on an FPGA SoC, custom APB IP, every AES transform plus key expansion and memory-mapped registers, validated against NIST vectors.',
      tags: ['Verilog','FPGA SoC','APB','AES-128'], imgs: ['AES1.png','AES2.png'], links: [] },
    { t: 'Custom Synchronous CPU', tag: 'VHDL · Vivado · ModelSim', spec: 'RTL datapath · FSM control · synthesized',
      d: 'Custom synchronous CPU at RTL in VHDL, register file, ALU, control unit and memory interface driven by FSM fetch/decode/execute/write-back. Debugged in ModelSim, synthesized in Vivado.',
      tags: ['VHDL','Vivado','RTL'], imgs: [], links: [] },
    { t: 'FPGA Accelerator, Vivado HLS', tag: 'Vivado HLS · Zynq SoC · C/C++', spec: 'Loop pipelining · dataflow · partitioning',
      d: 'Hardware accelerator kernel in C/C++ on a Xilinx Zynq SoC via Vivado HLS, loop pipelining, dataflow, array partitioning, analyzed for latency, II and BRAM/DSP/LUT use.',
      tags: ['HLS','Zynq','C/C++'], imgs: [], links: [] },
    { t: 'ARINC 429 Tx & Rx', tag: 'VHDL · Nexys A7 · aerospace', spec: 'Full protocol · FSM Rx · odd parity',
      d: 'Complete ARINC 429 transmitter/receiver in VHDL on a Nexys A7 to 32-bit word formatting with label/SDI/SSM and odd parity; FSM receiver handles bit timing, word detection, parity.',
      tags: ['VHDL','Nexys A7','ARINC 429'], imgs: [], links: [] }
  ],
  software: [
    { t: 'Enhanced System Monitoring, Glances', tag: 'Python · open source · SCRUM', spec: 'NVMe metrics · full test coverage · UML',
      d: 'Contributed features to the open-source Glances tool, documented UML architecture, implemented NVMe metrics, added file-system descriptions, managed sprints in JIRA with full test suites.',
      tags: ['Python','NVMe','JIRA','TDD'], imgs: ['app.jpg'], links: [] },
    { t: 'Diet Optimization, Sugarscape Sim', tag: 'Python · agent-based modelling', spec: 'Optimum ~ 40% protein / 39% carb / 21% fat',
      d: 'Agent-based Sugarscape simulation of macronutrient distributions on long-term fat loss, models BMR, caloric deficit and body-fat dynamics, finding a stable optimum over thousands of steps.',
      tags: ['Python','Agent-Based','NumPy'], imgs: ['Modelling.jpg','Modelling2.jpg'], links: [] }
  ],
  embedded: [
    { t: 'Direct Polymer Extrusion 3D Printer', tag: 'STM32 · Marlin · Capstone', spec: '30-50% cost cut · SKR Mini E3 · recycled plastic',
      d: 'Capstone: a Creality printer modified to print directly from raw polymer, no filament, swapped to an STM32 SKR Mini E3, modified Marlin firmware, tuned extrusion, temperature and motion sync.',
      tags: ['STM32','Marlin','C','FDM'], imgs: ['Capstone2.jpg','Capstone1.png'], links: [{ l: 'Design Day Poster', u: 'G41ENGG41XX_POSTER (1).pdf' }] },
    { t: 'Real-Time Hot Air Plant Control', tag: 'FreeRTOS · ARM · Keil', spec: 'Closed-loop PID · queue/semaphore sync',
      d: 'Real-time C firmware on ARM with FreeRTOS, task-based sensing (ADC), control, actuation and monitoring with deterministic queues and semaphores, validated by oscilloscope timing analysis.',
      tags: ['FreeRTOS','ARM','PID'], imgs: ['Realtime.jpg','Realtime2.jpg'], links: [] },
    { t: 'G.U.I.D.E., Wearable LiDAR', tag: 'Accessibility · LiDAR · haptics', spec: '360 deg LiDAR · haptic feedback · ~12 hr battery',
      d: 'Wearable obstacle detection for visually impaired users, chest-mounted oscillating 2D LiDAR for 3D sensing, cane-mounted encoder for traction loss, directional haptic alerts. Accessible Canada Act compliant.',
      tags: ['LiDAR','Haptics','IMU','C++'], imgs: ['GUIDE.jpg','GUIDE2.jpg'], links: [] }
  ],
  control: [
    { t: 'MAGLEV Control System', tag: 'MATLAB · Simulink · QUARC', spec: 'PI + PID+FF cascade · ~1.5% overshoot',
      d: 'Modeled and controlled a nonlinear magnetic-levitation system from first principles, inner PI current loop, outer PID + feedforward position loop, validated in Simulink and on hardware via QUARC.',
      tags: ['MATLAB','Simulink','QUARC','PID'], imgs: ['Maglev.jpg','Maglev2.jpg'], links: [] }
  ]
};

export const SKILLS = [
  ['VLSI / Physical Design', ['Cadence Virtuoso','Magic 8.3','ngspice','Sky130','CMOS','DRC / LVS','Spectre']],
  ['FPGA / HDL', ['VHDL','Verilog','Vivado','Vivado HLS','ModelSim','Quartus','Zynq SoC']],
  ['Embedded', ['C / C++','STM32','FreeRTOS','ARM Cortex-M','Keil','SPI / I2C / UART']],
  ['AI & Software', ['Claude API','AI Agents','Python','C#','ASP.NET','SQL / T-SQL','Selenium','Git']],
  ['Tools', ['MATLAB / Simulink','QUARC','SSMS','DevExpress','JIRA','Linux','SolidWorks']]
];

export const EXPERIENCE = [
  ['MAY 2025, PRESENT','Software / Systems Developer','ECNG Energy Group','AI invoice pipeline on the Claude API; IESO price-scraping alerts to 20+ clients; Python automation (-90% manual work); full-stack ASP.NET over SQL Server.'],
  ['DEC 2024, APR 2025','Teaching Assistant, Electric Circuits','University of Guelph','Nodal/mesh analysis, superposition, Thevenin/Norton; DC/AC, op-amp and 1st/2nd-order labs.'],
  ['SEP 2024, DEC 2024','TA, Engineering Systems Analysis','University of Guelph','Dynamic-system modelling; Laplace methods for impulse/step/frequency response.'],
  ['SEP 2024, APR 2026','Co-Leader, SolidWorks User Group','University of Guelph','Workshops and tutorials strengthening CAD across the engineering community.'],
  ['NOV 2023, JUN 2024','Robotics Instructor','Exceed Robotics','SolidWorks, Inventor, Mindstorms, Arduino; led a team to regional VEX success.'],
  ['MAY 2017, AUG 2022','Robotics & Mathematics Teacher','Alwataniah Syria National School','Coding, robotics and mathematics to students aged 5-15 over five years.']
];

export const CONTACT = [
  ['EMAIL','louayalarfi@gmail.com','mailto:louayalarfi@gmail.com'],
  ['GITHUB','github.com/Louayalarfi','https://github.com/Louayalarfi'],
  ['LINKEDIN','linkedin.com/in/lauaialerfi','https://www.linkedin.com/in/lauaialerfi'],
  ['PHONE','+1 (519) 993-5859','tel:+15199935859'],
  ['LOCATION','Guelph, Ontario · Canada','']
];

export const STATS = [['3x',"Dean's List"],['906ps','VLSI path'],['12+','projects'],['5yr','teaching']];

// Where project screenshots live. Two options:
//  1. Hot-link the existing domain (no CORS for <img>, but 3D textures need CORS):
export const IMG_BASE = 'https://lauaialerfi.com/images/';
//  2. Recommended for 3D: copy images into public/assets/images/ and set:
//     export const IMG_BASE = './assets/images/';
