# Database — Trip Together

La fonte di verità è il solo file
[`migrations/20260724000000_schema.sql`](migrations/20260724000000_schema.sql).
Il flusso operativo è manuale nell'SQL Editor di Supabase; la CLI non è collegata.
`schema.sql` è uno snapshot manuale divergente con operazioni distruttive: non
usarlo per installare, aggiornare o riparare il database.

## Applicare lo schema

- **Progetto nuovo e vuoto:** eseguire il file canonico completo nell'SQL Editor
  del proprio progetto, prima di esporre l'app. Abilitare anche Authentication →
  Providers → Anonymous sign-ins.
- **Progetto esistente:** applicare soltanto i nuovi blocchi completi, in ordine,
  conservando BEGIN/COMMIT dove presenti. Non rilanciare automaticamente la parte
  storica: contiene policy permissive successivamente sostituite.

I tre blocchi del piano tecnico, già confermati applicati dall'utente, sono:

1. `Fix: appartenenza server-side, RLS scoped e RPC di ingresso atomiche`.
2. `Fix: ordine cronologico e quote spesa univoche`.
3. `Fix: riferimenti obbligatori, capienza auto e soste client-only`.

Sono scritti con guardie e definizioni ripetibili. La rieseguibilità è stata
revisionata staticamente, **non verificata con una seconda esecuzione DDL**.
Il blocco dei riferimenti interrompe la transazione quando i dati preesistenti
non consentono un backfill univoco o superano già la capienza: quei dati richiedono
una correzione esplicita, non vengono eliminati automaticamente.

## Verificare lo stato

```bash
npm run db:check
```

In DEV la stessa sonda gira all'avvio. Controlla soltanto l'esistenza delle
tabelle, non colonne, funzioni, grant, trigger o policy. Un esito positivo non
certifica l'allineamento completo; confrontare il blocco pertinente con lo schema
reale prima di intervenire. Non rieseguire lo snapshot per correggere un errore.

`scripts/verifyMembership.mjs` verifica accessi, inviti, recupero, capienza e
realtime sul progetto configurato: **crea dati di prova**, ripulisce le righe
operative e archivia gli eventi, conservando comitive e appartenenze isolate.
Richiede Playwright e un'app locale avviata (configurazione nel README principale).
I test `test:ui` e `test:pwa`, invece, simulano le API e non scrivono sul database.

## Estendere lo schema

Aggiungere un blocco `Fix: …` in fondo alla migration unica, senza creare nuovi
file. Usare `if not exists`, `create or replace`, rimozione/ricreazione di policy
e trigger e transazioni dove servono; verificare anche il comportamento su dati
preesistenti. Comunicare il blocco esatto da applicare prima del client dipendente.

Le nuove tabelle devono avere RLS basata sull'appartenenza server, tramite
`is_room_member` o `is_crew_member`; non copiare le policy permissive storiche.
I riferimenti denormalizzati alle stanze devono essere derivati dal parent sul
server. Le operazioni prima dell'appartenenza passano per RPC con input validati,
`security definer`, `search_path` esplicito e grant limitati.

Aggiungere le tabelle necessarie alla pubblicazione realtime con una guardia.
Con RLS non assumere che DELETE contenga tutti i campi precedenti, anche con
REPLICA IDENTITY FULL: il client deve riconciliare tramite chiave primaria e
rilettura. Verificare INSERT, UPDATE e DELETE dopo la conferma della replica;
il solo stato SUBSCRIBED non garantisce che PostgreSQL stia già inviando eventi.
