import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SmartleadClient } from "../services/smartleadClient.js";
import { jsonResult, withErrorHandling } from "./shared.js";

const LeadInput = z
  .object({
    email: z.string().email().describe("Lead's email address (required)"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    phone_number: z.string().optional(),
    website: z.string().optional(),
    location: z.string().optional(),
    linkedin_profile: z.string().optional(),
    custom_fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Arbitrary merge-tag fields referenced in the sequence as {{field_name}}"),
  })
  .strict();

export function registerLeadTools(server: McpServer, client: SmartleadClient): void {
  server.registerTool(
    "smartlead_add_leads",
    {
      title: "Add Leads to Smartlead Campaign",
      description: `Upload recipients into a campaign. Leads are queued for the sequence as soon as the campaign is started (or immediately, if it's already running).

Args:
  - campaign_id (number, required)
  - lead_list (array, required): leads to add, each with at minimum an email. Optional: first_name, last_name, company_name, phone_number, website, location, linkedin_profile, custom_fields (a map of merge-tag values referenced in the sequence, e.g. {{first_name}}).
  - allow_duplicate (boolean, optional, default false): allow the same email to be added twice within this campaign.
  - ignore_global_block_list (boolean, optional, default false): send even if the email is on the workspace's global block list.
  - ignore_unsubscribe_list (boolean, optional, default false): send even if the email previously unsubscribed.
  - ignore_community_bounce_list (boolean, optional, default false): send even if the email is on Smartlead's shared bounce list.

Returns: JSON summary — how many leads were added vs. skipped (and why).`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        lead_list: z.array(LeadInput).min(1).max(400).describe("Leads to add (Smartlead accepts up to ~400 per call)"),
        allow_duplicate: z.boolean().optional(),
        ignore_global_block_list: z.boolean().optional(),
        ignore_unsubscribe_list: z.boolean().optional(),
        ignore_community_bounce_list: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ campaign_id, ...body }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/leads`, "POST", { body });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_list_campaign_leads",
    {
      title: "List Leads in Smartlead Campaign",
      description: `List the leads currently in a campaign, with pagination.

Args:
  - campaign_id (number, required)
  - limit (number, optional, default 20, max 100)
  - offset (number, optional, default 0)`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        limit: z.number().int().min(1).max(100).default(20).describe("Max leads to return"),
        offset: z.number().int().min(0).default(0).describe("Number of leads to skip for pagination"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, limit, offset }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/leads`, "GET", { query: { limit, offset } });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_get_lead_by_email",
    {
      title: "Find Smartlead Lead by Email",
      description: `Look up a lead across the whole workspace by email address (not scoped to one campaign).

Args:
  - email (string, required)

Returns: JSON lead record including its lead_id, usable with smartlead_lead_action or smartlead_update_lead.`,
      inputSchema: { email: z.string().email().describe("Lead email address to search for") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ email }) =>
      withErrorHandling(async () => {
        const data = await client.request("/leads/", "GET", { query: { email } });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_update_lead",
    {
      title: "Update Smartlead Lead",
      description: `Update a lead's profile fields within a campaign (name, company, custom fields, etc). Does not change which sequence step they're on.

Args:
  - campaign_id (number, required)
  - lead_id (number, required)
  - first_name, last_name, company_name, phone_number, website, location, linkedin_profile (strings, all optional)
  - custom_fields (object, optional): merge-tag values to overwrite`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        lead_id: z.number().int().describe("Lead id, from smartlead_list_campaign_leads or smartlead_get_lead_by_email"),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        company_name: z.string().optional(),
        phone_number: z.string().optional(),
        website: z.string().optional(),
        location: z.string().optional(),
        linkedin_profile: z.string().optional(),
        custom_fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, lead_id, ...body }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/leads/${lead_id}`, "POST", { body });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_lead_action",
    {
      title: "Pause / Resume / Unsubscribe Smartlead Lead",
      description: `Change one lead's participation in a campaign's sequence, without touching any other lead.

Args:
  - campaign_id (number, required)
  - lead_id (number, required)
  - action (string, required): one of
      - "pause": stop sending this lead further sequence steps (resumable)
      - "resume": undo a pause
      - "unsubscribe": mark this lead unsubscribed from this campaign specifically (does not affect other campaigns)`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        lead_id: z.number().int().describe("Lead id"),
        action: z.enum(["pause", "resume", "unsubscribe"]).describe("Action to take on this lead"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, lead_id, action }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/leads/${lead_id}/${action}`, "POST");
        return jsonResult(data ?? { campaign_id, lead_id, action, ok: true });
      })
  );
}
