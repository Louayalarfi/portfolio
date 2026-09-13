// Realistic sleeved cables + animated spark particles.
// Pre-dive spark-race: when a component is clicked, sparks race along its cable
// before the plasma tunnel opens.
//
// Usage:
//   const cables = buildCables(scene, components, screenWorld, screenNormal, haloTex);
//   cables.animateCables(time);
//   cables.startSparkRace(region, onComplete);   // starts pre-dive sequence
//   cables.cancelSparkRace();

import * as THREE from 'three';
import { REGIONS } from '../config.js';

// ─── Plasma tunnel shader ──────────────────────────────────────────────────
const VERT = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

const FRAG = `precision highp float;
uniform float uTime; uniform vec3 uColor;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.0-2.0*f);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<OCTAVES;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
void main(){
  float flow=vUv.x*7.0-uTime*3.0; float g=0.0;
  for(int k=0;k<3;k++){float fk=float(k);
    float center=0.5+0.30*sin(flow*1.3+fk*2.1)+0.10*fbm(vec2(vUv.x*4.0,flow*0.5+fk*3.0));
    float d=abs(vUv.y-center);d=min(d,1.0-d);g+=0.010/(d*d+0.0008);}
  float core=0.018/(abs(vUv.y-0.5)*abs(vUv.y-0.5)+0.02);
  float n=fbm(vec2(vUv.y*8.0,flow));
  float glow=g+core*0.5+n*0.22;
  vec3 col=uColor*glow+vec3(0.7,0.85,1.0)*g*0.45;
  gl_FragColor=vec4(col,clamp(glow*0.85,0.0,1.0));
}`;

// ─── helper: build a realistic sleeved cable ──────────────────────────────
function buildSleevedCable(scene, pts, hex, radius=0.055) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));

  // main sleeve (dark rubber-like jacket)
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x08090e, metalness: 0.05, roughness: 0.88,
    emissive: hex, emissiveIntensity: 0.06,
  });
  const sleeve = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 10, false), sleeveMat);
  sleeve.castShadow = true;
  scene.add(sleeve);

  // inner glow core (additive blending, thinner tube)
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: hex, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius*0.35, 8, false), coreMat);
  core.renderOrder = 1;
  scene.add(core);

  // connector housings at each end
  function addConnector(t) {
    const pt  = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const connMat = new THREE.MeshStandardMaterial({ color: 0x0d1018, metalness:0.4, roughness:0.6 });
    const conn = new THREE.Mesh(new THREE.BoxGeometry(radius*3.5, radius*2.0, radius*4.5), connMat);
    conn.position.copy(pt);
    conn.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), tan);
    conn.castShadow = true;
    scene.add(conn);
    // gold pins
    const pinMat = new THREE.MeshStandardMaterial({color:0xd9b25a, metalness:0.98, roughness:0.3});
    for(let r=0;r<2;r++) for(let c=0;c<3;c++){
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.008,0.008,0.018), pinMat);
      pin.position.set((c-1)*radius*0.95,(r-0.5)*radius*0.7,0);
      conn.add(pin);
    }
    return conn;
  }
  addConnector(0.02);
  addConnector(0.98);

  return { curve, mat: sleeveMat, coreMat };
}

// ─── spark particles (racing along a curve) ───────────────────────────────
function buildSparkSystem(scene, haloTex, count=8) {
  const sparks = [];
  for(let k=0;k<count;k++){
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex, color: 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    s.scale.set(0.18,0.18,1);
    scene.add(s);
    sparks.push(s);
  }
  return sparks;
}

