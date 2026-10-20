import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { getDeliveryWindow } from "../src/lib/deliverySchedule";

async function testPdfGeneration() {
  const outputDir = path.join(process.cwd(), "tests", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const standardPdfPath = path.join(outputDir, "test_standard_invoice.pdf");
  const combinedPdfPath = path.join(outputDir, "test_combined_invoice.pdf");

  console.log("Generating test standard invoice PDF...");

  // Mock standard order
  const order = {
    id: "ord-test-12345",
    readableId: "MCH-F034F",
    pharmacyId: "pharm-001",
    pharmacyName: "Dontoh Pharmacy",
    pharmacyOwner: "Dr. Dontoh Rahman",
    pharmacyPhone: "01940-681989",
    pharmacyAddress: "Station Road, Rangpur Sadar, Rangpur",
    pharmacyLicense: "DGDA-DL-2026-7890",
    status: "Confirmed",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    totalAmount: 11113.15,
    totalSavings: 1540.00,
    totalMrp: 12653.15,
    createdAt: new Date().toISOString(),
    items: [
      { productId: "p1", name: "Napa Extra 500+65mg", strength: "500+65mg", packSize: "Box 240", quantity: 10, sellingPrice: 240, mrp: 280, subtotal: 2400 },
      { productId: "p2", name: "Seclo 20mg Capsule", strength: "20mg", packSize: "Box 100", quantity: 15, sellingPrice: 450, mrp: 500, subtotal: 6750 }
    ]
  };

  const pharmacy = {
    id: "pharm-001",
    pharmacyName: "Dontoh Pharmacy",
    ownerName: "Dr. Dontoh Rahman",
    phone: "01940-681989",
    address: "Station Road, Rangpur Sadar, Rangpur",
    licenseNo: "DGDA-DL-2026-7890"
  };

  // Standard PDF generation test
  const doc = new PDFDocument({ margin: 0, size: "A4" });
  const writeStream = fs.createWriteStream(standardPdfPath);
  doc.pipe(writeStream);

  const logoPath = path.join(process.cwd(), "public", "logo.png");

  // 1. Header Band: Clean, minimal white background (#FFFFFF) for crisp printing
  doc.rect(0, 0, doc.page.width, 95).fill("#FFFFFF");

  // Subtle clean divider line along bottom edge of header
  doc.moveTo(30, 95).lineTo(doc.page.width - 30, 95).strokeColor("#E2E8F0").lineWidth(1).stroke();

  // Header Content - Left: Logo, MediChain, Tagline, Contact Info
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 22, { width: 52 });
  }
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0F172A").text("MediChain", 92, 22);
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#0D9488").text("SMART PARTNER FOR PHARMACIES", 92, 44, { characterSpacing: 1.5 });
  doc.font("Helvetica").fontSize(7.5).fillColor("#475569").text("Shorear Tol, Rangpur Sadar, Rangpur, Bangladesh • Mob: 01940-681989", 92, 57);
  doc.text("Email: support@medichainbd.com", 92, 69);

  // Header Content - Right: INVOICE, Number, Date, Order Ref
  const cleanId = (order.id || "").replace(/-/g, "").substring(0, 6).toUpperCase();
  const readableNum = order.readableId ? order.readableId.replace("MCH-", "").replace("INV-", "") : cleanId;
  const displayInvoiceNum = `INV-${readableNum}`;
  const orderRef = order.readableId || `MCH-${cleanId}`;

  const now = new Date();
  const invoiceDate = `${String(now.getDate()).padStart(2, "0")}-${now.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${now.getFullYear()}`;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A").text("INVOICE", 380, 22, { align: "right", width: doc.page.width - 410, characterSpacing: 1 });
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#0F172A").text(displayInvoiceNum, 380, 35, { align: "right", width: doc.page.width - 410 });
  doc.font("Helvetica").fontSize(7.5).fillColor("#475569").text(`Date: ${invoiceDate}`, 380, 57, { align: "right", width: doc.page.width - 410 });
  doc.text(`Order Ref: #${orderRef}`, 380, 69, { align: "right", width: doc.page.width - 410 });

  doc.end();

  await new Promise<void>((resolve) => writeStream.on("finish", () => resolve()));
  console.log(`Standard invoice PDF generated successfully at ${standardPdfPath} (Size: ${fs.statSync(standardPdfPath).size} bytes)`);

  // Combined Invoice PDF generation test
  const doc2 = new PDFDocument({ margin: 30, size: "A4" });
  const writeStream2 = fs.createWriteStream(combinedPdfPath);
  doc2.pipe(writeStream2);

  // 1. Header Band: Clean, minimal white background (#FFFFFF) for crisp printing
  doc2.rect(0, 0, doc2.page.width, 105).fill("#FFFFFF");

  // Clean subtle divider line along bottom edge of header
  doc2.moveTo(30, 105).lineTo(doc2.page.width - 30, 105).strokeColor("#E2E8F0").lineWidth(1).stroke();

  if (fs.existsSync(logoPath)) {
    doc2.image(logoPath, 30, 22, { width: 52 });
  }
  doc2.font("Helvetica-Bold").fontSize(18).fillColor("#0F172A").text("MediChain", 92, 22);
  doc2.font("Helvetica-Bold").fontSize(7).fillColor("#0D9488").text("SMART PARTNER FOR PHARMACIES • WHOLESALE DELIVERY", 92, 44, { characterSpacing: 1.2 });
  doc2.font("Helvetica").fontSize(7.5).fillColor("#475569").text("Shorear Tol, Rangpur Sadar, Rangpur, Bangladesh • Helpline: 01940-681989", 92, 57);
  doc2.text("Automated Delivery Schedule Order Consolidation System", 92, 69);

  // Header Content - Right: COMBINED INVOICE
  doc2.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A").text("COMBINED DELIVERY INVOICE", 330, 22, { align: "right", width: doc2.page.width - 360, characterSpacing: 0.8 });
  doc2.font("Helvetica-Bold").fontSize(15).fillColor("#0F172A").text("INV-20261009-F034F", 330, 35, { align: "right", width: doc2.page.width - 360 });
  doc2.font("Helvetica-Bold").fontSize(8).fillColor("#B45309").text("Schedule: FRIDAY DELIVERY", 330, 54, { align: "right", width: doc2.page.width - 360 });
  doc2.font("Helvetica").fontSize(7.5).fillColor("#475569").text("Target Date: 2026-10-09", 330, 68, { align: "right", width: doc2.page.width - 360 });
  doc2.text("Orders Consolidated: 3 orders", 330, 80, { align: "right", width: doc2.page.width - 360 });

  doc2.end();

  await new Promise<void>((resolve) => writeStream2.on("finish", () => resolve()));
  console.log(`Combined invoice PDF generated successfully at ${combinedPdfPath} (Size: ${fs.statSync(combinedPdfPath).size} bytes)`);
}

testPdfGeneration().catch(console.error);
