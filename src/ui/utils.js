// Shared 2D canvas helpers used across monitor, holo cards, and info panels.

/**
 * Draw a rounded rectangle path (does NOT stroke/fill, caller does that).
 */
export function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * Word-wrap text into a canvas context.
 * Returns the y coordinate of the line after the last rendered line.
 */
export function wrap(g, text, x, y, maxW, lh, maxL) {
  const words = text.split(' ');
  let line = '', yy = y, n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line.trim(), x, yy);
      line = words[i] + ' ';
      yy += lh;
      n++;
      if (n >= maxL - 1) {
        if (i < words.length - 1) line = line.trim() + '…';
        break;
      }
    } else {
      line = test;
    }
  }
  g.fillText(line.trim(), x, yy);
  return yy + lh;
}

/**
 * Build a glow-halo canvas texture (white radial gradient, used for sprites).
 */
export function makeHaloTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0,   'rgba(255,255,255,1)');
  rg.addColorStop(0.25,'rgba(255,255,255,.6)');
  rg.addColorStop(1,   'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/**
 * Add a glow sprite at a local position inside parent.
 */
export function halo(THREE, haloTex, hex, size, x, y, z, parent, scene) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTex,
    color: hex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.9,
  }));
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  (parent || scene).add(s);
  return s;
}

/**
 * Build a procedural PCB-trace canvas texture.
 */
export function pcbTex(THREE, base, trace) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 512, 512);
  x.lineCap = 'round';
  x.strokeStyle = trace;
  x.lineWidth = 2;
  x.globalAlpha = 0.45;
  for (let i = 0; i < 70; i++) {
    let px = Math.random() * 512, py = Math.random() * 512;
    x.beginPath(); x.moveTo(px, py);
    for (let j = 0; j < 4; j++) {
      if (Math.random() < 0.5) px += Math.random() * 90 - 45;
      else py += Math.random() * 90 - 45;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  x.globalAlpha = 0.7;
  x.fillStyle = trace;
  for (let i = 0; i < 140; i++) {
    x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 2.4, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
