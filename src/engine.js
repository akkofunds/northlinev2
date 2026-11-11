import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {fbm,rng} from './textures.js';

export function createRenderer(canvas){
  const r=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',stencil:false});
  r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setSize(innerWidth,innerHeight);
  r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.shadowMap.autoUpdate=false; // static map: shadows baked once
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.autoClear=false;return r;}
export function envMap(renderer){const p=new THREE.PMREMGenerator(renderer);const t=p.fromScene(new RoomEnvironment(),.04).texture;p.dispose();return t;}

export function ensureColor(g){if(!g.attributes.color){const n=g.attributes.position.count,a=new Float32Array(n*3).fill(1);g.setAttribute('color',new THREE.BufferAttribute(a,3));}return g;}
// Merges static geometry per (material, 24m cell): few draw calls + real frustum culling.
export class Batcher{
  constructor(cell=24){this.cell=cell;this.b=new Map();}
  add(geo,mat,x,z){ensureColor(geo);const k=mat.uuid+'|'+Math.floor(x/this.cell)+'|'+Math.floor(z/this.cell);let e=this.b.get(k);
    if(!e)this.b.set(k,e={mat,geos:[]});e.geos.push(geo.index?geo.toNonIndexed():geo);}
  build(scene,solids){for(const{mat,geos}of this.b.values()){const m=new THREE.Mesh(mergeGeometries(geos),mat);
    geos.forEach(g=>g.dispose());m.castShadow=!mat.userData.noShadow;m.receiveShadow=true;scene.add(m);solids.push(m);}this.b.clear();}}

// Box with world-space triplanar UVs (no stretching) + baked ambient-occlusion vertex colours (dark at the base)
export function boxGeo(w,h,d,x,y,z,tile=3,ao=true){
  const g=new THREE.BoxGeometry(w,h,d,1,Math.max(1,Math.ceil(h/1.2)),1).translate(x,y+h/2,z);
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,c=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));
    let u,v;if(ax>.5){u=pz;v=py;}else if(ay>.5){u=px;v=pz;}else{u=px;v=py;}
    uv.setXY(i,u/tile,v/tile);const k=ao?.5+.5*Math.min(1,(py-y)/1.4):1;c[i*3]=c[i*3+1]=c[i*3+2]=k;}
  g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;}

// Procedural sky: gradient + fbm clouds + sun disc/glow baked into one texture
export function addSky(scene,dir){const S=512,f=fbm(S,rng(5),6,3),d=new Uint8Array(S*S*4),top=[.24,.5,.9],hor=[.84,.91,.97];
  for(let y=0;y<S;y++){const th=(1-y/S)*Math.PI,yd=Math.cos(th),st=Math.sin(th),t=Math.pow(Math.max(0,yd),.5),up=Math.pow(Math.max(0,yd),.35);
    for(let x=0;x<S;x++){const ph=x/S*Math.PI*2,dx=-Math.cos(ph)*st,dz=Math.sin(ph)*st,i=y*S+x;
      const cl=Math.min(1,Math.max(0,(f[i]-.5)/.22));const cloud=cl*cl*(3-2*cl)*up*.9;
      const dot=Math.max(0,dx*dir.x+yd*dir.y+dz*dir.z),sun=Math.pow(dot,900)*4+Math.pow(dot,14)*.3;
      for(let k=0;k<3;k++){let v=hor[k]+(top[k]-hor[k])*t;v+=(1-v)*cloud;v+=sun*[1,.92,.75][k];d[i*4+k]=Math.min(255,v*255);}d[i*4+3]=255;}}
  const tex=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.RepeatWrapping;tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;
  const m=new THREE.Mesh(new THREE.SphereGeometry(350,32,16),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,fog:false,depthWrite:false,toneMapped:false}));
  m.frustumCulled=false;m.renderOrder=-1;scene.add(m);scene.fog=new THREE.Fog(0xd2e4f3,90,260);}
export function addSun(scene,hx,hz){const dir=new THREE.Vector3(-.5,.8,.35).normalize();
  const s=new THREE.DirectionalLight(0xfff0d6,3.6);s.position.copy(dir).multiplyScalar(80);s.castShadow=true;
  s.shadow.mapSize.set(4096,4096);const c=s.shadow.camera,R=Math.hypot(hx,hz)*1.05;
  c.left=-R;c.right=R;c.top=R;c.bottom=-R;c.near=10;c.far=200;s.shadow.bias=-.0003;s.shadow.normalBias=.05;
  scene.add(s,s.target,new THREE.HemisphereLight(0xbcd7ff,0x7a6e60,.6));return dir;}
