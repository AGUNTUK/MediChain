import React, { useState, useEffect, useRef } from "react";
import { Product, Pharmacy, CustomInvoiceData, CustomInvoiceItem } from "../types";
import { resolveItemType } from "./ModernInvoiceModal";
import { apiFetch } from "../lib/apiFetch";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Download,
  Save,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Percent,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Phone,
  MapPin,
  User,
  ShieldCheck,
  CreditCard,
  Truck,
  Eye,
  Edit3,
  Check,
  X
} from "lucide-react";

interface CustomInvoiceGeneratorProps {
  products: Product[];
  pharmacies: Pharmacy[];
  onBackToOrders?: () => void;
}

const STORAGE_KEY = "medichain_custom_invoices_ledger";

export default function CustomInvoiceGenerator({
  products,
  pharmacies
}: CustomInvoiceGeneratorProps) {
  // Tab state: "editor" or "history"
  const [activeTab, setActiveTab] = useState<"editor" | "history">("editor");

  // Notifications / feedback
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Helper to generate a new unique memo number
  const generateNewMemoNumber = () => {
    const now = new Date();
    const datePart = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randPart = Math.floor(1000 + Math.random() * 9000);
    return `INV-INST-${datePart}-${randPart}`;
  };

  // Helper to format today's date YYYY-MM-DD
  const getTodayDateStr = () => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  };

  // Form State
  const [invoiceId, setInvoiceId] = useState<string>(`custom-${Date.now()}`);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(generateNewMemoNumber());
  const [orderRef, setOrderRef] = useState<string>(`INST-DIRECT-${Date.now().toString().slice(-4)}`);
  const [invoiceDate, setInvoiceDate] = useState<string>(getTodayDateStr());
  const [dueDate, setDueDate] = useState<string>(getTodayDateStr());

  // Recipient info
  const [recipientType, setRecipientType] = useState<"institute" | "hospital" | "clinic" | "pharmacy" | "ngo" | "other">("institute");
  const [recipientName, setRecipientName] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [licenseOrRegNo, setLicenseOrRegNo] = useState<string>("N/A - Institutional Direct Supply");

  // Quick pharmacy selector dropdown
  const [selectedExistingPharmacyId, setSelectedExistingPharmacyId] = useState<string>("");

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash on Delivery");
  const [paymentStatus, setPaymentStatus] = useState<"Pending" | "Paid">("Pending");
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [specialAdjustment, setSpecialAdjustment] = useState<number>(0);
  const [notes, setNotes] = useState<string>("Direct institutional pharmaceutical supply. Goods received in good condition.");

  // Line Items State
  const [items, setItems] = useState<CustomInvoiceItem[]>([
    {
      id: `item-${Date.now()}-1`,
      name: "Napa Extra Tablet (500mg+65mg)",
      category: "Tablet",
      strength: "500mg+65mg",
      packSize: "Box of 200",
      mrp: 500,
      rate: 420,
      quantity: 10,
      discountPercentage: 16,
      netDiscount: 800,
      total: 4200
    },
    {
      id: `item-${Date.now()}-2`,
      name: "Seclo 20mg Capsule",
      category: "Capsule",
      strength: "20mg",
      packSize: "Box of 100",
      mrp: 600,
      rate: 510,
      quantity: 5,
      discountPercentage: 15,
      netDiscount: 450,
      total: 2550
    }
  ]);

  // Product Catalog Search Box for quick adding
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [catalogSearchResults, setCatalogSearchResults] = useState<Product[]>([]);
  const [showCatalogDropdown, setShowCatalogDropdown] = useState<boolean>(false);

  // Bulk discount helper
  const [bulkDiscountInput, setBulkDiscountInput] = useState<string>("");
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState<boolean>(false);

  // Saved History State
  const [savedInvoices, setSavedInvoices] = useState<CustomInvoiceData[]>([]);
  const [historySearch, setHistorySearch] = useState<string>("");

  // Preview zoom & dimensions
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const previewInvoiceRef = useRef<HTMLDivElement>(null);
  const BASE_INVOICE_WIDTH = 820;
  const [zoomMode, setZoomMode] = useState<"fit" | "100%" | "custom">("fit");
  const [customZoom, setCustomZoom] = useState<number>(0.85);
  const [scale, setScale] = useState<number>(0.85);
  const [invoiceHeight, setInvoiceHeight] = useState<number>(1080);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Load saved invoices from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedInvoices(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse saved custom invoices", e);
    }
  }, []);

  // Save invoices to localStorage
  const persistSavedInvoices = (list: CustomInvoiceData[]) => {
    setSavedInvoices(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to store custom invoices", e);
    }
  };

  // Responsive zoom sizing for preview canvas
  useEffect(() => {
    const updateDimensions = () => {
      if (!previewCanvasRef.current) return;
      const containerWidth = previewCanvasRef.current.clientWidth;
      if (previewInvoiceRef.current) {
        setInvoiceHeight(previewInvoiceRef.current.scrollHeight || previewInvoiceRef.current.offsetHeight || 1080);
      }
      if (zoomMode === "fit") {
        const availableWidth = Math.max(280, containerWidth - 32);
        const fitScale = Math.min(1, availableWidth / BASE_INVOICE_WIDTH);
        setScale(fitScale);
      } else if (zoomMode === "100%") {
        setScale(1);
      } else {
        setScale(customZoom);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (previewCanvasRef.current) {
      resizeObserver.observe(previewCanvasRef.current);
    }

    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [zoomMode, customZoom, items, recipientName, recipientType]);

  // Catalog search filtering
  useEffect(() => {
    if (!catalogSearch.trim()) {
      setCatalogSearchResults([]);
      return;
    }
    const q = catalogSearch.toLowerCase();
    const matches = products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.genericName && p.genericName.toLowerCase().includes(q)) ||
        (p.company && p.company.toLowerCase().includes(q))
    ).slice(0, 10);
    setCatalogSearchResults(matches);
  }, [catalogSearch, products]);

  // Handle existing pharmacy selection
  const handleSelectExistingPharmacy = (pharmacyId: string) => {
    setSelectedExistingPharmacyId(pharmacyId);
    if (!pharmacyId) return;

    const pharm = pharmacies.find(p => p.id === pharmacyId);
    if (pharm) {
      setRecipientName(pharm.pharmacyName || "");
      setContactPerson(pharm.ownerName || (pharm as any).owner_name || "");
      setPhone(pharm.phone || "");
      setAddress(pharm.address || "");
      setLicenseOrRegNo(pharm.licenseNo || "DGDA-VERIFIED");
      setRecipientType("pharmacy");
      showToast(`Loaded details from pharmacy: ${pharm.pharmacyName}`);
    }
  };

  // Add Item from Catalog
  const handleAddProductFromCatalog = (prod: Product) => {
    const rate = prod.sellingPrice || Math.round(prod.mrp * 0.85);
    const mrp = prod.mrp || Math.round(rate * 1.18);
    const discPct = mrp > 0 ? Math.max(0, Math.round(((mrp - rate) / mrp) * 100)) : 0;
    const netDisc = Math.round(Math.max(0, mrp - rate) * 1 * 100) / 100;
    const total = Math.round(rate * 1 * 100) / 100;

    const newItem: CustomInvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      productId: prod.id,
      name: prod.name,
      category: resolveItemType(prod),
      strength: prod.strength || "",
      packSize: prod.packSize || "",
      mrp,
      rate,
      quantity: 1,
      discountPercentage: discPct,
      netDiscount: netDisc,
      total
    };

    setItems(prev => [...prev, newItem]);
    setCatalogSearch("");
    setShowCatalogDropdown(false);
    showToast(`Added "${prod.name}" to invoice`);
  };

  // Add Manual Custom / Ad-hoc Item
  const handleAddNewManualItem = () => {
    const newItem: CustomInvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: "Custom Medicine / Hospital Supply",
      category: "Tablet",
      strength: "",
      packSize: "Box",
      mrp: 100,
      rate: 85,
      quantity: 1,
      discountPercentage: 15,
      netDiscount: 15,
      total: 85
    };
    setItems(prev => [...prev, newItem]);
    showToast("Added new blank line item");
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof CustomInvoiceItem, val: any) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;

        const updated = { ...it, [field]: val };

        // Auto-recalculate financial columns when qty, mrp, rate or discount change
        let qty = Number(field === "quantity" ? val : updated.quantity) || 0;
        let mrp = Number(field === "mrp" ? val : updated.mrp) || 0;
        let rate = Number(field === "rate" ? val : updated.rate) || 0;
        let discPct = Number(field === "discountPercentage" ? val : updated.discountPercentage) || 0;

        if (field === "discountPercentage") {
          // If discount % changed, adjust rate
          const discountRatio = Math.min(100, Math.max(0, discPct)) / 100;
          rate = Math.round(mrp * (1 - discountRatio) * 100) / 100;
          updated.rate = rate;
        } else if (field === "rate" || field === "mrp") {
          // If rate or mrp changed, recalculate discount %
          if (mrp > 0 && mrp >= rate) {
            discPct = Math.round(((mrp - rate) / mrp) * 1000) / 10;
            updated.discountPercentage = discPct;
          } else {
            updated.discountPercentage = 0;
          }
        }

        const netDiscount = Math.round(Math.max(0, mrp - rate) * qty * 100) / 100;
        const total = Math.round(rate * qty * 100) / 100;

        updated.netDiscount = netDiscount;
        updated.total = total;

        return updated;
      })
    );
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Apply bulk discount to all items
  const handleApplyBulkDiscount = () => {
    const pct = parseFloat(bulkDiscountInput);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showToast("Please enter a valid discount percentage (0 to 100).", true);
      return;
    }

    setItems(prev =>
      prev.map(it => {
        const rate = Math.round(it.mrp * (1 - pct / 100) * 100) / 100;
        const netDiscount = Math.round(Math.max(0, it.mrp - rate) * it.quantity * 100) / 100;
        const total = Math.round(rate * it.quantity * 100) / 100;
        return {
          ...it,
          rate,
          discountPercentage: pct,
          netDiscount,
          total
        };
      })
    );

    setShowBulkDiscountModal(false);
    setBulkDiscountInput("");
    showToast(`Applied ${pct}% uniform discount to all ${items.length} items.`);
  };

  // Reset form to blank template
  const handleResetForm = () => {
    if (items.length > 0 && !window.confirm("Are you sure you want to reset and start a new invoice?")) {
      return;
    }
    setInvoiceId(`custom-${Date.now()}`);
    setInvoiceNumber(generateNewMemoNumber());
    setOrderRef(`INST-DIRECT-${Date.now().toString().slice(-4)}`);
    setInvoiceDate(getTodayDateStr());
    setDueDate(getTodayDateStr());
    setRecipientName("");
    setContactPerson("");
    setPhone("");
    setAddress("");
    setLicenseOrRegNo("N/A - Institutional Direct Supply");
    setSelectedExistingPharmacyId("");
    setPaymentMethod("Cash on Delivery");
    setPaymentStatus("Pending");
    setDeliveryCharge(0);
    setSpecialAdjustment(0);
    setItems([]);
    showToast("Reset form for new custom invoice.");
  };

  // Calculations
  const subtotalMedicines = items.reduce((acc, it) => acc + (it.total || 0), 0);
  const totalMrpSum = items.reduce((acc, it) => acc + (it.mrp || 0) * (it.quantity || 0), 0);
  const wholesaleSavings = Math.max(0, totalMrpSum - subtotalMedicines);
  const netPayable = Math.max(0, subtotalMedicines + (deliveryCharge || 0) + (specialAdjustment || 0));
  const isPaid = paymentStatus === "Paid";
  const amountDue = isPaid ? 0 : netPayable;

  // Compile Current Invoice Data
  const compileCurrentInvoiceData = (): CustomInvoiceData => {
    return {
      id: invoiceId,
      invoiceNumber: invoiceNumber.trim() || generateNewMemoNumber(),
      orderRef,
      createdAt: invoiceDate,
      dueDate,
      recipientType,
      recipientName: recipientName.trim() || "Institutional Client / Unregistered Institute",
      contactPerson: contactPerson.trim() || "Procurement Officer",
      phone: phone.trim() || "N/A",
      address: address.trim() || "Rangpur Division, Bangladesh",
      licenseOrRegNo: licenseOrRegNo.trim() || "N/A - Direct Institutional Supply",
      paymentMethod,
      paymentStatus,
      items,
      subtotal: subtotalMedicines,
      totalMrp: totalMrpSum,
      totalSavings: wholesaleSavings,
      deliveryCharge,
      specialAdjustment,
      netPayable,
      paidAmount: isPaid ? netPayable : 0,
      dueAmount: amountDue,
      notes,
      updatedAt: new Date().toISOString()
    };
  };

  // Save to persistent ledger
  const handleSaveToLedger = () => {
    if (!recipientName.trim()) {
      showToast("Please enter the Institute or Client name before saving.", true);
      return;
    }
    if (items.length === 0) {
      showToast("Please add at least one line item to the invoice.", true);
      return;
    }

    const compiled = compileCurrentInvoiceData();
    const existingIdx = savedInvoices.findIndex(inv => inv.id === compiled.id || inv.invoiceNumber === compiled.invoiceNumber);

    let updatedList: CustomInvoiceData[];
    if (existingIdx >= 0) {
      updatedList = [...savedInvoices];
      updatedList[existingIdx] = compiled;
      showToast(`Updated existing invoice ${compiled.invoiceNumber} in ledger.`);
    } else {
      updatedList = [compiled, ...savedInvoices];
      showToast(`Saved invoice ${compiled.invoiceNumber} to institutional ledger.`);
    }

    persistSavedInvoices(updatedList);
  };

  // Load from ledger
  const handleLoadInvoiceFromLedger = (inv: CustomInvoiceData) => {
    setInvoiceId(inv.id);
    setInvoiceNumber(inv.invoiceNumber);
    setOrderRef(inv.orderRef || `INST-DIRECT-${Date.now().toString().slice(-4)}`);
    setInvoiceDate(inv.createdAt);
    setDueDate(inv.dueDate || inv.createdAt);
    setRecipientType(inv.recipientType || "institute");
    setRecipientName(inv.recipientName);
    setContactPerson(inv.contactPerson || "");
    setPhone(inv.phone || "");
    setAddress(inv.address || "");
    setLicenseOrRegNo(inv.licenseOrRegNo || "");
    setPaymentMethod(inv.paymentMethod || "Cash on Delivery");
    setPaymentStatus(inv.paymentStatus || "Pending");
    setDeliveryCharge(inv.deliveryCharge ?? 0);
    setSpecialAdjustment(inv.specialAdjustment ?? 0);
    setNotes(inv.notes || "");
    setItems(inv.items || []);
    setActiveTab("editor");
    showToast(`Loaded invoice ${inv.invoiceNumber} into editor.`);
  };

  // Delete from ledger
  const handleDeleteInvoiceFromLedger = (id: string, invNum: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invNum} from saved history?`)) {
      return;
    }
    const filtered = savedInvoices.filter(inv => inv.id !== id);
    persistSavedInvoices(filtered);
    showToast(`Deleted invoice ${invNum} from ledger.`);
  };

  // Print Invoice via Native Browser Print Dialog
  const handlePrint = () => {
    if (!recipientName.trim()) {
      showToast("Please specify the Institute/Recipient name before printing.", true);
      return;
    }
    window.print();
  };

  // Download PDF via backend PDFKit endpoint
  const handleDownloadPdf = async () => {
    if (!recipientName.trim()) {
      showToast("Please specify the Institute/Recipient name before downloading PDF.", true);
      return;
    }
    if (items.length === 0) {
      showToast("Please add at least one line item before downloading PDF.", true);
      return;
    }

    setDownloadingPdf(true);
    try {
      const payload = compileCurrentInvoiceData();
      const res = await apiFetch("/api/admin/custom-invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`PDF generation failed: ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `${(payload.invoiceNumber || "custom-invoice").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Downloaded official PDF invoice: ${filename}`);
    } catch (err: any) {
      console.error("PDF Download error:", err);
      showToast(err.message || "Failed to download invoice PDF.", true);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Date formatting for invoice display
  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return "";
    try {
      const d = new Date(dStr);
      return `${String(d.getDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${d.getFullYear()}`;
    } catch {
      return dStr;
    }
  };

  const displayDate = formatDisplayDate(invoiceDate);
  const displayDueDate = formatDisplayDate(dueDate);

  // Filtered history list
  const filteredHistory = savedInvoices.filter(inv => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.recipientName.toLowerCase().includes(q) ||
      (inv.phone && inv.phone.includes(q)) ||
      inv.createdAt.includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden font-sans">
      {/* Toast Feedback HUD */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-semibold text-xs border border-emerald-400 animate-slide-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 bg-rose-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-semibold text-xs border border-rose-400 animate-slide-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Header / Control Bar */}
      <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center text-purple-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Institutional Custom Invoice Generator
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-800 border border-purple-200">
                Direct Supply Mode
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Generate official MediChain invoices with customized pricing & details for hospitals, institutes & direct buyers.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* View Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("editor")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "editor" ? "bg-white text-purple-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Invoice Editor</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer relative ${
                activeTab === "history" ? "bg-white text-purple-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Saved Ledger</span>
              {savedInvoices.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[9px] font-black">
                  {savedInvoices.length}
                </span>
              )}
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={handleResetForm}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            title="Start New Invoice (Reset)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Save to Ledger button */}
          <button
            onClick={handleSaveToLedger}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Ledger</span>
          </button>

          {/* Download Official PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Download Official PDF"
          >
            <Download className={`w-3.5 h-3.5 ${downloadingPdf ? "animate-bounce" : ""}`} />
            <span>{downloadingPdf ? "Generating..." : "Download PDF"}</span>
          </button>

          {/* Native Laser Print */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Print A4 Invoice"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      {activeTab === "editor" ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* ========================================================= */}
          {/* LEFT SIDE: FORM BUILDER & PRICING CONFIGURATOR             */}
          {/* ========================================================= */}
          <div className="no-print w-full lg:w-[50%] xl:w-[48%] h-full overflow-y-auto p-4 sm:p-5 border-r border-slate-200 bg-white space-y-6">
            {/* 1. Recipient & Institute Information */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>Billed To: Institute / Organization Details</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Direct Institutional Supply
                </span>
              </div>

              {/* Quick load from registered pharmacy (optional shortcut) */}
              {pharmacies && pharmacies.length > 0 && (
                <div className="p-2.5 bg-purple-50/70 border border-purple-200/70 rounded-xl space-y-1.5">
                  <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Quick Autofill from Verified Pharmacy Registry (Optional):</span>
                  </label>
                  <select
                    value={selectedExistingPharmacyId}
                    onChange={e => handleSelectExistingPharmacy(e.target.value)}
                    className="w-full text-xs bg-white text-slate-800 border border-purple-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Pharmacy to Autofill (or type custom below) --</option>
                    {pharmacies.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.pharmacyName} ({p.ownerName || "Proprietor"} • {p.phone || "No phone"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Institute Name & Entity Type */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span>Institute / Organization / Pharmacy Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="e.g. Rangpur Community Hospital & Medical College"
                    className="w-full text-xs font-semibold bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Entity Type</label>
                  <select
                    value={recipientType}
                    onChange={e => setRecipientType(e.target.value as any)}
                    className="w-full text-xs bg-white text-slate-800 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none cursor-pointer font-medium"
                  >
                    <option value="institute">Institute</option>
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic / Diagnostic</option>
                    <option value="ngo">NGO / Project</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="other">Other Entity</option>
                  </select>
                </div>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Person / Attention To / Owner</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. Dr. Mahbub Rahman / Procurement Officer"
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone / Mobile Number</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 01712-345678"
                    className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Delivery Address & License / Reg No */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Delivery Address / Department</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Central Pharmacy Store, Medical Campus, Rangpur"
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Drug Lic / Reg No</label>
                  <input
                    type="text"
                    value={licenseOrRegNo}
                    onChange={e => setLicenseOrRegNo(e.target.value)}
                    placeholder="e.g. N/A or DGDA-DL-XXXX"
                    className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Invoice Meta & Payment Terms */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Invoice Metadata & Terms</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoiceNumber(generateNewMemoNumber())}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Regenerate Memo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Invoice / Memo #</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Order / Deal Ref</label>
                  <input
                    type="text"
                    value={orderRef}
                    onChange={e => setOrderRef(e.target.value)}
                    className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Issue Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payment Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full text-xs bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full text-xs bg-white text-slate-800 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                    <option value="Bank Transfer">Bank Transfer / BEFTN</option>
                    <option value="Cheque Payment">Cheque / Demand Draft</option>
                    <option value="bKash / Nagad">bKash / Nagad (MFS)</option>
                    <option value="Institutional Credit (Net 30)">Institutional Credit (Net 30)</option>
                    <option value="Advance Payment">Advance Payment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className={`w-full text-xs font-bold rounded-xl p-2.5 border outline-none cursor-pointer ${
                      paymentStatus === "Paid"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }`}
                  >
                    <option value="Pending">PENDING (Due on Delivery / Terms)</option>
                    <option value="Paid">PAID (Full Amount Received)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Delivery Fee (৳)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryCharge}
                    onChange={e => setDeliveryCharge(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono font-bold bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Special Rebate (৳)</label>
                  <input
                    type="number"
                    step="1"
                    value={specialAdjustment}
                    onChange={e => setSpecialAdjustment(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Line Items Configurator (Products, MRP, Institutional Rate, Discount) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Product Line Items & Institutional Rates</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-mono font-bold">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Set specific institutional rates, MRP, quantities, and negotiated discounts for each item.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkDiscountModal(true)}
                    className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Percent className="w-3 h-3" />
                    <span>Bulk Disc %</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewManualItem}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Item</span>
                  </button>
                </div>
              </div>

              {/* Fast Product Catalog Autocomplete Bar */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={e => {
                      setCatalogSearch(e.target.value);
                      setShowCatalogDropdown(true);
                    }}
                    onFocus={() => setShowCatalogDropdown(true)}
                    placeholder="Search MediChain catalog to quick-add medicines (e.g. Napa, Seclo, Maxpro, Cipro)..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 bg-white text-slate-900 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none shadow-xs font-medium"
                  />
                  {catalogSearch && (
                    <button
                      onClick={() => {
                        setCatalogSearch("");
                        setShowCatalogDropdown(false);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown search results */}
                {showCatalogDropdown && catalogSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>Select Medicine to Add to Invoice</span>
                      <span>{catalogSearchResults.length} matches</span>
                    </div>
                    {catalogSearchResults.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => handleAddProductFromCatalog(prod)}
                        className="p-2.5 hover:bg-purple-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{prod.name}</span>
                            {prod.strength && (
                              <span className="text-[11px] text-purple-700 font-normal">
                                ({prod.strength})
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-500">
                            {prod.genericName || "Generic"} • {prod.company || "Manufacturer"} • {prod.packSize || "Unit"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900">
                            MRP ৳{prod.mrp}
                          </div>
                          <div className="font-mono text-[10.5px] text-emerald-600 font-semibold">
                            Base ৳{prod.sellingPrice}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Table / Cards */}
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-white space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No items added to this invoice yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Search the catalog above or click "Add Custom Item" to add pharmaceutical products.
                    </p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-3 hover:border-purple-300 transition-colors shadow-2xs"
                    >
                      {/* Item Row Top: SL, Type, Name, Remove */}
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>

                          <select
                            value={item.category || "Tablet"}
                            onChange={e => handleUpdateItem(item.id, "category", e.target.value)}
                            className="text-[11px] font-bold uppercase text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-1.5 py-1 outline-none shrink-0"
                          >
                            <option value="Tablet">Tablet</option>
                            <option value="Syrup">Syrup</option>
                            <option value="Capsule">Capsule</option>
                            <option value="Injection">Injection</option>
                            <option value="Drop">Drop</option>
                            <option value="Ointment">Ointment</option>
                            <option value="Surgical">Surgical</option>
                            <option value="Inhaler">Inhaler</option>
                            <option value="Powder">Powder</option>
                            <option value="Vaccine">Vaccine</option>
                            <option value="Equipment">Equipment</option>
                          </select>

                          <input
                            type="text"
                            value={item.name}
                            onChange={e => handleUpdateItem(item.id, "name", e.target.value)}
                            placeholder="Medicine / Item Name"
                            className="flex-1 min-w-[120px] text-xs font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-purple-600 outline-none px-1 py-0.5"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Row Details: Strength/Pack Size, Quantity, MRP, Institutional Rate, Disc %, Total */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500 font-medium">Strength / Pack</label>
                          <input
                            type="text"
                            value={item.strength || item.packSize || ""}
                            onChange={e => handleUpdateItem(item.id, "strength", e.target.value)}
                            placeholder="e.g. 500mg • Box"
                            className="w-full text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-1.5 outline-none focus:bg-white"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500 font-medium">Qty (Units)</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateItem(item.id, "quantity", e.target.value)}
                            className="w-full text-xs font-mono font-bold bg-slate-50 text-slate-900 border border-slate-200 rounded-lg p-1.5 outline-none focus:bg-white text-right"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500 font-medium">MRP (৳)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.mrp}
                            onChange={e => handleUpdateItem(item.id, "mrp", e.target.value)}
                            className="w-full text-xs font-mono bg-slate-50 text-slate-700 border border-slate-200 rounded-lg p-1.5 outline-none focus:bg-white text-right"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold text-purple-700">Inst. Rate (৳)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={e => handleUpdateItem(item.id, "rate", e.target.value)}
                            className="w-full text-xs font-mono font-black bg-purple-50 text-purple-900 border border-purple-200 rounded-lg p-1.5 outline-none focus:bg-white text-right"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500 font-medium">Disc %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.discountPercentage ?? 0}
                            onChange={e => handleUpdateItem(item.id, "discountPercentage", e.target.value)}
                            className="w-full text-xs font-mono text-emerald-700 font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none focus:bg-white text-right"
                          />
                        </div>

                        <div className="space-y-0.5 text-right">
                          <label className="text-[10px] text-slate-500 font-medium">Line Total</label>
                          <div className="font-mono text-xs font-black text-slate-900 pt-1.5">
                            ৳{item.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Notes & Terms */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
              <label className="text-xs font-semibold text-slate-700">Invoice Notes / Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add special notes (e.g. Delivery terms, Purchase Order Number, or Institutional Tender Reference)..."
                className="w-full text-xs bg-white text-slate-800 border border-slate-300 rounded-xl p-2.5 focus:border-purple-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDE: LIVE DYNAMIC OFFICIAL MEDICHAIN INVOICE CANVAS  */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[50%] xl:w-[52%] h-full flex flex-col bg-slate-200/90 overflow-hidden">
            {/* Live Canvas Toolbar */}
            <div className="no-print bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold tracking-wide text-slate-200">
                  Live Official Invoice Preview
                </span>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setZoomMode("fit")}
                  className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    zoomMode === "fit" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Fit
                </button>
                <button
                  onClick={() => setZoomMode("100%")}
                  className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    zoomMode === "100%" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  100%
                </button>
                <button
                  onClick={() => {
                    setZoomMode("custom");
                    setCustomZoom(prev => Math.max(0.4, prev - 0.1));
                  }}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] text-slate-300 px-1">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => {
                    setZoomMode("custom");
                    setCustomZoom(prev => Math.min(1.4, prev + 0.1));
                  }}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Canvas Scroll Container */}
            <div
              ref={previewCanvasRef}
              className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center items-start"
            >
              {/* Scaled Responsive Document Wrapper */}
              <div
                id="medichain-printable-invoice-wrapper"
                style={{
                  width: `${BASE_INVOICE_WIDTH * scale}px`,
                  height: invoiceHeight ? `${invoiceHeight * scale}px` : "auto",
                  position: "relative",
                  flexShrink: 0,
                  transition: "width 0.1s ease-out, height 0.1s ease-out"
                }}
              >
                <div
                  ref={previewInvoiceRef}
                  id="medichain-printable-invoice"
                  className="bg-white text-slate-900 shadow-2xl rounded-none font-sans border border-slate-300 text-[11px] relative overflow-hidden"
                  style={{
                    width: `${BASE_INVOICE_WIDTH}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                  }}
                >
                  {/* ==================== WATERMARK ==================== */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
                    aria-hidden="true"
                  >
                    <img
                      src="/logo.png"
                      alt=""
                      className="w-[620px] h-[620px] max-w-none object-contain opacity-[0.045] -rotate-[8deg]"
                    />
                  </div>

                  {/* ==================== 1. HEADER BAND ==================== */}
                  <div className="relative z-10">
                    <div
                      className="px-6 py-5 text-white flex flex-row justify-between items-center"
                      style={{
                        background: "linear-gradient(135deg, #14161B 0%, #1E1024 50%, #2B1338 100%)"
                      }}
                    >
                      {/* Left Side: Brand info */}
                      <div className="flex items-center gap-3.5">
                        <img
                          src="/logo.png"
                          alt="MediChain"
                          className="w-[52px] h-[52px] object-contain rounded-xl shrink-0 p-0.5 bg-white/5 border border-white/10"
                        />
                        <div>
                          <h1 className="text-[22px] font-bold text-[#F4F4F5] tracking-tight leading-none mb-1">
                            MediChain
                          </h1>
                          <div className="text-[9px] font-bold tracking-[0.2em] text-[#A3E635] uppercase leading-none mb-1.5">
                            SMART PARTNER FOR PHARMACIES & INSTITUTES
                          </div>
                          <p className="text-[9.5px] text-[#9CA3AF] leading-tight">
                            Shorear Tol, Rangpur Sadar, Rangpur, Bangladesh • Mob: 01940-681989 • support@medichainbd.com
                          </p>
                        </div>
                      </div>

                      {/* Right Side: Invoice Meta */}
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C084FC] mb-0.5">
                          SALES INVOICE
                        </div>
                        <div className="text-[20px] font-black tracking-tight text-[#F4F4F5] leading-none mb-1 font-mono">
                          {invoiceNumber || "INV-INST-000000"}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] space-y-0.5">
                          <div>
                            Date: <span className="text-[#F4F4F5] font-medium">{displayDate}</span>
                          </div>
                          <div>
                            Order Ref: <span className="font-mono text-[#F4F4F5]">#{orderRef}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gradient accent line */}
                    <div
                      className="h-[3px] w-full"
                      style={{
                        background: "linear-gradient(to right, #A855F7, #A3E635)"
                      }}
                    />
                  </div>

                  {/* Document Body Padding */}
                  <div className="p-6 sm:p-7 relative z-10">
                    {/* ==================== 2. BILLED TO / PAYMENT DETAILS ==================== */}
                    <div className="grid grid-cols-12 gap-4 pb-4 mb-4 border-b border-slate-200">
                      {/* Left: Billed to */}
                      <div className="col-span-7 pr-4 border-r border-slate-200 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A855F7]">
                          BILLED TO
                        </div>
                        <div className="text-[14px] font-bold text-[#14161B] leading-tight">
                          {recipientName || "Institutional Partner / Client"}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          Attention / Contact: <span className="text-slate-800 font-medium">{contactPerson || "Procurement Officer"}</span>
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          Reg / Lic: <span className="font-mono text-slate-800 font-medium">{licenseOrRegNo || "N/A"}</span> • Mob: <span className="font-mono text-slate-800">{phone || "N/A"}</span>
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          {address || "Rangpur Division, Bangladesh"}
                        </div>
                      </div>

                      {/* Right: Payment details */}
                      <div className="col-span-5 pl-2 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A855F7]">
                          PAYMENT DETAILS
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          Method: <span className="font-semibold text-slate-800">{paymentMethod}</span>
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          Due Date: <span className="font-medium text-slate-800">{displayDueDate}</span>
                        </div>
                        <div className="pt-0.5">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                              PAID
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ==================== 3. LINE ITEMS TABLE ==================== */}
                    <div className="rounded-lg overflow-hidden border border-slate-200 mb-5 avoid-page-break">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#14161B] text-[#F4F4F5] text-[10px] font-bold tracking-wider uppercase">
                            <th className="py-2 px-2 text-center w-9">SL</th>
                            <th className="py-2 px-2.5 text-left w-20">Type</th>
                            <th className="py-2 px-3 text-left">Item Name</th>
                            <th className="py-2 px-2.5 text-right w-20">MRP</th>
                            <th className="py-2 px-2.5 text-right w-20">Rate</th>
                            <th className="py-2 px-2 text-right w-14">Qty</th>
                            <th className="py-2 px-2.5 text-right w-22">Net Disc</th>
                            <th className="py-2 px-3 text-right w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px] divide-y divide-slate-100">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-6 text-center text-slate-400 font-medium">
                                No items added yet.
                              </td>
                            </tr>
                          ) : (
                            items.map((item, idx) => (
                              <tr
                                key={item.id || idx}
                                className="even:bg-[#FAFAFB] odd:bg-white hover:bg-slate-50 transition-colors"
                              >
                                <td className="py-2 px-2 text-center font-mono text-[#6B7280]">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-2.5 text-left font-bold text-[10px] uppercase text-[#7C3AED]">
                                  {item.category || "Tablet"}
                                </td>
                                <td className="py-2 px-3 text-left">
                                  <span className="font-semibold text-[#14161B]">{item.name}</span>
                                  {item.strength && (
                                    <span className="text-[10px] text-[#6B7280] font-normal ml-1.5">
                                      ({item.strength})
                                    </span>
                                  )}
                                  {item.packSize && !item.name.toLowerCase().includes(item.packSize.toLowerCase()) && (
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                                      • {item.packSize}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#6B7280]">
                                  ৳{(item.mrp || 0).toFixed(2)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-[#14161B]">
                                  ৳{(item.rate || 0).toFixed(2)}
                                </td>
                                <td className="py-2 px-2 text-right font-mono tabular-nums text-[#14161B]">
                                  {item.quantity}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-[#65A30D]">
                                  ৳{(item.netDiscount || 0).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-[#14161B]">
                                  ৳{(item.total || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* ==================== 4. SUMMARY BOX (BOTTOM RIGHT) ==================== */}
                    <div className="flex flex-row justify-end mb-6 avoid-page-break">
                      <div className="w-full sm:w-[320px] space-y-2 text-[11px]">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center px-1 text-[#6B7280]">
                          <span>Subtotal (Medicines / Supplies)</span>
                          <span className="font-mono tabular-nums text-slate-800 font-medium">
                            ৳{subtotalMedicines.toFixed(2)}
                          </span>
                        </div>

                        {/* Wholesale Savings */}
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[#6B7280]">Institutional Savings</span>
                          <span className="font-mono tabular-nums font-bold text-[#65A30D]">
                            -৳{wholesaleSavings.toFixed(2)}
                          </span>
                        </div>

                        {/* Delivery Charge */}
                        <div className="flex justify-between items-center px-1 text-[#6B7280]">
                          <span>Delivery Charge</span>
                          <span className="font-mono tabular-nums text-slate-800 font-medium">
                            ৳{(deliveryCharge || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Special Adjustment (if any) */}
                        {specialAdjustment !== 0 && (
                          <div className="flex justify-between items-center px-1 text-[#6B7280]">
                            <span>Special Adjustment</span>
                            <span className="font-mono tabular-nums font-bold text-purple-700">
                              ৳{(specialAdjustment || 0).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Net Payable Card */}
                        <div
                          className="rounded-xl p-3 text-white flex justify-between items-center shadow-md"
                          style={{
                            background: "linear-gradient(to right, #A855F7, #7C3AED)"
                          }}
                        >
                          <span className="font-bold text-xs uppercase tracking-wide">Net Payable</span>
                          <span className="font-mono tabular-nums text-base sm:text-lg font-black">
                            ৳{netPayable.toFixed(2)}
                          </span>
                        </div>

                        {/* Amount Due Card */}
                        <div className="rounded-xl p-2.5 bg-[#FAFAFB] border border-slate-200 flex justify-between items-center">
                          <span className="font-medium text-slate-700 text-[11px]">
                            Amount Due {isPaid ? "(Paid in Full)" : `(${paymentMethod})`}
                          </span>
                          <span className={`font-mono tabular-nums font-bold text-[13px] ${isPaid ? "text-[#166534]" : "text-[#14161B]"}`}>
                            ৳{amountDue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ==================== 5. FOOTER SECTION ==================== */}
                    <div className="border-t border-dashed border-slate-300 pt-4 mt-2 avoid-page-break space-y-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A855F7] mb-1.5">
                          TERMS & CONDITIONS
                        </div>
                        <ol className="list-decimal list-inside text-[9.5px] text-[#6B7280] space-y-1 leading-relaxed">
                          <li>
                            <strong className="text-slate-700">FEFO Policy:</strong> All pharmaceutical inventory is distributed strictly under First Expired, First Out (FEFO) regulatory compliance.
                          </li>
                          <li>
                            <strong className="text-slate-700">Payment Terms:</strong> Payment must be cleared according to the agreed terms ({paymentMethod}).
                          </li>
                          <li>
                            <strong className="text-slate-700">Direct Institutional Supply:</strong> Sold goods are verified against purchase requirements upon dispatch and receipt inspection.
                          </li>
                          <li>
                            <strong className="text-slate-700">Computer-Generated:</strong> This is an authentic digital sales invoice generated by MediChain systems.
                          </li>
                        </ol>
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-3 gap-8 pt-10 pb-4">
                        <div className="text-center">
                          <div className="border-t border-slate-400 mx-auto w-32"></div>
                          <div className="text-[10px] text-[#6B7280] mt-1.5">Authorized Officer</div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-slate-400 mx-auto w-32"></div>
                          <div className="text-[10px] text-[#6B7280] mt-1.5">Dispatch / Delivery</div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-slate-400 mx-auto w-32"></div>
                          <div className="text-[10px] text-[#6B7280] mt-1.5">Received By (Institute)</div>
                        </div>
                      </div>

                      {/* Verification Bar */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px]">
                        <div className="font-mono text-[#9CA3AF]">
                          Verification Ref: #{orderRef}-{invoiceNumber.slice(-4)}
                        </div>
                        <div className="font-bold text-[#65A30D] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>✓ Verified by MediChain Institutional Supply</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* SAVED CUSTOM INVOICES LEDGER / HISTORY VIEW               */
        /* ========================================================= */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Saved Institutional Invoices Ledger</h2>
                <p className="text-xs text-slate-500">
                  Track, re-open, print, or download invoices generated for clinics, hospitals, and direct institutional clients.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64 sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search by Memo #, Institute, Phone, Date..."
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none"
                  />
                </div>

                <button
                  onClick={() => {
                    handleResetForm();
                    setActiveTab("editor");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No saved invoices found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {historySearch ? "No records match your search criteria." : "Create and save an institutional invoice from the generator to build your ledger."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Invoice Memo #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Institute / Client</th>
                      <th className="p-3">Items</th>
                      <th className="p-3 text-right">Net Payable</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-purple-700">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3 text-slate-600">
                          {inv.createdAt}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{inv.recipientName}</div>
                          <div className="text-[11px] text-slate-500">{inv.phone || "No phone"} • {inv.address}</div>
                        </td>
                        <td className="p-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-medium">
                            {inv.items ? inv.items.length : 0} items
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          ৳{inv.netPayable ? inv.netPayable.toFixed(2) : "0.00"}
                        </td>
                        <td className="p-3 text-center">
                          {inv.paymentStatus === "Paid" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              PAID
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleLoadInvoiceFromLedger(inv)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-purple-600 hover:text-purple-800 cursor-pointer"
                              title="Open in Editor"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoiceFromLedger(inv.id, inv.invoiceNumber)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete from Ledger"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Discount Modal */}
      {showBulkDiscountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Percent className="w-4 h-4 text-purple-600" />
                <span>Apply Uniform Bulk Discount</span>
              </div>
              <button
                onClick={() => setShowBulkDiscountModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Apply a flat percentage discount to all {items.length} items in this invoice. This will automatically recalculate institutional rates based on each item's MRP.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Discount Percentage (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  autoFocus
                  value={bulkDiscountInput}
                  onChange={e => setBulkDiscountInput(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full text-base font-bold text-slate-900 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none pr-8"
                />
                <span className="absolute right-3.5 top-3.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-500">Quick presets:</span>
              {[10, 12, 15, 18, 20].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBulkDiscountInput(val.toString())}
                  className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200"
                >
                  {val}%
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowBulkDiscountModal(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkDiscount}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs"
              >
                Apply to All Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
