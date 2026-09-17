# Trip Together — analisi prodotto e piano di refactoring

Analisi del 17 settembre 2026 sul working tree, comprese le modifiche locali già presenti. Questo documento integra l'audit storico senza sostituirlo.

## Metodo e limiti

- Lettura di pagine, componenti condivisi, flussi evento/auto/spese/radar, hook, mutazioni, coda offline e migration.
- Eseguiti con successo `npm run check`, `npm test` e `npm run build`. Il runner riporta 6 file di test superati.
- Build: bundle JavaScript principale di 582,07 kB minificati, 164,49 kB gzip; warning sulla dimensione del chunk.
- Nessuna verifica visuale in browser o su telefono, nessuna verifica del database remoto. I rilievi descrivono il codice locale; i rischi di concorrenza sono dedotti dai flussi, non riprodotti contro un server.
- Nessun cambiamento al comportamento dell'app o allo schema in questa analisi.

## Direzione di prodotto

L'app ha già componenti condivisi, una palette coerente, sessioni anonime, comitive persistenti, aggiornamenti realtime, mutazioni centralizzate e una prima gestione offline. Mantenerli come base.

Il prossimo salto di qualità è rendere immediato capire: dove andiamo, quando, con chi viaggio e cosa devo ancora fare. Conservare i vincoli di `CONTEXT.md`: niente chat libera, radar attivato esplicitamente, nessun login richiesto, spese/carico distinti per auto, palette scura.

## Esperienza proposta

### Home

- Dare risalto al prossimo evento con data, destinazione e azione personale; seguire con gli altri eventi e le comitive.
- Per il primo utilizzo: azioni principali «Crea un evento» e «Entra con un invito»; spiegare la comitiva come gruppo riutilizzabile e mantenerne accessibile la creazione.
- Nella creazione consentire data e destinazione opzionali, senza obbligare l'utente a completare tutto subito.
- Usare «evento» nel linguaggio rivolto all'utente; mantenere `room` come nome tecnico. Uniformare anche «Nuova spesa» al posto di «Nuova lista spesa».

### Evento

- Evolvere la dashboard per fase già esistente: prima della partenza evidenziare presenza e passaggio; durante il viaggio auto, ritardi e destinazione; dopo l'arrivo spese e riepilogo.
- Inserire una scheda personale: «Sei nell'auto di Luca», «Manca la tua conferma», «Devi ricevere 12,50 €». Mostrare una sola azione principale per volta.
- Tenere partecipanti e strumenti secondari sotto il riepilogo; spostare la chiusura nelle opzioni dell'evento.
- Rendere la tab parte dell'URL, ad esempio `?tab=spese`: refresh e link condivisi devono mantenere il contesto. Ora `Room.tsx` conserva la tab solo in `useState`.

### Auto

- Portare «La tua auto» in testa; mostrare separatamente le altre auto e le persone senza posto.
- Riassumere guidatore, posti liberi e stato nella testata; aprire carico, spese e soste nei dettagli.
- Rendere esplicito se il numero dei posti include il guidatore.
- Conservare sempre il posto precedente se uno spostamento fallisce; assegnare l'ultimo posto in modo atomico sul server.

### Spese e archivio

- Mostrare prima il saldo personale, poi i trasferimenti suggeriti e infine il dettaglio delle spese.
- Aggiungere un flusso di registrazione del rimborso e una relativa registrazione persistente. In `SpeseTab.tsx` oggi i trasferimenti sono elencati, ma l'unica azione di azzeramento presente è il condono della spesa generale: registrare un rimborso e condonare una spesa hanno significati diversi.
- Conservare importi con due decimali e formattazione italiana; il totale attuale usa `toFixed(0)`.
- Archiviare un evento in sola lettura conservando il riepilogo economico. Trattare la rimozione delle posizioni come operazione distinta dalla conservazione delle spese.
- Rendere gli eventi archiviati consultabili: le relative card Home attualmente non hanno azione di apertura.

### Interfaccia condivisa

- Conservare la palette obsidian e attribuire agli accenti ruoli stabili: azione principale, successo, attenzione/errore.
- Ridurre l'impiego di etichette da 10–11 px e del monospazio nei testi descrittivi. Definire una scala comune per titolo, corpo e metadati.
- Consolidare campi, messaggi di validazione, stato vuoto e stato errore in componenti riutilizzabili. I placeholder non devono essere l'unica etichetta dei campi.
- Completare `BottomSheet`: semantica di dialogo, focus iniziale e ripristino, gestione Tab/Escape, contenuto chiuso non raggiungibile da tastiera, scroll interno e sfondo non interattivo.
- Adattare gli elementi fissi alle safe area e alla tastiera mobile; ampliare le aree premibili dei controlli piccoli.
- Su desktop introdurre una disposizione a due colonne per riepilogo e contenuti. Le pagine sono oggi limitate a `max-w-lg`.
- Verificare contrasto, zoom e movimento ridotto sul risultato renderizzato prima di dichiarare conformità o qualità visuale.

## Rilievi tecnici prioritari

