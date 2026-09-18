# Piano di correzione tecnica — avanzamento

## Regole operative

Il piano dell'utente richiede un commit per fase, nessuna esecuzione DDL da parte
dell'agente e conferma dell'applicazione manuale dello SQL prima delle modifiche
client dipendenti. Il refactoring precedente è conservato separatamente nel commit
`5d60ce1` (`conserva il refactoring iniziale di interfaccia e flussi`).

## Fase 0 — completata

- `strict: true` nei due tsconfig.
- Test inclusi nel typecheck; aggiunto `node` a `types` usando `@types/node` già presente.
- `react/exhaustive-deps` e `require-await` abilitate come errori.
- Rimosse le tre funzioni `async` senza `await` segnalate dal lint, conservando
  il comportamento asincrono dei mock con `Promise.resolve` / `Promise.reject`.
- Nessuna dipendenza aggiunta e nessuna direttiva di soppressione.
- `npm run check && npm test && npm run build`: superato. Il runner locale
  riporta 7 file di test superati; non si interpreta questo numero come conteggio
  delle singole asserzioni o dei casi dichiarati nei file.

`typescript/no-floating-promises` esiste nella versione Oxlint installata, ma
`oxlint --type-aware -D typescript/no-floating-promises src/lib/drainQueue.ts`
si interrompe perché manca `oxlint-tsgolint`. Il vincolo sulle dipendenze impedisce
di aggiungerlo. La regola non è stata configurata in modo inattivo o simulato.
`oxlint --rules` non produce un elenco in questo ambiente; presenza delle regole
verificata anche nello schema di configurazione del pacchetto.
Riferimento: [Oxlint — type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html).

Opzioni lasciate disabilitate come richiesto, misurate separatamente dopo la fase 0:

- `noUncheckedIndexedAccess`: 14 diagnostiche TypeScript.
- `exactOptionalPropertyTypes`: 4 diagnostiche TypeScript.

## Fase 1 — completata dopo conferma dell’applicazione SQL

Applicazione manuale confermata dall'utente con «applicata». Il blocco
`Fix: appartenenza server-side, RLS scoped e RPC di ingresso atomiche`
e il client fanno parte dello stesso commit di fase.

- `member_devices`, helper di appartenenza senza ricorsione RLS e policy scoped.
- SELECT senza appartenenza: nessuna riga; nessun endpoint pubblico per recuperare
  l'invito a partire dall'UUID. Scritture anagrafiche e modifiche a identità/ruoli
  limitate alle RPC; revocata DELETE delle stanze anche ad `authenticated`, ruolo
  usato dalle sessioni anonime Supabase.
- RPC `resolve_invite`, `join_room`, `join_crew`, `claim_member`,
  `create_room_and_join`, `create_crew`; input validati e helper non pubblici.
- Creazione atomica con codici casuali di 7 caratteri, rejection sampling e
  massimo 5 tentativi; lock per evitare collisioni anche fra stanze e comitive.
- `list_crew_events`: lettura dei soli eventi delle proprie comitive, per
  conservarne la scoperta prima del join senza allargare le policy su rooms.
- Trigger che derivano sempre il room_id dal parent anche negli UPDATE:
  una policy sul room_id denormalizzato non può fidarsi del valore del client.
- Il blocco usa una transazione, oggetti con `if not exists`, funzioni
  `create or replace`, rimozione/ricreazione delle policy e dei trigger e grant
  ripetibili. Le funzioni pubbliche revocano EXECUTE a PUBLIC; quelle private
  lo revocano anche ai ruoli client.

### Client e verifiche del 17 settembre 2026

- Creazione, ingresso, risoluzione e recupero passano per le RPC. La sessione è
  non-null e condivisa fra richieste concorrenti, anche in StrictMode.
- Nessuna risoluzione pubblica UUID → codice. Stato neutro con campo invito;
  ripristino della voce locale solo dopo la verifica di appartenenza server.
- Recupero additivo: secondo device e device originale possono entrambi scrivere.
- Liste comitive via `list_crew_events`; l'accesso alle collezioni dell'evento
  richiede comunque il join. Errori di ingresso/data in italiano, dettagli in console.
