# GBR Web Sandbox — iPhone
[Avvia il gioco](https://sickbado.github.io/GBR-Web/)

**Versione web originale e indipendente**, ideata per giocare da Safari su iPhone. Non è il porting ufficiale di GBR+ né una conversione automatica dell'APK Android. Non usa codice, modelli o mappe estratte dall'APK per la pubblicazione. I nomi delle ambientazioni sono usati per orientare chi conosce il titolo di riferimento, ma gli scenari sono ricreati con geometrie originali.

## Funzionalità implementate
- Tre scenari 3D esplorabili: Plains (prateria), Pit Valley (deserto con ponte), Facility (complesso industriale).
- Movimento e visuale FPS con controlli touch ottimizzati per iPhone in orizzontale, salto e comandi per tastiera.
- NPC originali articolati con animazione di movimento, ferite localizzate, caduta ragdoll, nemici che inseguono il giocatore.
- Toolbox: afferra e lancia oggetti e personaggi.
- Menu sandbox per generare NPC, nemici, casse, barili, palle e piccoli impilamenti.
- Armi originali 9mm, SMG, shotgun e rifle con ricarica, effetti visivi e sonori; corpo a corpo con leva.
- Contatore NPC/FPS, salute, munizioni, feedback agli impatti.
- Link installabile dalla schermata Home di Safari; cache di avvio best-effort dopo prima apertura online.

## iPhone
1. Apri https://sickbado.github.io/GBR-Web/ in **Safari** (evita il browser integrato di altre app se WebGL non è disponibile).
2. Ruota il telefono in orizzontale, scegli la mappa, premi **Entra nel mondo**.
3. Joystick sinistro = movimento; trascinamento sullo scenario = visuale; ● = usa arma/Tool; ↑ = salto; USA = usa Tool, ricarica o posiziona un oggetto.
4. + CREA apre il menu di generazione; scegli un oggetto e premi USA per posizionarlo.
5. Per un accesso rapido, Condividi → **Aggiungi alla schermata Home**.

## Browser desktop
- WASD: muovi; trascina per orientare il punto di vista.
- Click: usa l'arma; R: ricarica; E: usa Tool; spazio: salto.
- 1–6: seleziona lo strumento; Esc: menu.

## Limiti
Questo è un sandbox originale funzionante, non una riproduzione 1:1 del gioco Android. La simulazione ragdoll usa vincoli di posizione semplificati e non riproduce la biomeccanica Unity originale. Multigiocatore, editor avanzato, sistemi di mod, tutte le scene e i veicoli dell'APK non sono implementati. L'uso offline completo e le prestazioni su iPhone reale non sono ancora garantiti. Il contenuto dell'APK è stato solo analizzato privatamente per identificare componenti e caratteristiche, non copiato nel sito.

## Struttura
- index.html: gioco, interfaccia, scenari originali, fisica e controlli (standalone, Three.js CDN).
- manifest.webmanifest, icon.svg, sw.js: installazione come PWA e cache.

Questo progetto non è affiliato allo sviluppatore di GBR+ o F2Games.
