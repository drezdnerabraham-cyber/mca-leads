import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SmartleadClient } from "../services/smartleadClient.js";
import { jsonResult, withErrorHandling } from "./shared.js";

const DayOfWeek = z.number().int().min(0).max(6);

export function registerCampaignTools(server: McpServer, client: SmartleadClient): void {
  server.registerTool(
    "smartlead_list_campaigns",
    {
      title: "List Smartlead Campaigns",
      description: `List all email campaigns in the Smartlead workspace.

Args:
  - client_id (number, optional): restrict to campaigns owned by a specific sub-client (agency/white-label use case).

Returns: JSON array of campaigns with id, name, status (DRAFTED | ACTIVE | PAUSED | COMPLETED | STOPPED), created_at, and related metadata.

Use when: "what campaigns do I have", "find the campaign named X" (then read the id off the result).`,
      inputSchema: { client_id: z.number().int().optional().describe("Optional sub-client id to filter by") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ client_id }) =>
      withErrorHandling(async () => {
        const data = await client.request("/campaigns/", "GET", { query: { client_id } });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_get_campaign",
    {
      title: "Get Smartlead Campaign",
      description: `Get full details of a single campaign by id — status, sender accounts, schedule, and tracking settings.

Args:
  - campaign_id (number, required): the campaign id, from smartlead_list_campaigns or smartlead_create_campaign.

Returns: JSON campaign object.`,
      inputSchema: { campaign_id: z.number().int().describe("Campaign id") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}`, "GET");
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_create_campaign",
    {
      title: "Create Smartlead Campaign",
      description: `Create a new email campaign. The campaign is created empty and in DRAFTED status — it will NOT send anything.

A complete, sendable campaign needs three more steps after this one, each its own tool:
  1. smartlead_save_sequences — write the email sequence (subject/body per step)
  2. smartlead_add_leads — upload the recipient list
  3. smartlead_add_email_accounts_to_campaign — assign sender mailboxes
  4. smartlead_schedule_campaign (optional but recommended) — set sending days/hours
  5. smartlead_update_campaign_status with status=START — actually launch it

Args:
  - name (string, required): campaign name, must be unique in the workspace.
  - client_id (number, optional): assign to a sub-client (agency/white-label use case).

Returns: JSON with the new campaign's id — you need this id for every subsequent step.`,
      inputSchema: {
        name: z.string().min(1).max(200).describe("Campaign name, unique within the workspace"),
        client_id: z.number().int().optional().describe("Optional sub-client id to own this campaign"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ name, client_id }) =>
      withErrorHandling(async () => {
        const data = await client.request("/campaigns/create", "POST", { body: { name, client_id } });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_update_campaign_status",
    {
      title: "Start / Pause / Stop Smartlead Campaign",
      description: `Change a campaign's sending status. This is how you actually launch a campaign, or halt one that's already running.

Args:
  - campaign_id (number, required)
  - status (string, required): one of START (begin/resume sending), PAUSED (halt, resumable), STOPPED (halt permanently — cannot be restarted).

Before using START, make sure the campaign has a saved sequence, at least one lead, and at least one assigned sending email account — otherwise Smartlead will reject the start.`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        status: z.enum(["START", "PAUSED", "STOPPED"]).describe("New campaign status"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, status }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/status`, "POST", { body: { status } });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_schedule_campaign",
    {
      title: "Set Smartlead Campaign Sending Schedule",
      description: `Configure when a campaign is allowed to send: days of week, sending window, pacing, and daily lead cap.

Args:
  - campaign_id (number, required)
  - timezone (string, required): IANA timezone, e.g. "America/New_York".
  - days_of_the_week (number[], required): days allowed to send, 0=Sunday .. 6=Saturday, e.g. [1,2,3,4,5] for weekdays.
  - start_hour (string, required): sending window start, 24h "HH:MM", e.g. "09:00".
  - end_hour (string, required): sending window end, 24h "HH:MM", e.g. "17:00".
  - min_time_btw_emails (number, optional): minimum minutes between two emails from the same sender.
  - max_new_leads_per_day (number, optional): cap on new leads contacted per day.
  - schedule_start_time (string, optional): ISO timestamp for when the schedule itself becomes active.`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        timezone: z.string().min(1).describe('IANA timezone, e.g. "America/New_York"'),
        days_of_the_week: z.array(DayOfWeek).min(1).describe("0=Sunday .. 6=Saturday"),
        start_hour: z.string().regex(/^\d{2}:\d{2}$/).describe('Sending window start, "HH:MM" 24h'),
        end_hour: z.string().regex(/^\d{2}:\d{2}$/).describe('Sending window end, "HH:MM" 24h'),
        min_time_btw_emails: z.number().int().positive().optional().describe("Minutes between sends from one mailbox"),
        max_new_leads_per_day: z.number().int().positive().optional().describe("Daily cap on new leads contacted"),
        schedule_start_time: z.string().optional().describe("ISO timestamp the schedule takes effect"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, ...body }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/schedule`, "POST", { body });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_delete_campaign",
    {
      title: "Delete Smartlead Campaign",
      description: `Permanently delete a campaign. This cannot be undone — leads, sequence, and stats attached to it are removed. Prefer smartlead_update_campaign_status with STOPPED if you just want to halt sending.

Args:
  - campaign_id (number, required)`,
      inputSchema: { campaign_id: z.number().int().describe("Campaign id to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}`, "DELETE");
        return jsonResult(data ?? { deleted: true, campaign_id });
      })
  );

  server.registerTool(
    "smartlead_get_campaign_analytics",
    {
      title: "Get Smartlead Campaign Analytics",
      description: `Get performance stats for a campaign: sent/open/click/reply/bounce counts, and rates.

Args:
  - campaign_id (number, required)
  - start_date (string, optional): "YYYY-MM-DD" — if given with end_date, returns day-by-day analytics instead of lifetime totals.
  - end_date (string, optional): "YYYY-MM-DD", used with start_date.

Returns: JSON with counts such as sent_count, open_count, click_count, reply_count, bounce_count (lifetime totals unless a date range is given).`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD, requires end_date"),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD, requires start_date"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, start_date, end_date }) =>
      withErrorHandling(async () => {
        const path =
          start_date && end_date ? `/campaigns/${campaign_id}/analytics-by-date` : `/campaigns/${campaign_id}/statistics`;
        const data = await client.request(path, "GET", { query: { start_date, end_date } });
        return jsonResult(data);
      })
  );
}
