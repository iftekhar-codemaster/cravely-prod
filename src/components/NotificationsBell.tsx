"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useNotifications,
  notificationCreatedAtMs,
  type NotificationDoc,
} from "@/lib/notifications";

function timeAgo(ms: number) {
  if (!ms) return "";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function NotificationsBell() {
  const { notifications, unreadCount, readAtMs, markAllRead, markRead, loading } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function openNotification(n: NotificationDoc) {
    void markRead(n);
    setOpen(false);
    if (n.restaurantId) router.push(`/restaurants/${n.restaurantId}`);
  }

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        className="pressable relative w-9 h-9 rounded-full bg-card border border-line flex items-center justify-center text-text-light hover:text-primary transition-colors"
      >
        <i
          className={`${unreadCount > 0 ? "fa-solid text-primary" : "fa-regular"} fa-bell`}
          aria-hidden
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-line bg-white shadow-[0_12px_30px_rgba(0,0,0,0.15)] overflow-hidden anim-pop">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="text-sm font-bold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  className="text-[11px] font-semibold text-primary pressable"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-10 rounded-lg skel" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-xs text-text-light text-center py-6 px-4">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => {
                  const unread = notificationCreatedAtMs(n) > readAtMs;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={`w-full text-left px-4 py-3 border-b border-line last:border-0 ${
                        unread ? "bg-primary/5" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                          <i className="fa-solid fa-bullhorn" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold leading-snug">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-text-light mt-0.5 leading-snug">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[10px] text-text-light mt-1">
                            {timeAgo(notificationCreatedAtMs(n))}
                            {unread && (
                              <span className="ml-1.5 text-primary font-semibold">
                                • new
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block text-center text-[11px] font-semibold text-text-light hover:text-primary transition-colors py-2.5 border-t border-line"
            >
              View all in profile
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
