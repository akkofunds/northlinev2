import * as THREE from 'three';
import {Batcher,boxGeo,ensureColor,addSky,addSun} from '../engine.js';
import {rng} from '../textures.js';

// NORTHLINE DOCKS (80 x 60 m): spawns W/E, two enterable warehouses, two railed platforms with ramps,
// a gantry crane, container lanes, head-glitch walls, fences, light poles and a skyline backdrop.
export function buildYard(scene,world,M){
  const HX=40,HZ=30;world.setBounds(HX,HZ);const sunDir=addSun(scene,HX,HZ);addSky(scene,sunDir);
  const solids=[],B=new Batcher(24);
  const add=(w,h,d,x,y,z,mat=M.concrete,tile=3,col=true,ao=true)=>{B.add(boxGeo(w,h,d,x,y,z,tile,ao),mat,x,z);if(col)world.addBox(x-w/2,y,z-d/2,x+w/2,y+h,z+d/2);};

  // ground (world-space UVs, 4m tiles)
  const gg=new THREE.PlaneGeometry(HX*2+4,HZ*2+4).rotateX(-Math.PI/2),gp=gg.attributes.position,gu=gg.attributes.uv;
  for(let i=0;i<gp.count;i++)gu.setXY(i,gp.getX(i)/4,gp.getZ(i)/4);ensureColor(gg);
  const ground=new THREE.Mesh(gg,M.concrete);ground.receiveShadow=true;scene.add(ground);solids.push(ground);

  for(const[w,d,x,z]of[[HX*2+2,1,0,-HZ-.5],[HX*2+2,1,0,HZ+.5],[1,HZ*2,-HX-.5,0],[1,HZ*2,HX+.5,0]])add(w,7,d,x,0,z,M.concrete,3,false);
  // skyline backdrop beyond the walls (merged, culled per chunk)
  const R=rng(9);for(let i=0;i<54;i++){const a=R()<.5,s=R()<.5?-1:1,w=6+R()*9,h=6+R()*22,d=6+R()*9,
    x=a?s*(48+R()*40):(R()-.5)*190,z=a?(R()-.5)*150:s*(38+R()*40);add(w,h,d,x,0,z,R()<.6?M.metalGrey:M.concrete,3,false);}

  // warehouse walls with doorways + lintels
  const wallZ=(x0,x1,z,g,t=.4,h=5)=>{let a=x0;for(const[g0,g1]of g){if(g0>a)add(g0-a,h,t,(a+g0)/2,0,z,M.metalGrey,1);add(g1-g0,h-3,t,(g0+g1)/2,3,z,M.metalGrey,1);a=g1;}if(x1>a)add(x1-a,h,t,(a+x1)/2,0,z,M.metalGrey,1);};
  const wallX=(z0,z1,x,g,t=.4,h=5)=>{let a=z0;for(const[g0,g1]of g){if(g0>a)add(t,h,g0-a,x,0,(a+g0)/2,M.metalGrey,1);add(t,h-3,g1-g0,x,3,(g0+g1)/2,M.metalGrey,1);a=g1;}if(z1>a)add(t,h,z1-a,x,0,(a+z1)/2,M.metalGrey,1);};
  wallZ(-21,-7,-23,[]);wallZ(-21,-7,-13,[[-18.6,-15.4]]);wallX(-23,-13,-21,[[-19.6,-16.4]]);wallX(-23,-13,-7,[]);add(14.4,.4,10.4,-14,5,-18,M.metalGrey,1,false);
  wallZ(7,21,23,[]);wallZ(7,21,13,[[15.4,18.6]]);wallX(13,23,21,[[16.4,19.6]]);wallX(13,23,7,[]);add(14.4,.4,10.4,14,5,18,M.metalGrey,1,false);
  add(4,2.2,.8,-12,0,-21.8,M.steel,1);add(.8,2.2,4,-8,0,-19,M.steel,1);add(1.2,1.1,1.2,-17,0,-21,M.wood,1);add(1.2,1.1,1.2,-15.7,0,-21,M.wood,1);add(1.2,1.1,1.2,-16.4,1.1,-21,M.wood,1);
  add(4,2.2,.8,12,0,21.8,M.steel,1);add(.8,2.2,4,8,0,19,M.steel,1);add(1.2,1.1,1.2,17,0,21,M.wood,1);add(1.2,1.1,1.2,15.7,0,21,M.wood,1);add(1.2,1.1,1.2,16.4,1.1,21,M.wood,1);

  // platforms + railings + ramps
  add(10,2.4,8,-24,0,14);add(10,2.4,8,24,0,-14);
  const rail=(x0,z0,x1,z1,y)=>{const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(L/1.6));
    for(let i=0;i<=n;i++)add(.06,1.05,.06,x0+(x1-x0)*i/n,y,z0+(z1-z0)*i/n,M.steel,1,false,false);
    for(const dy of[.55,1.05]){if(x0===x1)add(.05,.05,L,x0,y+dy,(z0+z1)/2,M.steel,1,false,false);else add(L,.05,.05,(x0+x1)/2,y+dy,z0,M.steel,1,false,false);}};
  rail(-29,10,-19,10,2.4);rail(-29,18,-19,18,2.4);rail(-29,10,-29,18,2.4);rail(-19,10,-19,12,2.4);rail(-19,16,-19,18,2.4);
  rail(19,-18,29,-18,2.4);rail(19,-10,29,-10,2.4);rail(29,-18,29,-10,2.4);rail(19,-18,19,-16,2.4);rail(19,-12,19,-10,2.4);
  const ramp=(cx,cz,len,wid,h,dir)=>{const[dx,dz,ry]={px:[1,0,0],nx:[-1,0,Math.PI],pz:[0,1,-Math.PI/2],nz:[0,-1,Math.PI/2]}[dir];
    const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(len,0);s.lineTo(len,h);
    const g=new THREE.ExtrudeGeometry(s,{depth:wid,bevelEnabled:false}),u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)/3,u.getY(i)/3);
    g.translate(-len/2,0,-wid/2).rotateY(ry).translate(cx,0,cz);B.add(g,M.concrete,cx,cz);world.addRamp(cx,cz,len,wid,h,dx,dz);};
  ramp(-16,14,6,4,2.4,'nx');ramp(16,-14,6,4,2.4,'px');

  // gantry crane over the mid lane (legs collide)
  add(1.3,15,1.3,6,0,-27,M.crane,2);add(1.3,15,1.3,6,0,27,M.crane,2);add(1.5,1.5,58,6,14.5,0,M.crane,2,false,false);
  add(3.2,2.2,3.2,6,12.2,-8,M.steel,2,false,false);add(10,.6,.6,6,13.4,-27,M.crane,2,false,false);add(10,.6,.6,6,13.4,27,M.crane,2,false,false);
  // head-glitch walls, jersey barriers, fences, light poles, yard paint
  add(8,1.3,1,0,0,-3);add(8,1.3,1,0,0,5);add(1,1.3,6,-9,0,1);add(1,1.3,6,9,0,-1);
  for(const[w,d,x,z]of[[2.4,.55,-30,-14],[2.4,.55,-30,-11],[.55,2.4,26,10.5],[2.4,.55,26,8],[2.4,.55,-1,18],[2.4,.55,1,-19],[.55,2.4,-38,-4]])add(w,.8,d,x,0,z);
  add(.06,2.4,12,-31,0,25,M.fence,.5,true,false);add(12,2.4,.06,33,0,-27,M.fence,.5,true,false);add(.06,2.4,10,31,0,-20,M.fence,.5,true,false);add(10,2.4,.06,-26,0,-6,M.fence,.5,true,false);
  for(const[x,z]of[[-32,-26],[-32,26],[0,-28],[0,28],[32,-26],[32,26],[-12,0],[12,0]]){add(.18,8,.18,x,0,z,M.steel,2);add(1.6,.12,.12,x+.7,7.9,z,M.steel,1,false,false);add(.55,.12,.3,x+1.4,7.78,z,M.lamp,1,false,false);}
  for(let x=-34;x<=34;x+=5)add(3,.02,.16,x,0,0,M.paint,1,false,false);
  for(const z of[-8,8])add(24,.02,.14,-24,0,z,M.paint,1,false,false),add(24,.02,.14,24,0,z,M.paint,1,false,false);
  B.build(scene,solids);

  const inst=(geo,mat,list,fn)=>{ensureColor(geo);const m=new THREE.InstancedMesh(geo,mat,list.length),o=new THREE.Object3D();
    list.forEach((it,i)=>{o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);fn(it,o,m,i);o.updateMatrix();m.setMatrixAt(i,o.matrix);});
    m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();
    m.castShadow=m.receiveShadow=true;scene.add(m);solids.push(m);};
  const cols=[0xb8452f,0x2f5f8f,0x3d7a4a,0xd09a2b,0x8a8a84,0xa84f2a].map(c=>new THREE.Color(c));
  const C=[[-33,-20,1,0,0],[-33,-20,1,1,1],[-30,-8,0,0,2],[-8,10,0,0,3],[-8,10,0,1,0],[6,-12,1,0,1],[12,-5,0,0,4],[-4,-24,0,0,5],[20,-24,0,0,2],
    [30,8,0,0,3],[30,8,0,1,1],[33,22,1,0,0],[4,25,0,0,5],[-20,2,1,0,4],[22,0,1,0,2],[0,12,1,0,3],[-2,-14,1,0,0],[28,-4,0,0,1],[-36,20,0,0,1],[36,-20,0,0,3]];
  inst(boxGeo(6,2.6,2.4,0,-1.3,0,1),M.metal,C,(c,o,m,i)=>{o.position.set(c[0],c[3]*2.6+1.3,c[1]);o.rotation.y=c[2]?Math.PI/2:0;m.setColorAt(i,cols[c[4]]);
    const w=c[2]?2.4:6,d=c[2]?6:2.4;world.addBox(c[0]-w/2,c[3]*2.6,c[1]-d/2,c[0]+w/2,c[3]*2.6+2.6,c[1]+d/2);});
  const K=[[-26,-3,1.2,1.2],[-26,-4.3,1.2,1.2],[-25,-3.6,1,.9],[-2,-6,1.2,1.2],[2,7,1.2,1.2],[10,-10,1.2,1.2],[-10,12,1.2,1.2],[18,-18,1,1.2],
    [-18,20,1.2,1.2],[34,-12,1.2,1.2],[35,-13.3,1,.9],[-36,8,1.2,1.2],[-5,0,1,1.2],[6,2,1,.9]];
  inst(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),M.wood,K,(k,o,m,i)=>{o.position.set(k[0],0,k[1]);o.scale.set(k[2],k[3],k[2]);o.rotation.y=i*.7;
    m.setColorAt(i,new THREE.Color().setScalar(.85+(i%3)*.1));const h=k[2]*.72;world.addBox(k[0]-h,0,k[1]-h,k[0]+h,k[3],k[1]+h);});
  const Bl=[[-24,-10],[-23.4,-10.8],[16,10],[16.7,10.6],[34,-2],[-6,26],[28,-26],[-34,12],[2,-8],[3,-8.6],[-12,-3],[26,14],[-16,-17],[16,17]];
  inst(new THREE.CylinderGeometry(.3,.3,.9,12).translate(0,.45,0),M.barrel,Bl,(b,o,m,i)=>{o.position.set(b[0],0,b[1]);
    m.setColorAt(i,cols[(i*2)%6]);world.addBox(b[0]-.3,0,b[1]-.3,b[0]+.3,.9,b[1]+.3);});
  return {name:'Northline Docks',solids,sunDir,spawns:[[-36,0,0,-Math.PI/2],[-36,0,6,-Math.PI/2],[36,0,0,Math.PI/2],[36,0,-6,Math.PI/2]]};
}
