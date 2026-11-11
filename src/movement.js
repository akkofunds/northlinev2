import * as THREE from 'three';
// Units: metres. Values derived from Source (1u = 0.0254m) but tuned crisper.
export const MOVE={maxSpeed:5.7,walkMul:.52,accel:10,airAccel:14,airCap:.76,friction:8,stopSpeed:2,
  gravity:20.3,jump:7.67,radius:.3,height:1.8,eye:1.62,step:.45,tick:1/128,jumpBuffer:.12};

export class CollisionWorld{
  constructor(){this.boxes=[];this.ramps=[];this.hx=50;this.hz=50;}
  setBounds(hx,hz){this.hx=hx;this.hz=hz;}
  addBox(a,b,c,d,e,f){this.boxes.push({a,b,c,d,e,f});}               // minX,minY,minZ,maxX,maxY,maxZ
  addRamp(cx,cz,len,wid,h,dx,dz){this.ramps.push({cx,cz,len,wid,h,dx,dz});}
  rampH(r,x,z){const px=x-r.cx,pz=z-r.cz,u=px*r.dx+pz*r.dz,v=-px*r.dz+pz*r.dx;
    return(Math.abs(u)<=r.len/2&&Math.abs(v)<=r.wid/2)?r.h*(u/r.len+.5):-1;}
  groundAt(x,z,feetY){const R=MOVE.radius,lim=feetY+MOVE.step;let g=0;
    for(const b of this.boxes)if(x+R>b.a&&x-R<b.d&&z+R>b.c&&z-R<b.f&&b.e<=lim&&b.e>g)g=b.e;
    for(const r of this.ramps){const h=this.rampH(r,x,z);if(h>=0&&h<=lim&&h>g)g=h;}return g;}
  blocked(x,y,z){const R=MOVE.radius,H=MOVE.height,lim=y+MOVE.step;
    if(Math.abs(x)>this.hx-R||Math.abs(z)>this.hz-R)return true;
    for(const b of this.boxes)if(x+R>b.a&&x-R<b.d&&z+R>b.c&&z-R<b.f&&y+H>b.b&&y<b.e&&b.e>lim)return true;
    for(const r of this.ramps){const h=this.rampH(r,x,z);if(h>lim)return true;}return false;}
}

export class PlayerController{
  constructor(world,spawn){this.w=world;this.pos=new THREE.Vector3(spawn[0],spawn[1],spawn[2]);this.prev=this.pos.clone();
    this.vel=new THREE.Vector3();this.yaw=spawn[3]||0;this.pitch=0;this.grounded=true;this.keys={};this.walk=false;
    this.jumpBuf=0;this.autoHop=false;this.acc=0;this.landImpact=0;}
  look(dx,dy,sens=.0018){this.yaw-=dx*sens;this.pitch=Math.max(-1.55,Math.min(1.55,this.pitch-dy*sens));}
  queueJump(){this.jumpBuf=MOVE.jumpBuffer;}                 // space press OR each scroll-wheel notch
  get speed(){return Math.hypot(this.vel.x,this.vel.z);}
  update(dt){this.acc+=Math.min(dt,.1);let n=0;
    while(this.acc>=MOVE.tick&&n++<8){this.prev.copy(this.pos);this.step(MOVE.tick);this.acc-=MOVE.tick;}
    if(n>=8)this.acc=0;return this.acc/MOVE.tick;}
  step(dt){const k=this.keys,v=this.vel,p=this.pos;
    const fw=(k.KeyW?1:0)-(k.KeyS?1:0),st=(k.KeyD?1:0)-(k.KeyA?1:0),sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);
    let wx=-sy*fw+cy*st,wz=-cy*fw-sy*st;const l=Math.hypot(wx,wz);if(l>0){wx/=l;wz/=l;}
    const ws=l>0?MOVE.maxSpeed*(this.walk?MOVE.walkMul:1):0;
    this.jumpBuf=Math.max(0,this.jumpBuf-dt);
    if(this.grounded&&(this.jumpBuf>0||(this.autoHop&&k.Space))){v.y=MOVE.jump;this.grounded=false;this.jumpBuf=0;} // no friction on jump tick => b-hop keeps speed
    if(this.grounded){                                       // Source friction + accelerate
      const sp=this.speed;if(sp>.01){const drop=Math.max(sp,MOVE.stopSpeed)*MOVE.friction*dt,ns=Math.max(sp-drop,0)/sp;v.x*=ns;v.z*=ns;}else v.x=v.z=0;
      const add=ws-(v.x*wx+v.z*wz);if(add>0){const a=Math.min(MOVE.accel*ws*dt,add);v.x+=a*wx;v.z+=a*wz;}
    }else{                                                   // air-strafe: tiny wish cap, uncapped total speed
      const add=Math.min(ws,MOVE.airCap)-(v.x*wx+v.z*wz);if(add>0){const a=Math.min(MOVE.airAccel*ws*dt,add);v.x+=a*wx;v.z+=a*wz;}
      v.y-=MOVE.gravity*dt;}
    this.axis('x',v.x*dt);this.axis('z',v.z*dt);
    if(this.grounded){const g=this.w.groundAt(p.x,p.z,p.y);if(p.y-g<=.3)p.y=g;else this.grounded=false;}
    else{const py=p.y;p.y+=v.y*dt;const g=this.w.groundAt(p.x,p.z,py);
      if(p.y<=g&&v.y<=0){this.landImpact=Math.max(this.landImpact,-v.y);p.y=g;v.y=0;this.grounded=true;}}}
  axis(a,d){if(!d)return;const p=this.pos;p[a]+=d;if(this.w.blocked(p.x,p.y,p.z)){p[a]-=d;this.vel[a]=0;}}
}
