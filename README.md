# Trip Together — demo MVP

Cruscotto realtime per un evento tra amici: stanza + destinazione condivisa + auto (posti) +
radar di prossimità. Nessun login — identità di "Livello 0" via sessione anonima Supabase
(vedi sezione 4/15 dello spec di prodotto). Spese, carico auto, bacheca, comitiva riutilizzabile
e i livelli di identità superiori sono fuori scope in questa fase di validazione.

## Setup

1. Crea un progetto su [supabase.com](https://supabase.com).
2. In **Authentication → Sign In / Providers**, abilita **Anonymous sign-ins**.
3. Apri lo **SQL Editor** e incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql).
4. Copia `.env.example` in `.env` e inserisci `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API).
5. `npm install`
6. `npm run dev`

## Testare il radar da telefono

La Geolocation API del browser richiede HTTPS (o `localhost`). Per testare da un telefono reale
sulla stessa rete, esponi il dev server con un tunnel:

```
npx localtunnel --port 5173
```

oppure genera un certificato locale con `@vitejs/plugin-basic-ssl`.

## Struttura

- `supabase/schema.sql` — tabelle, RLS, realtime (rooms, members, cars, car_passengers, radar_positions)
- `src/lib/supabase.ts` — client + sessione anonima
- `src/hooks/useRoom.ts` — fetch iniziale + sottoscrizioni realtime per una stanza
- `src/pages/Home.tsx` — crea/entra in una stanza
- `src/pages/Room.tsx` — cruscotto della stanza
- `src/components/` — DestinationCard, CarsPanel, RadarPanel
