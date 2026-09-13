// Boot sequence controller.
// Requires #boot, #bootlog, #bootbar, #bootenter elements in the DOM.
//
// Usage:
//   import { startBoot } from './ui/boot.js';
//   startBoot(() => { /* init 3D here */ });

const LINES = [
  "POST ............................ <span class='ok'>OK</span>",
  "charge capacitors · 12V rail ...... <span class='ok'>stable</span>",
  "energize: <b>CPU / VLSI</b> .......... <span class='cy'>live</span>",
  "energize: <b>GPU / FPGA</b> .......... <span class='cy'>live</span>",
  "energize: <b>DEV BOARDS</b> .......... <span class='cy'>live</span>",
  "bake reflections · env map ........ <span class='ok'>done</span>",
  "ionize cable plasma ............... <span class='cy'>flowing</span>",
  "project holograms ................. <span class='ok'>ready</span>",
];

const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

export function startBoot(onComplete) {
  const log   = document.getElementById('bootlog');
  const bar   = document.getElementById('bootbar');
  const enter = document.getElementById('bootenter');
  const boot  = document.getElementById('boot');
  const lb    = document.getElementById('lightbox');

  let done = false;

  function finish() {
    if (done) return;
    done = true;
    boot.classList.add('done');
    onComplete();
  }

  // lightbox close
  if (lb) {
    const lbimg = document.getElementById('lbimg');
    lb.addEventListener('click', () => lb.classList.remove('open'));
    window.__openImg = (u) => { lbimg.src = u; lb.classList.add('open'); };
  }

  if (reduce) {
    log.innerHTML = LINES.join('\n');
    bar.style.width = '100%';
    enter.classList.add('show');
  } else {
    let i = 0;
    (function next() {
      if (i < LINES.length) {
        log.innerHTML += (i ? '\n' : '') + LINES[i];
        bar.style.width = ((i + 1) / LINES.length * 100) + '%';
        i++;
        setTimeout(next, 150 + Math.random() * 110);
      } else {
        setTimeout(() => enter.classList.add('show'), 250);
      }
    })();
  }

  enter.addEventListener('click', finish);
  boot.addEventListener('click', () => { if (enter.classList.contains('show')) finish(); });
  document.addEventListener('keydown', e => {
    if (!done && (e.key === 'Enter' || e.key === ' ')) finish();
  });
}
