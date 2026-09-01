import React, { useEffect, useState } from "react";
import { X, Bell, CheckCheck, RefreshCw, Sparkles, Tag, Package, Coins, PackageCheck, AlertTriangle } from "lucide-react";
import { Notification } from "../types";
import { notificationService } from "../services";

interface NotificationsPanelProps {
  onClose: () => void;
  onRefreshNotifications: () => void;
}

export default function NotificationsPanel({ onClose, onRefreshNotifications }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read: true } : n));
    onRefreshNotifications();
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
    onRefreshNotifications();
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "stock_restock":
        return <PackageCheck className="w-4 h-4 text-emerald-600" />;
      case "stock_alert":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "price_drop":
      case "offer":
        return <Tag className="w-4 h-4 text-brand-purple" />;
      case "order_update":
        return <Package className="w-4 h-4 text-brand-lime" />;
      case "credit":
        return <Coins className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[70] select-none animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-brand-bg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border-t sm:border border-slate-200 shadow-2xl overflow-y-auto max-h-[85vh] sm:max-h-[80vh] animate-slide-up flex flex-col justify-between z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-black text-brand-charcoal flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-brand-purple" />
              মেডিচেইন ডিপো ব্রডকাস্টার
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">রিয়েল-টাইম অর্ডার ডেলিভারি ও পাইকারি ডিল</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] text-brand-purple font-extrabold hover:underline cursor-pointer flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              সব পঠিত
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Mobile Push Notification Quick Toggle Bar */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-3 rounded-2xl mb-3 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-lime animate-ping"></span>
            <span className="text-xs font-black text-purple-100">মোবাইল পুশ নোটিফিকেশন</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const { pushManager } = await import("../pwa/pushManager");
              await pushManager.subscribe();
              pushManager.sendTestPush().catch(() => {});
            }}
            className="text-[10px] font-black bg-brand-lime text-slate-950 px-2.5 py-1 rounded-xl shadow-xs hover:bg-lime-400 transition-all cursor-pointer"
          >
            চালু / টেস্ট
          </button>
        </div>

        {/* List of broadcasts */}
        <div className="space-y-2.5 overflow-y-auto flex-1 min-h-[160px] pr-1">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-purple" />
            </div>
          )}

          {!loading && notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-xs font-semibold">No Broadcasts Active</p>
              <p className="text-[9px] text-slate-400 mt-1">Updates on restocks and approvals will show up here.</p>
            </div>
          ) : (
            notifications.map(n => {
              const isRead = Boolean(n.read || n.is_read);
              return (
                <div
                  key={n.id}
                  onClick={() => !isRead && handleMarkRead(n.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex gap-3 text-xs items-start cursor-pointer ${
                    isRead
                      ? "bg-white border-slate-100 text-slate-600"
                      : "bg-brand-purple/5 border-brand-purple/20 text-slate-800 font-medium hover:bg-brand-purple/10"
                  }`}
                >
                  <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-extrabold text-brand-charcoal leading-tight truncate">{n.title}</span>
                      <span className="text-[8px] text-slate-400 font-mono whitespace-nowrap">
                        {n.created_at || (n as any).timestamp ? new Date(n.created_at || (n as any).timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">{n.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
