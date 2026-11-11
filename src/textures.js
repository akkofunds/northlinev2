import * as THREE from 'three';
export const rng=s=>()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
// tileable fractal value noise -> Float32Array(size*size) in 0..1
export function fbm(size,rand,oct=5,base=4){
  const out=new Float32Array(size*size);let amp=1,tot=0;
  for(let o=0;o<oct;o++){const c=base<<o,g=new Float32Array(c*c);for(let i=0;i<g.length;i++)g[i]=rand();
    for(let y=0;y<size;y++){const fy=y/size*c,y0=Math.floor(fy),ty=fy-y0,sy=ty*ty*(3-2*ty);
      for(let x=0;x<size;x++){const fx=x/size*c,x0=Math.floor(fx),tx=fx-x0,sx=tx*tx*(3-2*tx);
        const a=g[(y0%c)*c+x0%c],b=g[(y0%c)*c+(x0+1)%c],d=g[((y0+1)%c)*c+x0%c],e=g[((y0+1)%c)*c+(x0+1)%c];
        out[y*size+x]+=amp*((a+(b-a)*sx)*(1-sy)+(d+(e-d)*sx)*sy);}}
    tot+=amp;amp*=.5;}
  for(let i=0;i<out.length;i++)out[i]/=tot;return out;}
const mk=(size,data,srgb)=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;
  if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;};
export function colorTex(size,h,[r,g,b],contrast=1){const d=new Uint8Array(size*size*4);
  for(let i=0;i<h.length;i++){const v=Math.max(0,.78+(h[i]-.5)*contrast);d[i*4]=Math.min(255,r*v*255);d[i*4+1]=Math.min(255,g*v*255);d[i*4+2]=Math.min(255,b*v*255);d[i*4+3]=255;}
  return mk(size,d,true);}
export function grayTex(size,h,lo,hi){const d=new Uint8Array(size*size*4);
  for(let i=0;i<h.length;i++){const v=(lo+(hi-lo)*h[i])*255;d[i*4]=d[i*4+1]=d[i*4+2]=v;d[i*4+3]=255;}return mk(size,d,false);}
export function normalTex(size,h,k=8){const d=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x;
    const dx=h[y*size+(x+1)%size]-h[y*size+(x-1+size)%size],dy=h[((y+1)%size)*size+x]-h[((y-1+size)%size)*size+x];
    const nx=-dx*k,ny=-dy*k,l=Math.hypot(nx,ny,1);d[i*4]=(nx/l*.5+.5)*255;d[i*4+1]=(ny/l*.5+.5)*255;d[i*4+2]=(1/l*.5+.5)*255;d[i*4+3]=255;}
  return mk(size,d,false);}
export function ridges(size,n,rand){const f=fbm(size,rand,3,4),o=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)o[y*size+x]=Math.min(1,(.5+.5*Math.sin(x/size*Math.PI*2*n))*1.4)*.9+f[y*size+x]*.1;return o;}
export function wood(size,rand){const f=fbm(size,rand,4,4),o=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x;o[i]=.5+.5*Math.sin(Math.PI*2*(y/size*18+f[i]*3));}return o;}

function chain(){const S=64,d=new Uint8Array(S*S*4);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const a=(x+y)%8,b=(x-y+64)%8,on=Math.min(a,8-a)<1.2||Math.min(b,8-b)<1.2,i=(y*S+x)*4;
  d[i]=190;d[i+1]=196;d[i+2]=202;d[i+3]=on?255:0;}const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;}
export function makeWorldMaterials(){
  const r=rng(1337),S=256,f=fbm(S,r,5,4),f2=fbm(S,r,4,16),rd=ridges(S,5,r),wd=wood(S,r),V={vertexColors:true};
  const concrete=new THREE.MeshStandardMaterial({map:colorTex(S,f,[.8,.78,.74],1.5),normalMap:normalTex(S,f2,14),roughnessMap:grayTex(S,f,.6,1),roughness:1,...V});
  const metal=new THREE.MeshStandardMaterial({map:colorTex(S,f,[1,1,1],.7),normalMap:normalTex(S,rd,7),roughnessMap:grayTex(S,f2,.4,.8),roughness:1,metalness:.3,...V});
  const metalGrey=metal.clone();metalGrey.color.set(0x7f8b90);
  const woodM=new THREE.MeshStandardMaterial({map:colorTex(S,wd,[.62,.43,.26],.9),normalMap:normalTex(S,wd,5),roughness:.85,...V});
  const barrel=metal.clone();barrel.metalness=.6;barrel.roughness=.55;barrel.roughnessMap=null;
  const steel=new THREE.MeshStandardMaterial({color:0x3a4046,metalness:.7,roughness:.5,normalMap:normalTex(S,f2,6),...V});
  const crane=new THREE.MeshStandardMaterial({color:0xd29a1c,metalness:.4,roughness:.55,normalMap:normalTex(S,f2,6),...V});
  const paint=new THREE.MeshStandardMaterial({color:0xe5b800,roughness:.8,...V});
  const fence=new THREE.MeshStandardMaterial({map:chain(),alphaTest:.5,side:THREE.DoubleSide,metalness:.6,roughness:.5,...V});fence.userData.noShadow=true;
  const lamp=new THREE.MeshBasicMaterial({color:0xfff3cf});
  return {concrete,metal,metalGrey,wood:woodM,barrel,steel,crane,paint,fence,lamp};}
