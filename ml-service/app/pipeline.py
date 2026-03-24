from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any, Optional
import time

import cv2
import numpy as np

from .signals import detect_behaviors_from_landmarks, legs_visible
from .vision import (
    create_mediapipe_context,
    deepface_emotion_on_bgr,
    map_emotion_to_5,
    mediapipe_signals_on_bgr,
)
from .gradcam import fallback_heatmap_png, try_gradcam_emotion


def _safe_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


@dataclass
class TimelinePoint:
    tSec: float
    emotion: str
    confidence: float


def analyze_image_file(path: str) -> dict[str, Any]:
    bgr = cv2.imread(path)
    if bgr is None:
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "behaviors": [],
            "cognitiveState": "Neutral / baseline",
            "heatmap": None,
        }

    emotion_raw = deepface_emotion_on_bgr(bgr)
    emotion_5 = map_emotion_to_5(emotion_raw.dominant_emotion)

    signals = mediapipe_signals_on_bgr(bgr)
    behaviors = detect_behaviors_from_landmarks(signals)

    heatmap_b64: Optional[str] = None
    bbox = signals.face_bbox
    if bbox is None and signals.face_landmarks is not None and signals.face_landmarks.size > 0:
        h_img, w_img = bgr.shape[:2]
        x0 = int(np.clip(np.min(signals.face_landmarks[:, 0]) - 12, 0, w_img - 1))
        y0 = int(np.clip(np.min(signals.face_landmarks[:, 1]) - 12, 0, h_img - 1))
        x1 = int(np.clip(np.max(signals.face_landmarks[:, 0]) + 12, 1, w_img))
        y1 = int(np.clip(np.max(signals.face_landmarks[:, 1]) + 12, 1, h_img))
        bbox = (x0, y0, max(1, x1 - x0), max(1, y1 - y0))

    hm: Optional[bytes] = None
    if bbox is not None:
        x, y, bw, bh = bbox
        x2 = min(bgr.shape[1], x + bw)
        y2 = min(bgr.shape[0], y + bh)
        face_bgr = bgr[y:y2, x:x2]
        if face_bgr.size != 0:
            hm = try_gradcam_emotion(face_bgr)
    if hm is None:
        hm = fallback_heatmap_png(bgr, bbox, signals.face_landmarks)
    if hm is not None:
        heatmap_b64 = base64.b64encode(hm).decode("ascii")

    confidence = _safe_float(emotion_raw.confidence, 0.0)
    return {
        "emotion": emotion_5,
        "confidence": confidence,
        "behaviors": behaviors,
        "cognitiveState": "ML baseline (server will override)",
        "heatmap": {"mimeType": "image/png", "base64": heatmap_b64} if heatmap_b64 else None,
    }


