# Alohomora — The Living Highlands 1.2

Fan-made, unofficial fantasy adventure playable in Safari on iPhone and in desktop browsers. The project is **not** affiliated with Warner Bros., J. K. Rowling or the Harry Potter franchise.

**Play:** https://sickbado.github.io/Alohomora/

## New in v1.2

- The explorable environment now includes the northern Hogwarts courtyard, Hogsmeade (18 cottages and stalls), Hogsmeade Station with a moving Hogwarts Express, the Forbidden Forest with a ring of standing stones, and the shore of the Black Lake.
- Dynamic NPCs: 14 characters in five roles, with day-to-day wandering, dialogue, healing, guards and roaming hostile shadows. They use authored finite-state/routine AI, **not** a generative language model.
- Environmental simulation: day/night cycle, atmospheric color adaptation, dynamic fog, passing showers, lantern illumination and train movement.
- Interactions: talk to NPCs, recover health from a healer, board and leave the train, defeat shades, unlock the portal and continue exploring instead of ending after the first quest.
- Minimap, regional location display, discoverable zones, XP rewards, sprint and graphics quality toggle.
- Local saving of the in-game day and location discoveries. Progress stays on this browser only. Refreshing still restarts the player at Hogwarts.
- Lightweight update metadata in `version.json` and an in-game new-version notification. Website automatically deploys from the GitHub Pages repository after a commit.

## Controls

**iPhone:** left joystick to move, swipe on scenery to look, tap the magical rune ✦ to cast, choose among five spells, ↑ to jump, contextual ✋ button to speak / board train / interact, ⌖ to see the map.

**Desktop:** WASD move, Shift sprint, mouse aim, F / left click cast, number keys 1–5 choose spell, E interact, M map, Space jump.

## Known limitations

This is a procedural browser prototype, **not** photorealistic AAA software or a seamless fully simulated open world. NPCs are simplified, building interiors are not yet explorable, the moving train has simple boarding (riding follows the locomotive), the physical system is handcrafted rather than full-body simulation, and the new world may need tuning for Safari iPhone. Main skinned enemy is a third-party open example `Soldier.glb` from the three.js example collection; it is downloaded on demand and falls back to a procedural enemy if offline. A network connection is required to load Babylon.js.

## Safety / deployment

The game is stored in `Alohomora/index.html` and `Alohomora/reborn.js` in `sickbado/sickbado.github.io`. `version.json` declares the live version. Update the game by committing code to the repository; GitHub Pages automatically publishes it. For any future autonomous review, test changes and verify the deployment, never assume that a scheduled run successfully delivered improvements.