/* ALOHOMORA · REBORN 1.2 — The Living Highlands, Chapter I — mobile 3D vertical slice.
 * Rendering: Babylon.js, animations: GLB (optional) + procedural fallback.
 * Character source: three.js examples Soldier.glb (MIT sample). Geometry/textures
 * created here are original; 3D asset is optional and loaded separately.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), mobile = matchMedia('(pointer: coarse)').matches;
  if (mobile) document.body.classList.add('touch');
  let B = window.BABYLON, engine, scene, cam, sun, ambient, wandLight, sky, enemyRoot, portalCore;
  let phase = 0, startTime = performance.now(), last = performance.now(), effectClock = 0;
  let game = { running:false, ended:false, hp:100, mana:100, spell:0, xp:0, enemyHP:5, shield:0, revealed:false, portalOpen:false, kills:0, pulse:0, vx:0, vz:0, vy:0, airborne:0, yaw:Math.PI, pitch:0, bob:0, torches:[], audio:null };
  let enemy = {x:6,z:-8, alive:true, hp:5, root:null, helper:null, mode:'idle', stun:0, windup:0, cool:3, death:0, anims:[], current:'', modelReady:false, direction:0};
  const spells = [
    {name:'Stupeficium',cost:13,color:'#ec6d5a'},
    {name:'Accio',cost:18,color:'#d8b987'},
    {name:'Lumos',cost:6,color:'#ffe6aa'},
    {name:'Protego',cost:20,color:'#7cc3e9'},
    {name:'Revelio',cost:14,color:'#b4a6eb'}
  ];
  const projectiles=[], fx=[], props=[], colliders=[];
  const world={time:19.15/24,weather:'sereno',rain:null,train:null,actors:[],wild:[],lastZone:'',onTrain:false,trainSeatZ:0,zoneTick:0,
    stationVisited:false,villageVisited:false,forestVisited:false,portalUnsealed:false,dialogues:0,daySpeed:1/840,lastSave:0,locNames:[],timeSinceRain:0};
  const landmarks=[{name:'Hogwarts',x:0,z:-26,icon:'🏰'},{name:'Hogsmeade',x:106,z:28,icon:'✦'},{name:'Foresta Proibita',x:-115,z:82,icon:'♠'},{name:'Stazione',x:143,z:122,icon:'🚂'},{name:'Lago Nero',x:-130,z:-121,icon:'◈'}];
  function saveWorld(){try{localStorage.setItem('alohomora-world-v12',JSON.stringify({time:world.time,quests:{village:world.villageVisited,forest:world.forestVisited,station:world.stationVisited},savedAt:Date.now()}));}catch(e){}}
  function zoneAt(x,z){if(x>66&&z>72)return 'Stazione di Hogsmeade';if(x>62&&z>-35)return 'Hogsmeade · Piazza dei maghi';if(x<-62&&z>15)return 'Foresta Proibita';if(x<-72&&z< -45)return 'Sponde del Lago Nero';if(Math.abs(x)<43&&z<33)return 'Hogwarts · Cortile settentrionale';return 'Le Highlands incantate';}

  const cinematic={pipeline:null,particleTexture:null,shield:null,shieldMat:null,shieldRing:null,shieldLight:null,lamp:null,
    flash:0,flashColor:'#e27054',shake:0,revelioWaves:[],perfTime:0,perfSamples:0,qualityReduced:false};
  const effectiveCount=(n)=>mobile?Math.min(45,Math.round(n*.56)):n;

  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const mix=(a,b,f)=>a+(b-a)*f;
  const distance=(a,b,c,d)=>Math.hypot(a-c,b-d);
  const V = (x,y,z)=>new B.Vector3(x,y,z);
  const rand=(x,y)=> {let k=Math.sin(x*132.71+y*96.28)*43758.5453;return k-Math.floor(k)};
  function error(message){const e=$('error');e.textContent=message;e.style.display='block';$('load').textContent='Problema tecnico · '+message;}
  function toast(message,seconds=2.7){$('toast').textContent=message;$('toast').classList.add('show');game.toastTimeout=seconds;}
  function audio(freq=330,duration=.19,mode='sine',volume=.038){try{const c=game.audio;if(!c)return;const osc=c.createOscillator(),gain=c.createGain(),t=c.currentTime;osc.type=mode;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.56),t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain).connect(c.destination);osc.start();osc.stop(t+duration+.02)}catch(e){}}
  function magicAudio(kind){
    const c=game.audio;if(!c)return;try{
      const t=c.currentTime,config={cast:[145,.37,.065],impact:[88,.26,.092],shield:[335,.47,.05],lumos:[570,.72,.024],revelio:[195,.86,.040],accio:[260,.46,.042]}[kind]||[250,.24,.035];
      const [f,d,v]=config;const carrier=c.createOscillator(),shimmer=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
      carrier.type=kind==='impact'?'sawtooth':'triangle';shimmer.type='sine';filter.type='lowpass';filter.frequency.setValueAtTime(kind==='impact'?1800:2500,t);
      carrier.frequency.setValueAtTime(f,t);carrier.frequency.exponentialRampToValueAtTime(f*(kind==='cast'?3.6:kind==='revelio'?2.8:.58),t+d);
      shimmer.frequency.setValueAtTime(f*2.9,t);shimmer.frequency.exponentialRampToValueAtTime(f*.91,t+d);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(v,t+.035);gain.gain.exponentialRampToValueAtTime(.0001,t+d);
      carrier.connect(filter);shimmer.connect(filter);filter.connect(gain);gain.connect(c.destination);
      carrier.start(t);shimmer.start(t);carrier.stop(t+d+.03);shimmer.stop(t+d+.03);
    }catch(e){}
  }
  function flash(color='#e47568',strength=.27){cinematic.flash=Math.min(.72,strength);cinematic.flashColor=color;cinematic.shake=Math.max(cinematic.shake,strength*.10);}
  function magicParticleTexture(){
    if(cinematic.particleTexture)return cinematic.particleTexture;
    const t=new B.DynamicTexture('soft spell particle',{width:64,height:64},scene,false);
    const c=t.getContext(),g=c.createRadialGradient(32,32,1,32,32,32);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.17,'rgba(255,255,255,.96)');
    g.addColorStop(.42,'rgba(255,255,255,.38)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.clearRect(0,0,64,64);c.fillStyle=g;c.fillRect(0,0,64,64);t.hasAlpha=true;t.update(false);
    cinematic.particleTexture=t;return t;
  }
  function particleBurst(at,hex,count=45,power=2.8){
    if(!scene)return;
    const ps=new B.ParticleSystem('impact sparks',Math.max(12,effectiveCount(count)),scene);
    ps.particleTexture=magicParticleTexture();ps.emitter=at.clone();
    const tint=B.Color3.FromHexString(hex);
    ps.color1=new B.Color4(tint.r,tint.g,tint.b,1);ps.color2=new B.Color4(Math.min(1,tint.r*1.35),Math.min(1,tint.g*1.3),Math.min(1,tint.b*1.25),.92);ps.colorDead=new B.Color4(tint.r*.24,tint.g*.24,tint.b*.24,0);
    ps.minSize=.055;ps.maxSize=.25;ps.minLifeTime=.22;ps.maxLifeTime=.76;
    ps.minEmitPower=power*.35;ps.maxEmitPower=power*1.55;
    ps.direction1=V(-1,-.20,-1);ps.direction2=V(1,1.1,1);ps.gravity=V(0,-3,0);
    ps.manualEmitCount=effectiveCount(count);ps.emitRate=0;ps.blendMode=B.ParticleSystem.BLENDMODE_ONEONE;
    ps.start();setTimeout(()=>{ps.stop();setTimeout(()=>ps.dispose(),1000)},150);
  }
  function magicImpact(at,hex,scale=1){
    particleBurst(at,hex,scale>1?75:40,2.5*scale);flash(hex,Math.min(.4,.18*scale));magicAudio('impact');
    const m=glowy(hex);m.alpha=.55;m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;m.backFaceCulling=false;
    const r=B.MeshBuilder.CreateTorus('expanding magic ring',{diameter:.35,thickness:.055,tessellation:32},scene);
    r.material=m;r.position.copyFrom(at);r.rotation.x=Math.PI/2;
    const light=new B.PointLight('impact illumination',at.clone(),scene);light.diffuse=B.Color3.FromHexString(hex);light.intensity=mobile?.65:1.6;light.range=scale>1?9:6;
    fx.push({kind:'shock',mesh:r,mat:m,light,life:.36,total:.36,scale});
  }
  function magicWave(at,hex,diameter=1,speed=7){
    const m=glowy(hex);m.alpha=.56;m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;m.backFaceCulling=false;
    const r=B.MeshBuilder.CreateTorus('revelio expanding rune',{diameter,thickness:.09,tessellation:64},scene);
    r.position.copyFrom(at);r.rotation.x=Math.PI/2;r.material=m;
    fx.push({kind:'wave',mesh:r,mat:m,life:1.55,total:1.55,speed});
    particleBurst(at,hex,70,1.25);
  }
  function setupCinematic(){
    magicParticleTexture();
    try{
      const pipe=new B.DefaultRenderingPipeline('cinematic magic',true,scene,[cam]);
      pipe.samples=1;pipe.fxaaEnabled=!mobile;pipe.bloomEnabled=true;
      pipe.bloomThreshold=.69;pipe.bloomWeight=mobile?.23:.33;pipe.bloomKernel=mobile?32:64;pipe.bloomScale=.5;
      cinematic.pipeline=pipe;
    }catch(e){console.warn('Bloom non disponibile, render di riserva attivo:',e.message);}
  }
  function setupProtego(){
    const m=glowy('#4baccd');m.alpha=.12;m.backFaceCulling=false;
    m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;m.disableDepthWrite=true;
    const dome=B.MeshBuilder.CreateSphere('Protego translucent arc',{diameter:2.55,segments:18},scene);
    dome.parent=cam;dome.position.set(0,-.06,1.75);dome.scaling.set(1.24,1.04,.67);dome.material=m;dome.isPickable=false;dome.setEnabled(false);
    const rim=glowy('#8dcde6');rim.alpha=.44;rim.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
    const ring=B.MeshBuilder.CreateTorus('Protego sigil border',{diameter:2.45,thickness:.029,tessellation:48},scene);
    ring.parent=dome;ring.rotation.x=Math.PI/2;ring.material=rim;
    cinematic.shield=dome;cinematic.shieldMat=m;cinematic.shieldRing=ring;
    const light=new B.PointLight('Protego defensive light',V(0,0,2),scene);light.parent=cam;light.diffuse=B.Color3.FromHexString('#5faaca');light.intensity=0;light.range=6;cinematic.shieldLight=light;
  }
  function newTrail(host,hex){
    const ps=new B.ParticleSystem('fast spell comet trail',mobile?64:160,scene);ps.particleTexture=magicParticleTexture();ps.emitter=host;
    const c=B.Color3.FromHexString(hex);ps.color1=new B.Color4(c.r,c.g,c.b,.94);ps.color2=new B.Color4(c.r,Math.min(1,c.g*1.35),Math.min(1,c.b*1.2),.52);
    ps.colorDead=new B.Color4(c.r*.5,c.g*.2,c.b*.3,0);
    ps.minSize=.09;ps.maxSize=mobile?.24:.34;ps.minLifeTime=.12;ps.maxLifeTime=.36;
    ps.emitRate=mobile?95:185;ps.minEmitPower=.03;ps.maxEmitPower=.5;ps.direction1=V(-.4,-.3,-.4);ps.direction2=V(.4,.3,.4);ps.blendMode=B.ParticleSystem.BLENDMODE_ONEONE;ps.start();return ps;
  }
  function deleteProjectile(p){p.trail?.stop();p.trail?.dispose();p.mesh.dispose();p.light.dispose();}
  function updateCinematic(dt){
    if(cinematic.flash>0){cinematic.flash=Math.max(0,cinematic.flash-dt*1.9);const el=$('magicFlash');if(el){el.style.background=`radial-gradient(ellipse at 52% 51%,transparent 12%,${cinematic.flashColor}75 130%)`;el.style.opacity=String(cinemaClamp(cinematic.flash*.85));}}
    else if($('magicFlash'))$('magicFlash').style.opacity='0';
    cinematic.shake=Math.max(0,cinematic.shake-dt*.5);
    if(cinematic.shield){const enabled=game.running&&game.shield>0;cinematic.shield.setEnabled(enabled);
      if(enabled){const pulse=.10+.038*Math.sin(phase*13);cinematic.shieldMat.alpha=pulse;cinematic.shield.rotation.y+=dt*.3;
        cinematic.shieldRing.scaling.setAll(1+.032*Math.sin(phase*8));cinematic.shieldLight.intensity=.55+.23*Math.sin(phase*12);}
      else cinematic.shieldLight.intensity=0;
    }
    if(cinematic.lamp){cinematic.lamp.setEnabled(!!game.lumos&&game.running);cinematic.lamp.scaling.setAll(.80+.14*Math.sin(phase*4));}
    if(game.lumos&&game.running)wandLight.intensity=2.6+.23*Math.sin(phase*7);
    if(game.running&&cinematic.shake>.002){cam.rotation.y+=(Math.sin(phase*65)*cinematic.shake*.03);cam.rotation.x+=(Math.cos(phase*47)*cinematic.shake*.03);}
    cinematic.perfTime+=dt;cinematic.perfSamples++;
    if(mobile&&!cinematic.qualityReduced&&cinematic.perfTime>9){
      const fps=engine.getFps();if(fps>0&&fps<23){cinematic.qualityReduced=true;
        if(cinematic.pipeline)cinematic.pipeline.bloomEnabled=false;
        engine.setHardwareScalingLevel(1.35);console.info('Alohomora: mode mobile adattivo attivato',fps);}
      cinematic.perfTime=0;
    }
  }
  function cinemaClamp(v){return Math.max(0,Math.min(.72,v));}
  function material(name,rgb,opt={}){const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(rgb);m.specularColor=B.Color3.FromHexString(opt.spec||'#171819');m.specularPower=opt.shine||22;if(opt.emissive)m.emissiveColor=B.Color3.FromHexString(opt.emissive);if(opt.alpha!==undefined){m.alpha=opt.alpha; if(opt.alpha<1){m.transparencyMode=B.Material.MATERIAL_ALPHABLEND;m.needDepthPrePass=true}}if(opt.back)m.backFaceCulling=false;return m;}
  function noiseTexture(name,baseA,baseB,kind='grass'){
    const tex = new B.DynamicTexture(name,{width:512,height:512},scene,false,B.Texture.TRILINEAR_SAMPLINGMODE);const ctx=tex.getContext();
    ctx.fillStyle=baseA;ctx.fillRect(0,0,512,512);
    if(kind==='stone'){
      for(let y=0;y<512;y+=64){const offset=(y/64%2)*56;for(let x=-120;x<570;x+=112){let xx=x+offset;ctx.fillStyle=rand(xx,y)>.5?baseB:baseA;ctx.fillRect(xx+2,y+2,108,59);ctx.strokeStyle='rgba(15,21,29,.28)';ctx.lineWidth=4;ctx.strokeRect(xx+2,y+2,108,59);for(let k=0;k<14;k++){let tx=xx+rand(k,y)*112,ty=y+rand(k+22,y)*64;ctx.fillStyle=rand(tx,ty)>.5?'#f4ebd510':'#00000013';ctx.fillRect(tx,ty,3+rand(k,tx)*6,2+rand(k,ty)*4);}}}
    }else{for(let i=0;i<15000;i++){let x=rand(i,19)*512,y=rand(i,77)*512;ctx.fillStyle=rand(i,3)>.49?'rgba(220,200,154,.11)':'rgba(4,10,12,.17)';ctx.fillRect(x,y,1+rand(i,5)*3,2+rand(i,6)*4)} }
    tex.update(false);tex.wrapU=B.Texture.WRAP_ADDRESSMODE;tex.wrapV=B.Texture.WRAP_ADDRESSMODE;return tex;
  }
  function box(n,w,h,d,x,y,z,mat,opts={}){const m=B.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=mat;m.isPickable=false;if(opts.shadow)m.receiveShadows=true;if(opts.collision)colliders.push({x,z,w,d});return m;}
  function cylinder(n,t,b,h,x,y,z,mat,seg=10){const m=B.MeshBuilder.CreateCylinder(n,{diameterTop:t,diameterBottom:b,height:h,tessellation:seg},scene);m.position.set(x,y,z);m.material=mat;m.isPickable=false;return m;}
  function sphere(n,diam,x,y,z,mat,seg=10){const m=B.MeshBuilder.CreateSphere(n,{diameter:diam,segments:seg},scene);m.position.set(x,y,z);m.material=mat;m.isPickable=false;return m;}
  function tube(n,from,to,r,mat,seg=8){const diff=to.subtract(from),len=diff.length();const m=B.MeshBuilder.CreateCylinder(n,{height:len,diameter:r*2,tessellation:seg},scene);m.position=from.add(to).scale(.5);const up=V(0,1,0),axis=B.Vector3.Cross(up,diff).normalize();const angle=Math.acos(clamp(B.Vector3.Dot(up,diff.normalize()),-1,1));if(axis.lengthSquared()>.0001)m.rotationQuaternion=B.Quaternion.RotationAxis(axis,angle);m.material=mat;return m;}
  function stoneGround(){const stone=material('wet sandstone','#757877',{spec:'#36393d',shine:9});stone.diffuseTexture=noiseTexture('repeated cut stone','#777b78','#83847f','stone');stone.diffuseTexture.uScale=15;stone.diffuseTexture.vScale=15;
    const earth=material('highland ground','#4a5b52',{spec:'#161f1b'});earth.diffuseTexture=noiseTexture('heather and damp moss','#4b5b4e','#64705b');earth.diffuseTexture.uScale=70;earth.diffuseTexture.vScale=70;
    const plane=B.MeshBuilder.CreateGround('Scottish highlands open terrain',{width:570,height:570,subdivisions:2},scene);plane.material=earth;plane.receiveShadows=true;
    const floor=B.MeshBuilder.CreateGround('quadrangle cobbles',{width:49,height:62},scene);floor.position.z=-12;floor.position.y=.035;floor.material=stone;floor.receiveShadows=true;
    const pathMat=material('walkway flagstones','#777c79',{spec:'#2a3034'});const ptex=noiseTexture('mottled stones','#858780','#777b76','stone');ptex.uScale=1.4;ptex.vScale=1.4;pathMat.diffuseTexture=ptex;
    const tile=box('flagstone source',1.26,.12,1.42,0,-1000,0,pathMat);/* source stone remains far outside the playable map; instances stay visible */
    for(let z=22;z>-38;z-=1.35)for(let x=-3.7;x<4.3;x+=1.32){const f=tile.createInstance('weathered paving');f.setEnabled(true);f.position.set(x+(rand(x,z)-.5)*.15,.11,z+(rand(z,x)-.5)*.12);f.rotation.y=(rand(x*9,z*8)-.5)*.08;}
    return {stone,earth};}
  function forest(){const trunk=material('black fir bark','#332d2d'),foliage=material('wet needles','#172f2c'),foliage2=material('north fir','#243b34'),rock=material('slate','#48515a',{spec:'#1b2429'});
    const log=cylinder('instanced log',.20,.30,3,0,-1000,0,trunk);/* source trunk offscreen */
    const leaves=cylinder('instanced fir',0,4.2,8,0,-1000,0,foliage,7);/* source canopy offscreen */
    const leaves2=cylinder('instanced fir b',0,3.5,7,0,-1000,0,foliage2,7);/* source alternate canopy offscreen */
    for(let i=0;i<440;i++){let x=(rand(i,1)*2-1)*268,z=(rand(i,2)*2-1)*268;if((Math.abs(x)<36&&z>-72&&z<48)||(x>77&&x<166&&z>-34&&z<155)||(x<-100&&x>-177&&z< -91))continue;let sy=.8+rand(i,5)*1.5;
      const a=log.createInstance('ancient fir trunk');a.setEnabled(true);a.position.set(x,1.5*sy,z);a.scaling.setAll(sy);
      const b=(i%3===0?leaves2:leaves).createInstance('fir canopy');b.setEnabled(true);b.position.set(x,5.4*sy,z);b.scaling.setAll(sy);
    }
    for(let i=0;i<95;i++){const x=rand(i,66)*430-215,z=rand(i,41)*425-205;if(Math.abs(x)<28&&z<36&&z>-57)continue;const r=sphere('mossy boulder',1.3+rand(i,6)*2,x,.45,z,rock,5);r.scaling.y=.5;r.rotation.y=rand(i,7)*6.2;}
  }
  function architecture(){const stone=material('castle masonry','#4e5458',{spec:'#30373c',shine:16});stone.diffuseTexture=noiseTexture('medieval walls','#6e7375','#777b7e','stone');stone.diffuseTexture.uScale=3;stone.diffuseTexture.vScale=2;
    const slate=material('slate roof','#1b2934',{spec:'#232c32',shine:32});const edge=material('ashlar blocks','#767575',{spec:'#262526'});const iron=material('wrought iron','#161b20',{spec:'#555050'});
    const windows=material('illumined stained glass','#61573f',{emissive:'#9b6940',spec:'#dcaf73',shine:70});const mullion=material('lead tracery','#303335',{spec:'#242325'});
    // Massive keep, main gate and upper gallery. All meshes are real 3D, with relief and layered silhouettes.
    box('great hall facade',59,21,15,0,10.3,-55,stone,{shadow:true});
    box('great hall upper gallery',63,6,17,0,23,-55,stone,{shadow:true});
    box('roof band',66,1.3,19,0,26.8,-55,edge);
    const arch=box('gothic gate opening',8,11,1,0,6,-46.96,iron);
    // pointed arch frame
    box('portal jamb left',1.05,10.2,1.8,-4.7,5.2,-46.5,edge);
    box('portal jamb right',1.05,10.2,1.8,4.7,5.2,-46.5,edge);
    const peak1=box('ogive arch left',7.2,.82,1.8,-2.44,12.0,-46.5,edge);peak1.rotation.z=.65;
    const peak2=box('ogive arch right',7.2,.82,1.8,2.44,12.0,-46.5,edge);peak2.rotation.z=-.65;
    box('portcullis upper',7,1.5,.6,0,9.8,-46.0,iron);
    for(let x=-3;x<=3;x+=.75)box('gate iron rod',.13,8.0,.36,x,5.6,-45.8,iron);
    for(let y=2;y<10;y+=1.4)box('gate cross rod',7.0,.12,.39,0,y,-45.65,iron);
    // Gothic lancets on both wings.
    for(let side of [-1,1])for(let i=0;i<6;i++){
      const x=side*(9.1+i*3.5);if(Math.abs(x)>29)continue;
      for(const y of [6.2,15.5]){
        box('window recess',1.65,4.9,.32,x,y,-46.8,windows);
        box('window vertical divider',.15,5.0,.55,x,y,-46.5,mullion);
        box('window sill',2.15,.25,.7,x,y-2.5,-46.35,edge);
        const a=box('gothic lancet left',1.48,.20,.65,x-.48,y+2.0,-46.3,edge);a.rotation.z=.7;
        const b=box('gothic lancet right',1.48,.20,.65,x+.48,y+2.0,-46.3,edge);b.rotation.z=-.7;
      }
    }
    for(const xx of [-32,-24,24,32]){
      cylinder('fortified tower',9.1,10.3,31,xx,15.5,-55,stone,12);
      cylinder('tower parapet',10.6,10,2,xx,31.9,-55,edge,12);
      const roof=cylinder('high pointed copper roof',0,12,16,xx,40.6,-55,slate,12);
      sphere('tower finial',.8,xx,49.1,-55,edge,8);
      for(let a=0;a<12;a++){let ang=a*Math.PI/6;let px=xx+Math.sin(ang)*5.2,pz=-55+Math.cos(ang)*5.2;box('battlement',1.65,1.4,1.2,px,33.5,pz,edge);}
      for(let k=0;k<3;k++){let y=8+k*7;box('tower glowing slit',1.15,3,.28,xx,y,-49.8,windows);}
    }
    for(let x=-28;x<=28;x+=2.9)box('parapet crenellation',1.7,1.55,2.2,x,28.6,-46.5,edge);
    for(let x=-21;x<=21;x+=7){box('gothic buttress',2.2,16,5.5,x,8,-45.0,edge);box('buttress shoulder',3.1,1.3,6.2,x,16,-45.0,stone);}
    // Long quadrangle arcades and stained-glass chapels along the sides.
    for(const side of [-1,1]){
      const x=side*27;box('quadrangle side wall',3,11.5,68,x,5.75,-12,stone);
      for(let i=0;i<8;i++){
        const z=25-i*7.7;box('flying buttress foot',2.2,8.7,2,x-side*2.8,4.3,z,edge);
        const L=box('arched buttress left',.63,5.2,1.4,x-side*4.2,9.2,z,edge);L.rotation.z=side*.52;
        const R=box('arched buttress right',.63,4.8,1.4,x-side*.8,9.2,z,edge);R.rotation.z=-side*.52;
        box('torch niche',.9,2.5,.3,x-side*1.65,5.4,z,windows);
      }
      for(let i=0;i<34;i++)box('side wall battlement',2.3,1.4,1.3,x,12.1,21-i*1.9,edge);
    }
    // Main courtyard arch made of stone and a luminous magical lock.
    const portalBack=box('sealed portal',6.5,8.8,.25,0,5.0,-45.44,material('void beyond the gate','#0b0b12',{emissive:'#0b0e19'}));
    portalCore=sphere('spell lock',1.85,0,5.2,-44.8,material('magical sigil','#817aae',{emissive:'#6b528b',alpha:.62}),18);
    portalCore.scaling.z=.2;portalCore.setEnabled(false);
    const ring=B.MeshBuilder.CreateTorus('seal iron ring',{diameter:3.5,thickness:.09,tessellation:32},scene);ring.position.set(0,5.2,-44.65);ring.material=material('etched moonstone','#8e847e',{emissive:'#39334e'});ring.rotation.x=Math.PI/2;ring.setEnabled(false);
    game.sealRing=ring;
    // Central duelling dias, cracks and a dry fountain. Symbolic rather than many throwaway houses.
    const marble=material('dark limestone','#42484d',{spec:'#323c43'});
    cylinder('duelling podium',13,14,.65,0,.34,-6,marble,24);
    cylinder('duelling inlay',11.8,11.8,.08,0,.71,-6,edge,28);
    const runeMat=material('rune bronze','#ad8d5f',{emissive:'#4b341d'});
    for(let a=0;a<16;a++){let theta=a*Math.PI/8;const r=sphere('rune marker',.33,Math.cos(theta)*5.36,.82,-6+Math.sin(theta)*5.36,runeMat,8);r.scaling.y=.14;}
    cylinder('sunken fountain base',10,11,1.0,-16,.48,0,stone,16);
    cylinder('dry basin',7.2,8,.22,-16,1.09,0,iron,16);
    for(let a=0;a<8;a++){let u=a*Math.PI/4;sphere('wet carved lion',.65,-16+Math.cos(u)*4,1.25,Math.sin(u)*4,edge,8);}
    for(let i=0;i<17;i++){let x=-23+(i%5)*3,z=15-Math.floor(i/5)*5;let stoneBlock=box('fallen masonry',1.0+.9*rand(i,1),.35+.8*rand(i,2),1.2,x,.45,z,marble);stoneBlock.rotation.y=rand(i,3)*6.28;}
    // Low wall keeps the player in the vertical slice without invisible world edges.
    colliders.push({x:0,z:-55,w:65,d:13});colliders.push({x:-27,z:-12,w:2,d:64});colliders.push({x:27,z:-12,w:2,d:64});
    return {stone,iron,edge,windows};
  }

  // World 1.2: contiguous explorable locations instead of sealed mini-rooms. Geometry is entirely local.
  function worldExpansion(){
    const stone=material('Hogsmeade weathered limestone','#6b6460',{spec:'#45403f'}),roof=material('aged slate gables','#222c35',{spec:'#424750',shine:35});
    const plaster=material('old village plaster','#918477',{spec:'#483f35'}),timber=material('smoked oak beams','#372e2b',{spec:'#4c3932'});
    const windows=material('Hogsmeade glowing windows','#ad7840',{emissive:'#b47735'}),waterMat=material('black lake shallow reflection','#122c33',{spec:'#a4bcc9',shine:110,alpha:.92});
    const track=material('railway black iron','#292f35',{spec:'#979188',shine:90}),sleepers=material('oiled railway timber','#42322b'),platform=material('platform sandstone','#6a6157');
    const path=material('old cobblestone path','#807c75',{spec:'#353e44',shine:18});path.diffuseTexture=noiseTexture('village cobbles','#898781','#77766f','stone');path.diffuseTexture.uScale=16;path.diffuseTexture.vScale=4;
    function linkRoad(a,b,width=6){const mid=V((a[0]+b[0])/2,.058,(a[1]+b[1])/2),len=Math.hypot(b[0]-a[0],b[1]-a[1]);const m=box('historic cobbled causeway',width,.10,len,mid.x,mid.y,mid.z,path);m.rotation.y=-Math.atan2(b[0]-a[0],b[1]-a[1]);return m;}
    linkRoad([0,44],[16,57],7);linkRoad([16,57],[67,55],7);linkRoad([67,55],[104,30],7);linkRoad([108,43],[127,81],6);linkRoad([127,81],[141,123],6);
    linkRoad([0,53],[-50,66],5);linkRoad([-50,66],[-112,86],5);linkRoad([-47,-63],[-115,-115],4);
    for(let j=0;j<18;j++){
      const side=j%2===0?-1:1,row=Math.floor(j/2),x=105+side*(9+row%3*5),z=55-row*11;
      const h=6+rand(j,12)*4.8,w=6+rand(j,16)*2.4,d=7+rand(j,14)*2;
      const wall=j%4===0?plaster:stone;
      box('Hogsmeade inn or shop',w,h,d,x,h/2,z,wall,{shadow:true,collision:true});
      const gable=B.MeshBuilder.CreateCylinder('steep timbered cottage roof',{diameterTop:0,diameterBottom:w*1.45,height:4,tessellation:4},scene);gable.position.set(x,h+1.9,z);gable.rotation.y=Math.PI/4;gable.scaling.z=d/w;gable.material=roof;
      for(let k of [-1,1]){box('cottage timber corners',.24,h,.25,x+k*w*.43,h/2,z+d*.51,timber);box('amber glass cottage window',1.0,1.55,.13,x+k*w*.24,h*.60,z+d*.512,windows);}
      box('oak shop door',1.25,2.5,.21,x,1.3,z+d*.52,timber);
      const sign=box('swinging shop sign',2,.8,.14,x+2.1,h*.76,z+d*.55,roof);sign.rotation.y=.08;
      if(j%3===0){const chimney=box('chimney',.95,3.5,1.1,x+w*.31,h+1.4,z-d*.12,stone);chimney.rotation.y=.15;}
      if(j%4===0)lantern(x+side*4,z+side*2);
    }
    // Enchanted square with an actual fountain, market lanterns and market stalls.
    const square=box('village market square',28,.12,30,105,.03,31,path);
    cylinder('village fountain',7.5,8,.8,105,.52,30,stone,16);
    cylinder('village fountain basin',6,7,.42,105,1.07,30,waterMat,18);
    sphere('fountain enchanted orb',1.1,105,3.2,30,material('water spirit','#8ecaca',{emissive:'#316f85'}),16);
    for(let j=0;j<7;j++){const x=92+(j%4)*8,z=61+Math.floor(j/4)*9;
      for(let s of [-1,1])box('market stall post',.2,3.1,.2,x+s*1.8,1.55,z,timber);
      const canopy=box('merchant canopy',4.6,.27,2.5,x,3.1,z,j%2?roof:windows);canopy.rotation.z=j%2?.06:-.04;
      for(let k=0;k<3;k++)box('market potions',.35,.55,.35,x-1+k,.78,z+.3,material('potion bottle'+j+k,k===1?'#567f92':'#7b554e',{emissive:'#1e303a'}));
    }
    // Station: accessible platform, arched entrance, locomotive and tracks from distant valleys.
    const station=box('Hogsmeade station hall',23,10,17,112,5.1,122,stone,{collision:true});
    const stRoof=B.MeshBuilder.CreateCylinder('station sloped slate roof',{diameterTop:0,diameterBottom:26,height:7,tessellation:4},scene);stRoof.rotation.y=Math.PI/4;stRoof.position.set(112,13.2,122);stRoof.scaling.z=.68;stRoof.material=roof;
    for(let j=0;j<5;j++){const x=102+j*5;box('station window glass',2.1,3.6,.2,x,5.0,130.6,windows);}
    box('raised platform',20,.66,96,124,.37,116,platform);
    for(let z=-230;z<266;z+=3.4){box('railway sleeper',7,.26,.48,145,.12,z,sleepers);}
    for(let x of [143.25,146.75])box('railway long running steel rail',.20,.25,510,x,.39,13,track);
    for(let z of [84,140,190])lantern(128,z);
    const train=new B.TransformNode('Hogwarts Express physically moving',scene);
    train.position=V(145,0,180);world.train={root:train,z:180,speed:-9,phase:0,doorsOpen:false};
    const red=material('express red lacquer','#68151a',{spec:'#aa5651',shine:85}),coal=material('coal-black locomotive','#161d23',{spec:'#a0a0a1',shine:85}),gold=material('express brass fittings','#c2a066',{spec:'#eac783',shine:100});
    const child=(name,w,h,d,x,y,z,m)=>{const a=box(name,w,h,d,x,y,z,m);a.parent=train;a.position.set(x,y,z);return a;};
    child('steam locomotive engine boiler',4.6,3.2,10.6,0,2.9,-13,coal);
    child('red express locomotive cab',4.9,4.3,5.5,0,3.3,-5,red);
    for(let i=0;i<2;i++){child('express carriage '+i,5,4.0,17,0,2.7,7+i*18,red);child('carriage slate roof',5.5,.32,17.4,0,4.86,7+i*18,coal);
      for(let z=0;z<6;z++)for(let side of [-1,1])child('express amber carriage window',.1,1.3,1.45,side*2.57,3.2,1+i*18+z*2.5,windows);
    }
    for(let z=-16;z<44;z+=4.9)for(let x of [-2,2]){
      const wheel=cylinder('steel carriage wheel',1.65,1.65,.26,0,0,0,coal,12);wheel.parent=train;wheel.position.set(x,1.03,z);wheel.rotation.z=Math.PI/2;
    }
    const funnel=cylinder('steam funnel',1.25,.9,2.9,0,0,0,coal,10);funnel.parent=train;funnel.position.set(0,5,-16);
    child('locomotive golden numberplate',2.8,.9,.14,0,4.2,-2.15,gold);
    world.train.light=new B.PointLight('express headlight',V(0,3,-20),scene);world.train.light.parent=train;world.train.light.intensity=.75;world.train.light.range=22;
    // Lake with waves, steep banks and a stone bridge looking onto the mountains.
    const shore=box('black lake glassy water',92,.15,108,-136,-.18,-123,waterMat);shore.rotation.y=-.10;
    const moon=material('moonstone','#9ba2aa',{spec:'#c3c7c9',shine:100});
    for(let j=0;j<26;j++){const a=j*Math.PI*2/26,x=-136+Math.sin(a)*49,z=-123+Math.cos(a)*58;
      let rock=sphere('lake shore boulder',1.7+rand(j,75)*4,x,.2,z,stone,6);rock.scaling.y=.33;
    }
    for(let j=0;j<7;j++){let x=-98+j*5;box('old bridge slab',5,.42,3.4,x,.65,-88,moon);for(const zz of [-90,-86])box('bridge wall',5,.75,.22,x,1.10,zz,stone);}
    // Forest standing stones and a secret glade, reachable on foot.
    for(let j=0;j<12;j++){const a=j*Math.PI/6,x=-115+Math.cos(a)*13,z=88+Math.sin(a)*13;
      const h=4+rand(j,13)*3;box('forbidden runestone',1.8,h,1.25,x,h/2,z,stone);sphere('ancient rune glint',.34,x,h*.78,z,material('forest rune', '#82989b',{emissive:'#445d86'}));}
    const heart=sphere('forest ghostlight',1.65,-115,4.8,88,material('forest heart','#8bc1c4',{emissive:'#5f8f9a',alpha:.77}),18);heart.metadata={pulse:true};world.forestHeart=heart;
    // Longer draw distance, remote silhouettes and a road that rewards exploring on a broom.
    for(let i=0;i<28;i++){let x=-260+rand(i,19)*520,z=-250+rand(i,21)*520;
      const tower=cylinder('distant watchtower',5,7,15,x,7.5,z,stone,8);
      const cap=B.MeshBuilder.CreateCylinder('watchtower spire',{diameterTop:0,diameterBottom:9,height:6,tessellation:8},scene);cap.position=V(x,18,z);cap.material=roof;
    }
    spawnLivingActors();
    // Physically animated localized rain: the particle emitter follows the player.
    try{const rain=new B.ParticleSystem('Highlands passing rain',mobile?360:1150,scene);
      rain.particleTexture=magicParticleTexture();rain.emitter=V(0,15,0);
      rain.minEmitBox=V(-23,0,-23);rain.maxEmitBox=V(23,0,23);
      rain.color1=new B.Color4(.67,.79,.88,.43);rain.color2=new B.Color4(.49,.60,.73,.24);rain.colorDead=new B.Color4(.4,.5,.65,0);
      rain.minSize=.035;rain.maxSize=.075;rain.minLifeTime=.55;rain.maxLifeTime=1.0;
      rain.emitRate=mobile?420:900;rain.direction1=V(-.8,-15,-.5);rain.direction2=V(.7,-19,.5);
      rain.minEmitPower=.10;rain.maxEmitPower=.25;rain.gravity=V(0,-9,0);
      rain.blendMode=B.ParticleSystem.BLENDMODE_STANDARD;world.rain=rain;world.rainStarted=false;
    }catch(e){console.warn('Meteo particellare disattivato:',e.message);}
  }
  function spawnLivingActors(){
    const outfits={student:['#39475e','#b9afa1'],teacher:['#4f3e4d','#cbb6a1'],villager:['#554437','#c4aa90'],guard:['#333947','#bda995'],shade:['#181c27','#aaa0b8']};
    const defs=[
      ['Alma · studentessa','student',-7,51,'Hogwarts','La scuola custodisce stanze che cambiano posizione.'],
      ['Professor Rowan','teacher',5,47,'Hogwarts','Lumos non serve solo a vedere. Il castello reagisce alla luce.'],
      ['Nevin · apprendista','student',23,61,'Hogwarts','Se attraversi la brughiera arriverai al villaggio.'],
      ['Elowen · libraia','villager',100,49,'Hogsmeade','Cerca i tomi perduti nella Foresta Proibita.'],
      ['Bram · mercante','villager',112,35,'Hogsmeade','I treni passano dalla stazione a est.'],
      ['Viola · guaritrice','teacher',92,18,'Hogsmeade','La vita torna quando ci concediamo un momento di riposo.'],
      ['Sir Emmett','guard',127,108,'Stazione','Il treno percorre l’intera valle. Puoi salirci quando rallenta.'],
      ['Capostazione','villager',124,128,'Stazione','Attendi sul marciapiede e tocca INTERAGISCI per salire.'],
      ['Studente smarrito','student',-110,78,'Foresta','Ho visto una luce oltre le pietre antiche.'],
      ['Custode della foresta','guard',-133,102,'Foresta','Non disturbare le creature nella nebbia.'],
      ['Ombra errante','shade',-137,83,'Foresta','...'],
      ['Ombra del bosco','shade',-92,116,'Foresta','...'],
      ['Cercatore di rune','student',-81,105,'Foresta','Il lago nasconde l’eco degli incantesimi.'],
      ['Viaggiatore','villager',72,52,'Strada','La valle non dorme mai.']
    ];
    for(let i=0;i<defs.length;i++){
      const [name,kind,x,z,region,line]=defs[i],palette=outfits[kind],cloak=material('npc cloak '+i,palette[0]),face=material('npc skin '+i,palette[1]),trim=material('npc trim '+i,kind==='shade'?'#875969':'#9e876b',{emissive:kind==='shade'?'#3b1d25':undefined});
      const root=new B.TransformNode(name,scene);root.position=V(x,0,z);
      const add=(mesh,xx,yy,zz)=>{mesh.parent=root;mesh.position.set(xx,yy,zz);return mesh};
      add(cylinder('tailored long robe',.74,1.35,1.8,0,0,0,cloak,8),0,1.22,0);
      add(cylinder('shouldered tabard',.82,.83,.68,0,0,0,trim,8),0,2.2,0);
      add(sphere('character sculpted head',.50,0,0,0,face,9),0,2.8,0);
      add(cylinder('dark wool cowl',0,.92,.64,0,0,0,cloak,8),0,3.26,0);
      const l=add(cylinder('left animated sleeve',.28,.36,1.15,0,0,0,cloak,7),-.57,1.98,0);
      const r=add(cylinder('right animated sleeve',.28,.36,1.15,0,0,0,cloak,7),.57,1.98,0);
      add(cylinder('wand',.027,.08,.66,0,0,0,trim,6),.88,1.66,.19);
      for(let k of [-1,1])add(sphere('eye',.06,0,0,0,trim,6),k*.16,2.84,.23);
      world.actors.push({name,kind,region,line,x,z,homeX:x,homeZ:z,root,left:l,right:r,phase:i*1.2,hp:kind==='shade'?3:999,stun:0,alive:true,patrol:rand(i,21)*6,aggro:false,voiceAt:0,interacted:false});
    }
  }
  function nearestActor(range=5.3){let selected=null,best=range;for(const a of world.actors){if(!a.alive||a.kind==='shade')continue;const d=distance(cam.position.x,cam.position.z,a.x,a.z);if(d<best){best=d;selected=a}}return selected;}
  function updateLivingWorld(dt){
    world.time=(world.time+dt*world.daySpeed)%1;
    const raining=(Math.sin(phase/52-1.35)>.39);const weather=raining?'pioggia':'sereno';
    if(weather!==world.weather){world.weather=weather;if(game.running)toast(raining?'La pioggia attraversa le Highlands':'La nebbia si dirada',2.6);}
    if(world.rain){world.rain.emitter=cam.position.add(V(0,18,0));
      if(raining&&!world.rainStarted){world.rain.start();world.rainStarted=true;}
      else if(!raining&&world.rainStarted){world.rain.stop();world.rainStarted=false;}}

    const hh=world.time*24,daylight=clamp((Math.sin((hh-6)/24*Math.PI*2)+.33)*.75,.11,1);
    ambient.intensity=.24+daylight*.63;sun.intensity=.19+daylight*1.36;
    sun.direction=V(-.46,-.46-daylight*.42,Math.cos(world.time*Math.PI*2)*.38);
    scene.fogDensity=.0027+(1-daylight)*.0026+(world.weather==='pioggia'?.0013:0);
    scene.fogColor=B.Color3.Lerp(B.Color3.FromHexString('#243040'),B.Color3.FromHexString('#7c8290'),daylight);
    for(const torch of game.torches)torch.light.intensity=(mobile?.45:.75)+(1-daylight)*.50+Math.sin(phase*11+torch.phase)*.08;
    if(world.train){const tr=world.train;tr.z+=tr.speed*dt;if(tr.z>230){tr.z=230;tr.speed=-Math.abs(tr.speed)}if(tr.z< -198){tr.z=-198;tr.speed=Math.abs(tr.speed)}
      tr.root.position.z=tr.z;tr.root.rotation.y=tr.speed<0?0:Math.PI;tr.light.intensity=daylight<.4?1.7:.8;
      if(world.onTrain&&game.running){cam.position.x=tr.root.position.x;cam.position.z=tr.z+world.trainSeatZ;cam.position.y=4.15+Math.sin(phase*8)*.04;game.vx=game.vz=game.vy=0;}
    }
    for(const a of world.actors){if(!a.alive){a.root.setEnabled(false);continue;}a.stun=Math.max(0,a.stun-dt);let dx=0,dz=0;
      const d=distance(cam.position.x,cam.position.z,a.x,a.z);const regionActive=d<95;
      if(regionActive&&a.stun<=0){
        if(a.kind==='shade'&&game.running&&d<18&&!world.onTrain){a.aggro=true;dx=cam.position.x-a.x;dz=cam.position.z-a.z;
          if(d<2.25&&(!a.voiceAt||phase-a.voiceAt>2.5)){a.voiceAt=phase;game.hp=Math.max(0,game.hp-8);flash('#b72b44',.15);if(game.hp<=0)lose();}}
        else{const theta=phase*(a.kind==='guard'?.15:.25)+a.phase;const targetX=a.homeX+Math.sin(theta)*5.0,targetZ=a.homeZ+Math.cos(theta*.68)*4.0;dx=targetX-a.x;dz=targetZ-a.z;}
        const len=Math.hypot(dx,dz);if(len>.22){const speed=a.kind==='shade'?2.0:.68;a.x+=dx/len*Math.min(len,speed*dt);a.z+=dz/len*Math.min(len,speed*dt);a.root.rotation.y=Math.atan2(dx,dz);}
      }
      a.root.position.set(a.x,Math.sin(phase*1.8+a.phase)*.025,a.z);
      a.left.rotation.z=.13+Math.sin(phase*2.6+a.phase)*.12;
      a.right.rotation.z=-.15-Math.sin(phase*2.6+a.phase)*.11;
    }
    if(world.forestHeart)world.forestHeart.scaling.setAll(1+Math.sin(phase*2)*.22);
    const zone=zoneAt(cam.position.x,cam.position.z);
    if(zone!==world.lastZone&&game.running){world.lastZone=zone;document.querySelector('.zone').textContent=zone;
      if(zone.includes('Hogsmeade')&&!world.villageVisited){world.villageVisited=true;game.xp+=50;}
      if(zone.includes('Foresta')&&!world.forestVisited){world.forestVisited=true;game.xp+=50;}
      if(zone.includes('Stazione')&&!world.stationVisited){world.stationVisited=true;game.xp+=50;}
      toast('✦ '+zone,2.2);saveWorld();}
    world.zoneTick+=dt;if(world.zoneTick>.22){world.zoneTick=0;drawMinimap();updateWorldHUD();}
  }
  function drawMinimap(){const canvas=$('minimap');if(!canvas)return;const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    g.clearRect(0,0,w,h);g.fillStyle='rgba(13,19,27,.78)';g.fillRect(0,0,w,h);
    const px=cam.position.x,pz=cam.position.z,scale=.43;const project=(x,z)=>[w/2+(x-px)*scale,h/2+(z-pz)*scale];
    g.strokeStyle='#a68f6b45';g.lineWidth=2;g.beginPath();let chain=[[0,50],[67,55],[104,30],[127,81],[141,123]];
    for(let j=0;j<chain.length;j++){const [x,y]=project(...chain[j]);if(j===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke();
    for(const m of landmarks){const [x,y]=project(m.x,m.z);if(x<0||x>w||y<0||y>h)continue;g.fillStyle='#b8b4a0';g.beginPath();g.arc(x,y,3.6,0,6.283);g.fill();}
    for(const a of world.actors)if(a.alive){const [x,y]=project(a.x,a.z);if(x<2||x>w-2||y<2||y>h-2)continue;g.fillStyle=a.kind==='shade'?'#b84e5b':'#8eb1b2';g.fillRect(x-1.6,y-1.6,3.2,3.2);}
    g.translate(w/2,h/2);g.rotate(-game.yaw);g.fillStyle='#edd3a2';g.beginPath();g.moveTo(0,-8);g.lineTo(5,6);g.lineTo(0,3);g.lineTo(-5,6);g.closePath();g.fill();
  }
  function updateWorldHUD(){const clock=$('worldTime');if(clock){let minutes=Math.floor(world.time*1440);clock.textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')+' · '+(world.time<.25||world.time>.79?'NOTTE':world.time>.68?'TRAMONTO':'GIORNO')+(world.weather==='pioggia'?' · PIOGGIA':'');}
    const a=nearestActor();const nearTrain=world.train&&distance(cam.position.x,cam.position.z,145,world.train.z)<8&&Math.abs(cam.position.z-world.train.z)<32;
    const portal=distance(cam.position.x,cam.position.z,0,-39.2)<7;
    const btn=$('interact');if(!btn)return;btn.classList.toggle('hidden',!(a||nearTrain||portal||world.onTrain));
    if(world.onTrain)btn.textContent='✋ Scendi dal treno';else if(a)btn.textContent='✋ Parla: '+a.name;else if(nearTrain)btn.textContent='🚂 Sali sul treno';else if(portal)btn.textContent='✧ Esamina la porta';
    if(!game.running)btn.classList.add('hidden');
  }

  function lantern(x,z){const dark=material('lantern black iron','#2d2d2f',{spec:'#877763'}),flame=material('lantern fire','#ce853c',{emissive:'#f89e41'});
    cylinder('lamp column',.16,.29,4.9,x,2.5,z,dark,8);box('bronze lamp base',.8,.38,.8,x,5.00,z,dark);
    sphere('fire behind glass',.47,x,5.4,z,flame,9);
    const l=new B.PointLight('torchlight',V(x,5.35,z),scene);l.diffuse=B.Color3.FromHexString('#ffb86f');l.intensity=mobile?.45:.65;l.range=13;
    game.torches.push({light:l,phase:rand(x,z)*7});
  }
  function glints(){const mat=material('luminescent insects','#96ba9b',{emissive:'#b9bf83'});for(let i=0;i<45;i++){let x=(rand(i,12)-.5)*67,z=(rand(i,32)-.5)*70;const p=sphere('floating motes',.06+rand(i,2)*.07,x,1.5+rand(i,77)*5,z,mat,4);fx.push({mesh:p,origin:p.position.clone(),phase:i*1.75,kind:'mote'});}}
  function sceneSetup(){
    engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:false},false);
    engine.setHardwareScalingLevel(mobile?1.00:.9);
    scene=new B.Scene(engine);scene.clearColor=new B.Color4(.07,.09,.13,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.0038;scene.fogColor=B.Color3.FromHexString('#5f6871');
    scene.imageProcessingConfiguration.toneMappingEnabled=true;
    scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure=1.08;scene.imageProcessingConfiguration.contrast=1.24;
    cam=new B.UniversalCamera('first-person camera',V(-1,1.72,27),scene);
    cam.minZ=.08;cam.maxZ=850;cam.fov=mobile?1.33:1.17;cam.rotation.y=Math.PI;scene.activeCamera=cam;
    ambient=new B.HemisphericLight('sky light',V(.15,1,.05),scene);ambient.intensity=.69;ambient.diffuse=B.Color3.FromHexString('#a1adbc');ambient.groundColor=B.Color3.FromHexString('#393e3e');
    sun=new B.DirectionalLight('dying sunlight',V(-.45,-.94,-.28),scene);sun.intensity=1.28;sun.diffuse=B.Color3.FromHexString('#d5bca2');sun.position=V(35,82,40);
    let shadows=null;try{shadows=new B.ShadowGenerator(mobile?512:1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=mobile?2:4;}catch(e){}
    const skyMat=new B.StandardMaterial('gradient sky',scene);skyMat.disableLighting=true;skyMat.backFaceCulling=false;skyMat.emissiveColor=new B.Color3(1,1,1);skyMat.diffuseColor=new B.Color3(0,0,0);
    const st=new B.DynamicTexture('winter sky',{width:1024,height:512},scene,false);let ctx=st.getContext();let grad=ctx.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#101828');grad.addColorStop(.48,'#5a6570');grad.addColorStop(.78,'#9a7e76');grad.addColorStop(1,'#bba39b');ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);for(let i=0;i<110;i++){const a=rand(i,100)*1024,b=rand(i,400)*135;ctx.fillStyle=`rgba(255,251,234,${.15+rand(i,50)*.38})`;ctx.fillRect(a,b,1.25,1.25)}st.update(false);skyMat.emissiveTexture=st;
    sky=B.MeshBuilder.CreateSphere('weathered sky dome',{diameter:1150,segments:24,sideOrientation:B.Mesh.BACKSIDE},scene);sky.material=skyMat;sky.infiniteDistance=true;sky.isPickable=false;sky.applyFog=false;
    setupCinematic();stoneGround();forest();const mats=architecture();worldExpansion();
    for(const [x,z] of [[-11,13],[11,13],[-20,-27],[20,-27]])lantern(x,z);
    glints();
    for(let i=0;i<3;i++){let x=[-11,8,17][i],z=[-13,15,-23][i];const block=box('movable ancient stone chest',1.3,1.1,1.2,x,.56,z,mats.edge);block.rotation.y=rand(i,55)*.2;let strip=box('bronze inlay chest',1.34,.09,1.24,x,.76,z,mats.iron);strip.parent=block;strip.position.set(0,.12,0);
      props.push({mesh:block,vx:0,vy:0,vz:0,x,z,y:.56,homeX:x,homeZ:z,mass:1+i*.4}); }
    enemyRoot=new B.TransformNode('Shadow Keeper pivot',scene);enemyRoot.position=V(enemy.x,0,enemy.z);enemy.root=enemyRoot;
    proceduralEnemy();importEnemyModel(shadows);
    // Wand modeled as a physical 3D mesh attached to the camera, with brass filigree and jewel.
    const wood=material('elderwood','#38251c',{spec:'#8a6245',shine:50}),brass=material('engraved brass','#9f855c',{spec:'#b49a70',shine:100});
    const hand=material('glove leather','#21232a',{spec:'#31363b'});
    const staff=cylinder('carved ash wand',.026,.083,.76,0,0,0,wood,9);staff.parent=cam;staff.position.set(.47,-.40,1.06);staff.rotation.z=-.24;
    const grip=cylinder('wand binding',.095,.084,.13,0,0,0,brass,10);grip.parent=staff;grip.position.y=-.20;
    const tip=sphere('wand tip rune',.065,0,.34,0,brass,10);tip.parent=staff;
    const glove=sphere('sleeved spellcasting hand',.31,0,0,0,hand,10);glove.parent=cam;glove.position.set(.60,-.62,.9);glove.scaling.set(.84,.62,1.6);
    wandLight=new B.PointLight('wand lumos',V(.47,-.05,1.1),scene);wandLight.parent=cam;wandLight.intensity=0;wandLight.range=16;wandLight.diffuse=B.Color3.FromHexString('#ffd594');
    game.wand=staff;game.shadow=shadows;
    const glow=glowy('#ffcb86');const lamp=sphere('Lumos luminous tip',.14,0,.39,0,glow,12);
    lamp.parent=staff;lamp.setEnabled(false);cinematic.lamp=lamp;
    setupProtego();
    B.Engine.LastCreatedEngine?.hideLoadingUI?.();
    return scene;
  }
  function proceduralEnemy(){const dark=material('shadow robe','#181d25',{spec:'#2a2d32'}),leather=material('worn leather','#33302c',{spec:'#665749'}),face=material('pale face','#b7a598',{spec:'#3f3934'}),eye=material('eyes of embers','#7b1a19',{emissive:'#d53a24'}),steel=material('silver seams','#757674',{spec:'#aeadaa'});
    const root=new B.TransformNode('placeholder body',scene);root.parent=enemy.root;enemy.helper=root;
    const skirt=cylinder('layered cloak',.60,1.75,2.2,0,1.15,0,dark,12);skirt.parent=root;
    for(let k=0;k<9;k++){let a=k*Math.PI*2/9;const part=box('fold in cloak',.23,1.9,.15,Math.sin(a)*.67,.92,Math.cos(a)*.60,dark);part.parent=root;part.rotation.y=a;}
    const chest=box('leather vest',1.0,1.25,.61,0,2.57,0,leather);chest.parent=root;
    const hood=cylinder('pointed dark cowl',.62,1.18,.79,0,3.40,0,dark,9);hood.parent=root;
    const visage=sphere('face under the hood',.50,0,3.32,.36,face,11);visage.parent=root;
    for(let x of [-.17,.17]){const pupil=sphere('red eye',.09,x,3.35,.59,eye,8);pupil.parent=root;}
    const belt=cylinder('iron clasp',.09,.09,.05,0,2.15,.41,steel,8);belt.parent=root;
    const arms=[];for(let x of [-.68,.68]){let sleeve=cylinder('cloak sleeve',.3,.43,1.33,x,2.52,0,dark,10);sleeve.parent=root;sleeve.rotation.z=x<0?-.18:.18;arms.push(sleeve);let fist=sphere('leather glove',.31,x*1.18,1.79,.06,leather,8);fist.parent=root;}
    const wand=cylinder('warden wand',.035,.08,.87,.98,1.85,.32,leather,9);wand.parent=root;wand.rotation.z=-.24;
    root.metadata={arms,wand,skirt};
  }
  async function importEnemyModel(shadows){try{
    const result=await B.SceneLoader.ImportMeshAsync('','https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/','Soldier.glb',scene);
    if(!result.meshes.length)return;
    const model=result.meshes[0];model.parent=enemy.root;model.position.set(0,0,0);model.scaling.setAll(1.95);
    // Retint this animated skinned character as a shadow duellist; fall back stays when import fails.
    for(const mesh of result.meshes){if(!mesh.material)continue;
      if(mesh.material.clone){const mat=mesh.material.clone(mesh.name+' midnight material');mat.albedoColor?.copyFrom?.(B.Color3.FromHexString('#272a32'));mat.diffuseColor?.copyFrom?.(B.Color3.FromHexString('#34343e'));mesh.material=mat;}
      if(mesh instanceof B.Mesh&&shadows)shadows.addShadowCaster(mesh,false);
    }
    enemy.helper.setEnabled(false);enemy.anims=result.animationGroups||[];enemy.modelReady=true;playEnemyAnim('Idle');
    $('load').textContent='Modello 3D animato caricato · pronto';
  }catch(e){$('load').textContent='Mondo pronto · nemico procedurale di riserva';console.info('Optional animated character failed',e.message);}}
  function playEnemyAnim(name){if(!enemy.anims.length||enemy.current===name)return;enemy.current=name;for(const g of enemy.anims)g.stop();let match=enemy.anims.find(g=>g.name.toLowerCase()===name.toLowerCase())||enemy.anims.find(g=>g.name.toLowerCase().includes(name.toLowerCase()));if(match)match.start(true,1,match.from,match.to,false);}
  function glowy(hex){const m=new B.StandardMaterial('magical aura',scene);m.diffuseColor=B.Color3.FromHexString(hex);m.emissiveColor=m.diffuseColor.clone();m.disableLighting=true;return m;}
  function burst(pos,color,count=15,force=2.2){particleBurst(pos,color,count,force);}
  function spawnBolt(from,target,hostile){const c=hostile?'#b92f48':'#ef755d',mat=glowy(c);const orb=sphere(hostile?'hostile hex':'your spell',hostile?.34:.30,from.x,from.y,from.z,mat,12);const dir=target.subtract(from).normalize();const point=new B.PointLight('spell light',orb.position.clone(),scene);point.diffuse=B.Color3.FromHexString(c);point.intensity=hostile?.7:1.25;point.range=mobile?5:7;
    const trail=newTrail(orb,c);projectiles.push({mesh:orb,light:point,trail,dir,hostile,speed:hostile?12:27,life:hostile?2.4:1.25,age:0});
    particleBurst(from,c,hostile?18:36,hostile?1.3:2.0);if(!hostile){flash(c,.16);magicAudio('cast');}else audio(220,.14,'triangle',.032);
  }
  function cast(){if(!game.running||game.ended)return;const s=spells[game.spell];if(game.mana<s.cost){toast('Il potere magico si sta rigenerando');audio(115,.16);return;}
    game.mana-=s.cost;game.pulse=.48;const eye=cam.position.clone(),forward=cam.getForwardRay(1).direction.normalize();const from=eye.add(forward.scale(1.2)).add(V(.1,-.09,0));
    if(game.spell===0){spawnBolt(from,from.add(forward.scale(40)),false);toast('Stupeficium',.8);}
    else if(game.spell===1){let target=null,dMin=99;for(const p of props){const to=p.mesh.position.subtract(eye),d=to.length(),a=B.Vector3.Dot(to.normalize(),forward);if(d<19&&a>.62&&d<dMin){target=p;dMin=d;}}if(target){const dv=eye.subtract(target.mesh.position).normalize();target.vx+=dv.x*12;target.vy+=5.8;target.vz+=dv.z*12;magicWave(target.mesh.position,'#f1c98b',.75,3.2);magicAudio('accio');toast('Accio · oggetto attirato');}else toast('Accio · punta verso un oggetto');audio(500,.28,'triangle');}
    else if(game.spell===2){game.lumos=!game.lumos;wandLight.intensity=game.lumos?2.6:0;magicImpact(from,game.lumos?'#ffd69a':'#6a7d94',.7);magicAudio('lumos');toast(game.lumos?'Lumos · la luce risponde':'Nox · oscurità');}
    else if(game.spell===3){game.shield=2.8;game.shieldPulse=0;toast('Protego · barriera attiva');magicWave(eye.add(forward.scale(2)),'#71c6f5',.9,3.8);magicAudio('shield');}
    else if(game.spell===4){game.revealed=true;portalCore.setEnabled(true);game.sealRing.setEnabled(true);magicWave(cam.position.clone().add(forward.scale(1.5)),'#c2b1fa',1.0,12);magicImpact(V(0,5,-44.4),'#bdb4ed',1.6);magicAudio('revelio');toast('Revelio · un sigillo appare sul portale',3.3);}
    updateHUD();
  }
  function updateHUD(){ $('hpNum').textContent=Math.round(game.hp);$('hpBar').style.width=game.hp+'%';$('manaBar').style.width=game.mana+'%';$('enemyBar').style.width=(Math.max(0,enemy.hp)/5*100)+'%';
    $('enemyCard').classList.toggle('hidden',!enemy.alive||distance(cam.position.x,cam.position.z,enemy.x,enemy.z)>26);
    $('objective').textContent=enemy.alive?'Sconfiggi il Custode dell’Ombra (Stupeficium). Il mondo oltre il cortile è già esplorabile.':
      !game.revealed?'Usa Revelio sul portale. Oppure esplora Hogsmeade e la Foresta Proibita.':
      !world.portalUnsealed?'Apri il portale con ✋ oppure scopri il treno alla stazione.':
      'Esplora la valle: Hogsmeade, Foresta Proibita, Lago Nero e Hogwarts Express.';
  }
  function win(){game.ended=true;game.running=false;$('hud').classList.add('hidden');$('finished').classList.remove('hidden');$('finishTag').textContent='CAPITOLO I · COMPLETATO';$('finishTitle').textContent='La porta si è aperta';$('finishText').textContent='Il Custode è stato sconfitto e il primo segreto di Hogwarts è nelle tue mani. Questo è solo l’inizio del nuovo Alohomora.';audio(780,.9);}
  function lose(){game.ended=true;game.running=false;$('hud').classList.add('hidden');$('finished').classList.remove('hidden');$('finishTag').textContent='IL CORTILE È CADUTO';$('finishTitle').textContent='La notte prevale';$('finishText').textContent='Il Custode ti ha sopraffatto. Torna nel cortile, cambia incantesimi e usa Protego per deviare i suoi attacchi.';}
  const inputs={keys:new Set(),axisX:0,axisY:0,joyId:null,lookId:null,px:0,py:0};
  function reset(){try{const saved=JSON.parse(localStorage.getItem('alohomora-world-v12')||'null');if(saved){world.time=saved.time||world.time;world.villageVisited=!!saved.quests?.village;world.forestVisited=!!saved.quests?.forest;world.stationVisited=!!saved.quests?.station;}}catch(e){}
    world.onTrain=false;world.lastZone='';world.dialogues=0;for(const a of world.actors){a.x=a.homeX;a.z=a.homeZ;a.alive=true;a.hp=a.kind==='shade'?3:999;a.root.setEnabled(true);a.stun=0;}
    for(const p of projectiles)deleteProjectile(p);projectiles.length=0;game.hp=100;game.mana=100;game.shield=0;game.lumos=false;game.revealed=false;game.ended=false;game.vx=game.vz=game.vy=game.airborne=0;game.yaw=Math.PI;game.pitch=0;game.running=true;game.spell=0;game.pulse=0;game.bob=0;game.shake=0;cinematic.flash=0;enemy.hp=5;enemy.alive=true;enemy.death=0;enemy.mode='idle';enemy.stun=0;enemy.windup=0;enemy.cool=3;enemy.x=6;enemy.z=-8;enemy.root.position.set(6,0,-8);enemy.root.rotation.set(0,0,0);enemy.root.setEnabled(true);if(enemy.modelReady)playEnemyAnim('Idle');for(const p of props){p.x=p.homeX;p.z=p.homeZ;p.y=.56;p.mesh.position.set(p.x,p.y,p.z);p.vx=p.vy=p.vz=0;}
    cam.position.set(-1,1.72,27);cam.rotation.set(0,Math.PI,0);portalCore.setEnabled(false);game.sealRing.setEnabled(false);wandLight.intensity=0;
    $('intro').classList.add('hidden');$('finished').classList.add('hidden');$('hud').classList.remove('hidden');$('interact').classList.add('hidden');
    selectSpell(0);updateHUD();toast('Attraversa il cortile e preparati al duello',4);
  }
  function selectSpell(i){game.spell=clamp(i,0,spells.length-1);document.querySelectorAll('.spell').forEach((el,j)=>el.classList.toggle('selected',j===game.spell));audio(350+game.spell*100,.08,'sine',.014);}
  function movePlayer(dt){const yaw=game.yaw,axisX=inputs.axisX+(inputs.keys.has('d')||inputs.keys.has('arrowright')?1:0)-(inputs.keys.has('a')||inputs.keys.has('arrowleft')?1:0),axisY=inputs.axisY+(inputs.keys.has('w')||inputs.keys.has('arrowup')?1:0)-(inputs.keys.has('s')||inputs.keys.has('arrowdown')?1:0);
    const l=Math.max(1,Math.hypot(axisX,axisY)),sx=axisX/l,sy=axisY/l;const desiredX=(-Math.cos(yaw)*sx+Math.sin(yaw)*sy)*(inputs.keys.has('shift')?8.2:4.8),desiredZ=(Math.sin(yaw)*sx+Math.cos(yaw)*sy)*(inputs.keys.has('shift')?8.2:4.8);
    game.vx=mix(game.vx,desiredX,Math.min(1,dt*8));game.vz=mix(game.vz,desiredZ,Math.min(1,dt*8));
    const test=(x,z)=>{if(x< -246||x>246||z>246||z<-246)return false;for(const r of colliders){if(Math.abs(x-r.x)<r.w/2+.64&&Math.abs(z-r.z)<r.d/2+.64)return false}return true};
    let nx=cam.position.x+game.vx*dt,nz=cam.position.z+game.vz*dt;
    if(test(nx,cam.position.z))cam.position.x=nx;else game.vx=0;
    if(test(cam.position.x,nz))cam.position.z=nz;else game.vz=0;
    const speed=Math.hypot(game.vx,game.vz);game.bob+=dt*speed*1.8;
    game.vy-=19*dt;game.airborne=Math.max(0,game.airborne+game.vy*dt);if(game.airborne===0)game.vy=0;
    cam.position.y=1.72+game.airborne+Math.sin(game.bob*2)*.028*clamp(speed/4.8,0,1);
    cam.rotation.y=game.yaw;cam.rotation.x=game.pitch;
    if(game.wand){game.wand.rotation.x=Math.sin(game.bob)*.028;game.wand.rotation.z=-.24+Math.sin(game.bob*2)*.023+game.pulse*.2;}
  }
  function updateEnemy(dt){if(!enemy.root)return;if(!enemy.alive){enemy.death=Math.min(1.8,enemy.death+dt);enemy.root.rotation.z=mix(enemy.root.rotation.z,1.32,dt*3);enemy.root.position.y=-Math.min(.7,enemy.death*.65);if(enemy.death>1.6)enemy.root.setEnabled(false);return;}
    if(enemy.stun>0){enemy.stun=Math.max(0,enemy.stun-dt);enemy.root.rotation.z=Math.sin(phase*15)*.12;enemy.mode='hurt';playEnemyAnim('Idle');return;}
    enemy.root.rotation.z=mix(enemy.root.rotation.z,0,dt*5);
    const px=cam.position.x,pz=cam.position.z,d=distance(px,pz,enemy.x,enemy.z);enemy.cool-=dt;
    if(!game.running){enemy.root.position.y=Math.sin(phase*1.1)*.03;return;}
    if(d<20&&d>9){const dx=(px-enemy.x)/Math.max(.1,d),dz=(pz-enemy.z)/Math.max(.1,d);enemy.x+=dx*dt*1.28;enemy.z+=dz*dt*1.28;enemy.mode='walk';playEnemyAnim('Walk');}
    else{enemy.mode='idle';playEnemyAnim('Idle');}
    enemy.root.position.x=enemy.x;enemy.root.position.z=enemy.z;enemy.direction=Math.atan2(px-enemy.x,pz-enemy.z);enemy.root.rotation.y=mix(enemy.root.rotation.y,enemy.direction,clamp(dt*3.5,0,1));
    enemy.root.position.y=Math.sin(phase*(enemy.mode==='walk'?7:2))*(enemy.mode==='walk'?.04:.01);
    if(!enemy.modelReady&&enemy.helper?.metadata){let arms=enemy.helper.metadata.arms;if(arms){arms[0].rotation.z=-.20+Math.sin(phase*3)*.07;arms[1].rotation.z=.20-Math.sin(phase*3)*.07;}}
    if(d<15&&enemy.cool<=0&&enemy.windup<=0){enemy.windup=1.08;enemy.cool=3.15+rand(phase,enemy.x)*.6;toast('Il Custode sta preparando un incantesimo!',1.5);}
    if(enemy.windup>0){enemy.windup-=dt;enemy.root.position.y+=Math.sin(phase*10)*.09;if(enemy.windup<=0&&enemy.alive){const src=V(enemy.x,2.5,enemy.z),dest=cam.position.clone().add(V(0,-.20,0));spawnBolt(src,dest,true);}}
  }
  function updateProps(dt){for(const p of props){p.vy-=19*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=Math.max(0,1-dt*2.1);p.vz*=Math.max(0,1-dt*2.1);if(p.y<.56){p.y=.56;if(p.vy<-.4){p.vy=-p.vy*.28;audio(110,.07,'triangle',.012)}else p.vy=0;}p.mesh.position.set(p.x,p.y,p.z);p.mesh.rotation.y+=Math.hypot(p.vx,p.vz)*.008*dt;}}
  function updateProjectiles(dt){for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i];p.life-=dt;p.age+=dt;p.mesh.position.addInPlace(p.dir.scale(p.speed*dt));
      p.light.position.copyFrom(p.mesh.position);p.light.intensity=(p.hostile?.65:1.05)+Math.sin(phase*34+p.age)*.16;
      const pos=p.mesh.position;
      if(p.hostile){
        const d=B.Vector3.Distance(pos,cam.position);
        if(d<1.25&&game.running){
          if(game.shield>0){
            magicImpact(pos,'#79d9ff',1.45);toast('Protego · incantesimo respinto');magicAudio('shield');
            p.hostile=false;p.dir=V(enemy.x,2.05,enemy.z).subtract(pos).normalize();p.speed=25;p.life=1.3;
            p.light.diffuse=B.Color3.FromHexString('#73d6ff');
            p.mesh.material.emissiveColor=B.Color3.FromHexString('#73d6ff');
            p.trail?.stop();p.trail?.dispose();p.trail=newTrail(p.mesh,'#73d6ff');
          }else{
            game.hp=Math.max(0,game.hp-19);$('hitFlash').style.opacity='.85';
            setTimeout(()=>$('hitFlash').style.opacity='0',170);magicImpact(pos,'#d95165',1.0);
            cinematic.shake=.11;audio(120,.24,'sawtooth',.06);if(game.hp<=0)lose();p.life=0;
          }
          updateHUD();
        }
      }else if(enemy.alive&&B.Vector3.Distance(pos,V(enemy.x,2.05,enemy.z))<1.7){
        enemy.hp--;enemy.stun=.72;enemy.root.rotation.z=-.15;
        magicImpact(pos,'#ff967a',1.45);cinematic.shake=.12;
        toast(enemy.hp>0?'Il Custode vacilla!':'Il Custode è sconfitto',2);p.life=0;
        if(enemy.hp<=0){enemy.alive=false;enemy.death=0;game.kills++;
          magicImpact(V(enemy.x,2,enemy.z),'#f2ca8c',1.9);updateHUD();
          toast('Il sigillo del portale si è indebolito. Usa Revelio.',4);}
      }
      if(!p.hostile&&p.life>0){for(const a of world.actors){if(a.kind!=='shade'||!a.alive)continue;
        if(B.Vector3.Distance(pos,V(a.x,2,a.z))<1.55){a.hp--;a.stun=.7;magicImpact(pos,'#ae7896',1.1);p.life=0;
          if(a.hp<=0){a.alive=false;game.kills++;toast('Una creatura d’ombra è stata sconfitta',2.1);}
          break;}}}
      if(pos.y<.20&&p.life>0){magicImpact(V(pos.x,.24,pos.z),p.hostile?'#ba4260':'#e88364',.68);p.life=0;}
      if(p.life<=0||Math.abs(pos.x)>110||Math.abs(pos.z)>110){deleteProjectile(p);projectiles.splice(i,1);}
    }}
  function updateEffects(dt){for(let i=fx.length-1;i>=0;i--){const f=fx[i];if(f.kind==='mote'){const tt=phase+f.phase;f.mesh.position.set(f.origin.x+Math.sin(tt*.51)*.9,f.origin.y+Math.cos(tt*.7)*.28,f.origin.z+Math.cos(tt*.39)*1.2);continue;}
      f.life-=dt;
      if(f.kind==='shock'||f.kind==='wave'){
        const progress=1-f.life/f.total;const expand=f.kind==='shock'?(1+progress*9*f.scale):(1+progress*f.speed*2);
        f.mesh.scaling.setAll(expand);f.mat.alpha=(f.kind==='shock'?.58:.45)*(1-progress)*(1-progress);
        if(f.light)f.light.intensity=(mobile?.8:1.8)*(1-progress);
        if(f.life<=0){f.light?.dispose();f.mesh.dispose();f.mat.dispose();fx.splice(i,1);}continue;
      }
      f.mesh.position.x+=f.vx*dt;f.mesh.position.y+=f.vy*dt;f.mesh.position.z+=f.vz*dt;f.vy-=4.8*dt;f.mesh.scaling.setAll(Math.max(.05,f.life*1.2));if(f.life<=0){f.mesh.dispose();fx.splice(i,1);}
    }}
  function updatePortal(dt){if(!portalCore)return;if(game.revealed){portalCore.rotation.z+=dt*.15;portalCore.scaling.x=1+Math.sin(phase*1.9)*.12;portalCore.scaling.y=1+Math.cos(phase*1.7)*.12;game.sealRing.rotation.y+=dt*.13;}
    const near=distance(cam.position.x,cam.position.z,0,-39.2)<7.0;
    // Interaction prompt is managed by the nearby-NPC and train system.
  }
  function interact(){if(!game.running)return;
    if(world.onTrain){world.onTrain=false;cam.position.x=129;cam.position.z=world.train.z;cam.position.y=1.72;toast('Sei sceso dall’Espresso.');return;}
    const nearby=nearestActor();if(nearby){nearby.interacted=true;world.dialogues++;
      const reply=nearby.kind==='student'&&world.time>.75?'La ronda notturna è vicina. Non restare nelle ombre.':
        nearby.name.includes('Capostazione')&&world.train?'La locomotiva si trova '+Math.round(Math.abs(world.train.z-cam.position.z))+' passi lungo la ferrovia.':
        nearby.name.includes('guaritrice')?'Riprendi le forze, viandante. La tua salute è stata curata.':nearby.line;
      toast(nearby.name+': '+reply,5);magicAudio('revelio');
      if(nearby.name.includes('guaritrice'))game.hp=Math.min(100,game.hp+30);
      if(nearby.region==='Hogsmeade')world.villageVisited=true;
      if(nearby.region==='Foresta')world.forestVisited=true;
      if(nearby.region==='Stazione')world.stationVisited=true;
      saveWorld();return;}
    if(world.train&&distance(cam.position.x,cam.position.z,145,world.train.z)<8){world.onTrain=true;world.trainSeatZ=0;toast('🚂 Hogwarts Express · viaggio nella valle! Tocca ✋ per scendere.',5);world.stationVisited=true;saveWorld();return;}
    if(distance(cam.position.x,cam.position.z,0,-39.2)>7){toast('Avvicinati a un personaggio, a una porta o al treno.');return;}

    if(enemy.alive){toast('Un incantesimo antico protegge la porta. Sconfiggi il Custode.');return;}
    if(!game.revealed){toast('Il portale è nascosto. Lancia Revelio.');return;}
    burst(V(0,5.0,-44), '#e8cb90',75,5);world.portalUnsealed=true;
    toast('✦ Il portale è aperto! Il mondo magico oltre Hogwarts ti attende.',6);world.villageVisited=true;saveWorld();
    game.hp=Math.min(100,game.hp+40);game.mana=100;game.xp+=250;
    // Reward continuous exploration instead of closing the game after the first mission.
  }
  function tick(){const now=performance.now(),dt=clamp((now-last)/1000,.001,.042);last=now;phase+=dt;effectClock+=dt;
    sky.position.copyFrom(cam.position);
    for(const torch of game.torches)torch.light.intensity=(mobile?.55:.78)+Math.sin(phase*10+torch.phase)*.10+Math.sin(phase*3.3+torch.phase)*.07;
    if(game.running){if(!world.onTrain)movePlayer(dt);updateEnemy(dt);updateProps(dt);updateProjectiles(dt);game.mana=Math.min(100,game.mana+dt*7.6);game.shield=Math.max(0,game.shield-dt);game.pulse=Math.max(0,game.pulse-dt);updatePortal(dt);if(game.toastTimeout>0){game.toastTimeout-=dt;if(game.toastTimeout<=0)$('toast').classList.remove('show');}}
    else{if(!game.ended){cam.rotation.y=Math.PI+Math.sin(phase*.20)*.045;cam.rotation.x=-.025;}updateEnemy(dt)}
    updateEffects(dt);updateCinematic(dt);updateLivingWorld(dt);if(game.running&&effectClock>.1){updateHUD();effectClock=0;}
    scene.render();}
  function jump(){if(!game.running)return;if(game.airborne<.02&&game.vy<=0){game.vy=6.5;audio(220,.1)}}
  function controls(){const joy=$('joy'),knob=$('knob');function handleJoy(e){let r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,radius=34,mag=Math.max(1,Math.hypot(dx,dy)),k=Math.min(1,mag/radius),a=Math.atan2(dy,dx);inputs.axisX=Math.cos(a)*k;inputs.axisY=-Math.sin(a)*k;knob.style.transform=`translate(${Math.cos(a)*radius*k}px,${Math.sin(a)*radius*k}px)`;}
    joy.addEventListener('pointerdown',e=>{e.preventDefault();inputs.joyId=e.pointerId;joy.setPointerCapture(e.pointerId);handleJoy(e)});
    joy.addEventListener('pointermove',e=>{if(inputs.joyId===e.pointerId)handleJoy(e)});
    for(let type of ['pointercancel','pointerup'])joy.addEventListener(type,e=>{if(inputs.joyId!==e.pointerId)return;inputs.joyId=null;inputs.axisX=inputs.axisY=0;knob.style.transform='translate(0,0)';});
    canvas.addEventListener('pointerdown',e=>{if(!game.running)return;inputs.lookId=e.pointerId;inputs.px=e.clientX;inputs.py=e.clientY;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!game.running||inputs.lookId!==e.pointerId)return;let dx=e.clientX-inputs.px,dy=e.clientY-inputs.py;inputs.px=e.clientX;inputs.py=e.clientY;game.yaw+=dx*.0034;game.pitch=clamp(game.pitch+dy*.0026,-.8,.65);});
    for(let type of ['pointercancel','pointerup'])canvas.addEventListener(type,e=>{if(inputs.lookId===e.pointerId)inputs.lookId=null;});
    canvas.addEventListener('click',()=>{if(game.running&&!mobile&&document.pointerLockElement!==canvas){canvas.requestPointerLock?.()}});
    document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&game.running){game.yaw+=e.movementX*.0024;game.pitch=clamp(game.pitch+e.movementY*.0023,-.8,.65);}});
    document.addEventListener('mousedown',e=>{if(document.pointerLockElement===canvas&&e.button===0)cast();});
    document.addEventListener('keydown',e=>{let key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();inputs.keys.add(key);if(!game.running)return;if(key==='e')interact();if(key===' ')jump();if(key>='1'&&key<='5')selectSpell(Number(key)-1);if(key==='q')selectSpell((game.spell+4)%5);if(key==='f')cast();if(key==='m')$('mapPanel')?.classList.toggle('hidden');});
    document.addEventListener('keyup',e=>inputs.keys.delete(e.key.toLowerCase()));
    document.querySelectorAll('.spell').forEach((b,i)=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();selectSpell(i)}));
    $('cast').addEventListener('pointerdown',e=>{e.preventDefault();cast()});$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump()});
    $('interact').addEventListener('pointerdown',e=>{e.preventDefault();interact()});
    $('mapToggle')?.addEventListener('click',()=>{$('mapPanel')?.classList.toggle('hidden');});
    $('mapClose')?.addEventListener('click',()=>{$('mapPanel')?.classList.add('hidden');});
    $('graphicToggle')?.addEventListener('click',()=>{const hi=engine.getHardwareScalingLevel()>1.05;
      engine.setHardwareScalingLevel(hi?mobile?.88:.76:mobile?1.30:1.14);
      if(cinematic.pipeline)cinematic.pipeline.bloomEnabled=hi;
      $('graphicToggle').textContent=hi?'GRAFICA: CINEMA':'GRAFICA: FLUIDA';
      engine.resize();});
    $('start').addEventListener('click',()=>{if(!scene){error('Il motore grafico non è pronto. Ricarica la pagina.');return;}try{const AC=window.AudioContext||window.webkitAudioContext;if(AC&&!game.audio)game.audio=new AC();game.audio?.resume?.();reset();}catch(ex){error('Avvio interrotto: '+ex.message)}});
    $('restart').addEventListener('click',reset);window.addEventListener('resize',()=>engine?.resize());window.addEventListener('orientationchange',()=>setTimeout(()=>engine?.resize(),220));
    document.addEventListener('visibilitychange',()=>{last=performance.now();inputs.keys.clear();inputs.axisX=inputs.axisY=0;knob.style.transform='translate(0,0)';});
    document.addEventListener('contextmenu',e=>e.preventDefault());
  }
  async function checkForUpdate(){try{const r=await fetch('./version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;
    const v=await r.json();if(v.version&&v.version!=='1.2.0'){
      const btn=$('updateBanner');if(btn){btn.classList.remove('hidden');btn.textContent='✦ Nuovo Alohomora '+v.version+' disponibile · Tocca per aggiornare';}
    }}catch(e){}}
  function boot(){if(!B){error('Impossibile caricare Babylon.js. Verifica la connessione Internet e ricarica.');return;}
    try{sceneSetup();controls();
      $('updateBanner')?.addEventListener('click',()=>location.reload());
      checkForUpdate();setInterval(checkForUpdate,15*60*1000);
      last=performance.now();engine.runRenderLoop(tick);$('load').textContent='Mondo pronto · premi Entra nel mondo magico';}
    catch(e){console.error(e);error('Errore nella scena 3D: '+e.message);}
  }
  window.addEventListener('error',e=>{if(!$('intro').classList.contains('hidden')){error('Il caricamento è stato interrotto: '+e.message)}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();