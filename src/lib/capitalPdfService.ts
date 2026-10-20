import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { CapitalDocument } from "../types.js";

/**
 * Generates high-quality branded A4 PDF for MediChain Capital & Partner Documents
 */
export function renderCapitalDocumentPdf(
  res: any,
  document: CapitalDocument,
  customFilename?: string
): void {
  const safeFilename =
    customFilename ||
    `${(document.documentNumber || "capital-doc").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  const payload = document.documentPayload || {};
  const logoPath = path.join(process.cwd(), "public", "logo.png");

  // Watermark renderer
  const renderWatermark = () => {
    if (fs.existsSync(logoPath)) {
      doc.save();
      doc.opacity(0.04);
      doc.rotate(-10, { origin: [doc.page.width / 2, doc.page.height / 2] });
      const wmSize = 380;
      doc.image(logoPath, (doc.page.width - wmSize) / 2, (doc.page.height - wmSize) / 2, { width: wmSize });
      doc.restore();
    }
  };

  renderWatermark();

  // Top Accent Bar (Orchid & Lime brand colors)
  doc.rect(0, 0, doc.page.width, 6).fill("#9333EA"); // Orchid purple
  doc.rect(0, 6, doc.page.width, 2).fill("#84CC16"); // Lime green

  // Header Section
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 25, { width: 44 });
  }

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#0F172A").text("MediChain", 92, 25);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#9333EA").text("SMART PARTNER FOR PHARMACIES • ফার্মেসির স্মার্ট পার্টনার", 92, 48, { characterSpacing: 0.5 });
  doc.font("Helvetica").fontSize(7.5).fillColor("#64748B").text("Corporate Headquarters • Shorear Tol, Rangpur Sadar, Rangpur, Bangladesh", 92, 60);
  doc.text("Mobile: +880 1940-681989 • Email: support@medichainbd.com • Web: medichainbd.com", 92, 71);

  // Document Badge & Details (Top Right)
  const isFinalized = document.documentStatus === "finalized";
  const badgeColor = isFinalized ? "#166534" : "#9A3412"; // Green / Amber
  const badgeBg = isFinalized ? "#DCFCE7" : "#FFEDD5";
  const badgeText = isFinalized ? `FINALIZED (v${document.documentVersion})` : `DRAFT (v${document.documentVersion})`;

  doc.rect(doc.page.width - 170, 25, 130, 20).fill(badgeBg);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(badgeColor).text(badgeText, doc.page.width - 170, 31, { width: 130, align: "center" });

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F172A").text(document.documentNumber, doc.page.width - 240, 52, { width: 200, align: "right" });
  doc.font("Helvetica").fontSize(8).fillColor("#64748B").text(`Date: ${payload.date || new Date().toISOString().slice(0, 10)}`, doc.page.width - 240, 68, { width: 200, align: "right" });

  // Divider line
  doc.moveTo(40, 95).lineTo(doc.page.width - 40, 95).strokeColor("#E2E8F0").lineWidth(1).stroke();

  // Document Title Banner
  doc.rect(40, 105, doc.page.width - 80, 28).fill("#F8FAFC");
  doc.rect(40, 105, 4, 28).fill("#9333EA");
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1E1B4B").text(document.documentTitle.toUpperCase(), 52, 114, { characterSpacing: 1 });

  let curY = 145;

  // ROUTE BY DOCUMENT TYPE
  if (document.documentType === "CAPITAL_CONTRIBUTION_RECEIPT" || document.documentType === "CASH_RECEIPT_VOUCHER") {
    // Info Grid
    doc.rect(40, curY, doc.page.width - 80, 110).strokeColor("#E2E8F0").lineWidth(1).stroke();

    const drawRow = (y: number, label1: string, val1: string, label2: string, val2: string) => {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#64748B").text(label1, 55, y);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text(val1, 155, y, { width: 150 });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#64748B").text(label2, 320, y);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text(val2, 410, y, { width: 140 });
      doc.moveTo(40, y + 25).lineTo(doc.page.width - 40, y + 25).strokeColor("#F1F5F9").lineWidth(0.8).stroke();
    };

    drawRow(curY + 10, "Received From:", payload.partnerName || document.partnerName, "Payment Method:", payload.paymentMethod || "Cash");
    drawRow(curY + 36, "Capital Account:", payload.partnerName || document.partnerName, "Business Entity:", "MediChain");
    drawRow(curY + 62, "Transaction Purpose:", payload.purpose || "Partner Capital Contribution", "Classification:", "Equity / Partner Capital");
    drawRow(curY + 88, "Contribution Date:", payload.date || "N/A", "Currency:", "BDT (Bangladeshi Taka)");

    curY += 130;

    // Amount Box
    doc.rect(40, curY, doc.page.width - 80, 65).fill("#FAF5FF");
    doc.rect(40, curY, doc.page.width - 80, 65).strokeColor("#E9D5FF").lineWidth(1).stroke();

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#7E22CE").text("CAPITAL AMOUNT RECEIVED", 55, curY + 12);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#581C87").text(`৳ ${Number(payload.amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`, 55, curY + 25);
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#475569").text(`In Words: ${payload.amountInWords || "N/A"}`, 55, curY + 48, { width: doc.page.width - 110 });

    curY += 80;

    if (document.documentType === "CASH_RECEIPT_VOUCHER") {
      // Accounting Double-Entry Table
      doc.rect(40, curY, doc.page.width - 80, 52).fill("#F8FAFC").strokeColor("#E2E8F0").stroke();
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A").text("INTERNAL ACCOUNTING CLASSIFICATION", 55, curY + 8);
      doc.font("Helvetica").fontSize(8).fillColor("#475569").text("Debit (Cash Account): Cash in Hand increases (+)", 55, curY + 22);
      doc.font("Helvetica").fontSize(8).fillColor("#475569").text("Credit (Equity Account): Partner Capital Balance increases (+)", 55, curY + 34);
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#15803D").text(`Amount: ৳${Number(payload.amount || 0).toLocaleString("en-BD")}`, doc.page.width - 160, curY + 28);
      curY += 66;
    }

    // Formal Statement
    doc.rect(40, curY, doc.page.width - 80, 38).fill("#F1F5F9");
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#334155").text(
      `"Received from the above-named contributor as a partner capital contribution to MediChain. This capital entry affects Cash/Bank and Partner Equity, and is strictly excluded from operational sales revenue."`,
      50,
      curY + 8,
      { width: doc.page.width - 100, align: "center", lineGap: 2 }
    );
    curY += 55;

  } else if (document.documentType === "CAPITAL_CONTRIBUTION_CERTIFICATE") {
    // Certificate Frame
    doc.rect(40, curY, doc.page.width - 80, 260).strokeColor("#9333EA").lineWidth(2).stroke();
    doc.rect(44, curY + 4, doc.page.width - 88, 252).strokeColor("#E9D5FF").lineWidth(1).stroke();

    doc.font("Helvetica-Bold").fontSize(15).fillColor("#581C87").text("OFFICIAL CERTIFICATE OF CAPITAL RECORD", 60, curY + 24, { align: "center", width: doc.page.width - 120 });
    doc.font("Helvetica").fontSize(9).fillColor("#64748B").text("Internal Business Capital Registry • MediChain", 60, curY + 44, { align: "center", width: doc.page.width - 120 });

    doc.font("Helvetica-Oblique").fontSize(10).fillColor("#334155").text("This is to formally certify that", 60, curY + 70, { align: "center", width: doc.page.width - 120 });
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#0F172A").text(payload.partnerName || document.partnerName, 60, curY + 88, { align: "center", width: doc.page.width - 120 });

    doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(
      `has contributed the sum of ৳${Number(payload.amount || 0).toLocaleString("en-BD")} (${payload.amountInWords || "N/A"}) towards the permanent Partner Capital of MediChain via ${payload.paymentMethod || "Cash"} on ${payload.date || "N/A"}.`,
      70,
      curY + 115,
      { align: "center", width: doc.page.width - 140, lineGap: 3 }
    );

    // Certificate Meta Box
    doc.rect(70, curY + 160, doc.page.width - 140, 50).fill("#FAF5FF").strokeColor("#E9D5FF").stroke();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#6B21A8").text("CERTIFICATE RECORD METADATA", 80, curY + 168);
    doc.font("Helvetica").fontSize(8).fillColor("#475569").text(`Certificate ID: ${document.documentNumber}`, 80, curY + 182);
    doc.text(`Contribution Type: ${payload.partnerType || "PARTNER_CAPITAL"}`, 80, curY + 194);
    doc.text(`Ownership Share: ${payload.ownershipPercentage || 0}%`, 300, curY + 182);
    doc.text(`Profit Share: ${payload.profitSharePercentage || 0}%`, 300, curY + 194);

    curY += 280;

  } else if (document.documentType === "PARTNER_CAPITAL_STATEMENT") {
    // Statement Summary Box
    doc.rect(40, curY, doc.page.width - 80, 55).fill("#F8FAFC").strokeColor("#E2E8F0").stroke();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#64748B").text("PARTNER DETAILS", 52, curY + 10);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A").text(payload.partnerName || document.partnerName, 52, curY + 22);
    doc.font("Helvetica").fontSize(8).fillColor("#64748B").text(`Phone: ${payload.partnerPhone || "N/A"}`, 52, curY + 36);

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#64748B").text("STATEMENT PERIOD", 240, curY + 10);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text(`${payload.startDate || "All Time"} to ${payload.endDate || payload.date || "Present"}`, 240, curY + 22);

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#7E22CE").text("CLOSING CAPITAL", doc.page.width - 170, curY + 10);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#581C87").text(`৳ ${Number(payload.closingBalance || payload.amount || 0).toLocaleString("en-BD")}`, doc.page.width - 170, curY + 22);

    curY += 70;

    // Statement Transactions Table Header
    doc.rect(40, curY, doc.page.width - 80, 18).fill("#0F172A");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#FFFFFF").text("DATE", 45, curY + 5);
    doc.text("REFERENCE", 100, curY + 5);
    doc.text("DESCRIPTION", 190, curY + 5);
    doc.text("DEBIT (-)", 330, curY + 5, { align: "right", width: 60 });
    doc.text("CREDIT (+)", 400, curY + 5, { align: "right", width: 60 });
    doc.text("BALANCE", 470, curY + 5, { align: "right", width: 75 });
    curY += 18;

    const items = Array.isArray(payload.ledgerEntries) ? payload.ledgerEntries.slice(0, 8) : [];
    if (items.length === 0) {
      doc.rect(40, curY, doc.page.width - 80, 25).strokeColor("#E2E8F0").stroke();
      doc.font("Helvetica").fontSize(8).fillColor("#64748B").text("No prior ledger entries recorded.", 50, curY + 8);
      curY += 25;
    } else {
      items.forEach((item: any, idx: number) => {
        const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        doc.rect(40, curY, doc.page.width - 80, 18).fill(rowBg).strokeColor("#F1F5F9").stroke();
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155").text(item.date || "N/A", 45, curY + 5);
        doc.text((item.transactionNumber || "TXN").substring(0, 14), 100, curY + 5);
        doc.text((item.description || "Capital Entry").substring(0, 26), 190, curY + 5);
        doc.text(item.withdrawal ? `৳${item.withdrawal}` : "-", 330, curY + 5, { align: "right", width: 60 });
        doc.text(item.contribution ? `৳${item.contribution}` : "-", 400, curY + 5, { align: "right", width: 60 });
        doc.font("Helvetica-Bold").text(`৳${item.balance}`, 470, curY + 5, { align: "right", width: 75 });
        curY += 18;
      });
    }

    curY += 20;

  } else if (document.documentType === "PARTNER_CAPITAL_AGREEMENT") {
    // Agreement Sections
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text("1. PARTIES & CAPITAL RECOGNITION", 40, curY);
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(
      `This Agreement is recorded between MediChain and ${payload.partnerName || document.partnerName} (${payload.partnerType || "Partner"}), residing at ${payload.partnerAddress || "Bangladesh"}. The Contributor hereby commits capital of ৳${Number(payload.amount || 0).toLocaleString("en-BD")} (${payload.amountInWords || "N/A"}).`,
      40,
      curY + 12,
      { width: doc.page.width - 80, lineGap: 1.5 }
    );
    curY += 40;

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text("2. EQUITY & PROFIT ENTITLEMENT", 40, curY);
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(
      `Ownership share is recognized at ${payload.ownershipPercentage || 0}% and operational profit share is recognized at ${payload.profitSharePercentage || 0}%, calculated after deducting all COGS, delivery, and business expenses.`,
      40,
      curY + 12,
      { width: doc.page.width - 80, lineGap: 1.5 }
    );
    curY += 35;

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text("3. SEPARATION FROM SALES REVENUE", 40, curY);
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(
      `All capital funds are recorded strictly in the Partner Equity Account and Cash/Bank accounts. Capital contributions are not sales revenue and shall not inflate gross trading margins.`,
      40,
      curY + 12,
      { width: doc.page.width - 80, lineGap: 1.5 }
    );
    curY += 35;

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text("4. WITHDRAWAL & EXIT TERMS", 40, curY);
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(
      `Capital withdrawals require prior reconciliation of the Partner Capital Ledger and approval of authorized management. In the event of dissolution or exit, settlement follows Bangladesh commercial accounting principles.`,
      40,
      curY + 12,
      { width: doc.page.width - 80, lineGap: 1.5 }
    );
    curY += 40;
  }

  // Dual Signature Block (Bottom)
  const sigY = Math.max(curY + 15, doc.page.height - 130);

  // Contributor Signature
  doc.moveTo(40, sigY + 35).lineTo(200, sigY + 35).strokeColor("#CBD5E1").lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A").text(payload.partnerName || document.partnerName, 40, sigY + 40);
  doc.font("Helvetica").fontSize(7.5).fillColor("#64748B").text("Contributor / Partner Signature", 40, sigY + 52);

  // Authorized Signatory
  doc.moveTo(doc.page.width - 200, sigY + 35).lineTo(doc.page.width - 40, sigY + 35).strokeColor("#CBD5E1").lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A").text(payload.signatures?.authorizedName || "Kazi Sohel", doc.page.width - 200, sigY + 40, { align: "right", width: 160 });
  doc.font("Helvetica").fontSize(7.5).fillColor("#64748B").text("For MediChain Management", doc.page.width - 200, sigY + 52, { align: "right", width: 160 });

  // Official Footer Notice
  doc.rect(0, doc.page.height - 25, doc.page.width, 25).fill("#0F172A");
  doc.font("Helvetica").fontSize(7).fillColor("#94A3B8").text(
    `MediChain Document Management System • Doc Ref: ${document.documentNumber} • Version ${document.documentVersion} • Internal Business Record • Not Tax or Legal Certification`,
    40,
    doc.page.height - 17,
    { align: "center", width: doc.page.width - 80 }
  );

  doc.end();
}
