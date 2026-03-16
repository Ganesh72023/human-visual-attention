"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveCognitiveState = deriveCognitiveState;
exports.generateSuggestions = generateSuggestions;
function deriveCognitiveState(emotion, behaviors) {
    if (emotion === "nervous")
        return "Heightened arousal / anxiety";
    if (emotion === "angry")
        return "Frustration / threat response";
    if (emotion === "sad")
        return "Low mood / withdrawal";
    if (emotion === "happy")
        return "Positive affect / engagement";
    if (behaviors.includes("fidgeting"))
        return "Restless attention";
    return "Neutral / baseline";
}
function generateSuggestions(emotion, behaviors) {
    const suggestions = new Set();
    if (emotion === "nervous" || behaviors.includes("face_touching")) {
        suggestions.add("Try deep breathing (4-7-8 or box breathing).");
        suggestions.add("Reduce cognitive load: simplify the task into smaller steps.");
        suggestions.add("Take a short break (2-5 minutes) and reset attention.");
        suggestions.add("Practice grounding techniques (5-4-3-2-1).");
    }
    if (emotion === "angry" || behaviors.includes("fidgeting")) {
        suggestions.add("Pause and label the feeling to reduce reactivity.");
        suggestions.add("Reduce external distractions and lower stimulation.");
        suggestions.add("Try a short walk or light movement to discharge tension.");
    }
    if (emotion === "sad") {
        suggestions.add("Try a brief mood-lift: sunlight, hydration, or a short walk.");
        suggestions.add("Reach out to someone supportive if you can.");
        suggestions.add("Switch to a low-effort task to rebuild momentum.");
    }
    if (emotion === "neutral") {
        suggestions.add("Use micro-breaks (20-30 seconds) to sustain attention.");
        suggestions.add("Maintain a comfortable posture and ergonomic setup.");
    }
    if (emotion === "happy") {
        suggestions.add("Sustain focus with a single clear goal for the next 10 minutes.");
        suggestions.add("Avoid multitasking; protect the current flow state.");
    }
    if (behaviors.includes("leg_shaking")) {
        suggestions.add("Try grounding through posture: feet flat, slow exhale.");
    }
    return Array.from(suggestions);
}
