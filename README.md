# Base — powered by Call Stream AI

A web app that helps non-coders fix and build voice AI agents written in the **Based**
language (Brainbase platform). Users describe their problem, paste their flow, give an
example transcript, and state their goal — the app sends it to Anthropic Claude with the
full Based knowledge base injected as system context, then returns a diagnosis and
corrected Based code.

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Design**: x.com-inspired dark UI, mobile-first, PWA-ready manifest for future native apps
- **Backend**: Next.js API route → Anthropic Claude (`claude-sonnet-4-5`)
- **Storage**: Supabase (Postgres for submissions, Storage bucket for attachments)
- **Hosting**: Render (Docker, blueprint included). Also runs anywhere Node 20 runs.

---

## Local dev

```bash
cd base-callstream
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY (and optionally SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
npm install
npm run dev
# → http://localhost:3000
```

Supabase is **optional** in dev — the app runs fine without it (no logging happens).

---

## Supabase setup

1. Create a Supabase project.
2. SQL Editor → paste & run [`supabase/schema.sql`](./supabase/schema.sql). It creates:
   - `submissions` table (request + response log)
   - `attachments` table (metadata for uploaded files)
   - `attachments` private storage bucket
   - RLS enabled (server uses service-role key, which bypasses RLS)
3. Project Settings → API → copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Deploy to Render

The repo includes [`render.yaml`](./render.yaml) — a Render Blueprint.

1. Push this folder to a GitHub repo.
2. In Render → **New → Blueprint** → select the repo.
3. Render reads `render.yaml`, creates a Docker web service.
4. Set the secret env vars when prompted:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy. The service builds from `Dockerfile` and serves on the port Render injects.

---

## Architecture

```
Browser (Next.js client)
   │
   │  POST /api/ask  { problem, flow, example, goal, attachments[] }
   ▼
Next.js API route  (src/app/api/ask/route.ts)
   ├─ Builds system prompt with full Based knowledge (src/lib/basedKnowledge.ts)
   ├─ Calls Anthropic Claude (text + image + PDF blocks)
   ├─ Best-effort logs request + response to Supabase
   └─ Returns markdown answer
```

### Anthropic prompt
The system prompt instructs Claude to:
1. Diagnose the problem in plain English (no jargon)
2. Return a complete corrected Based flow inside a fenced code block
3. List the specific changes
4. Suggest one verification step

### Attachments
Up to 6 files / 18MB total. Sent inline as base64:
- **Images** (`image/png|jpeg|gif|webp`) → Anthropic image blocks
- **PDFs** → Anthropic document blocks
- **Text-like files** (`text/*`, `.py`, `.txt`, `.md`, `.json`, `.log`, `.based`) → inlined as text
- **Everything else** → described to the model by name + size

All originals are also uploaded to Supabase Storage when configured.

---

## Mobile / future native app
- Single-column responsive layout, sticky top nav, large tap targets
- `manifest.webmanifest` + `apple-touch-icon` already wired → installable PWA
- Standalone display mode + theme color for native feel
- API is JSON-only — drop-in for a React Native / Capacitor / SwiftUI client later

---

## File map

```
base-callstream/
├── src/
│   ├── app/
│   │   ├── api/ask/route.ts     # Anthropic + Supabase logging
│   │   ├── globals.css          # Tailwind + x.com-style scrollbar/markdown
│   │   ├── layout.tsx           # Metadata, viewport, PWA hooks
│   │   └── page.tsx             # The 4-input form + answer panel
│   ├── components/
│   │   └── Logo.tsx             # Call Stream waveform mark (SVG)
│   └── lib/
│       ├── basedKnowledge.ts    # The "Base brain" injected into the system prompt
│       └── supabase.ts          # Server-side Supabase client (service role)
├── supabase/
│   └── schema.sql               # Idempotent schema + storage bucket
├── public/
│   ├── favicon.svg
│   └── manifest.webmanifest
├── Dockerfile
├── render.yaml                  # Render blueprint
├── next.config.mjs              # standalone output, 20MB body limit
├── tailwind.config.ts
└── package.json
```
