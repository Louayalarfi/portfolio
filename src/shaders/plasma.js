// The dive tunnel: electricity flowing down the inside of a cable.
export const PLASMA_VERT = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

export function plasmaFrag(octaves = 5) {
  return `#define OCTAVES ${octaves}
precision highp float;
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
  float glow=g*0.3+core*0.45+n*0.22;
  vec3 col=uColor*glow+vec3(0.7,0.85,1.0)*g*0.12;
  col=col/(1.0+col);
  gl_FragColor=vec4(col,clamp(glow*0.42,0.0,0.85));
}`;
}
