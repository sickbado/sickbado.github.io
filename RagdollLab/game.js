/* RAGDOLL LAB v1.0 — standalone original web game. Three.js is used as an external rendering library. */
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
scene.fog=new THREE.FogExp2(0x14232b,0.010);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.06,130);
camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
renderer.outputColorSpace=THREE.SRGBColorSpace;
scene.add(new THREE.HemisphereLight(0xb7dbed,0x1c1e22,1.75));
const sun=new THREE.DirectionalLight(0xbfefff,2.2); sun.position.set(-8,18,10);
sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-22; sun.shadow.camera.right=22; sun.shadow.camera.top=23; sun.shadow.camera.bottom=-23; sun.shadow.camera.far=60; scene.add(sun);
const cyan=new THREE.PointLight(0x43c7cf,35,24,2); cyan.position.set(-7,5,-7); scene.add(cyan);
const amber=new THREE.PointLight(0xf4a564,24,20,2); amber.position.set(6,6,-8); scene.add(amber);
const world=new THREE.Group();scene.add(world);
const bodies=new THREE.Group();scene.add(bodies);
const effects=new THREE.Group();scene.add(effects);
const colliders=[];
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
  wound:new THREE.MeshStandardMaterial({color:0x550913,roughness:.88,side:THREE.DoubleSide}),
  woundedCloth:new THREE.MeshStandardMaterial({color:0x56151d,roughness:.95,side:THREE.DoubleSide}),
  white:new THREE.MeshStandardMaterial({color:0xe0e8df,roughness:.67,metalness:.09}),
  dummy:new THREE.MeshStandardMaterial({color:0xb4c0bd,roughness:.63,metalness:.14}),
  dummyJoint:new THREE.MeshStandardMaterial({color:0x414f56,metalness:.72,roughness:.35}),
  enemy:new THREE.MeshStandardMaterial({color:0x918f84,roughness:.74}),
  enemyJoint:new THREE.MeshStandardMaterial({color:0x713f3f,roughness:.7}),
  visor:new THREE.MeshStandardMaterial({color:0x19383d,emissive:0x31ccc2,emissiveIntensity:.65,metalness:.6}),
  brain:new THREE.MeshStandardMaterial({color:0xe4baaa,roughness:.75}),
  lung:new THREE.MeshStandardMaterial({color:0xad4555,roughness:.73}),
  heart:new THREE.MeshStandardMaterial({color:0x8f263e,roughness:.66}),
  liver:new THREE.MeshStandardMaterial({color:0x673246,roughness:.73}),
  bone:new THREE.MeshStandardMaterial({color:0xe0d5b0,roughness:.7}),
  evil:new THREE.MeshStandardMaterial({color:0x8b1818,emissive:0xf52323,emissiveIntensity:1.2}),
  skin:new THREE.MeshStandardMaterial({color:0xc6a28b,roughness:.86,metalness:0}),
  skin2:new THREE.MeshStandardMaterial({color:0x9b725c,roughness:.89,metalness:0}),
  deadSkin:new THREE.MeshStandardMaterial({color:0x929b87,roughness:.96,metalness:0}),
  coverall:new THREE.MeshStandardMaterial({color:0x74838c,roughness:.94,metalness:.03}),
  fabric:new THREE.MeshStandardMaterial({color:0x394c5b,roughness:.98,metalness:0}),
  trousers:new THREE.MeshStandardMaterial({color:0x263847,roughness:.95,metalness:.02}),
  seams:new THREE.MeshStandardMaterial({color:0x182832,roughness:1}),
  rubber:new THREE.MeshStandardMaterial({color:0x171a20,roughness:.83,metalness:.07}),
  pale:new THREE.MeshStandardMaterial({color:0xdbd4c7,roughness:.92}),
  hair:new THREE.MeshStandardMaterial({color:0x26252a,roughness:1}),
  eyes:new THREE.MeshStandardMaterial({color:0xe9e4dd,roughness:.8}),
  pupils:new THREE.MeshStandardMaterial({color:0x24332f,roughness:.65}),
  lightStrip:new THREE.MeshStandardMaterial({color:0xf5f6dd,emissive:0xd8eee0,emissiveIntensity:1.6}),
  monitor:new THREE.MeshStandardMaterial({color:0x102932,emissive:0x1e7c85,emissiveIntensity:.45,roughness:.28})
};
const cube=new THREE.BoxGeometry(1,1,1), sphere=new THREE.SphereGeometry(1,12,9);
const cylinder=new THREE.CylinderGeometry(1,1,1,10);
const tapered=new THREE.CylinderGeometry(.83,1,1,12,1);
const round=new THREE.SphereGeometry(1,20,14);
const bootGeom=new THREE.BoxGeometry(1,1,1);
function canvasTexture(type,size=256){
  const c=document.createElement('canvas');c.width=size;c.height=size;
  const a=c.getContext('2d'),image=a.createImageData(size,size);
  const base=type==='floor'?[52,67,71]:type==='concrete'?[61,72,73]:[58,72,82];
  for(let i=0;i<image.data.length;i+=4){
    const noise=(Math.random()-.5)*(type==='floor'?28:32);
    for(let j=0;j<3;j++)image.data[i+j]=Math.max(0,Math.min(255,base[j]+noise));
    image.data[i+3]=255;
  }
  a.putImageData(image,0,0);
  if(type==='floor'){
    a.strokeStyle='#2e3940';a.lineWidth=3;
    for(let n=0;n<=size;n+=64){a.beginPath();a.moveTo(0,n);a.lineTo(size,n);a.moveTo(n,0);a.lineTo(n,size);a.stroke();}
    a.strokeStyle='#697b7b';a.lineWidth=1;
    for(let n=4;n<size;n+=64){a.strokeRect(n,n,56,56);}
    a.fillStyle='#9ea7a1';
    for(let x=4;x<size;x+=64)for(let y=4;y<size;y+=64){
      for(const xx of [x,x+56])for(const yy of [y,y+56]){a.beginPath();a.arc(xx,yy,1.9,0,Math.PI*2);a.fill();}
    }
  }
  if(type==='concrete'){
    a.strokeStyle='#34434c';a.lineWidth=3;
    for(let y=0;y<size;y+=128){a.beginPath();a.moveTo(0,y);a.lineTo(size,y);a.stroke();}
    a.fillStyle='#8a9497';for(let n=0;n<30;n++)a.fillRect(Math.random()*size,Math.random()*size,1,1);
  }
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=2;
  texture.repeat.set(type==='floor'?7:3,type==='floor'?7:2);
  return texture;
}
materials.floor.map=canvasTexture('floor');
materials.wall.map=canvasTexture('concrete');
materials.wall2.map=canvasTexture('concrete');
for(const mat of [materials.floor,materials.wall,materials.wall2])mat.needsUpdate=true;
function attach(part,geom,mat,scale,pos){const o=mesh(geom,mat,part);o.scale.set(...scale);o.position.set(...pos);return o}

