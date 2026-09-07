# smartlead-mcp-server

An MCP server for [Smartlead](https://smartlead.ai)'s cold-email API — create and manage campaigns, sequences, leads, and sender email accounts from any MCP client (Claude, etc).

Covers the full campaign-creation workflow end to end:

1. `smartlead_create_campaign` — create an empty (DRAFTED) campaign
2. `smartlead_save_sequences` — write the email sequence (subjects/bodies/delays, A/B variants)
3. `smartlead_add_leads` — upload recipients
4. `smartlead_add_email_accounts_to_campaign` — assign sender mailboxes
5. `smartlead_schedule_campaign` — set sending days/hours (optional)
6. `smartlead_update_campaign_status` with `status: "START"` — go live

Plus listing/reading tools for campaigns, leads, email accounts, and analytics, lead-level actions (pause/resume/unsubscribe), and `smartlead_raw_request` as an escape hatch for any Smartlead API endpoint not covered by a dedicated tool.

## 1. Get a Smartlead API key

Smartlead dashboard → **Settings → API Key**.

## 2. Run it

### Local (stdio) — Claude Desktop, or any MCP client that spawns a local process

```bash
npm install
npm run build
SMARTLEAD_API_KEY=your_key_here npm start
```

Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "smartlead": {
      "command": "node",
      "args": ["/absolute/path/to/smartlead-mcp-server/dist/index.js"],
      "env": { "SMARTLEAD_API_KEY": "your_key_here" }
    }
  }
}
```

### Remote (Streamable HTTP) — required for a claude.ai "custom connector"

Custom connectors in claude.ai need a **public HTTPS URL**, not a local process — so this mode has to be deployed somewhere.

```bash
TRANSPORT=http SMARTLEAD_API_KEY=your_key_here MCP_BEARER_TOKEN=pick_a_long_random_secret npm start
# -> listening on http://0.0.0.0:3000/mcp
```

`MCP_BEARER_TOKEN` is optional but strongly recommended once this is deployed publicly — without it, anyone with the URL can operate on your Smartlead account through this server. If set, every request must include `Authorization: Bearer <that token>`.

#### Deploying

Any Node host or container platform works. Using the included `Dockerfile`:

```bash
docker build -t smartlead-mcp-server .
docker run -p 3000:3000 \
  -e SMARTLEAD_API_KEY=your_key_here \
  -e MCP_BEARER_TOKEN=pick_a_long_random_secret \
  smartlead-mcp-server
```

Free/cheap options that work well for a low-traffic personal MCP server: **Render** (Web Service, Docker or Node runtime, free tier), **Railway**, **Fly.io**. All three: point them at this directory, set `SMARTLEAD_API_KEY` and `MCP_BEARER_TOKEN` as environment variables, set start command `npm run build && npm start` (or use the Dockerfile), and set `TRANSPORT=http`. You'll get back a public URL like `https://smartlead-mcp.onrender.com` — the connector URL is that plus `/mcp`.

## 3. Register it as a custom connector in claude.ai

1. claude.ai → **Settings → Connectors → Add custom connector**
2. **Name**: Smartlead
3. **URL**: `https://<your-deployed-host>/mcp`
4. If you set `MCP_BEARER_TOKEN`, add it wherever claude.ai's custom-connector form takes a header/auth value for the request (`Authorization: Bearer <token>`) — the exact field depends on the current claude.ai UI.
5. Save, then enable it for the chats/projects you want it in.

## Tools

| Tool | What it does |
|---|---|
| `smartlead_list_campaigns` | List all campaigns |
| `smartlead_get_campaign` | Get one campaign's details |
| `smartlead_create_campaign` | Create a new (empty, paused) campaign |
| `smartlead_update_campaign_status` | Start / pause / stop a campaign |
| `smartlead_schedule_campaign` | Set sending days/hours/pacing |
| `smartlead_delete_campaign` | Permanently delete a campaign |
| `smartlead_get_campaign_analytics` | Sent/open/click/reply/bounce stats, lifetime or by date range |
| `smartlead_get_sequences` | Read a campaign's saved email sequence |
| `smartlead_save_sequences` | Write/replace a campaign's email sequence |
| `smartlead_add_leads` | Upload leads into a campaign |
| `smartlead_list_campaign_leads` | List leads in a campaign |
| `smartlead_get_lead_by_email` | Find a lead workspace-wide by email |
| `smartlead_update_lead` | Edit a lead's fields |
| `smartlead_lead_action` | Pause / resume / unsubscribe one lead |
| `smartlead_list_email_accounts` | List connected sender mailboxes |
| `smartlead_list_campaign_email_accounts` | List senders assigned to a campaign |
| `smartlead_add_email_accounts_to_campaign` | Assign senders to a campaign |
| `smartlead_raw_request` | Call any other Smartlead API endpoint directly |

## Development

```bash
npm run dev    # tsx watch, stdio mode
npm run build  # compile to dist/
```

## Notes

- Smartlead authenticates via an `api_key` query parameter (not a header) on every request — this server holds your key server-side and appends it automatically; it's never exposed to the MCP client.
- `smartlead_save_sequences` replaces the whole sequence on each call — always pass every step you want to keep, not just the one being added/changed.
