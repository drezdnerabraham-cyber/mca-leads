# MCA Leads

An in-house lead generation system for merchant cash advance (MCA) outreach: source qualified small-business leads daily, push them into GoHighLevel (GHL) already scored and warmed up, and let the team close instead of dial cold.

## Why this exists

Buying pre-packaged "MCA leads" or live-transfer leads from a vendor works, but every lead carries someone else's markup ($15-150+/lead). This repo builds the equivalent pipeline in-house:

- **Source** small businesses that are actually showing buying-intent signals for financing (not random firmographic lists)
- **Score & dedupe** automatically so the team only sees leads worth calling
- **Push to GHL** with a warm-up sequence already firing, so the first human touch isn't a cold call
- **Team makes the qualifying call** — that call is the "live transfer," at data + labor cost instead of $75-150/lead

See `docs/ARCHITECTURE.md` for the full pipeline and `docs/LEAD_SOURCING.md` for exactly how leads are sourced and why the filters are set the way they are.

## Status

- [x] Lead sourcing strategy validated (Vibe Prospecting / Explorium intent data — see `docs/LEAD_SOURCING.md`)
- [ ] UCC data vendor selected (Bank/Equipment UCC filings — see `docs/LEAD_SOURCING.md` for why not MCA-secured-party UCC)
- [x] n8n intake workflow scaffolded (`n8n/workflows/mca-lead-intake.json`)
- [ ] GoHighLevel pipeline/custom fields configured (needs GHL API key + location ID)
- [ ] Daily automated pull wired up (needs n8n webhook URL + GHL credentials)

## Repo layout

```
docs/
  ARCHITECTURE.md      full pipeline design
  LEAD_SOURCING.md      exactly how/why leads are sourced, validated filter configs
  COMPLIANCE.md         TCPA / state commercial-financing disclosure notes for outbound
config/
  vibe-query-config.json   validated Vibe Prospecting filter set
  scoring-rules.json       lead scoring template
  .env.example             required credentials/env vars
n8n/
  workflows/mca-lead-intake.json   importable n8n workflow
  README.md                        import + setup instructions
```
