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

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for each intended deployment environment and rebuild. Use the project's public anonymous/publishable key, never a service-role key in a `VITE_` variable. Restrict document and storage access with tested owner rules.

Without a complete, valid Supabase connection, the landing page and fictional sample remain available. Sign-in and document operations explain that account features are unavailable. No placeholder backend or production credentials are substituted. This fallback is a public preview, not a working extraction service.

The extraction endpoint also needs its server-side `OPENAI_API_KEY`, plus `SUPABASE_URL` / `SUPABASE_ANON_KEY` (or the same existing `VITE_` public connection values). It verifies the Bearer token with Supabase Auth before sending a document to OpenAI. A service-role key is not needed. As inspected October 23, the hosted project has these connection settings only for production; preview remains unconfigured. No production credentials were copied to previews.

## Extraction contract

Both Vercel and the legacy Netlify adapter share one authenticated handler. Requests contain only `docType` and a base64 `dataUrl` for a PDF, PNG, JPEG or WebP up to 2 MiB. The handler checks the file signature, fixes the model/prompt/output limit on the server, disallows remote file URLs and does not pass through caller-supplied model instructions. PDF bytes use an OpenAI file part rather than an image URL. The browser queues at most ten documents and shows the size/provider notice before processing. The request uses a 10-second auth timeout and a 45-second provider timeout.

The server rejects incomplete, refused, empty, malformed or unbounded results; confidence 0 remains 0. It requests literal extraction and does not ask the model to infer missing values or make underwriting decisions. The UI labels confidence as an AI estimate. Failures stay failures; the former development fallback to fictional data has been removed. The public sample remains explicitly fictional. A batch cannot report a saved document if its sign-in expires before saving. Single-document saves retain corrected fields on failure or session expiry for retry.

Local and reopened PDFs use a PDF preview with an explicit open-in-new-tab fallback. CSV export quotes cells, doubles embedded quotes and prefixes formula-like text with an apostrophe; spreadsheet re-save/import behavior varies, so use JSON for lossless interchange. This is not a universal formula-execution guarantee across spreadsheet software. Temporary document/export URLs are released. See [OWASP CSV guidance](https://community.owasp.org/attacks/CSV_Injection).

Sources: [Supabase verified user lookup](https://supabase.com/docs/reference/javascript/auth-getuser) and [OpenAI PDF file inputs](https://developers.openai.com/api/docs/guides/file-inputs).

Before release, verify sign-in, real extraction of synthetic PDF/image documents, corrected saves, reload, file previews, and owner isolation against the intended backend. Neither a successful build nor the public sample proves these workflows. Shared rate/concurrency quotas, provider budgets, tested row/storage policies, retention/deletion, authenticated CSV exports and mobile checks remain launch work. Existing database/storage policies have not been inspected or changed. The 2 MiB request bound is not a spending guarantee.

Batch retry runs only the failed item. A failed save keeps its successful extraction for retry; changing the document type discards that cached extraction. Confirmed saves retain the database-assigned document ID, so reviewing and correcting a batch item updates its original record and preserves the rest of the queue. Batch processing explicitly saves draft fields for later review. Leaving the page stops subsequent extraction/save steps, and switching accounts resets the workspace. An older session-restore response cannot undo a newer sign-out.

The October 23 compatible dependency update removed all eight high advisory entries reported for the production dependency graph. Three moderate entries remain in the Tailwind 3 selector-parser dependency chain; the registry suggests a breaking Tailwind 4 upgrade, which was not applied. Review that build-time dependency separately. Ambiguous database acknowledgments still require backend-specific idempotency and recovery work: an interrupted metadata write can leave an uploaded file or an already-saved row. Failed metadata-write cleanup also remains open. The repaired retry tests cover known failures and confirmed saved-record corrections, not distributed exactly-once writes.

## Validation

Run `npm test` for authenticated extraction, file/result validation, adapter failures, CSV/PDF handling, document corrections, missing-configuration preview and session recovery. Provider and account requests in tests are mocked; no real documents or provider credits are used. Run `npm run build` for TypeScript and the production bundle. The pull-request workflow runs both using Node 24.