// ─── main export ──────────────────────────────────────────────────────────
export function buildCables(scene, components, screenWorld, screenNormal, haloTex, octaves = 5) {
  const FRAG_TIERED = `#define OCTAVES ${octaves}\n` + FRAG;

  // ── regular animated cables (persistent) ──
  const cables = [];

  function makeCable(pts, hex, radius=0.055) {
    const { curve, mat, coreMat } = buildSleevedCable(scene, pts, hex, radius);
    const sparks = buildSparkSystem(scene, haloTex, 5);
    cables.push({ curve, mat, coreMat, sparks, hex });
  }

  makeCable([[-2.2,0.95,0.55],[-2.4,1.7,0.5],[-2.5,2.4,0.1],[-2.5,2.7,-0.1]], 0x4fd8e0);
  makeCable([[-1.9,0.95,0.5],[-2.0,1.2,0.4],[-2.1,1.45,0.1]],                 0xe7609f);
  makeCable([[-1.7,0.95,0.5],[-1.6,1.7,0.3],[-1.45,2.2,-0.1]],                0xa7d96a);
  makeCable([[-1.2,0.55,0.6],[0.3,0.35,1.2],[1.2,0.99,1.7]],                  0xf0a830, 0.04);
  makeCable([[-1.0,0.55,0.5],[1.0,0.4,1.0],[2.6,0.99,0.95]],                  0x9d84ef, 0.04);

  // ── plasma dive conduits (one per region) ──
  function makeDive(region, pts) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
    curve.arcLengthDivisions = 200;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime:{value:0}, uColor:{value:new THREE.Color(REGIONS[region].color)} },
      vertexShader: VERT, fragmentShader: FRAG_TIERED,
      transparent:true, blending:THREE.AdditiveBlending, side:THREE.BackSide, depthWrite:false, fog:false,
    });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.5, 24, false), mat);
    tube.visible=false; tube.renderOrder=3; scene.add(tube);
    components[region].dive   = curve;
    components[region].tunnel = tube;
    components[region].tmat   = mat;
  }

  makeDive('vlsi',     [[1.2,4.4,3.4],[0.0,3.7,1.7],[-1.5,3.2,0.6],[-2.1,2.95,0.35],[-2.45,2.9,-0.05]]);
  makeDive('fpga',     [[1.6,3.0,3.6],[0.2,2.3,1.9],[-1.2,1.85,0.8],[-2.0,1.6,0.45]]);
  makeDive('embedded', [[3.4,3.0,3.8],[2.6,1.9,2.8],[1.95,1.25,2.1],[1.5,1.12,1.85]]);
  makeDive('control',  [[4.8,2.8,3.0],[3.8,1.7,2.0],[3.1,1.2,1.3],[2.9,1.12,1.05]]);
  {
    const endCam = screenWorld.clone().add((screenNormal||new THREE.Vector3(0,0,1)).clone().multiplyScalar(2.3));
    makeDive('software', [[-1.0,3.4,1.0],[0.4,3.0,1.6],[1.6,2.7,1.6],[endCam.x,endCam.y+0.1,endCam.z]]);
  }

  // ── spark race (pre-dive) ──
  // A set of fast sparks that race along the cable to the target component
  const RACE_COUNT = 14;
  const raceSparks = buildSparkSystem(scene, haloTex, RACE_COUNT);

  let raceState = null;

  // Map regions to which cable index feeds them
  const REGION_CABLE_IDX = { vlsi:0, fpga:1, software:2, embedded:3, control:4 };

  function startSparkRace(region, onComplete) {
    const cableIdx = REGION_CABLE_IDX[region] ?? 0;
    const cable    = cables[cableIdx];
    const hex      = cable.hex;
    const duration = 0.55; // seconds to race the full cable

    // set spark colours
    raceSparks.forEach(s => {
      s.material.color.setHex(hex);
      s.material.opacity = 1;
    });

    raceState = { cable, hex, t:0, duration, onComplete, done:false };
  }

  function cancelSparkRace() {
    raceState = null;
    raceSparks.forEach(s => { s.material.opacity = 0; s.position.set(0,-999,0); });
  }

  // ── regular animation ──
  function animateCables(time) {
    // idle cable pulses + spark fireflies
    cables.forEach((cb,i) => {
      cb.mat.emissiveIntensity    = 0.05 + 0.06*Math.sin(time*2.5+i);
      cb.coreMat.emissiveIntensity= 0.35 + 0.25*Math.sin(time*3+i)+0.12*Math.sin(time*17+i*5);
      cb.sparks.forEach((s,k) => {
        const tt = ((time*0.45)+i*0.3+k/cb.sparks.length) % 1;
        s.position.copy(cb.curve.getPoint(tt));
        const fl = 0.10 + 0.08*Math.abs(Math.sin(time*18+k*3+i));
        s.scale.set(fl,fl,1);
        s.material.opacity = 0.55 + 0.35*Math.abs(Math.sin(time*8+k));
      });
    });

    // spark race animation
    if (raceState && !raceState.done) {
      const progress = Math.min(raceState.t / raceState.duration, 1);

      raceSparks.forEach((s,k) => {
        // staggered offsets, spread them along the cable
        const offset = (k/RACE_COUNT)*0.35;
        const tt = Math.min(1, Math.max(0, progress - offset));
        if(tt <= 0){ s.material.opacity=0; return; }
        s.position.copy(raceState.cable.curve.getPoint(tt));
        const fl = 0.22 + 0.12*Math.sin(time*30+k*2.1);
        s.scale.set(fl,fl,1);
        const trail = 1 - offset/0.35;
        s.material.opacity = 0.9 * trail * Math.sin(Math.min(1,tt*6)*Math.PI);
      });

      // flash the cable bright as race passes
      raceState.cable.coreMat.emissiveIntensity = 1.5 + 0.5*Math.sin(time*40);
      raceState.cable.mat.emissiveIntensity     = 0.4 + 0.2*Math.sin(time*40);

      if(progress >= 1 && !raceState.done) {
        raceState.done = true;
        cancelSparkRace();
        raceState.onComplete && raceState.onComplete();
      }
    }
  }

  // expose raceState.t update so camera.js can tick with real dt
  function tickRace(dt) {
    if(raceState && !raceState.done) raceState.t += dt;
  }

  return { animateCables, startSparkRace, cancelSparkRace, tickRace };
}
