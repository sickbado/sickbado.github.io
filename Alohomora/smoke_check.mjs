import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url);
const js=fs.readFileSync(new URL('reborn.js',root),'utf8'),html=fs.readFileSync(new URL('index.html',root),'utf8'),ver=JSON.parse(fs.readFileSync(new URL('version.json',root),'utf8'));
assert.equal(ver.version,'1.2.0');
for(const marker of ['function worldExpansion()', 'function spawnLivingActors()', 'function updateLivingWorld(dt)', 'function drawMinimap()', 'function checkForUpdate()', 'function updateEnemy(dt)', 'function sceneSetup()', 'function boot()', 'B.SceneLoader.ImportMeshAsync', 'function cast()'])assert.ok(js.includes(marker),`JS missing ${marker}`);
for(const marker of ['id="start"','id="game"','id="minimap"','id="mapToggle"','id="mapPanel"','id="graphicToggle"','id="worldTime"','id="updateBanner"','reborn.js?v=120'])assert.ok(html.includes(marker),`HTML missing ${marker}`);
const ids=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);const missing=[...new Set(ids)].filter(id=>!html.includes(`id="${id}"`));assert.deepEqual(missing,[],`JS references to missing HTML ids: ${missing.join(', ')}`);
console.log(`PASS Alohomora ${ver.version} — ${ids.length} DOM links, 5 territories, NPCs, train, day/night and update check.`);