- `npm run check && npm test && npm run build`: superato (7 file di test).
- `scripts/uiSmoke.mjs`: superato con Chromium e API simulate, senza errori JS.
- `scripts/verifyMembership.mjs`: superato sul Supabase configurato e nel browser
  locale. Usa soltanto anon key/sessioni anonime, mai chiavi amministrative.

Verifica 1e reale:

| Prova | Esito |
| --- | --- |
| 16 letture della stanza | Tutte riuscite; nessun errore nelle sezioni UI |
| Realtime INSERT | Ricevuto sul canale filtrato e visibile in bacheca |
| Realtime UPDATE | Ricevuto sul canale filtrato e visibile in bacheca |
| Realtime DELETE | Ricevuto sul canale filtrato e su quello diagnostico non filtrato; rimosso dalla bacheca |
| Sessione estranea e anon key senza sessione | rooms/radar_positions restituiscono [] |
| Scrittura estranea, invito errato, DELETE stanza | Respinti dal server |
| Invito, join e comitiva | E2E riuscito; join ripetuto non duplica il membro né cambia il ruolo |
| /resume/:token | E2E riuscito; conferma presenza dal device recuperato |
| Sessione originale dopo recupero | Lettura e scrittura ancora consentite |
| Recupero senza voce localStorage | Membro ricostruito dal mapping server |

Il primo test scriveva subito dopo `SUBSCRIBED` e non riceveva INSERT. Ripetendo
la prova dopo la conferma `system` della replica, tutti e tre gli eventi sono
arrivati. Il client ora riconcilia la cache anche alla prima conferma PostgreSQL,
chiudendo il varco fra il fetch iniziale e l'effettivo ascolto del canale.
Riferimento: [Supabase — Postgres Changes troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-postgres-changes-troubleshooting).

I tre tentativi di verifica hanno creato comitive/eventi isolati, accessibili solo
alle sessioni di test. Note e posizioni fittizie sono state eliminate; gli eventi
sono archiviati. Comitive, eventi archiviati e membri restano perché le RPC non
prevedono la cancellazione amministrativa di queste entità.

Non è stato eseguito alcun DDL, neppure su un database locale. La rieseguibilità
SQL è stata revisionata staticamente; non è certificata da una doppia applicazione
reale. Il vincolo dell'utente impedisce di eseguire tale prova autonomamente.
Le scelte dei punti 4d (atomicità), 4e (sessione non-null), 3d (lettura locale
memoizzata) sono già realizzate in questa fase perché necessarie al nuovo accesso.

## Fase 2 — completata dopo conferma SQL

