import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url);
const js=fs.readFileSync(new URL('reborn.js',root),'utf8'),html=fs.readFileSync(new URL('index.html',root),'utf8'),ver=JSON.parse(fs.readFileSync(new URL('version.json',root),'utf8'));
assert.equal(ver.version,'1.2.1');
for(const marker of ['function worldExpansion()', 'function spawnLivingActors()', 'function updateLivingWorld(dt)', 'function drawMinimap()', 'function checkForUpdate()', 'function updateEnemy(dt)', 'function sceneSetup()', 'function boot()', 'B.SceneLoader.ImportMeshAsync', 'function cast()'])assert.ok(js.includes(marker),`JS missing ${marker}`);
for(const marker of ['id="start"','id="game"','id="minimap"','id="mapToggle"','id="mapPanel"','id="graphicToggle"','id="worldTime"','id="updateBanner"','reborn.js?v=121'])assert.ok(html.includes(marker),`HTML missing ${marker}`);
const ids=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);const missing=[...new Set(ids)].filter(id=>!html.includes(`id="${id}"`));assert.deepEqual(missing,[],`JS references to missing HTML ids: ${missing.join(', ')}`);
// Regression: the 2D canvas transform must not accumulate on repeated minimap draws.
const minimap=js.slice(js.indexOf('function drawMinimap()'),js.indexOf('function updateWorldHUD()'));
assert.ok(minimap.includes('g.setTransform(1,0,0,1,0,0)'), 'Minimap must reset canvas transform');
const positions=[];
const ctx={
  tx:0,ty:0,stack:[],
  setTransform(a,b,c,d,e,f){this.tx=e;this.ty=f;},
  save(){this.stack.push([this.tx,this.ty]);},
  restore(){[this.tx,this.ty]=this.stack.pop();},
  translate(x,y){this.tx+=x;this.ty+=y;},
  rotate(){},clearRect(){positions.push([this.tx,this.ty]);},
  fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},closePath(){},fill(){}
};
const fakeCanvas={width:160,height:160,getContext:()=>ctx};
const draw=new Function(' ${ver.version} — ${ids.length} DOM links, 5 territories, NPCs, train, day/night and update check.`);,'cam','landmarks','world','game',minimap+'return drawMinimap;')(
  ()=>fakeCanvas,{position:{x:12,z:20}},[{x:0,z:0}],{actors:[]},{yaw:1.1});
draw();draw();draw();
assert.deepEqual(positions,[[0,0],[0,0],[0,0]],'Minimap redraw should clear at origin');
assert.deepEqual([ctx.tx,ctx.ty,ctx.stack.length],[0,0,0],'Minimap must restore 2D context state');
console.log(`PASS Alohomora ${ver.version} — ${ids.length} DOM links, 5 territories, NPCs, train, day/night and update check.`);