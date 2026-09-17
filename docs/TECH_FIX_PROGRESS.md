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

## Fasi successive

Fase 1: preparazione del blocco SQL RLS/RPC; nessuna modifica client dipendente
prima della conferma dell'utente. Le verifiche sul database e sugli eventi realtime
INSERT/UPDATE/DELETE devono ancora essere eseguite dopo l'applicazione.

Fasi 2–5: da implementare, con gli ulteriori punti di conferma SQL previsti dal piano.
