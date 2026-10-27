/* RAGDOLL LAB v0.1 — standalone original web game. Three.js is used as an external rendering library. */
let THREE;
try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js'); }
catch (error) {
  const failure = document.getElementById('fatal');
  failure.style.display='flex';
  failure.innerHTML='<div><h2>Impossibile caricare il motore 3D</h2><p>Controlla la connessione Internet e riapri la pagina in Safari.</p></div>';
  throw error;
}
const $=(q)=>document.querySelector(q), $$=(q)=>[...document.querySelectorAll(q)];
const canvas=$('#game'), overlay=$('#overlay'), home=$('#home'), hudHealth=$('#healthFill');
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x101b26);
scene.fog=new THREE.FogExp2(0x142735,0.014);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.06,130);
camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.38;
scene.add(new THREE.HemisphereLight(0xa0d3ea,0x16202a,1.45));
const sun=new THREE.DirectionalLight(0xbfefff,2.2); sun.position.set(-8,18,10);
sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-22; sun.shadow.camera.right=22; sun.shadow.camera.top=23; sun.shadow.camera.bottom=-23; sun.shadow.camera.far=60; scene.add(sun);
const cyan=new THREE.PointLight(0x43c7cf,35,24,2); cyan.position.set(-7,5,-7); scene.add(cyan);
const amber=new THREE.PointLight(0xf4a564,24,20,2); amber.position.set(6,6,-8); scene.add(amber);
const world=new THREE.Group();scene.add(world);
const bodies=new THREE.Group();scene.add(bodies);
const effects=new THREE.Group();scene.add(effects);
const gun=new THREE.Group();camera.add(gun);scene.add(camera);
const materials={
  floor:new THREE.MeshStandardMaterial({color:0x263543,roughness:.8,metalness:.2}),
  wall:new THREE.MeshStandardMaterial({color:0x24323b,roughness:.88,metalness:.12}),
  wall2:new THREE.MeshStandardMaterial({color:0x1b2c34,roughness:.83,metalness:.17}),
  steel:new THREE.MeshStandardMaterial({color:0x566b78,roughness:.43,metalness:.72}),
  black:new THREE.MeshStandardMaterial({color:0x101922,roughness:.54,metalness:.63}),
  glass:new THREE.MeshStandardMaterial({color:0x6ee9ec,roughness:.15,metalness:.15,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}),
  teal:new THREE.MeshStandardMaterial({color:0x54e4d2,emissive:0x17857f,emissiveIntensity:1.1}),
  orange:new THREE.MeshStandardMaterial({color:0xffbd70,emissive:0x5b2d09,emissiveIntensity:.6}),
  red:new THREE.MeshStandardMaterial({color:0xa92932,roughness:.64}),
  blood:new THREE.MeshStandardMaterial({color:0x8f101e,roughness:.64}),
  white:new THREE.MeshStandardMaterial({color:0xe0e8df,roughness:.67,metalness:.09}),
  dummy:new THREE.MeshStandardMaterial({color:0xb4c0bd,roughness:.63,metalness:.14}),
  dummyJoint:new THREE.MeshStandardMaterial({color:0x414f56,metalness:.72,roughness:.35}),
  enemy:new THREE.MeshStandardMaterial({color:0x918f84,roughness:.74}),
  enemyJoint:new THREE.MeshStandardMaterial({color:0x713f3f,roughness:.7}),
  visor:new THREE.MeshStandardMaterial({color:0x19383d,emissive:0x31ccc2,emissiveIntensity:.65,metalness:.6}),
  evil:new THREE.MeshStandardMaterial({color:0x8b1818,emissive:0xf52323,emissiveIntensity:1.2})
};
const cube=new THREE.BoxGeometry(1,1,1), sphere=new THREE.SphereGeometry(1,12,9);
const cylinder=new THREE.CylinderGeometry(1,1,1,10);
function mesh(geom,mat,group=world){const m=new THREE.Mesh(geom,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
function box(x,y,z,w,h,d,mat=materials.wall,group=world){const m=mesh(cube,mat,group);m.position.set(x,y,z);m.scale.set(w,h,d);return m}
function lightbar(x,y,z,w=2.8){box(x,y,z,w,.07,.24,materials.teal);box(x,y+.12,z,w+.45,.1,.37,materials.black)}
function sign(text,x,y,z,color='#9df2e9',size=.62){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ct=c.getContext('2d');
  ct.fillStyle='#09151c';ct.fillRect(0,0,512,128);ct.strokeStyle='#477077';ct.lineWidth=6;ct.strokeRect(4,4,504,120);
  ct.fillStyle=color;ct.font='bold 51px monospace';ct.textAlign='center';ct.fillText(text,256,82);
  const tex=new THREE.CanvasTexture(c), material=new THREE.MeshBasicMaterial({map:tex,transparent:true});
  const panel=mesh(new THREE.PlaneGeometry(4*size,size),material);panel.position.set(x,y,z);
  return panel;
}
function buildArena(mode){
  world.clear(); bodies.clear();effects.clear(); dummies.length=0;particles.length=0;decals.length=0;held=null;
  const walls=mode==='tower'?30:26;
  box(0,-.24,-1,walls,.48,34,materials.floor);
  const grid=new THREE.GridHelper(walls,26,0x3d777b,0x3b4f59);grid.position.set(0,.007,-1);world.add(grid);
  box(0,5,-17,30,10,.5,materials.wall2);
  box(-15,4,-1,.55,8,34,materials.wall);
  box(15,4,-1,.55,8,34,materials.wall);
  if(mode!=='tower') box(0,8.15,-1,30,.3,34,materials.wall2);
  box(0,3.9,15.5,30,7,.25,materials.wall);
  // Structural beams, concrete panels and fluorescent fixtures
  for(let z=-14;z<=12;z+=6){
    box(-14.6,4,z,.48,8,.5,materials.steel);box(14.6,4,z,.48,8,.5,materials.steel);
    box(0,7.55,z,29,.36,.36,materials.steel);
    lightbar(-6,7.32,z,4.3);lightbar(6,7.32,z,4.3);
  }
  for(let x=-11;x<=11;x+=5.5){
    box(x,2.4,-16.7,.08,4.5,.06,materials.steel);
    box(x,2.4,15.32,.08,4.5,.06,materials.steel);
  }
  sign('RAGDOLL LAB',0,5.2,-16.55);
  // Interactive-looking displays & props
  for(let x of [-12.5,12.5]){
    for(let z of [-11,-1,9]){
      const terminal=box(x,1.4,z,.36,2,1.65,materials.black);
      box(x>0?x-.19:x+.19,1.83,z,.03,.83,1.31,materials.visor);
      box(x>0?x-.22:x+.22,1.23,z,.05,.09,1.11,materials.orange);
    }
  }
  for(let n=0;n<6;n++){
    let bx=-8+(n%3)*7,bz=-11+Math.floor(n/3)*18;
    box(bx,.43,bz,1.16,.84,1.16,materials.steel);
    box(bx,.88,bz,1.19,.08,1.19,materials.black);
    box(bx,.95,bz,.8,.025,.04,materials.orange);
  }
  // Floor warnings
  for(let n=-8;n<=8;n++){ const p=box(n*1.04,.016,-1.5,.68,.022,.07,n%2===0?materials.orange:materials.black);p.rotation.y=.1; }
  // glass observation chamber
  box(-7,2.1,-9,.13,3.8,6,materials.glass);
  box(-7,4.13,-9,.23,.21,6.1,materials.steel);
  sign('SECTOR 01',-6.88,3.6,-9,'#9af5da',.33).rotation.y=Math.PI/2;
  if(mode==='tower'){
    // 16-meter vertical impact station with visible industrial rig
    for(let x of [-2.8,2.8])for(let z of [-10,-2.2]){
      box(x,8,z,.4,16,.4,materials.steel);
      for(let y=1.5;y<16;y+=3){
        box(x,y,z,.65,.12,.7,materials.orange);
      }
    }
    for(let y=0;y<=16;y+=2){box(-2.8,y,-6,.12,.12,8,materials.steel);box(2.8,y,-6,.12,.12,8,materials.steel);}
    box(0,16,-3.3,5.8,.28,3.7,materials.black);
    box(0,16.2,-4.95,5.8,.07,.35,materials.orange);
    // catch pad and measuring pillars
    box(0,.15,-9,6,.3,4.3,materials.black);
    box(0,.32,-9,5.5,.08,3.8,materials.red);
    for(let i=0;i<9;i++){box(-3.15,i*2,-8.7,.08,.06,.9,materials.orange);}
    sign('16m DROP TEST',0,5.3,-16.5,'#ffba72',.6);
    for(let j=0;j<8;j++) box(7,.32+j*.73,-7+j*1.4,3,.5,1.45,materials.steel);
  } else if(mode==='zombies'){
    sign('CONTAINMENT',0,5.2,-16.5,'#ff8b76',.62);
    for(let i=0;i<5;i++){
      box(-9+i*4.5,.09,-13.3,2.6,.18,1.4,materials.red);
      box(-9+i*4.5,.3,-13.9,2.5,.28,.13,materials.orange);
    }
  } else {
    sign('BIOMECHANICS',0,5.2,-16.5,'#9df2e9',.58);
    box(0,.075,-6,3,.14,3,materials.black);
    box(0,.16,-6,2.7,.05,2.7,materials.steel);
    for(let x of [-1.7,1.7])for(let z of [-7.8,-4.2]){
      box(x,1.35,z,.13,2.55,.13,materials.steel);
    }
    box(0,2.63,-6,3.6,.17,3.9,materials.steel);
    lightbar(0,2.48,-6,2.3);
  }
}
const jointTemplate=[
  [0,1.86,0], [0,1.57,0], [0,1.30,0], [0,.97,0],
  [-.26,1.47,0],[-.45,1.14,.015],[-.47,.79,.075],
  [.26,1.47,0],[.45,1.14,.015],[.47,.79,.075],
  [-.17,.93,0],[-.20,.52,.06],[-.22,.11,.12],
  [.17,.93,0],[.20,.52,.06],[.22,.11,.12]
];
const bones=[
  [0,1,.12],[1,2,.22],[2,3,.25],[2,4,.13],[4,5,.12],[5,6,.095],
  [2,7,.13],[7,8,.12],[8,9,.095],[3,10,.125],[10,11,.15],[11,12,.112],
  [3,13,.125],[13,14,.15],[14,15,.112],
  [4,7,0],[10,13,0]
];
const braces=[[1,4],[1,7],[4,3],[7,3],[4,10],[7,13],[10,13],[5,2],[8,2]];
let dummies=[],particles=[],decals=[],mode='lab',tool='pistol',playing=false,held=null;
let health=100,wave=0,score=0,nextWaveAt=0,shake=0,lastShot=0,lastTime=0;
const tempA=V(),tempB=V(),tmp=V(),ray=new THREE.Ray(),up=V(0,1,0);
function makeDummy(x,z,y=0,isEnemy=false){
  const d={points:[],prev:[],constraints:[],parts:[],life:100,alive:true,physics:false,
    enemy:isEnemy,base:V(x,y,z),phase:Math.random()*6.28,hitCount:0,deathAt:0,
    blood:100,bleed:0,organs:{brain:100,heart:100,lungs:100,liver:100},
    fractures:0,injuries:[],maxHeight:y+1.9,fallRegistered:false,poolTimer:0};
  d.points=jointTemplate.map(([px,py,pz])=>V(x+px,y+py,z+pz));
  d.prev=d.points.map(p=>p.clone());
  for(const [a,b,r] of bones){ if(!r) continue;
    const m=mesh(cylinder,isEnemy?materials.enemy:materials.dummy,bodies);
    d.parts.push({a,b,r,m});
  }
  for(const [a,b] of [...bones,...braces]){
    d.constraints.push({a,b,len:d.points[a].distanceTo(d.points[b])});
  }
  d.head=mesh(sphere,isEnemy?materials.enemy:materials.dummy,bodies);
  d.head.scale.set(.235,.27,.225);
  d.joints=[];
  for(const i of [1,3,4,5,7,8,10,11,13,14]){
    const s=mesh(sphere,isEnemy?materials.enemyJoint:materials.dummyJoint,bodies);
    s.scale.setScalar(i===3?.13:.09);d.joints.push([i,s]);
  }
  d.visor=mesh(sphere,isEnemy?materials.evil:materials.visor,bodies);
  d.visor.scale.set(.19,.068,.035);
  dummies.push(d);pose(d);return d;
}
function pose(d){
  const pts=d.points;
  for(const part of d.parts){
    const a=pts[part.a],b=pts[part.b],difference=tempA.subVectors(b,a),len=difference.length();
    part.m.position.copy(a).add(b).multiplyScalar(.5);
    part.m.quaternion.setFromUnitVectors(up,tempB.copy(difference).normalize());
    part.m.scale.set(part.r,Math.max(.001,len),part.r);
  }
  d.head.position.copy(pts[0]);
  d.visor.position.copy(pts[0]).add(V(0,-.016,.224));
  for(const [i,s] of d.joints)s.position.copy(pts[i]);
}
function floorAt(x,z){return mode==='tower' && Math.abs(x)<2.7 && z> -4.98 && z< -1.5?16.14:0}
function simulate(d,dt){
  if(!d.physics) return;
  const decay=Math.pow(.986,dt*60), g=17.5*dt*dt;
  for(let i=0;i<d.points.length;i++){
    const p=d.points[i],prev=d.prev[i],vx=(p.x-prev.x)*decay,vy=(p.y-prev.y)*decay,vz=(p.z-prev.z)*decay;
    prev.copy(p);p.x+=vx;p.y+=vy-g;p.z+=vz;
  }
  if(held&&held.d===d){
    const goal=ray.at(held.distance,tmp);
    d.points[held.i].lerp(goal,.3);
    d.prev[held.i].lerp(goal,.21);
  }
  for(let t=0;t<8;t++){
    for(const c of d.constraints){
      const p=d.points[c.a],q=d.points[c.b],delta=tempA.subVectors(q,p),len=delta.length();
      if(len<.0001) continue;
      const correction=(len-c.len)/len*.49;
      p.addScaledVector(delta,correction);q.addScaledVector(delta,-correction);
    }
    for(const p of d.points){
      const floor=floorAt(p.x,p.z)+.075;
      if(p.y<floor){p.y=floor;d.prev[d.points.indexOf(p)].x=p.x+(d.prev[d.points.indexOf(p)].x-p.x)*.7;
        d.prev[d.points.indexOf(p)].z=p.z+(d.prev[d.points.indexOf(p)].z-p.z)*.7;}
      p.x=THREE.MathUtils.clamp(p.x,-14.3,14.3);p.z=THREE.MathUtils.clamp(p.z,-16.3,14.7);
    }
  }
}
function impulse(d,index,strength,dir){
  d.physics=true;
  const p=d.points[index],q=d.prev[index];
  q.addScaledVector(dir,-strength*.018);
  for(let k=0;k<d.points.length;k++){
    if(k===index) continue;
    const nearness=Math.max(0,1-p.distanceTo(d.points[k])/1.6);
    d.prev[k].addScaledVector(dir,-strength*.012*nearness);
  }
}
function zoneOf(index){
  if(index===0)return 'TESTA';
  if(index===1||index===2)return 'TORACE';
  if(index===3)return 'ADDOME';
  if(index<=9)return 'ARTI SUPERIORI';
  return 'ARTI INFERIORI';
}
function addTrauma(d,amount,index,kind='IMPATTO'){
  amount=Math.max(0,amount);if(amount===0)return;
  const zone=zoneOf(index);
  const organ=zone==='TESTA'?'brain':zone==='TORACE'?(index===1?'lungs':'heart'):zone==='ADDOME'?'liver':null;
  let severity=amount;
  if(organ){
    d.organs[organ]=Math.max(0,d.organs[organ]-amount*(organ==='brain'?1.35:organ==='heart'?1.2:.7));
    if(d.organs.brain<=5||d.organs.heart<=5)d.life=0;
  }
  if(zone==='ARTI INFERIORI'||zone==='ARTI SUPERIORI'){
    if(amount>25)d.fractures++;
    severity*=.65;
  }
  d.life=Math.max(0,d.life-severity);
  const baseBleed=kind==='CADUTA'?.015:kind==='SHOCK'?.03:.065;
  d.bleed=Math.min(9,d.bleed+amount*baseBleed*(zone==='TORACE'||zone==='ADDOME'?1.3:1));
  d.hitCount++;
  d.injuries.unshift(kind+' · '+zone+' · '+Math.round(amount)+' trauma');
  if(d.injuries.length>7)d.injuries.length=7;
  if(d.life<=0&&d.alive){
    d.alive=false;d.deathAt=performance.now();d.physics=true;
    if(d.enemy)score++;
  }
}
function medicalTick(d,dt){
  if(d.physics){
    const elevation=d.points[3].y;
    d.maxHeight=Math.max(d.maxHeight,elevation);
    if(!d.fallRegistered&&d.maxHeight>4&&elevation<1.06){
      const trauma=Math.min(98,(d.maxHeight-1)*7.8);
      d.fallRegistered=true;addTrauma(d,trauma,3,'CADUTA');
      bloodBurst(d.points[3],V(0,1,0),Math.min(30,Math.ceil(trauma/4)));
    }
  }
  if(d.bleed>0&&d.blood>0){
    d.blood=Math.max(0,d.blood-d.bleed*dt*.7);
    if(d.blood<65)d.life=Math.max(0,d.life-dt*(65-d.blood)*.017);
    if(d.blood<22)d.life=0;
    d.poolTimer+=dt*d.bleed;
    if(d.poolTimer>.95){
      d.poolTimer=0;
      const p=d.points[3],ground=floorAt(p.x,p.z);
      const stain=mesh(new THREE.CircleGeometry(.10+Math.random()*.20,12),materials.blood,effects);
      stain.rotation.x=-Math.PI/2;stain.position.set(p.x,ground+.018+Math.random()*.004,p.z);
      decals.push({m:stain,life:18,fade:0});
      if(decals.length>75){let old=decals.shift();effects.remove(old.m);old.m.geometry.dispose();}
    }
  }
  if(d.life<=0&&d.alive){d.alive=false;d.physics=true;if(d.enemy)score++;}
}
function spawnForMode(){
  dummies.forEach(d=>{d.parts.forEach(o=>bodies.remove(o.m));bodies.remove(d.head,d.visor);d.joints.forEach(([,m])=>bodies.remove(m))});
  bodies.clear();dummies.length=0;held=null;health=100;score=0;wave=0;
  if(mode==='tower'){
    makeDummy(0,-6.45,16,false);
    makeDummy(-4.7,-10,0,false);
    player.x=0;player.z=2.7;player.y=17.7;
    pitch=-.08;yaw=0;
    say('Torre da 16 metri: premi CADUTA per liberare il manichino.',3500);
  }else if(mode==='zombies'){
    player.x=0;player.z=9;player.y=1.65;pitch=.04;yaw=0;
    spawnWave();say('Sopravvivi: colpisci i manichini ostili.',3000);
  }else{
    makeDummy(0,-6,0,false);makeDummy(4.8,-7.2,0,false);makeDummy(-5,-4.7,0,false);
    player.x=0;player.z=6.6;player.y=1.65;pitch=.005;yaw=0;
    say('Trascina a destra per mirare. Joystick a sinistra per muoverti.',4000);
  }
  updateHud();
}
function spawnWave(){
  wave++;nextWaveAt=0;
  const count=Math.min(2+wave,7);
  for(let i=0;i<count;i++){
    const theta=(i/(count-1||1))*1.8- .9;
    makeDummy(Math.sin(theta)*8+Math.random(),-13+Math.cos(theta)*1.5,0,true);
  }
  say('ONDATA '+wave+' · '+count+' bersagli',2600);
}
function translateDummy(d,dx,dz){
  for(let i=0;i<d.points.length;i++){d.points[i].x+=dx;d.points[i].z+=dz;d.prev[i].x+=dx;d.prev[i].z+=dz}
}
const player={x:0,y:1.65,z:7};
let yaw=0,pitch=0,joyX=0,joyY=0,keys=new Set(),aimPointer=null,lookX=0,lookY=0,fireHeld=false;
let heldAudio=null;
function makeGun(){
  gun.clear();const a=box(.24,-.21,-.55,.19,.2,.55,materials.black,gun);a.rotation.x=-.07;
  box(.24,-.12,-.86,.075,.075,.46,materials.steel,gun);
  box(.24,-.26,-.34,.12,.33,.11,materials.black,gun);
  box(.24,-.04,-.62,.05,.04,.3,materials.teal,gun);
}
makeGun();
const weapons={
 pistol:{label:'9 mm · pistola semiautomatica',cooldown:310,damage:21,push:46,spread:.005,pellets:1,automatic:false,sound:160,bleed:1},
 smg:{label:'SMG · colpi rapidi',cooldown:85,damage:10,push:23,spread:.028,pellets:1,automatic:true,sound:220,bleed:.7},
 rifle:{label:'AK · automatico',cooldown:135,damage:29,push:56,spread:.018,pellets:1,automatic:true,sound:115,bleed:1.2},
 sniper:{label:'.308 · alta penetrazione',cooldown:980,damage:72,push:128,spread:.002,pellets:1,automatic:false,sound:65,bleed:2.2},
 shotgun:{label:'Fucile a pompa · rosata ravvicinata',cooldown:740,damage:14,push:37,spread:.115,pellets:8,automatic:false,sound:84,bleed:1.5},
 grenade:{label:'Granata · esplosione localizzata',cooldown:1300,damage:90,push:158,spread:0,pellets:1,automatic:false,sound:48,bleed:2}
};
function changeTool(name){
  tool=name;held=null;
  $$('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  const info={physics:'Physics gun · aggancia o lascia il bersaglio',drop:'Caduta · libera il manichino'};
  say(weapons[name]?.label||info[name]||'',1850);
  gun.children.forEach(m=>{if(m.material===materials.teal)m.visible=(name==='physics')});
  const long=name==='sniper'||name==='rifle'||name==='shotgun';
  gun.scale.set(1,1,long?1.45:name==='grenade'?.45:1);
  $('#fire').textContent=name==='physics'?'✥':name==='drop'?'↓':name==='grenade'?'◉':'●';
}
function currentRay(){camera.getWorldDirection(tempA);ray.set(camera.position,tempA);return ray}
function rayTarget(maxDist=65,aimDir=null){
  const r=currentRay();if(aimDir)r.direction.copy(aimDir);
  let best=null,dist=Infinity;
  for(const d of dummies){
    if(d.enemy&&!d.alive)continue;
    for(const [a,b,rad] of bones){
      if(rad===0)continue;
      const p=d.points[a],q=d.points[b];
      const ds=r.distanceSqToSegment(p,q,tempB,tmp);
      const distance=tempB.distanceTo(r.origin);
      const radius=rad*1.55+0.13;
      if(ds<radius*radius && distance>0 && distance<dist && distance<maxDist){
        best={d,i:a,point:tempB.clone(),distance};dist=distance;
      }
    }
    let dhead=r.distanceSqToPoint(d.points[0]),headDistance=d.points[0].distanceTo(r.origin);
    if(dhead<.085&&headDistance<dist&&headDistance<maxDist){
      best={d,i:0,point:d.points[0].clone(),distance:headDistance};dist=headDistance;
    }
  }
  return best;
}
function bloodBurst(pos,dir,count=13){
  for(let i=0;i<count && particles.length<190;i++){
    const red=Math.random()>.1;
    const m=mesh(sphere,red?materials.blood:materials.red,effects);
    const scale=(.016+Math.random()*.037);m.scale.set(scale,scale*(.55+Math.random()),scale);
    m.position.copy(pos);
    const vel=V((Math.random()-.5)*4,(Math.random()*3.2+.4),(Math.random()-.5)*4).addScaledVector(dir,.6+Math.random()*3);
    particles.push({m,v:vel,life:1.7+Math.random()*1.6});
  }
}
function spark(pos,dir){
  for(let i=0;i<5 && particles.length<190;i++){
    const m=mesh(sphere,materials.orange,effects);
    const s=.015+Math.random()*.014;m.scale.setScalar(s);m.position.copy(pos);
    particles.push({m,v:V((Math.random()-.5)*4,Math.random()*3.4,(Math.random()-.5)*4).addScaledVector(dir,1),life:.45});
  }
}
function tracer(start,end,flavor){
  const arr=new Float32Array([start.x,start.y,start.z,end.x,end.y,end.z]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
  const material=new THREE.LineBasicMaterial({color:flavor==='physics'?0x48fff0:0xffd39b,transparent:true,opacity:.8});
  const line=new THREE.Line(geo,material);effects.add(line);decals.push({m:line,life:.10,fade:1});
}
function playSound(frequency=130,duration=.06,amplitude=.07){
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!heldAudio)heldAudio=new Audio();
    if(heldAudio.state==='suspended')heldAudio.resume();
    const osc=heldAudio.createOscillator(),gain=heldAudio.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(frequency,heldAudio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20,frequency/3),heldAudio.currentTime+duration);
    gain.gain.setValueAtTime(amplitude,heldAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,heldAudio.currentTime+duration);
    osc.connect(gain).connect(heldAudio.destination);
    osc.start();osc.stop(heldAudio.currentTime+duration);
  }catch(_){}
}
function dropDummy(){
  let target=rayTarget(80)?.d || dummies.find(d=>!d.physics&&d.alive);
  if(!target){say('Nessun bersaglio disponibile',1100);return}
  target.physics=true;target.prev.forEach((p,i)=>p.y+=.08);
  say('VINCOLO SGANCIATO · gravità attiva',1100);
}
function shotRay(direction){
  const base=camera.getWorldDirection(V());
  const dir=base.clone();
  dir.addScaledVector(V(1,0,0).applyQuaternion(camera.quaternion),direction.x);
  dir.addScaledVector(V(0,1,0).applyQuaternion(camera.quaternion),direction.y);
  return dir.normalize();
}
function hitPhysics(d,point,index,dir,damage,force,bleedScale,kind){
  const prevLife=d.life;
  addTrauma(d,damage,index,kind);
  d.bleed=Math.min(9,d.bleed+damage*.018*bleedScale);
  impulse(d,index,force,dir);
  bloodBurst(point,dir,Math.min(26,Math.ceil(damage/3)+4));
  if(d.life<=0&&prevLife>0){
    say(d.enemy?'BERSAGLIO NEUTRALIZZATO · '+score:'SEGNI VITALI ASSENTI',1250);
  }else if(!d.enemy){say(zoneOf(index)+' · '+Math.round(d.life)+'% integrità',700)}
}
function detonate(position,dir){
  shake=.10;playSound(56,.4,.19);
  const size=mesh(sphere,new THREE.MeshBasicMaterial({color:0xffc988,transparent:true,opacity:.48,depthWrite:false}),effects);
  size.scale.setScalar(.12);size.position.copy(position);
  decals.push({m:size,life:.5,fade:2});
  for(let i=0;i<28;i++){
    const v=V((Math.random()-.5)*2,Math.random()*1.5,(Math.random()-.5)*2).normalize();
    spark(position,v);
  }
  let victims=0;
  for(const d of dummies){
    const center=d.points[3],dist=center.distanceTo(position);
    if(dist<6.5){
      let falloff=Math.max(.13,1-dist/6.5);
      hitPhysics(d,center.clone(),3,center.clone().sub(position).normalize(),Math.round(90*falloff),185*falloff,2.2,'ESPLOSIONE');
      victims++;
    }
  }
  say('ONDA D’URTO · '+victims+' soggetti coinvolti',1700);
}
function action(){
  if(!playing)return;
  if(tool==='drop'){dropDummy();return}
  if(tool==='physics'){
    if(held){held=null;say('Oggetto rilasciato',950);playSound(150,.08,.035);return}
    const hit=rayTarget(55);
    if(hit){held={d:hit.d,i:hit.i,distance:THREE.MathUtils.clamp(hit.distance,2.5,12)};
      hit.d.physics=true;say('Agganciato · mira per spostare',1200);playSound(350,.1,.06);
    }else say('Mira a un manichino per agganciarlo',1100);
    return;
  }
  const weapon=weapons[tool]||weapons.pistol;
  const now=performance.now();
  if(now-lastShot<weapon.cooldown)return;
  lastShot=now;
  const baseDir=camera.getWorldDirection(V()),start=camera.position.clone().addScaledVector(baseDir,.5);
  playSound(weapon.sound,tool==='grenade'?.16:.095,tool==='shotgun'?.11:.068);
  shake=(tool==='sniper'||tool==='shotgun')?.05:.019;
  if(tool==='grenade'){
    const hit=rayTarget(80);
    const pos=hit?hit.point.clone():camera.position.clone().addScaledVector(baseDir,10);
    tracer(start,pos,tool);detonate(pos,baseDir);updateHud(hit?.d);return;
  }
  let target=null;
  for(let i=0;i<weapon.pellets;i++){
    const dir=shotRay({x:(Math.random()-.5)*weapon.spread*2,y:(Math.random()-.5)*weapon.spread*2});
    const hit=rayTarget(80,dir);
    const point=hit?hit.point.clone():camera.position.clone().addScaledVector(dir,56);
    if(i===0||tool==='shotgun'&&i%2===0)tracer(start,point,tool);
    if(hit){
      const damage=hit.i===0?weapon.damage*1.55:weapon.damage;
      hitPhysics(hit.d,hit.point,hit.i,dir,damage,weapon.push,weapon.bleed,'FERITA');
      target=hit.d;
    } else if(i===0)spark(point,dir);
  }
  updateHud(target);
}
function updateHud(aimed){
  const d=aimed||dummies.find(d=>!d.enemy)||dummies.find(d=>d.alive)||dummies[0];
  $('#targetHealth').textContent=d?Math.round(d.life)+'%':'—';
  $('#targetState').textContent=d?(d.life<=0?'SISTEMA NON OPERATIVO':d.physics?'FISICA ATTIVA':'BERSAGLIO STABILE'):'NESSUN BERSAGLIO';
  hudHealth.style.width=health+'%';
  $('#mode').textContent=mode==='zombies'?'ONDATA '+wave+' / '+score:mode==='tower'?'TEST VERTICALE':'SANDBOX';
}
let hintTimer=0;
function say(t,ms=1800){const el=$('#hint');el.textContent=t;el.classList.add('visible');clearTimeout(hintTimer);hintTimer=setTimeout(()=>el.classList.remove('visible'),ms)}
function startGame(newMode){
  mode=newMode;playing=true;home.style.display='none';overlay.style.display='block';
  $('#rotate').classList.remove('off');buildArena(mode);spawnForMode();changeTool('pistol');
  if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});
}
function reset(){held=null;buildArena(mode);spawnForMode();changeTool('pistol')}
function goHome(){playing=false;home.style.display='flex';overlay.style.display='none';$('#rotate').classList.add('off');fireHeld=false;
  if(document.pointerLockElement)document.exitPointerLock();}
