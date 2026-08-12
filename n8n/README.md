# n8n Setup

## Import

1. n8n → Workflows → Import from File → `workflows/mca-lead-intake.json`
2. Create credentials (n8n → Credentials → New):
   - **MCA Webhook Auth** (Header Auth) — a shared secret header the Claude-run daily job sends; matches `N8N_WEBHOOK_AUTH_TOKEN` in `config/.env.example`
   - **GHL API Key** (Header Auth, header name `Authorization`, value `Bearer <your GHL API key>`)
3. Set environment variables in n8n (Settings → Variables, or your n8n instance's env config) matching `config/.env.example`: `GHL_LOCATION_ID`, `GHL_PIPELINE_ID`, `GHL_NEW_LEAD_STAGE_ID`, `GHL_WARMUP_WORKFLOW_ID`.
4. In GoHighLevel, create (if they don't exist):
   - A pipeline + "New Lead" stage → copy the IDs into the env vars above
   - Custom contact fields: `lead_score`, `lead_priority`, `intent_topic`
   - A warm-up automation/workflow (SMS + email sequence for a brand-new unqualified lead) → copy its ID into `GHL_WARMUP_WORKFLOW_ID`
5. Activate the workflow. Copy its production webhook URL into `N8N_WEBHOOK_URL`.

## What it does

`Lead Batch Webhook` receives `{ source, leads: [...] }`, splits into individual leads, scores each one (`config/scoring-rules.json` logic, duplicated inline in the Score & Normalize node — keep both in sync if you tune weights), drops anything scoring 0 or below (e.g. flagged subsidiaries), then for everything else: upserts the GHL contact, creates an opportunity in the New Lead stage, fires the warm-up sequence, and creates a call task for the team sized by priority (hot = call within 4h, warm = 24h, cold = 72h).

## Wiring up the daily Vibe Prospecting pull

Vibe Prospecting is only reachable inside a Claude session (MCP tool, no standalone API key issued). The daily pull is a Claude Routine, not an n8n schedule trigger:

1. Give the Claude session this workflow's webhook URL + auth token once GHL is configured.
2. Ask Claude to set up a daily Routine that runs the query in `config/vibe-query-config.json`, exports the qualified batch, and POSTs `{ source: "vibe_prospecting", leads: [...] }` to the webhook.

Once a UCC vendor is selected (`docs/LEAD_SOURCING.md`), add a second n8n trigger (Schedule Trigger + HTTP Request to the vendor's API, or an SFTP/CSV read node) feeding the same `Split Batch` node with `source: "ucc"`.

## Not yet done

- GHL pipeline/stage/custom-field/workflow IDs need to be created in your GHL account and filled into env vars — none of this repo can do that without your GHL API key.
- The webhook auth token needs to be generated and shared between n8n and the Claude Routine.
