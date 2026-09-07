import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SmartleadClient, HttpMethod } from "../services/smartleadClient.js";
import { jsonResult, withErrorHandling } from "./shared.js";

export function registerRawRequestTool(server: McpServer, client: SmartleadClient): void {
  server.registerTool(
    "smartlead_raw_request",
    {
      title: "Raw Smartlead API Request",
      description: `Escape hatch for any Smartlead API endpoint not covered by a dedicated tool — e.g. email warmup settings, webhooks, client (sub-account) management, tag management, CRM notes, or smart-delivery/spam tests.

Base URL is https://server.smartlead.ai/api/v1 — pass only the path AFTER that (starting with "/"), e.g. "/email-accounts/123/warmup". Do not include the api_key query param yourself; it's added automatically.

Args:
  - path (string, required): API path starting with "/", e.g. "/campaigns/123/send-test-email"
  - method (string, optional, default GET): GET | POST | PUT | PATCH | DELETE
  - body (object, optional): JSON request body for POST/PUT/PATCH
  - query (object, optional): extra query string parameters

Prefer a dedicated smartlead_* tool over this one whenever one exists — this is for gaps in coverage, not a default.`,
      inputSchema: {
        path: z.string().min(1).regex(/^\//, 'Path must start with "/"').describe('API path after the base URL, e.g. "/email-accounts/123/warmup"'),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET").describe("HTTP method"),
        body: z.record(z.string(), z.unknown()).optional().describe("JSON request body for POST/PUT/PATCH"),
        query: z.record(z.string(), z.unknown()).optional().describe("Extra query string parameters"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ path, method, body, query }) =>
      withErrorHandling(async () => {
        const data = await client.request(path, method as HttpMethod, { body, query });
        return jsonResult(data);
      })
  );
}
