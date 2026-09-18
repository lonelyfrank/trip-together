# Trip Together — contesto per sviluppo

Stato aggiornato al **18 settembre 2026**, commit `9623cf7`. Questo file è la memoria
di progetto: cos'è l'app, com'è fatta, cosa fa e dove siamo arrivati. Per il setup
locale vedi [README.md](README.md).

---

## 1. Cos'è Trip Together

Demo di validazione di un'app per **organizzare un'uscita di gruppo in auto**: il
momento in cui dieci persone devono decidere dove andare, chi guida, chi sale con
chi, chi ha pagato la benzina e chi è in ritardo. Oggi quel coordinamento avviene
in una chat di gruppo, dove le informazioni utili (l'indirizzo, l'ora, i posti
liberi, i conti) affogano tra i messaggi.

La tesi del prodotto è che **quelle informazioni non sono messaggi: sono stato
condiviso**. Trip Together le estrae dalla conversazione e le rende un oggetto
consultabile e aggiornabile in tempo reale, dove ogni dato ha un posto fisso.

Da qui il vincolo fondativo: **niente chat libera in nessuna tab**. Se esistesse un
campo di testo libero, il prodotto tornerebbe a essere il problema che vuole
risolvere. Ogni campo è corto, tipizzato e opzionale (una nota, un'etichetta, una
causale scelta da un elenco).

Il secondo vincolo è **nessun account**. Per un'uscita della domenica, una
registrazione è una barriera sproporzionata: si entra da un link di invito e si
scrive il proprio nome. L'identità è una sessione anonima Supabase, il device
ricorda a cosa partecipa. Il costo di questa scelta — un device perso è
un'identità persa — è coperto dai link di recupero (§6).

### Vincoli non negoziabili

- **Niente chat libera in nessuna tab.** Ogni campo testo resta corto e opzionale.
- **Radar mai automatico.** La posizione si condivide con un toggle esplicito, mai
  attivo di default all'ingresso in stanza, e si spegne uscendo dalla sezione.
- **Ogni auto è una mini-stanza indipendente.** Spese e carico di un'auto non si
  mescolano mai con quelli di un'altra.
- **Nessun account/login.** Sessione anonima (`ensureAnonymousSession()` in
  `src/lib/supabase.ts`); il device ricorda stanze, comitive e id-membro in
  `localStorage` (`src/lib/localRooms.ts`).

---

## 2. Stack tecnico

| Area | Scelta | Note |
|---|---|---|
| Build | **Vite 8** + `@vitejs/plugin-react` | dev server HTTPS via `basic-ssl` (serve per geolocalizzazione e PWA su LAN) |
| Linguaggio | **TypeScript 6**, `strict: true` | test inclusi nel typecheck |
| UI | **React 19** | `StrictMode`, pagine in `lazy()` + `Suspense` |
| Routing | **react-router-dom 7** | `BrowserRouter` |
| Stato server | **TanStack Query 5** | cache unica condivisa fra Home, Crew e Room |
| Stile | **Tailwind CSS 4** via `@tailwindcss/vite` | token in `@theme`, nessun file di config JS |
| Icone | **lucide-react** | |
| Backend | **Supabase** | Postgres + PostgREST + Realtime + Auth anonima |
| PWA | **vite-plugin-pwa 1.3** (Workbox) | `registerType: 'prompt'`, precache dello shell |
| Lint | **oxlint** | `rules-of-hooks`, `exhaustive-deps`, `require-await` |
| Test unitari | **`node --test`** nativo | 58 test, 12 file `*.test.ts`, nessun framework |
| Test UI | **Playwright** (dipendenza esterna) | `scripts/uiSmoke.mjs`, `scripts/pwaSmoke.mjs` |

Nessuna libreria di stato globale, di form, di date o di UI kit: tutto quello che
serve è scritto in `src/lib` e `src/components/ui`. ~6.400 righe di TS/TSX.

