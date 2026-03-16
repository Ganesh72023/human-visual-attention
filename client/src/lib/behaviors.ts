export type BehaviorKey = "face_touching" | "leg_shaking" | "fidgeting" | "slouching" | "legs_not_visible";

export const BEHAVIOR_META: Record<
  BehaviorKey,
  {
    label: string;
    color: string;
    meaning: string;
    userTip: string;
  }
> = {
  face_touching: {
    label: "Face touching",
    color: "rgba(251,191,36,0.9)",
    meaning: "Often a self-soothing cue. It can correlate with stress or uncertainty, especially during demanding tasks.",
    userTip: "Try grounding through posture and a slow exhale. Reduce task complexity for 2 minutes.",
  },
  leg_shaking: {
    label: "Leg shaking",
    color: "rgba(52,211,153,0.9)",
    meaning: "Restlessness or arousal. It can show up when attention is overloaded or when you're anticipating an outcome.",
    userTip: "Stand up briefly or do a 30 second reset. Then return with one clear next step.",
  },
  fidgeting: {
    label: "Fidgeting",
    color: "rgba(56,189,248,0.9)",
    meaning: "High motor activity can indicate restless attention or difficulty maintaining sustained focus.",
    userTip: "Reduce distractions and switch to a shorter focus block (5-10 minutes).",
  },
  slouching: {
    label: "Slouching",
    color: "rgba(244,63,94,0.85)",
    meaning: "A fatigued or disengaged posture can reduce alertness and increase perceived effort.",
    userTip: "Reset ergonomics: sit tall, shoulders relaxed, screen at eye level. Take a sip of water.",
  },
  legs_not_visible: {
    label: "Legs not visible",
    color: "rgba(163,163,163,0.85)",
    meaning: "Lower body is mostly out of frame. Leg-based cues (like leg shaking) may be unavailable or unreliable.",
    userTip: "If you want leg-behavior analysis, re-record with ankles/knees visible in frame.",
  },
};

export function prettyBehavior(key: string) {
  const k = key as BehaviorKey;
  return BEHAVIOR_META[k]?.label ?? key.replaceAll("_", " ");
}

export function behaviorColor(key: string) {
  const k = key as BehaviorKey;
  return BEHAVIOR_META[k]?.color ?? "rgba(163,163,163,0.85)";
}

export function behaviorMeaning(key: string) {
  const k = key as BehaviorKey;
  return BEHAVIOR_META[k]?.meaning ?? "Behavior cue detected.";
}

export function behaviorTip(key: string) {
  const k = key as BehaviorKey;
  return BEHAVIOR_META[k]?.userTip ?? "Try a short pause and a single clear next step.";
}
