# Parseon

**Document extraction and review**

Parseon turns supported documents into draft structured fields for review and correction. Check extracted values against the original before using them. The public output sample contains fictional data and does not run an extraction.

## Features
- **AI Extraction**: Uses OpenAI GPT-4o Vision to parse documents.
- **Context-Aware**: Optimizes extraction based on document type.
- **Saved documents**: Supabase provides authentication, database storage, and file storage. Hosted access rules and owner isolation must be verified before customer use; infrastructure choice alone does not establish compliance.

## Tech Stack
- Frontend: React + Vite + TypeScript
- Styling: TailwindCSS
- Backend: Supabase (Auth, Database, Storage)
- Deployment: Vercel; a legacy Netlify function is also present.

## Preview configuration

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for each intended deployment environment and rebuild. Use the project's public anonymous/publishable key, never a service-role key in a `VITE_` variable.

Apply `supabase/migrations/20261025000000_owner_access_and_quotas.sql` to the backend before enabling sign-in. It defines the `documents` table with owner-only row rules, immutable owner and file reference, a unique storage path, a private 2 MiB `documents` bucket with owner-folder storage rules, and the shared extraction quota (`claim_extraction_quota`). It is written for a new, dedicated preview project; compare an existing project's table, bucket and policies before applying it there. Default limits are 5 extractions per user per minute, 40 per user per day and 400 per day across all users; change them in `extraction_quota_limits`.

Without a complete, valid Supabase connection, the landing page and fictional sample remain available. Sign-in and document operations explain that account features are unavailable. No placeholder backend or production credentials are substituted. This fallback is a public preview, not a working extraction service.

The extraction endpoint also needs its server-side `OPENAI_API_KEY`, plus `SUPABASE_URL` / `SUPABASE_ANON_KEY` (or the same existing `VITE_` public connection values). It verifies the Bearer token with Supabase Auth, then reserves the shared quota with the caller's own session, before sending a document to OpenAI. If the quota cannot be confirmed (for example, the migration is missing), it fails closed without contacting the provider. A service-role key is not needed. As inspected October 23, the hosted project has these connection settings only for production; preview remains unconfigured. No production credentials were copied to previews. The database quota limits requests, not spend: also set a provider-side budget/limit on the OpenAI project.

## Extraction contract

Both Vercel and the legacy Netlify adapter share one authenticated handler. Requests contain only `docType` and a base64 `dataUrl` for a PDF, PNG, JPEG or WebP up to 2 MiB. The handler checks the file signature, fixes the model/prompt/output limit on the server, disallows remote file URLs and does not pass through caller-supplied model instructions. PDF bytes use an OpenAI file part rather than an image URL. The browser queues at most ten documents and shows the size/provider notice before processing. The request uses a 10-second auth timeout and a 45-second provider timeout.

The server rejects incomplete, refused, empty, malformed or unbounded results; confidence 0 remains 0. It requests literal extraction and does not ask the model to infer missing values or make underwriting decisions. The UI labels confidence as an AI estimate. Failures stay failures; the former development fallback to fictional data has been removed. The public sample remains explicitly fictional. A batch cannot report a saved document if its sign-in expires before saving. Single-document saves retain corrected fields on failure or session expiry for retry.

Local and reopened PDFs use a PDF preview with an explicit open-in-new-tab fallback. CSV export quotes cells, doubles embedded quotes and prefixes formula-like text with an apostrophe; spreadsheet re-save/import behavior varies, so use JSON for lossless interchange. This is not a universal formula-execution guarantee across spreadsheet software. Temporary document/export URLs are released. See [OWASP CSV guidance](https://community.owasp.org/attacks/CSV_Injection).

Sources: [Supabase verified user lookup](https://supabase.com/docs/reference/javascript/auth-getuser) and [OpenAI PDF file inputs](https://developers.openai.com/api/docs/guides/file-inputs).

Before release, verify sign-in, real extraction of synthetic PDF/image documents, corrected saves, reload, file previews, quota refusals and two-account isolation against the intended backend. Neither a successful build, the emulated policy tests nor the public sample proves these workflows on hosted Supabase. Provider budgets, retention/deletion and physical-device checks remain launch work. Existing production database/storage policies have not been inspected or changed. The 2 MiB request bound is not a spending guarantee.

Batch retry runs only the failed item. A failed save keeps its successful extraction for retry; changing the document type discards that cached extraction. Confirmed saves retain the database-assigned document ID, so reviewing and correcting a batch item updates its original record and preserves the rest of the queue. Batch processing explicitly saves draft fields for later review. Leaving the page stops subsequent extraction/save steps, and switching accounts resets the workspace. An older session-restore response cannot undo a newer sign-out.

## Save recovery

Each document gets a save key once, reused by every retry, and its storage path (`<user id>/<save key>.<ext>`) is the idempotency key. Originals are uploaded without overwrite; a retry that finds the file already stored continues. The `documents.file_path` unique rule turns a repeated insert into a conflict, which the client confirms by updating that same owner record, so a dropped acknowledgment (including a browser's automatic resend) cannot create a duplicate. When the database definitively refuses the record, the uploaded file is removed. When there is no answer at all, the file is kept and the UI says a retry is safe. Deletion removes the file first and then requires a confirmed owner-scoped row deletion, so a failed step can be retried. Objects orphaned by an abandoned unconfirmed save (no later retry) still need a periodic storage sweep; see the operating notes in the readiness handoff.

## Dependencies

The October 23 update removed all eight high advisory entries. The three moderate Tailwind 3 `postcss-selector-parser` entries are resolved by an npm override to the patched 7.1.6 release instead of a breaking Tailwind 4 upgrade; the generated stylesheet was byte-identical before and after (SHA-256 `3db89ade…779f`). `npm audit` reports 0 vulnerabilities.

## Validation

Run `npm test` for authenticated extraction, shared quota refusals, file/result validation, adapter failures, CSV/PDF handling, document corrections, unconfirmed-save recovery, missing-configuration preview, session recovery and the phone document list. `supabase/policies.test.js` applies the migration to embedded Postgres (PGlite) with minimal stand-ins for Supabase's `auth` and `storage` schemas and checks two-account row/storage isolation and the quota function; it proves the SQL rules, not hosted Supabase. Provider and account requests in other tests are mocked; no real documents or provider credits are used. Run `npm run build` for TypeScript and the production bundle. The pull-request workflow runs both using Node 24.
