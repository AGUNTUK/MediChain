import { logAudit } from "./dbService.js";

export interface OrderAlertDetails {
  orderId: string;
  pharmacyName: string;
  itemCount: number;
  totalAmount: number;
  adminOrderUrl?: string;
}

export interface TelegramSendResult {
  success: boolean;
  attempts: number;
  error?: string;
}

/**
 * Escapes characters with special meaning in Telegram's legacy Markdown mode
 */
function escapeTelegramMarkdown(text: string): string {
  if (!text) return "";
  return String(text).replace(/([_*\[\]`])/g, "\\$1");
}

/**
 * Logs presence of Telegram environment variables without exposing secret values.
 */
export function logTelegramConfigStatus(): void {
  const tokenSet = !!process.env.TELEGRAM_BOT_TOKEN;
  const chatIdSet = !!process.env.TELEGRAM_ADMIN_CHAT_ID;
  console.log(`[Config] TELEGRAM_BOT_TOKEN: ${tokenSet ? "set" : "not set"}`);
  console.log(`[Config] TELEGRAM_ADMIN_CHAT_ID: ${chatIdSet ? "set" : "not set"}`);
}

/**
 * Sends a real-time order alert to the Telegram Admin bot.
 * Performs transient network retry (1 retry, 2s backoff).
 * Never throws an unhandled exception to prevent disrupting order placement.
 */
export async function sendOrderAlert(orderDetails: OrderAlertDetails): Promise<TelegramSendResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

  // Verify credentials without exposing tokens or chat IDs
  if (!botToken || !chatId) {
    const statusMsg = `TELEGRAM_BOT_TOKEN: ${botToken ? "set" : "not set"}, TELEGRAM_ADMIN_CHAT_ID: ${chatId ? "set" : "not set"}`;
    console.warn(`[Telegram] Order alert skipped: credentials missing (${statusMsg})`);
    return { success: false, attempts: 0, error: `Credentials missing (${statusMsg})` };
  }

  const orderId = orderDetails.orderId || "N/A";
  const pharmacyName = orderDetails.pharmacyName || "Registered Pharmacy";
  const itemCount = orderDetails.itemCount ?? 0;
  const totalAmount = orderDetails.totalAmount ?? 0;
  
  const baseUrl = (process.env.APP_URL || "https://medichain.app").replace(/\/+$/, "");
  const adminOrderUrl = orderDetails.adminOrderUrl || `${baseUrl}/#depot`;

  const message = [
    `🆕 *New Order #${escapeTelegramMarkdown(orderId)}*`,
    `🏥 ${escapeTelegramMarkdown(pharmacyName)}`,
    `📦 ${itemCount} items`,
    `💰 ৳${totalAmount.toLocaleString("en-BD")}`,
    "",
    `[View Order](${adminOrderUrl})`
  ].join("\n");

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown"
  };

  let attempts = 0;
  const maxAttempts = 2; // Initial attempt + 1 retry for transient network/5xx errors

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`[Telegram] Sending order alert for order #${orderId} (attempt ${attempts}/${maxAttempts})...`);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`[Telegram] Order alert for order #${orderId} sent successfully`);
        try {
          await logAudit(
            `Telegram alert dispatched for order #${orderId} (${pharmacyName}, ৳${totalAmount.toLocaleString()})`,
            "Notifications",
            orderId,
            "Telegram Bot",
            "System"
          );
        } catch (_) {}
        return { success: true, attempts };
      }

      const status = response.status;
      let errorDetail = "";
      try {
        const errorJson: any = await response.json();
        errorDetail = errorJson.description || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text().catch(() => `HTTP ${status}`);
      }

      console.error(`[Telegram] Send failed for order #${orderId} with HTTP ${status}: ${errorDetail}`);

      // 401/403 are permanent authentication/authorization configuration errors; do NOT retry
      if (status === 401 || status === 403) {
        console.error(`[Telegram] Auth failure (HTTP ${status}). Check TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID. Aborting retry.`);
        try {
          await logAudit(
            `Telegram alert auth failure (HTTP ${status}) for order #${orderId}: ${errorDetail}`,
            "Notifications",
            orderId,
            "Telegram Bot",
            "System"
          );
        } catch (_) {}
        return { success: false, attempts, error: `Auth failure (${status}): ${errorDetail}` };
      }

      // Other 4xx client errors (e.g. 400 bad request/invalid chat ID); do not retry
      if (status >= 400 && status < 500) {
        console.error(`[Telegram] Client error (HTTP ${status}): ${errorDetail}. Aborting retry.`);
        return { success: false, attempts, error: `Client error (${status}): ${errorDetail}` };
      }

      // Transient 5xx server errors: retry once after 2 seconds
      if (attempts < maxAttempts) {
        console.warn(`[Telegram] Transient server error (${status}). Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      return { success: false, attempts, error: `Server error (${status}): ${errorDetail}` };
    } catch (networkError: any) {
      console.error(`[Telegram] Network error on attempt ${attempts} for order #${orderId}: ${networkError?.message || networkError}`);

      if (attempts < maxAttempts) {
        console.warn(`[Telegram] Retrying after network failure in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      try {
        await logAudit(
          `Telegram alert network failure after ${attempts} attempts for order #${orderId}: ${networkError?.message || "Network Error"}`,
          "Notifications",
          orderId,
          "Telegram Bot",
          "System"
        );
      } catch (_) {}
      return { success: false, attempts, error: networkError?.message || "Network error" };
    }
  }

  return { success: false, attempts, error: "Exceeded retry attempts" };
}
