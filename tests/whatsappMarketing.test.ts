import { 
  validateAndFormatBDWhatsAppNumber, 
  personalizeMessage, 
  generateWaMeLink,
  activeWhatsAppProvider
} from "../src/lib/whatsappMarketingService.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("=== RUNNING MEDICHAIN WHATSAPP MARKETING TEST SUITE ===");

// 1. Phone Normalization (Bangladesh 880)
console.log("\n--- Testing Phone Normalization ---");
const p1 = validateAndFormatBDWhatsAppNumber("01712345678");
assert(p1.isValid && p1.formattedNumber === "8801712345678", "Normalizes standard 11-digit mobile (017...) to 8801712345678");

const p2 = validateAndFormatBDWhatsAppNumber("+8801812345678");
assert(p2.isValid && p2.formattedNumber === "8801812345678", "Normalizes +880 format correctly");

const p3 = validateAndFormatBDWhatsAppNumber("8801912345678");
assert(p3.isValid && p3.formattedNumber === "8801912345678", "Preserves existing 880 prefix");

const p4 = validateAndFormatBDWhatsAppNumber("01234567890"); // Invalid operator prefix
assert(!p4.isValid, "Rejects invalid Bangladesh operator prefix (012)");

const p5 = validateAndFormatBDWhatsAppNumber("12345"); // Too short
assert(!p5.isValid, "Rejects short invalid phone number");

// 2. Personalization Placeholders
console.log("\n--- Testing Message Personalization ---");
const template = "আসসালামু আলাইকুম {{owner_name}}, আপনার {{pharmacy_name}} এর জন্য বিশেষ অফার! {{city}}";
const pharm = {
  pharmacyName: "জননী ফার্মেসি",
  ownerName: "ডা. রফিকুল ইসলাম",
  city: "ঢাকা"
};
const rendered = personalizeMessage(template, pharm);
assert(rendered.includes("ডা. রফিকুল ইসলাম") && rendered.includes("জননী ফার্মেসি") && rendered.includes("ঢাকা"), "Personalizes owner_name, pharmacy_name, and city placeholders");

// 3. WhatsApp Click-to-Chat URL Generation
console.log("\n--- Testing WhatsApp Click-to-Chat Link Generation ---");
const url = generateWaMeLink("8801712345678", "Hello Pharmacy");
assert(url.startsWith("https://wa.me/8801712345678?text="), "Constructs official wa.me direct click-to-chat URL");
assert(url.includes("Hello%20Pharmacy"), "Properly encodes URL message parameters");

// 4. Provider Architecture
console.log("\n--- Testing WhatsApp Provider Interface ---");
assert(activeWhatsAppProvider.name.includes("Manual WhatsApp Business"), "Manual WhatsApp Business provider is active");
assert(!activeWhatsAppProvider.isAutomated, "Manual provider guarantees zero automated dispatch");

console.log("\n🎉 ALL WHATSAPP MARKETING TESTS PASSED (100% SUCCESS)!\n");
