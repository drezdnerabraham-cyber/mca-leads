import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../constants.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Thin wrapper around the Smartlead REST API. Smartlead authenticates via an
 * `api_key` query parameter on every request rather than a header, so that
 * gets merged in here instead of being repeated at every call site.
 */
export class SmartleadClient {
  constructor(private readonly apiKey: string) {}

  async request<T = unknown>(
    path: string,
    method: HttpMethod = "GET",
    options: { body?: unknown; query?: Record<string, unknown> } = {}
  ): Promise<T> {
    const query: Record<string, unknown> = { ...options.query, api_key: this.apiKey };

    try {
      const response = await axios({
        method,
        url: `${API_BASE_URL}${path}`,
        data: options.body,
        params: query,
        // POST requests are non-idempotent (e.g. campaign creation) — a short
        // timeout with no retry avoids accidentally double-creating resources
        // on a slow response. GET/PUT/PATCH/DELETE get more headroom.
        timeout: method === "POST" ? 15000 : 30000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      return response.data as T;
    } catch (error) {
      throw new SmartleadApiError(error);
    }
  }
}

export class SmartleadApiError extends Error {
  readonly status?: number;

  constructor(cause: unknown) {
    super(SmartleadApiError.describe(cause));
    this.name = "SmartleadApiError";
    if (axios.isAxiosError(cause)) {
      this.status = cause.response?.status;
    }
  }

  private static describe(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const err = error as AxiosError<{ message?: string; error?: string }>;
      const status = err.response?.status;
      const body = err.response?.data;
      const apiMessage =
        (typeof body === "object" && body && (body.message || body.error)) ||
        (typeof body === "string" ? body : undefined);

      switch (status) {
        case 401:
        case 403:
          return "Authentication failed. Check that SMARTLEAD_API_KEY is correct and active in Smartlead > Settings > API Key.";
        case 404:
          return `Not found. ${apiMessage ?? "Double-check the campaign_id / lead_id / email_account_id you passed."}`;
        case 400:
        case 422:
          return `Validation error from Smartlead: ${apiMessage ?? "the request body did not match what the API expects."}`;
        case 429:
          return "Rate limit exceeded. Wait a moment before retrying.";
        default:
          if (status && status >= 500) {
            return `Smartlead server error (status ${status}). This is on Smartlead's side — retry shortly.`;
          }
          return apiMessage
            ? `Smartlead API error: ${apiMessage}`
            : `Smartlead API request failed${status ? ` with status ${status}` : ""}.`;
      }
    }
    if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      return "Request to Smartlead timed out. Please try again.";
    }
    return `Unexpected error calling Smartlead: ${error instanceof Error ? error.message : String(error)}`;
  }
}