**Comandi:** `npm run dev` · `npm run check` (typecheck + lint) · `npm test` ·
`npm run build` · `npm run db:check` (tabelle attese presenti sul DB) ·
`npm run test:ui` · `npm run test:pwa`.

**Bundle di produzione:** entry ~198 kB (63 kB gzip), chunk Supabase ~281 kB
(77 kB gzip, caricato a parte), chunk Room ~82 kB. Precache PWA: 20 file, ~630 kB.

---

## 3. Modello di dominio: comitive vs eventi

- Una **comitiva** (`crews`) è un gruppo **persistente** con partecipanti stabili
  (`crew_members`) e un proprio codice invito. Dentro una comitiva si organizzano
  più eventi, senza reinvitare ogni volta le stesse persone.
- Un **evento/stanza** (`rooms`) è una singola uscita. Può appartenere a una
  comitiva (`rooms.crew_id`) o essere un **evento rapido** standalone
  (`crew_id` null).
- Un **membro** (`members`) è uno slot-persona dentro un evento, non un utente
  globale: la stessa persona in due eventi è due righe.
- Un **device** può rivendicare un membro (`member_devices`): è così che un
  secondo telefono o un link di recupero accedono alla stessa identità.

Tutti i flussi di creazione e ingresso stanno in `src/lib/membership.ts`. Le
pagine non duplicano questa logica.

---

## 4. Le funzioni, tab per tab

