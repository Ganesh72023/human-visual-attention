import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SectionHeading } from "../components/SectionHeading";
import { useAuth } from "../context/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.6 } }),
};

export function LandingPage() {
  const auth = useAuth();

  return (
    <div className="grid items-start gap-10 md:grid-cols-2 md:gap-8">
      <div>
        <SectionHeading
          eyebrow="Cognitive Science + Computer Vision"
          title="Human Visual Attention Analyzer"
          subtitle="Upload an image or video and get an attention and emotion report. The system translates observable signals into cognitive-science grounded suggestions for calmer, clearer focus."
        />

        <motion.div initial="hidden" animate="show" className="space-y-4">
          <motion.p custom={1} variants={fadeUp} className="text-white/70">
            We estimate emotional state and attention-relevant behaviors (fidgeting, face touching, leg shaking) using
            face emotion inference, pose tracking, and temporal cues. Then we generate practical interventions to reduce
            cognitive load and support self-regulation.
          </motion.p>
          <motion.div custom={2} variants={fadeUp} className="glass rounded-3xl p-5 shadow-glow">
            <div className="font-display text-lg font-semibold text-white">What you get</div>
            <div className="mt-2 grid gap-3 text-sm text-white/70">
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                <div>Emotion label + confidence, and (for video) an emotion timeline.</div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-amber-300" />
                <div>Behavior detections mapped to cognitive state and actionable suggestions.</div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-cyan-200" />
                <div>Best-effort attention heatmap (GradCAM-style) over the primary face region.</div>
              </div>
            </div>
          </motion.div>

          <motion.div custom={3} variants={fadeUp} className="flex flex-wrap gap-3">
            {auth.user ? (
              <Link
                to="/dashboard"
                className="rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 px-5 py-2.5 text-sm font-semibold text-black hover:opacity-95"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 px-5 py-2.5 text-sm font-semibold text-black hover:opacity-95"
                >
                  Get started
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10"
                >
                  I already have an account
                </Link>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-glow">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
        >
          <div className="font-display text-xl font-semibold text-white">How it works</div>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-white/85">1) Perception</div>
              <div className="mt-1">Faces, posture, and hands are detected to derive attention-relevant signals.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-white/85">2) Inference</div>
              <div className="mt-1">Emotion is estimated and aggregated over time for video timelines.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-white/85">3) Interpretation</div>
              <div className="mt-1">A cognitive state is derived and translated into suggestions you can try right now.</div>
            </div>
          </div>
          <div className="mt-6 text-xs text-white/55">
            Note: This is not a medical device. It provides supportive suggestions, not diagnosis.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
