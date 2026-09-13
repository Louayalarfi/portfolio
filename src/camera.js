// Orbit + spark-race + dive camera state machine.
//
// Flow when a component is clicked:
//   1. 'spark-race' (0.55s), sparks race along the cable; camera watches
//   2. 'dive' (2.0s), plasma tunnel fly-through
//   3. 'orbit', settle on component; tablet slides in
//
// Exports: { diveTo, goOverview, orbitTo, tick }

import * as THREE from 'three';
import { PROJECTS } from './config.js';

const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
const RACE_DUR = reduce ? 0.001 : 0.55;

export function buildCamera(camera, renderer, components, holo, monitor, cables, tablet) {
  const BASE_FOV = camera.fov;

  const home = { target:new THREE.Vector3(0.2,2.0,0), r:11, theta:0.62, phi:1.0 };
  const cam  = { target:home.target.clone(), r:home.r, theta:home.theta, phi:home.phi };

  let mode       = 'orbit';
  let orbitAnim  = null;
  let dive       = null;
  let sparkRace  = null;  // { region, t, dur }
  let focus      = null;

  // ── spherical orbit ──────────────────────────────────────────────────────
  function applyOrbit() {
    const sp=Math.sin(cam.phi), cp=Math.cos(cam.phi);
    const st=Math.sin(cam.theta), ct=Math.cos(cam.theta);
    camera.position.set(cam.target.x+cam.r*sp*st, cam.target.y+cam.r*cp, cam.target.z+cam.r*sp*ct);
    camera.lookAt(cam.target);
  }

  function easeIO(t){ return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }

  function orbitTo(v) {
    orbitAnim = {
      t:0, dur:reduce?0.001:1.0,
      from:{ target:cam.target.clone(), r:cam.r, theta:cam.theta, phi:cam.phi },
      to:  { target:v.target.clone(),   r:v.r,   theta:v.theta,   phi:v.phi   },
    };
  }

  function deriveOrbit(center, pos) {
    const d=new THREE.Vector3().subVectors(pos,center);
    const r=Math.max(1.4,d.length());
    cam.target.copy(center); cam.r=r;
    cam.phi=Math.acos(Math.max(-1,Math.min(1,d.y/r)));
    cam.theta=Math.atan2(d.x,d.z);
  }

  // ── dive ─────────────────────────────────────────────────────────────────
  const warpEl = document.getElementById('warp');
  const hintEl = document.getElementById('hint');

  function startDive(region) {
    const c = components[region];
    if(!c||!c.dive) return;
    mode='dive'; orbitAnim=null; focus=region;

    dive = {
      region, curve:c.dive, t:0, dur:reduce?0.001:2.0,
      fromPos:camera.position.clone(), tunnel:c.tunnel, tmat:c.tmat, center:c.center,
    };
    c.tunnel.visible=true;
    if(warpEl) warpEl.classList.add('on');
    if(reduce) endDive();
  }

  function endDive() {
    const c=components[dive.region], region=dive.region;
    c.tunnel.visible=false;
    if(warpEl) warpEl.classList.remove('on');
    camera.fov=BASE_FOV; camera.updateProjectionMatrix();
    mode='orbit';

    if(region==='software'){
      const sw=monitor.screenWorld;
      deriveOrbit(sw,camera.position);
      orbitTo({target:sw.clone(),r:2.7,theta:cam.theta,phi:cam.phi});
      monitor.setMode('software');
    } else {
      deriveOrbit(c.center,camera.position);
      const n=PROJECTS[region].length;
      orbitTo({target:c.center.clone(),r:3.0+n*0.4,theta:cam.theta,phi:Math.min(1.25,cam.phi)});
      holo.buildProjectHolos(region);
    }

    // show tablet with this region
    if(tablet) tablet.showRegion(region);

    dive=null;
  }

  function updateDive(dt) {
    dive.t=Math.min(1,dive.t+dt/dive.dur);
    const t=dive.t, pre=0.15, curve=dive.curve;
    const look=new THREE.Vector3();

    if(t<pre){
      const u=t/pre;
      camera.position.lerpVectors(dive.fromPos,curve.getPointAt(0),easeIO(u));
      look.copy(curve.getPointAt(0.03));
    } else {
      const u=(t-pre)/(1-pre), e=easeIO(u);
      camera.position.copy(curve.getPointAt(e));
      look.copy(curve.getPointAt(Math.min(1,e+0.05)));
    }

    camera.lookAt(look);
    const warp=Math.sin(t*Math.PI);
    camera.fov=BASE_FOV+warp*22; camera.updateProjectionMatrix();
    camera.rotation.z+=Math.sin(t*46)*0.004*warp;
    dive.tmat.uniforms.uTime.value+=dt;
    if(t>=1) endDive();
  }

  // ── spark-race phase (before dive) ───────────────────────────────────────
  // Camera pans slightly toward the cable endpoint so you see the sparks race
  function diveTo(region) {
    const c=components[region]; if(!c||!c.dive) return;
    if(mode==='dive'||mode==='spark-race') return;  // already running

    mode='spark-race';
    focus=region;
    holo.clearHolos();
    holo.introGroup.visible=false;
    if(hintEl) hintEl.style.opacity='0';
    if(tablet) tablet.hide();

    // gently pan camera to look at the cable midpoint
    const targetPt = c.dive.getPointAt(0.5);
    // save current orbit, pan to look at midpoint with same radius
    const panTarget = { target:targetPt.clone(), r:cam.r*0.85, theta:cam.theta, phi:Math.max(0.7,cam.phi) };
    orbitTo(panTarget);

    sparkRace = { region, t:0, dur:RACE_DUR };

    // tell cables module to start the race; it calls back when done
    if(cables) {
      cables.startSparkRace(region, ()=>{
        sparkRace=null;
        orbitAnim=null;
        startDive(region);
      });
    } else {
      // no cables module, dive immediately
      setTimeout(()=>{ sparkRace=null; startDive(region); }, 10);
    }
  }

  // ── overview ─────────────────────────────────────────────────────────────
  function goOverview() {
    if(cables) cables.cancelSparkRace();
    mode='orbit'; dive=null; focus=null; sparkRace=null;
    holo.clearHolos();
    monitor.setMode('home');
    holo.introGroup.visible=true;
    if(tablet) tablet.hide();
    if(warpEl) warpEl.classList.remove('on');
    if(hintEl) hintEl.style.opacity='1';
    if(camera.fov!==BASE_FOV){ camera.fov=BASE_FOV; camera.updateProjectionMatrix(); }
    orbitTo(home);
  }

  // ── input ─────────────────────────────────────────────────────────────────
  const canvas=renderer.domElement;
  const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();

  function pickFrom(x,y,list){
    ndc.x=(x/innerWidth)*2-1; ndc.y=-(y/innerHeight)*2+1;
    ray.setFromCamera(ndc,camera);
    return ray.intersectObjects(list,false);
  }

  const clickable=[];
  function rebuildClickable(){
    clickable.length=0;
    for(const k in components){
      components[k].group.traverse(o=>{ if(o.isMesh){o.userData.region=k;clickable.push(o);} });
    }
  }
  rebuildClickable();

  let dragging=false,moved=0,lx=0,ly=0,pinch=0;

  canvas.addEventListener('pointerdown',e=>{
    if(mode==='dive') return;
    dragging=true; moved=0; lx=e.clientX; ly=e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove',e=>{
    if(dragging && mode==='orbit'){
      const dx=e.clientX-lx, dy=e.clientY-ly;
      moved+=Math.abs(dx)+Math.abs(dy); lx=e.clientX; ly=e.clientY;
      cam.theta-=dx*0.005;
      cam.phi=Math.max(0.2,Math.min(1.5,cam.phi-dy*0.005));
      orbitAnim=null;
    } else if(mode==='orbit'){
      const hH=holo.HOLO_PICK.length?pickFrom(e.clientX,e.clientY,holo.HOLO_PICK):[];
      const tabPick=(tablet?.PICK?.length&&mode==='orbit')?pickFrom(e.clientX,e.clientY,tablet.PICK):[];
      const hC=hH.length||tabPick.length?[]:pickFrom(e.clientX,e.clientY,clickable);
      canvas.style.cursor=(hH.length||hC.length||tabPick.length)?'pointer':'grab';
    }
  });

  canvas.addEventListener('pointerup',e=>{
    if(!dragging) return; dragging=false;
    if(moved>6) return;

    // tablet hits
    if(tablet?.PICK?.length){
      const tabHits=pickFrom(e.clientX,e.clientY,tablet.PICK);
      if(tabHits.length){
        const obj=tabHits[0].object;
        if(obj.userData.tabAction==='home'){ goOverview(); return; }
        if(obj.userData.tabAction==='screen'&&tabHits[0].uv){
          tablet.handleScreenClick(tabHits[0].uv); return;
        }
      }
    }

    // holo card hits
    const hH=holo.HOLO_PICK.length?pickFrom(e.clientX,e.clientY,holo.HOLO_PICK):[];
    if(hH.length){ holo.handleHoloPick(hH[0].object); return; }

    // component hits → spark race → dive
    if(mode==='orbit'){
      const hC=pickFrom(e.clientX,e.clientY,clickable);
      if(hC.length) diveTo(hC[0].object.userData.region);
    }
  });

  canvas.addEventListener('wheel',e=>{
    if(mode!=='orbit') return;
    e.preventDefault();
    cam.r=Math.max(2.0,Math.min(20,cam.r+e.deltaY*0.01)); orbitAnim=null;
  },{passive:false});

  canvas.addEventListener('touchstart',e=>{ if(e.touches.length===2)pinch=d2(e.touches); },{passive:true});
  canvas.addEventListener('touchmove',e=>{
    if(e.touches.length===2&&mode==='orbit'){
      const d=d2(e.touches); cam.r=Math.max(2,Math.min(20,cam.r+(pinch-d)*0.01)); pinch=d; orbitAnim=null;
    }
  },{passive:true});

  function d2(t){ return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY); }

  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });

  // ── tick (every frame) ───────────────────────────────────────────────────
  function tick(dt) {
    if(mode==='dive' && dive){
      updateDive(dt);
    } else {
      // spark-race or orbit, orbit anim still runs (camera pans to watch sparks)
      if(orbitAnim){
        orbitAnim.t=Math.min(1,orbitAnim.t+dt/orbitAnim.dur);
        const e=easeIO(orbitAnim.t);
        cam.target.lerpVectors(orbitAnim.from.target,orbitAnim.to.target,e);
        cam.r    =orbitAnim.from.r    +(orbitAnim.to.r    -orbitAnim.from.r    )*e;
        cam.theta=orbitAnim.from.theta+(orbitAnim.to.theta-orbitAnim.from.theta)*e;
        cam.phi  =orbitAnim.from.phi  +(orbitAnim.to.phi  -orbitAnim.from.phi  )*e;
        if(orbitAnim.t>=1) orbitAnim=null;
      }
      applyOrbit();
    }

    // advance spark race timer (cables module uses its own clock too, but we
    // also pump real dt so the progress stays frame-rate-independent)
    if(cables&&sparkRace) cables.tickRace(dt);
  }

  applyOrbit();

  return { diveTo, goOverview, orbitTo, tick };
}
