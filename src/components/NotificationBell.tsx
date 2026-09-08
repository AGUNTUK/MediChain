import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { notificationService } from "../services/notificationService";
import { Notification as AppNotification } from "../types";
import { supabase } from "../lib/supabaseClient";

const INTERNAL_TYPES = new Set([
  "cart",
  "audit",
  "audit_log",
  "system_settings",
  "price_history",
  "stock_alert_sub",
  "push_subscription",
  "push_sub",
  "import_history",
  "export_history"
]);

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("medichain_user");
    if (raw) {
      const u = JSON.parse(raw);
      return u?.id || null;
    }
  } catch {}
  return null;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    notificationService.getNotifications().then(setNotifications).catch(console.error);

    const currentUserId = getCurrentUserId();
    const uniqueChannelId = `notif:${currentUserId || "guest"}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
    
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(uniqueChannelId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          const newNotif = payload.new as any;
          if (!newNotif || !newNotif.title || INTERNAL_TYPES.has(newNotif.type)) {
            return; // Ignore internal cart and system metadata records
          }

          const activeUserId = getCurrentUserId();
          if (newNotif.user_id && activeUserId && newNotif.user_id !== activeUserId) {
            return; // Discard notifications targeted to other users
          }

          if ("Notification" in window && Notification.permission === "granted") {
            if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.ready) {
              navigator.serviceWorker.ready
                .then(reg => {
                  reg.showNotification(newNotif.title, {
                    body: newNotif.message,
                    icon: "/logo.png"
                  });
                })
                .catch(() => {
                  try {
                    new window.Notification(newNotif.title, {
                      body: newNotif.message,
                      icon: "/logo.png"
                    });
                  } catch {}
                });
            } else {
              try {
                new window.Notification(newNotif.title, {
                  body: newNotif.message,
                  icon: "/logo.png"
                });
              } catch {}
            }
          }

          const formattedNotif: AppNotification = {
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            created_at: newNotif.created_at,
            is_read: !!(newNotif.read || newNotif.is_read)
          };

          setNotifications(prev => [formattedNotif, ...prev.filter(n => n.id !== newNotif.id)]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
          const updatedNotif = payload.new as any;
          if (!updatedNotif || INTERNAL_TYPES.has(updatedNotif.type)) {
            return; // Ignore internal updates (e.g. cart modifications)
          }

          const activeUserId = getCurrentUserId();
          if (updatedNotif.user_id && activeUserId && updatedNotif.user_id !== activeUserId) {
            return; // Discard updates targeted to other users
          }

          // Surgical in-memory update: eliminates PostgREST HTTP refetch storms
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotif.id
                ? {
                    ...n,
                    ...updatedNotif,
                    is_read: !!(updatedNotif.read || updatedNotif.is_read)
                  }
                : n
            )
          );
        })
        .subscribe();
    } catch (err) {
      console.warn("Realtime notification subscription init warning:", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupErr) {
          console.warn("Channel cleanup error:", cleanupErr);
        }
      }
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

  return (
    <div className="relative">
      <button onClick={handleToggle} className="p-2 relative hover:bg-slate-100 rounded-full cursor-pointer">
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase text-slate-600 flex justify-between items-center">
            <span>Notifications ({unreadCount})</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-brand-purple font-bold text-[11px] hover:underline cursor-pointer">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 && <div className="p-6 text-center text-slate-500 text-xs">No notifications</div>}
            {notifications.map((n) => {
              const unread = isUnread(n);
              return (
                <div
                  key={n.id}
                  onClick={() => unread && markAsRead(n.id)}
                  className={`p-3 text-xs transition-colors cursor-pointer ${
                    unread ? 'bg-indigo-50/70 hover:bg-indigo-100/60' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className={`font-bold ${unread ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                    {unread && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>}
                  </div>
                  <p className="text-slate-600 mb-1 leading-relaxed">{n.message}</p>
                  {unread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="text-[10px] text-brand-purple font-bold hover:underline cursor-pointer"
                    >
                      Mark as read
                    </button>
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
