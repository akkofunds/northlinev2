import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rng,fbm,grayTex,normalTex} from './textures.js';

// ---------- geometry helpers (everything merged per material => ~10 draw calls total) ----------
const ni=g=>g.index?g.toNonIndexed():g;
const merge=l=>{const g=mergeGeometries(l.map(ni));l.forEach(x=>x.dispose());return g;};
const T=(g,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>g.rotateX(rx).rotateY(ry).rotateZ(rz).translate(x,y,z);
const box=(w,h,d,...a)=>T(new THREE.BoxGeometry(w,h,d),...a);
const cap=(r,l,x,y,z,ax='x')=>{const g=new THREE.CapsuleGeometry(r,l,3,8);if(ax==='x')g.rotateZ(Math.PI/2);else if(ax==='z')g.rotateX(Math.PI/2);return g.translate(x,y,z);};
function bevBox(w,h,d,b=.002,...a){const hw=w/2-b,hh=h/2-b,s=new THREE.Shape();
  s.moveTo(-hw,-hh);s.lineTo(hw,-hh);s.lineTo(hw,hh);s.lineTo(-hw,hh);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:1});
  return T(g.translate(0,0,-(d-2*b)/2),...a);}
// Side-profile extrusion: pts are (z,y) along the gun; width is along X. Bevelled edges.
function profile(pts,width,b=.002){const s=new THREE.Shape();pts.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));s.closePath();
  const dpt=width-2*b,g=new THREE.ExtrudeGeometry(s,{depth:dpt,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:1});
  return g.translate(0,0,-dpt/2).rotateY(-Math.PI/2);}
const ease=x=>x*x*(3-2*x),clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const arm=(mat,wx,wy,wz,dx,dy,dz,len=.36)=>{const g=new THREE.CylinderGeometry(.043,.031,len,12).rotateX(Math.PI/2).translate(0,0,len/2),m=new THREE.Mesh(g,mat);
  m.position.set(wx,wy,wz);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(dx,dy,dz).normalize());return m;};

function engraving(){const c=document.createElement('canvas');c.width=1024;c.height=128;const x=c.getContext('2d');
  x.fillStyle='#cfd3d8';x.font='bold 58px Arial, sans-serif';x.textBaseline='middle';x.fillText('NORTHLINE',20,52);
  x.font='600 40px Arial, sans-serif';x.fillText('N17   9×19mm   AUSTRIA',380,52);x.fillRect(20,104,984,3);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function flashTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'#fff');g.addColorStop(.25,'#ffd28a');g.addColorStop(.6,'rgba(255,120,30,.45)');g.addColorStop(1,'rgba(255,80,0,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function makeMats(){const r=rng(7),S=128,st=new Float32Array(S*S).map(()=>r()),f=fbm(S,r,4,8),rep=(t,n)=>{t.repeat.set(n,n);return t;};
  return {
    poly:new THREE.MeshStandardMaterial({color:0x26272a,roughness:1,roughnessMap:rep(grayTex(S,st,.55,.95),45),normalMap:rep(normalTex(S,st,1.6),45)}),
    slide:new THREE.MeshStandardMaterial({color:0x2c2f34,metalness:.9,roughness:1,roughnessMap:rep(grayTex(S,f,.26,.5),30),normalMap:rep(normalTex(S,f,5),30)}),
    dark:new THREE.MeshStandardMaterial({color:0x0c0d0f,metalness:.5,roughness:.55}),
    bare:new THREE.MeshStandardMaterial({color:0x9096a0,metalness:1,roughness:.25}),
    glove:new THREE.MeshStandardMaterial({color:0x23252a,roughness:.92,normalMap:rep(normalTex(S,st,.9),35)}),
    sleeve:new THREE.MeshStandardMaterial({color:0x3a4033,roughness:.95,normalMap:rep(normalTex(S,f,3),12)}),
    white:new THREE.MeshBasicMaterial({color:0xf4f4f0}),
    text:new THREE.MeshStandardMaterial({map:engraving(),transparent:true,metalness:.85,roughness:.35,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})};}

