# Trip Together — contesto per sviluppo

Demo di validazione (Vite + React + TypeScript + Supabase). Vedi [README.md](README.md) per il setup.

## Vincoli non negoziabili

- **Niente chat libera in nessuna tab.** Ogni campo testo deve restare corto/opzionale (nota, titolo, causale predefinita) — mai un textarea libero senza limite che diventi un thread di messaggi.
- **Radar mai automatico.** Attivazione sempre esplicita (toggle), mai attivo di default all'ingresso in stanza.
- **Ogni auto è una mini-stanza indipendente.** Spese e carico di un'auto non si mescolano mai con quelli di un'altra auto.
- **Nessun account/login.** Identità via sessione anonima Supabase (`ensureAnonymousSession()` in `src/lib/supabase.ts`). Il device ricorda in `localStorage` a quali **stanze** e **comitive** appartiene e con quale id-membro (`src/lib/localRooms.ts`: `saveRoomEntry`/`saveCrewEntry`).

## Comitive vs eventi (modello portante)

- Una **comitiva** (`crews`) è un gruppo **persistente** con partecipanti stabili (`crew_members`) e un proprio codice invito. Al suo interno si organizzano più **eventi**.
- Un **evento/stanza** (`rooms`) può appartenere a una comitiva (`rooms.crew_id`) oppure essere un **evento rapido** standalone (`crew_id` null).
- I workflow di creazione/ingresso stanno tutti in `src/lib/membership.ts`: `createRoomAndJoin(title, name, crewId?)`, `joinRoomAsMember`, `createCrew`, `joinCrewAsMember`, `resolveInviteCode` (capisce se un codice è di una stanza o di una comitiva). Le pagine (Home/Join/Crew) non duplicano questa logica.

## Palette "obsidian" (dark, unica — nessun light mode)

Definita come token Tailwind v4 in `src/index.css` (`@theme`). Usare sempre i nomi, mai hex letterali nei componenti:

| Token | Ruolo | Hex/valore |
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
| `amber` | accento (stati "in corso/attenzione") | `#e8a33d` |
| `teal` | accento (stati positivi/attivi) | `#46d9c9` |
| `coral` | alert (saldi aperti, ritardi, errori) | `#e76f51` |

Font (Google Fonts, caricati in `index.html`): tutto Roboto. `font-sans` = Roboto (corpo, default); `font-serif` = Roboto ma con `font-weight:700` + tracking stretto via regola in `index.css` (usato per i titoli — mantiene la gerarchia senza un family serif separato); `font-mono` = Roboto Mono (dati/importi/codici/eyebrow, per allineamento tabellare).

## Componenti ricorrenti (in `src/components/ui/`)

- **`ScreenHeader`** — eyebrow mono + titolo serif + action opzionale a destra.
- **`Chip`** — pillola di stato, tone: `muted | amber | teal | alert`.
- **`Card`** — card `rounded-[20px]`, tone: `surface | highlight | flat | dashed`; passa `onClick` per renderla tappabile (`active:scale-[0.98]` automatico).
- **`Button`** — variant: `primary | teal | outline | surface`, size: `md | sm`.
- **`BottomSheet`** — dialogo modale nativo, dal basso su mobile e centrato su desktop, con focus confinato, Escape, ritorno del focus e scroll interno (usato da `MapSheet`, dai form di creazione, dai picker come `TravelStatusChip`): non introdurre un nuovo pattern di overlay, riusare questo.
- **`TabBar`** (in `src/components/`) — navigazione Evento/Auto/Bacheca/Spese/Radar con tab persistente nella query string.

Componenti di dominio in `src/components/room/`: `DestinationCard` (destinazione + `EventTimeRow` per data/ora con salvataggio separato + `WeatherStrip` meteo Open-Meteo), `StanzaTab`/`AutoTab`/`BachecaTab`/`SpeseTab`/`RadarTab`, `TravelStatusChip`, `DelayReportBadge`, `ChecklistSection`, `StopProposalsSection`/`StopProposalCard`, `RideRequestsSection`, `ReadinessBanner`, `CloseRoomSection`.

Utility in `src/lib/`: `mapLinks` (parse coordinate da link Google/Apple Maps/Waze), `weather` (Open-Meteo, no API key), `balances` (netting spese), `proposals`, `readiness`, `geo`, `time`, `eventTint`, `roomCode`, `membership`, `localRooms`.

