export type EmotionLabel = "happy" | "sad" | "angry" | "neutral" | "nervous";

export const EMOTION_COLORS: Record<EmotionLabel, string> = {
  happy: "#FBBF24",
  sad: "#60A5FA",
  angry: "#F87171",
  neutral: "#A3A3A3",
  nervous: "#34D399",
};

export function coerceEmotion(value: string): EmotionLabel {
  const v = (value || "").toLowerCase().trim();
  if (v === "happy" || v === "sad" || v === "angry" || v === "neutral" || v === "nervous") return v;
  return "neutral";
}

export function emotionDotClass(emotion: string) {
  const e = coerceEmotion(emotion);
  if (e === "happy") return "bg-amber-300";
  if (e === "sad") return "bg-sky-300";
  if (e === "angry") return "bg-rose-300";
  if (e === "nervous") return "bg-emerald-300";
  return "bg-zinc-300";
}

