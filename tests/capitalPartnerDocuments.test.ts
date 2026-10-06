import assert from "assert";
import {
  amountToWordsBDT,
  getNextDocumentNumber,
  createPartner,
  getPartners,
  getPartnerById,
  recordPartnerCapitalContribution,
  recordPartnerCapitalWithdrawal,
  getPartnerCapitalLedger,
  createCapitalDocumentDraft,
  finalizeCapitalDocument,
  createDocumentCorrectionVersion,
  voidCapitalDocument,
  getCapitalDocuments,
  getCapitalDocumentById,
  getDocumentVersionHistory,
  getCapitalDashboardStats,
  deletePartner,
  deleteCapitalDocument
} from "../src/lib/capitalPartnerService.js";
import * as accountsService from "../src/lib/accountsService.js";

async function runCapitalPartnerTests() {
  console.log("=== RUNNING MEDICHAIN CAPITAL & PARTNER DOCUMENT MANAGEMENT SYSTEM TESTS ===\n");

  // TEST 1: Bangladesh Amount to Words Conversion
  console.log("Test 1: Amount to Words (BDT) currency formatting...");
  assert.strictEqual(amountToWordsBDT(100000), "One Hundred Thousand Taka Only");
  assert.strictEqual(amountToWordsBDT(50000), "Fifty Thousand Taka Only");
  assert.strictEqual(amountToWordsBDT(250000), "Two Hundred Fifty Thousand Taka Only");
  assert.strictEqual(amountToWordsBDT(1000000), "One Million Taka Only");
  console.log("  Passed: ৳100,000 -> 'One Hundred Thousand Taka Only' exactly matched.");

  // TEST 2: Unique Document Number Sequencing
  console.log("\nTest 2: Document numbering sequence generation...");
  const rcp1 = await getNextDocumentNumber("CAPITAL_CONTRIBUTION_RECEIPT");
  const rcp2 = await getNextDocumentNumber("CAPITAL_CONTRIBUTION_RECEIPT");
  const vch1 = await getNextDocumentNumber("CASH_RECEIPT_VOUCHER");
  const cert1 = await getNextDocumentNumber("CAPITAL_CONTRIBUTION_CERTIFICATE");
  const stm1 = await getNextDocumentNumber("PARTNER_CAPITAL_STATEMENT");
  const agr1 = await getNextDocumentNumber("PARTNER_CAPITAL_AGREEMENT");

  assert.match(rcp1, /^MC-CAP-RCP-\d{4}-\d{4}$/, "Receipt number format valid");
  assert.match(vch1, /^MC-CAP-VCH-\d{4}-\d{4}$/, "Voucher number format valid");
  assert.match(cert1, /^MC-CAP-CERT-\d{4}-\d{4}$/, "Certificate number format valid");
  assert.match(stm1, /^MC-CAP-STM-\d{4}-\d{4}$/, "Statement number format valid");
  assert.match(agr1, /^MC-CAP-AGR-\d{4}-\d{4}$/, "Agreement number format valid");
  assert.notStrictEqual(rcp1, rcp2, "Sequential numbers must be strictly unique");
  console.log("  Passed: Unique document numbers generated: ", { rcp1, rcp2, vch1, cert1, stm1, agr1 });

  // TEST 3: Acceptance Test - Create Partner Profile
  console.log("\nTest 3: Partner profile creation & retrieval...");
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testPartnerName = `Mr. Example ${uniqueSuffix}`;
  const partner = await createPartner({
    name: testPartnerName,
    phone: "01711223344",
    email: "mr.example@investor.com",
    address: "Gulshan-2, Dhaka, Bangladesh",
    nidReference: "NID-1988-992211",
    partnerType: "PARTNER_CAPITAL",
    ownershipPercentage: 10.0,
    profitSharePercentage: 15.0,
    joiningDate: "2026-10-06",
    notes: "Strategic equity partner in healthcare cold-chain distribution"
  });

  assert.strictEqual(partner.name, testPartnerName);
  assert.strictEqual(partner.partnerType, "PARTNER_CAPITAL");
  assert.strictEqual(partner.ownershipPercentage, 10);
  assert.strictEqual(partner.currentCapitalBalance, 0);
  console.log("  Passed: Partner created with ID:", partner.id);

  // TEST 4: Record ৳100,000 Cash Contribution & Accounting Separation
  console.log("\nTest 4: Record ৳100,000 Cash Capital Contribution & verify strict accounting rule...");
  const testDate = `2027-03-${String(10 + Math.floor(Math.random() * 15))}`;
  const baselineLedger = await accountsService.getDailyLedgerSummary(testDate);
  const baselineSales = baselineLedger.deliveredSales;
  const baselineCogs = baselineLedger.cogs;
  const baselineGrossProfit = baselineLedger.grossProfit;
  const baselineNetProfit = baselineLedger.netProfit;
  const baselineCashIn = baselineLedger.cashIn;

  const contributionResult = await recordPartnerCapitalContribution({
    partnerId: partner.id,
    amount: 100000,
    paymentMethod: "Cash",
    transactionDate: testDate,
    purpose: "Partner Capital Contribution",
    reference: "MC-CASH-INIT-001",
    notes: "Q4 Core Logistics Equity"
  });

  assert.strictEqual(contributionResult.transaction.amount, 100000);
  assert.strictEqual(contributionResult.transaction.paymentMethod, "Cash");
  assert.strictEqual(contributionResult.transaction.type, "Contribution");

  // Verify Accounts / Cash Book Sync
  const updatedLedger = await accountsService.getDailyLedgerSummary(testDate);
  assert.strictEqual(updatedLedger.deliveredSales, baselineSales, "CRITICAL: Sales must NOT change");
  assert.strictEqual(updatedLedger.cogs, baselineCogs, "CRITICAL: COGS must NOT change");
  assert.strictEqual(updatedLedger.grossProfit, baselineGrossProfit, "CRITICAL: Gross profit must NOT change");
  assert.strictEqual(updatedLedger.netProfit, baselineNetProfit, "CRITICAL: Net profit must NOT change");
  assert.strictEqual(updatedLedger.capitalContributions, baselineLedger.capitalContributions + 100000, "Capital contributions credited +৳100,000");
  assert.strictEqual(updatedLedger.cashIn, baselineCashIn + 100000, "Cash In increased +৳100,000");
  console.log("  Passed: Accounting separation verified! Sales, COGS, and Profit remain 100% UNCHANGED.");

  // TEST 5: Partner Capital Ledger Running Balance
  console.log("\nTest 5: Partner Capital Ledger running balance...");
  const ledgerData = await getPartnerCapitalLedger(partner.id);
  assert.strictEqual(ledgerData.totalContributions, 100000);
  assert.strictEqual(ledgerData.totalWithdrawals, 0);
  assert.strictEqual(ledgerData.closingBalance, 100000);
  assert.strictEqual(ledgerData.entries.length >= 1, true);
  console.log("  Passed: Partner Capital Ledger closing balance: ৳" + ledgerData.closingBalance);

  // TEST 6: Generate All 5 Branded Document Types for "Mr. Example"
  console.log("\nTest 6: Generating all 5 document types...");

  // 1. Receipt
  const receipt = await createCapitalDocumentDraft({
    documentType: "CAPITAL_CONTRIBUTION_RECEIPT",
    partnerId: partner.id,
    capitalTransactionId: contributionResult.transaction.id,
    amount: 100000,
    paymentMethod: "Cash",
    date: testDate,
    purpose: "Partner Capital Contribution"
  });
  assert.strictEqual(receipt.documentType, "CAPITAL_CONTRIBUTION_RECEIPT");
  assert.strictEqual(receipt.documentPayload.amountInWords, "One Hundred Thousand Taka Only");
  assert.strictEqual(receipt.documentStatus, "draft");

  // 2. Voucher
  const voucher = await createCapitalDocumentDraft({
    documentType: "CASH_RECEIPT_VOUCHER",
    partnerId: partner.id,
    capitalTransactionId: contributionResult.transaction.id,
    amount: 100000,
    paymentMethod: "Cash",
    date: testDate,
    purpose: "Partner Capital Contribution"
  });
  assert.strictEqual(voucher.documentType, "CASH_RECEIPT_VOUCHER");

  // 3. Certificate
  const certificate = await createCapitalDocumentDraft({
    documentType: "CAPITAL_CONTRIBUTION_CERTIFICATE",
    partnerId: partner.id,
    amount: 100000,
    paymentMethod: "Cash",
    date: testDate
  });
  assert.strictEqual(certificate.documentType, "CAPITAL_CONTRIBUTION_CERTIFICATE");

  // 4. Statement
  const statement = await createCapitalDocumentDraft({
    documentType: "PARTNER_CAPITAL_STATEMENT",
    partnerId: partner.id,
    amount: 100000,
    date: testDate
  });
  assert.strictEqual(statement.documentType, "PARTNER_CAPITAL_STATEMENT");

  // 5. Agreement
  const agreement = await createCapitalDocumentDraft({
    documentType: "PARTNER_CAPITAL_AGREEMENT",
    partnerId: partner.id,
    amount: 100000,
    date: testDate
  });
  assert.strictEqual(agreement.documentType, "PARTNER_CAPITAL_AGREEMENT");
  console.log("  Passed: All 5 documents drafted with accurate payloads.");

  // TEST 7: Document Finalization & Financial Lock
  console.log("\nTest 7: Finalizing document and verifying lock...");
  const finalizedReceipt = await finalizeCapitalDocument(receipt.id, "Admin");
  assert.strictEqual(finalizedReceipt.documentStatus, "finalized");
  assert.ok(finalizedReceipt.finalizedAt);
  assert.strictEqual(finalizedReceipt.finalizedBy, "Admin");

  // Idempotency check: calling finalize again does not crash or corrupt
  const refinalized = await finalizeCapitalDocument(receipt.id, "Admin");
  assert.strictEqual(refinalized.documentStatus, "finalized");
  console.log("  Passed: Document finalized and idempotent lock verified.");

  // TEST 8: Document Immutability & Version Correction (Version 2)
  console.log("\nTest 8: Document version correction (Version 1 -> Version 2)...");
  const version2 = await createDocumentCorrectionVersion(
    finalizedReceipt.id,
    { purpose: "Updated Capital Contribution (Phase 1 Approved)" },
    "Corrected project classification title",
    "Admin"
  );

  assert.strictEqual(version2.documentNumber, finalizedReceipt.documentNumber, "Must keep identical document number");
  assert.strictEqual(version2.documentVersion, 2, "Version must increment to 2");
  assert.strictEqual(version2.documentStatus, "finalized");

  // Check version 1 status is now superseded
  const oldVersion = await getCapitalDocumentById(finalizedReceipt.id);
  assert.strictEqual(oldVersion?.documentStatus, "superseded", "Prior version must be marked superseded");
  assert.strictEqual(oldVersion?.supersededBy, version2.id, "Prior version points to new version");

  // Full history check
  const history = await getDocumentVersionHistory(finalizedReceipt.documentNumber);
  assert.strictEqual(history.length, 2, "Must retain both Version 1 and Version 2 in history");
  console.log("  Passed: Immutability verified. Version 1 superseded; Version 2 active.");

  // TEST 9: Void Document with Audit Reason
  console.log("\nTest 9: Voiding document with audit reason...");
  const voidedCert = await voidCapitalDocument(certificate.id, "Issued in error during draft testing", "Admin");
  assert.strictEqual(voidedCert.documentStatus, "voided");
  assert.strictEqual(voidedCert.voidReason, "Issued in error during draft testing");
  console.log("  Passed: Document successfully voided with audit reason preserved.");

  // TEST 10: Dashboard Stats Aggregation
  console.log("\nTest 10: Capital Dashboard stats aggregation...");
  const stats = await getCapitalDashboardStats();
  assert.ok(stats.totalPartners >= 1, "At least 1 partner in system");
  assert.ok(stats.totalCapitalContributed >= 100000, "Contributions reflect ৳100,000+");
  assert.ok(stats.netPartnerCapital >= 100000, "Net capital matches contributions minus withdrawals");
  assert.ok(stats.totalSavedDocuments >= 5, "At least 5 documents tracked");
  console.log("  Passed: Dashboard stats aggregated successfully:", stats);

  // TEST 11: Document and Partner Profile Deletion
  console.log("\nTest 11: Document and partner profile deletion...");
  // 1. Create a transient partner to delete
  const tempPartner = await createPartner({
    name: "Temporary Test Partner",
    phone: "01799887766",
    partnerType: "INVESTOR_CAPITAL",
    ownershipPercentage: 0,
    profitSharePercentage: 0
  });
  assert.ok(tempPartner.id, "Transient partner created");

  // 2. Create a transient document to delete
  const tempDoc = await createCapitalDocumentDraft({
    documentType: "CASH_RECEIPT_VOUCHER",
    partnerId: tempPartner.id,
    amount: 15000,
    paymentMethod: "Cash",
    date: "2026-10-06",
    purpose: "Transient Voucher to Delete"
  });
  assert.ok(tempDoc.id, "Transient document drafted");

  // 3. Delete Document
  const docDeleted = await deleteCapitalDocument(tempDoc.id);
  assert.strictEqual(docDeleted, true, "deleteCapitalDocument must return true");
  const checkDoc = await getCapitalDocumentById(tempDoc.id);
  assert.strictEqual(checkDoc, null, "Deleted document must no longer be found");
  console.log("  Passed: Saved document successfully deleted and verified unretrievable.");

  // 4. Delete Partner
  const partnerDeleted = await deletePartner(tempPartner.id);
  assert.strictEqual(partnerDeleted, true, "deletePartner must return true");
  const checkPartner = await getPartnerById(tempPartner.id);
  assert.strictEqual(checkPartner, null, "Deleted partner must no longer be found");
  console.log("  Passed: Partner profile successfully deleted and verified unretrievable.");

  console.log("\n🎉 ALL 11 CAPITAL & PARTNER DOCUMENT MANAGEMENT TESTS PASSED WITH 100% SUCCESS!");
}

runCapitalPartnerTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