Nessun nuovo pattern visivo (card, bottone, sheet) senza necessità reale — riusare quanto sopra.

## Schema Supabase attuale (nomi reali — verificare sempre prima di aggiungere migration)

Schema completo in `supabase/schema.sql` (installazione da zero, distruttiva). Attenzione ai nomi reali: non "room", "room_members", "car_members", "expenses". Tabelle/colonne:

- `crews`: `id, invite_code, name, created_by, created_at`
- `crew_members`: `id, crew_id, display_name, auth_user_id, role ('creator'|'member'), created_at` (unique `crew_id, auth_user_id`)
- `rooms` (non `room`): `id, invite_code, title, crew_id (null=standalone), destination_label, destination_lat, destination_lng, event_time, status, created_by, created_at`
- `members` (non `room_members`): `id, room_id, display_name, auth_user_id, role ('creator'|'guest'), confirmed, confirmed_at, created_at`
- `cars`: `id, room_id, driver_member_id, seats_total, travel_status ('non_partita'|'in_partenza'|'in_viaggio'|'fermo'|'arrivata'), travel_status_updated_at, travel_status_updated_by, created_at`
- `car_passengers` (non `car_members`): `id, car_id, member_id` (unique su `member_id`: un membro sta in una sola auto)
- `car_expenses`: `id, car_id, label, amount, paid_by_member_id`
- `car_cargo`: `id, car_id, item, packed`
- `delay_reports`: `id, car_id, reason, minutes_estimate, reported_by, created_at, resolved_at`
- `general_expenses` (non `expenses`): `id, room_id, label, amount, paid_by_member_id, waived, waived_by_member_id, created_at`
- `general_expense_participants`: `id, expense_id, member_id`
- `board_notes`: `id, room_id, text, pinned, created_at`
- `board_links`: `id, room_id, label, url`
- `room_checklist_items`: `id, room_id, title, assigned_to, status ('da_portare'|'portato'), created_by, created_at`
- `stop_proposals`: `id, room_id, car_id (null=tutta la stanza), proposed_by, type, note, status, created_at, expires_at`
- `stop_proposal_votes`: `proposal_id, member_id (pk composita), vote, voted_at`
- `ride_requests`: `id, room_id, member_id, status ('pending'|'matched'|'cancelled'), created_at, matched_car_id`
- `radar_positions`: `member_id (pk), room_id, lat, lng, updated_at` — mai storicizzata, sempre sovrascritta

RLS: **permissiva** (`using (true) with check (true)`) su tutte le tabelle in questa fase di validazione — l'accesso è comunque scoped dall'`invite_code`/`id` non indovinabile. Realtime abilitato su tutte le tabelle.

**Fonte di verità dello schema:** le migration in `supabase/migrations/`, applicate con `supabase db push` (vedi `supabase/README.md`). Verifica rapida: `npm run db:check`. Il codice degrada senza crashare quando una tabella manca (le query supabase-js risolvono con `{data:null}`).

L'hook `src/hooks/useRoomData.ts` centralizza le letture e il realtime della stanza.
Le sottoscrizioni sono filtrate per stanza e aggiornano la cache in modo mirato;
un refetch periodico ogni 20 secondi e la riconnessione riconciliano i dati.
Gli errori delle funzionalità sono esposti in `sectionErrors`, evitando di mostrare
liste vuote al posto di letture fallite. Il riepilogo non consente archiviazione
con dati economici incompleti. Analoghi: `useCrewData`, `useMyRooms`, `useMyCrews`.

Primo refactoring UI: `PersonalSummary` propone l'azione personale, `ArchiveSummary`
mostra gli eventi chiusi, `TextField` centralizza label e hint, `formatMoney` formatta
gli importi in euro. L'archiviazione conserva i dati; solo il radar viene ripulito
separatamente. Le pagine sono caricate su richiesta da `App.tsx`. RLS e protezione
server dell'archivio sono ancora da completare: vedi `docs/REFACTOR_PROGRESS.md`.

## Route

`/` (Home: onboarding a 3 scelte se vuoto, altrimenti liste), `/join/:inviteCode` (risolve stanza o comitiva), `/crew/:crewId`, `/room/:roomId`.
