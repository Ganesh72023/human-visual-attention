from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

from .vision import MediapipeSignals


@dataclass
class LandmarkSignals:
  face_bbox: Optional[tuple[int, int, int, int]]
  face_landmarks: Optional[np.ndarray]
  hand_landmarks: list[np.ndarray]
  pose_landmarks: Optional[np.ndarray]
  prev: Optional["LandmarkSignals"]


def _min_distance(a: np.ndarray, b: np.ndarray) -> float:
    # a: (N,2), b: (M,2)
    if a.size == 0 or b.size == 0:
        return 1e9
    d = a[:, None, :] - b[None, :, :]
    dist = np.sqrt(np.sum(d * d, axis=2))
    return float(np.min(dist))


def _min_distance_to_bbox(points: np.ndarray, bbox: tuple[int, int, int, int]) -> float:
    # Minimum Euclidean distance from any point to the rectangle border (0 if inside).
    # bbox: x,y,w,h in pixels.
    if points.size == 0:
        return 1e9
    x, y, w, h = bbox
    x2 = x + w
    y2 = y + h
    px = points[:, 0]
    py = points[:, 1]

    dx = np.maximum(np.maximum(x - px, 0.0), px - x2)
    dy = np.maximum(np.maximum(y - py, 0.0), py - y2)
    return float(np.min(np.sqrt(dx * dx + dy * dy)))

def _torso_slouch_score(pose: np.ndarray) -> float:
    # Uses shoulder midpoint (11,12) and hip midpoint (23,24).
    # Returns the torso angle in degrees away from vertical.
    if pose.shape[0] <= 24:
        return 0.0
    pose_xy = pose[:, :2]
    shoulder = (pose_xy[11] + pose_xy[12]) / 2.0
    hip = (pose_xy[23] + pose_xy[24]) / 2.0
    v = shoulder - hip  # vector pointing up
    # vertical vector is (0, -1); measure angle to vertical axis
    angle = np.degrees(np.arctan2(abs(v[0]), abs(v[1]) + 1e-6))
    return float(angle)


def _ankles_visible(pose: Optional[np.ndarray], thr: float = 0.55) -> bool:
    if pose is None or pose.shape[0] <= 28 or pose.shape[1] < 3:
        return False
    vis_l = float(pose[27, 2])
    vis_r = float(pose[28, 2])
    return (vis_l >= thr) or (vis_r >= thr)


def detect_behaviors_from_landmarks(sig: MediapipeSignals) -> list[str]:
    behaviors: set[str] = set()

    face = sig.face_landmarks
    hands = sig.hand_landmarks
    pose = sig.pose_landmarks

    # Face touching heuristic: scale threshold by face size when bbox is available.
    if hands:
        if sig.face_bbox is not None:
            _, _, w, h = sig.face_bbox
            face_diag = float(np.sqrt(float(w * w + h * h)))
            thr = max(18.0, 0.08 * face_diag)
        else:
            thr = 25.0

        # Prefer landmarks when available; otherwise fall back to bbox proximity.
        for hand in hands:
            if face is not None:
                if _min_distance(face, hand) < thr:
                    behaviors.add("face_touching")
                    break
            elif sig.face_bbox is not None:
                if _min_distance_to_bbox(hand, sig.face_bbox) < thr:
                    behaviors.add("face_touching")
                    break

    # Fidgeting heuristic: hand motion between frames.
    if sig.prev is not None and sig.prev.hand_landmarks and hands:
        prev_h = sig.prev.hand_landmarks[0]
        cur_h = hands[0]
        n = min(prev_h.shape[0], cur_h.shape[0])
        delta = float(np.mean(np.linalg.norm(prev_h[:n] - cur_h[:n], axis=1)))
        if delta > 10.0:
            behaviors.add("fidgeting")

    # Leg shaking heuristic: ankle y jitter between frames.
    # MediaPipe pose landmarks index: 27/28 are left/right ankle.
    if pose is not None and sig.prev is not None and sig.prev.pose_landmarks is not None:
        prev_pose = sig.prev.pose_landmarks
        if _ankles_visible(pose) and _ankles_visible(prev_pose):
            pose_xy = pose[:, :2]
            prev_xy = prev_pose[:, :2]
            cur_y = float((pose_xy[27, 1] + pose_xy[28, 1]) / 2.0)
            prev_y = float((prev_xy[27, 1] + prev_xy[28, 1]) / 2.0)
            if abs(cur_y - prev_y) > 8.0:
                behaviors.add("leg_shaking")

    # Slouching heuristic: torso angle away from vertical.
    if pose is not None:
        angle = _torso_slouch_score(pose)
        if angle > 22.0:
            behaviors.add("slouching")

    return sorted(behaviors)


def legs_visible(sig: MediapipeSignals) -> bool:
    return _ankles_visible(sig.pose_landmarks)
