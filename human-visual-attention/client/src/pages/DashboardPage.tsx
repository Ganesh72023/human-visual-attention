import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SectionHeading } from "../components/SectionHeading";
import { api } from "../lib/api";
import { Pie, PieChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import type { EmotionLabel } from "../lib/emotion";
import { EMOTION_COLORS, coerceEmotion, emotionDotClass } from "../lib/emotion";
import { behaviorColor, behaviorMeaning, behaviorTip, prettyBehavior } from "../lib/behaviors";

type Upload = {
  _id: string;
  fileType: "image" | "video";
  createdAt: string;
  analysis: {
    emotion: string;
    confidence: number;
    behaviors: string[];
    cognitiveState: string;
    suggestions: string[];
    timeline?: { tSec: number; emotion: string; confidence: number }[];
    heatmap?: { mimeType: string; base64: string } | null;
  };
};

export function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Upload[]>([]);
  const [summary, setSummary] = useState<any>(null);

  async function load() {
    const [u, s] = await Promise.all([api.get("/api/uploads?limit=25&page=1"), api.get("/api/stats/summary")]);
    setItems(u.data.items);
    setSummary(s.data);
  }

  useEffect(() => {
    load().catch(() => setError("Failed to load dashboard"));
  }, []);

  const emotionData = useMemo((): Array<{ name: string; value: number; emotion: EmotionLabel }> => {
    const counts = summary?.emotionCounts || {};
    return Object.keys(counts).map((k) => ({ name: k, value: counts[k], emotion: coerceEmotion(k) }));
  }, [summary]);

  const behaviorData = useMemo(() => {
    const counts = summary?.behaviorCounts || {};
    return Object.keys(counts)
      .map((k) => ({ key: k, name: prettyBehavior(k), value: counts[k] as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [summary]);

  const lastUpload = summary?.recent?.[0] ?? null;
  const lastBehaviors: string[] = lastUpload?.analysis?.behaviors ?? [];

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/api/uploads", form, { headers: { "Content-Type": "multipart/form-data" } });
      const created: Upload = res.data.upload;
      setItems((prev) => [created, ...prev].slice(0, 25));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Upload failed");
    } finally {
      setUploading(false);
      setFile(null);
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeading title="Dashboard" subtitle="Upload media, review reports, and track your emotion and behavior statistics." />

      <motion.form
        onSubmit={onUpload}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 shadow-glow"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full">
            <label className="block text-sm font-semibold text-white/85">Upload image or video</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
            />
            <div className="mt-2 text-xs text-white/55">For video, the ML service samples frames to keep analysis fast.</div>
          </div>
          <button
            disabled={!file || uploading}
            className="rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 px-6 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {uploading ? "Analyzing..." : "Upload & Analyze"}
          </button>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm">{error}</div> : null}
      </motion.form>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-6 shadow-glow">
          <div className="font-display text-lg font-semibold text-white">Emotion statistics</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={emotionData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} stroke="rgba(255,255,255,0.12)">
                  {emotionData.map((entry) => (
                    <Cell key={entry.name} fill={EMOTION_COLORS[entry.emotion]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}`, "uploads"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/60">
            {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
              <div key={emotion} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="capitalize">{emotion}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-6 shadow-glow">
          <div className="font-display text-lg font-semibold text-white">Behavior detection</div>
          <div className="mt-1 text-sm text-white/60">
            This chart summarizes what the model has detected across your upload history.
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={behaviorData}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" tick={{ fill: "rgba(255,255,255,0.65)" }} />
                <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fill: "rgba(255,255,255,0.65)" }} />
                <Tooltip
                  formatter={(value: any) => [`${value}`, "detections"]}
                  labelFormatter={(_label: any, payload: any) => {
                    const key = payload?.[0]?.payload?.key as string | undefined;
                    if (!key) return "Behavior";
                    return `${prettyBehavior(key)}: ${behaviorMeaning(key)}`;
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {behaviorData.map((entry) => (
                    <Cell key={entry.key} fill={behaviorColor(entry.key)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-white/55">Values are counts across your upload history (not percentages).</div>

          {lastUpload ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">Latest analysis summary</div>
                <div className="text-xs text-white/55">{new Date(lastUpload.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/75">
                <span className={`h-2 w-2 rounded-full ${emotionDotClass(lastUpload.analysis.emotion)}`} />
                <span className="capitalize">{lastUpload.analysis.emotion}</span>
                <span className="text-white/45">({Math.round(lastUpload.analysis.confidence * 100)}%)</span>
                <span className="text-white/45">·</span>
                <span className="text-white/65">{lastUpload.analysis.cognitiveState}</span>
              </div>
              <div className="mt-3 text-sm text-white/70">
                {lastBehaviors.length ? (
                  <>
                    <span className="font-semibold text-white/80">Key cues: </span>
                    {lastBehaviors.map((b) => prettyBehavior(b)).join(", ")}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-white/80">Key cues: </span>None detected
                  </>
                )}
              </div>
              {lastBehaviors.length ? (
                <div className="mt-3 text-xs text-white/60">
                  {lastBehaviors.slice(0, 2).map((b) => (
                    <div key={b}>
                      <span className="font-semibold text-white/70">{prettyBehavior(b)}:</span> {behaviorTip(b)}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4">
                <Link
                  to={`/uploads/${lastUpload._id}`}
                  className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                >
                  View full report
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-glow">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-lg font-semibold text-white">Upload history</div>
            <div className="mt-1 text-sm text-white/60">Click an item to view its analysis report.</div>
          </div>
          <div className="text-xs text-white/55">{summary?.totals?.uploads ?? 0} total uploads</div>
        </div>

        <div className="mt-4 grid gap-3">
          {items.map((u) => (
            <Link
              key={u._id}
              to={`/uploads/${u._id}`}
              className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-black/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{u.fileType}</span>
                  <div className="text-sm font-semibold text-white">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${emotionDotClass(u.analysis.emotion)}`} />
                      <span className="capitalize">{u.analysis.emotion}</span>
                    </span>{" "}
                    <span className="text-white/50">({Math.round(u.analysis.confidence * 100)}%)</span>
                  </div>
                </div>
                <div className="text-xs text-white/55">{new Date(u.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-xs text-white/60">
                Behaviors: {u.analysis.behaviors.length ? u.analysis.behaviors.join(", ") : "none detected"}
              </div>
            </Link>
          ))}
          {!items.length ? <div className="text-sm text-white/65">No uploads yet. Upload an image or video to begin.</div> : null}
        </div>
      </div>
    </div>
  );
}
