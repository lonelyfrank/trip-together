# Database — Trip Together

La **fonte di verità** dello schema sono le migration in [`migrations/`](migrations/),
applicate con la **Supabase CLI**. Ogni migration è idempotente (`create ... if not
exists`, `drop policy if exists`, guardie sul realtime), quindi si può ri-applicare
senza errori anche su un progetto che ha già parte dello schema.

## Applicare lo schema

```bash
supabase link --project-ref bifnswddcovwmpqnvvgi   # una volta
supabase db push                                   # applica le migration mancanti
```

Da un database **vuoto**, `supabase db push` porta allo schema completo senza
passaggi manuali. Abilita anche **Authentication → Providers → Anonymous sign-ins**.

## Verificare lo stato

```bash
npm run db:check   # elenca le tabelle attese ma assenti sul DB collegato
```

In DEV il controllo gira anche all'avvio dell'app (warning in console).

## File in questa cartella

- `migrations/` — **fonte di verità**, applicata con `supabase db push`.
- `schema.sql` — istantanea leggibile **generata** (`supabase db dump -f supabase/schema.sql`); non modificare a mano.
- `CATCH_UP.sql` — **deprecato**, fallback manuale via SQL Editor per chi non ha la CLI. Da rimuovere quando `db push` è verificato in produzione.
