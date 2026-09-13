// One LoadingManager for the whole scene so the boot bar shows real progress.
// Critical assets gate the ENTER key, everything else streams in behind the scene.
import * as THREE from 'three';

export function createLoader() {
  const manager = new THREE.LoadingManager();
  const listeners = new Set();
  const critical = new Set();
  const pending = new Set();
  let loadedCount = 0, totalCount = 0;
  let idleResolve = null;
  let idleTimer = null;

  const emit = (event) => listeners.forEach((fn) => fn(event));

  manager.onStart = (url, loaded, total) => { loadedCount = loaded; totalCount = total; emit({ type: 'start', url, loaded, total }); };
  manager.onProgress = (url, loaded, total) => {
    loadedCount = loaded; totalCount = total;
    pending.delete(url);
    emit({ type: 'progress', url, loaded, total, ratio: total ? loaded / total : 1 });
    checkCritical();
  };
  manager.onError = (url) => {
    pending.delete(url);
    emit({ type: 'error', url });
    checkCritical();
  };
  manager.onLoad = () => { emit({ type: 'idle' }); if (idleResolve) { idleResolve(); idleResolve = null; } };

  function checkCritical() {
    for (const url of critical) if (pending.has(url)) return;
    if (critical.size) emit({ type: 'critical' });
  }

  function track(url, isCritical = false) {
    pending.add(url);
    if (isCritical) critical.add(url);
    return url;
  }

  // Resolves when every started load has finished, or right away if nothing was requested.
  function whenIdle(graceMs = 400) {
    return new Promise((resolve) => {
      if (!pending.size) { resolve(); return; }
      idleResolve = resolve;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { if (!pending.size && idleResolve) { idleResolve(); idleResolve = null; } }, graceMs);
    });
  }

  function criticalReady() {
    return new Promise((resolve) => {
      const done = () => { for (const url of critical) if (pending.has(url)) return false; return true; };
      if (done()) { resolve(); return; }
      const fn = (e) => { if ((e.type === 'critical' || e.type === 'idle') && done()) { listeners.delete(fn); resolve(); } };
      listeners.add(fn);
    });
  }

  return {
    manager,
    track,
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    whenIdle,
    criticalReady,
    get loaded() { return loadedCount; },
    get total() { return totalCount; },
    get pending() { return pending.size; }
  };
}
