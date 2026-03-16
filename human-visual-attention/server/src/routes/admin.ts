import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { User } from "../models/User";
import { Upload } from "../models/Upload";
import { createObjectCsvStringifier } from "csv-writer";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  const users = await User.find().select("_id name email role createdAt").sort({ createdAt: -1 });
  res.json({ users });
});

adminRouter.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;
  if (userId === req.auth!.id) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Cannot delete yourself" } });

  const uploads = await Upload.find({ userId }).select("_id filePath");
  for (const u of uploads) {
    try {
      if (fs.existsSync(u.filePath)) fs.unlinkSync(u.filePath);
    } catch {
      // ignore file delete errors
    }
  }
  await Upload.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  res.json({ ok: true });
});

adminRouter.get("/uploads", async (_req, res) => {
  const uploads = await Upload.find().sort({ createdAt: -1 }).limit(500);
  res.json({ uploads });
});

adminRouter.delete("/uploads/:id", async (req, res) => {
  const uploadDoc = await Upload.findById(req.params.id);
  if (!uploadDoc) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Upload not found" } });

  try {
    if (fs.existsSync(uploadDoc.filePath)) fs.unlinkSync(uploadDoc.filePath);
    const dir = path.dirname(uploadDoc.filePath);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    // ignore
  }

  await Upload.deleteOne({ _id: uploadDoc._id });
  res.json({ ok: true });
});

adminRouter.get("/stats", async (_req, res) => {
  const [users, uploads] = await Promise.all([User.countDocuments(), Upload.countDocuments()]);
  const topEmotionsAgg = await Upload.aggregate([
    { $group: { _id: "$analysis.emotion", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  const topBehaviorsAgg = await Upload.aggregate([
    { $unwind: "$analysis.behaviors" },
    { $group: { _id: "$analysis.behaviors", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    users,
    uploads,
    topEmotions: topEmotionsAgg.map((x) => ({ label: x._id, count: x.count })),
    topBehaviors: topBehaviorsAgg.map((x) => ({ label: x._id, count: x.count }))
  });
});

adminRouter.get("/export/csv", async (_req, res) => {
  const items = await Upload.find().populate("userId", "email").sort({ createdAt: -1 }).limit(5000);

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: "uploadId", title: "uploadId" },
      { id: "userEmail", title: "userEmail" },
      { id: "fileType", title: "fileType" },
      { id: "filePath", title: "filePath" },
      { id: "emotion", title: "emotion" },
      { id: "confidence", title: "confidence" },
      { id: "behaviors", title: "behaviors" },
      { id: "cognitiveState", title: "cognitiveState" },
      { id: "suggestions", title: "suggestions" },
      { id: "createdAt", title: "createdAt" }
    ]
  });

  const records = items.map((u: any) => ({
    uploadId: u._id.toString(),
    userEmail: u.userId?.email ?? "",
    fileType: u.fileType,
    filePath: u.filePath,
    emotion: u.analysis.emotion,
    confidence: u.analysis.confidence,
    behaviors: (u.analysis.behaviors ?? []).join("|"),
    cognitiveState: u.analysis.cognitiveState,
    suggestions: (u.analysis.suggestions ?? []).join("|"),
    createdAt: u.createdAt.toISOString()
  }));

  const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="dataset.csv"');
  res.send(csv);
});

