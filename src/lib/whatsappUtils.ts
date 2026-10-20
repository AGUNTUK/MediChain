/**
 * Pure WhatsApp Utility Functions (Browser + Server Safe)
 * Zero Node.js / dotenv dependencies
 */

export interface BDPhoneValidationResult {
  isValid: boolean;
  formattedNumber: string | null; // e.g. "8801712345678"
  displayNumber: string;
  error?: string;
}

/**
 * Validates and normalizes Bangladesh mobile numbers for WhatsApp deep links (wa.me)
 * Standard BD Mobile prefixes: 013, 014, 015, 016, 017, 018, 019
 */
export function validateAndFormatBDWhatsAppNumber(rawPhone: string | undefined | null): BDPhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { isValid: false, formattedNumber: null, displayNumber: "", error: "Missing phone number" };
  }

  // Strip all non-digit characters (+, spaces, hyphens, parentheses)
  const cleaned = rawPhone.replace(/\D/g, "");

  // Format 1: 11 digits starting with 01 (e.g. 01712345678)
  if (cleaned.length === 11 && cleaned.startsWith("01")) {
    const operatorDigit = cleaned.charAt(2);
    if (["3", "4", "5", "6", "7", "8", "9"].includes(operatorDigit)) {
      return {
        isValid: true,
        formattedNumber: `88${cleaned}`,
        displayNumber: cleaned
      };
    }
    return { isValid: false, formattedNumber: null, displayNumber: cleaned, error: "Invalid operator prefix" };
  }

  // Format 2: 13 digits starting with 8801 (e.g. 8801712345678)
  if (cleaned.length === 13 && cleaned.startsWith("8801")) {
    const operatorDigit = cleaned.charAt(4);
    if (["3", "4", "5", "6", "7", "8", "9"].includes(operatorDigit)) {
      return {
        isValid: true,
        formattedNumber: cleaned,
        displayNumber: cleaned.slice(2)
      };
    }
    return { isValid: false, formattedNumber: null, displayNumber: cleaned, error: "Invalid operator prefix" };
  }

  return { isValid: false, formattedNumber: null, displayNumber: cleaned, error: "Invalid phone number length" };
}

/**
 * Replaces dynamic variables in marketing message templates
 */
export function personalizeMessage(
  template: string, 
  pharmacy: { 
    pharmacyName?: string; 
    ownerName?: string; 
    phone?: string; 
    city?: string; 
    area?: string 
  }
): string {
  if (!template) return "";
  let msg = template;
  msg = msg.replace(/\{\{\s*pharmacy_name\s*\}\}/gi, pharmacy.pharmacyName || "ফার্মেসি");
  msg = msg.replace(/\{\{\s*owner_name\s*\}\}/gi, pharmacy.ownerName || "ফার্মাসিস্ট");
  msg = msg.replace(/\{\{\s*phone\s*\}\}/gi, pharmacy.phone || "");
  msg = msg.replace(/\{\{\s*city\s*\}\}/gi, pharmacy.city || pharmacy.area || "ঢাকা");
  return msg.trim();
}

/**
 * Creates the standard wa.me deep link with prefilled, URI-encoded message
 */
export function generateWaMeLink(formattedNumber: string, message: string): string {
  return `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
}
