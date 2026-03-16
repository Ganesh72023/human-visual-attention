import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { loadEnv } from "../config/env";
import { Upload } from "../models/Upload";
import { analyzeWithMlService } from "../services/mlClient";
import { deriveCognitiveState, generateSuggestions } from "../services/suggestions";

export const uploadsRouter = Router();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const env = loadEnv();
ensureDir(env.UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userDir = path.join(env.UPLOAD_DIR, req.auth!.id);
    ensureDir(userDir);
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});

function fileTypeFromMimetype(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

function normalizeConfidence(raw: unknown): number {
  let v = Number(raw);
  if (!Number.isFinite(v)) return 0;
  if (v > 1) v = v / 100;
  if (v < 0) v = 0;
  if (v > 1) v = 1;
  return v;
}

const upload = multer({
  storage,
  limits: {
    fileSize: Math.max(env.MAX_IMAGE_MB, env.MAX_VIDEO_MB) * 1024 * 1024
  }
});

uploadsRouter.post("/", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing file" } });

  const fileType = fileTypeFromMimetype(req.file.mimetype);
  if (!fileType) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Unsupported file type" } });

  const maxMb = fileType === "image" ? env.MAX_IMAGE_MB : env.MAX_VIDEO_MB;
  if (req.file.size > maxMb * 1024 * 1024) {
    return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "File too large" } });
  }

  const ml = await analyzeWithMlService(req.file.path, fileType);

  const cognitiveState = deriveCognitiveState(ml.emotion, ml.behaviors);
  const suggestions = generateSuggestions(ml.emotion, ml.behaviors);

  const normalizedTimeline = ml.timeline?.map((p) => ({
    ...p,
    confidence: normalizeConfidence((p as any).confidence),
  }));

  const created = await Upload.create({
    userId: req.auth!.id,
    fileType,
    filePath: req.file.path,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    analysis: {
      emotion: ml.emotion,
      confidence: normalizeConfidence(ml.confidence),
      behaviors: ml.behaviors,
      cognitiveState,
      suggestions,
      timeline: normalizedTimeline,
      heatmap: ml.heatmap ?? null
    }
  });

  return res.json({ upload: created });
});

uploadsRouter.get("/", requireAuth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10) || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Upload.find({ userId: req.auth!.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Upload.countDocuments({ userId: req.auth!.id })
  ]);

  return res.json({ items, page, limit, total });
});

uploadsRouter.get("/:id", requireAuth, async (req, res) => {
  const uploadDoc = await Upload.findById(req.params.id);
  if (!uploadDoc) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Upload not found" } });

  if (req.auth!.role !== "admin" && uploadDoc.userId.toString() !== req.auth!.id) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not allowed" } });
  }

  return res.json({ upload: uploadDoc });
});
