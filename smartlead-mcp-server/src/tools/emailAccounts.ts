import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SmartleadClient } from "../services/smartleadClient.js";
import { jsonResult, withErrorHandling } from "./shared.js";

export function registerEmailAccountTools(server: McpServer, client: SmartleadClient): void {
  server.registerTool(
    "smartlead_list_email_accounts",
    {
      title: "List Smartlead Email Accounts",
      description: `List every sending mailbox connected to the Smartlead workspace (across all campaigns).

Args:
  - limit (number, optional, default 20, max 100)
  - offset (number, optional, default 0)

Returns: JSON array of email accounts with id, from_email, from_name, and warmup/health info.`,
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20).describe("Max accounts to return"),
        offset: z.number().int().min(0).default(0).describe("Number of accounts to skip for pagination"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ limit, offset }) =>
      withErrorHandling(async () => {
        const data = await client.request("/email-accounts/", "GET", { query: { limit, offset } });
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_list_campaign_email_accounts",
    {
      title: "List Sender Accounts on a Smartlead Campaign",
      description: `List which mailboxes are currently assigned to send for a given campaign.

Args:
  - campaign_id (number, required)`,
      inputSchema: { campaign_id: z.number().int().describe("Campaign id") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/email-accounts`, "GET");
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_add_email_accounts_to_campaign",
    {
      title: "Assign Sender Accounts to Smartlead Campaign",
      description: `Assign one or more already-connected mailboxes as senders for a campaign. A campaign cannot be started without at least one. Use smartlead_list_email_accounts first to find account ids — this tool does not create new mailboxes, only assigns existing ones.

Args:
  - campaign_id (number, required)
  - email_account_ids (number[], required): ids from smartlead_list_email_accounts`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        email_account_ids: z.array(z.number().int()).min(1).describe("Email account ids to assign as senders"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, email_account_ids }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/email-accounts`, "POST", { body: { email_account_ids } });
        return jsonResult(data);
      })
  );
}
