// Projects that exist only in the 3D world, or that replace a stale classic entry.
// Same shape as generated.json projects. draft: true keeps an entry out of the world until Lauai reviews the copy.

export const REPLACES = {
  // The classic card describes the June single lane Nexys A7 version. This is the current system.
  'arinc-429-transmitter-and-receiver': 'arinc-429-multi-lane-system'
};

export const EXTRAS = [
  {
    slug: 'arinc-429-multi-lane-system',
    group: 'fpga',
    title: 'ARINC 429 Multi Lane Runtime Configurable System',
    spec: 'Zynq SoC · AXI4-Lite ICD tables · browser operated test instrument',
    domain: 'FPGA · Avionics · Embedded Linux',
    bullets: [
      'Built a self contained ARINC 429 test instrument operated entirely from a browser, where an engineer restarts the system, transmits any label on any lane in engineering units and watches the result on the receiver dashboard, with no bitstream rebuild or external tooling',
      'Architected the multi lane runtime configurable transmit and receive cores in VHDL on a Zynq SoC, replacing compiled constants with AXI4-Lite loaded ICD tables so a new label set is a file change, not a rebuild, and adding loss of signal detection, built in test, timestamping and interrupts',
      'Built the stack behind the pages, a C daemon owning lossless capture in a shared memory ring and a Python HTTP and WebSocket bridge streaming live label updates, proven with all 32 labels bit exact from transmit through the wire to the dashboard',
      'Directed AI coding agents across the RTL, verification and hardware bring up while owning the architecture and every design decision, gating changes through an audit, judge, fix and verify pipeline that closed 18 of 18 checks on the board'
    ],
    imgs: [
      '/images/arinc_01_system_diagram.webp',
      '/images/arinc_02_software_stack.webp',
      '/images/arinc_03_wire_capture.webp',
      '/images/arinc_04_ram_bench.webp',
      '/images/arinc_05_label_dump.webp'
    ],
    alts: [
      'Full system diagram, browser and test clients over the ARM Linux stack, two ARINC 429 lanes in the FPGA joined only through AXI and /dev/mem',
      'Processing system software stack, ICD file to arinc_icd.py, C capture daemon into shared memory, Python server streaming to the browser',
      'One ARINC 429 word captured on the wire from the Zedboard PL, 5 us pulses and 10 us bits, 2171 words all odd parity',
      'FPGA RAM access benchmark from Python over /dev/mem, poll scan at 1457 scans per second with 14.6x headroom over the 10 ms label rate',
      'Receive RAM dump on the board, all 32 labels decoded in engineering units with measured rates matching the ICD'
    ],
    links: [],
    tags: ['VHDL', 'AXI4-Lite', 'Zynq', 'PetaLinux', 'C', 'Python', 'WebSocket', 'Shared Memory']
  },
  {
    slug: 'ecng-production-systems',
    group: 'software',
    title: 'ECNG Energy Production Systems',
    spec: 'Claude API invoice extraction · IESO price alerts · portal automation',
    domain: 'Software · Data · AI',
    bullets: [
      'Built a Python FastAPI service on the Claude API that reads utility invoice PDFs for a production C# billing application, reaching a 97 percent match rate across 265 utilities, guarded by a 22 invoice regression suite run before every deploy',
      'Diagnosed three production failures in Selenium Python scrapers behind two factor login, adding session reauthentication, a grid paging fix, and stale file cleanup that took a monthly run of 208 utility reports from 27 failures to zero',
      'Automated a supplier portal monthly invoice and consumption downloads in VB.NET on .NET 8 with Playwright, covering 110 customer accounts and loading roughly 1,100 rows a month into SQL Server with zero errors',
      'Built a Python Microsoft Graph service with certificate based application authentication that files utility reports from a shared mailbox into SQL Server and raises tracking tickets automatically',
      'Shipped a daily IESO price alert pipeline, a VB.NET sender with a C# ASP.NET admin page for per client thresholds, running in production every day since May 2026'
    ],
    imgs: [], alts: [], links: [],
    tags: ['Python', 'FastAPI', 'Claude API', 'C#', 'VB.NET', 'SQL Server', 'Playwright', 'Selenium']
  },
  {
    slug: 'ai-agent-town-simulation',
    group: 'software',
    title: 'AI Agent Town Simulation',
    spec: '3D town · five LLM providers · ten year mock run',
    domain: 'AI · Simulation · Three.js',
    bullets: [
      'Built a 3D town where every resident is a different large language model (Claude, GPT, Gemini, Grok, DeepSeek) so their behaviour can be compared on the same daily decisions',
      'Wrote a TypeScript engine with five provider adapters and a mock brain, so a ten year run replays offline at zero cost',
      'Rendered the town in React Three Fiber with real GLB houses, Mixamo characters sharing 69 animations, seasons, day and night, weather, house interiors and street routing',
      'Added a shopping pipeline that fetches, measures and fits a 3D model for anything an agent decides to buy'
    ],
    imgs: [], alts: [],
    links: [{ label: 'Source', url: 'https://github.com/louayalarfi1/ai-town' }],
    tags: ['TypeScript', 'React Three Fiber', 'Three.js', 'LLM APIs', 'Node']
  },
  {
    slug: 'job-scanner',
    group: 'software',
    draft: true,
    title: 'Job Scanner',
    spec: 'LinkedIn scan · full description vetting · three tracks',
    domain: 'Automation · AI Agents',
    bullets: [
      'Built a scanner that pulls new FPGA, embedded and VLSI postings, reads the full description and posting date, and vets years of experience and eligibility before a role reaches the shortlist',
      'Added a vetting stage after early title level guesses proved wrong, and a slower paced retry that recovered 16 postings after a rate limit'
    ],
    imgs: [], alts: [], links: [],
    tags: ['Automation', 'Claude Code', 'Agents']
  },
  {
    slug: 'signal-processing',
    group: 'software',
    draft: true,
    title: 'Signal Processing',
    spec: 'ENGG3390 · DSP · Fourier · filter design',
    domain: 'DSP · MATLAB',
    bullets: ['Designed and analysed digital filters and Fourier based processing chains in MATLAB'],
    imgs: [], alts: [], links: [],
    tags: ['MATLAB', 'DSP']
  },
  {
    slug: 'k60-microcomputer-interfacing',
    group: 'embedded',
    draft: true,
    title: 'K60 Microcomputer Interfacing',
    spec: 'ENGG3640 · Freescale K60 · bare metal peripherals',
    domain: 'Embedded · Peripherals',
    bullets: ['Wrote bare metal C drivers on a Freescale K60 for SPI, I2C, UART and GPIO peripherals'],
    imgs: [], alts: [], links: [],
    tags: ['C', 'K60', 'SPI', 'I2C', 'UART']
  },
  {
    slug: 'rocket-wing-cad',
    group: 'embedded',
    draft: true,
    title: 'Rocket Wing Design',
    spec: 'ENGG2100 · SolidWorks · printed prototype',
    domain: 'CAD · Mechanical',
    bullets: ['Modelled a rocket wing in SolidWorks and produced a printed prototype'],
    imgs: [], alts: [], links: [],
    tags: ['SolidWorks', 'CAD', '3D Printing']
  }
];

