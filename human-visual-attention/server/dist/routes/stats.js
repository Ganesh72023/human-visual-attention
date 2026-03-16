"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Upload_1 = require("../models/Upload");
exports.statsRouter = (0, express_1.Router)();
exports.statsRouter.get("/summary", auth_1.requireAuth, async (req, res) => {
    const uploads = await Upload_1.Upload.find({ userId: req.auth.id }).select("analysis createdAt fileType");
    const emotionCounts = {};
    const behaviorCounts = {};
    const lastUploads = uploads
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10);
    for (const u of uploads) {
        const e = u.analysis.emotion;
        emotionCounts[e] = (emotionCounts[e] || 0) + 1;
        for (const b of u.analysis.behaviors)
            behaviorCounts[b] = (behaviorCounts[b] || 0) + 1;
    }
    res.json({
        totals: { uploads: uploads.length },
        emotionCounts,
        behaviorCounts,
        recent: lastUploads
    });
});
