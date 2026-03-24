import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { loadEnv } from "../config/env";
import type { EmotionLabel, EmotionPoint, HeatmapPayload } from "../models/Upload";

export interface MlAnalyzeResponse {
  emotion: EmotionLabel;
  confidence: number;
  behaviors: string[];
  cognitiveState: string;
  timeline?: EmotionPoint[];
  heatmap?: HeatmapPayload | null;
}

export async function analyzeWithMlService(filePath: string, fileType: "image" | "video"): Promise<MlAnalyzeResponse> {
  const env = loadEnv();
  const base =
    env.ML_SERVICE_URL ||
    (env.ML_SERVICE_HOSTPORT ? `${env.ML_SERVICE_SCHEME}://${env.ML_SERVICE_HOSTPORT}` : "http://localhost:8000");
  const url = new URL("/analyze", base).toString();

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), { filename: path.basename(filePath) });
  form.append("fileType", fileType);
  if (fileType === "video") {
    // Keep video analysis bounded and predictable for the UI.
    form.append("maxFrames", "18");
    form.append("frameStride", "10");
  }

  const res = await axios.post(url, form, { headers: form.getHeaders(), timeout: 300_000 });
  return res.data as MlAnalyzeResponse;
}
