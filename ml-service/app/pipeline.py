from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any, Optional

import cv2
import numpy as np

from .signals import detect_behaviors_from_landmarks
from .vision import (
    deepface_emotion_on_bgr,
    extract_primary_face_bgr,
    map_emotion_to_5,
    mediapipe_signals_on_bgr,
)
from .gradcam import try_gradcam_emotion


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
    face_bgr = extract_primary_face_bgr(bgr)
    if face_bgr is not None:
        hm = try_gradcam_emotion(face_bgr)
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


def analyze_video_file(path: str, max_frames: int = 60, frame_stride: int = 10) -> dict[str, Any]:
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
    frame_index = 0
    sampled = 0

    timeline: list[TimelinePoint] = []
    all_behaviors: set[str] = set()
    last_signals: Optional[Any] = None

    emotions_for_majority: list[str] = []
    confidences_for_majority: list[float] = []

    try:
        while sampled < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_index % frame_stride != 0:
                frame_index += 1
                continue

            t_sec = float(frame_index) / float(fps)

            emotion_raw = deepface_emotion_on_bgr(frame)
            emotion_5 = map_emotion_to_5(emotion_raw.dominant_emotion)
            conf = float(emotion_raw.confidence)

            timeline.append(TimelinePoint(tSec=t_sec, emotion=emotion_5, confidence=conf))
            emotions_for_majority.append(emotion_5)
            confidences_for_majority.append(conf)

            signals = mediapipe_signals_on_bgr(frame)
            if last_signals is not None:
                signals = signals.with_prev(last_signals)
            last_signals = signals

            for b in detect_behaviors_from_landmarks(signals):
                all_behaviors.add(b)

            sampled += 1
            frame_index += 1
    finally:
        cap.release()

    if emotions_for_majority:
        # majority vote
        unique, counts = np.unique(np.array(emotions_for_majority), return_counts=True)
        majority = str(unique[int(np.argmax(counts))])
        confidence = float(np.mean(np.array(confidences_for_majority, dtype=np.float32)))
    else:
        majority = "neutral"
        confidence = 0.0

    return {
        "emotion": majority,
        "confidence": confidence,
        "behaviors": sorted(all_behaviors),
        "cognitiveState": "ML baseline (server will override)",
        "timeline": [tp.__dict__ for tp in timeline],
        "heatmap": None,
    }
