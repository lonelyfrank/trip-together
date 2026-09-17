# Primo intervento — 17 settembre 2026

Implementazione sul working tree esistente; le modifiche locali precedenti sono conservate.

## Interventi realizzati

- Home con prossimo evento, eventi delle comitive già raggiunti, onboarding a due azioni principali, archivio apribile e disposizione desktop a due colonne.
- Riepilogo personale con presenza, auto, saldo e azione contestuale; evento a due colonne su desktop.
- Navigazione persistente in `?tab=…`, indicazione della sezione corrente e pagina per URL inesistenti.
- Dialoghi nativi con focus iniziale/confinato, Escape, ripristino del focus, sfondo non interattivo e scroll interno. Safe area e movimento ridotto gestiti.
- Campi con label persistenti, pulsanti più ampi, testo secondario più chiaro e notifiche annunciate alle tecnologie assistive.
- Saldo personale nelle spese, importi italiani con centesimi, creazione spesa in pannello, errore esplicito e ripetizione delle quote senza ricreare la spesa nella stessa sessione del form.
- Auto personale in cima. Cambio auto tramite un unico upsert sul vincolo `member_id`: non viene più cancellato il posto prima di tentare l'assegnazione.
- Errori di caricamento separati per funzionalità. Il riepilogo non mostra zero come saldo attendibile con letture incomplete; la chiusura è nascosta anche per spese senza pagatore/quote.
- Archiviazione tramite cambio di stato, senza eliminare auto, spese o bacheca. Conferma in pannello, controllo dell'esito e aggiornamento della cache. Le posizioni vengono ripulite separatamente.
- Radar cancellabile: callback obsolete ignorate, timer fermato all'uscita, scritture e pulizia serializzate anche tra riaperture della tab.
- Flush offline che preserva nuove operazioni aggiunte durante una richiesta, conserva quelle fallite e permette di riprovare dal banner.
- Pagine caricate su richiesta; eliminato il warning di build relativo al singolo chunk oltre 500 kB. Non è una misura di velocità percepita: il bundle condiviso Supabase resta da scaricare.
- README e contesto aggiornati.

## Verifiche

- Typecheck e lint.
- Suite Node: 7 file, inclusi i nuovi casi di regressione sul flush concorrente, interruzione di rete e fallimento di una richiesta.
- Build di produzione.
- Chromium con viewport mobile e desktop, API Supabase simulate: onboarding, focus iniziale, Tab, Escape e ritorno al trigger; presenza; tab dopo reload; errori spese; retry quote senza duplicare la spesa; callback GPS tardiva; archiviazione senza cancellazioni dello storico; apertura dell'archivio senza controlli di modifica.
- Nessun errore JavaScript nei percorsi verificati. Schermate controllate per onboarding, form e riepilogo mobile.
- Script ripetibile: `scripts/uiSmoke.mjs`; dipendenza di test Playwright esterna, configurabile tramite ambiente (vedi README).

Non sono state applicate migration né create entità sul database reale durante queste verifiche.

## Limiti e lavoro ancora previsto

1. **RLS e identità:** policy ancora permissive e token di recupero ancora basato sugli identificativi. Serve una modifica coordinata a membership, inviti e recupero per evitare di interrompere i partecipanti esistenti. Nessuna garanzia di isolamento nuova in questo intervento.
2. **Transazioni server:** spesa+quote, posto+richiesta passaggio e verifica della capienza richiedono operazioni server atomiche. L'upsert evita il vuoto tra vecchio e nuovo posto, ma non impedisce che due persone occupino contemporaneamente l'ultimo posto.
3. **Archiviazione:** sola lettura nell'interfaccia; manca ancora il vincolo server. Controllo dei saldi lato client e pulizia radar separata non costituiscono una transazione. La pulizia può fallire offline, con segnalazione dell'errore.
4. **Spese:** il retry del secondo passaggio conserva l'id nel componente. Un reload durante un salvataggio parziale o una risposta persa richiedono ancora riconciliazione/idempotenza server. Restano da implementare registrazione rimborsi, ripartizione dei resti in centesimi e relativi test.
5. **Offline:** questa correzione copre aggiunte concorrenti nello stesso contesto. Restano coordinamento tra più tab, idempotenza dei retry, conflitti permanenti e persistenza della cache per riaprire l'app senza rete.
6. **Radar e dispositivi:** le API del browser non garantiscono operatività in background. Vanno provati permessi reali e interruzioni di rete su telefoni fisici; le posizioni già pubblicate possono persistere temporaneamente se la cancellazione non raggiunge il server.
7. **UI:** uniformare progressivamente gli altri form e i dettagli Auto/Bacheca; aggiungere luogo/data opzionali in creazione e migliorare ulteriormente il caricamento per dominio.

Il precedente audit rimane la fotografia iniziale. Questo documento descrive il primo insieme di modifiche effettivamente implementato, non la conclusione dell'intera roadmap.
