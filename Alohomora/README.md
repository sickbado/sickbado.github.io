# Alohomora — il mondo della magia ✨

Fan game non ufficiale ispirato al mondo di Harry Potter, realizzato come esperienza WebGL autonoma per Safari su iPhone e browser desktop. Gli asset e le geometrie 3D sono generati in codice; non viene distribuito materiale grafico ufficiale.

## Gioca
https://sickbado.github.io/Alohomora/

## Versione 0.2 (26 ottobre 2026)
- Mondo 3D procedurale: scuola-castello Hogwarts, villaggio Hogsmeade, binari, stazione e Hogwarts Express in movimento.
- 12 magie selezionabili: Lumos, Nox, Accio, Wingardium Leviosa, Incendio, Aguamenti, Reparo, Revelio, Alohomora, Stupeficium, Expelliarmus e Protego.
- Oggetti dinamici con massa semplificata, gravità, attrito e rimbalzi; magie che modificano il loro stato fisico.
- NPC amici, avversari, creature e dialoghi; pattuglie e inseguimento; stordimento e reazioni fisiche stilizzate.
- Volo in scopa, notte e giorno, minimappa, segreto sbloccabile e controlli touch.
- Monofile `index.html`, senza dipendenze esterne, per facilitare il caricamento su GitHub Pages.

## Comandi
- iPhone: joystick a sinistra, trascina sul mondo a destra per ruotare la visuale, barra incantesimi in basso, ✦ lancia, 🧹 volo, ✋ interagisci.
- Desktop: WASD, mouse, clic per lanciare, 1-9 oppure Q/E per cambiare magia, B volo, F interazione, Spazio per salire/saltare e C per scendere.
- Prova **Revelio**, poi **Alohomora** alla porta nei pressi del castello.

## Limiti attuali
Questa è una demo, non un open world completo: niente interni estesi, treno non ancora cavalcabile, NPC controllati da routine semplici e non da modelli IA remoti, reazioni ragdoll approssimate anziché simulazione articolata completa, fisica ridotta per fluidità su mobile. Supporto Safari da testare direttamente su iPhone.

## Direzione di sviluppo
- Esplorazione degli interni (atrio, biblioteca, dormitori, sotterranei).
- Treno salibile e viaggio tra le regioni.
- Magie con bersagli multipli, combinazioni, incantesimi contestuali e duelli più complessi.
- Quest, progressione, inventario, salvataggi, personaggi e animazioni più espressivi.
- Fisica con corpi rigidi e ragdoll articolato ottimizzati per iPhone.

Repository attuale: `sickbado/sickbado.github.io`, file principale `Alohomora/index.html`; ogni commit su `main` è pubblicato automaticamente tramite GitHub Pages.
