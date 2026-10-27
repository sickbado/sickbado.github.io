# Ragdoll Lab — iPhone Edition 1.0

**Gioca:** https://sickbado.github.io/RagdollLab/

Videogioco 3D originale per Safari su iPhone, nato come alternativa indipendente per chi desidera un simulatore ragdoll, con sandbox fisico, armi, impatti e diagnostica. **Non è la versione ufficiale né una conversione identica di Project C.A.R.L.** Non utilizza né distribuisce i modelli, le scene o il codice proprietario del gioco Windows.

## Contenuti dell'edizione consolidata

- **Tre modalità:** laboratorio di ricerca con più manichini, torre per test di caduta da 16 metri, sopravvivenza a ondate con nemici in movimento.
- **Personaggi più elaborati:** figure costruite con forme organiche, testa e volto, uniformi, scarpe e dettagli 3D. Respirazione, camminata, reazioni localizzate, lieve zoppia e cadute ragdoll.
- **Fisica dei proiettili più credibile:** gli impatti non letali generano contrazioni senza scaraventare il corpo; la dinamica di caduta si attiva quando il soggetto è incapacitato, manipolato o soggetto a un'onda d'urto. Le collisioni con superfici e piattaforme sono semplificate.
- **Sei categorie di armi e physics gun:** pistola, SMG, fucile automatico, fucile di precisione, fucile a pompa, granata, con caratteristiche distinte, effetti sul bersaglio, bossoli, rinculo, mira ravvicinata, caricatore e ricarica.
- **Diagnostica e radiografia:** monitoraggio approssimativo di sangue, organi, emorragia e ferite; RX con scheletro articolato, cranio, costole e organi tridimensionali semplificati.
- **Ambientazione industriale:** architettura, laboratori di analisi, postazioni monitor, porte, apparecchi di test, luci, materiali procedurali e dettagli di scena.
- **Mobile first:** due joystick/gesture area (sinistra per il movimento, trascina il gioco per guardare), pulsanti MIRA, SPARA e AGGANCIA, barra degli strumenti scorrevole.
- **Profili grafici:** AUTOMATICA, QUALITÀ o FLUIDITÀ; la modalità automatica abbassa la risoluzione di rendering se rileva un calo di frame rate sostenuto.
- **PWA installabile:** da Safari scegliere Condividi → Aggiungi alla schermata Home. Prima apertura con rete; il service worker tenta di conservare motore e asset per l'uso successivo offline, senza garanzia su tutte le condizioni.

## Controlli

**iPhone in orizzontale:** joystick a sinistra per muoversi, trascinare lo schermo per orientare lo sguardo, SPARA per usare l'arma, MIRA per restringere il campo visivo, RICARICA per reintegrare il caricatore. La physics gun consente di agganciare un manichino e muoverlo cambiando la direzione di mira.

**PC:** WASD per muoversi, trascinare il mouse per orientarsi, click per sparare, tasti 1–8 per gli strumenti, F per ricaricare, Shift per mirare, R per ripristinare.

## Limiti tecnici noti

Questa è una simulazione **approssimata** realizzata in Three.js con un solver ragdoll e modelli procedurali. Non equivale alla biomeccanica, alle animazioni cinematiche, alla resa grafica professionale e alla simulazione vascolare del titolo Unity di riferimento. La fluidità dipende dal dispositivo, dalla versione di Safari e dall'eventuale carico termico. Alcune interazioni possono richiedere ulteriori affinamenti su iPhone fisico.

Per un porting realmente identico al gioco Windows è necessario disporre del progetto Unity, dei sorgenti e degli asset con i relativi diritti di utilizzo.

## File

- `index.html`: interfaccia e schermata di avvio.
- `game.js`: gameplay, fisica, controlli, armi e vitali.
- `premium.js`: grafica aggiuntiva, asset procedurali, dettagli 3D e ottimizzazioni.
- `manifest.webmanifest`, `sw.js`, `icon.svg`: installazione iOS e caching.

## Attribuzione

Progetto autonomo ispirato al genere *ragdoll injury sandbox*. Project C.A.R.L. appartiene al rispettivo autore. Le risorse visuali del nostro prototipo sono generate tramite codice originale; Three.js è utilizzato come libreria di rendering secondo la sua licenza.
