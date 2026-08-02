# Data layer

One Cloudflare D1 database plus R2 object storage. D1 holds app and auth data;
R2 holds blobs and the OpenNext cache.

## Databases

| Store | Binding | Holds | Driver |
| --- | --- | --- | --- |
| Cloudflare D1 | `DB` (`linkchat-auth`) | App data plus better-auth users, sessions, accounts, and verification | Drizzle D1 adapter via `src/db/index.ts` |
| R2 `linkchat-images` | `IMAGES_BUCKET` | Avatars, project images, inbound email bodies | `@aws-sdk/client-s3` via `src/lib/r2.ts` |
| R2 `linkchat-cache` | `NEXT_INC_CACHE_R2_BUCKET` | OpenNext incremental cache (static-assets) | OpenNext |

## Schema

- Canonical schema: `src/db/schema.ts` (Drizzle SQLite schema for D1).
- Drizzle Kit config: `drizzle.config.ts`.
- Checked-in SQL migrations: `migrations/d1/*.sql`.

## Migrations

The D1 migration history is the supported path:

| Path | Scope |
| --- | --- |
| `migrations/d1/000_better_auth_tables.sql` … `010_creator_opportunities.sql` | Better-auth base tables, D1 app tables, and additive feature migrations. |
| `migrations/0001_initial.sql`, `migrations/0002_personal_dms.sql` | Archived pre-D1 Turso history; do not use for current local setup. |

### How to apply

- **Local schema + fixtures:** `pnpm db:setup:local`.
- **Production:** apply reviewed D1 migrations manually as part of the
  documented release procedure.
- **Operator scripts:** `backfill:aggregates` and `enrich:profile` use local D1
  unless the operator explicitly supplies `--remote`; local state can be
  isolated further with `--persist-to <directory>`.

The local command uses `wrangler.local.jsonc`, which pins
`migrations_dir = migrations/d1`, always passes `--local`, and rejects
`--remote`. It loads four demo profiles after the schema is current. Wrangler
tracks applied migrations; the seed is idempotent and replaces only records
owned by the demo user.

> **Constraint:** verify migration strategy before any production schema
> change. The local setup command is not a production migration tool.

## R2

- Public base: `R2_PUBLIC_BASE_URL` (avatars / project images served from R2).
- Private helpers for inbound email bodies live in `src/lib/r2.ts` (separate
  from the public image helpers).
- Requires `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
