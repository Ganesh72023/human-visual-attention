from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Any

import cv2
import numpy as np


@dataclass
class EmotionResult:
    dominant_emotion: str
    confidence: float


@dataclass
class MediapipeSignals:
    face_bbox: Optional[tuple[int, int, int, int]]  # x, y, w, h
    face_landmarks: Optional[np.ndarray]  # (N,2) in pixels
    hand_landmarks: list[np.ndarray]  # list of (N,2) in pixels
    pose_landmarks: Optional[np.ndarray]  # (N,3) in pixels: x,y,visibility
    prev: Optional["MediapipeSignals"] = None

    def with_prev(self, prev: "MediapipeSignals") -> "MediapipeSignals":
        self.prev = prev
        return self


@dataclass
class MediapipeContext:
    face_det: Any
    face_mesh: Optional[Any]
    hands: Any
    pose: Any

    def close(self) -> None:
        # MediaPipe Solutions expose close() in addition to context-manager semantics.
        try:
            self.face_det.close()
        except Exception:
            pass
        try:
            if self.face_mesh is not None:
                self.face_mesh.close()
        except Exception:
            pass
        try:
            self.hands.close()
        except Exception:
            pass
        try:
            self.pose.close()
        except Exception:
            pass


def create_mediapipe_context(*, video_mode: bool, with_face_mesh: bool) -> MediapipeContext:
    import mediapipe as mp  # type: ignore

    face_det = mp.solutions.face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
    face_mesh = None
    if with_face_mesh:
        # FaceMesh is expensive; keep it off for video processing by default.
        face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=not video_mode,
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5,
        )
    hands = mp.solutions.hands.Hands(
        static_image_mode=not video_mode,
        max_num_hands=2,
        min_detection_confidence=0.5,
    )
    pose = mp.solutions.pose.Pose(
        static_image_mode=not video_mode,
        model_complexity=1,
        min_detection_confidence=0.5,
    )
    return MediapipeContext(face_det=face_det, face_mesh=face_mesh, hands=hands, pose=pose)


def map_emotion_to_5(label: str) -> str:
    l = (label or "").lower().strip()
    if l in ("happy",):
        return "happy"
    if l in ("sad",):
        return "sad"
    if l in ("angry",):
        return "angry"
    if l in ("neutral",):
        return "neutral"
    if l in ("fear", "surprise", "disgust"):
        return "nervous"
    return "nervous" if l else "neutral"


def deepface_emotion_on_bgr(bgr: np.ndarray) -> EmotionResult:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    try:
        # Lazy import because deepface/tf are heavy, and may fail depending on runtime deps.
        from deepface import DeepFace  # type: ignore

        analysis = DeepFace.analyze(rgb, actions=["emotion"], enforce_detection=False)
        if isinstance(analysis, list) and analysis:
            analysis = analysis[0]
        dominant = str(analysis.get("dominant_emotion", "neutral"))
        emo_map: Any = analysis.get("emotion") or {}
        conf = float(emo_map.get(dominant, 0.0)) / 100.0
        return EmotionResult(dominant_emotion=dominant, confidence=conf)
    except Exception:
        return EmotionResult(dominant_emotion="neutral", confidence=0.0)


def mediapipe_signals_on_bgr(
    bgr: np.ndarray,
    *,
    with_face_mesh: bool = True,
    ctx: Optional[MediapipeContext] = None,
    video_mode: bool = False,
) -> MediapipeSignals:
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    face_bbox: Optional[tuple[int, int, int, int]] = None
    face_lm: Optional[np.ndarray] = None
    hands_lm: list[np.ndarray] = []
    pose_lm: Optional[np.ndarray] = None

    local_ctx: Optional[MediapipeContext] = None
    try:
        if ctx is None:
            local_ctx = create_mediapipe_context(video_mode=video_mode, with_face_mesh=with_face_mesh)
            ctx = local_ctx

        # Face detection (bbox)
        det = ctx.face_det.process(rgb)
        if det.detections:
            rel = det.detections[0].location_data.relative_bounding_box
            x = int(rel.xmin * w)
            y = int(rel.ymin * h)
            bw = int(rel.width * w)
            bh = int(rel.height * h)
            face_bbox = (max(0, x), max(0, y), max(1, bw), max(1, bh))

        # Face landmarks are expensive; we can skip them for video and rely on bbox for face-touching.
        if with_face_mesh and ctx.face_mesh is not None:
            out = ctx.face_mesh.process(rgb)
            if out.multi_face_landmarks:
                pts = []
                for lm in out.multi_face_landmarks[0].landmark:
                    pts.append([lm.x * w, lm.y * h])
                face_lm = np.array(pts, dtype=np.float32)

        # Hands
        out = ctx.hands.process(rgb)
        if out.multi_hand_landmarks:
            for hand in out.multi_hand_landmarks:
                pts = []
                for lm in hand.landmark:
                    pts.append([lm.x * w, lm.y * h])
                hands_lm.append(np.array(pts, dtype=np.float32))

        # Pose
        out = ctx.pose.process(rgb)
        if out.pose_landmarks:
            pts = []
            for lm in out.pose_landmarks.landmark:
                pts.append([lm.x * w, lm.y * h, float(getattr(lm, "visibility", 0.0))])
            pose_lm = np.array(pts, dtype=np.float32)
    finally:
        if local_ctx is not None:
            local_ctx.close()

    return MediapipeSignals(face_bbox=face_bbox, face_landmarks=face_lm, hand_landmarks=hands_lm, pose_landmarks=pose_lm)


def extract_primary_face_bgr(bgr: np.ndarray) -> Optional[np.ndarray]:
    sig = mediapipe_signals_on_bgr(bgr)
    bbox = sig.face_bbox
    if bbox is None and sig.face_landmarks is not None and sig.face_landmarks.size > 0:
        h_img, w_img = bgr.shape[:2]
        x0 = int(np.clip(np.min(sig.face_landmarks[:, 0]) - 12, 0, w_img - 1))
        y0 = int(np.clip(np.min(sig.face_landmarks[:, 1]) - 12, 0, h_img - 1))
        x1 = int(np.clip(np.max(sig.face_landmarks[:, 0]) + 12, 1, w_img))
        y1 = int(np.clip(np.max(sig.face_landmarks[:, 1]) + 12, 1, h_img))
        bbox = (x0, y0, max(1, x1 - x0), max(1, y1 - y0))
    if bbox is None:
        return None

    x, y, w, h = bbox
    x2 = min(bgr.shape[1], x + w)
    y2 = min(bgr.shape[0], y + h)
    face = bgr[y:y2, x:x2]
    if face.size == 0:
        return None
    return face
