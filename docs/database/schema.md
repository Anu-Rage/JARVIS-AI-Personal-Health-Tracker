# Database Schema

Source of truth: [supabase/migrations/0001_init.sql](../../supabase/migrations/0001_init.sql).

Table design and rationale are documented in §17-18 of [JARVIS_Architecture.md](../architecture/JARVIS_Architecture.md).

## Applying migrations

```bash
# Link once per machine
supabase link --project-ref <your-project-ref>

# Apply all pending migrations to the linked project
supabase db push
```

Or paste the SQL directly into the Supabase dashboard's SQL editor for a one-off setup.

## Adding a new migration

```bash
supabase migration new <description>
```

Never edit `0001_init.sql` after it has been applied to any environment — add a new migration file instead.
