# Trip Together

Organizzazione di eventi tra amici: inviti senza account, comitive riutilizzabili,
auto e passaggi, checklist, bacheca, spese e radar attivato esplicitamente.
React + TypeScript + Vite, con Supabase e TanStack Query.

## Avvio

1. Configura un progetto Supabase e abilita **Anonymous sign-ins**.
2. Segui [le istruzioni database](supabase/README.md) per lo schema. Non usare
   `supabase/schema.sql` come script di installazione: contiene operazioni distruttive.
3. Copia `.env.example` in `.env` e configura `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
4. Esegui `npm install` e `npm run dev`.
5. Apri l'indirizzo HTTPS indicato da Vite, normalmente `https://localhost:5173`.
   Il certificato di sviluppo è locale. Per un telefono sulla stessa rete usa
   l'indirizzo Network mostrato da Vite; il radar richiede un contesto HTTPS attendibile.

## Verifiche

```bash
npm run check       # TypeScript e lint
npm test            # Test della logica, inclusa la sincronizzazione della coda
npm run build       # Build di produzione
npm run db:check    # Controllo delle tabelle sul progetto Supabase configurato
```

`scripts/uiSmoke.mjs` verifica nel browser onboarding, focus dei dialoghi, tab
persistenti, errori di caricamento, retry delle quote, arresto radar e archivio.
Le richieste Supabase vengono simulate. Richiede Playwright e Chromium disponibili
nell'ambiente di test, oltre al dev server già avviato:

```bash
node scripts/uiSmoke.mjs
```

Se Playwright è installato in un ambiente esterno, imposta `PLAYWRIGHT_MODULE`
al percorso del suo modulo `index.mjs`. Puoi specificare il browser con
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` e il server con `UI_BASE_URL`.
Playwright non è una dipendenza dell'app. Le schermate del controllo sono salvate
in `/tmp/trip-*.png`.

## Struttura

- `src/App.tsx`: route e caricamento delle pagine su richiesta.
- `src/pages`: Home, ingresso da invito, recupero, comitive ed evento.
- `src/components/ui`: componenti condivisi, campi, dialoghi e notifiche.
- `src/components/room`: riepilogo personale, auto, spese, radar e archivio.
- `src/hooks/useRoomData.ts`: letture, errori per sezione e aggiornamenti realtime.
- `src/lib/membership.ts`: creazione e ingresso in eventi e comitive.
- `src/lib/mutations`: scritture centralizzate.
- `src/lib/offlineQueue.ts`, `drainQueue.ts`: coda persistente e sincronizzazione.
- `supabase/migrations/20260724000000_schema.sql`: schema attuale.

Le tab dell'evento sono condivisibili con `?tab=auto`, `?tab=spese`, ecc.
L'archiviazione conserva i dati e mostra un riepilogo senza controlli di modifica;
la pulizia delle posizioni radar è separata. Gli eventi archiviati dalla versione
precedente possono avere già perso parte dei dati, che non vengono ricostruiti.

## Stato del refactoring

Vedi [analisi e piano](docs/PRODUCT_REVIEW.md) e
[interventi implementati e limiti](docs/REFACTOR_PROGRESS.md).
La protezione degli accessi nel database resta quella del prototipo: le policy
sono permissive. Il riepilogo in sola lettura è un comportamento dell'interfaccia,
non un nuovo vincolo server. Il recupero sicuro dell'identità, le transazioni
server e il flusso dei rimborsi richiedono ancora il successivo intervento sullo schema.
