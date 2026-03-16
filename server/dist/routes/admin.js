"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const Upload_1 = require("../models/Upload");
const csv_writer_1 = require("csv-writer");
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use(auth_1.requireAuth, auth_1.requireAdmin);
exports.adminRouter.get("/users", async (_req, res) => {
    const users = await User_1.User.find().select("_id name email role createdAt").sort({ createdAt: -1 });
    res.json({ users });
});
exports.adminRouter.delete("/users/:id", async (req, res) => {
    const userId = req.params.id;
    if (userId === req.auth.id)
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Cannot delete yourself" } });
    const uploads = await Upload_1.Upload.find({ userId }).select("_id filePath");
    for (const u of uploads) {
        try {
            if (fs_1.default.existsSync(u.filePath))
                fs_1.default.unlinkSync(u.filePath);
        }
        catch {
            // ignore file delete errors
        }
    }
    await Upload_1.Upload.deleteMany({ userId });
    await User_1.User.deleteOne({ _id: userId });
    res.json({ ok: true });
});
exports.adminRouter.get("/uploads", async (_req, res) => {
    const uploads = await Upload_1.Upload.find().sort({ createdAt: -1 }).limit(500);
    res.json({ uploads });
});
exports.adminRouter.delete("/uploads/:id", async (req, res) => {
    const uploadDoc = await Upload_1.Upload.findById(req.params.id);
    if (!uploadDoc)
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Upload not found" } });
    try {
        if (fs_1.default.existsSync(uploadDoc.filePath))
            fs_1.default.unlinkSync(uploadDoc.filePath);
        const dir = path_1.default.dirname(uploadDoc.filePath);
        if (fs_1.default.existsSync(dir) && fs_1.default.readdirSync(dir).length === 0)
            fs_1.default.rmdirSync(dir);
    }
    catch {
        // ignore
    }
    await Upload_1.Upload.deleteOne({ _id: uploadDoc._id });
    res.json({ ok: true });
});
exports.adminRouter.get("/stats", async (_req, res) => {
    const [users, uploads] = await Promise.all([User_1.User.countDocuments(), Upload_1.Upload.countDocuments()]);
    const topEmotionsAgg = await Upload_1.Upload.aggregate([
        { $group: { _id: "$analysis.emotion", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
    const topBehaviorsAgg = await Upload_1.Upload.aggregate([
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
exports.adminRouter.get("/export/csv", async (_req, res) => {
    const items = await Upload_1.Upload.find().populate("userId", "email").sort({ createdAt: -1 }).limit(5000);
    const csvStringifier = (0, csv_writer_1.createObjectCsvStringifier)({
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
    const records = items.map((u) => ({
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
