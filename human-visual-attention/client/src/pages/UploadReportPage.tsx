import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SectionHeading } from "../components/SectionHeading";
import { api } from "../lib/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { EMOTION_COLORS, coerceEmotion, emotionDotClass } from "../lib/emotion";
import { behaviorMeaning, behaviorTip, prettyBehavior } from "../lib/behaviors";

export function UploadReportPage() {
  const { id } = useParams();
  const [upload, setUpload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/api/uploads/${id}`)
      .then((res) => setUpload(res.data.upload))
      .catch((err) => setError(err?.response?.data?.error?.message || "Failed to load report"));
  }, [id]);

  const timelineData = useMemo(() => {
    const tl = upload?.analysis?.timeline || [];
    return tl.map((p: any) => ({ tSec: Number(p.tSec.toFixed(1)), confidence: p.confidence, emotion: p.emotion }));
  }, [upload]);

  if (error) {
    return (
      <div className="glass rounded-3xl p-6 shadow-glow">
        <div className="text-sm text-red-200">{error}</div>
        <Link className="mt-4 inline-block text-sm font-semibold text-white/75 hover:text-white" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!upload) return <div className="text-white/70">Loading report...</div>;

  const heatmap = upload.analysis.heatmap?.base64 ? `data:image/png;base64,${upload.analysis.heatmap.base64}` : null;

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Analysis report"
        subtitle={`Cognitive state: ${upload.analysis.cognitiveState}.`}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-6 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-display text-lg font-semibold text-white">Emotion</div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              {upload.fileType}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${emotionDotClass(upload.analysis.emotion)}`} />
            <div className="text-sm font-semibold text-white capitalize">{upload.analysis.emotion}</div>
            <div className="text-sm text-white/55">{Math.round(upload.analysis.confidence * 100)}%</div>
          </div>

          <div className="mt-6 font-display text-lg font-semibold text-white">Detected behaviors</div>
          <div className="mt-3 text-sm text-white/70">
            {upload.analysis.behaviors.length ? upload.analysis.behaviors.map((b: string) => prettyBehavior(b)).join(", ") : "None detected"}
          </div>
          {upload.analysis.behaviors.length ? (
            <div className="mt-4 space-y-2 text-xs text-white/60">
              {upload.analysis.behaviors.slice(0, 3).map((b: string) => (
                <div key={b}>
                  <span className="font-semibold text-white/70">{prettyBehavior(b)}:</span> {behaviorMeaning(b)}{" "}
                  <span className="text-white/45">Tip: {behaviorTip(b)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-6 font-display text-lg font-semibold text-white">Suggestions</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">
            {upload.analysis.suggestions.map((s: string, idx: number) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-3xl p-6 shadow-glow">
          <div className="font-display text-lg font-semibold text-white">Attention heatmap</div>
          <div className="mt-3 text-sm text-white/60">Best-effort GradCAM-style overlay over the primary face region.</div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            {heatmap ? (
              <img src={heatmap} alt="Attention heatmap" className="h-auto w-full" />
            ) : (
              <div className="p-6 text-sm text-white/60">Heatmap unavailable for this upload.</div>
            )}
          </div>
        </div>
      </div>

      {upload.fileType === "video" ? (
        <div className="glass rounded-3xl p-6 shadow-glow">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-display text-lg font-semibold text-white">Emotion timeline</div>
              <div className="mt-1 text-sm text-white/60">Emotion confidence over sampled frames.</div>
            </div>
            <div className="text-xs text-white/55">{timelineData.length} points</div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <XAxis dataKey="tSec" stroke="rgba(255,255,255,0.35)" tick={{ fill: "rgba(255,255,255,0.65)" }} />
                <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fill: "rgba(255,255,255,0.65)" }} domain={[0, 1]} />
                <Tooltip
                  formatter={(value: any) => [`${Math.round(Number(value) * 100)}%`, "confidence"]}
                  labelFormatter={(label: any, payload: any) => {
                    const emo = payload?.[0]?.payload?.emotion;
                    return emo ? `t=${label}s (${emo})` : `t=${label}s`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="rgba(251,191,36,0.95)"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const e = coerceEmotion(props.payload?.emotion);
                    const fill = EMOTION_COLORS[e];
                    return <circle cx={props.cx} cy={props.cy} r={2.2} fill={fill} opacity={0.95} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-white/55">Hover a point to see time and emotion label.</div>
        </div>
      ) : null}

      <Link className="inline-block text-sm font-semibold text-white/75 hover:text-white" to="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}
