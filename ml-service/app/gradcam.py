from __future__ import annotations

from typing import Optional

import cv2
import numpy as np


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

