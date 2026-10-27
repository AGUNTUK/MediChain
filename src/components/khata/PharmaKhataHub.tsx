import React, { useState } from "react";
import { 
  X, 
  ArrowLeft, 
  BookOpen, 
  TrendingUp, 
  Users, 
  Truck, 
  ShoppingBag, 
  Receipt, 
  Sparkles,
  LayoutDashboard
} from "lucide-react";
import PharmaKhataDashboard from "./PharmaKhataDashboard";
import PharmaKhataSalesView from "./PharmaKhataSalesView";
import PharmaKhataShortBook from "./PharmaKhataShortBook";
import PharmaKhataSuppliers from "./PharmaKhataSuppliers";
import PharmaKhataCustomersView from "./PharmaKhataCustomersView";
import PharmaKhataSaleModal from "./PharmaKhataSaleModal";
import PharmaKhataExpenseModal from "./PharmaKhataExpenseModal";
import PharmaKhataPurchaseModal from "./PharmaKhataPurchaseModal";
import { usePharmaKhata } from "../../hooks/usePharmaKhata";
import { Order } from "../../types";

export type KhataTab = 
  | 'dashboard' 
  | 'sales' 
  | 'short_book' 
  | 'customers' 
  | 'suppliers' 
  | 'expenses' 
  | 'purchases'
  | 'new_sale'
  | 'new_expense'
  | 'new_purchase';

interface PharmaKhataHubProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacyId?: string;
  pharmacyName?: string;
  orders?: Order[];
  onOpenCart?: () => void;
  initialTab?: KhataTab;
}

export default function PharmaKhataHub({
  isOpen,
  onClose,
  pharmacyId,
  pharmacyName = "City Pharma",
  orders = [],
  onOpenCart,
  initialTab = 'dashboard'
}: PharmaKhataHubProps) {
  const [activeTab, setActiveTab] = useState<KhataTab>(
    initialTab === 'new_sale' ? 'sales' :
    initialTab === 'new_expense' ? 'expenses' :
    initialTab === 'new_purchase' ? 'purchases' :
    initialTab
  );

  // Sub-modal states
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(initialTab === 'new_sale');
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(initialTab === 'new_expense');
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(initialTab === 'new_purchase');

  React.useEffect(() => {
    if (initialTab === 'new_sale') {
      setActiveTab('sales');
      setIsNewSaleOpen(true);
    } else if (initialTab === 'new_expense') {
      setActiveTab('expenses');
      setIsNewExpenseOpen(true);
    } else if (initialTab === 'new_purchase') {
      setActiveTab('purchases');
      setIsNewPurchaseOpen(true);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Khata hook
  const {
    customers,
    suppliers,
    transactions,
    shortBook,
    summary,
    addSale,
    collectDue,
    addExpense,
    addPurchase,
    addCustomer,
    addSupplier,
    addShortItem,
    removeShortItem,
    updateShortItemStatus,
    orderShortItemsViaMediChain
  } = usePharmaKhata({ pharmacyId, pharmacyName, orders });

  if (!isOpen) return null;

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return "আজকের হিসাব";
      case 'sales': return "বিক্রি ও বাকি খাতা";
      case 'short_book': return "শর্ট খাতা (১-ক্লিক অর্ডার)";
      case 'customers': return "কাস্টমার ও বাকি হিসাব";
      case 'suppliers': return "সাপ্লায়ার খাতা";
      case 'expenses': return "দোকানের ব্যয় খাতা";
      case 'purchases': return "ওষুধ ক্রয় খাতা";
      default: return "ফার্মা-স্মার্ট খাতা";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#F8F7FC] w-full max-w-2xl h-[94vh] sm:h-[92vh] max-h-[820px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-purple-100/90 transition-all">
        {/* Hub Header */}
        <div className="bg-white px-4 py-3 border-b border-purple-100 flex items-center justify-between shrink-0 shadow-2xs relative">
          <div className="flex items-center gap-2">
            {activeTab !== 'dashboard' && (
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer mr-1"
                title="ড্যাশবোর্ডে ফিরুন"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-8 h-8 rounded-xl bg-purple-100/80 border border-purple-200/60 flex items-center justify-center text-purple-700 font-bold shrink-0">
              <BookOpen className="w-4 h-4 text-purple-600" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  {getTitle()}
                </h3>
                <span className="bg-brand-lime text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                  স্মার্ট খাতা
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{pharmacyName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Accent bottom stripe */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-purple-400 to-[#84cc16]" />
        </div>

        {/* Tab Navigation Pill Strip */}
        <div className="bg-white px-3 py-2 border-b border-purple-50 shrink-0 overflow-x-auto scrollbar-hide flex items-center gap-1.5">
          {[
            { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
            { id: 'sales', label: 'বিক্রি', icon: TrendingUp },
            { id: 'short_book', label: 'শর্ট খাতা', icon: BookOpen, badge: summary.pendingShortItemsCount },
            { id: 'customers', label: 'কাস্টমার', icon: Users },
            { id: 'suppliers', label: 'সাপ্লায়ার', icon: Truck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as KhataTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-brand-lime text-slate-950" : "bg-purple-100 text-purple-800"
                  }`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Content Viewport */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5">
          {activeTab === 'dashboard' && (
            <PharmaKhataDashboard
              summary={summary}
              pharmacyName={pharmacyName}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenNewSale={() => setIsNewSaleOpen(true)}
              onOpenNewExpense={() => setIsNewExpenseOpen(true)}
            />
          )}

          {activeTab === 'sales' && (
            <PharmaKhataSalesView
              transactions={transactions}
              customers={customers}
              onOpenNewSale={() => setIsNewSaleOpen(true)}
            />
          )}

          {activeTab === 'short_book' && (
            <PharmaKhataShortBook
              shortBook={shortBook}
              onAddShortItem={addShortItem}
              onRemoveShortItem={removeShortItem}
              onUpdateStatus={updateShortItemStatus}
              onOrderViaMediChain={orderShortItemsViaMediChain}
              onOpenCart={() => {
                onClose();
                onOpenCart?.();
              }}
            />
          )}

          {activeTab === 'customers' && (
            <PharmaKhataCustomersView
              customers={customers}
              onAddCustomer={addCustomer}
              onCollectDue={collectDue}
            />
          )}

          {activeTab === 'suppliers' && (
            <PharmaKhataSuppliers
              suppliers={suppliers}
              transactions={transactions}
              onAddSupplier={addSupplier}
              onOpenNewPurchase={() => setIsNewPurchaseOpen(true)}
            />
          )}

          {activeTab === 'expenses' && (
            <PharmaKhataSalesView
              transactions={transactions.filter(t => t.type === 'EXPENSE')}
              customers={[]}
              onOpenNewSale={() => setIsNewExpenseOpen(true)}
            />
          )}

          {activeTab === 'purchases' && (
            <PharmaKhataSalesView
              transactions={transactions.filter(t => t.type === 'PURCHASE')}
              customers={[]}
              onOpenNewSale={() => setIsNewPurchaseOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Sub-Modals */}
      <PharmaKhataSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        customers={customers}
        onAddSale={addSale}
        onAddCustomer={addCustomer}
      />

      <PharmaKhataExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => setIsNewExpenseOpen(false)}
        onAddExpense={addExpense}
      />

      <PharmaKhataPurchaseModal
        isOpen={isNewPurchaseOpen}
        onClose={() => setIsNewPurchaseOpen(false)}
        suppliers={suppliers}
        onAddPurchase={addPurchase}
      />
    </div>
  );
}
