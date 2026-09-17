# AUDIT — stato reale (STEP 0)

> ⚠️ **Documento storico.** Fotografia dello stato *prima* di qualunque fix, usata come base per pianificare gli STEP 1–7. Tutti gli STEP 0→7 sono stati completati (vedi commit `19a2be9`…`063768f` e `8e26bd6`): schema unificato, error/empty separati, realtime filtrato, mutazioni centralizzate con coda offline, identità recuperabile, dashboard per fase, skeleton/empty/error coerenti. I problemi descritti qui sotto **non riflettono più il codice attuale** — utile solo per capire da dove si è partiti.
>
> Prodotto il 2026-08-03. Nessuna modifica al codice in questo step: è la base per gli step 1–7.
> Metodo DB: `curl` sull'endpoint REST Supabase del progetto `bifnswddcovwmpqnvvgi` con la anon key.

---

## 1. Stato del DB vivo

Solo lo **schema base** è applicato. Nessuna migration feature (001→007) è passata.

| Tabella | Stato reale |
|---|---|
| `rooms` | ✅ presente |
| `members` | ✅ presente |
| `cars` | ✅ presente |
| `car_passengers` | ✅ presente |
| `car_expenses` | ✅ presente |
| `car_cargo` | ✅ presente |
| `general_expenses` | ✅ presente |
| `general_expense_participants` | ✅ presente |
| `board_notes` | ✅ presente |
| `board_links` | ✅ presente |
| `radar_positions` | ✅ presente |
| `crews` | ❌ ASSENTE |
| `crew_members` | ❌ ASSENTE |
| `delay_reports` | ❌ ASSENTE |
| `room_checklist_items` | ❌ ASSENTE |
| `stop_proposals` | ❌ ASSENTE |
| `stop_proposal_votes` | ❌ ASSENTE |
| `ride_requests` | ❌ ASSENTE |

Colonne attese ma **assenti** su tabelle presenti:

| Colonna | Stato |
|---|---|
| `rooms.crew_id` | ❌ ASSENTE |
| `rooms.event_time` | ❌ ASSENTE |
| `members.confirmed`, `members.confirmed_at` | ❌ ASSENTE |
| `cars.travel_status`, `cars.travel_status_updated_at`, `cars.travel_status_updated_by` | ❌ ASSENTE |

**Conseguenza:** feature Auto-status, ritardi, checklist, proposte sosta, matching passaggi, readiness/data evento e comitive **non funzionano** contro il DB attuale. L'app non crasha (vedi §3) ma le tab restano vuote e "Crea comitiva" / "Salva data" danno 404/errore.

---

## 2. Divergenza schema.sql ↔ DB vivo ↔ migration ↔ CATCH_UP

Quattro fonti di verità che non coincidono:

- **`supabase/schema.sql`** — schema completo (con crews, tutte le feature). Distruttivo (DROP+CREATE). Header dichiara "esegui in SQL editor". **Non riflette il DB vivo.**
- **DB vivo** — solo schema base (vedi §1).
- **File migration `001`→`007`** — presenti in `supabase/migrations/`; le 002–005 usano policy RLS **scoped** via `auth.uid()`; la 007 e le altre permissive. **Nessuna applicata al DB.**
- **`supabase/CATCH_UP.sql`** — script unico idempotente che bundla 001→007 con RLS **permissiva** (diverge dai file migration 002–005 sulle policy). È il rito manuale attualmente necessario. **Non eseguito.**

Divergenze puntuali:
1. DB vivo manca di tutto ciò che sta oltre lo schema base.
2. `CATCH_UP.sql` e i file `002`–`005` **non concordano sulle policy RLS** (permissiva vs scoped).
3. `schema.sql` è scritto a mano e già oggi rischia di divergere dai file migration.
4. `README.md` è **obsoleto**: cita `supabase/schema.sql` con la sola lista base e file inesistenti (`useRoom.ts`, `CarsPanel`, `RadarPanel`). Anche la struttura elencata è vecchia.
5. Non esiste un meccanismo che segnali una tabella mancante: oggi è invisibile finché non fallisce una specifica azione utente.

→ È esattamente il problema che lo **STEP 1** deve chiudere (una sola verità, applicazione senza rito manuale, check automatico).

---

## 3. Mappa delle query supabase-js

**Punto critico trasversale:** **nessun hook gestisce `error` separatamente da `data` vuoto.** Tutti gli hook fanno `res.data ?? []`. Solo `src/lib/supabase.ts` e `src/lib/membership.ts` ispezionano `error`. Quindi *tabella inesistente* e *lista vuota* producono lo **stesso** stato UI (→ STEP 2).

### Letture (hook)
| File | Tabelle lette | Gestisce error? |
|---|---|---|
| `hooks/useRoomData.ts` | rooms, members, cars, car_passengers, car_expenses, car_cargo, delay_reports, general_expenses, general_expense_participants, board_notes, board_links, radar_positions, room_checklist_items, stop_proposals, stop_proposal_votes, ride_requests | ❌ solo `?? []` |
| `hooks/useCrewData.ts` | crews, crew_members, rooms | ❌ solo `?? []` |
| `hooks/useMyRooms.ts` | rooms, members, car_expenses, general_expenses, radar_positions | ❌ solo `?? []` |
| `hooks/useMyCrews.ts` | crews, crew_members, rooms | ❌ solo `?? []` |

