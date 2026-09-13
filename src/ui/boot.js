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
    lb.addEventListener('click', () => lb.classList.remove('open'));
    window.__openImg = (u) => { lbimg.src = u; lb.classList.add('open'); };
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
