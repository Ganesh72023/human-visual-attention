from __future__ import annotations

from typing import Optional

import cv2
import numpy as np


def fallback_heatmap_png(
    bgr: np.ndarray,
    face_bbox: Optional[tuple[int, int, int, int]],
    face_landmarks: Optional[np.ndarray],
) -> Optional[bytes]:
    """
    Fallback "attention" visualization when true GradCAM is unavailable.
    It produces a heat overlay centered on salient facial regions (eyes/nose/mouth),
    cropped to the primary face bounding box.
    """
    h, w = bgr.shape[:2]
    if face_bbox is None and face_landmarks is None:
        return None

    if face_bbox is None and face_landmarks is not None and face_landmarks.size > 0:
        x0 = int(np.clip(np.min(face_landmarks[:, 0]) - 12, 0, w - 1))
        y0 = int(np.clip(np.min(face_landmarks[:, 1]) - 12, 0, h - 1))
        x1 = int(np.clip(np.max(face_landmarks[:, 0]) + 12, 1, w))
        y1 = int(np.clip(np.max(face_landmarks[:, 1]) + 12, 1, h))
        face_bbox = (x0, y0, max(1, x1 - x0), max(1, y1 - y0))

    if face_bbox is None:
        return None

    x, y, bw, bh = face_bbox
    x2 = int(np.clip(x + bw, 1, w))
    y2 = int(np.clip(y + bh, 1, h))
    x = int(np.clip(x, 0, w - 1))
    y = int(np.clip(y, 0, h - 1))
    if x2 <= x or y2 <= y:
        return None

    heat = np.zeros((h, w), dtype=np.float32)

    # Landmarks to emphasize (MediaPipe face mesh indices).
    key_ids = [1, 33, 263, 61, 291, 13, 14, 199]
    if face_landmarks is not None and face_landmarks.shape[0] > max(key_ids):
        pts = face_landmarks[key_ids, :]
        r = max(8, int(0.06 * float(np.sqrt(bw * bw + bh * bh))))
        for px, py in pts:
            cv2.circle(heat, (int(px), int(py)), r, 1.0, thickness=-1)
        heat = cv2.GaussianBlur(heat, (0, 0), sigmaX=r * 0.8, sigmaY=r * 0.8)
    else:
        # No landmarks: center blob in the face box.
        cx = int(x + bw / 2)
        cy = int(y + bh / 2)
        r = max(10, int(0.18 * min(bw, bh)))
        cv2.circle(heat, (cx, cy), r, 1.0, thickness=-1)
        heat = cv2.GaussianBlur(heat, (0, 0), sigmaX=r * 0.9, sigmaY=r * 0.9)

    m = float(np.max(heat))
    if m <= 1e-6:
        return None
    heat = heat / m
    heat_u8 = np.uint8(255 * heat)
    heat_color = cv2.applyColorMap(heat_u8, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(bgr, 0.55, heat_color, 0.45, 0)

    cropped = overlay[y:y2, x:x2]
    ok, buf = cv2.imencode(".png", cropped)
    if not ok:
        return None
    return buf.tobytes()


def _last_conv_layer_name(model) -> Optional[str]:
    # Pick the last layer that looks like a conv feature map.
    for layer in reversed(model.layers):
        shape = getattr(layer.output, "shape", None)
        if shape is not None and len(shape) == 4:
            return layer.name
    return None


def try_gradcam_emotion(face_bgr: np.ndarray) -> Optional[bytes]:
    """
    Best-effort GradCAM against DeepFace emotion model.
    Returns PNG bytes or None if unavailable.
    """
    try:
        import tensorflow as tf  # type: ignore
        from deepface import DeepFace  # type: ignore
    except Exception:
        return None

    try:
        model = DeepFace.build_model("Emotion")
        conv_name = _last_conv_layer_name(model)
        if conv_name is None:
            return None

        # DeepFace emotion model expects 48x48 grayscale in many builds; handle both paths.
        img = cv2.resize(face_bgr, (224, 224), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        x = rgb.astype(np.float32) / 255.0
        x = np.expand_dims(x, axis=0)

        grad_model = tf.keras.models.Model([model.inputs], [model.get_layer(conv_name).output, model.output])

        with tf.GradientTape() as tape:
            conv_out, preds = grad_model(x)
            class_idx = tf.argmax(preds[0])
            loss = preds[:, class_idx]

        grads = tape.gradient(loss, conv_out)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_out = conv_out[0]
        heatmap = tf.reduce_sum(tf.multiply(pooled_grads, conv_out), axis=-1)
        heatmap = tf.maximum(heatmap, 0) / (tf.reduce_max(heatmap) + 1e-8)
        heatmap_np = heatmap.numpy()

        heatmap_np = cv2.resize(heatmap_np, (img.shape[1], img.shape[0]))
        heatmap_color = cv2.applyColorMap(np.uint8(255 * heatmap_np), cv2.COLORMAP_JET)
        overlay = cv2.addWeighted(img, 0.55, heatmap_color, 0.45, 0)

        ok, buf = cv2.imencode(".png", overlay)
        if not ok:
            return None
        return buf.tobytes()
    except Exception:
        return None
