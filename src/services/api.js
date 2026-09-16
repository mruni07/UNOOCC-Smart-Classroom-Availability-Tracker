import { WEBHOOK_URL } from "../config";

/**
 * Returns true if the webhook URL is still the default placeholder.
 */
export function isWebhookConfigured() {
  return (
    WEBHOOK_URL &&
    !WEBHOOK_URL.includes("YOUR_N8N_INSTANCE") &&
    !WEBHOOK_URL.includes("YOUR_WEBHOOK_ID")
  );
}

/**
 * Sends a question to the n8n webhook and returns the agent's text reply.
 *
 * @param {string} question — the student's query
 * @returns {Promise<string>} — plain-text answer from the agent
 */
export async function askAgent(question) {
  if (!isWebhookConfigured()) {
    throw new Error("Webhook not configured yet.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30 s timeout

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    const data = await res.json();

    // The agent returns { output: "..." }
    if (data && typeof data.output === "string") {
      return data.output;
    }

    throw new Error("Unexpected response shape — missing 'output' field.");
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw new Error("Request timed out. The server took too long to respond.");
    }

    throw err;
  }
}
