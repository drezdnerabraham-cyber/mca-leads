import { CHARACTER_LIMIT } from "../constants.js";
import { SmartleadApiError } from "../services/smartleadClient.js";

/** Standard shape returned by every tool handler in this server. */
export interface ToolTextResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function textResult(text: string, structuredContent?: Record<string, unknown>): ToolTextResult {
  return structuredContent ? { content: [{ type: "text", text }], structuredContent } : { content: [{ type: "text", text }] };
}

export function errorResult(error: unknown): ToolTextResult {
  const message =
    error instanceof SmartleadApiError
      ? error.message
      : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

/** Wraps a tool body so a thrown SmartleadApiError becomes a friendly tool result instead of crashing the call. */
export async function withErrorHandling(fn: () => Promise<ToolTextResult>): Promise<ToolTextResult> {
  try {
    return await fn();
  } catch (error) {
    return errorResult(error);
  }
}

/**
 * JSON-stringifies a payload for a tool response, truncating with a clear
 * note if it would blow past the context budget. Truncation drops
 * structuredContent (a half-serialized object isn't useful) but always
 * returns valid, readable text.
 */
export function jsonResult(
  payload: unknown,
  truncationHint = "Narrow your query (e.g. with limit/offset or a more specific filter) to see more."
): ToolTextResult {
  const full = JSON.stringify(payload, null, 2);
  if (full.length <= CHARACTER_LIMIT) {
    const structuredContent =
      payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : undefined;
    return structuredContent ? { content: [{ type: "text", text: full }], structuredContent } : { content: [{ type: "text", text: full }] };
  }

  const text = JSON.stringify(
    {
      truncated: true,
      truncation_message: `Response truncated from ${full.length} to ${CHARACTER_LIMIT} characters. ${truncationHint}`,
      preview: full.slice(0, CHARACTER_LIMIT),
    },
    null,
    2
  );
  return { content: [{ type: "text", text }] };
}
