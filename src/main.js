import * as THREE from 'three';
import {createRenderer,envMap} from './engine.js';
import {PlayerController,MOVE,CollisionWorld} from './movement.js';
import {Glock} from './glock.js';
import {buildYard} from './maps/yard.js';
import {makeWorldMaterials} from './textures.js';

const MAPS={yard:buildYard};                                   // Step 2/3 adds the courtyard + selector
const $=id=>document.getElementById(id);
const renderer=createRenderer($('c')),scene=new THREE.Scene(),FOV=78;
const camera=new THREE.PerspectiveCamera(FOV,innerWidth/innerHeight,.05,400);camera.rotation.order='YXZ';
const env=envMap(renderer);scene.environment=env;scene.environmentIntensity=.35;
const world=new CollisionWorld(),map=MAPS.yard(scene,world,makeWorldMaterials());
const player=new PlayerController(world,map.spawns[0]);

// Viewmodel scene: separate pass with cleared depth => gun never clips into walls
const vmScene=new THREE.Scene(),vmCam=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.01,5);
vmScene.environment=env;vmScene.add(new THREE.HemisphereLight(0xbcd7ff,0x706656,.6));
const vmSun=new THREE.DirectionalLight(0xfff0d8,2.6);vmScene.add(vmSun);
const weapon=new Glock();vmScene.add(weapon.root);
const worldFlash=new THREE.PointLight(0xffa04a,0,14,2);scene.add(worldFlash);   // muzzle light pooling on the map

// Bullet-hole decals (single InstancedMesh ring buffer)
const decals=new THREE.InstancedMesh(new THREE.CircleGeometry(.035,8),new THREE.MeshBasicMaterial({color:0x0c0c0c,polygonOffset:true,polygonOffsetFactor:-4}),128);
decals.frustumCulled=false;decals.count=0;scene.add(decals);let dN=0;
const ray=new THREE.Raycaster();ray.far=250;

let locked=false,mdx=0,mdy=0,shotSpread=0,punch=0;
const tmp=new THREE.Vector3(),fwd=new THREE.Vector3(),rgt=new THREE.Vector3(),up=new THREE.Vector3(),Z=new THREE.Vector3(0,0,1),o=new THREE.Object3D();

function spreadDeg(){const sp=player.speed;let s=shotSpread;
  s+=player.grounded?clamp01((sp-.4)/(MOVE.maxSpeed-.4))*3.2:4.8;   // still = 0 deg; moving/airborne = wide cone
  return s;}
const clamp01=x=>Math.max(0,Math.min(1.2,x));

function shoot(){
  if(!weapon.fire())return;
  const a=THREE.MathUtils.degToRad(spreadDeg()),r=Math.sqrt(Math.random())*Math.tan(a),th=Math.random()*6.283;
  camera.getWorldDirection(fwd);rgt.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
  fwd.addScaledVector(rgt,r*Math.cos(th)).addScaledVector(up,r*Math.sin(th)).normalize();
  shotSpread=Math.min(3,shotSpread+.9);punch+=.013;player.yaw+=(Math.random()-.5)*.003;
  worldFlash.position.copy(camera.position).addScaledVector(fwd,.7);worldFlash.intensity=25;
  ray.set(camera.position,fwd);const h=ray.intersectObjects(map.solids,false)[0];
  if(h){const n=h.face.normal.clone();if(h.instanceId!==undefined){const m=new THREE.Matrix4();h.object.getMatrixAt(h.instanceId,m);n.transformDirection(m);}
    n.transformDirection(h.object.matrixWorld);o.position.copy(h.point).addScaledVector(n,.006);o.quaternion.setFromUnitVectors(Z,n);o.updateMatrix();
    decals.setMatrixAt(dN%128,o.matrix);dN++;decals.count=Math.min(dN,128);decals.instanceMatrix.needsUpdate=true;}
}

// ---- input ----
const start=$('start'),canvas=$('c');
start.onclick=()=>{const p=canvas.requestPointerLock({unadjustedMovement:true});if(p&&p.catch)p.catch(()=>canvas.requestPointerLock());};
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;start.style.display=locked?'none':'grid';if(!locked)player.keys={};});
addEventListener('mousemove',e=>{if(!locked)return;mdx+=e.movementX;mdy+=e.movementY;player.look(e.movementX,e.movementY);});
addEventListener('mousedown',e=>{if(locked&&e.button===0)shoot();});
addEventListener('wheel',e=>{if(locked){player.queueJump();e.preventDefault();}},{passive:false});   // scroll-wheel jump buffer
addEventListener('keydown',e=>{if(!locked)return;player.keys[e.code]=true;
  if(e.code==='Space'&&!e.repeat){player.queueJump();e.preventDefault();}
  if(e.code==='ShiftLeft')player.walk=true;if(e.code==='KeyR')weapon.startReload();
  if(e.code==='KeyB')player.autoHop=!player.autoHop;});
addEventListener('keyup',e=>{player.keys[e.code]=false;if(e.code==='ShiftLeft')player.walk=false;});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=vmCam.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();vmCam.updateProjectionMatrix();});

renderer.shadowMap.needsUpdate=true;                              // bake static shadows on first frame
let last=performance.now(),frames=0,fpsT=0,fps=0,gap=-1;const inv=new THREE.Quaternion();
function frame(now){requestAnimationFrame(frame);
  const dt=Math.min((now-last)/1000,.1);last=now;
  const al=player.update(dt);tmp.copy(player.prev).lerp(player.pos,al);
  punch*=Math.exp(-9*dt);shotSpread=Math.max(0,shotSpread-dt*3.5);worldFlash.intensity*=Math.exp(-30*dt);
  camera.position.set(tmp.x,tmp.y+MOVE.eye,tmp.z);camera.rotation.set(player.pitch+punch,player.yaw,0);
  weapon.update(dt,{speed:player.speed,grounded:player.grounded,mdx,mdy,landImpact:player.landImpact});player.landImpact=0;mdx=mdy=0;
  inv.copy(camera.quaternion).invert();vmSun.position.copy(map.sunDir).applyQuaternion(inv).multiplyScalar(5);
  renderer.clear();renderer.render(scene,camera);renderer.clearDepth();renderer.render(vmScene,vmCam);
  // HUD
  const g=Math.round(Math.tan(THREE.MathUtils.degToRad(spreadDeg()))/Math.tan(THREE.MathUtils.degToRad(FOV/2))*innerHeight/2+3);
  if(g!==gap){gap=g;$('xh').style.setProperty('--g',g+'px');}
  frames++;fpsT+=dt;if(fpsT>.5){fps=Math.round(frames/fpsT);frames=0;fpsT=0;
    $('stats').textContent=`${fps} FPS  ·  calls ${renderer.info.render.calls}\nspeed ${Math.round(player.speed/.0254)} u/s${player.grounded?'':'  (air)'}\nauto-hop ${player.autoHop?'ON':'off'} [B]\nspread ${spreadDeg().toFixed(1)}°`;
    $('mag').textContent=weapon.ammo;$('res').textContent=weapon.reserve;renderer.info.reset();}
}
requestAnimationFrame(frame);