function mesh(geom,mat,group=world){const m=new THREE.Mesh(geom,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
function box(x,y,z,w,h,d,mat=materials.wall,group=world){const m=mesh(cube,mat,group);m.position.set(x,y,z);m.scale.set(w,h,d);return m}
function lightbar(x,y,z,w=2.8){box(x,y,z,w,.065,.21,materials.lightStrip);box(x,y+.11,z,w+.2,.11,.34,materials.black)}
const {createPremium}=await import('./premium.js');
const premium=createPremium({THREE,renderer,scene,world,bodies,effects,materials,camera,mesh,box});
premium.applyQuality('auto');
function sign(text,x,y,z,color='#9df2e9',size=.62){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ct=c.getContext('2d');
  ct.fillStyle='#09151c';ct.fillRect(0,0,512,128);ct.strokeStyle='#477077';ct.lineWidth=6;ct.strokeRect(4,4,504,120);
  ct.fillStyle=color;ct.font='bold 51px monospace';ct.textAlign='center';ct.fillText(text,256,82);
  const tex=new THREE.CanvasTexture(c), material=new THREE.MeshBasicMaterial({map:tex,transparent:true});
  const panel=mesh(new THREE.PlaneGeometry(4*size,size),material);panel.position.set(x,y,z);
  return panel;
}
function addFloorCollider(m,padding=0){
  colliders.push({x:m.position.x,z:m.position.z,halfX:m.scale.x/2+padding,halfZ:m.scale.z/2+padding,top:m.position.y+m.scale.y/2});
  return m;
}
function buildArena(mode){
  colliders.length=0;
  world.clear(); bodies.clear();effects.clear(); dummies.length=0;particles.length=0;decals.length=0;held=null;
  const walls=mode==='tower'?30:26;
  box(0,-.24,-1,walls,.48,34,materials.floor);
  const grid=new THREE.GridHelper(walls,26,0x334e51,0x28353b);grid.position.set(0,.008,-1);world.add(grid);grid.material.opacity=.26;grid.material.transparent=true;
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
  // Laboratory flooring, wall paneling, bracing, warning stripes and signage
  for(let x=-13;x<=13;x+=4.3){
    for(let z=-15;z<=14;z+=5.1){
      const rivet=box(x,.012,z,.05,.015,.05,materials.steel);
      rivet.rotation.y=Math.PI/4;
    }
  }
  for(const side of [-1,1]){
    for(let z=-13;z<=12;z+=3.65){
      const w=box(side*14.65,4.1,z,.042,3.1,2.6,materials.wall2);
      box(side*14.58,5.2,z,.07,.055,2.35,materials.steel);
      box(side*14.55,2.8,z,.07,.045,2.35,materials.steel);
      const trim=box(side*14.5,1.1,z,.08,.045,1.9,materials.teal);
      box(side*14.58,.52,z,.12,.33,2.8,materials.black);
    }
  }
  // Realistic bench assemblies and ceiling cable trays
  for(let side of [-1,1]){
    for(let z of [-9,2.5]){
      const x=side*9.8;
      box(x,.82,z,2.7,.13,1.35,materials.steel);
      addFloorCollider(box(x,.89,z,2.75,.045,1.4,materials.black),.03);
      for(let leg of [-1.1,1.1])for(let depth of [-.47,.47]){
        box(x+leg,.39,z+depth,.13,.79,.14,materials.steel);
      }
      const monitorStand=box(x,1.14,z-.31,.11,.47,.11,materials.steel);
      const screen=box(x,1.51,z-.38,1.18,.78,.11,materials.black);
      const glow=box(x,1.51,z-.31,1.06,.65,.012,materials.monitor);
      const kb=box(x,.96,z+.35,.9,.034,.28,materials.black);
      for(let n=0;n<9;n++){
        box(x-.37+n*.09,.982,z+.35,.052,.008,.17,materials.steel);
      }
      box(x+1.02,1.00,z+.26,.16,.19,.16,materials.pale);
    }
  }
  for(let z=-11;z<14;z+=7){
    box(-1,7.66,z,23,.14,.34,materials.steel);
    for(let x=-11;x<=10;x+=2){
      box(x,7.57,z,.08,.095,.37,materials.black);
    }
  }
  // Backwall industrial cabinets and pipes
  for(let x of [-10,-5,5,10]){
    box(x,1.53,-16.04,2.05,3.0,.55,materials.steel);
    box(x,1.56,-15.72,1.89,2.78,.026,materials.wall2);
    box(x+.67,1.57,-15.69,.08,.30,.045,materials.orange);
    box(x-.66,2.72,-15.69,.32,.035,.04,materials.lightStrip);
  }
  for(let y of [3.4,4.0])for(let z of [-16.5,15.0]){
    const pipe=box(0,y,z,29,.105,.105,materials.steel);
    box(0,y+.11,z,29,.035,.04,materials.black);
  }
  for(let z of [-8,1,10]){
    box(0,7.72,z,1.8,.12,.65,materials.black);
    box(0,7.60,z,1.55,.055,.54,materials.lightStrip);
  }
  // Simple baked shadows under key structures, cheap for mobile GPU
  const shadowMaterial=new THREE.MeshBasicMaterial({color:0x080f14,transparent:true,opacity:.2,depthWrite:false});
  for(let x of [-9.8,9.8])for(let z of [-9,2.5]){
    const sh=mesh(new THREE.CircleGeometry(2,18),shadowMaterial,world);
    sh.position.set(x,.015,z);sh.rotation.x=-Math.PI/2;sh.scale.set(1.5,.9,1);
  }
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
    addFloorCollider(box(bx,.88,bz,1.19,.08,1.19,materials.black),.05);
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
    addFloorCollider(box(0,16,-3.3,5.8,.28,3.7,materials.black));
    box(0,16.2,-4.95,5.8,.07,.35,materials.orange);
    // catch pad and measuring pillars
    box(0,.15,-9,6,.3,4.3,materials.black);
    addFloorCollider(box(0,.32,-9,5.5,.08,3.8,materials.red));
    for(let i=0;i<9;i++){box(-3.15,i*2,-8.7,.08,.06,.9,materials.orange);}
    sign('16m DROP TEST',0,5.3,-16.5,'#ffba72',.6);
    for(let j=0;j<8;j++) addFloorCollider(box(7,.32+j*.73,-7+j*1.4,3,.5,1.45,materials.steel));
  } else if(mode==='zombies'){
    sign('CONTAINMENT',0,5.2,-16.5,'#ff8b76',.62);
    for(let i=0;i<5;i++){
      box(-9+i*4.5,.09,-13.3,2.6,.18,1.4,materials.red);
      box(-9+i*4.5,.3,-13.9,2.5,.28,.13,materials.orange);
    }
  } else {
    sign('BIOMECHANICS',0,5.2,-16.5,'#9df2e9',.58);
    box(0,.075,-6,3,.14,3,materials.black);
    addFloorCollider(box(0,.16,-6,2.7,.05,2.7,materials.steel));
    for(let x of [-1.7,1.7])for(let z of [-7.8,-4.2]){
      box(x,1.35,z,.13,2.55,.13,materials.steel);
    }
    box(0,2.63,-6,3.6,.17,3.9,materials.steel);
    lightbar(0,2.48,-6,2.3);
  }
  premium.addArena(mode);
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
let medOpen=false,xrOn=false;
let health=100,wave=0,score=0,nextWaveAt=0,shake=0,lastShot=0,lastTime=0;
const tempA=V(),tempB=V(),tmp=V(),ray=new THREE.Ray(),up=V(0,1,0);
function makeDummy(x,z,y=0,isEnemy=false){
  const d={points:[],prev:[],constraints:[],parts:[],life:100,alive:true,physics:false,
    enemy:isEnemy,base:V(x,y,z),phase:Math.random()*6.28,hitCount:0,deathAt:0,
    blood:100,bleed:0,organs:{brain:100,heart:100,lungs:100,liver:100},
    fractures:0,injuries:[],maxHeight:y+1.9,fallRegistered:false,poolTimer:0,wounds:[],
    reaction:0,reactionTime:0,hitIndex:2,hitDirection:V(0,0,-1),balance:100,limp:0};
  d.walkDistance=0;d.facing=0;d.hasWalk=false;d.skin=isEnemy?materials.deadSkin:(Math.random()<.55?materials.skin:materials.skin2);
  d.points=jointTemplate.map(([px,py,pz])=>V(x+px,y+py,z+pz));
  d.prev=d.points.map(p=>p.clone());
  for(const [a,b,r] of bones){ if(!r) continue;
    const upper=[0,1,2,3,4,5,6,7,8,9,10].includes(a);
    const isArm=(a===4||a===5||a===7||a===8);
    const isLeg=(a===10||a===11||a===13||a===14);
    const isHand=(a===5||a===8);
    const isShin=(a===11||a===14);
    const isSkin=isHand || a===0;
    const mat=isEnemy?(isSkin?d.skin:(isLeg?materials.enemyJoint:materials.enemy)):
       isSkin?d.skin:isLeg?materials.trousers:isArm?materials.coverall:materials.fabric;
    const m=mesh(tapered,mat,bodies);
    d.parts.push({a,b,r:r*(isArm?1.12:isLeg?1.24:1),m});
  }
  for(const [a,b] of [...bones,...braces]){
    d.constraints.push({a,b,len:d.points[a].distanceTo(d.points[b])});
  }
  d.head=mesh(round,d.skin,bodies);
  d.head.scale.set(.203,.267,.188);
  d.joints=[];
  for(const i of [1,3,4,5,7,8,10,11,13,14]){
    const limb=(i===10||i===11||i===13||i===14);
    const mat=i===1?d.skin:limb?materials.trousers:materials.coverall;
    const j=mesh(sphere,mat,bodies);
    j.scale.set(i===1?.09:.103,i===3?.116:.112,i===3?.12:.101);d.joints.push([i,j]);
  }
  d.visor=mesh(sphere,isEnemy?materials.evil:materials.visor,bodies);
  d.visor.scale.set(.19,.068,.035);d.visor.visible=false;
  d.torso=mesh(round,isEnemy?materials.enemy:materials.coverall,bodies);
  d.torso.scale.set(.31,.38,.19);
  d.pelvis=mesh(round,isEnemy?materials.enemyJoint:materials.trousers,bodies);
  d.pelvis.scale.set(.275,.19,.18);
  d.jacket=new THREE.Group();bodies.add(d.jacket);
  attach(d.jacket,cube,materials.fabric,[.52,.075,.035],[0,.13,.195]);
  attach(d.jacket,cube,isEnemy?materials.red:materials.orange,[.1,.1,.018],[.17,.13,.219]);
  attach(d.jacket,cube,materials.seams,[.022,.46,.022],[0,-.01,.194]);
  const collar=attach(d.jacket,cylinder,materials.fabric,[.135,.10,.14],[0,.33,0]);
  d.boots=[];
  for(const idx of [12,15]){
    const boot=mesh(bootGeom,materials.rubber,bodies);
    boot.scale.set(.18,.18,.29);d.boots.push([idx,boot]);
  }
  d.face=new THREE.Group();bodies.add(d.face);
  d.eyes=[];
  for(const side of [-1,1]){
    attach(d.face,sphere,isEnemy?materials.evil:materials.eyes,[.044,.030,.017],[side*.085,.025,.182]);
    const iris=attach(d.face,sphere,isEnemy?materials.evil:materials.pupils,[.021,.024,.014],[side*.085,.025,.198]);
    d.eyes.push(iris);
    attach(d.face,round,d.skin,[.046,.07,.035],[side*.208,-.025,.005]);
    attach(d.face,cube,materials.hair,[.08,.016,.021],[side*.08,.082,.185]);
  }
  const nose=mesh(new THREE.ConeGeometry(.047,.155,9),d.skin,d.face);
  nose.position.set(0,-.035,.200);nose.rotation.x=Math.PI*.5;
  const mouth=attach(d.face,cube,materials.hair,[.092,.011,.015],[0,-.111,.174]);
  const scalp=attach(d.face,round,materials.hair,[.205,.078,.189],[0,.208,-.001]);
  const crown=attach(d.face,round,materials.hair,[.183,.06,.178],[0,.239,-.02]);

  const anatomy=[];
  for(const [organ,pos,scale,mat] of [
    ['brain',V(0,1.86,0),[.14,.13,.14],materials.brain],
    ['lungsL',V(-.118,1.40,0),[.12,.19,.13],materials.lung],
    ['lungsR',V(.118,1.40,0),[.12,.19,.13],materials.lung],
    ['heart',V(0,1.38,.06),[.10,.12,.10],materials.heart],
    ['liver',V(.09,1.13,.01),[.18,.10,.13],materials.liver]
  ]){
    const m=mesh(sphere,mat,bodies);m.scale.set(...scale);
    m.visible=xrOn;anatomy.push({organ,m,offset:pos});
  }
  d.anatomy=anatomy;
  premium.enhanceDummy(d);
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
  d.torso.position.copy(pts[1]).lerp(pts[3],.49);
  d.torso.scale.y=(d.details?1:.38)+(!d.physics?.009*Math.sin(performance.now()*.0021+d.phase):0);
  d.pelvis.position.copy(pts[3]);
  d.jacket.position.copy(d.torso.position);
  d.jacket.quaternion.setFromUnitVectors(up,tempA.subVectors(pts[1],pts[3]).normalize());
  for(const [idx,boot] of d.boots){boot.position.copy(pts[idx]).add(V(0,.035,.056));}
  const headAxis=tempA.subVectors(pts[0],pts[1]).normalize();
  d.face.position.copy(pts[0]);
  d.face.quaternion.setFromUnitVectors(up,headAxis);
  for(const {organ,m,offset} of d.anatomy){
    const root=organ==='brain'?pts[0]:pts[3];
    if(organ==='brain')m.position.copy(root);
    else m.position.copy(root).addScaledVector(tempB.subVectors(pts[1],pts[3]),(offset.y-.97)/(.6));
    if(organ!=='brain')m.position.add(V(offset.x,0,offset.z));
    m.visible=xrOn;
  }
  for(const [i,s] of d.joints)s.position.copy(pts[i]);
  for(const wound of d.wounds){
    wound.mesh.position.copy(pts[wound.index]);
    wound.mesh.position.z+=wound.front;
    wound.mesh.rotation.z=wound.twist;
  }
  premium.updateDummy(d,performance.now());
}
function animateLiving(d,time){
  if(d.physics)return;
  const t=time*.001;
  const running=d.enemy && d.hasWalk;
  const speed=running?8.4:1;
  const stride=running?Math.sin(t*speed+d.phase):0;
  const sway=Math.sin(t*1.55+d.phase);
  const bounce=running?Math.abs(stride)*.037:Math.sin(t*2+d.phase)*.008;
  const turn=d.facing||0,cs=Math.cos(turn),sn=Math.sin(turn);
  const since=Math.max(0,(time-d.reactionTime)/1000);
  const flinch=d.reaction*Math.exp(-since*7);
  if(flinch<.005)d.reaction=0;
  const knock=Math.sin(Math.min(1,since/.26)*Math.PI)*flinch;
  const legInjury=d.limp||0;
  const injuredLeg=d.hitIndex>=13?1:-1;
  const hitLocalX=d.hitDirection.x*cs-d.hitDirection.z*sn;
  const hitLocalZ=d.hitDirection.x*sn+d.hitDirection.z*cs;
  for(let i=0;i<jointTemplate.length;i++){
    let [x,y,z]=jointTemplate[i];
    if(i===0){x+=.009*sway;z+=.014*sway;}
    if(i===1||i===2){y+=bounce;z+=.012*sway;}
    if(i===3){x+=.013*sway;}
    if(i===4||i===7){y+=bounce;z+=running?.035*stride*(i===4?-1:1):0;}
    if(i===5||i===8){z+=(running?.25:.033)*stride*(i===5?-1:1)+(d.enemy?.26:0);}
    if(i===6||i===9){z+=(running?.37:.027)*stride*(i===6?-1:1)+(d.enemy?.48:0);y+=d.enemy?.04:0;}
    if(i===11||i===14){
      const side=i===11?1:-1;
      z+=stride*side*.21;y+=Math.max(0,stride*side)*.06;
      if(side===injuredLeg){z*=1-legInjury*.6;y-=legInjury*.035;}
    }
    if(i===12||i===15){
      const side=i===12?1:-1;
      z+=stride*side*.34;y+=Math.max(0,stride*side)*.19;
      if(side===injuredLeg){z*=1-legInjury*.6;y-=legInjury*.065;}
    }
    if(i===10||i===13)y+=bounce;
    // No ballistic teleport: all flinching is constrained to centimetres.
    if(i<=3){z+=knock*.085*hitLocalZ;x+=knock*.048*hitLocalX;}
    else if(i<=9){z+=knock*.065*hitLocalZ;x+=knock*.025*hitLocalX;}
    // Reflex withdrawal of the struck arm, while keeping the feet planted.
    if(d.hitIndex>=4&&d.hitIndex<=9&&i===d.hitIndex){y+=knock*.05;z-=knock*.06;}
    if(i===0){z+=knock*.027*hitLocalZ;y-=knock*.018;}
    d.points[i].set(d.base.x+x*cs+z*sn,d.base.y+y+bounce*(i===0?.4:0),d.base.z-x*sn+z*cs);
    d.prev[i].copy(d.points[i]);
  }
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
      for(const c of colliders){
        if(Math.abs(p.x-c.x)<c.halfX&&Math.abs(p.z-c.z)<c.halfZ&&p.y<c.top+.08&&p.y>c.top-.5){
          p.y=c.top+.08;
          const prev=d.prev[d.points.indexOf(p)];
          if(prev.y<p.y)prev.y=p.y;
        }
      }
      p.x=THREE.MathUtils.clamp(p.x,-14.3,14.3);p.z=THREE.MathUtils.clamp(p.z,-16.3,14.7);
    }
  }
}
// A gunshot is not an explosion: keep projectile momentum small relative to body mass.
// Incoming bullet transfers pain and local recoil; it never enables full ragdoll by itself.
function impulse(d,index,strength,dir,isExplosion=false){
  if(!d.physics)return;
  // A bullet's momentum is negligible relative to an adult's body mass.
  // A blast wave is different: it can impart enough momentum to knock somebody over.
  const displacement=isExplosion
    ? THREE.MathUtils.clamp(strength*.00065,0,.12)
    : THREE.MathUtils.clamp(strength*.000018,0,.003);
  const center=d.points[3];
  for(let k=0;k<d.points.length;k++){
    const near=Math.max(.22,1-center.distanceTo(d.points[k])/2.4);
    d.prev[k].addScaledVector(dir,-displacement*near);
  }
  // Small additional rotation near the impact point; prevents launching the entire body.
  const impact=d.prev[index];
  if(impact)impact.addScaledVector(dir,-displacement*.12);
}
function registerHitReaction(d,index,dir,damage){
  if(d.physics)return;
  // Fast flinch, fading over ~0.55 s. Heavier hits are more visible, not more airborne.
  const localStrength=THREE.MathUtils.clamp(damage/70,.12,.78);
  d.reaction=Math.max(d.reaction,localStrength);
  d.reactionTime=performance.now();
  d.hitIndex=index;
  d.hitDirection.copy(dir).setY(0);
  if(d.hitDirection.lengthSq()>0.001)d.hitDirection.normalize();
  if(index>=10 && damage>=19){d.limp=Math.min(.75,d.limp+.22);}
  d.balance=Math.max(0,d.balance-damage*(index>=10?.7:.20));
}
function zoneOf(index){
  if(index===0)return 'TESTA';
  if(index===1||index===2)return 'TORACE';
  if(index===3)return 'ADDOME';
  if(index<=9)return 'ARTI SUPERIORI';
  return 'ARTI INFERIORI';
}
function createWound(d,index,strength=30){
  if(d.wounds.length>=15)return;
  const isCloth=index!==0&&(index<5||index>9);
  const mat=isCloth?materials.woundedCloth:materials.wound;
  const mark=mesh(new THREE.CircleGeometry(.04+Math.min(45,strength)*.0016,9),mat,bodies);
  d.wounds.push({index,mesh:mark,front:index===0?.203:index<=3?.24:.11,twist:Math.random()*.3-.15});
}
function addTrauma(d,amount,index,kind='IMPATTO'){
  amount=Math.max(0,amount);if(amount===0)return;
  const zone=zoneOf(index);
  if(kind==='FERITA'||kind==='ESPLOSIONE')createWound(d,index,amount);
  // Hit reaction is scheduled by hitPhysics, based on shot direction and body region.
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
  dummies.forEach(d=>{d.parts.forEach(o=>bodies.remove(o.m));bodies.remove(d.head,d.visor,d.torso,d.pelvis,d.jacket,d.face);d.joints.forEach(([,m])=>bodies.remove(m))});
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
  d.base.x+=dx;d.base.z+=dz;
  for(let i=0;i<d.points.length;i++){d.points[i].x+=dx;d.points[i].z+=dz;d.prev[i].x+=dx;d.prev[i].z+=dz}
}
const player={x:0,y:1.65,z:7};
let yaw=0,pitch=0,joyX=0,joyY=0,keys=new Set(),aimPointer=null,lookX=0,lookY=0,fireHeld=false;
let heldAudio=null;
let recoil=0,muzzleAge=0,muzzleFlash=null,muzzleLight=null;
function makeGun(kind='pistol'){
  gun.clear(); gun.position.set(0,0,0);gun.rotation.set(0,0,0);gun.scale.setScalar(1);
  const long=['smg','rifle','sniper','shotgun','physics'].includes(kind);
  const grip=long?.32:.22;
  const x=.27,y=-.245,z=long?-.55:-.49,barrelZ=long?-1.25:-.79;
  const iron=materials.black,steel=materials.steel,poly=materials.rubber;
  box(x,y,z,long?.22:.16,.17,long?.66:.40,iron,gun);
  const barrel=mesh(new THREE.CylinderGeometry(long?.044:.031,long?.044:.031,long?.72:.32,12),
    steel,gun);barrel.position.set(x,y+.015,barrelZ+(long?.35:.15));barrel.rotation.x=Math.PI/2;
  const mouth=mesh(new THREE.CylinderGeometry(.053,.053,.09,14),iron,gun);
  mouth.position.set(x,y+.015,barrelZ-.02);mouth.rotation.x=Math.PI/2;
  if(kind==='rifle'||kind==='sniper'){
    box(x,y+.075,z+.17,.28,.16,.46,materials.fabric,gun);
    box(x,y-.13,z+.17,.13,.24,.14,poly,gun);
    box(x-.01,y+.14,z-.10,.13,.08,.5,steel,gun);
    box(x,y+.22,z-.18,.17,.07,.23,iron,gun);
    if(kind==='sniper'){
      box(x,y+.225,z-.12,.26,.12,.42,materials.black,gun);
      for(let zz of [z-.31,z+.08]){
        const ring=mesh(new THREE.TorusGeometry(.095,.023,8,14),steel,gun);
        ring.position.set(x,y+.22,zz);
      }
    }else{
      box(x-.03,y-.12,z+.28,.15,.31,.12,materials.fabric,gun);
    }
    box(x,y-.13,z-.2,.23,.11,.34,materials.fabric,gun);
  }else if(kind==='shotgun'){
    box(x,y-.067,barrelZ+.22,.19,.115,.65,materials.fabric,gun);
    for(const zz of [-.85,-.75,-.65,-.55])box(x,y-.035,zz,.2,.025,.023,iron,gun);
    box(x,y-.22,z+.22,.1,.24,.13,poly,gun);
  }else if(kind==='smg'){
    box(x,y+.13,z-.14,.22,.10,.34,materials.fabric,gun);
    box(x,y-.23,z+.05,.11,.36,.13,poly,gun);
    box(x,y-.13,z+.40,.18,.10,.36,steel,gun);
  }else if(kind==='physics'){
    box(x,y+.15,z-.15,.33,.16,.42,materials.black,gun);
    for(const side of [-1,1]){
      const rail=box(x+side*.16,y-.03,z-.25,.035,.16,.74,materials.teal,gun);
      rail.rotation.x=.06;
      const tip=mesh(sphere,materials.teal,gun);
      tip.position.set(x+side*.15,y-.005,barrelZ-.01);tip.scale.setScalar(.07);
    }
  }else if(kind==='grenade'){
    const pod=mesh(round,materials.steel,gun);
    pod.position.set(x,y, -.59);pod.scale.set(.15,.21,.16);
    const ring=mesh(new THREE.TorusGeometry(.05,.012,8,13),materials.orange,gun);
    ring.position.set(x+.08,y+.23,-.57);
  }else{
    box(x,y+.1,z-.08,.16,.08,.42,steel,gun);
    box(x,y-.19,z+.13,.12,.3,.12,poly,gun);
    box(x,y-.03,z+.28,.18,.10,.13,iron,gun);
  }
  // First-person hand mesh keeps the weapon visually grounded.
  const hand=mesh(round,materials.skin,gun);
  hand.position.set(x+.01,y-.18,z+.16);hand.scale.set(.11,.17,.11);
  const wrist=mesh(cylinder,materials.fabric,gun);
  wrist.position.set(x+.02,y-.34,z+.24);wrist.scale.set(.115,.2,.11);
  const muzzle=mesh(new THREE.ConeGeometry(long?.11:.08,long?.24:.18,8),
   new THREE.MeshBasicMaterial({color:0xffd98e,transparent:true,opacity:.85,depthWrite:false}),gun);
  muzzle.rotation.x=-Math.PI/2;muzzle.position.set(x,y+.01,barrelZ-.15);muzzle.visible=false;muzzleFlash=muzzle;
  muzzleLight=new THREE.PointLight(0xffca80,0,4,2);muzzleLight.position.copy(muzzle.position);gun.add(muzzleLight);
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
  makeGun(name);
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
  const beforePhysics=d.physics;
  addTrauma(d,damage,index,kind);
  d.bleed=Math.min(9,d.bleed+damage*.018*bleedScale);
  // Blast shockwaves can actually knock someone down; normal rounds cannot.
  if(kind==='ESPLOSIONE' && damage>22 && !d.physics){
    d.physics=true;
  }
  if(d.physics){
    // When incapacitation activates ragdoll, start from the current pose.
    if(!beforePhysics)d.prev.forEach((prev,i)=>prev.copy(d.points[i]));
    impulse(d,index,kind==='ESPLOSIONE'?Math.min(force,190):Math.min(force,125),dir,kind==='ESPLOSIONE');
  }else{
    registerHitReaction(d,index,dir,damage);
  }
  bloodBurst(point,dir,Math.min(13,Math.ceil(damage/8)+2));
  premium.onImpact(d,point,damage);
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
  recoil=Math.min(.18,recoil+(tool==='sniper'?.14:tool==='shotgun'?.12:tool==='rifle'?.045:.055));
  muzzleAge=.065;if(muzzleFlash)muzzleFlash.visible=tool!=='grenade';
  if(muzzleLight)muzzleLight.intensity=tool==='grenade'?0:7;
  const baseDir=camera.getWorldDirection(V()),start=camera.position.clone().addScaledVector(baseDir,.5);
  playSound(weapon.sound,tool==='grenade'?.16:.095,tool==='shotgun'?.11:.068);
  shake=(tool==='sniper'||tool==='shotgun')?.05:.019;
  if(tool==='grenade'){
    const hit=rayTarget(80);
    const pos=hit?hit.point.clone():camera.position.clone().addScaledVector(baseDir,10);
    tracer(start,pos,tool);premium.onShot(tool,hit,pos,baseDir);detonate(pos,baseDir);updateHud(hit?.d);return;
  }
  let target=null;
  for(let i=0;i<weapon.pellets;i++){
    const dir=shotRay({x:(Math.random()-.5)*weapon.spread*2,y:(Math.random()-.5)*weapon.spread*2});
    const hit=rayTarget(80,dir);
    const point=hit?hit.point.clone():camera.position.clone().addScaledVector(dir,56);
    if(i===0||tool==='shotgun'&&i%2===0)tracer(start,point,tool);
    if(i===0)premium.onShot(tool,hit,point,dir);
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
  $('#targetState').textContent=d?(d.life<=0?'SISTEMA NON OPERATIVO':d.blood<40?'EMORRAGIA CRITICA':d.physics?'FISICA ATTIVA':'BERSAGLIO STABILE'):'NESSUN BERSAGLIO';
  hudHealth.style.width=health+'%';
  $('#mode').textContent=mode==='zombies'?'ONDATA '+wave+' / '+score:mode==='tower'?'TEST VERTICALE':'SANDBOX';
  if(!d)return;
  $('#medState').textContent=d.life<=0?'PRIVO DI VITALITÀ':d.life<35?'CRITICO':d.bleed>2?'EMORRAGIA':'STABILE';
  $('#medBlood').textContent=d.blood.toFixed(1)+'%';
  $('#bloodMeter').style.width=d.blood+'%';
  $('#medBrain').textContent=Math.round(d.organs.brain)+'%';
  $('#medHeart').textContent=Math.round(d.organs.heart)+'%';
  $('#medLungs').textContent=Math.round(d.organs.lungs)+'%';
  $('#medLiver').textContent=Math.round(d.organs.liver)+'%';
  $('#medBleed').textContent=(d.bleed*.7).toFixed(1)+'%/s';
  $('#injuries').textContent=d.injuries.length?d.injuries.join('\n'):'Nessuna lesione rilevata.';
  $('#injuries').style.whiteSpace='pre-line';
  for(const [id,score] of [['xBrain',d.organs.brain],['xHeart',d.organs.heart],['xLungs',d.organs.lungs],['xLiver',d.organs.liver]]){
    const element=$('#'+id);
    if(element)element.classList.toggle('dim',score<35);
  }
}
let hintTimer=0;
function say(t,ms=1800){const el=$('#hint');el.textContent=t;el.classList.add('visible');clearTimeout(hintTimer);hintTimer=setTimeout(()=>el.classList.remove('visible'),ms)}
function startGame(newMode){
  mode=newMode;playing=true;home.style.display='none';overlay.style.display='block';
  $('#rotate').classList.remove('off');buildArena(mode);spawnForMode();changeTool('pistol');
  if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});
}
function reset(){held=null;buildArena(mode);spawnForMode();changeTool('pistol');updateHud()}
function goHome(){playing=false;home.style.display='flex';overlay.style.display='none';$('#rotate').classList.add('off');fireHeld=false;
  if(document.pointerLockElement)document.exitPointerLock();}