### Scritture (componenti/lib — mutazioni sparse, NON centralizzate)
| File | Tabelle scritte |
|---|---|
| `lib/membership.ts` | rooms, members, crews, crew_members (✅ gestisce error) |
| `components/room/AutoTab.tsx` | cars, car_passengers, car_cargo |
| `components/room/TravelStatusChip.tsx` | cars, delay_reports |
| `components/room/DelayReportBadge.tsx` | delay_reports |
| `components/room/DestinationCard.tsx` | rooms (✅ gestisce error) |
| `components/room/EventTimeRow.tsx` | rooms (✅ gestisce error) |
| `components/room/BachecaTab.tsx` | board_notes, board_links |
| `components/room/ChecklistSection.tsx` | room_checklist_items |
| `components/room/SpeseTab.tsx` | general_expenses, general_expense_participants |
| `components/room/StopProposalsSection.tsx` / `StopProposalCard.tsx` | stop_proposals, stop_proposal_votes |
| `components/room/RideRequestsSection.tsx` | ride_requests, car_passengers |
| `components/room/CloseRoomSection.tsx` | cars, general_expenses, board_notes, board_links, radar_positions, rooms |
| `components/room/ReadinessBanner.tsx` | members |
| `components/room/RadarTab.tsx` | radar_positions |
| `pages/Room.tsx` | rooms (lookup invite_code) |

→ Le mutazioni chiamano `supabase.from(...)` **direttamente nei componenti**, senza wrapper, senza rollback, senza feedback d'errore uniforme (→ STEP 2 e STEP 4).

---

## 4. Mappa realtime

Due canali, uno per pagina-contesto:

- **`room-data:${roomId}`** (`useRoomData`): **1 canale, 16 sottoscrizioni `postgres_changes`**. Ogni evento chiama `loadAll()` → **refetch totale di tutte e 16 le query**. Nessuno store normalizzato: applica su array annidati ricaricati da capo.
  - **Filtrate** per `room_id`/`id` (10): rooms, members, cars, general_expenses, board_notes, board_links, radar_positions, room_checklist_items, stop_proposals, ride_requests.
  - **NON filtrate** (6) → refetch scatenato da **qualsiasi stanza di qualsiasi utente**: `car_passengers`, `car_expenses`, `car_cargo`, `delay_reports`, `general_expense_participants`, `stop_proposal_votes`.
- **`crew-data:${crewId}`** (`useCrewData`): 1 canale, 3 sottoscrizioni (crews, crew_members, rooms), tutte filtrate; anche qui refetch totale ad ogni evento.

**Impatto:** con 8 membri e 3 auto in movimento, ogni tap di chiunque (in questa o altre stanze, per le 6 tabelle non filtrate) causa 16 query. È la tempesta di refetch che lo **STEP 3** deve eliminare (un canale filtrato + patch mirate su store normalizzato).

---

## 5. Stati UI presenti / assenti

Legenda: ✅ presente · ⚠️ parziale · ❌ assente

| Vista | loading | empty | error | offline |
|---|---|---|---|---|
| Home (`pages/Home.tsx`) | ⚠️ testo "Caricamento..." | ✅ onboarding + "Nessun evento" | ⚠️ solo su create (banner coral) | ❌ |
| Join (`pages/Join.tsx`) | ✅ "Verifica del codice..." | — | ✅ notFound + banner | ❌ |
| Crew (`pages/Crew.tsx`) | ✅ "Caricamento..." | ✅ "Nessun evento" | ⚠️ solo notFound + create | ❌ |
| Room shell (`pages/Room.tsx`) | ✅ "Caricamento..." | — | ⚠️ "Stanza/Membro non trovato" | ❌ |
| Tab Stanza | ❌ | ⚠️ per-blocco | ⚠️ solo save destinazione/data | ❌ |
| Tab Auto | ❌ | ✅ "Nessuna auto" | ⚠️ solo su delay | ❌ |
| Tab Bacheca | ❌ | ✅ "Nessuna nota/link" | ❌ | ❌ |
| Tab Spese | ❌ | ✅ "Nessuna spesa" | ❌ | ❌ |
| Tab Radar | ❌ | ✅ testo off/attesa | ⚠️ errore geoloc | ❌ |

Trasversale:
- **Skeleton**: assenti ovunque (unico `animate-pulse` in `WeatherStrip`). Solo testo "Caricamento...".
- **Toast**: assente. Nessun sistema centralizzato di conferme/errori/rollback (→ STEP 4/7).
- **Offline**: `navigator.onLine` mai usato; nessun indicatore di connessione (→ STEP 4).
- **Error state con "Riprova"**: assente; gli errori mostrati sono solo banner coral su singole azioni di scrittura, mai sulle letture.

---

## Sintesi → priorità confermata dal piano

- **Osservabilità (STEP 0–2):** oggi tabella mancante ≡ lista vuota, errore di lettura invisibile, quattro fonti di schema divergenti. È il buco più grave.
- **Affidabilità (STEP 3–4):** 6 sottoscrizioni realtime non filtrate + refetch totale; zero mutazioni ottimistiche / coda offline, per un'app d'uso in mobilità.
- **Fiducia (STEP 5):** identità solo in `localStorage`, nessun rientro L1.
- **Rifinitura (STEP 6–7):** un solo stato "pieno e connesso"; niente skeleton/empty/error/offline/toast coerenti.

### Nota git (fuori dagli step, da decidere)
Working tree non pulito all'avvio: la **feature comitive** è implementata ma **non committata** (crews/crew_members/Crew page/onboarding + `migrations/007` + `CATCH_UP.sql`), e ci sono **2 commit locali non pushati**. Gli step chiedono un commit dedicato ciascuno: va deciso se committare/pushare prima questo lavoro pendente per partire da una base pulita.
