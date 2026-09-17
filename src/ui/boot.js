// Boot screen. The BIOS lines are flavour, the bar and the ENTER key follow the real loader.
// Requires #boot, #bootlog, #bootbar, #bootenter in the DOM.

const LINES = [
  "POST ............................ <span class='ok'>OK</span>",
  "charge capacitors · 12V rail ...... <span class='ok'>stable</span>",
  "energize: <b>CPU / VLSI</b> .......... <span class='cy'>live</span>",
  "energize: <b>GPU / FPGA</b> .......... <span class='cy'>live</span>",
  "energize: <b>DEV BOARDS</b> .......... <span class='cy'>live</span>",
  "bake reflections · env map ........ <span class='ok'>done</span>",
  "ionize cable plasma ............... <span class='cy'>flowing</span>",
  "project holograms ................. <span class='ok'>ready</span>"
];

const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

export function startBoot({ loader, skip = false, onEnter }) {
  const log   = document.getElementById('bootlog');
  const bar   = document.getElementById('bootbar');
  const enter = document.getElementById('bootenter');
  const boot  = document.getElementById('boot');
  const lb    = document.getElementById('lightbox');

  if (lb) {
    const lbimg = document.getElementById('lbimg');
    const cap = document.getElementById('lbcap'), count = document.getElementById('lbcount');
    const prev = document.getElementById('lbprev'), next = document.getElementById('lbnext');
    let imgs = [], alts = [], idx = 0, title = '';
    const show = () => {
      lbimg.src = imgs[idx]; lbimg.alt = alts[idx] || '';
      cap.textContent = (title ? title + ' · ' : '') + (alts[idx] || '');
      count.textContent = `${idx + 1} / ${imgs.length}`;
      prev.hidden = next.hidden = imgs.length < 2;
    };
    const close = () => lb.classList.remove('open');
    const step = (d) => { idx = (idx + d + imgs.length) % imgs.length; show(); };
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target === lbimg) close(); });
    document.getElementById('lbclose').addEventListener('click', close);
    prev.addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
    next.addEventListener('click', (e) => { e.stopPropagation(); step(1); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); e.stopImmediatePropagation(); }
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    }, true);
    window.__openGallery = (list, captions, start = 0, name = '') => { imgs = list; alts = captions; idx = start; title = name; show(); lb.classList.add('open'); };
    window.__openImg = (u) => window.__openGallery([u], [], 0);
  }

  // Detail overlay: a role from the experience card, or every role from the HUD button.
  const detail = document.getElementById('detail');
  if (detail) {
    const body = document.getElementById('detail-body');
    const closeD = () => detail.classList.remove('open');
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const role = (r) => `<section><div class="d-dates">${esc(r.dates || '')}</div><h3>${esc(r.title)}</h3><div class="d-sub">${esc(r.sub || '')}</div>`
      + `<ul>${(r.bullets || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
      + (r.tags?.length ? `<div class="d-tags">${r.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : '') + `</section>`;
    detail.addEventListener('click', (e) => { if (e.target === detail) closeD(); });
    document.getElementById('detail-close').addEventListener('click', closeD);
    document.addEventListener('keydown', (e) => { if (detail.classList.contains('open') && e.key === 'Escape') { closeD(); e.stopImmediatePropagation(); } }, true);
    window.__openDetail = (d) => {
      body.innerHTML = d.roles ? `<h2>${esc(d.title)}</h2>` + d.roles.map(role).join('') : role(d);
      body.scrollTop = 0;
      detail.classList.add('open');
    };
  }

  let done = false;
  let linesDone = false;
  let assetsDone = false;
  let lineRatio = 0, assetRatio = 0;

  function paintBar() {
    const ratio = 0.5 * lineRatio + 0.5 * (assetsDone ? 1 : assetRatio);
    bar.style.width = (ratio * 100).toFixed(1) + '%';
  }

  function maybeEnable() {
    if (linesDone && assetsDone) { paintBar(); enter.classList.add('show'); }
  }

  function finish() {
    if (done) return;
    done = true;
    boot.classList.add('done');
    onEnter();
  }

  if (skip) {
    boot.classList.add('done');
    boot.style.transition = 'none';
    done = true;
    onEnter();
    return;
  }

  if (loader) {
    loader.on((e) => {
      if (e.type === 'progress') { assetRatio = e.ratio; paintBar(); }
      if (e.type === 'error') log.innerHTML += `\n<span class='cy'>skip</span> ${e.url.split('/').pop()} (fallback)`;
    });
    loader.criticalReady().then(() => { assetsDone = true; maybeEnable(); });
    setTimeout(() => { if (!assetsDone) { assetsDone = true; maybeEnable(); } }, 8000);
  } else {
    assetsDone = true;
  }

  if (reduce) {
    log.innerHTML = LINES.join('\n');
    lineRatio = 1; linesDone = true; maybeEnable();
  } else {
    let i = 0;
    (function next() {
      if (i < LINES.length) {
        log.innerHTML += (i ? '\n' : '') + LINES[i];
        i++; lineRatio = i / LINES.length; paintBar();
        setTimeout(next, 150 + Math.random() * 110);
      } else {
        setTimeout(() => { linesDone = true; maybeEnable(); }, 250);
      }
    })();
  }

  enter.addEventListener('click', finish);
  boot.addEventListener('click', () => { if (enter.classList.contains('show')) finish(); });
  document.addEventListener('keydown', (e) => {
    if (!done && enter.classList.contains('show') && (e.key === 'Enter' || e.key === ' ')) finish();
  });
}
