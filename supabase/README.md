# Database — Trip Together

La **fonte di verità** dello schema è un unico file:
[`migrations/20260724000000_schema.sql`](migrations/20260724000000_schema.sql). È
idempotente (`create ... if not exists`, `drop policy if exists`, guardie sul
realtime), quindi si può ri-applicare per intero senza errori anche su un
progetto che ha già parte dello schema.

## Applicare lo schema (flusso reale: SQL Editor)

1. Apri [l'SQL Editor del progetto](https://supabase.com/dashboard/project/bifnswddcovwmpqnvvgi/sql/new).
2. Copia **tutto** il contenuto di `migrations/20260724000000_schema.sql` e incollalo.
3. Premi **Run**.

Sicuro da rilanciare in qualsiasi momento: su un progetto che ha già lo
schema applicato non fa nulla di distruttivo, aggiunge solo ciò che manca.
Abilita anche **Authentication → Providers → Anonymous sign-ins** (una tantum,
non è parte dello schema SQL).

### Alternativa: Supabase CLI

Se in futuro colleghi la CLI a questo progetto, lo stesso file funziona anche così:

```bash
supabase link --project-ref bifnswddcovwmpqnvvgi   # una volta
supabase db push                                   # applica le migration mancanti
```

## Verificare lo stato

```bash
npm run db:check   # elenca le tabelle attese ma assenti sul DB collegato
```

In DEV il controllo gira anche all'avvio dell'app (warning in console). Nota:
controlla solo l'**esistenza delle tabelle**, non le colonne — uno schema
parzialmente disallineato (es. una colonna mancante) può risultare "completo"
qui pur dando errori 400 a runtime. In caso di dubbio, l'unico modo affidabile
di verificare è rieseguire lo schema.sql per intero: essendo idempotente, non
fa danni e colma eventuali buchi.

## Come estendere lo schema (aggiungere una feature)

Aggiungi un nuovo blocco **in fondo** a `migrations/20260724000000_schema.sql`,
seguendo lo stile dei blocchi esistenti:

- Intestazione con lo stesso separatore `═══` usato per gli altri blocchi, e
  una riga di descrizione della feature.
- Solo istruzioni **idempotenti**: `create table if not exists`, `alter table
  ... add column if not exists`, `create index if not exists`, `create or
  replace function`, `drop trigger/policy if exists` prima di ricrearli.
- Per una tabella nuova, replica il pattern RLS + Realtime già usato (blocco
  `do $$ ... foreach t in array tbls ...` che abilita RLS permissiva e
  aggiunge la tabella alla pubblicazione `supabase_realtime` solo se non
  già presente).
- Se la tabella ha un `room_id` (o comunque un riferimento diretto a una
  stanza) verifica se serve anche in `REPLICA IDENTITY FULL` (necessaria
  perché gli eventi DELETE realtime portino il `room_id`, non solo la PK) —
  aggiungila all'array nel blocco finale del file.
- **Non creare un nuovo file di migration.** Un solo file resta la fonte di
  verità finché il flusso reale è "incolla nell'SQL Editor"; frammentarlo di
  nuovo ricrea il problema che ha causato questa unificazione (non sapere
  quale file incollare quando lo schema è disallineato).

## File in questa cartella

- `migrations/20260724000000_schema.sql` — **fonte di verità**, unico file, vedi sopra.
- `schema.sql` — istantanea leggibile **generata** (`supabase db dump -f supabase/schema.sql`); non modificare a mano, non eseguire manualmente (contiene `drop table` distruttivi).
