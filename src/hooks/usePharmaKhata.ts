import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  KhataCustomer, 
  KhataSupplier, 
  KhataTransaction, 
  KhataShortItem, 
  KhataSummary 
} from "../types/khata";
import { Order } from "../types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { orderService, productService } from "../services";
import { toBengaliNumber } from "../lib/utils";

interface UsePharmaKhataProps {
  pharmacyId?: string;
  pharmacyName?: string;
  orders?: Order[];
}

const STORAGE_PREFIX = "medichain_pharma_khata_v4_";

/**
 * Robust Client-Side UUID v4 Generator
 * Guarantees RFC4122 compliance before saving to localStorage or upserting to Supabase
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Known legacy demo IDs to filter out if cached in browser
const MOCK_SEED_IDS = new Set([
  "a1111111-1111-4111-8111-111111111111",
  "a2222222-2222-4222-8222-222222222222",
  "a3333333-3333-4333-8333-333333333333",
  "a4444444-4444-4444-8444-444444444444",
  "b1111111-1111-4111-8111-111111111111",
  "b2222222-2222-4222-8222-222222222222",
  "b3333333-3333-4333-8333-333333333333",
  "c1111111-1111-4111-8111-111111111111",
  "c2222222-2222-4222-8222-222222222222",
  "c3333333-3333-4333-8333-333333333333",
  "c4444444-4444-4444-8444-444444444444",
  "e1111111-1111-4111-8111-111111111111",
  "e2222222-2222-4222-8222-222222222222",
  "e3333333-3333-4333-8333-333333333333"
]);

// Clean initial state for live production pharmacies (starts at zero until real entries are created)
const getInitialSeedData = (_pharmacyId: string = "default") => {
  return { 
    seedCustomers: [] as KhataCustomer[], 
    seedSuppliers: [] as KhataSupplier[], 
    seedTransactions: [] as KhataTransaction[], 
    seedShortBook: [] as KhataShortItem[] 
  };
};

export function usePharmaKhata({ pharmacyId = "default-pharmacy", pharmacyName = "City Pharma", orders = [] }: UsePharmaKhataProps = {}) {
  const storageKey = useMemo(() => `${STORAGE_PREFIX}${pharmacyId}`, [pharmacyId]);

  const [customers, setCustomers] = useState<KhataCustomer[]>([]);
  const [suppliers, setSuppliers] = useState<KhataSupplier[]>([]);
  const [transactions, setTransactions] = useState<KhataTransaction[]>([]);
  const [shortBook, setShortBook] = useState<KhataShortItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load state from localStorage or start with clean initial data
  const loadData = useCallback(() => {
    try {
      // Proactively purge old mock storage versions if present
      ["v1", "v2", "v3"].forEach(v => {
        try {
          localStorage.removeItem(`medichain_pharma_khata_${v}_${pharmacyId}`);
        } catch (_) {}
      });

      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Sanitize: filter out any leftover mock seed records
        const sanitizedCustomers = (parsed.customers || []).filter((c: KhataCustomer) => !MOCK_SEED_IDS.has(c.id));
        const sanitizedSuppliers = (parsed.suppliers || []).filter((s: KhataSupplier) => !MOCK_SEED_IDS.has(s.id));
        const sanitizedTransactions = (parsed.transactions || []).filter((t: KhataTransaction) => !MOCK_SEED_IDS.has(t.id));
        const sanitizedShortBook = (parsed.shortBook || []).filter((s: KhataShortItem) => !MOCK_SEED_IDS.has(s.id));

        setCustomers(sanitizedCustomers);
        setSuppliers(sanitizedSuppliers);
        setTransactions(sanitizedTransactions);
        setShortBook(sanitizedShortBook);

        // Update localStorage with clean sanitized state
        const sanitizedBundle = {
          customers: sanitizedCustomers,
          suppliers: sanitizedSuppliers,
          transactions: sanitizedTransactions,
          shortBook: sanitizedShortBook,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(sanitizedBundle));
      } else {
        const { seedCustomers, seedSuppliers, seedTransactions, seedShortBook } = getInitialSeedData(pharmacyId);
        setCustomers(seedCustomers);
        setSuppliers(seedSuppliers);
        setTransactions(seedTransactions);
        setShortBook(seedShortBook);

        const initialBundle = {
          customers: seedCustomers,
          suppliers: seedSuppliers,
          transactions: seedTransactions,
          shortBook: seedShortBook,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(initialBundle));
      }
    } catch (e) {
      console.warn("Failed to read Khata from localStorage:", e);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, pharmacyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist local changes
  const persistState = useCallback((
    newCustomers: KhataCustomer[], 
    newSuppliers: KhataSupplier[], 
    newTransactions: KhataTransaction[], 
    newShortBook: KhataShortItem[]
  ) => {
    try {
      const payload = {
        customers: newCustomers,
        suppliers: newSuppliers,
        transactions: newTransactions,
        shortBook: newShortBook,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save Khata to localStorage:", e);
    }
  }, [storageKey]);

  // 1. Auto-sync MediChain delivered orders into Khata Suppliers & Purchases
  // STRICT STATUS FILTER & COD AUTO-SETTLEMENT LOGIC
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    // Strict status filter: Strictly Delivered or Completed (Never Out for Delivery, Pending, Processing)
    const deliveredOrders = orders.filter(o => 
      o.status === "Delivered" || o.status === "Completed"
    );

    if (deliveredOrders.length === 0) return;

    let hasChanges = false;
    let updatedTransactions = [...transactions];
    let updatedSuppliers = [...suppliers];

    let medichainSupplier = updatedSuppliers.find(s => s.is_medichain || s.name.includes("MediChain"));

    if (!medichainSupplier) {
      medichainSupplier = {
        id: "b1111111-1111-4111-8111-111111111111",
        pharmacy_id: pharmacyId,
        name: "MediChain Wholesale (অফিসিয়াল)",
        company: "MediChain B2B Platform",
        phone: "09612000000",
        total_payable: 0,
        is_medichain: true,
        notes: "অটো-সিঙ্কড হোলসেল সাপ্লায়ার",
        created_at: new Date().toISOString()
      };
      updatedSuppliers.unshift(medichainSupplier);
      hasChanges = true;
    }

    deliveredOrders.forEach(order => {
      // Deduplication Guard: match on linked_order_id, composite order ID, or note
      const exists = updatedTransactions.some(t => 
        t.linked_order_id === order.id || 
        t.id === `mc-order-${order.id}` || 
        t.note?.includes(order.id)
      );

      if (!exists) {
        const orderTotal = Number(order.totalAmount || 0);

        // COD Auto-Settlement:
        // Cash on Delivery orders and orders marked Paid have been paid at the time of delivery.
        // paid_amount = total_amount, due_amount = 0 (Never inflates total_payable).
        const isPaidOrCod = 
          order.paymentMethod === "Cash on Delivery" || 
          (order.paymentStatus || "").toLowerCase() === "paid";

        const orderPaid = isPaidOrCod ? orderTotal : 0;
        const orderDue = isPaidOrCod ? 0 : orderTotal;

        const newTxId = generateUUID();

        updatedTransactions.unshift({
          id: newTxId,
          pharmacy_id: pharmacyId,
          type: "PURCHASE",
          supplier_id: medichainSupplier?.id,
          supplier_name: "MediChain Wholesale",
          total_amount: orderTotal,
          paid_amount: orderPaid,
          due_amount: orderDue,
          payment_method: order.paymentMethod || "Cash on Delivery",
          category: "মেডিচেইন পাইকারি ক্রয়",
          note: `অর্ডার #${order.id.substring(0, 8)} (${order.items?.length || 1} টি আইটেম)`,
          linked_order_id: order.id,
          items: order.items?.map(it => ({
            name: it.name || "ওষুধ",
            qty: it.quantity || 1,
            unitPrice: it.sellingPrice || 0,
            subtotal: it.subtotal || ((it.quantity || 1) * (it.sellingPrice || 0))
          })),
          created_at: order.createdAt || new Date().toISOString()
        });

        // Only unpaid credit orders increase total_payable!
        if (orderDue > 0 && medichainSupplier) {
          medichainSupplier.total_payable = Number(medichainSupplier.total_payable || 0) + orderDue;
        }

        hasChanges = true;
      }
    });

    if (hasChanges) {
      setSuppliers(updatedSuppliers);
      setTransactions(updatedTransactions);
      persistState(customers, updatedSuppliers, updatedTransactions, shortBook);
    }
  }, [orders, suppliers, transactions, customers, shortBook, pharmacyId, persistState]);

  // 2. Checkout Completion Hook:
  // Automatically transition Short Book items currently marked 'In Cart' to 'Ordered' upon successful checkout
  useEffect(() => {
    const handleCheckoutCompleted = (e: any) => {
      setShortBook(prev => {
        const hasInCart = prev.some(s => s.status === "In Cart");
        if (!hasInCart) return prev;

        const updated = prev.map(s => 
          s.status === "In Cart" ? { ...s, status: "Ordered" as const } : s
        );

        persistState(customers, suppliers, transactions, updated);

        if (isSupabaseConfigured && supabase) {
          try {
            updated
              .filter(s => s.status === "Ordered")
              .forEach(s => {
                supabase.from("khata_short_book").upsert([{ id: s.id, status: "Ordered" }], { onConflict: "id" }).then();
              });
          } catch (err) {
            console.warn("Supabase checkout transition notice:", err);
          }
        }

        return updated;
      });
    };

    window.addEventListener("orderCheckoutCompleted", handleCheckoutCompleted);
    return () => window.removeEventListener("orderCheckoutCompleted", handleCheckoutCompleted);
  }, [customers, suppliers, transactions, persistState]);

  // Calculated live summary metrics for today
  const summary: KhataSummary = useMemo(() => {
    const today = new Date();
    const isToday = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return (
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        );
      } catch {
        return false;
      }
    };

    let totalSalesToday = 0;
    let cashCollectedToday = 0;
    let totalPurchasesToday = 0;
    let totalExpensesToday = 0;

    transactions.forEach(t => {
      if (isToday(t.created_at)) {
        if (t.type === "SALE") {
          totalSalesToday += Number(t.total_amount || 0);
          cashCollectedToday += Number(t.paid_amount || 0);
        } else if (t.type === "DUE_COLLECTION") {
          cashCollectedToday += Number(t.paid_amount || 0);
        } else if (t.type === "PURCHASE") {
          totalPurchasesToday += Number(t.total_amount || 0);
        } else if (t.type === "EXPENSE") {
          totalExpensesToday += Number(t.total_amount || 0);
        }
      }
    });

    // Sum of all active customer dues
    const totalDueCustomers = customers.reduce((sum, c) => sum + Number(c.total_due || 0), 0);
    // Sum of all active supplier payables
    const totalPayableSuppliers = suppliers.reduce((sum, s) => sum + Number(s.total_payable || 0), 0);

    // Baseline opening cash for the pharmacy (starts at 0 unless transactions exist)
    const baseFloat = 0;
    const netCashInHand = Math.max(0, baseFloat + cashCollectedToday - totalExpensesToday);

    const activeCustomersCount = customers.length;
    const pendingShortItemsCount = shortBook.filter(s => s.status === "Pending").length;

    return {
      totalSalesToday,
      cashCollectedToday,
      totalDueCustomers,
      totalPurchasesToday,
      totalExpensesToday,
      totalPayableSuppliers,
      netCashInHand,
      activeCustomersCount,
      pendingShortItemsCount
    };
  }, [transactions, customers, suppliers, shortBook]);

  // 3. Idempotent Offline-to-Online Actions with Client-Side UUID Generation & Upsert
  const addSale = useCallback(async ({
    customerId,
    customerName,
    totalAmount,
    paidAmount,
    paymentMethod = "Cash",
    items = [],
    note = ""
  }: {
    customerId?: string | null;
    customerName?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Due' | 'Other';
    items?: Array<{ name: string; qty: number; unitPrice?: number }>;
    note?: string;
  }) => {
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const newTxId = generateUUID();
    const nowStr = new Date().toISOString();

    const newTx: KhataTransaction = {
      id: newTxId,
      pharmacy_id: pharmacyId,
      type: "SALE",
      customer_id: customerId || null,
      customer_name: customerName || (customerId ? "কাস্টমার" : "নগদ বিক্রি (নাম ছাড়া)"),
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      payment_method: paymentMethod,
      items: items.map(it => ({ ...it, subtotal: it.qty * (it.unitPrice || 0) })),
      note,
      created_at: nowStr
    };

    let updatedCustomers = [...customers];
    if (customerId && dueAmount > 0) {
      updatedCustomers = updatedCustomers.map(c => {
        if (c.id === customerId) {
          return { ...c, total_due: Number(c.total_due || 0) + dueAmount };
        }
        return c;
      });
      setCustomers(updatedCustomers);
    }

    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);
    persistState(updatedCustomers, suppliers, updatedTransactions, shortBook);

    // Idempotent Upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_transactions").upsert([{
          id: newTxId,
          pharmacy_id: pharmacyId,
          type: "SALE",
          customer_id: customerId || null,
          customer_name: newTx.customer_name,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          payment_method: paymentMethod,
          items,
          note
        }], { onConflict: "id" });

        if (customerId && dueAmount > 0) {
          const matchedCust = updatedCustomers.find(c => c.id === customerId);
          if (matchedCust) {
            await supabase.from("khata_customers").upsert([{
              id: matchedCust.id,
              pharmacy_id: pharmacyId,
              name: matchedCust.name,
              phone: matchedCust.phone,
              address: matchedCust.address,
              total_due: matchedCust.total_due,
              notes: matchedCust.notes
            }], { onConflict: "id" });
          }
        }
      } catch (err) {
        console.warn("Supabase background sync notice:", err);
      }
    }

    return newTx;
  }, [customers, suppliers, transactions, shortBook, pharmacyId, persistState]);

  const collectDue = useCallback(async ({
    customerId,
    amount,
    paymentMethod = "Cash",
    note = ""
  }: {
    customerId: string;
    amount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Other';
    note?: string;
  }) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const actualCollected = Math.min(amount, Number(customer.total_due || 0));
    const newTxId = generateUUID();
    const nowStr = new Date().toISOString();

    const newTx: KhataTransaction = {
      id: newTxId,
      pharmacy_id: pharmacyId,
      type: "DUE_COLLECTION",
      customer_id: customerId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      total_amount: actualCollected,
      paid_amount: actualCollected,
      due_amount: 0,
      payment_method: paymentMethod,
      note: note || `বাকি আদায় (${paymentMethod})`,
      created_at: nowStr
    };

    const newDue = Math.max(0, Number(customer.total_due || 0) - actualCollected);
    const updatedCustomers = customers.map(c => {
      if (c.id === customerId) {
        return { ...c, total_due: newDue };
      }
      return c;
    });

    const updatedTransactions = [newTx, ...transactions];
    setCustomers(updatedCustomers);
    setTransactions(updatedTransactions);
    persistState(updatedCustomers, suppliers, updatedTransactions, shortBook);

    // Idempotent Upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_transactions").upsert([{
          id: newTxId,
          pharmacy_id: pharmacyId,
          type: "DUE_COLLECTION",
          customer_id: customerId,
          customer_name: customer.name,
          total_amount: actualCollected,
          paid_amount: actualCollected,
          due_amount: 0,
          payment_method: paymentMethod,
          note
        }], { onConflict: "id" });

        await supabase.from("khata_customers").upsert([{
          id: customerId,
          pharmacy_id: pharmacyId,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          total_due: newDue,
          notes: customer.notes
        }], { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase collection sync notice:", err);
      }
    }
  }, [customers, suppliers, transactions, shortBook, pharmacyId, persistState]);

  const addExpense = useCallback(async ({
    category,
    amount,
    paymentMethod = "Cash",
    note = ""
  }: {
    category: string;
    amount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Other';
    note?: string;
  }) => {
    const newTxId = generateUUID();
    const nowStr = new Date().toISOString();

    const newTx: KhataTransaction = {
      id: newTxId,
      pharmacy_id: pharmacyId,
      type: "EXPENSE",
      total_amount: amount,
      paid_amount: amount,
      due_amount: 0,
      payment_method: paymentMethod,
      category,
      note,
      created_at: nowStr
    };

    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);
    persistState(customers, suppliers, updatedTransactions, shortBook);

    // Idempotent Upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_transactions").upsert([{
          id: newTxId,
          pharmacy_id: pharmacyId,
          type: "EXPENSE",
          total_amount: amount,
          paid_amount: amount,
          due_amount: 0,
          payment_method: paymentMethod,
          category,
          note
        }], { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase expense sync notice:", err);
      }
    }
  }, [customers, suppliers, transactions, shortBook, pharmacyId, persistState]);

  const addPurchase = useCallback(async ({
    supplierId,
    supplierName,
    totalAmount,
    paidAmount,
    paymentMethod = "Cash",
    items = [],
    note = ""
  }: {
    supplierId?: string | null;
    supplierName?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Due' | 'Other';
    items?: Array<{ name: string; qty: number; unitPrice?: number }>;
    note?: string;
  }) => {
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const newTxId = generateUUID();
    const nowStr = new Date().toISOString();

    const newTx: KhataTransaction = {
      id: newTxId,
      pharmacy_id: pharmacyId,
      type: "PURCHASE",
      supplier_id: supplierId || null,
      supplier_name: supplierName || "হোলসেল সাপ্লায়ার",
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      payment_method: paymentMethod,
      items: items.map(it => ({ ...it, subtotal: it.qty * (it.unitPrice || 0) })),
      note,
      created_at: nowStr
    };

    let updatedSuppliers = [...suppliers];
    if (supplierId && dueAmount > 0) {
      updatedSuppliers = updatedSuppliers.map(s => {
        if (s.id === supplierId) {
          return { ...s, total_payable: Number(s.total_payable || 0) + dueAmount };
        }
        return s;
      });
      setSuppliers(updatedSuppliers);
    }

    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);
    persistState(customers, updatedSuppliers, updatedTransactions, shortBook);

    // Idempotent Upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_transactions").upsert([{
          id: newTxId,
          pharmacy_id: pharmacyId,
          type: "PURCHASE",
          supplier_id: supplierId || null,
          supplier_name: newTx.supplier_name,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          payment_method: paymentMethod,
          items,
          note
        }], { onConflict: "id" });

        if (supplierId && dueAmount > 0) {
          const matchedSupp = updatedSuppliers.find(s => s.id === supplierId);
          if (matchedSupp) {
            await supabase.from("khata_suppliers").upsert([{
              id: matchedSupp.id,
              pharmacy_id: pharmacyId,
              name: matchedSupp.name,
              company: matchedSupp.company,
              phone: matchedSupp.phone,
              total_payable: matchedSupp.total_payable,
              notes: matchedSupp.notes
            }], { onConflict: "id" });
          }
        }
      } catch (err) {
        console.warn("Supabase purchase sync notice:", err);
      }
    }
  }, [customers, suppliers, transactions, shortBook, pharmacyId, persistState]);

  const addCustomer = useCallback(async ({
    name,
    phone,
    address = "",
    initialDue = 0,
    notes = ""
  }: {
    name: string;
    phone: string;
    address?: string;
    initialDue?: number;
    notes?: string;
  }) => {
    const newCustId = generateUUID();
    const newCust: KhataCustomer = {
      id: newCustId,
      pharmacy_id: pharmacyId,
      name,
      phone,
      address,
      total_due: initialDue,
      notes,
      created_at: new Date().toISOString()
    };

    const updated = [newCust, ...customers];
    setCustomers(updated);
    persistState(updated, suppliers, transactions, shortBook);

    // Idempotent Upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_customers").upsert([{
          id: newCustId,
          pharmacy_id: pharmacyId,
          name,
          phone,
          address,
          total_due: initialDue,
          notes
        }], { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase add customer notice:", err);
      }
    }

    return newCust;
  }, [customers, suppliers, transactions, shortBook, pharmacyId, persistState]);

  const addSupplier = useCallback(async ({
    name,
    company = "",
    phone = "",
    initialPayable = 0,
    notes = ""
  }: {
    name: string;
    company?: string;
    phone?: string;
    initialPayable?: number;
    notes?: string;
  }) => {
    const newSuppId = generateUUID();
    const newSupp: KhataSupplier = {
      id: newSuppId,
      pharmacy_id: pharmacyId,
      name,
      company,
      phone,
      total_payable: initialPayable,
      is_medichain: false,
      notes,
      created_at: new Date().toISOString()
    };

    const updated = [newSupp, ...suppliers];
    setSuppliers(updated);
    persistState(customers, updated, transactions, shortBook);

    // Idempotent Upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_suppliers").upsert([{
          id: newSuppId,
          pharmacy_id: pharmacyId,
          name,
          company,
          phone,
          total_payable: initialPayable,
          is_medichain: false,
          notes
        }], { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase add supplier notice:", err);
      }
    }

    return newSupp;
  }, [customers, suppliers, transactions, shortBook, pharmacyId, persistState]);

  const addShortItem = useCallback(async (params: {
    productId?: string | null;
    medicineName?: string;
    medicine_name?: string;
    genericName?: string;
    generic_name?: string;
    company?: string;
    requiredQty?: number;
    required_qty?: number;
    packSize?: string;
    pack_size?: string;
    estimatedPrice?: number;
    estimated_price?: number;
    notes?: string;
  }) => {
    const medName = params.medicine_name || params.medicineName || "অজ্ঞাত ওষুধ";
    const genName = params.generic_name || params.genericName || "";
    const qty = params.required_qty ?? params.requiredQty ?? 1;
    const pSize = params.pack_size || params.packSize || "Box";
    const estPrice = params.estimated_price ?? params.estimatedPrice ?? 0;

    const newShortId = generateUUID();
    const newItem: KhataShortItem = {
      id: newShortId,
      pharmacy_id: pharmacyId,
      product_id: params.productId || null,
      medicine_name: medName,
      generic_name: genName,
      company: params.company || "",
      required_qty: Math.max(1, qty),
      pack_size: pSize,
      estimated_price: estPrice,
      status: "Pending",
      notes: params.notes || "",
      created_at: new Date().toISOString()
    };

    const updated = [newItem, ...shortBook];
    setShortBook(updated);
    persistState(customers, suppliers, transactions, updated);

    // Idempotent Upsert to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_short_book").upsert([{
          id: newShortId,
          pharmacy_id: pharmacyId,
          product_id: params.productId || null,
          medicine_name: medName,
          generic_name: genName,
          company: params.company || "",
          required_qty: Math.max(1, qty),
          pack_size: pSize,
          estimated_price: estPrice,
          status: "Pending",
          notes: params.notes || ""
        }], { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase add short item notice:", err);
      }
    }

    return newItem;
  }, [customers, suppliers, transactions, shortBook, pharmacyId, persistState]);

  const removeShortItem = useCallback(async (id: string) => {
    const updated = shortBook.filter(s => s.id !== id);
    setShortBook(updated);
    persistState(customers, suppliers, transactions, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_short_book").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete short item notice:", err);
      }
    }
  }, [customers, suppliers, transactions, shortBook, persistState]);

  const updateShortItemStatus = useCallback(async (id: string, status: 'Pending' | 'In Cart' | 'Ordered' | 'Received') => {
    const updated = shortBook.map(s => s.id === id ? { ...s, status } : s);
    setShortBook(updated);
    persistState(customers, suppliers, transactions, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("khata_short_book").upsert([{ id, status }], { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase update short status notice:", err);
      }
    }
  }, [customers, suppliers, transactions, shortBook, persistState]);

  // 4. Short Book -> Cart Bridge with Stock & Availability Validation
  const orderShortItemsViaMediChain = useCallback(async (selectedItems?: KhataShortItem[]) => {
    const itemsToOrder = selectedItems || shortBook.filter(s => s.status === "Pending");
    if (itemsToOrder.length === 0) {
      return { 
        success: false, 
        count: 0, 
        outOfStockCount: 0, 
        message: "অর্ডার করার মতো কোনো শর্ট ওষুধ নেই" 
      };
    }

    setIsSyncing(true);
    let addedCount = 0;
    let outOfStockCount = 0;
    const addedItemIds: string[] = [];

    try {
      // 1. Fetch live products from catalog to find matching products
      const catalogRes = await productService.getProductsPaginated({ limit: 150 });
      const catalog = catalogRes.products || [];

      for (const item of itemsToOrder) {
        let targetProduct: any = null;

        // Try direct ID match if available
        if (item.product_id) {
          targetProduct = catalog.find(p => p.id === item.product_id);
        }

        // Try exact name match or generic match
        if (!targetProduct) {
          const q = item.medicine_name.toLowerCase().trim();
          targetProduct = catalog.find(p => 
            p.name.toLowerCase() === q ||
            p.name.toLowerCase().includes(q) ||
            (item.generic_name && p.genericName.toLowerCase().includes(item.generic_name.toLowerCase()))
          );
        }

        // Fallback: search product service
        if (!targetProduct) {
          const searchRes = await productService.getProducts({ search: item.medicine_name, limit: 3 });
          if (searchRes && searchRes.length > 0) {
            targetProduct = searchRes[0];
          }
        }

        // Strict Stock Validation: Only add if available stock > 0
        const stockAvailable = Number(targetProduct?.availableStock ?? 0);
        if (targetProduct && stockAvailable > 0) {
          const orderQty = Math.max(1, item.required_qty || 1);
          await orderService.addToCart(targetProduct.id, orderQty);
          addedCount++;
          addedItemIds.push(item.id);
        } else {
          // Out of stock or product not found
          outOfStockCount++;
        }
      }

      // Transition only successfully added in-stock items to 'In Cart'
      const addedSet = new Set(addedItemIds);
      const updatedShortBook = shortBook.map(s => 
        addedSet.has(s.id) ? { ...s, status: 'In Cart' as const } : s
      );
      setShortBook(updatedShortBook);
      persistState(customers, suppliers, transactions, updatedShortBook);

      if (isSupabaseConfigured && supabase) {
        try {
          for (const id of addedItemIds) {
            await supabase.from("khata_short_book").upsert([{ id, status: "In Cart" }], { onConflict: "id" });
          }
        } catch (err) {
          console.warn("Supabase short book status sync notice:", err);
        }
      }

      // Trigger global cart update event
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      // Localized Bengali feedback
      let summaryMessage = "";
      if (addedCount > 0 && outOfStockCount > 0) {
        summaryMessage = `${toBengaliNumber(addedCount)}টি ওষুধ কার্টে যোগ হয়েছে, ${toBengaliNumber(outOfStockCount)}টি বর্তমানে স্টকে নেই`;
      } else if (addedCount > 0) {
        summaryMessage = `${toBengaliNumber(addedCount)}টি ওষুধ সফলভাবে মেডিচেইন কার্টে যুক্ত করা হয়েছে`;
      } else {
        summaryMessage = `${toBengaliNumber(outOfStockCount)}টি ওষুধের কোনোটিই বর্তমানে স্টকে নেই`;
      }

      return { 
        success: addedCount > 0, 
        count: addedCount, 
        outOfStockCount,
        message: summaryMessage 
      };
    } catch (err) {
      console.error("Failed to bridge short items to MediChain cart:", err);
      return { 
        success: false, 
        count: addedCount, 
        outOfStockCount,
        message: "কার্টে ওষুধ যুক্ত করতে সমস্যা হয়েছে।" 
      };
    } finally {
      setIsSyncing(false);
    }
  }, [shortBook, customers, suppliers, transactions, persistState]);

  return {
    customers,
    suppliers,
    transactions,
    shortBook,
    summary,
    isLoading,
    isSyncing,
    addSale,
    collectDue,
    addExpense,
    addPurchase,
    addCustomer,
    addSupplier,
    addShortItem,
    removeShortItem,
    updateShortItemStatus,
    orderShortItemsViaMediChain,
    refreshKhata: loadData
  };
}