// Bullet points behind each role on the experience card, the same wording as the resume.
// Keyed by the start of the role title on the classic page; anything not listed falls back to its description.
export const EXPERIENCE_BULLETS = {
  'Software / Systems Developer': { org: 'ECNG Energy Group', bullets: [
    'Built a Python FastAPI service on the Claude API that reads utility invoice PDFs for a production C# billing application, reaching a 97 percent match rate across 265 utilities, guarded by a 22 invoice regression suite run before every deploy',
    'Diagnosed three production failures in Selenium Python scrapers behind two factor login, adding session reauthentication, a grid paging fix, and stale file cleanup that took a monthly run of 208 utility reports from 27 failures to zero',
    'Automated a supplier portal monthly invoice and consumption downloads in VB.NET on .NET 8 with Playwright, covering 110 customer accounts and loading roughly 1,100 rows a month into SQL Server with zero errors',
    'Built a Python Microsoft Graph service with certificate based application authentication that files utility reports from a shared mailbox into SQL Server and raises tracking tickets automatically',
    'Shipped a daily IESO price alert pipeline, a VB.NET sender with a C# ASP.NET admin page for per client thresholds, running in production every day since May 2026'
  ] },
  'Teaching Assistant, Electric Circuits': { org: 'University of Guelph', bullets: [
    'Led the lab section for Electric Circuits (ENGG2450), coaching students through building RLC and operational amplifier circuits on the bench',
    'Taught oscilloscope measurement technique and guided students to diagnose their own wiring and measurement faults rather than handing them the answer',
    'Covered nodal and mesh analysis, superposition, Thevenin and Norton equivalents, and DC, AC, op amp and first and second order circuit labs'
  ] },
  'Teaching Assistant, Engineering Systems Analysis': { org: 'University of Guelph', bullets: [
    'Ran weekly tutorials for Engineering Systems Analysis (ENGG2400), teaching students to model mechanical, electrical, thermal and fluid systems',
    'Worked through deriving transfer functions and solving step and frequency responses with Laplace methods, and supported the graded tutorial assignments'
  ] },
  'Co-Leader, SolidWorks User Group': { org: 'University of Guelph', bullets: [
    'Organized workshops and tutorials to strengthen 3D modelling and CAD skills across the engineering student community',
    'Co led the group for two academic years, Sep 2024 to Apr 2026'
  ] },
  'Robotics Instructor': { org: 'Exceed Robotics', bullets: [
    'Taught SolidWorks, Inventor, LEGO Mindstorms and Arduino to students',
    'Led students through IoT smart house projects and supervised FDM and SLA 3D printing',
    'Coached a team to regional VEX success'
  ] },
  'Robotics & Mathematics Teacher': { org: 'Alwataniah Syria National School', bullets: [
    'Taught coding, robotics and mathematics to students aged 5 to 15 for five years',
    'Used LEGO Mindstorms, Scratch and Arduino, adjusting the approach to each class from student feedback'
  ] }
};
