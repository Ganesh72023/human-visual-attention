"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Upload = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const emotionPointSchema = new mongoose_1.Schema({
    tSec: { type: Number, required: true },
    emotion: { type: String, required: true },
    confidence: { type: Number, required: true }
}, { _id: false });
const uploadAnalysisSchema = new mongoose_1.Schema({
    emotion: { type: String, required: true },
    confidence: { type: Number, required: true },
    behaviors: { type: [String], required: true, default: [] },
    cognitiveState: { type: String, required: true },
    suggestions: { type: [String], required: true, default: [] },
    timeline: { type: [emotionPointSchema], required: false },
    heatmap: {
        type: {
            mimeType: { type: String, required: true },
            base64: { type: String, required: true }
        },
        required: false,
        default: null
    }
}, { _id: false });
const uploadSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileType: { type: String, required: true, enum: ["image", "video"] },
    filePath: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    analysis: { type: uploadAnalysisSchema, required: true }
}, { timestamps: true });
exports.Upload = mongoose_1.default.model("Upload", uploadSchema);
