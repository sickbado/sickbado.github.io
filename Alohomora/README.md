# Alohomora Reborn — Cinematic Magic 1.1

Gioca dal browser (Safari su iPhone o desktop): https://sickbado.github.io/Alohomora/

## Nuova versione 1.1
- Motore Babylon.js, missione nel cortile gotico della scuola, combattimento con un Custode.
- **Stupeficium**: sfere magiche animate, scie di particelle, luce, colpi e onde d'urto.
- **Protego**: barriera semitrasparente attorno al giocatore; i proiettili nemici vengono riflessi contro il Custode.
- **Lumos**: luce dinamica, bagliore alla punta della bacchetta, pulsazione naturale.
- **Accio**: interazione fisica con gli oggetti e onde magiche al bersaglio.
- **Revelio**: onda espansiva, particelle e reazione del sigillo.
- Bloom, color grading, nebbia e audio sintetizzato multistrato, senza aggiungere file audio pesanti.
- Gestione adattiva del bloom su dispositivi mobile con FPS in difficoltà.

## Comandi
- iPhone: joystick, trascina sul mondo per guardare, scegli un incantesimo in basso, ✦ per lanciare.
- Desktop: WASD + mouse per guardare, F o clic con blocco puntatore per lanciare, tasti 1–5 per scegliere la magia, E per interagire, Spazio per saltare.

## Architettura
- `index.html`: struttura del gioco, HUD, controlli touch.
- `reborn.js`: scena Babylon.js, logica di combattimento, effetti, movimento, gestione FPS.
- modello GLB esemplificativo (caricato opzionalmente dalla distribuzione pubblica di three.js, soggetto a disponibilità); fallback procedurale.
- Babylon.js e relativo loader distribuiti da CDN, quindi occorre connettività.

## Limiti
La 1.1 è una demo tecnica, non un open world completo, né un prodotto ufficiale Harry Potter. L'effetto ragdoll fisico articolato e i personaggi professionali con animazioni dedicate sono da realizzare. Il profilo prestazionale è stato progettato pensando a Safari iPhone, ma richiede test su dispositivo reale.