$$('.modebtn').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.modebtn').forEach(b=>b.classList.toggle('active',b===btn));
}));
$('#launch').addEventListener('click',()=>startGame($('.modebtn.active').dataset.mode));
$('#reset').addEventListener('click',reset);$('#menu').addEventListener('click',goHome);
$$('.tool').forEach(btn=>btn.addEventListener('click',()=>changeTool(btn.dataset.tool)));
$('#grab').addEventListener('click',()=>{
  if(tool!=='physics')changeTool('physics');
  action();
});
const fireButton=$('#fire');
fireButton.addEventListener('pointerdown',e=>{e.preventDefault();fireHeld=true;action();fireButton.setPointerCapture(e.pointerId)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])fireButton.addEventListener(event,()=>fireHeld=false);
const stick=$('#stick'),knob=$('#knob');
let stickId=null;
function moveStick(e){
  const rect=stick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const dx=e.clientX-cx,dy=e.clientY-cy,max=rect.width*.32,len=Math.max(1,Math.hypot(dx,dy));
  joyX=THREE.MathUtils.clamp(dx/max,-1,1);joyY=THREE.MathUtils.clamp(dy/max,-1,1);
  const scale=Math.min(1,max/len);
  knob.style.transform='translate('+(dx*scale)+'px,'+(dy*scale)+'px)';
}
stick.addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});
function releaseStick(e){if(stickId===e.pointerId){stickId=null;joyX=joyY=0;knob.style.transform='translate(0,0)';}}
stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);
canvas.addEventListener('pointerdown',e=>{if(!playing)return;
  if(e.pointerType==='mouse'&&e.button===0){action()}
  aimPointer=e.pointerId;lookX=e.clientX;lookY=e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!playing||aimPointer!==e.pointerId)return;
  const dx=e.clientX-lookX,dy=e.clientY-lookY;
  lookX=e.clientX;lookY=e.clientY;
  const sens=e.pointerType==='mouse'?.0035:.0044;
  yaw-=dx*sens;pitch=THREE.MathUtils.clamp(pitch-dy*sens,-1.48,1.48);
});
const endAim=e=>{if(aimPointer===e.pointerId)aimPointer=null};
canvas.addEventListener('pointerup',endAim);canvas.addEventListener('pointercancel',endAim);
document.addEventListener('keydown',e=>{
  if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyR'&&playing)reset();
  const numbers={'Digit1':'pistol','Digit2':'smg','Digit3':'rifle','Digit4':'sniper','Digit5':'shotgun','Digit6':'grenade','Digit7':'physics','Digit8':'drop'};
  if(numbers[e.code])changeTool(numbers[e.code]);
  if(e.code==='Space'&&playing)action();
  if(e.code==='Escape'&&playing)goHome();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));
  renderer.setSize(innerWidth,innerHeight);
});
function movePlayer(dt){
  const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joyY;
  const right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joyX;
  const mag=Math.max(1,Math.hypot(forward,right));
  const speed=mode==='tower'?4:5.7,step=speed*dt/mag;
  player.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*step;
  player.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*step;
  player.x=THREE.MathUtils.clamp(player.x,-13,13);
  player.z=THREE.MathUtils.clamp(player.z,mode==='tower'?-1.5:-15,13);
  camera.position.set(player.x,player.y+Math.sin(performance.now()*.011)*.018*Math.min(1,Math.hypot(forward,right)),player.z);
  camera.rotation.y=yaw;camera.rotation.x=pitch;
  if(shake>0){camera.rotation.z=(Math.random()-.5)*shake;shake*=.78;if(shake<.0008)shake=0;}
  else camera.rotation.z=0;
  gun.rotation.z=Math.sin(performance.now()*.003)*.025;
}
function updateEnemies(dt,time){
  if(mode!=='zombies')return;
  let standing=0;
  for(const d of dummies){
    if(!d.enemy||!d.alive||d.physics)continue;
    standing++;
    const dx=player.x-d.points[3].x,dz=player.z-d.points[3].z,len=Math.max(.001,Math.hypot(dx,dz));
    const vel=(.65+wave*.085)*dt;
    if(len>1.05){translateDummy(d,dx/len*vel,dz/len*vel)}
    else{
      health=Math.max(0,health-dt*6.5);
      if(health<=0){say('OPERATORE FUORI SERVIZIO · RIPRISTINA',2800);health=100;player.x=0;player.z=10}
    }
    for(const i of [5,8,11,14])d.points[i].y+=Math.sin(time*.007+d.phase+i)*.002;
  }
  if(standing===0&&time>nextWaveAt){
    if(!nextWaveAt){nextWaveAt=time+2300;say('ONDATA COMPLETATA · prossima in arrivo',1700)}
    else if(time>nextWaveAt){spawnWave()}
  }
}
function updateEffects(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.life-=dt;p.v.y-=15*dt;
    p.m.position.addScaledVector(p.v,dt);
    const base=floorAt(p.m.position.x,p.m.position.z);
    if(p.m.position.y<base+.018){
      p.m.position.y=base+.018;p.v.y*=-.2;p.v.x*=.75;p.v.z*=.75;
      if(p.life>.8)p.life=.8;
    }
    if(p.life<=0){effects.remove(p.m);p.m.geometry!==sphere&&p.m.geometry.dispose();particles.splice(i,1)}
  }
  for(let i=decals.length-1;i>=0;i--){
    const p=decals[i];p.life-=dt;if(p.fade)p.m.material.opacity=Math.max(0,p.life/.1);
    if(p.life<=0){effects.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();decals.splice(i,1);}
  }
}
function tick(time){
  requestAnimationFrame(tick);
  const dt=Math.min(.032,Math.max(.001,(time-lastTime)/1000||.016));lastTime=time;
  if(playing){
    movePlayer(dt);
    if(fireHeld&&weapons[tool]?.automatic)action();
    currentRay();
    if(held&&held.d){ // Keep grab target at the original distance while looking around
      if(!held.d.alive&&mode==='zombies')held=null;
    }
    updateEnemies(dt,time);
    for(const d of dummies){
      simulate(d,dt);medicalTick(d,dt);pose(d);
    }
    updateEffects(dt);
    if((Math.floor(time/150)%4)===0){
      const target=rayTarget(75);
      if(target&&target.d)updateHud(target.d);
    }
    if(mode==='zombies')updateHud();
  }
  renderer.render(scene,camera);
}
requestAnimationFrame(tick);