export class Glock{
  constructor(){
    const M=makeMats(),mesh=(g,m)=>new THREE.Mesh(g,m);
    this.root=new THREE.Group();this.gun=new THREE.Group();this.root.add(this.gun);
    // FRAME: profiled dust-cover + rail slots + trigger guard + slide stop + takedown lever
    const guard=new THREE.TorusGeometry(.02,.0035,6,14,Math.PI).rotateZ(Math.PI).scale(1,1,3.5).rotateY(Math.PI/2).translate(0,.006,-.03);
    const frame=[profile([[-.135,.029],[-.135,.012],[-.127,.0045],[.014,.0045],[.014,.029]],.026,.0018),guard];
    for(let i=0;i<3;i++)frame.push(box(.0225,.0028,.007,0,.0034,-.1-i*.0145));
    this.gun.add(mesh(merge(frame),M.poly));
    this.gun.add(mesh(merge([box(.004,.006,.026,-.0148,.033,-.034),T(new THREE.CylinderGeometry(.0042,.0042,.006,8),-.0145,.03,-.075,0,0,Math.PI/2)]),M.dark)); // slide stop, takedown
    this.gun.add(mesh(T(new THREE.CylinderGeometry(.0065,.0065,.066,12),0,.045,-.139,Math.PI/2),M.bare));   // barrel
    this.gun.add(mesh(T(new THREE.CylinderGeometry(.0042,.0042,.003,12),0,.045,-.1725,Math.PI/2),M.dark));  // bore
    // SLIDE: side-profile with angled front/rear cuts, serrations, port, sights, engraving
    this.slide=new THREE.Group();this.gun.add(this.slide);
    this.slide.add(mesh(merge([profile([[.02,.031],[.02,.055],[.0165,.061],[-.15,.061],[-.17,.053],[-.17,.031]],.028,.0024),
      box(.0062,.0075,.011,-.0072,.0652,.0035),box(.0062,.0075,.011,.0072,.0652,.0035),box(.0042,.0085,.009,0,.0655,-.158)]),M.slide));
    const dk=[];for(let i=0;i<6;i++)dk.push(box(.0306,.019,.0013,0,.044,.013-i*.0044));for(let i=0;i<3;i++)dk.push(box(.0306,.019,.0013,0,.044,-.141-i*.0044));
    dk.push(box(.0026,.0115,.038,.0143,.0535,-.04),box(.0205,.012,.0016,0,.049,.0204),box(.0075,.002,.012,0,.0612,.0215-.016));
    this.slide.add(mesh(merge(dk),M.dark));
    this.slide.add(mesh(merge([box(.0022,.0022,.001,0,.0668,-.1536),box(.002,.002,.001,-.0072,.0655,.0093),box(.002,.002,.001,.0072,.0655,.0093)]),M.white));
    for(const s of[1,-1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(.1,.0125).rotateY(s*Math.PI/2),M.text);p.position.set(s*.0142,.038,-.075);this.slide.add(p);}
    // GRIP pivot (raked back): front-strap finger grooves, flared magwell, stipple texture, mag release
    this.grip=new THREE.Group();this.grip.position.set(0,.026,0);this.grip.rotation.x=-.34;this.gun.add(this.grip);
    const gp=[[-.022,0],[-.022,-.03],[-.0188,-.036],[-.022,-.042],[-.022,-.05],[-.0188,-.056],[-.022,-.062],[-.022,-.07],[-.0188,-.076],[-.022,-.082],[-.0245,-.1],[.027,-.1],[.0245,-.06],[.021,-.012],[.019,0]];
    this.grip.add(mesh(merge([profile(gp,.03,.002),box(.0045,.009,.013,-.0165,-.018,-.002)]),M.poly));
    this.mag=new THREE.Group();this.grip.add(this.mag);
    this.mag.add(mesh(merge([bevBox(.0225,.11,.032,.0015,0,-.058,.001),bevBox(.031,.01,.046,.003,0,-.108,.0016)]),M.poly));
    // RIGHT HAND (gloved capsule fingers wrapping the front strap) + forearm
    this.rHand=new THREE.Group();this.grip.add(this.rHand);
    this.rHand.add(mesh(merge([bevBox(.04,.078,.03,.007,0,-.042,.038),cap(.0088,.03,-.002,-.05,-.034),cap(.0088,.03,-.002,-.069,-.034),cap(.0088,.03,-.002,-.088,-.034),
      cap(.0078,.05,.0222,-.012,-.052,'z'),cap(.0088,.045,.0,.0,.0,'z').translate(-.021,-.004,-.012),box(.032,.005,.016,0,-.004,.044)]),M.glove));
    this.rHand.add(arm(M.sleeve,.006,-.09,.05,.12,-.9,1));
    // LEFT SUPPORT HAND (wraps over right fingers, thumb forward along frame) + forearm
    this.lHand=new THREE.Group();this.grip.add(this.lHand);
    this.lHand.add(mesh(merge([bevBox(.016,.07,.046,.006,-.035,-.042,.014),cap(.0088,.034,-.005,-.05,-.053),cap(.0088,.034,-.005,-.069,-.053),cap(.0088,.034,-.005,-.088,-.053),
      cap(.0092,.06,-.026,.008,-.034,'z')]),M.glove));
    this.lHand.add(arm(M.sleeve,-.04,-.085,.05,-.55,-.9,1));
    this.trigger=mesh(merge([box(.0055,.022,.0055,0,-.008,0),box(.0035,.012,.003,0,.0,.0)]),M.dark);this.trigger.position.set(0,.012,-.022);this.trigger.rotation.x=.25;this.gun.add(this.trigger);
    // MUZZLE FLASH + light
    const fm=new THREE.MeshBasicMaterial({map:flashTex(),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
    this.flash=new THREE.Group();this.flash.position.set(0,.045,-.19);
    this.flash.add(new THREE.Mesh(new THREE.PlaneGeometry(.2,.1).rotateY(Math.PI/2).translate(0,0,-.07),fm),new THREE.Mesh(new THREE.PlaneGeometry(.2,.1).rotateX(Math.PI/2).translate(0,0,-.07),fm),new THREE.Mesh(new THREE.PlaneGeometry(.1,.1),fm));
    this.flash.visible=false;this.gun.add(this.flash);
    this.light=new THREE.PointLight(0xffa04a,0,1.5,2);this.light.position.set(0,.06,-.23);this.gun.add(this.light);
    this.MAG=20;this.ammo=20;this.reserve=120;this.cool=0;this.kick=0;this.slideK=0;this.flashT=0;this.bobT=0;this.bobAmp=0;this.swX=0;this.swY=0;this.land=0;this.air=0;
    this.reloading=false;this.rt=0;this.RELOAD=1.8;
  }
  canFire(){return!this.reloading&&this.ammo>0&&this.cool<=0;}
  fire(){if(!this.canFire())return false;this.ammo--;this.cool=.09;this.kick=1;this.slideK=1;this.flashT=.045;this.flash.rotation.z=Math.random()*6.28;this.flash.scale.setScalar(.8+Math.random()*.5);return true;}
  startReload(){if(this.reloading||this.ammo>=this.MAG||this.reserve<=0)return false;this.reloading=true;this.rt=0;return true;}
  update(dt,s){
    this.cool-=dt;this.kick*=Math.exp(-18*dt);this.slideK=Math.max(0,this.slideK-dt*14);this.flashT=Math.max(0,this.flashT-dt);
    const k=1-Math.exp(-14*dt);this.swX+=(clamp(-s.mdx*.0011,-.045,.045)-this.swX)*k;this.swY+=(clamp(s.mdy*.0011,-.045,.045)-this.swY)*k;
    this.bobT+=s.speed*dt*2.1*(s.grounded?1:0);this.bobAmp+=((s.grounded?clamp(s.speed/5.7):0)-this.bobAmp)*(1-Math.exp(-10*dt));
    if(s.landImpact>0)this.land=clamp(s.landImpact/9);this.land*=Math.exp(-9*dt);this.air+=((s.grounded?0:1)-this.air)*(1-Math.exp(-6*dt));
    let tilt=0,rack=0,lh=0;
    if(this.reloading){this.rt+=dt;const t=this.rt,p=(a,b)=>clamp((t-a)/(b-a));tilt=ease(p(0,.25))-ease(p(1.4,1.8));
      lh=ease(p(.1,.35))-ease(p(1.1,1.45));                                   // support hand leaves, fetches mag, returns
      const out=ease(p(.25,.5));this.mag.visible=t<.5||t>.55;this.mag.position.y=t<.5?-out*.25:-.25*(1-ease(p(.55,.95)));
      rack=ease(p(1,1.15))-ease(p(1.2,1.4));
      if(t>=this.RELOAD){this.reloading=false;this.mag.visible=true;this.mag.position.y=0;const n=Math.min(this.MAG-this.ammo,this.reserve);this.ammo+=n;this.reserve-=n;}}
    this.lHand.position.set(-lh*.05,-lh*.11,lh*.05);this.lHand.rotation.z=lh*.35;
    const lock=this.ammo===0&&!(this.reloading&&this.rt>1);
    this.slide.position.z=.032*(lock?1:Math.max(ease(this.slideK),rack));this.trigger.position.z=-.022+.004*this.slideK;
    const bx=Math.sin(this.bobT)*.006*this.bobAmp,by=-Math.abs(Math.cos(this.bobT))*.008*this.bobAmp;
    this.root.position.set(.07+bx+this.swX*.5-tilt*.03,-.14+by+this.swY*.5-this.land*.03+this.air*.008-tilt*.05,-.3+this.kick*.025);
    this.root.rotation.set(this.kick*.14+this.swY*1.1-tilt*.3,-this.swX*1.4,this.swX*.8+tilt*.5+Math.cos(this.bobT*.5)*.012*this.bobAmp);
    this.flash.visible=this.flashT>0;this.light.intensity=this.flashT>0?.12*this.flashT/.045:0;
  }
}
