# Parseon customer readiness

Status on October 25, 2026: **not customer-ready; hosted public sample only.** Signed-in extraction has not run against any hosted backend, because the preview backend has not been chosen. Nothing here was merged or released.

## What is proven, and at which level

| Area | Local unit (mocked) | Emulated | Hosted preview | Production |
| --- | --- | --- | --- | --- |
| Authenticated extraction boundary, file limits, result validation | ✅ | — | ❌ not configured | ❌ |
| Shared extraction quota (per user/minute, per user/day, global/day), fail-closed | ✅ handler | ✅ SQL in PGlite | ❌ | ❌ |
| Owner-only rows, immutable owner/file reference, unique save path | ✅ client | ✅ SQL in PGlite, two accounts | ❌ | ❌ policies not inspected |
| Private bucket, owner-folder storage rules, no overwrite | — | ✅ SQL in PGlite, two accounts | ❌ | ❌ |
| Unconfirmed save recovery (dropped upload/insert, retry, cleanup on refusal) | ✅ | ✅ local emulated backend in Chromium | ❌ | ❌ |
| Upload → extract → correct → save → reload → CSV/JSON export | ✅ pieces | ✅ local emulated backend, 375 px | ❌ | ❌ |
| Batch quota failure → retry only the failed item | ✅ | ✅ local emulated backend, 375 px | ❌ | ❌ |
| Phone layout (review toolbar, document list) | ✅ list actions | ✅ 375 px, no horizontal overflow | ❌ | ❌ physical devices/Safari |
| Public fictional sample | — | — | ✅ (Oct 23) | — |

"Emulated" means either embedded Postgres with stand-ins for Supabase's `auth`/`storage` schemas (`supabase/policies.test.js`) or the in-memory local backend in the task workspace (`work/parseon-local-backend/mock-backend.mjs`) that imitates the REST shapes with a canned extraction. Neither is hosted Supabase or OpenAI.

## Backend contract

`supabase/migrations/20261025000000_owner_access_and_quotas.sql` is the required schema for a dedicated preview project. The extraction handler refuses to call the provider if `claim_extraction_quota` is missing or unanswered. See the README for save recovery and quota details.

## Owner decisions needed

1. **Preview backend:** create (or name) a dedicated Supabase preview project with no customer data, and approve applying the migration to it. Recommended: a new free project, not the production project.
2. **Preview secrets:** approve setting Vercel *Preview*-scoped `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (that project's public key) and `OPENAI_API_KEY` (a separate, budget-capped OpenAI project key).
3. **Budgets:** confirm the default quota (5/user/minute, 40/user/day, 400/day overall) and an OpenAI monthly budget cap for the preview key.
4. **Test accounts:** two dedicated fictional test sign-ins on the preview project (email confirmation setting is your choice).
5. **Retention:** how long originals and extracted fields are kept, and whether account deletion must remove them (the schema cascades rows on user deletion; stored files need a cleanup job).

## Hosted verification to run once 1–4 are approved

Synthetic PDF and PNG: upload → extraction → correct a field → save → reload → reopen → CSV/JSON export; second account sees nothing and cannot open the first account's signed file path; exhaust the per-minute quota and retry; batch with one failed item and retry. Record request IDs and screenshots; use only fictional documents.

## Remaining launch work (not blocked on the backend choice)

- Periodic sweep of storage objects with no `documents` row (abandoned unconfirmed saves), plus account-deletion file cleanup.
- Original file names are not stored; the library shows the save key. Adding a `file_name` column needs the production schema compared first.
- Production database/storage policies were never inspected; compare them with the migration before any production release.
- Physical phone and Safari checks; ~508 kB JavaScript bundle warning.
