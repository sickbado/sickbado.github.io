/* RAGDOLL LAB — Premium visual and animation layer
 * Original procedural assets. No external models, textures or copyrighted game resources.
 */
export function createPremium({THREE,renderer,scene,world,bodies,effects,materials,camera,mesh,box}) {
  const alive=new Set(), displayScreens=[], fans=[], casings=[], dust=[], splats=[];
  const clock=new THREE.Clock();
  let quality='auto',frameAverage=1/60,slowFrames=0,qualityScale=1,requestedQuality='auto',xray=false;
  const lowQuality=/iPhone|iPad|iPod/.test(navigator.userAgent) && ((window.devicePixelRatio||1)>2);
  const vector=()=>new THREE.Vector3();
  const clamp=THREE.MathUtils.clamp;
  const sharedCylinder=new THREE.CylinderGeometry(1,1,1,12), round=new THREE.SphereGeometry(1,22,16);
  const plane=new THREE.PlaneGeometry(1,1);
  const palette={
    bone:new THREE.MeshStandardMaterial({color:0xdbcfb4,roughness:.7}),
    suit:new THREE.MeshStandardMaterial({color:0x4b626d,roughness:.9}),
    ceramic:new THREE.MeshStandardMaterial({color:0x98afb1,roughness:.46,metalness:.22}),
    gold:new THREE.MeshStandardMaterial({color:0xe0ad6b,roughness:.38,metalness:.64}),
    pipe:new THREE.MeshStandardMaterial({color:0x374a53,roughness:.46,metalness:.73}),
    concrete:new THREE.MeshStandardMaterial({color:0x536069,roughness:.94}),
    hazard:new THREE.MeshStandardMaterial({color:0xd8a949,roughness:.67,metalness:.12}),
    emissive:new THREE.MeshBasicMaterial({color:0xa6ecff}),
    light:new THREE.MeshBasicMaterial({color:0xcef9e9}),
    broken:new THREE.MeshBasicMaterial({color:0x15252d,side:THREE.DoubleSide}),
    shell:new THREE.MeshStandardMaterial({color:0xb7a074,metalness:.82,roughness:.23}),
    darkGlass:new THREE.MeshPhysicalMaterial({color:0x335769,metalness:.1,roughness:.19,transmission:.15,transparent:true,opacity:.65}),
    soot:new THREE.MeshBasicMaterial({color:0x141a1d,transparent:true,opacity:.73,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide}),
    smoke:new THREE.MeshBasicMaterial({color:0xadb1b4,transparent:true,opacity:.13,depthWrite:false}),
    floorShadow:new THREE.MeshBasicMaterial({color:0x050e13,transparent:true,opacity:.18,depthWrite:false}),
  };
  function shape(material,geometry,parent=world){const o=new THREE.Mesh(geometry,material);o.receiveShadow=true;o.castShadow=false;parent.add(o);return o}
  function mb(parent,x,y,z,w,h,d,mat=palette.pipe){
    const m=shape(mat,new THREE.BoxGeometry(1,1,1),parent);
    m.position.set(x,y,z);m.scale.set(w,h,d);return m;
  }
  function tube(parent,p1,p2,r=0.045,mat=palette.pipe) {
    const a=new THREE.Vector3(...p1),b=new THREE.Vector3(...p2);
    const o=shape(mat,sharedCylinder,parent);
    o.position.copy(a).add(b).multiplyScalar(.5);
    o.scale.set(r,a.distanceTo(b),r);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
    return o;
  }
  function canvasPanel(label,sub,accent='#72cdbf',w=512,h=256){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const cx=canvas.getContext('2d');cx.fillStyle='#07171d';cx.fillRect(0,0,w,h);
    cx.fillStyle='#0c2c34';cx.fillRect(16,16,w-32,h-32);
    cx.strokeStyle=accent;cx.lineWidth=3;cx.strokeRect(18,18,w-36,h-36);
    cx.fillStyle=accent;cx.font='bold 32px monospace';cx.fillText(label,38,72);
    cx.fillStyle='#a5d2d4';cx.font='19px monospace';cx.fillText(sub,38,108);
    cx.fillStyle=accent;cx.globalAlpha=.65;
    for(let i=0;i<14;i++){
      cx.fillRect(37+i*30,180+Math.sin(i*1.14)*15,20,22+Math.sin(i*2.8)*15);
    }
    cx.globalAlpha=.4;cx.strokeStyle='#5c94a4';
    for(let y=120;y<180;y+=12){
      cx.beginPath();cx.moveTo(38,y);cx.lineTo(w-38,y);cx.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    return texture;
  }
  const displayTextures=[
    canvasPanel('LAB // 01','BIOMECHANICS · ANALYSIS'),
    canvasPanel('SYSTEM ACTIVE','HUMAN BIOMONITORING'),
    canvasPanel('SCAN / ONLINE','VITALS AND TRAUMA')
  ];
  function screen(root,x,y,z,w,h,labelIndex,angle=0){
    const g=new THREE.Group();root.add(g);g.position.set(x,y,z);g.rotation.y=angle;
    mb(g,0,0,0,w+.12,h+.12,.09,materials.black);
    const p=shape(new THREE.MeshBasicMaterial({map:displayTextures[labelIndex%3]}),plane,g);
    p.position.z=.058;p.scale.set(w,h,1);
    const led=shape(palette.emissive,new THREE.SphereGeometry(1,8,6),g);
    led.position.set(w*.45,-h*.45,.065);led.scale.setScalar(.013);
    displayScreens.push({g,led,phase:labelIndex});
    return g;
  }
  function addArena(mode){
    displayScreens.length=0;fans.length=0;
    const lab=new THREE.Group();world.add(lab);
    // Ceiling air vents and suspended cable trunking make the room read as a real lab.
    for(const z of [-11,-2,7,12]){
      const vent=mb(lab,0,7.82,z,3.8,.10,1.10,materials.black);
      for(let n=-5;n<=5;n++) mb(lab,n*.30,7.73,z,.07,.03,.87,palette.ceramic);
      const fan=new THREE.Group();lab.add(fan);fan.position.set(0,7.70,z);
      for(let n=0;n<4;n++){
        const blade=mb(fan,.43,0,0,.8,.025,.22,palette.pipe);
        blade.rotation.y=n*Math.PI/2;
        blade.position.set(Math.sin(blade.rotation.y)*.40,0,Math.cos(blade.rotation.y)*.40);
      }
      fans.push({fan,phase:z});
    }
    // Large labeled compartment doors with realistic frame and signage.
    for(const x of [-11.4,11.4]){
      for(let z of [-13,6]){
        const door=new THREE.Group();lab.add(door);door.position.set(x,0,z);door.rotation.y=x<0?Math.PI/2:-Math.PI/2;
        mb(door,0,1.85,0,2.25,3.7,.13,palette.pipe);
        mb(door,0,1.86,.09,1.97,3.46,.035,materials.wall2);
        mb(door,-.65,1.86,.116,.32,1.12,.02,materials.darkGlass||palette.darkGlass);
        mb(door,.68,1.60,.14,.07,.27,.08,palette.ceramic);
        mb(door,0,3.82,0,2.25,.16,.35,palette.ceramic);
        const tri=shape(palette.hazard,new THREE.ConeGeometry(.1,.2,3),door);
        tri.rotation.z=Math.PI;tri.position.set(.54,2.25,.137);
      }
    }
    // Equipment: stainless trays, microscopes, glass jars, overhead camera units.
    for(const [xx,zz] of [[-9,-6],[8,-6],[-9,5],[8,5]]){
      const desk=new THREE.Group();lab.add(desk);desk.position.set(xx,0,zz);
      mb(desk,0,.89,0,3.0,.10,1.28,palette.ceramic);
      mb(desk,0,.77,-.48,2.7,.05,.08,palette.pipe);
      for(const sx of [-1.32,1.32])for(const sz of [-.50,.50])mb(desk,sx,.45,sz,.10,.85,.10,palette.pipe);
      screen(desk,-.7,1.51,-.21,1.04,.62,xx<0?1:0);
      mb(desk,-.7,1.16,-.30,.08,.33,.09,palette.pipe);
      mb(desk,.67,1.00,0,.48,.04,.56,palette.ceramic);
      for(let q=0;q<3;q++){
        const sample=shape(palette.darkGlass,new THREE.CylinderGeometry(.11,.10,.42,12),desk);
        sample.position.set(.29+q*.32,1.14,-.31);
        const cap=shape(palette.ceramic,new THREE.CylinderGeometry(.105,.105,.07,12),desk);
        cap.position.set(sample.position.x,1.37,sample.position.z);
      }
    }
    // Floor labels and inset barriers.
    for(let x=-12;x<=12;x+=6){
      const panel=new THREE.Group();lab.add(panel);
      panel.position.set(x,.016,-14.6);panel.rotation.x=-Math.PI/2;
      const stamp=shape(new THREE.MeshBasicMaterial({map:displayTextures[(x+12)/6%3],transparent:true,opacity:.18,depthWrite:false}),plane,panel);
      stamp.scale.set(2.0,.82,1);
    }
    // Additional close-range measuring equipment around manikins.
    for(let i=0;i<3;i++){
      const x=[-5.7,0,5.7][i], z=[-4.9,-6.5,-8.4][i];
      tube(lab,[x-.72,.45,z],[x-.72,2.32,z],.048,palette.ceramic);
      tube(lab,[x+.72,.45,z],[x+.72,2.32,z],.048,palette.ceramic);
      tube(lab,[x-.72,2.32,z],[x+.72,2.32,z],.052,palette.ceramic);
      const led=shape(palette.light,new THREE.BoxGeometry(.95,.036,.055),lab);
      led.position.set(x,2.30,z);
      const plate=mb(lab,x,.055,z,1.7,.08,1.15,materials.black);
      mb(lab,x,.101,z,1.55,.017,1.0,palette.ceramic);
    }
    if(mode==='tower'){
      // Measurement marks and fall-height boards.
      for(let level=0;level<17;level++){
        const color=level%5===0?palette.hazard:palette.ceramic;
        const pole=mb(lab,-3.27,level+.2,-8,.16,.035,.7,color);
      }
      screen(lab,-8,1.8,-6,2.2,1.26,2,Math.PI/2);
    }else if(mode==='zombies'){
      for(const x of [-11.5,-7.2,7.2,11.5]){
        const red=new THREE.PointLight(0xe3454f,5,8,2);red.position.set(x,4,-13.9);
        lab.add(red);
      }
    }
    return lab;
  }
  // Better human-shaped organic cross-sections instead of scaled spheres.
  // Meshes are smooth-shaded and react to the dynamic ragdoll joints.
  function lathe(profile,segments=20){
    return new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),segments);
  }
  const torsoShape=lathe([[.02,-.40],[.205,-.385],[.27,-.30],[.28,-.20],[.24,-.08],[.29,.055],
    [.34,.20],[.325,.31],[.19,.395],[.02,.412]],28);
  const pelvisShape=lathe([[.03,-.18],[.19,-.18],[.265,-.10],[.275,.07],[.205,.18],[.02,.19]],24);
  const organicLimb=new THREE.CylinderGeometry(.81,1,1,18);
  const organicHead=new THREE.SphereGeometry(1,26,19);
  const cheekShape=new THREE.SphereGeometry(1,15,11);
  const smallCap=new THREE.CapsuleGeometry(1,1,5,12);
  function enhanceDummy(d){
    d.torso.geometry=torsoShape;
    d.torso.scale.set(1,1,.64);
    d.pelvis.geometry=pelvisShape;
    d.pelvis.scale.set(1,.9,.74);
    d.head.geometry=organicHead;
    d.head.scale.set(.203,.267,.19);
    d.details=new THREE.Group();bodies.add(d.details);
    d.detailsParts=[];
    // Lightweight anatomical skeleton visible only in the medical radiography mode.
    d.skeletonPieces=[];
    const boneSegments=[
      [0,1,.045],[1,2,.048],[2,3,.055],
      [2,4,.037],[4,5,.031],[5,6,.021],
      [2,7,.037],[7,8,.031],[8,9,.021],
      [3,10,.051],[10,11,.038],[11,12,.03],
      [3,13,.051],[13,14,.038],[14,15,.03]
    ];
    for(const [a,b,radius] of boneSegments){
      const m=shape(palette.bone,sharedCylinder,bodies);
      m.visible=xray;
      d.skeletonPieces.push({a,b,radius,m});
    }
    d.skull=shape(palette.bone,organicHead,bodies);
    d.skull.scale.set(.155,.21,.155);d.skull.visible=xray;
    d.ribCage=new THREE.Group();bodies.add(d.ribCage);
    for(let rib=0;rib<6;rib++){
      const ring=shape(palette.bone,new THREE.TorusGeometry(.19+rib*.012,.013,6,18),d.ribCage);
      ring.scale.set(1.23,.80,1);
      ring.rotation.x=Math.PI/2;
      ring.position.y=.11-rib*.08;
    }
    d.ribCage.visible=xray;

    // Suit detailing moves with torso.
    const chest=new THREE.Group();d.details.add(chest);d.detailsParts.push({anchor:'chest',g:chest});
    mb(chest,-.21,.12,.193,.055,.18,.015,palette.ceramic);
    mb(chest,.17,.11,.195,.095,.12,.017,palette.hazard);
    mb(chest,0,-.09,.193,.014,.44,.015,materials.black);
    mb(chest,-.23,-.16,.175,.085,.1,.018,materials.black);
    mb(chest,.22,-.14,.178,.085,.1,.018,materials.black);
    // Soft collar and cheek structure, knee pads.
    const neck=shape(d.skin,smallCap,d.details);
    neck.scale.set(.095,.08,.093);
    d.detailsParts.push({anchor:'neck',g:neck});
    for(const [idx,side] of [[11,-1],[14,1]]){
      const pad=shape(palette.ceramic,cheekShape,d.details);
      pad.scale.set(.125,.12,.09);
      d.detailsParts.push({anchor:idx,g:pad});
    }
    // A pair of animated eyes blink asynchronously without full facial rig.
    d.blinkPhase=Math.random()*4;
    d.blinkAt=Math.random()*7;
    // Tiny fabric wrinkle and wound shadows are attached to the mesh.
    for(const limb of d.parts){
      limb.m.geometry=organicLimb;
      limb.m.castShadow=false;
      limb.m.material.flatShading=false;
    }
    // One shadow-casting mesh per character is sufficient for mobile.
    d.torso.castShadow=true;
    d.head.castShadow=true;
  }
  function updateDummy(d,time){
    if(!d.detailsParts)return;
    const up=new THREE.Vector3(0,1,0);
    const spine=d.points[1].clone().sub(d.points[3]);
    if(spine.lengthSq()<.001)spine.set(0,1,0);
    const spineQ=new THREE.Quaternion().setFromUnitVectors(up,spine.normalize());
    d.torso.quaternion.copy(spineQ);
    d.pelvis.quaternion.copy(spineQ);
    if(d.skeletonPieces){
      const up=new THREE.Vector3(0,1,0);
      for(const b of d.skeletonPieces){
        const a=d.points[b.a],c=d.points[b.b],between=c.clone().sub(a),length=Math.max(.005,between.length());
        b.m.visible=xray;
        b.m.position.copy(a).add(c).multiplyScalar(.5);
        b.m.scale.set(b.radius,length,b.radius);
        b.m.quaternion.setFromUnitVectors(up,between.normalize());
      }
      d.skull.position.copy(d.points[0]);d.skull.visible=xray;
      d.ribCage.position.copy(d.torso.position);d.ribCage.quaternion.copy(spineQ);d.ribCage.visible=xray;
    }
    for(const p of d.detailsParts){
      if(p.anchor==='chest'){
        p.g.position.copy(d.torso.position);p.g.quaternion.copy(spineQ);
      }else if(p.anchor==='neck'){
        p.g.position.copy(d.points[1]).lerp(d.points[0],.25);
        p.g.quaternion.copy(spineQ);
      }else{
        p.g.position.copy(d.points[p.anchor]);p.g.quaternion.copy(spineQ);
      }
    }
    if(d.eyes&&d.eyes.length&&d.face){
      // Iris blink: very quick and infrequent.
      const phase=((time*.001+d.blinkPhase)%5.6);
      const blink=phase>5.26?Math.max(.08,1-Math.sin((phase-5.26)/.34*Math.PI)*.94):1;
      for(const eye of d.eyes)eye.scale.y=.024*blink;
    }
  }
  function ejectCasing(type) {
    if(casings.length>28){const old=casings.shift();effects.remove(old.m);}
    const c=shape(palette.shell,sharedCylinder,effects);
    const heavy=type==='sniper'||type==='rifle';
    c.scale.set(heavy?.026:.018,heavy?.095:.07,heavy?.026:.018);
    const pos=new THREE.Vector3(.33,-.20,-.43).applyMatrix4(camera.matrixWorld);
    c.position.copy(pos);
    const dir=new THREE.Vector3(1.3+Math.random()*.8,1.1+Math.random()*.7,-.5-Math.random()).applyQuaternion(camera.quaternion);
    casings.push({m:c,v:dir,age:2.5,r:Math.random()});
  }
  function addBulletMark(position,direction){
    if(splats.length>100){const old=splats.shift();effects.remove(old.mesh);old.mesh.geometry.dispose();}
    const mark=shape(palette.soot,new THREE.CircleGeometry(.045+Math.random()*.04,10),effects);
    mark.position.copy(position);
    mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction.clone().negate());
    mark.position.addScaledVector(direction,-.006);
    splats.push({mesh:mark,age:24});
  }
  function createDust(position,color='smoke',count=5){
    const mat=color==='smoke'?palette.smoke:palette.emissive;
    for(let i=0;i<count && dust.length<65;i++){
      const m=shape(mat,new THREE.SphereGeometry(1,6,5),effects);
      m.scale.setScalar(.03+Math.random()*.11);m.position.copy(position);
      const v=new THREE.Vector3((Math.random()-.5)*1.4,.3+Math.random()*.75,(Math.random()-.5)*1.4);
      dust.push({m,v,age:.35+Math.random()*.55,life:.9});
    }
  }
  function onShot(type,hit,point,dir){
    if(type!=='physics'&&type!=='drop'&&type!=='grenade')ejectCasing(type);
    if(!hit){
      addBulletMark(point,dir);
      createDust(point,'smoke',3);
    }else{
      createDust(point,'smoke',2);
    }
  }
  function onImpact(d,pos,damage){createDust(pos,'smoke',Math.min(6,Math.ceil(damage/20)));}
  function setXray(value){xray=Boolean(value)}
  function applyQuality(name){
    requestedQuality=name;
    quality=name;
    if(name==='alta'){qualityScale=Math.min(1.75,window.devicePixelRatio||1.75);renderer.shadowMap.enabled=true;}
    else if(name==='fluida'){qualityScale=1;renderer.shadowMap.enabled=false;}
    else {qualityScale=Math.min(window.devicePixelRatio||1.5,lowQuality?1.4:1.65);renderer.shadowMap.enabled=true;}
    renderer.setPixelRatio(qualityScale);renderer.setSize(innerWidth,innerHeight);
  }
  function renderFrame(dt,time){
    if(dt<.5){
      frameAverage=frameAverage*.96+dt*.04;
      if(quality==='auto'){
        if(frameAverage>.034)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
        if(slowFrames>130&&qualityScale>1){qualityScale=Math.max(1,qualityScale-.2);renderer.setPixelRatio(qualityScale);renderer.setSize(innerWidth,innerHeight);slowFrames=0}
      }
    }
    for(const f of fans)f.fan.rotation.y+=dt*1.25;
    for(const [i,s] of displayScreens.entries())s.led.material=palette.emissive;
    for(let j=casings.length-1;j>=0;j--){
      const c=casings[j];c.age-=dt;
      c.v.y-=9.8*dt;c.m.position.addScaledVector(c.v,dt);
      c.m.rotation.x+=dt*10;c.m.rotation.z+=dt*9;
      if(c.m.position.y<.035){c.m.position.y=.035;c.v.y*=-.22;c.v.x*=.76;c.v.z*=.76;}
      if(c.age<=0){effects.remove(c.m);casings.splice(j,1);}
    }
    for(let j=dust.length-1;j>=0;j--){
      const p=dust[j];p.age-=dt;p.m.position.addScaledVector(p.v,dt);
      p.v.multiplyScalar(Math.exp(-dt*1.2));
      const a=Math.max(0,p.age/p.life);
      p.m.scale.multiplyScalar(1+dt*.85);
      if(p.age<=0){effects.remove(p.m);p.m.geometry.dispose();dust.splice(j,1)}
    }
    for(let j=splats.length-1;j>=0;j--){
      const s=splats[j];s.age-=dt;if(s.age<0){effects.remove(s.mesh);s.mesh.geometry.dispose();splats.splice(j,1);}
    }
  }
  return {addArena,enhanceDummy,updateDummy,onShot,onImpact,renderFrame,applyQuality,setXray,get quality(){return quality;}};
}