La stanza ha cinque tab (`TabBar`, tab persistente nella query string `?tab=`).
Il cruscotto è **adattivo per fase** (`src/lib/phase.ts`): `pre` (nessuna auto
partita) → `in_corso` (almeno un'auto partita) → `concluso` (stanza archiviata).

### Evento (`StanzaTab`)
- **`PersonalSummary`** — cosa riguarda *te* adesso: la tua auto, il tuo saldo,
  l'azione che manca. Cambia con la fase.
- **`DestinationCard`** — destinazione con parsing di ciò che l'utente incolla
  (`src/lib/mapLinks.ts`: link Google Maps `@lat,lng` / `!3d!4d` / `?q=`,
  Apple Maps `?daddr=`/`?ll=`, Waze, o coordinate grezze). I link accorciati
  (`maps.app.goo.gl`) non sono risolvibili dal browser per CORS: l'esito
  `shortlink` chiede il link completo. `MapSheet` apre il percorso in
  Google/Apple/Waze.
- **`EventTimeRow`** — data e ora, salvate separatamente dalla destinazione così
  un errore su un campo non blocca l'altro. Conversione UTC↔locale esplicita
  (`toDatetimeLocal`/`fromDatetimeLocal`).
- **`WeatherStrip`** — meteo della destinazione via Open-Meteo (nessuna API key,
  nessun dato persistito). Se l'evento cade entro 16 giorni mostra la previsione
  per quel giorno, altrimenti il meteo attuale. In cache 30 minuti.
- **`ReadinessBanner`** — a T-24h e T-2h dall'evento: quanti hanno confermato la
  presenza, quanti sono senza auto, con le azioni per rimediare.
- **Partecipanti** — elenco con ruolo derivato (guida / passeggero / senza auto) e
  il pulsante per generare il **link di recupero** di chiunque (§6).
- **Invito** — `navigator.share` dove c'è, altrimenti copia negli appunti.
- **`CloseRoomSection`** — archiviazione, solo per il creatore e solo a saldi
  chiusi. Lo storico resta consultabile; solo le posizioni radar vengono pulite.

### Auto (`AutoTab`)
- Dichiarazione della propria auto con i posti totali (il conducente occupa già
  un posto). La propria auto è sempre in cima ed evidenziata.
- **Posti**: prendere/lasciare un posto, assegnare a mano chi è senza auto. La
  capienza è garantita **dal database** (trigger con lock sulla riga dell'auto):
  due persone sull'ultimo posto non passano entrambe.
- **`TravelStatusChip`** — stato per auto: non partita / in partenza / in viaggio
  / fermo / arrivata, con "aggiornato N min fa". Modificabile da conducente e
  passeggeri. All'arrivo chiude automaticamente i ritardi aperti.
- **`DelayReportBadge`** — ritardo dichiarato con causale (traffico, rifornimento,
  dimenticanza, altro) e minuti stimati opzionali. Visibile a tutta la comitiva.
- **`StopProposalsSection` / `StopProposalCard`** — proposta di sosta votabile,
  per una singola auto o per tutta la comitiva, con scadenza a 15 minuti e barra
  di avanzamento. L'esito (accettata/rifiutata/scaduta) è calcolato dai voti sul
  client; la card scompare 15 minuti dopo la scadenza.
- **`RideRequestsSection`** — chi è senza auto chiede un passaggio; chi ha un
  posto libero lo offre in un gesto (assegna il posto e registra il match).
- **Carico per auto** — checklist di cosa è già in macchina, per singola auto.

### Bacheca (`BachecaTab`)
Note brevi (con "fissa in alto"), link utili con etichetta, e **`ChecklistSection`**:
cosa porta il gruppo, con autoassegnazione e spunta consentita all'assegnatario o
al creatore.

### Spese (`SpeseTab`)
- Il **tuo saldo** in evidenza, poi il totale evento, i totali per auto e le spese
  di gruppo.
- Spese generali con **partecipanti selezionabili** (chi divide quella spesa) e chi
  ha pagato. Le spese auto si dividono fra conducente e passeggeri di quell'auto.
- **`src/lib/balances.ts`** calcola i saldi netti e li compensa in un numero
  minimo di trasferimenti (`computeTransfers`). Partecipanti deduplicati, quote
  arrotondate al centesimo, tolleranza 1 centesimo.
- **Condono** di una spesa (`waived`) invece della cancellazione: resta la traccia.
- Se un dato economico manca (spesa senza pagante, senza partecipanti, o riferita a
  un'auto assente) l'app **lo dichiara** invece di mostrare un saldo plausibile ma
  falso, e blocca l'archiviazione.

### Radar (`RadarTab`)
Posizione condivisa **solo su attivazione esplicita**, rappresentata come radar
polare con anelli per fascia di distanza (100/300/800 m), bearing e distanza
formattata. Intervallo adattivo alla distanza dal ritrovo
(60s → 30s → 17,5s sotto i 100 m, `src/lib/geo.ts`). Le posizioni non sono mai
storicizzate: una riga per membro, sempre sovrascritta, cancellata all'uscita
dalla tab e all'archiviazione. Le posizioni più vecchie di 5 minuti non si
mostrano. Le scritture sono serializzate per membro così una pulizia tardiva non
cancella la posizione di una sessione appena riaperta.

### Home e Crew
- **Home** — onboarding a tre scelte quando è vuota (crea evento / entra con
  invito / crea comitiva); altrimenti l'evento **in evidenza** (la prossima
  partenza per data, o il primo aperto), gli altri eventi, le comitive e
  l'archivio.
- **Crew** — partecipanti della comitiva, i suoi eventi (via
  `list_crew_events`), creazione di un nuovo evento dentro la comitiva e invito.

---

## 5. Architettura dei dati

### Letture
`src/lib/db.ts` incapsula ogni query in un risultato a **tre stati**:
`ok` / `empty` / `fail`. È la distinzione che tiene in piedi il resto: una tabella
mancante non è una lista vuota, e un errore non diventa mai un saldo a zero. Gli
helper `rows()`, `single()` e `firstError()` collassano il risultato dove è
innocuo. Nessun errore è silenzioso: log con etichetta `tabella.operazione`.

`src/hooks/useRoomData.ts` è il cuore: 16 query in parallelo per una stanza,
esposte in un `RoomPayload` unico. Gli errori delle singole funzionalità finiscono
in `sectionErrors` (auto / spese / bacheca / radar) e degradano solo la loro
sezione. Analoghi: `useCrewData`, `useMyRooms`, `useMyCrews`.

**Ordinamento** — ogni query-lista ha un `.order()` esplicito, e
`src/lib/collectionOrder.ts` applica **le stesse colonne** alle patch realtime:
senza questo, una riga aggiornata cambiava posizione al refetch successivo
(l'ordine di heap di Postgres non è garantito). Il comparatore gestisce i
microsecondi che `Date` tronca.

### Realtime
Un solo canale per stanza, tutte le sottoscrizioni filtrate per `room_id`. Un
evento applica una **patch mirata** alla cache (`applyChange`), non un refetch
totale. Le sei tabelle figlie hanno `room_id` denormalizzato, popolato da trigger
che lo rileggono **sempre** dal parent (anche in UPDATE: il browser non è una
fonte attendibile per quel campo), e `replica identity full` perché senza di essa
un DELETE porterebbe solo la PK e il filtro su `room_id` lo scarterebbe.

**Riconciliazione** (`src/lib/roomRefresh.ts`): refetch alla riconnessione del
canale, al ritorno in primo piano, e un poll di sicurezza ogni 90 secondi che
scatta **solo** se è in primo piano e se non è arrivato alcun evento realtime
nella finestra. Prima era un poll incondizionato da 20 secondi: 48 richieste al
minuto per stanza aperta, anche a tab nascosta.

### Scritture
`src/lib/mutations/room.ts` centralizza tutte le mutazioni come **Op**
serializzabili: `{name, args, run()}`. Il nome e gli argomenti primitivi sono ciò
che rende un'operazione **accodabile** e ricostruibile dal registry.

- `mutate()` — esegue, o accoda se offline, e ritorna `{data, error, queued}`.
  Quando `queued` è vero l'utente lo sa ("Salveremo la modifica al ritorno
  online"): una scrittura rimandata non si traveste da riuscita.
- `mutateNotify()` — come sopra, più un toast d'errore. Per gli INSERT, dove un
  update ottimistico creerebbe id temporanei in conflitto col realtime.
- `useRoomOptimistic()` — patch immediata in cache, scrittura, e su errore
  rollback della **sola patch applicata** (`src/lib/optimisticRollback.ts`),
  preservando gli eventi realtime arrivati nel frattempo, con toast e "Riprova".

**Coda offline** (`src/lib/offlineQueue.ts`, `offlineQueueStore.ts`,
`drainQueue.ts`): persistita in `localStorage`, drenata in ordine al ritorno
online. Distingue errore **transitorio** (rete, 5xx, 40001, 57014…) da
**permanente** (4xx, vincolo violato, op non più nel registry): il transitorio
conserva l'item in testa, il permanente lo scarta e prosegue, con un tetto di 5
tentativi. Gli scarti vengono contati e comunicati: nessuna modifica sparisce in
silenzio. Il radar è `queueable: false` — una posizione mancata va scartata, non
accodata.

---

## 6. Sicurezza e identità

Questa parte è stata riscritta il 17-18 settembre 2026 e non somiglia più a com'era.

**Prima:** RLS `using (true) with check (true)` su tutte le tabelle. Poiché la
anon key è pubblica per costruzione, chiunque potesse leggerla dal bundle poteva
leggere, modificare e cancellare l'intero database, comprese le coordinate GPS
live di tutti. L'isolamento esisteva solo nei filtri `.eq('room_id', …)` del
browser, cioè da nessuna parte.

**Ora, appartenenza server-side:**
- `member_devices(member_id, auth_user_id)` — un membro può essere rivendicato da
  più device, così un link di recupero non fa perdere l'accesso al telefono
  originale.
- `is_room_member(rid)` / `is_crew_member(cid)` — `security definer` (obbligatorio:
  una policy su `members` che interroga `members` andrebbe in ricorsione).
- Ogni tabella ha **una sola** policy `for all to authenticated` con
  `using`/`with check` = `is_room_member(room_id)` (o l'equivalente per
  `rooms`/`crews`/`crew_members`). Le vecchie policy vengono rimosse una per una:
  una permissiva superstite combinerebbe il suo `USING` in OR e riaprirebbe tutto.
- `member_devices` è leggibile solo per le proprie righe.

**Privilegi per colonna:** `INSERT`/`UPDATE`/`DELETE` revocati su `rooms`,
`members`, `crews`, `crew_members`. Le UPDATE consentite sono elencate per
colonna (es. su `rooms`: titolo, destinazione, orario, stato). Identità, ruoli e
creazione passano solo dalle RPC; il resto rimane collaborativo per scelta di
prodotto.

**RPC `security definer`** (le uniche eseguibili da `anon`/`authenticated`):
| Funzione | Ruolo |
|---|---|
| `resolve_invite(code)` | dice solo se un codice è di una stanza o di una comitiva |
| `join_room` / `join_crew` | verificano il codice e creano il membro, idempotenti |
| `claim_member` | il link di recupero: verifica il codice e registra il device |
| `create_room_and_join` / `create_crew` | creazione **atomica** gruppo+membro |
| `list_crew_events(crew_id)` | elenca gli eventi di una comitiva prima del join, senza allargare la SELECT su `rooms` |

Gli helper interni (`tt_require_session`, `tt_display_name`, `tt_invite_code`,
`tt_create_group`) e le funzioni dei trigger non sono eseguibili dal client.

**Codice invito:** 7 caratteri su alfabeto di 32 senza caratteri confondibili
(`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), generato con `crypto.getRandomValues` sul
client e `gen_random_uuid()` in SQL, con maschera e rejection sampling. Unicità
verificata **fra stanze e comitive** sotto advisory lock, con 5 tentativi. Prima
erano 5 caratteri da `Math.random()` senza retry sulla collisione.

**Link di recupero:** `/resume/:token` dove il token è il base64url di
`{roomId, memberId, inviteCode}`. Non è un segreto crittografico: è un puntatore,
e la verifica sta nella RPC `claim_member`, che controlla il codice invito prima
di registrare il device. Chiunque nella stanza può generare il link di un altro
partecipante (recovery sociale) o il proprio come backup.

**Gate di accesso alla stanza:** `Room.tsx` non ricava più l'`invite_code` da un
`roomId` arbitrario — era una fuga del segreto d'accesso. Ora legge i propri
`member_devices`, e se la stanza non è leggibile chiede il codice senza rivelare
se quell'evento esista.

---

## 7. Schema Supabase

**Fonte di verità: `supabase/migrations/20260724000000_schema.sql`** — un unico
file idempotente, rieseguibile per intero. Il flusso reale è *incollare nell'SQL
Editor di Supabase*: la CLI non è collegata in questo ambiente, quindi **nessun
DDL viene eseguito dal codice o dagli agenti**. `supabase/schema.sql` è solo uno
snapshot leggibile e può divergere: non usarlo come riferimento.
Verifica rapida: `npm run db:check`.

Attenzione ai nomi reali: non `room`, `room_members`, `car_members`, `expenses`.

- `crews`: `id, invite_code, name, created_by, created_at`
- `crew_members`: `id, crew_id, display_name, auth_user_id, role ('creator'|'member'), created_at` — unique `(crew_id, auth_user_id)`
- `rooms`: `id, invite_code, title, crew_id (null=standalone), destination_label, destination_lat, destination_lng, event_time, status ('open'|'closed'), created_by, created_at`
- `members`: `id, room_id ᴺᴺ, display_name, auth_user_id, role ('creator'|'guest'), confirmed, confirmed_at, created_at`
- `member_devices`: `member_id, auth_user_id (pk composita), created_at`
- `cars`: `id, room_id ᴺᴺ, driver_member_id ᴺᴺ, seats_total (check ≥ 1), travel_status ('non_partita'|'in_partenza'|'in_viaggio'|'fermo'|'arrivata'), travel_status_updated_at, travel_status_updated_by, created_at`
- `car_passengers`: `id, car_id ᴺᴺ, member_id ᴺᴺ, room_id` — unique su `member_id` (un membro in una sola auto); trigger di capienza
- `car_expenses`: `id, car_id, label, amount, paid_by_member_id, room_id, created_at`
- `car_cargo`: `id, car_id, item, packed, room_id, created_at`
- `delay_reports`: `id, car_id, reason, minutes_estimate, reported_by, created_at, resolved_at, room_id`
- `general_expenses`: `id, room_id, label, amount, paid_by_member_id, waived, waived_by_member_id, created_at`
- `general_expense_participants`: `id, expense_id, member_id, room_id` — **unique `(expense_id, member_id)`**
- `board_notes`: `id, room_id ᴺᴺ, text, pinned, created_at`
- `board_links`: `id, room_id ᴺᴺ, label, url, created_at`
- `room_checklist_items`: `id, room_id, title, assigned_to, status ('da_portare'|'portato'), created_by, created_at`
- `stop_proposals`: `id, room_id, car_id (null=tutta la stanza), proposed_by, type, note, created_at, expires_at` — **nessuna colonna `status`**: l'esito è derivato dai voti
- `stop_proposal_votes`: `proposal_id, member_id (pk composita), vote, voted_at, room_id`
- `ride_requests`: `id, room_id, member_id, status ('pending'|'matched'|'cancelled'), created_at, matched_car_id`
- `radar_positions`: `member_id (pk), room_id ᴺᴺ, lat, lng, updated_at`

ᴺᴺ = `not null` aggiunto dal blocco di fix, con backfill solo da riferimenti
univoci e interruzione transazionale in caso di ambiguità (nessuna riga
cancellata, nessun dato inventato). Realtime e `replica identity full` attivi su
tutte le tabelle di stanza.

**Aggiungere una feature allo schema:** un nuovo blocco `-- ═══ … ═══` in fondo al
file, idempotente, che include RLS scoped, grant per colonna, publication realtime
e `notify pgrst, 'reload schema'`. Vedi `supabase/README.md`.

---

## 8. Design system

Palette **obsidian**, dark unica (nessun light mode). Token Tailwind v4 in
`src/index.css` (`@theme`): usare sempre i nomi, mai hex letterali nei componenti.

| Token | Ruolo | Valore |
|---|---|---|
| `ink` | sfondo pagina | `#0a0a0f` |
| `ink-deep` | sfondo overlay/bottom sheet | `#111118` |
| `surface` | sfondo card | `#1a1a25` |
| `border-soft` | bordo card standard | `rgba(100,100,180,0.1)` |
| `border-strong` | bordo card evidenziata/sheet | `rgba(100,100,180,0.2)` |
| `border-dashed` | bordo tratteggiato (slot vuoti) | `#4a4a6a` |
| `highlight-from` / `highlight-to` | gradiente card evidenziata | `#1a1a25` → `#111118` |
| `cream` | testo principale | `#c9c9e0` |
| `muted` | testo secondario | `#9999b5` |
| `amber` | accento (in corso / attenzione) | `#e8a33d` |
| `teal` | accento (positivo / attivo) | `#46d9c9` |
| `coral` | alert (saldi aperti, ritardi, errori) | `#e76f51` |

Font (Google Fonts, in `index.html`): tutto **Roboto**. `font-sans` = corpo;
`font-serif` = Roboto con `font-weight:700` e tracking stretto (titoli: mantiene
la gerarchia senza una seconda famiglia); `font-mono` = Roboto Mono per
dati/importi/codici/eyebrow, dove serve allineamento tabellare.

**Componenti in `src/components/ui/`:** `ScreenHeader` (eyebrow mono + titolo +
azione), `Chip` (`muted|amber|teal|alert`), `Card` (`surface|highlight|flat|dashed`,
tappabile con `onClick`), `Button` (`primary|teal|outline|surface`, `md|sm`),
`TextField` (label + hint), `BottomSheet` (`<dialog>` nativo, dal basso su mobile e
centrato su desktop, focus confinato, Escape, ritorno del focus), `Skeleton`,
`Toaster`, `ConnectionBanner` (offline + dimensione coda + "Riprova").
`TabBar` è in `src/components/`.

`BottomSheet` è **l'unico** pattern di overlay: non introdurne altri. Nessun nuovo
pattern visivo senza necessità reale.

---

## 9. Route

| Route | Pagina |
|---|---|
| `/` | Home: onboarding a 3 scelte se vuota, altrimenti liste |
| `/join/:inviteCode` | risolve stanza o comitiva, chiede il nome, entra |
| `/resume/:token` | link di recupero: rivendica un membro su questo device |
| `/crew/:crewId` | comitiva: partecipanti, eventi, invito |
| `/room/:roomId` | stanza, 5 tab in `?tab=` |
| `*` | pagina inesistente, con rientro alla Home |

Tutte in `lazy()`; `ErrorBoundary` a monte evita la schermata bianca senza via
d'uscita — l'app si usa in mobilità, dove "torna indietro" spesso non basta.

---

## 10. Dove siamo arrivati

**Cronologia del lavoro**
1. **STEP 0→7** (fino a `063768f`) — audit iniziale (`docs/AUDIT.md`), schema
   unificato in un file, separazione error/empty, realtime filtrato per stanza,
   mutazioni centralizzate, coda offline, identità recuperabile, cruscotto per
   fase, skeleton coerenti.
2. **Refactoring UI e flussi** (`5d60ce1`) — `PersonalSummary`, `ArchiveSummary`,
   `TextField`, `formatMoney`, pagine lazy. Vedi `docs/REFACTOR_PROGRESS.md`.
3. **Piano di correzione tecnica in 6 fasi** (`fce98ae` → `9623cf7`), nato da un
   audit che ha trovato 26 rilievi. Resoconto in `docs/TECH_FIX_PROGRESS.md`:
   - **Fase 0** `strict: true`, test nel typecheck, regole lint aggiunte.
   - **Fase 1** RLS scoped, `member_devices`, 5 RPC di ingresso, privilegi per
     colonna, gate di accesso riscritto.
   - **Fase 2** timezone dell'orario evento, ordinamento deterministico, quote
     spesa univoche, form che non si svuotano più in caso di errore.
   - **Fase 3** poll 20s→90s condizionato e in foreground, rimozione di due query
     che alimentavano campi mai letti, meteo in cache.
   - **Fase 4** coda offline con distinzione transitorio/permanente, rollback
     ottimistico chirurgico, `not null` sui riferimenti, capienza auto garantita
     dal DB, codice invito CSPRNG a 7 caratteri, soste che scompaiono.
   - **Fase 5** PWA con precache e cache per identità, smoke UI e PWA in CI.

**Stato delle verifiche:** `npm run check`, `npm test` (58 test) e `npm run build`
passano. Smoke UI e PWA in CI sulle pull request. `scripts/verifyMembership.mjs`
prova i flussi reali contro il DB in sola DML, creando e ripulendo dati di prova.

**Limiti noti e lavoro non ancora fatto**
1. **Archivio** vincolato solo dall'interfaccia: manca il vincolo server che
   impedisca le scritture su una stanza `closed`.
2. **Spese**: rimborsi non registrabili, ripartizione dei resti in centesimi non
   implementata, idempotenza completa del salvataggio in due passi ancora da
   fare lato server.
3. **Coda offline**: nessun coordinamento fra più tab aperte; la cache non
   sopravvive alla riapertura dell'app senza rete.
4. **Radar**: nessuna garanzia di funzionamento in background (limite delle API
   del browser); da provare su telefoni fisici con permessi e rete reali.
5. **Flag TypeScript** rimasti disattivati per scelta: `noUncheckedIndexedAccess`
   (21 diagnostiche), `exactOptionalPropertyTypes` (4).
   `no-floating-promises` richiede `oxlint-tsgolint`, non adottato.
6. **Rieseguibilità dello SQL** verificata staticamente: la doppia applicazione
   reale non è stata provata, per il divieto di eseguire DDL.
7. `docs/AUDIT.md` è una fotografia storica del 3 agosto 2026 e **non** riflette
   il codice attuale; contiene ancora il project ref Supabase in chiaro.
