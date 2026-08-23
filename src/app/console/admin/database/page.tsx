"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { audit } from "@/lib/audit";

const COLLECTIONS = [
  "restaurants",
  "foods",
  "stories",
  "offers",
  "cuisines",
  "users",
  "applications",
  "adminSecurity",
  "auditLogs",
  "systemSettings",
] as const;

type Col = (typeof COLLECTIONS)[number];

export default function AdminDatabasePage() {
  const [col, setCol] = useState<Col>("restaurants");
  const [docs, setDocs] = useState<{ id: string; data: Record<string, unknown> }[] | null>(
    null,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (c: Col) => {
    setDocs(null);
    setOpenId(null);
    setError(null);
    try {
      const snap = await getDocs(collection(getDb()!, c));
      setDocs(
        snap.docs.slice(0, 100).map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> })),
      );
    } catch (e) {
      console.warn(e);
      setError(`Could not read "${c}".`);
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(col), 0);
    return () => clearTimeout(t);
  }, [col, load]);

  function openDoc(id: string, data: Record<string, unknown>) {
    setOpenId(id === openId ? null : id);
    setDraft(JSON.stringify(data, null, 2));
    setNotice(null);
    setError(null);
  }

  async function save(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      await setDoc(doc(getDb()!, col, id), parsed);
      void audit("db.doc.update", `${col}/${id}`);
      setNotice("Saved.");
      await load(col);
    } catch (err) {
      setError(err instanceof SyntaxError ? "Invalid JSON." : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(`Delete ${col}/${id}? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDoc(doc(getDb()!, col, id));
      void audit("db.doc.delete", `${col}/${id}`);
      setOpenId(null);
      await load(col);
    } catch {
      setError("Delete failed (rules may forbid it, e.g. users/auditLogs).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-24">
      <h1 className="text-xl font-extrabold mb-1">Database</h1>
      <p className="text-sm text-text-light mb-4">
        Full read/edit/delete access. Every change is written to the audit log.
      </p>

      {/* Collection picker */}
      <div className="flex gap-2 flex-wrap mb-5">
        {COLLECTIONS.map((c) => (
          <button
            key={c}
            onClick={() => setCol(c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              col === c
                ? "bg-gray-900 text-white border-gray-900"
                : "border-line bg-card text-text-light"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}
      {notice && (
        <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>
      )}

      {!docs ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl skel" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-text-light text-center py-8">
          No documents in <b>{col}</b>.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map(({ id, data }) => (
            <li key={id} className="rounded-xl border border-line bg-card overflow-hidden">
              <button
                onClick={() => openDoc(id, data)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-background transition-colors"
              >
                <i
                  className={`fa-solid ${openId === id ? "fa-chevron-down" : "fa-chevron-right"} text-[10px] text-text-light`}
                  aria-hidden
                />
                <code className="text-xs font-bold">{id}</code>
                <span className="ml-auto text-[10px] text-text-light truncate max-w-[45%] text-right">
                  {Object.keys(data).slice(0, 4).join(" · ")}
                </span>
              </button>
              {openId === id && (
                <div className="border-t border-line p-3 bg-background anim-fade-up">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={Math.min(16, draft.split("\n").length + 1)}
                    spellCheck={false}
                    className="w-full rounded-lg border border-line bg-white p-3 text-[11px] font-mono outline-none focus:border-primary"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => void save(id)}
                      disabled={busy}
                      className="flex-1 bg-primary text-white text-xs font-bold rounded-full py-2 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => void remove(id)}
                      disabled={busy}
                      className="flex-1 border border-red-200 text-red-500 text-xs font-bold rounded-full py-2 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
