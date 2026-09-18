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

I test browser simulano le API Supabase: verificano i flussi UI, le RPC di ingresso,
gli errori, la coda offline e la PWA. Playwright è uno strumento di test effimero,
non una dipendenza dell'app. Per eseguirli sulla build di produzione:

```bash
npx --yes --package=playwright@1.62.1 playwright install chromium
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# In un secondo terminale, con preview ancora attiva:
UI_BASE_URL=https://localhost:4173 npx --yes --package=playwright@1.62.1 -c 'npm run test:ui && npm run test:pwa'
```

Se Playwright è installato in un ambiente esterno, imposta `PLAYWRIGHT_MODULE`
al percorso del suo modulo `index.mjs`. Puoi specificare il browser con
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` e il server con `UI_BASE_URL`.
Il test PWA richiede `VITE_SUPABASE_URL` uguale a quello usato nella build (legge
anche `.env`). Le schermate UI sono salvate in `/tmp/trip-*.png`.
Il job CI esegue entrambi i test su ogni pull request, con Chromium e API simulate.

## Uso offline

La build di produzione include manifest e service worker; dopo il primo caricamento
online la pagina può riaprirsi senza rete. Le letture REST Supabase già visitate
usano NetworkFirst e una cache separata per token di sessione, formato e intervallo
richiesto, con massimo 200 risposte e scadenza a 24 ore. Un rinnovo del token richiede
nuove letture online; la cache non garantisce la disponibilità di tutti i dati.

Autenticazione e scritture non vengono memorizzate dal service worker. Le modifiche
offline passano soltanto dalla coda dell'app, che le invia al ritorno della rete e
segnala gli scarti. Gli aggiornamenti della PWA attendono la chiusura delle schede
aperte, così un nuovo rilascio non ricarica un form durante la compilazione.

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
[primo intervento UI](docs/REFACTOR_PROGRESS.md), seguiti dal
[resoconto delle sei fasi tecniche](docs/TECH_FIX_PROGRESS.md).
Gli accessi sono ora limitati dall'appartenenza nel database; creazione, ingresso
e recupero usano RPC. Capienza auto, quote univoche e riferimenti obbligatori hanno
vincoli server. Restano futuri il flusso dei rimborsi, l'archiviazione vincolata
anche dal server e il coordinamento della coda fra più schede.
