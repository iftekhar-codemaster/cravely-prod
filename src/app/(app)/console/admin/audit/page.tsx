"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

type LogEntry = {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  target: string;
  details?: Record<string, unknown>;
  at?: { toDate?: () => Date } | null;
};

const ICONS: Record<string, string> = {
  "auth.signin": "fa-right-to-bracket",
  "user.role.change": "fa-user-pen",
  "user.perms": "fa-sliders",
  "application.decision": "fa-file-signature",
  "restaurant.verified": "fa-store",
  "food.publish": "fa-bowl-food",
  "food.delete": "fa-trash",
  "story.publish": "fa-circle-play",
  "story.delete": "fa-trash",
  "security.passkey.enroll": "fa-fingerprint",
  "security.passkey.remove": "fa-fingerprint",
  "security.passkey.reset": "fa-shield-halved",
  "security.ip.add": "fa-network-wired",
  "security.ip.remove": "fa-network-wired",
  "security.recovery.toggled": "fa-toggle-on",
  "db.doc.update": "fa-database",
  "db.doc.delete": "fa-database",
  "impersonation.start": "fa-user-secret",
  "impersonation.stop": "fa-user-secret",
};

const TONE: Record<string, string> = {
  delete: "text-red-500",
  reset: "text-amber-500",
  impersonation: "text-purple-500",
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getDb()!;
    const snap = await getDocs(query(collection(db, "auditLogs"), limit(150)));
    const rows = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as Omit<LogEntry, "id">) }),
    );
    rows.sort((a, b) => {
      const ta = a.at?.toDate?.().getTime() ?? 0;
      const tb = b.at?.toDate?.().getTime() ?? 0;
      return tb - ta;
    });
    setLogs(rows);
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => void load().catch(() => setError("Could not load audit logs.")),
      0,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!logs) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl skel" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-1">Audit log</h1>
      <p className="text-sm text-text-light mb-5">
        Every important action, in order. Append-only — nothing here can be edited
        or deleted.
      </p>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}
      {logs.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-light">
          Nothing logged yet. Actions will appear here as they happen.
        </div>
      )}
      <ul className="space-y-2 pb-24">
        {logs.map((log) => {
          const when = log.at?.toDate?.();
          const toneKey = Object.keys(TONE).find((k) => log.action.includes(k));
          return (
            <li
              key={log.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5"
            >
              <span className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0 ${TONE[toneKey ?? ""] ?? "text-primary"}`}>
                <i className={`fa-solid ${ICONS[log.action] ?? "fa-circle-info"} text-xs`} aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{log.action}</div>
                <div className="text-[11px] text-text-light truncate">
                  {log.actorEmail}
                  {log.target ? ` · ${log.target}` : ""}
                  {log.details && Object.keys(log.details).length > 0
                    ? ` · ${JSON.stringify(log.details).slice(0, 80)}`
                    : ""}
                </div>
              </div>
              <span className="text-[10px] text-text-light flex-shrink-0">
                {when
                  ? when.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "…"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
