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

The extraction endpoint also needs its server-side OpenAI configuration. Before release, verify sign-in, extraction of synthetic documents, corrected saves, reload, file previews, and access isolation against the intended backend. Neither a successful build nor the public sample proves these workflows.

## Validation

Run `npm test` for the document workflow, missing-configuration preview, and session recovery checks. Run `npm run build` for TypeScript and the production bundle.