| Priorità | Evidenza locale | Effetto e intervento |
|---|---|---|
| P0 | La migration definisce policy `using (true) with check (true)` su tutte le tabelle | Le policy non separano le stanze e non verificano ruoli o appartenenza. Introdurre autorizzazioni basate sulla sessione anonima e membership; verificare anche i grant. Codici e UUID non sostituiscono il controllo degli accessi. |
| P0 | `resumeToken.ts` codifica identificativi in base64url; `Resume.tsx` verifica solo l'esistenza del membro | Il token non prova il diritto a recuperare l'identità. Progettare un recupero con segreto casuale verificato dal server, scadenza/revoca e associazione della nuova sessione. Coordinare questo cambiamento con le RLS per non rompere il rientro. |
| P0 | `CloseRoomSection.tsx` esegue sei mutazioni in sequenza e non controlla i risultati di `mutate` | In caso di errore può proseguire e navigare come se la chiusura fosse riuscita. Usare un'operazione server atomica; separare archiviazione ed eliminazione. |
| P1 | `SpeseTab.tsx` salva spesa e partecipanti in due richieste; ignora l'errore della seconda prima di chiudere il form | Possibile spesa incompleta. Unificare il salvataggio in una transazione con identificativo stabile per i tentativi successivi. |
| P1 | `AutoTab.tsx` sposta passeggeri con cancellazione seguita da inserimento; lo schema non vincola la capienza | Possibile perdita del posto precedente o sovraprenotazione concorrente. Spostamento atomico con verifica server della capienza e dell'appartenenza. |
| P1 | `useRoomData.ts` espone gli errori solo di stanza, membri e auto; le altre query fallite diventano liste vuote | «Nessuna spesa» può significare «spese non caricate»; anche il controllo di chiusura dipende da queste liste. Esporre errori per sezione e impedire conclusioni sui saldi quando i dati sono incompleti. |
| P1 | `RadarTab.tsx` cancella solo il timer nell'unmount; una callback GPS pendente può ancora scrivere e programmare un nuovo timer | Introdurre un ciclo di vita cancellabile della sessione radar, scartare callback obsolete e rendere esplicito cosa accade cambiando tab. Attivazione sempre manuale. |
| P1 | `BottomSheet.tsx` nasconde con opacità e `pointer-events`; nessuna gestione del focus | I controlli chiusi restano potenzialmente raggiungibili da tastiera. Sistemare il componente condiviso prima di estendere il numero di form. |
| P1 | `offlineQueue.ts` usa una copia locale della coda durante il flush e si arresta al primo errore | Un'operazione accodata mentre una richiesta è in corso può essere sovrascritta dal successivo salvataggio della vecchia copia. Rileggere/aggiornare lo store in modo sicuro e distinguere errore temporaneo, conflitto e fallimento definitivo. |
| P2 | `useRoomOptimistic.ts` ripristina l'intero payload precedente in caso di errore | Un rollback può sovrascrivere modifiche concorrenti o realtime. Limitare aggiornamento e rollback all'entità interessata o riconciliare i dati invalidandoli. |
| P2 | `useRoomData.ts` carica 16 risorse e le invalida ogni 20 secondi | Misurare il costo con più partecipanti; separare le risorse per dominio e limitare caricamento/polling a ciò che serve, preservando la riconciliazione dopo la riconnessione. |
| P2 | `main.tsx` importa tutte le pagine staticamente; la build produce un chunk principale sopra 500 kB | Caricare pagine e funzionalità pesanti su richiesta, poi misurare il beneficio sul percorso di ingresso da invito. |
| P2 | README e parti di CONTEXT descrivono file e comportamenti precedenti | Aggiornare la documentazione insieme al refactoring per evitare implementazioni basate su presupposti obsoleti. |

## Struttura di refactoring proposta

Procedere per funzionalità, mantenendo React, TypeScript, TanStack Query e Supabase.

- `components/ui`: primitive accessibili, campi e stati comuni.
- `features/events`: riepilogo, inviti, presenza, archiviazione.
- `features/cars`: assegnazioni, capienza, carico e viaggio.
- `features/expenses`: spese, quote, rimborsi e saldi.
- `features/radar`: sessione GPS e visualizzazione separate.
- `lib`: infrastruttura condivisa per client, sincronizzazione e formattazione.

La riorganizzazione delle cartelle deve accompagnare separazioni reali: estrarre da `AutoTab` i blocchi auto/carico/form; separare le letture per dominio; spostare le invarianti e le operazioni composte sul server. Non serve una riscrittura generale.

## Ordine di esecuzione e verifiche

1. **Fondamenta:** membership/RLS/recupero coerenti, chiusura sicura, errori distinti dai dati vuoti. Verifica: una sessione esterna non legge né modifica un altro evento; errori di caricamento spese non abilitano la chiusura.
2. **Primo intervento UI:** BottomSheet, form, tipografia, navigazione persistente e dashboard personale. Verifica: invito → ingresso → conferma → assegnazione auto fruibili da telefono e tastiera; focus sempre visibile e coerente.
3. **Completamento dei flussi:** posti e spese atomici, rimborsi registrabili, archivio consultabile, radar cancellabile. Verifica: due richieste simultanee per l'ultimo posto; errore durante il salvataggio; disattivazione radar durante una richiesta GPS.
4. **Qualità operativa:** coda offline robusta, caricamento mirato, test di riconnessione e documentazione aggiornata. Valutare installabilità PWA solo dopo aver definito i dati disponibili offline e la loro persistenza.

Test aggiuntivi da privilegiare: saldi in centesimi con resti e arrotondamenti, rimborsi parziali, retry di una scrittura già ricevuta dal server, nuove operazioni durante il flush, accesso negato tra eventi, navigazione mobile con tastiera aperta. I test attuali della coda coprono lo store, non l'intero processo di sincronizzazione.

## Riferimenti verificati

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): grant e policy determinano le operazioni e le righe accessibili; anche gli utenti anonimi autenticati hanno una sessione utilizzabile nelle policy.
- [W3C — Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): focus confinato nel dialogo, chiusura con Escape, ritorno del focus e sfondo non interattivo.
