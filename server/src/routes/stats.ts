import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { Upload } from "../models/Upload";

export const statsRouter = Router();

statsRouter.get("/summary", requireAuth, async (req, res) => {
  const uploads = await Upload.find({ userId: req.auth!.id }).select("analysis createdAt fileType");

  const emotionCounts: Record<string, number> = {};
  const behaviorCounts: Record<string, number> = {};
  const lastUploads = uploads
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  for (const u of uploads) {
    const e = u.analysis.emotion;
    emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    for (const b of u.analysis.behaviors) behaviorCounts[b] = (behaviorCounts[b] || 0) + 1;
  }

  res.json({
    totals: { uploads: uploads.length },
    emotionCounts,
    behaviorCounts,
    recent: lastUploads
  });
});

