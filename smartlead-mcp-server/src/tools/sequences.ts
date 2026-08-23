import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SmartleadClient } from "../services/smartleadClient.js";
import { jsonResult, withErrorHandling } from "./shared.js";

const SequenceVariant = z
  .object({
    variant_id: z.string().optional().describe("Existing variant id to update; omit when adding a new variant"),
    subject: z.string().min(1).describe("Email subject for this variant"),
    email_body: z.string().min(1).describe("Email body HTML/text for this variant"),
    distribution: z.number().min(0).max(100).describe("Percent of leads on this step that get this variant"),
  })
  .strict();

const SequenceStep = z
  .object({
    id: z.number().int().optional().describe("Existing step id to update; omit when adding a new step"),
    seq_number: z.number().int().positive().describe("1-based position of this step in the sequence"),
    subject: z.string().optional().describe("Subject line. Omit (or leave blank) on follow-up steps to keep them threaded under step 1's subject"),
    email_body: z.string().min(1).optional().describe("Email body HTML/text. Required unless seq_variants is used for A/B testing this step"),
    seq_delay_details: z
      .object({ delay_in_days: z.number().int().min(0).describe("Days to wait after the previous step before sending this one") })
      .describe("How long after the prior step this one fires (0 for the first step)"),
    seq_variants: z
      .array(SequenceVariant)
      .optional()
      .describe("A/B test variants for this step instead of a single subject/email_body. Each step's variant distributions must sum to 100"),
  })
  .strict();

export function registerSequenceTools(server: McpServer, client: SmartleadClient): void {
  server.registerTool(
    "smartlead_get_sequences",
    {
      title: "Get Smartlead Campaign Sequence",
      description: `Get the email sequence (all steps, subjects, bodies, delays) currently saved on a campaign.

Args:
  - campaign_id (number, required)

Returns: JSON array of sequence steps with id, seq_number, subject, email_body, seq_delay_details.delay_in_days, and seq_variants when A/B testing is set up.`,
      inputSchema: { campaign_id: z.number().int().describe("Campaign id") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/sequences`, "GET");
        return jsonResult(data);
      })
  );

  server.registerTool(
    "smartlead_save_sequences",
    {
      title: "Save Smartlead Campaign Sequence",
      description: `Write (create or replace) the email sequence for a campaign — the actual step-by-step emails that get sent. This REPLACES the full sequence each call, so always pass every step you want to exist, not just the one you're changing.

Args:
  - campaign_id (number, required)
  - sequences (array, required): ordered list of steps. Each step needs:
      - seq_number (number): 1-based position
      - seq_delay_details.delay_in_days (number): days after the previous step (0 on step 1)
      - EITHER subject + email_body, OR seq_variants (array of {subject, email_body, distribution}) for A/B testing that step — variant distributions must sum to 100
      - id (number, optional): include to update an existing step in place; omit for a new step

Example — a 3-step sequence, first email immediate, two follow-ups 3 and 7 days later:
  [
    { "seq_number": 1, "subject": "Quick question about {{company_name}}", "email_body": "<p>Hi {{first_name}}, ...</p>", "seq_delay_details": { "delay_in_days": 0 } },
    { "seq_number": 2, "email_body": "<p>Following up...</p>", "seq_delay_details": { "delay_in_days": 3 } },
    { "seq_number": 3, "email_body": "<p>Last note...</p>", "seq_delay_details": { "delay_in_days": 7 } }
  ]

Returns: JSON confirmation of the saved sequence.`,
      inputSchema: {
        campaign_id: z.number().int().describe("Campaign id"),
        sequences: z.array(SequenceStep).min(1).describe("Full ordered list of sequence steps (replaces any existing sequence)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaign_id, sequences }) =>
      withErrorHandling(async () => {
        const data = await client.request(`/campaigns/${campaign_id}/sequences`, "POST", { body: { sequences } });
        return jsonResult(data);
      })
  );
}
