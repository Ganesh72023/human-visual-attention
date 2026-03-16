"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const env_1 = require("../config/env");
const Upload_1 = require("../models/Upload");
const mlClient_1 = require("../services/mlClient");
const suggestions_1 = require("../services/suggestions");
exports.uploadsRouter = (0, express_1.Router)();
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
}
const env = (0, env_1.loadEnv)();
ensureDir(env.UPLOAD_DIR);
const storage = multer_1.default.diskStorage({
    destination: (req, _file, cb) => {
        const userDir = path_1.default.join(env.UPLOAD_DIR, req.auth.id);
        ensureDir(userDir);
        cb(null, userDir);
    },
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}_${safe}`);
    }
});
function fileTypeFromMimetype(mime) {
    if (mime.startsWith("image/"))
        return "image";
    if (mime.startsWith("video/"))
        return "video";
    return null;
}
function normalizeConfidence(raw) {
    let v = Number(raw);
    if (!Number.isFinite(v))
        return 0;
    if (v > 1)
        v = v / 100;
    if (v < 0)
        v = 0;
    if (v > 1)
        v = 1;
    return v;
}
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: Math.max(env.MAX_IMAGE_MB, env.MAX_VIDEO_MB) * 1024 * 1024
    }
});
exports.uploadsRouter.post("/", auth_1.requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing file" } });
    const fileType = fileTypeFromMimetype(req.file.mimetype);
    if (!fileType)
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Unsupported file type" } });
    const maxMb = fileType === "image" ? env.MAX_IMAGE_MB : env.MAX_VIDEO_MB;
    if (req.file.size > maxMb * 1024 * 1024) {
        return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "File too large" } });
    }
    const ml = await (0, mlClient_1.analyzeWithMlService)(req.file.path, fileType);
    const cognitiveState = (0, suggestions_1.deriveCognitiveState)(ml.emotion, ml.behaviors);
    const suggestions = (0, suggestions_1.generateSuggestions)(ml.emotion, ml.behaviors);
    const normalizedTimeline = ml.timeline?.map((p) => ({
        ...p,
        confidence: normalizeConfidence(p.confidence),
    }));
    const created = await Upload_1.Upload.create({
        userId: req.auth.id,
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
exports.uploadsRouter.get("/", auth_1.requireAuth, async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10) || 10));
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Upload_1.Upload.find({ userId: req.auth.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Upload_1.Upload.countDocuments({ userId: req.auth.id })
    ]);
    return res.json({ items, page, limit, total });
});
exports.uploadsRouter.get("/:id", auth_1.requireAuth, async (req, res) => {
    const uploadDoc = await Upload_1.Upload.findById(req.params.id);
    if (!uploadDoc)
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Upload not found" } });
    if (req.auth.role !== "admin" && uploadDoc.userId.toString() !== req.auth.id) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not allowed" } });
    }
    return res.json({ upload: uploadDoc });
});
