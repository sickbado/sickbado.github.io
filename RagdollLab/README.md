# Ragdoll Lab — Mobile

Progetto 3D originale e indipendente, pensato per Safari su iPhone e distribuito come Progressive Web App (PWA). Non è una conversione ufficiale di **Project C.A.R.L.** e non incorpora sorgenti o asset protetti di quel titolo.

## Versione disponibile — 0.2

- Movimento in prima persona con joystick touch, visuale mediante trascinamento e comandi sparo/presa
- Laboratorio 3D, torre di caduta sperimentale da 16 metri, modalità a ondate
- Ragdoll multi-articolato con vincoli di distanza
- Sei categorie di armi con effetti differenziati: 9mm, SMG, AK, .308, fucile a pompa, granata
- Physics gun, sgancio del manichino, effetti di colpo, danni localizzati, reazione agli impatti
- Prototipo sanitario: parametri di sangue, encefalo, cuore, polmoni, fegato, emorragia e fratture
- Vista RX con organi semplificati in 3D
- Salvataggio come app dalla schermata Home iOS (Safari > Condividi > Aggiungi alla schermata Home)

## Differenze sostanziali dall'originale

Le interazioni attuali sono una simulazione semplificata. Il gioco originale usa un modello scheletrico/anatomico proprietario e simulazioni avanzate di lesioni, sistema vascolare, balistica, sanguinamento e comportamento fisico, sviluppati in Unity. Per ottenere la **stessa identica esperienza** è necessario il progetto Unity originale, il suo codice sorgente, gli asset autorizzati e il porting iOS con ottimizzazioni specifiche. L'archivio Windows 0.8.71 contiene un prodotto Unity compilato (IL2CPP), non i sorgenti riutilizzabili per ricostruire direttamente l'app iOS.

## Roadmap — fedeltà funzionale

1. Sostituire il solver dei vincoli con ragdoll articolati rigidi e collisioni reali usando un motore fisico 3D.
2. Modellare un umano originale con scheletro e organi anatomici più dettagliati.
3. Rendere i danni dipendenti dalla penetrazione e dall'energia del singolo proiettile e dalle strutture anatomiche colpite.
4. Simulare volume ematico, emorragie da ferita, macchie e raccolte sul suolo più fedeli, entro i limiti prestazionali dell'iPhone.
5. Ricostruire ambienti e oggetti mobili con meccaniche di interazione, migliorando texture, animazioni e audio.
6. Migliorare AI degli zombie, armi, interfaccia e sessioni più lunghe.
7. Profilazione WebGL/Safari su iPhone reale, riduzione memoria, tuning per 30/60 FPS.

## Esecuzione

Aprire https://sickbado.github.io/RagdollLab/ da Safari. Serve una connessione alla prima apertura per caricare il motore 3D. Le risorse già caricate possono essere conservate in cache, ma la disponibilità completamente offline non è ancora certificata.

## Proprietà intellettuale

Il progetto è una creazione indipendente ispirata al genere sandbox fisico; non deve essere presentato come un prodotto ufficiale, né distribuire asset originali di terzi senza autorizzazione.
