# Trip Together — contesto per sviluppo

Demo di validazione (Vite + React + TypeScript + Supabase). Vedi [README.md](README.md) per il setup.

## Vincoli non negoziabili

- **Niente chat libera in nessuna tab.** Ogni campo testo deve restare corto/opzionale (nota, titolo, causale predefinita) — mai un textarea libero senza limite che diventi un thread di messaggi.
- **Radar mai automatico.** Attivazione sempre esplicita (toggle), mai attivo di default all'ingresso in stanza.
- **Ogni auto è una mini-stanza indipendente.** Spese e carico di un'auto non si mescolano mai con quelli di un'altra auto.
- **Nessun account/login.** Identità via sessione anonima Supabase (`supabase.auth.signInAnonymously()`), persistita in `localStorage` (vedi `src/lib/localRooms.ts`).

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
| `muted` | testo secondario | `#7878a0` |
| `amber` | accento (stati "in corso/attenzione") | `#e8a33d` |
| `teal` | accento (stati positivi/attivi) | `#46d9c9` |
| `coral` | alert (saldi aperti, ritardi, errori) | `#e76f51` |

Font (Google Fonts, caricati in `index.html`): `font-serif` = Fraunces (titoli), `font-sans` = Inter (corpo, default), `font-mono` = IBM Plex Mono (dati/importi/codici/eyebrow).

## Componenti ricorrenti (in `src/components/ui/`)

- **`ScreenHeader`** — eyebrow mono + titolo serif + action opzionale a destra.
- **`Chip`** — pillola di stato, tone: `muted | amber | teal | alert`.
- **`Card`** — card `rounded-[20px]`, tone: `surface | highlight | flat | dashed`; passa `onClick` per renderla tappabile (`active:scale-[0.98]` automatico).
- **`Button`** — variant: `primary | teal | outline | surface`, size: `md | sm`.
- **`BottomSheet`** — foglio che scorre dal basso (usato da `MapSheet` e da qualunque nuova azione con opzioni multiple): non introdurre un nuovo pattern di overlay, riusare questo.
- **`TabBar`** (in `src/components/`) — tab Stanza/Auto/Bacheca/Spese/Radar con indicatore che scorre.

Nessun nuovo pattern visivo (card, bottone, sheet) senza necessità reale — riusare quanto sopra.

## Schema Supabase attuale (nomi reali — verificare sempre prima di aggiungere migration)

Definito in `supabase/schema.sql`. Nomi tabella/colonna effettivi (attenzione: non "room", "room_members", "car_members", "expenses" — quei nomi non esistono in questo progetto):

- `rooms` (non `room`): `id, invite_code, title, destination_label, destination_lat, destination_lng, status, created_by, created_at`
- `members` (non `room_members`): `id, room_id, display_name, auth_user_id, role ('creator'|'guest'), created_at`
- `cars`: `id, room_id, driver_member_id, seats_total, created_at`
- `car_passengers` (non `car_members`): `id, car_id, member_id` (unique su `member_id`: un membro sta in una sola auto)
- `car_expenses`: `id, car_id, label, amount, paid_by_member_id`
- `car_cargo`: `id, car_id, item, packed`
- `general_expenses` (non `expenses`): `id, room_id, label, amount, paid_by_member_id, waived, waived_by_member_id, created_at`
- `general_expense_participants`: `id, expense_id, member_id`
- `board_notes`: `id, room_id, text, pinned, created_at`
- `board_links`: `id, room_id, label, url`
- `radar_positions`: `member_id (pk), room_id, lat, lng, updated_at` — mai storicizzata, sempre sovrascritta

RLS attuale sulle tabelle esistenti: permissiva (`using (true)`), perché l'accesso è comunque scoped dall'unguessable `invite_code`/`id` in questa fase di validazione. Le **nuove** tabelle vanno invece scoped ai membri della stanza tramite `auth.uid()` = `members.auth_user_id`, coerentemente con quanto richiesto per le nuove funzionalità.

Realtime abilitato su tutte le tabelle sopra. Il hook `src/hooks/useRoomData.ts` centralizza fetch + sottoscrizioni realtime per una stanza; le tabelle senza `room_id` diretto (es. `car_expenses`, `car_cargo`, `car_passengers`) vengono ricaricate per intero ad ogni evento invece di essere filtrate lato realtime — scelta deliberata per semplicità alla scala di un gruppo di amici.