Fase 1: commit `35cdc71` (`limita l'accesso ai membri e collega le rpc`).
L'utente ha confermato anche il blocco `Fix: ordine cronologico e quote spesa
univoche`; non è stato eseguito DDL dall'agente.

- Conversione simmetrica datetime-local/UTC: verificati inverno, estate,
  cambio del giorno e campo vuoto; doppio salvataggio senza slittamenti nel browser.
- `created_at` aggiunto ai tipi delle tre collezioni aggiornate. Tutte le query
  lista hanno ordine esplicito; cache realtime ordinata con gli stessi criteri,
  conservando anche la precisione in microsecondi di PostgreSQL e lo spareggio ID.
- Note fissate prima delle altre, poi created_at/ID. Tabelle ponte per chiave;
  radar per member_id. Una UPDATE non cambia la posizione cronologica.
- Quote via upsert su expense_id/member_id; deduplica difensiva anche degli ID
  nella richiesta e degli ID nel calcolo dei saldi auto/generali.
- Note, link, proposte di sosta e ritardi mantengono i valori quando il server
  restituisce un errore. Verificati tutti e quattro i form nel browser.
- `npm run check && npm test && npm run build`: superato (10 file di test).
- Smoke UI: superato, inclusa risposta persa **dopo** il commit delle quote e
  retry senza duplicazione.
- Prova reale: nuove colonne disponibili; upsert ripetuto lascia una sola quota;
  INSERT duplicato respinto con 23505. Anche invito, recupero e INSERT/UPDATE/DELETE
  realtime sono passati nuovamente, compresa la bacheca nel browser.

Nella prima ripetizione del test remoto è mancato INSERT: il test prendeva per
buona la prima notifica `system` (replica pronta), prima della conferma specifica
`postgres_changes`. Ora attende entrambe. La successiva esecuzione è passata;
la rilettura e il polling restano necessari perché realtime non garantisce la
consegna di ogni evento. I due ulteriori eventi di prova sono stati archiviati,
con note, posizioni e spese di test eliminate; restano le rispettive comitive e
appartenenze isolate. Nessun dato utente modificato.

La rieseguibilità del blocco SQL è stata revisionata staticamente, senza una
seconda applicazione DDL. Il lock impedisce scritture fra deduplica e indice.

## Fase 3 — completata

Fase 2: commit `dfd99ce` (`correggi orari ordine delle liste e quote duplicate`).

- Poll di sicurezza a 90 secondi, sospeso a pagina nascosta; evento realtime
  recente salta il poll, ritorno in primo piano rilegge subito. Listener rimossi
  all'unmount. Test con clock controllato sui confini della finestra e sul ritorno.
- Home: due query invece di cinque; rimossi openBalance, radarActive e memberId.
  Eliminata anche general_expenses, che alimentava soltanto openBalance.
- Meteo TanStack Query con chiave lat/lng/eventDate e staleTime/gcTime 30 minuti.
  Nel browser tre cambi di tab mantengono una sola richiesta meteo.
- Lettura localStorage memoizzata già completata durante la fase 1.
- `npm run check && npm test && npm run build`: superato (11 file di test).
- Smoke UI superato, incluse le prove delle fasi precedenti. La verifica delle
  richieste Home esclude le sonde di checkSchema, presenti solo in DEV.
- Nessuno SQL aggiuntivo e nessuna dipendenza aggiunta.

## Fase 4 — completata dopo conferma SQL

Fase 3: commit `213b0ec` (`riduci polling e query inutili e conserva il meteo in cache`).
L'utente ha confermato il blocco dei riferimenti/capienza con «fatto».

- Coda con attempts persistente e migrazione del formato precedente. Errori di
  rete/timeout/5xx e sovraccarico temporaneo mantengono l'item; errori permanenti e
  operazioni non più registrate lo scartano e proseguono. Massimo 5 invii; toast
  con il numero di modifiche perse e riconciliazione della cache.
- Rollback derivato per chiave e campi modificati: conserva altre righe,
  collezioni e aggiornamenti concorrenti, anche sulla stessa riga. Riconciliazione
  server su errore per gestire le cancellazioni della medesima entità.
- mutate restituisce queued; feedback centralizzato per tutte le scritture
  accodate. Entrambi i punti di conferma presenza usano la patch ottimistica.
- Codici client CSPRNG a 7 caratteri con maschera/rejection sampling; il percorso
  produttivo usa già la RPC atomica con retry collisioni. Codici vecchi accettati.
- Soste client-only: status eliminato dal tipo, schede concluse senza intervalli,
  rimozione dopo expires_at + 15 minuti anche senza altri eventi (un timeout nel
  contenitore). Nessun cron o persistenza di un esito che può diventare obsoleto.
- NOT NULL applicati. Backfill da riferimenti univoci e stop transazionale per
  righe non ricostruibili; nessuna cancellazione né capienza inventata.
- Trigger capienza con lock della riga auto; protezione anche contro la riduzione
  dei posti sotto le assegnazioni. Messaggio specifico in UI sul posto esaurito.
- `npm run check && npm test && npm run build`: superato (13 file di test).
- Smoke browser: presenza offline immediata, nota accodata con feedback,
  operazione irrecuperabile segnalata e coda che riparte; regressioni precedenti OK.
- Prova reale: due sessioni richiedono contemporaneamente l'ultimo posto; una
  riesce, l'altra riceve 23514. Un solo passeggero; retry dello stesso membro
  riuscito; riduzione capienza e driver nullo respinti. Colonna status rimossa.
- RLS, invito, recupero e INSERT/UPDATE/DELETE realtime nuovamente verificati,
  incluse le modifiche visibili in bacheca. Fixture isolate ripulite; evento
  archiviato e anagrafiche di test conservate come nelle verifiche precedenti.

Nessun DDL eseguito dall'agente. Rieseguibilità SQL revisionata staticamente,
non provata tramite due applicazioni autonome (vietate dal piano).

## Fase 5 — da completare

PWA, integrazione smoke UI in package/CI e allineamento dei messaggi operativi.
