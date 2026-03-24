import os
import tempfile
from typing import Literal, Optional, Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .pipeline import analyze_image_file, analyze_video_file

FileType = Literal["image", "video"]

app = FastAPI(title="Human Visual Attention Analyzer ML Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    fileType: FileType = Form(...),
    maxFrames: Optional[int] = Form(None),
    frameStride: Optional[int] = Form(None),
) -> dict[str, Any]:
    # Save to a temp file so downstream libs can open it reliably.
    suffix = os.path.splitext(file.filename or "")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        # Important for videos: don't read the entire file into memory.
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB
            if not chunk:
                break
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        if fileType == "image":
            result = analyze_image_file(tmp_path)
        else:
            result = analyze_video_file(
                tmp_path,
                max_frames=maxFrames if maxFrames is not None else 18,
                frame_stride=frameStride if frameStride is not None else 10,
            )
        return result
    except Exception:
        # Best-effort behavior: never hard-fail the caller; return a neutral baseline.
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "behaviors": [],
            "cognitiveState": "Neutral / baseline",
            "timeline": [] if fileType == "video" else None,
            "heatmap": None,
        }
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
