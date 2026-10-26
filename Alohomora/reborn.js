/* ALOHOMORA · REBORN, Chapter I — experimental mobile 3D vertical slice.
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
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const mix=(a,b,f)=>a+(b-a)*f;
  const distance=(a,b,c,d)=>Math.hypot(a-c,b-d);
  const V = (x,y,z)=>new B.Vector3(x,y,z);
  const rand=(x,y)=> {let k=Math.sin(x*132.71+y*96.28)*43758.5453;return k-Math.floor(k)};
  function error(message){const e=$('error');e.textContent=message;e.style.display='block';$('load').textContent='Problema tecnico · '+message;}
  function toast(message,seconds=2.7){$('toast').textContent=message;$('toast').classList.add('show');game.toastTimeout=seconds;}
  function audio(freq=330,duration=.19,mode='sine',volume=.038){try{const c=game.audio;if(!c)return;const osc=c.createOscillator(),gain=c.createGain(),t=c.currentTime;osc.type=mode;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.56),t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain).connect(c.destination);osc.start();osc.stop(t+duration+.02)}catch(e){}}
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
    const earth=material('highland ground','#4a5b52',{spec:'#161f1b'});earth.diffuseTexture=noiseTexture('heather and damp moss','#4b5b4e','#64705b');earth.diffuseTexture.uScale=26;earth.diffuseTexture.vScale=26;
    const plane=B.MeshBuilder.CreateGround('Scottish moor',{width:210,height:210,subdivisions:2},scene);plane.material=earth;plane.receiveShadows=true;
    const floor=B.MeshBuilder.CreateGround('quadrangle cobbles',{width:49,height:62},scene);floor.position.z=-12;floor.position.y=.035;floor.material=stone;floor.receiveShadows=true;
    const pathMat=material('walkway flagstones','#777c79',{spec:'#2a3034'});const ptex=noiseTexture('mottled stones','#858780','#777b76','stone');ptex.uScale=1.4;ptex.vScale=1.4;pathMat.diffuseTexture=ptex;
    const tile=box('flagstone source',1.26,.12,1.42,0,-1000,0,pathMat);/* source stone remains far outside the playable map; instances stay visible */
    for(let z=22;z>-38;z-=1.35)for(let x=-3.7;x<4.3;x+=1.32){const f=tile.createInstance('weathered paving');f.setEnabled(true);f.position.set(x+(rand(x,z)-.5)*.15,.11,z+(rand(z,x)-.5)*.12);f.rotation.y=(rand(x*9,z*8)-.5)*.08;}
    return {stone,earth};}
  function forest(){const trunk=material('black fir bark','#332d2d'),foliage=material('wet needles','#172f2c'),foliage2=material('north fir','#243b34'),rock=material('slate','#48515a',{spec:'#1b2429'});
    const log=cylinder('instanced log',.20,.30,3,0,-1000,0,trunk);/* source trunk offscreen */
    const leaves=cylinder('instanced fir',0,4.2,8,0,-1000,0,foliage,7);/* source canopy offscreen */
    const leaves2=cylinder('instanced fir b',0,3.5,7,0,-1000,0,foliage2,7);/* source alternate canopy offscreen */
    for(let i=0;i<165;i++){let x=(rand(i,1)*2-1)*102,z=(rand(i,2)*2-1)*103;if(Math.abs(x)<31&&z>-69&&z<47)continue;let sy=.8+rand(i,5)*1.5;
      const a=log.createInstance('ancient fir trunk');a.setEnabled(true);a.position.set(x,1.5*sy,z);a.scaling.setAll(sy);
      const b=(i%3===0?leaves2:leaves).createInstance('fir canopy');b.setEnabled(true);b.position.set(x,5.4*sy,z);b.scaling.setAll(sy);
    }
    for(let i=0;i<50;i++){const x=rand(i,66)*125-63,z=rand(i,41)*150-75;if(Math.abs(x)<28&&z<36&&z>-57)continue;const r=sphere('mossy boulder',1.3+rand(i,6)*2,x,.45,z,rock,5);r.scaling.y=.5;r.rotation.y=rand(i,7)*6.2;}
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
  function lantern(x,z){const dark=material('lantern black iron','#2d2d2f',{spec:'#877763'}),flame=material('lantern fire','#ce853c',{emissive:'#f89e41'});
    cylinder('lamp column',.16,.29,4.9,x,2.5,z,dark,8);box('bronze lamp base',.8,.38,.8,x,5.00,z,dark);
    sphere('fire behind glass',.47,x,5.4,z,flame,9);
    const l=new B.PointLight('torchlight',V(x,5.35,z),scene);l.diffuse=B.Color3.FromHexString('#ffb86f');l.intensity=mobile?.45:.65;l.range=13;
    game.torches.push({light:l,phase:rand(x,z)*7});
  }
  function glints(){const mat=material('luminescent insects','#96ba9b',{emissive:'#b9bf83'});for(let i=0;i<45;i++){let x=(rand(i,12)-.5)*67,z=(rand(i,32)-.5)*70;const p=sphere('floating motes',.06+rand(i,2)*.07,x,1.5+rand(i,77)*5,z,mat,4);fx.push({mesh:p,origin:p.position.clone(),phase:i*1.75,kind:'mote'});}}
  function sceneSetup(){
    engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:false},false);
    engine.setHardwareScalingLevel(mobile?1.12:1);
    scene=new B.Scene(engine);scene.clearColor=new B.Color4(.07,.09,.13,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.0057;scene.fogColor=B.Color3.FromHexString('#5f6871');
    scene.imageProcessingConfiguration.toneMappingEnabled=true;
    scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure=1.08;scene.imageProcessingConfiguration.contrast=1.24;
    cam=new B.UniversalCamera('first-person camera',V(-1,1.72,27),scene);
    cam.minZ=.08;cam.maxZ=380;cam.fov=mobile?1.33:1.17;cam.rotation.y=Math.PI;scene.activeCamera=cam;
    ambient=new B.HemisphericLight('sky light',V(.15,1,.05),scene);ambient.intensity=.69;ambient.diffuse=B.Color3.FromHexString('#a1adbc');ambient.groundColor=B.Color3.FromHexString('#393e3e');
    sun=new B.DirectionalLight('dying sunlight',V(-.45,-.94,-.28),scene);sun.intensity=1.28;sun.diffuse=B.Color3.FromHexString('#d5bca2');sun.position=V(35,82,40);
    let shadows=null;try{shadows=new B.ShadowGenerator(mobile?512:1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=mobile?2:4;}catch(e){}
    const skyMat=new B.StandardMaterial('gradient sky',scene);skyMat.disableLighting=true;skyMat.backFaceCulling=false;skyMat.emissiveColor=new B.Color3(1,1,1);skyMat.diffuseColor=new B.Color3(0,0,0);
    const st=new B.DynamicTexture('winter sky',{width:1024,height:512},scene,false);let ctx=st.getContext();let grad=ctx.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#101828');grad.addColorStop(.48,'#5a6570');grad.addColorStop(.78,'#9a7e76');grad.addColorStop(1,'#bba39b');ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);for(let i=0;i<110;i++){const a=rand(i,100)*1024,b=rand(i,400)*135;ctx.fillStyle=`rgba(255,251,234,${.15+rand(i,50)*.38})`;ctx.fillRect(a,b,1.25,1.25)}st.update(false);skyMat.emissiveTexture=st;
    sky=B.MeshBuilder.CreateSphere('weathered sky dome',{diameter:720,segments:24,sideOrientation:B.Mesh.BACKSIDE},scene);sky.material=skyMat;sky.infiniteDistance=true;sky.isPickable=false;sky.applyFog=false;
    stoneGround();forest();const mats=architecture();
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
  function burst(pos,color,count=15,force=2.2){const m=glowy(color);for(let i=0;i<count;i++){let a=i*2.399+rand(i,phase),c=rand(i,4)*2-1,v=Math.sqrt(1-c*c)*force;let p=sphere('spell sparks',.085+rand(i,7)*.12,pos.x,pos.y,pos.z,m,6);fx.push({kind:'spark',mesh:p,life:.44+rand(i,9)*.6,vx:Math.cos(a)*v,vy:c*force+1,vz:Math.sin(a)*v});}}
  function spawnBolt(from,target,hostile){const c=hostile?'#b92f48':'#ef755d',mat=glowy(c);const orb=sphere(hostile?'hostile hex':'your spell',hostile?.42:.33,from.x,from.y,from.z,mat,12);const dir=target.subtract(from).normalize();const point=new B.PointLight('spell light',orb.position.clone(),scene);point.diffuse=B.Color3.FromHexString(c);point.intensity=hostile?.7:1.0;point.range=4.3;
    projectiles.push({mesh:orb,light:point,dir,hostile,speed:hostile?12:27,life:hostile?2.4:1.25});
    audio(hostile?230:680,.17,'sawtooth',.034);
  }
  function cast(){if(!game.running||game.ended)return;const s=spells[game.spell];if(game.mana<s.cost){toast('Il potere magico si sta rigenerando');audio(115,.16);return;}
    game.mana-=s.cost;game.pulse=.38;const eye=cam.position.clone(),forward=cam.getForwardRay(1).direction.normalize();const from=eye.add(forward.scale(1.2)).add(V(.1,-.09,0));
    if(game.spell===0){spawnBolt(from,from.add(forward.scale(40)),false);toast('Stupeficium',.8);}
    else if(game.spell===1){let target=null,dMin=99;for(const p of props){const to=p.mesh.position.subtract(eye),d=to.length(),a=B.Vector3.Dot(to.normalize(),forward);if(d<19&&a>.62&&d<dMin){target=p;dMin=d;}}if(target){const dv=eye.subtract(target.mesh.position).normalize();target.vx+=dv.x*12;target.vy+=5.8;target.vz+=dv.z*12;burst(target.mesh.position,'#dec18a');toast('Accio · oggetto attirato');}else toast('Accio · punta verso un oggetto');audio(500,.28,'triangle');}
    else if(game.spell===2){game.lumos=!game.lumos;wandLight.intensity=game.lumos?2.6:0;toast(game.lumos?'Lumos · la luce risponde':'Nox · oscurità');audio(740,.44);}
    else if(game.spell===3){game.shield=2.4;game.shieldPulse=0;toast('Protego · barriera attiva');burst(eye,'#6ebae1',20,1.6);audio(510,.4,'sine');}
    else if(game.spell===4){game.revealed=true;portalCore.setEnabled(true);game.sealRing.setEnabled(true);burst(V(0,5,-44.4),'#bdb4ed',28);toast('Revelio · un sigillo appare sul portale',3.3);audio(860,.5);}
    updateHUD();
  }
  function updateHUD(){ $('hpNum').textContent=Math.round(game.hp);$('hpBar').style.width=game.hp+'%';$('manaBar').style.width=game.mana+'%';$('enemyBar').style.width=(Math.max(0,enemy.hp)/5*100)+'%';
    $('enemyCard').classList.toggle('hidden',!enemy.alive||distance(cam.position.x,cam.position.z,enemy.x,enemy.z)>26);
    $('objective').textContent=enemy.alive?'Sconfiggi il Custode dell’Ombra (✦ Stupeficium)':'Cerca la porta sigillata. Revelio la rivela, E la apre.';
  }
  function win(){game.ended=true;game.running=false;$('hud').classList.add('hidden');$('finished').classList.remove('hidden');$('finishTag').textContent='CAPITOLO I · COMPLETATO';$('finishTitle').textContent='La porta si è aperta';$('finishText').textContent='Il Custode è stato sconfitto e il primo segreto di Hogwarts è nelle tue mani. Questo è solo l’inizio del nuovo Alohomora.';audio(780,.9);}
  function lose(){game.ended=true;game.running=false;$('hud').classList.add('hidden');$('finished').classList.remove('hidden');$('finishTag').textContent='IL CORTILE È CADUTO';$('finishTitle').textContent='La notte prevale';$('finishText').textContent='Il Custode ti ha sopraffatto. Torna nel cortile, cambia incantesimi e usa Protego per deviare i suoi attacchi.';}
  const inputs={keys:new Set(),axisX:0,axisY:0,joyId:null,lookId:null,px:0,py:0};
  function reset(){game.hp=100;game.mana=100;game.shield=0;game.lumos=false;game.revealed=false;game.ended=false;game.vx=game.vz=game.vy=game.airborne=0;game.yaw=Math.PI;game.pitch=0;game.running=true;game.spell=0;game.pulse=0;game.bob=0;enemy.hp=5;enemy.alive=true;enemy.death=0;enemy.mode='idle';enemy.stun=0;enemy.windup=0;enemy.cool=3;enemy.x=6;enemy.z=-8;enemy.root.position.set(6,0,-8);enemy.root.rotation.set(0,0,0);enemy.root.setEnabled(true);if(enemy.modelReady)playEnemyAnim('Idle');for(const p of props){p.x=p.homeX;p.z=p.homeZ;p.y=.56;p.mesh.position.set(p.x,p.y,p.z);p.vx=p.vy=p.vz=0;}
    cam.position.set(-1,1.72,27);cam.rotation.set(0,Math.PI,0);portalCore.setEnabled(false);game.sealRing.setEnabled(false);wandLight.intensity=0;
    $('intro').classList.add('hidden');$('finished').classList.add('hidden');$('hud').classList.remove('hidden');$('interact').classList.add('hidden');
    selectSpell(0);updateHUD();toast('Attraversa il cortile e preparati al duello',4);
  }
  function selectSpell(i){game.spell=clamp(i,0,spells.length-1);document.querySelectorAll('.spell').forEach((el,j)=>el.classList.toggle('selected',j===game.spell));audio(350+game.spell*100,.08,'sine',.014);}
  function movePlayer(dt){const yaw=game.yaw,axisX=inputs.axisX+(inputs.keys.has('d')||inputs.keys.has('arrowright')?1:0)-(inputs.keys.has('a')||inputs.keys.has('arrowleft')?1:0),axisY=inputs.axisY+(inputs.keys.has('w')||inputs.keys.has('arrowup')?1:0)-(inputs.keys.has('s')||inputs.keys.has('arrowdown')?1:0);
    const l=Math.max(1,Math.hypot(axisX,axisY)),sx=axisX/l,sy=axisY/l;const desiredX=(-Math.cos(yaw)*sx+Math.sin(yaw)*sy)*4.8,desiredZ=(Math.sin(yaw)*sx+Math.cos(yaw)*sy)*4.8;
    game.vx=mix(game.vx,desiredX,Math.min(1,dt*8));game.vz=mix(game.vz,desiredZ,Math.min(1,dt*8));
    const test=(x,z)=>{if(x< -91||x>91||z>88||z<-91)return false;for(const r of colliders){if(Math.abs(x-r.x)<r.w/2+.64&&Math.abs(z-r.z)<r.d/2+.64)return false}return true};
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
  function updateProjectiles(dt){for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.life-=dt;p.mesh.position.addInPlace(p.dir.scale(p.speed*dt));p.light.position.copyFrom(p.mesh.position);const pos=p.mesh.position;
      if(p.hostile){const d=B.Vector3.Distance(pos,cam.position);if(d<1.2&&game.running){if(game.shield>0){burst(pos,'#78bedd',22,2.9);toast('Protego · incantesimo deviato');audio(730,.36,'triangle');}else{game.hp=Math.max(0,game.hp-19);$('hitFlash').style.opacity='.85';setTimeout(()=>$('hitFlash').style.opacity='0',170);audio(120,.24,'sawtooth',.06);if(game.hp<=0)lose();}p.life=0;updateHUD();}}
      else if(enemy.alive&&B.Vector3.Distance(pos,V(enemy.x,2.05,enemy.z))<1.7){enemy.hp--;enemy.stun=.62;enemy.root.rotation.z=-.13;burst(pos,'#df7a6a',24,3.5);toast(enemy.hp>0?'Il Custode vacilla!':'Il Custode è sconfitto',2);p.life=0;audio(190,.38,'sawtooth',.05);if(enemy.hp<=0){enemy.alive=false;enemy.death=0;game.kills++;burst(V(enemy.x,2,enemy.z),'#e4c18a',60,3.8);updateHUD();toast('Il sigillo del portale si è indebolito. Usa Revelio.',4);}}
      if(p.life<=0||Math.abs(pos.x)>110||Math.abs(pos.z)>110){p.mesh.dispose();p.light.dispose();projectiles.splice(i,1);}
    }}
  function updateEffects(dt){for(let i=fx.length-1;i>=0;i--){const f=fx[i];if(f.kind==='mote'){const tt=phase+f.phase;f.mesh.position.set(f.origin.x+Math.sin(tt*.51)*.9,f.origin.y+Math.cos(tt*.7)*.28,f.origin.z+Math.cos(tt*.39)*1.2);continue;}
      f.life-=dt;f.mesh.position.x+=f.vx*dt;f.mesh.position.y+=f.vy*dt;f.mesh.position.z+=f.vz*dt;f.vy-=4.8*dt;f.mesh.scaling.setAll(Math.max(.05,f.life*1.2));if(f.life<=0){f.mesh.dispose();fx.splice(i,1);}
    }}
  function updatePortal(dt){if(!portalCore)return;if(game.revealed){portalCore.rotation.z+=dt*.15;portalCore.scaling.x=1+Math.sin(phase*1.9)*.12;portalCore.scaling.y=1+Math.cos(phase*1.7)*.12;game.sealRing.rotation.y+=dt*.13;}
    const near=distance(cam.position.x,cam.position.z,0,-39.2)<7.0;
    $('interact').classList.toggle('hidden',!(near&&game.running&&!enemy.alive));
  }
  function interact(){if(!game.running)return;if(distance(cam.position.x,cam.position.z,0,-39.2)>7){toast('Nulla da esaminare qui');return;}
    if(enemy.alive){toast('Un incantesimo antico protegge la porta. Sconfiggi il Custode.');return;}
    if(!game.revealed){toast('Il portale è nascosto. Lancia Revelio.');return;}
    burst(V(0,5.0,-44), '#e8cb90',75,5);win();}
  function tick(){const now=performance.now(),dt=clamp((now-last)/1000,.001,.042);last=now;phase+=dt;effectClock+=dt;
    sky.position.copyFrom(cam.position);
    for(const torch of game.torches)torch.light.intensity=(mobile?.52:.72)+Math.sin(phase*10+torch.phase)*.065;
    if(game.running){movePlayer(dt);updateEnemy(dt);updateProps(dt);updateProjectiles(dt);game.mana=Math.min(100,game.mana+dt*7.6);game.shield=Math.max(0,game.shield-dt);game.pulse=Math.max(0,game.pulse-dt);updatePortal(dt);if(game.toastTimeout>0){game.toastTimeout-=dt;if(game.toastTimeout<=0)$('toast').classList.remove('show');}}
    else{if(!game.ended){cam.rotation.y=Math.PI+Math.sin(phase*.20)*.045;cam.rotation.x=-.025;}updateEnemy(dt)}
    updateEffects(dt);if(game.running&&effectClock>.1){updateHUD();effectClock=0;}
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
    document.addEventListener('keydown',e=>{let key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();inputs.keys.add(key);if(!game.running)return;if(key==='e')interact();if(key===' ')jump();if(key>='1'&&key<='5')selectSpell(Number(key)-1);if(key==='q')selectSpell((game.spell+4)%5);if(key==='f')cast();});
    document.addEventListener('keyup',e=>inputs.keys.delete(e.key.toLowerCase()));
    document.querySelectorAll('.spell').forEach((b,i)=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();selectSpell(i)}));
    $('cast').addEventListener('pointerdown',e=>{e.preventDefault();cast()});$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump()});
    $('interact').addEventListener('pointerdown',e=>{e.preventDefault();interact()});
    $('start').addEventListener('click',()=>{if(!scene){error('Il motore grafico non è pronto. Ricarica la pagina.');return;}try{const AC=window.AudioContext||window.webkitAudioContext;if(AC&&!game.audio)game.audio=new AC();game.audio?.resume?.();reset();}catch(ex){error('Avvio interrotto: '+ex.message)}});
    $('restart').addEventListener('click',reset);window.addEventListener('resize',()=>engine?.resize());window.addEventListener('orientationchange',()=>setTimeout(()=>engine?.resize(),220));
    document.addEventListener('visibilitychange',()=>{last=performance.now();inputs.keys.clear();inputs.axisX=inputs.axisY=0;knob.style.transform='translate(0,0)';});
    document.addEventListener('contextmenu',e=>e.preventDefault());
  }
  function boot(){if(!B){error('Impossibile caricare Babylon.js. Verifica la connessione Internet e ricarica.');return;}
    try{sceneSetup();controls();last=performance.now();engine.runRenderLoop(tick);$('load').textContent='Mondo pronto · premi Entra nel mondo magico';}
    catch(e){console.error(e);error('Errore nella scena 3D: '+e.message);}
  }
  window.addEventListener('error',e=>{if(!$('intro').classList.contains('hidden')){error('Il caricamento è stato interrotto: '+e.message)}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();