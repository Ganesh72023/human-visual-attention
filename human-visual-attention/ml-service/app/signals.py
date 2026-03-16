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

def _torso_slouch_score(pose: np.ndarray) -> float:
    # Uses shoulder midpoint (11,12) and hip midpoint (23,24).
    # Returns the torso angle in degrees away from vertical.
    if pose.shape[0] <= 24:
        return 0.0
    shoulder = (pose[11] + pose[12]) / 2.0
    hip = (pose[23] + pose[24]) / 2.0
    v = shoulder - hip  # vector pointing up
    # vertical vector is (0, -1); measure angle to vertical axis
    angle = np.degrees(np.arctan2(abs(v[0]), abs(v[1]) + 1e-6))
    return float(angle)

def detect_behaviors_from_landmarks(sig: MediapipeSignals) -> list[str]:
    behaviors: set[str] = set()

    face = sig.face_landmarks
    hands = sig.hand_landmarks
    pose = sig.pose_landmarks

    # Face touching heuristic: scale threshold by face size when bbox is available.
    if face is not None and hands:
        if sig.face_bbox is not None:
            _, _, w, h = sig.face_bbox
            face_diag = float(np.sqrt(float(w * w + h * h)))
            thr = max(18.0, 0.08 * face_diag)
        else:
            thr = 25.0
        for hand in hands:
            if _min_distance(face, hand) < thr:
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
        if pose.shape[0] > 28 and prev_pose.shape[0] > 28:
            cur_y = float((pose[27, 1] + pose[28, 1]) / 2.0)
            prev_y = float((prev_pose[27, 1] + prev_pose[28, 1]) / 2.0)
            if abs(cur_y - prev_y) > 8.0:
                behaviors.add("leg_shaking")

    # Slouching heuristic: torso angle away from vertical.
    if pose is not None:
        angle = _torso_slouch_score(pose)
        if angle > 22.0:
            behaviors.add("slouching")

    return sorted(behaviors)