$$('.modebtn').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.modebtn').forEach(b=>b.classList.toggle('active',b===btn));
}));
$('#launch').addEventListener('click',()=>startGame($('.modebtn.active').dataset.mode));
$('#reset').addEventListener('click',reset);$('#menu').addEventListener('click',goHome);
$('#medButton').addEventListener('click',()=>{medOpen=!medOpen;$('#medical').classList.toggle('open',medOpen);updateHud(rayTarget(75)?.d);});
$('#medClose').addEventListener('click',()=>{medOpen=false;$('#medical').classList.remove('open')});
$('#xrButton').addEventListener('click',()=>{xrOn=!xrOn;$('#xrOverlay').classList.toggle('on',xrOn);$('#xrButton').style.color=xrOn?'#85f7e1':'';for(const m of [materials.dummy,materials.enemy]){m.transparent=xrOn;m.opacity=xrOn?.24:1;m.needsUpdate=true;}say(xrOn?'Organi 3D visibili':'Visualizzazione RX disattivata',1200);});
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
  recoil*=.82;
  gun.position.z=recoil*.85;
  gun.position.y=-recoil*.35;
  gun.rotation.x=-recoil*.9+Math.sin(performance.now()*.0021)*.005;
  gun.rotation.z=Math.sin(performance.now()*.003)*.014;
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
    d.facing=Math.atan2(dx,dz);
    d.hasWalk=len>1.05;
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
    if(muzzleAge>0){muzzleAge-=dt;if(muzzleAge<=0){if(muzzleFlash)muzzleFlash.visible=false;if(muzzleLight)muzzleLight.intensity=0;}}
    movePlayer(dt);
    if(fireHeld&&weapons[tool]?.automatic)action();
    currentRay();
    if(held&&held.d){ // Keep grab target at the original distance while looking around
      if(!held.d.alive&&mode==='zombies')held=null;
    }
    updateEnemies(dt,time);
    for(const d of dummies){
      animateLiving(d,time);simulate(d,dt);medicalTick(d,dt);pose(d);
    }
    updateEffects(dt);
    premium.renderFrame(dt,time);
    if((Math.floor(time/150)%4)===0){
      const target=rayTarget(75);
      if(target&&target.d)updateHud(target.d);
    }
    if(mode==='zombies')updateHud();
  }
  renderer.render(scene,camera);
}
requestAnimationFrame(tick);
