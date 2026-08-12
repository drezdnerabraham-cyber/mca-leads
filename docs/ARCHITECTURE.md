# Architecture

## Pipeline overview

```
 ┌─────────────────────┐      daily       ┌──────────────────┐
 │  Vibe Prospecting    │ ───────────────▶ │  Claude session   │
 │  (Explorium data,    │   fetch+export   │  (daily Routine)  │
 │  MCP tool — only     │                  └────────┬─────────┘
 │  reachable here)     │                           │ POST lead batch (JSON)
 └─────────────────────┘                           ▼
                                          ┌────────────────────┐
                                          │  n8n webhook        │
                                          │  mca-lead-intake     │
                                          └────────┬────────────┘
                                                   │
                       ┌───────────────────────────┼───────────────────────────┐
                       ▼                           ▼                           ▼
              ┌────────────────┐         ┌─────────────────┐        ┌──────────────────┐
              │ Dedupe against  │         │ Score lead        │        │ Normalize fields   │
              │ GHL (skip if    │         │ (see scoring-     │        │ to GHL contact     │
              │ contact exists) │         │  rules.json)       │        │ schema             │
              └────────┬────────┘         └────────┬─────────┘        └─────────┬─────────┘
                       └───────────────────────────┼───────────────────────────┘
                                                   ▼
                                     ┌───────────────────────────┐
                                     │ Upsert GHL contact +        │
                                     │ create opportunity in       │
                                     │ "New Lead" pipeline stage   │
                                     └────────────┬────────────────┘
                                                   ▼
                                     ┌───────────────────────────┐
                                     │ Trigger GHL warm-up          │
                                     │ SMS/email sequence           │
                                     └────────────┬────────────────┘
                                                   ▼
                                     ┌───────────────────────────┐
                                     │ Create call task for team    │
                                     │ ("qualifying call" = your    │
                                     │  own live transfer)          │
                                     └───────────────────────────┘
```

## Why the split between Claude and n8n

Vibe Prospecting (built on Explorium) is only reachable as an MCP tool inside a Claude session — there's no separate API key issued to plug directly into n8n. So:

- **Claude session (daily Routine)** owns the sourcing step: runs the validated query (`config/vibe-query-config.json`), exports the qualified batch, and POSTs it to an n8n webhook. This is the only step that has to live here.
- **n8n** owns everything downstream: dedup, scoring, GHL contact/opportunity creation, sequence triggering, call task creation. This is where a second source (UCC data, once a vendor is picked) plugs in as a second webhook/HTTP trigger feeding the same downstream flow.

This keeps the GHL-facing automation in one place (n8n, which the team already runs) regardless of how many upstream sources feed it.

## Adding the UCC data source later

Once a UCC vendor is selected (see `docs/LEAD_SOURCING.md`), it becomes a second entry point into the same n8n flow — either:
- A scheduled n8n HTTP Request node pulling the vendor's API directly (if they offer one), or
- A scheduled n8n node reading a vendor-delivered CSV/SFTP drop

Either way it should feed into the same dedupe → score → GHL upsert → sequence → call-task chain, just tagged with a different `lead_source` value so the team can see which channel a lead came from and the two sources can be measured against each other.

## Credentials this pipeline needs (none collected yet)

| Credential | Used by | Purpose |
|---|---|---|
| GHL API key + Location ID | n8n | Create/update contacts, opportunities, trigger sequences |
| n8n webhook URL + auth token | Claude Routine | Deliver daily lead batch from Vibe Prospecting |
| UCC vendor API key or SFTP creds | n8n | Pull UCC batch once a vendor is selected |

See `config/.env.example`.
