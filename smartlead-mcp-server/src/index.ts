#!/usr/bin/env node
/**
 * MCP server for the Smartlead cold-email API.
 *
 * Covers the core campaign-creation workflow (create campaign, save sequence,
 * add leads, assign sender accounts, schedule, start/pause/stop) plus lead
 * lookup/management, email-account listing, and campaign analytics. Anything
 * else in Smartlead's API is reachable via smartlead_raw_request.
 *
 * Run modes (see README.md):
 *   - stdio (default): for local MCP clients (Claude Desktop, `npx ... mcp`)
 *   - streamable HTTP (TRANSPORT=http): for remote/custom-connector use
 */

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { SmartleadClient } from "./services/smartleadClient.js";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerSequenceTools } from "./tools/sequences.js";
import { registerLeadTools } from "./tools/leads.js";
import { registerEmailAccountTools } from "./tools/emailAccounts.js";
import { registerRawRequestTool } from "./tools/raw.js";

function buildServer(apiKey: string): McpServer {
  const server = new McpServer({ name: "smartlead-mcp-server", version: "1.0.0" });
  const client = new SmartleadClient(apiKey);

  registerCampaignTools(server, client);
  registerSequenceTools(server, client);
  registerLeadTools(server, client);
  registerEmailAccountTools(server, client);
  registerRawRequestTool(server, client);

  return server;
}

function requireApiKey(): string {
  const apiKey = process.env.SMARTLEAD_API_KEY;
  if (!apiKey) {
    console.error("ERROR: SMARTLEAD_API_KEY environment variable is required (Smartlead > Settings > API Key).");
    process.exit(1);
  }
  return apiKey;
}

async function runStdio(): Promise<void> {
  const apiKey = requireApiKey();
  const server = buildServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("smartlead-mcp-server running via stdio");
}

async function runHttp(): Promise<void> {
  const apiKey = requireApiKey();
  // Optional shared-secret gate: without this, anyone who has the deployed
  // URL could operate on your Smartlead account through this server.
  const bearerToken = process.env.MCP_BEARER_TOKEN;
  if (!bearerToken) {
    console.error(
      "WARNING: MCP_BEARER_TOKEN is not set. This server's /mcp endpoint will accept requests from anyone who has the URL. Set MCP_BEARER_TOKEN and require 'Authorization: Bearer <token>' unless this deployment is otherwise locked down (e.g. private network)."
    );
  }

  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    if (bearerToken) {
      const header = req.header("authorization");
      if (header !== `Bearer ${bearerToken}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    // A fresh server + transport per request keeps this stateless: simpler
    // to scale and avoids request-id collisions across concurrent callers.
    const server = buildServer(apiKey);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/healthz", (_req, res) => res.status(200).send("ok"));

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`smartlead-mcp-server listening on http://0.0.0.0:${port}/mcp`);
  });
}

const mode = process.env.TRANSPORT === "http" ? runHttp : runStdio;
mode().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
