import mongoose, { Schema } from "mongoose";

export type FileType = "image" | "video";
export type EmotionLabel = "happy" | "sad" | "angry" | "neutral" | "nervous";

export interface EmotionPoint {
  tSec: number;
  emotion: EmotionLabel;
  confidence: number;
}

export interface HeatmapPayload {
  mimeType: "image/png";
  base64: string;
}

export interface UploadAnalysis {
  emotion: EmotionLabel;
  confidence: number;
  behaviors: string[];
  cognitiveState: string;
  suggestions: string[];
  timeline?: EmotionPoint[];
  heatmap?: HeatmapPayload | null;
}

export interface UploadDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  fileType: FileType;
  filePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  analysis: UploadAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

const emotionPointSchema = new Schema<EmotionPoint>(
  {
    tSec: { type: Number, required: true },
    emotion: { type: String, required: true },
    confidence: { type: Number, required: true }
  },
  { _id: false }
);

const uploadAnalysisSchema = new Schema<UploadAnalysis>(
  {
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
  },
  { _id: false }
);

const uploadSchema = new Schema<UploadDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileType: { type: String, required: true, enum: ["image", "video"] },
    filePath: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    analysis: { type: uploadAnalysisSchema, required: true }
  },
  { timestamps: true }
);

export const Upload = mongoose.model<UploadDoc>("Upload", uploadSchema);

