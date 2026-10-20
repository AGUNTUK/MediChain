import { apiFetch } from "../lib/apiFetch";
import { CopilotMessage, CopilotResponsePayload } from "../lib/geminiCopilotService";

export const copilotService = {
  /**
   * Sends conversation history to the Gemini Pharmacy Procurement Copilot.
   */
  async sendMessage(messages: CopilotMessage[]): Promise<CopilotResponsePayload> {
    const res = await apiFetch("/api/ai/copilot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to connect to Copilot" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }
};
