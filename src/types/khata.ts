export interface KhataCustomer {
  id: string;
  pharmacy_id?: string;
  name: string;
  phone: string;
  address?: string;
  total_due: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface KhataSupplier {
  id: string;
  pharmacy_id?: string;
  name: string;
  company?: string;
  phone?: string;
  total_payable: number;
  is_medichain?: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type KhataTransactionType = 
  | 'SALE' 
  | 'DUE_COLLECTION' 
  | 'PURCHASE' 
  | 'EXPENSE' 
  | 'SUPPLIER_PAYMENT';

export interface KhataTransactionItem {
  productId?: string;
  name: string;
  qty: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface KhataTransaction {
  id: string;
  pharmacy_id?: string;
  type: KhataTransactionType;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  supplier_id?: string | null;
  supplier_name?: string;
  supplier_phone?: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method?: 'Cash' | 'Cash on Delivery' | 'bKash' | 'Nagad' | 'Due' | 'Bank Transfer' | 'Cheque' | 'Other';
  category?: string;
  note?: string;
  linked_order_id?: string;
  items?: KhataTransactionItem[];
  created_at: string;
}

export interface KhataShortItem {
  id: string;
  pharmacy_id?: string;
  product_id?: string | null;
  medicine_name: string;
  generic_name?: string;
  company?: string;
  required_qty: number;
  pack_size?: string;
  estimated_price?: number;
  status: 'Pending' | 'In Cart' | 'Ordered' | 'Received';
  notes?: string;
  created_at: string;
}

export interface KhataSummary {
  totalSalesToday: number;
  cashCollectedToday: number;
  totalDueCustomers: number;
  totalPurchasesToday: number;
  totalExpensesToday: number;
  totalPayableSuppliers: number;
  netCashInHand: number;
  activeCustomersCount: number;
  pendingShortItemsCount: number;
}
