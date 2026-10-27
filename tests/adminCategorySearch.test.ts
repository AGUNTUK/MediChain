import { 
  DEFAULT_CATEGORY_OPTIONS, 
  CATEGORY_GROUPS, 
  CATEGORY_BN_MAP, 
  getCategoryLabelBn 
} from "../src/constants/categories";

function runTests() {
  console.log("=== RUNNING ADMIN CATEGORY SEARCH & HOMEPAGE TESTS ===");

  // Test 1: Category Count & Inclusivity
  console.log("Test 1: Comprehensive Category Parity");
  if (DEFAULT_CATEGORY_OPTIONS.length < 25) {
    throw new Error(`Expected at least 25 categories, got ${DEFAULT_CATEGORY_OPTIONS.length}`);
  }
  const requiredCategories = [
    "Tablet", "Capsule", "Syrup", "Injection", "Suspension", 
    "Ophthalmic", "Ear Drops", "Ointment", "Cream", "Gel", 
    "Suppository", "Inhaler", "Nasal Spray", "Infusion", "Powder", 
    "Sachet", "Lotion", "Solution", "Vaccine", "Antibiotics", 
    "Cardiovascular", "Gastrointestinal", "Antidiabetic", 
    "Analgesic & Antipyretic", "Respiratory", "Dermatological", 
    "Vitamins & Supplements", "Medical Supplies"
  ];
  for (const cat of requiredCategories) {
    if (!DEFAULT_CATEGORY_OPTIONS.includes(cat)) {
      throw new Error(`Missing expected category: ${cat}`);
    }
  }
  console.log(`✓ All ${requiredCategories.length} standard categories are present and verified.`);

  // Test 2: Bilingual Bengali Mapping
  console.log("Test 2: Bilingual Bengali Translations");
  if (getCategoryLabelBn("Tablet") !== "ট্যাবলেট") {
    throw new Error(`Failed to translate Tablet: ${getCategoryLabelBn("Tablet")}`);
  }
  if (getCategoryLabelBn("Syrup") !== "সিরাপ") {
    throw new Error(`Failed to translate Syrup: ${getCategoryLabelBn("Syrup")}`);
  }
  if (getCategoryLabelBn("Injection") !== "ইনজেকশন") {
    throw new Error(`Failed to translate Injection: ${getCategoryLabelBn("Injection")}`);
  }
  if (getCategoryLabelBn("Suppository") !== "সাপোজিটরি") {
    throw new Error(`Failed to translate Suppository: ${getCategoryLabelBn("Suppository")}`);
  }
  console.log("✓ Bilingual translations for pharmaceutical forms validated.");

  // Test 3: Search Filter Logic (English & Bengali query)
  console.log("Test 3: Search Combobox Filter Simulation");
  const searchInGroups = (query: string) => {
    const q = query.trim().toLowerCase();
    return CATEGORY_GROUPS.flatMap(g => 
      g.items.filter(item => 
        item.value.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.labelBn.toLowerCase().includes(q) ||
        g.groupName.toLowerCase().includes(q) ||
        g.groupNameBn.toLowerCase().includes(q)
      )
    );
  };

  const englishSearch = searchInGroups("tablet");
  if (!englishSearch.some(i => i.value === "Tablet")) {
    throw new Error("English search for 'tablet' failed to find Tablet");
  }

  const banglaSearch = searchInGroups("সিরাপ");
  if (!banglaSearch.some(i => i.value === "Syrup")) {
    throw new Error("Bengali search for 'সিরাপ' failed to find Syrup");
  }

  const groupSearch = searchInGroups("চোখ");
  if (!groupSearch.some(i => i.value === "Ophthalmic")) {
    throw new Error("Bengali search for 'চোখ' failed to find Ophthalmic");
  }
  console.log("✓ Multi-lingual combobox search filtering verified for English and Bengali.");

  console.log("=== ALL CATEGORY TESTS PASSED SUCCESSFULLY! ===");
}

runTests();
