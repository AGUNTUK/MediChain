import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { notificationService } from "../services/notificationService";
import { Notification as AppNotification } from "../types";
import { supabase } from "../lib/supabaseClient";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    notificationService.getNotifications().then(setNotifications).catch(console.error);

    const channelId = `notifications-bell-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotif = payload.new as AppNotification;
        if (!newNotif) return;
        
        const isInternal = 
          ["audit_log", "price_history", "import_history", "export_history", "alert_log", "system_settings", "cart", "stock_alert_sub"].includes(newNotif.type) ||
          (typeof newNotif.title === "string" && (newNotif.title.startsWith("Audit:") || newNotif.title.startsWith("Price History:") || newNotif.title.startsWith("Bulk Import") || newNotif.title.startsWith("StockAlertSub:"))) ||
          (typeof newNotif.message === "string" && newNotif.message.trim().startsWith('{"action":'));

        if (isInternal) return;

        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new window.Notification(newNotif.title, {
              body: newNotif.message,
              icon: "/logo.png"
            });
          } catch (e) {
            console.warn("Could not show system notification", e);
          }
        }
        setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => {
        notificationService.getNotifications().then(setNotifications).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isUnread = (n: AppNotification) => !n.is_read && !(n as any).read;
  const unreadCount = notifications.filter(isUnread).length;

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read: true } : n));
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case "stock_restock":
        return { label: "স্টক আপডেট", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      case "stock_alert":
        return { label: "স্টক সতর্কতা", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      case "offer":
      case "price_drop":
        return { label: "বিশেষ অফার", cls: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
      default:
        return { label: "নোটিশ", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={handleToggle} 
        className="p-2 relative hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
        aria-label="নোটিফিকেশন দেখুন"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-black animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase text-slate-600 flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-slate-800">
              <Bell className="w-3.5 h-3.5 text-brand-purple" />
              নোটিফিকেশন ({unreadCount})
            </span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-brand-purple font-bold text-[11px] hover:underline cursor-pointer">
                সবগুলো পড়া হয়েছে
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                <p>কোনো নতুন নোটিফিকেশন নেই</p>
              </div>
            )}
            {notifications.map((n) => {
              const unread = isUnread(n);
              const badge = getBadgeStyle(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => unread && markAsRead(n.id)}
                  className={`p-3.5 text-xs transition-colors cursor-pointer ${
                    unread ? 'bg-indigo-50/70 hover:bg-indigo-100/60' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {unread && <span className="w-2 h-2 rounded-full bg-brand-purple shrink-0"></span>}
                  </div>
                  <p className={`font-black text-xs ${unread ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                  <p className="text-slate-600 mt-1 leading-relaxed text-[11px] font-medium">{n.message}</p>
                  {unread && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="text-[10px] text-brand-purple font-bold hover:underline cursor-pointer"
                      >
                        পড়া হয়েছে হিসেবে চিহ্নিত করুন
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
