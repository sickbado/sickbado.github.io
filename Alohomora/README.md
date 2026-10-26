# Alohomora — Reborn 1.0 (experimental vertical slice)

**Play:** https://sickbado.github.io/Alohomora/

This is a deliberate redesign that replaces the former procedurally-rendered open-world prototype with a small, atmospheric chapter: the Hogwarts north courtyard, a duelling enemy, magic interactions, and a gate puzzle.

**Engine:** Babylon.js/WebGL, scripted rigid-object motion and projectile interactions, custom procedural textures, PBR-inspired tone mapping and atmospheric lighting, optional animated GLB enemy.

**Device:** iPhone Safari (landscape recommended), desktop browser. The previous version is still available through Git history, not maintained as the active experience.

**Controls:** left touch joystick to walk, drag elsewhere to look, wand button to cast, spell dock to select. PC: WASD, mouse movement after clicking, mouse button/F to cast, 1–5 for spells, E to interact, space to jump.

**Gameplay:** Defeat the Shadow Keeper with Stupeficium, defend with Protego, then use Revelio and interact near the castle gate. Accio moves physical props; Lumos toggles the wand light.

**Scope honestly:** This is a visual prototype, not a finished RPG. Ragdoll articulated simulation, interiors, train, realistic crowd AI, and school quests are not implemented in this reboot. A physical import model is optional; a sculpted fantasy opponent provides fallback if the asset is unavailable. Physics here is simplified, not a full Havok simulation.

**Third-party dependency and model:** Babylon.js CDN is an engine dependency. The optional GLB animated character is the `Soldier.glb` from the three.js examples repository (MIT-licensed example materials; verify specific source redistribution rights before commercial use). All procedural castle meshes, textures, HUD and gameplay logic are generated in this project. Names referring to the Harry Potter world are fan-inspired and not an official or affiliated product.