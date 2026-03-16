import { useEffect, useState } from "react";
import { SectionHeading } from "../components/SectionHeading";
import { api } from "../lib/api";

export function AdminPanelPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [u, up, st] = await Promise.all([
      api.get("/api/admin/users"),
      api.get("/api/admin/uploads"),
      api.get("/api/admin/stats"),
    ]);
    setUsers(u.data.users);
    setUploads(up.data.uploads);
    setStats(st.data);
  }

  useEffect(() => {
    load().catch((err) => setError(err?.response?.data?.error?.message || "Failed to load admin"));
  }, []);

  async function deleteUser(id: string) {
    if (!confirm("Delete this user and all their uploads?")) return;
    await api.delete(`/api/admin/users/${id}`);
    await load();
  }

  async function deleteUpload(id: string) {
    if (!confirm("Delete this upload?")) return;
    await api.delete(`/api/admin/uploads/${id}`);
    await load();
  }

  return (
    <div className="space-y-8">
      <SectionHeading title="Admin panel" subtitle="Manage users, uploads, system analytics, and dataset export." />
      {error ? <div className="glass rounded-3xl p-5 text-sm text-red-200 shadow-glow">{error}</div> : null}

      <div className="glass rounded-3xl p-6 shadow-glow">
        <div className="flex items-end justify-between gap-4">
          <div className="font-display text-lg font-semibold text-white">System stats</div>
          <a
            href={`${api.defaults.baseURL}/api/admin/export/csv`}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            Download dataset CSV
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/55">Users</div>
            <div className="mt-1 font-display text-2xl font-semibold text-white">{stats?.users ?? "-"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/55">Uploads</div>
            <div className="mt-1 font-display text-2xl font-semibold text-white">{stats?.uploads ?? "-"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/55">Top emotion</div>
            <div className="mt-1 font-display text-2xl font-semibold text-white">{stats?.topEmotions?.[0]?.label ?? "-"}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-6 shadow-glow">
          <div className="font-display text-lg font-semibold text-white">Users</div>
          <div className="mt-4 space-y-3">
            {users.map((u) => (
              <div key={u._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{u.name}</div>
                    <div className="text-xs text-white/55">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{u.role}</span>
                    <button
                      onClick={() => deleteUser(u._id)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 hover:bg-white/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!users.length ? <div className="text-sm text-white/65">No users found.</div> : null}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 shadow-glow">
          <div className="font-display text-lg font-semibold text-white">Uploads</div>
          <div className="mt-4 space-y-3">
            {uploads.map((u) => (
              <div key={u._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {u.analysis?.emotion ?? "unknown"} <span className="text-white/55">({u.fileType})</span>
                    </div>
                    <div className="text-xs text-white/55">{new Date(u.createdAt).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => deleteUpload(u._id)}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 hover:bg-white/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!uploads.length ? <div className="text-sm text-white/65">No uploads found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

