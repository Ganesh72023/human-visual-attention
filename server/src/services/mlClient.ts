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
  const url = new URL("/analyze", env.ML_SERVICE_URL).toString();

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), { filename: path.basename(filePath) });
  form.append("fileType", fileType);

  const res = await axios.post(url, form, { headers: form.getHeaders(), timeout: 300_000 });
  return res.data as MlAnalyzeResponse;
}