def analyze_video_file(path: str, max_frames: int = 18, frame_stride: int = 10) -> dict[str, Any]:
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "behaviors": [],
            "cognitiveState": "Neutral / baseline",
            "timeline": [],
            "heatmap": None,
        }

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    # Keep video analysis bounded so the ML service doesn't get killed and the backend doesn't hang.
    # This is especially important in Docker/Render where CPU/RAM are limited.
    time_budget_sec = 25.0
    started = time.monotonic()

    timeline: list[TimelinePoint] = []
    all_behaviors: set[str] = set()
    last_signals: Optional[Any] = None
    legs_visible_frames = 0
    sampled = 0

    emotions_for_majority: list[str] = []
    confidences_for_majority: list[float] = []

    ctx = create_mediapipe_context(video_mode=True, with_face_mesh=False)
    try:
        # Prefer random-access frame sampling (dramatically reduces decoding work) when frame count is known.
        if total_frames > 0:
            target = int(min(max_frames, total_frames))
            indices = np.linspace(0, max(0, total_frames - 1), num=target, dtype=np.int64)
            indices = np.unique(indices)
            indices.sort()

            for idx in indices.tolist():
                if sampled >= max_frames:
                    break
                if (time.monotonic() - started) >= time_budget_sec:
                    break

                try:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
                    ok, frame = cap.read()
                    if not ok or frame is None:
                        continue

                    t_sec = float(idx) / float(fps)

                    # Get landmarks first (cheap-ish with reuse) so we can crop the face for DeepFace.
                    signals = mediapipe_signals_on_bgr(frame, with_face_mesh=False, ctx=ctx, video_mode=True)
                    if last_signals is not None:
                        signals = signals.with_prev(last_signals)
                    last_signals = signals

                    # Emotion: if we don't detect a face bbox, skip DeepFace for this frame (saves a lot of CPU).
                    emo_frame = None
                    if signals.face_bbox is not None:
                        x, y, bw, bh = signals.face_bbox
                        pad = int(max(8, 0.08 * max(bw, bh)))
                        x0 = max(0, x - pad)
                        y0 = max(0, y - pad)
                        x1 = min(frame.shape[1], x + bw + pad)
                        y1 = min(frame.shape[0], y + bh + pad)
                        crop = frame[y0:y1, x0:x1]
                        if crop.size != 0:
                            emo_frame = crop
                    if emo_frame is None:
                        emotion_raw = None
                        emotion_5 = "neutral"
                        conf = 0.0
                    else:
                        emotion_raw = deepface_emotion_on_bgr(emo_frame)
                        emotion_5 = map_emotion_to_5(emotion_raw.dominant_emotion)
                        conf = float(emotion_raw.confidence)

                    timeline.append(TimelinePoint(tSec=t_sec, emotion=emotion_5, confidence=conf))
                    emotions_for_majority.append(emotion_5)
                    confidences_for_majority.append(conf)

                    for b in detect_behaviors_from_landmarks(signals):
                        all_behaviors.add(b)
                    if legs_visible(signals):
                        legs_visible_frames += 1

                    sampled += 1
                except Exception:
                    # Never crash the whole analysis due to a single bad frame.
                    continue
        else:
            frame_index = 0
            while sampled < max_frames:
                if (time.monotonic() - started) >= time_budget_sec:
                    break

                ok, frame = cap.read()
                if not ok:
                    break
                if frame_index % frame_stride != 0:
                    frame_index += 1
                    continue

                try:
                    t_sec = float(frame_index) / float(fps)

                    signals = mediapipe_signals_on_bgr(frame, with_face_mesh=False, ctx=ctx, video_mode=True)
                    if last_signals is not None:
                        signals = signals.with_prev(last_signals)
                    last_signals = signals

                    emo_frame = None
                    if signals.face_bbox is not None:
                        x, y, bw, bh = signals.face_bbox
                        pad = int(max(8, 0.08 * max(bw, bh)))
                        x0 = max(0, x - pad)
                        y0 = max(0, y - pad)
                        x1 = min(frame.shape[1], x + bw + pad)
                        y1 = min(frame.shape[0], y + bh + pad)
                        crop = frame[y0:y1, x0:x1]
                        if crop.size != 0:
                            emo_frame = crop

                    if emo_frame is None:
                        emotion_5 = "neutral"
                        conf = 0.0
                    else:
                        emotion_raw = deepface_emotion_on_bgr(emo_frame)
                        emotion_5 = map_emotion_to_5(emotion_raw.dominant_emotion)
                        conf = float(emotion_raw.confidence)

                    timeline.append(TimelinePoint(tSec=t_sec, emotion=emotion_5, confidence=conf))
                    emotions_for_majority.append(emotion_5)
                    confidences_for_majority.append(conf)

                    for b in detect_behaviors_from_landmarks(signals):
                        all_behaviors.add(b)
                    if legs_visible(signals):
                        legs_visible_frames += 1

                    sampled += 1
                except Exception:
                    pass

                frame_index += 1
    finally:
        cap.release()
        ctx.close()

    if emotions_for_majority:
        # majority vote
        unique, counts = np.unique(np.array(emotions_for_majority), return_counts=True)
        majority = str(unique[int(np.argmax(counts))])
        confidence = float(np.mean(np.array(confidences_for_majority, dtype=np.float32)))
    else:
        majority = "neutral"
        confidence = 0.0

    # If we rarely/never see ankles, explicitly tell the caller so UI can explain limitations.
    if sampled > 0:
        visible_ratio = float(legs_visible_frames) / float(sampled)
        if visible_ratio < 0.25:
            all_behaviors.add("legs_not_visible")

    return {
        "emotion": majority,
        "confidence": confidence,
        "behaviors": sorted(all_behaviors),
        "cognitiveState": "ML baseline (server will override)",
        "timeline": [tp.__dict__ for tp in timeline],
        "heatmap": None,
    }
