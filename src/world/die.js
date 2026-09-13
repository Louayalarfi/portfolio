import * as THREE from 'three';

const CYAN = 0x4fd8e0;
const IMG = {
  top: '/images/TOP_LEVEL_SCHEMATIC.webp',
  mux: '/images/8BITMUX_SCHEMATIC.webp',
  fa: '/images/8BITFA_SCHEMATIC.webp',
  reg: '/images/8BITREGISTER_SCHEMATIC.webp',
  cell: '/images/01_bitcell_layout.webp',
  macro: '/images/04_macro_layout.webp',
  decoder: '/images/06_decoder.webp'
};

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function srgb(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function schematicInvert(data) {
  for (let i = 0; i < data.length; i += 4) {
    const l = 255 - (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const v = Math.min(255, Math.max(0, (l - 12) * 2.2));
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
}

function layoutInvert(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d > 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    const nl = 1 - l;
    const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s;
    const p = 2 * nl - q;
    const ch = (t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    data[i] = ch(h + 1 / 3) * 255;
    data[i + 1] = ch(h) * 255;
    data[i + 2] = ch(h - 1 / 3) * 255;
    data[i + 3] = 255;
  }
}

function makeProcessedLoader(loader) {
  const imgLoader = new THREE.ImageLoader(loader?.manager);
  return function load(url, { process, after, setup, apply }) {
    loader?.track?.(url);
    imgLoader.load(url, (img) => {
      const c = canvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      process(id.data);
      ctx.putImageData(id, 0, 0);
      after?.(ctx, c.width, c.height);
      const tex = srgb(new THREE.CanvasTexture(c));
      setup?.(tex);
      apply(tex);
    }, undefined, () => console.warn('die: texture failed', url));
  };
}

function applyMaps(mat, { map = false, emissive = true } = {}) {
  return (tex) => {
    if (map) mat.map = tex;
    if (emissive) mat.emissiveMap = tex;
    mat.needsUpdate = true;
  };
}

function gridBump() {
  const c = canvas(512, 512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#a0a0a0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 16) {
    ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(512, i + 0.5); ctx.stroke();
  }
  ctx.fillStyle = '#909090';
  for (let y = 8; y < 512; y += 16) for (let x = 8; x < 512; x += 16) ctx.fillRect(x - 1, y - 1, 3, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(24, 24);
  return t;
}

function metalTexture(vertical, seed) {
  const r = rng(seed);
  const c = canvas(512, 512);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = '#bfe9ff';
  for (let p = 4; p < 512; p += 10) {
    const w = 1 + Math.floor(r() * 3);
    let a = 0;
    while (a < 512) {
      const len = 40 + r() * 220, gap = r() < 0.35 ? 8 + r() * 30 : 0;
      if (vertical) ctx.fillRect(p, a, w, len); else ctx.fillRect(a, p, len, w);
      a += len + gap;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
}

function fontsReady(cb) {
  if (!document.fonts?.load) return;
  Promise.all([
    document.fonts.load('700 72px "Chakra Petch"'),
    document.fonts.load('400 36px "IBM Plex Mono"')
  ]).then(cb).catch(() => {});
}

function labelPlane(title, sub, accent, width) {
  const c = canvas(1024, 300);
  const tex = srgb(new THREE.CanvasTexture(c));
  tex.anisotropy = 8;
  const draw = () => {
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 1024, 300);
    ctx.fillStyle = 'rgba(4,8,16,0.72)';
    ctx.beginPath(); ctx.roundRect(8, 8, 1008, 284, 14); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(40, 60, 10, 180);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 84px "Chakra Petch", "Segoe UI", sans-serif';
    ctx.fillText(title, 80, 110);
    ctx.fillStyle = '#d6e6f0';
    ctx.font = '400 38px "IBM Plex Mono", Consolas, monospace';
    ctx.fillText(sub, 82, 205);
    tex.needsUpdate = true;
  };
  draw();
  fontsReady(draw);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 300 / 1024), mat);
  m.renderOrder = 5;
  return m;
}

function slab(w, h, d, color, extra = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.4, ...extra });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = h / 2;
  return m;
}

function flatPlane(w, d, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}

function sparkTexture() {
  const c = canvas(64, 64);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(160,240,255,0.9)');
  g.addColorStop(1, 'rgba(80,200,230,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return srgb(new THREE.CanvasTexture(c));
}

function polyline(points) {
  const path = new THREE.CurvePath();
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    path.add(new THREE.LineCurve3(points[i], points[i + 1]));
    len += points[i].distanceTo(points[i + 1]);
  }
  return { path, len };
}

function buildCore(load, quality, group) {
  const core = new THREE.Group();
  const W = 12, D = 10, H = 0.4;
  const body = slab(W, H, D, 0x0b1218);
  core.add(body);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x0d1a20, roughness: 0.5, metalness: 0.3,
    emissive: new THREE.Color(CYAN), emissiveIntensity: 1.6
  });
  load(IMG.top, {
    process: schematicInvert,
    setup: (t) => { t.repeat.set(0.62, 0.62); t.offset.set(0.2, 0.1); },
    apply: applyMaps(topMat)
  });
  const top = flatPlane(W - 0.3, D - 0.3, topMat);
  top.position.y = H + 0.002;
  core.add(top);

  const subs = [
    { name: 'MUX', url: IMG.mux, x: -3.6, z: -2.6, w: 3.6, d: 2.6 },
    { name: 'FA_8', url: IMG.fa, x: 3.6, z: -2.6, w: 3.6, d: 2.6 },
    { name: '8_REG', url: IMG.reg, x: 0, z: 2.7, w: 5.2, d: 2.6 }
  ];
  const SH = 0.32;
  for (const s of subs) {
    const b = slab(s.w, SH, s.d, 0x121c24, { roughness: 0.45 });
    b.position.set(s.x, H + SH / 2, s.z);
    core.add(b);
    const dm = new THREE.MeshStandardMaterial({
      color: 0x0d1a20, roughness: 0.5, metalness: 0.3,
      emissive: new THREE.Color(CYAN), emissiveIntensity: 1.7
    });
    load(s.url, {
      process: schematicInvert,
      after: (ctx, w, h) => {
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(h * 0.13)}px "Chakra Petch", "Segoe UI", sans-serif`;
        ctx.textBaseline = 'bottom';
        ctx.fillText(s.name, w * 0.13, h * 0.86);
        ctx.fillRect(w * 0.1, h * 0.88, w * 0.8, Math.round(h * 0.012));
      },
      setup: (t) => { t.repeat.set(0.8, 0.8); t.offset.set(0.1, 0.1); },
      apply: applyMaps(dm)
    });
    const p = flatPlane(s.w - 0.16, s.d - 0.16, dm);
    p.position.set(s.x, H + SH + 0.002, s.z);
    core.add(p);
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(s.w + 0.06, 0.02, s.d + 0.06),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35 })
    );
    edge.position.set(s.x, H + SH + 0.01, s.z);
    core.add(edge);
  }

  const count = quality?.tier === 'low' ? 1500 : 4000;
  const r = rng(45045);
  const cellGeo = new THREE.BoxGeometry(1, 1, 1);
  const cellMat = new THREE.MeshStandardMaterial({
    color: 0x1b2229, roughness: 0.7, metalness: 0.35, emissive: new THREE.Color(CYAN), emissiveIntensity: 0.05
  });
  const cells = new THREE.InstancedMesh(cellGeo, cellMat, count);
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3(), scl = new THREE.Vector3(), quat = new THREE.Quaternion();
  const inside = (x, z) => subs.some((s) => Math.abs(x - s.x) < s.w / 2 + 0.12 && Math.abs(z - s.z) < s.d / 2 + 0.12);
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 20) {
    const row = Math.floor(r() * 70);
    const z = -D / 2 + 0.3 + row * ((D - 0.6) / 69);
    const x = -W / 2 + 0.3 + r() * (W - 0.6);
    if (inside(x, z)) continue;
    const h = 0.05 + r() * 0.15;
    const wx = 0.04 + r() * 0.07;
    scl.set(wx, h, 0.055);
    pos.set(x, H + h / 2, z);
    m4.compose(pos, quat, scl);
    cells.setMatrixAt(placed++, m4);
  }
  cells.count = placed;
  cells.instanceMatrix.needsUpdate = true;
  core.add(cells);

  const y = H + SH + 0.16;
  const routes = [
    [new THREE.Vector3(-3.6, y, -1.2), new THREE.Vector3(-3.6, y, 0.3), new THREE.Vector3(-1.6, y, 0.3), new THREE.Vector3(-1.6, y, 1.3)],
    [new THREE.Vector3(3.6, y, -1.2), new THREE.Vector3(3.6, y, 0.6), new THREE.Vector3(1.4, y, 0.6), new THREE.Vector3(1.4, y, 1.3)],
    [new THREE.Vector3(-1.7, y, -2.6), new THREE.Vector3(0, y, -2.6), new THREE.Vector3(0, y, -0.4), new THREE.Vector3(1.7, y, -0.4), new THREE.Vector3(1.7, y, -1.3)],
    [new THREE.Vector3(2.7, y, 2.7), new THREE.Vector3(5.2, y, 2.7), new THREE.Vector3(5.2, y, -3.8), new THREE.Vector3(3.6, y, -3.8)]
  ];
  const busMat = new THREE.MeshBasicMaterial({ color: 0x9df3ff, transparent: true, opacity: 0.9 });
  const sparkMat = new THREE.SpriteMaterial({ map: sparkTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const sparks = [];
  routes.forEach((pts, i) => {
    const { path, len } = polyline(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(8, pts.length * 6), 0.035, 6, false), busMat);
    core.add(tube);
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Sprite(sparkMat);
      sp.scale.setScalar(0.42);
      core.add(sp);
      sparks.push({ sp, path, speed: (1.3 + 0.4 * (i % 3)) / len, t: k / 3, dir: i % 2 ? -1 : 1 });
    }
  });

  group.add(core);
  return { core, topMat, sparks, H, W, D };
}

function buildCache(load, group) {
  const cache = new THREE.Group();
  const S = 10, H = 0.4;
  const body = slab(S, H, S, 0x0d0f16);
  cache.add(body);

  const layoutMat = () => new THREE.MeshStandardMaterial({
    color: 0x0d0f16, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.55, roughness: 0.5, metalness: 0.2
  });
  const arrayW = 7.6, arrayD = 7.6;
  const arrayMat = layoutMat();
  load(IMG.cell, {
    process: layoutInvert,
    setup: (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); },
    apply: applyMaps(arrayMat, { map: true })
  });
  const arr = flatPlane(arrayW, arrayD, arrayMat);
  arr.position.set(0.9, H + 0.003, -0.9);
  cache.add(arr);

  const decMat = layoutMat();
  load(IMG.decoder, {
    process: layoutInvert,
    setup: (t) => { t.repeat.set(0.09, 1); },
    apply: applyMaps(decMat, { map: true })
  });
  const dec = flatPlane(1.4, arrayD, decMat);
  dec.position.set(-3.9, H + 0.003, -0.9);
  cache.add(dec);

  const perMat = layoutMat();
  load(IMG.macro, {
    process: layoutInvert,
    setup: (t) => { t.repeat.set(0.24, 1); },
    apply: applyMaps(perMat, { map: true })
  });
  const per = new THREE.Mesh(new THREE.PlaneGeometry(1.4, arrayW), perMat);
  per.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  per.position.set(0.9, H + 0.003, 3.9);
  cache.add(per);

  const sep = new THREE.MeshBasicMaterial({ color: 0xff7ad9, transparent: true, opacity: 0.5 });
  const sepV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, arrayD), sep);
  sepV.position.set(-2.95, H + 0.01, -0.9);
  const sepH = new THREE.Mesh(new THREE.BoxGeometry(arrayW, 0.02, 0.04), sep);
  sepH.position.set(0.9, H + 0.01, 2.95);
  cache.add(sepV, sepH);

  group.add(cache);
  return { cache, H, S };
}

export function buildDie({ quality, loader } = {}) {
  const group = new THREE.Group();
  group.name = 'die';
  const load = makeProcessedLoader(loader);

  const subMat = new THREE.MeshStandardMaterial({
    color: 0x05070c, roughness: 0.6, metalness: 0.3, bumpMap: gridBump(), bumpScale: 0.02
  });
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 30), subMat);
  substrate.position.y = -0.3;
  substrate.receiveShadow = true;
  group.add(substrate);
  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(30, 0.6, 30)),
    new THREE.LineBasicMaterial({ color: 0x1c2a36 })
  );
  rim.position.y = -0.3;
  group.add(rim);

  const CORE_AT = new THREE.Vector3(-7.5, 0, 0);
  const CACHE_AT = new THREE.Vector3(8, 0, 0);

  const core = buildCore(load, quality, group);
  core.core.position.copy(CORE_AT);
  const cache = buildCache(load, group);
  cache.cache.position.copy(CACHE_AT);

  const coreLabel = labelPlane('CORE', '8 bit program counter · gpdk045 45 nm · 906 ps clock to output', '#4fd8e0', 9);
  coreLabel.position.set(CORE_AT.x, core.H + 1.5, CORE_AT.z);
  group.add(coreLabel);
  const cacheLabel = labelPlane('CACHE', '8x8 6T SRAM · Sky130 · 716 mV SNM', '#ff7ad9', 8);
  cacheLabel.position.set(CACHE_AT.x, cache.H + 1.5, CACHE_AT.z);
  group.add(cacheLabel);

  if (quality?.tier !== 'low') {
    [[1.0, false, 0.1, 11], [1.8, true, 0.08, 12], [2.6, false, 0.06, 13]].forEach(([h, vert, op, seed]) => {
      const mat = new THREE.MeshBasicMaterial({
        map: metalTexture(vert, seed), transparent: true, opacity: op, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, color: 0xa8e6ff
      });
      const p = flatPlane(29, 29, mat);
      p.position.y = h;
      p.renderOrder = 2;
      group.add(p);
    });
  }

  const blocks = {
    pc45: {
      center: new THREE.Vector3(CORE_AT.x, core.H + 0.4, CORE_AT.z),
      orbitR: 15,
      label: 'CORE · 8 bit program counter · gpdk045 45 nm · 906 ps clock to output',
      entry: new THREE.Vector3(CORE_AT.x, core.H + 0.4 + 6, CORE_AT.z)
    },
    sram130: {
      center: new THREE.Vector3(CACHE_AT.x, cache.H + 0.4, CACHE_AT.z),
      orbitR: 13,
      label: 'CACHE · 8x8 6T SRAM · Sky130 · 716 mV SNM',
      entry: new THREE.Vector3(CACHE_AT.x, cache.H + 0.4 + 6, CACHE_AT.z)
    }
  };

  let last = 0;
  function tick(time) {
    const t = (time || 0) * 0.001;
    const dt = last ? Math.min(0.1, t - last) : 0;
    last = t;
    core.topMat.emissiveIntensity = 1.6 + 0.35 * Math.sin(t * 2.2);
    for (const s of core.sparks) {
      s.t = (s.t + dt * s.speed * s.dir + 1) % 1;
      s.path.getPointAt(s.t, s.sp.position);
    }
  }

  return { group, blocks, tick };
}
