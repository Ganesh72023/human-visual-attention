"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithMlService = analyzeWithMlService;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
async function analyzeWithMlService(filePath, fileType) {
    const env = (0, env_1.loadEnv)();
    const base = env.ML_SERVICE_URL ||
        (env.ML_SERVICE_HOSTPORT ? `${env.ML_SERVICE_SCHEME}://${env.ML_SERVICE_HOSTPORT}` : "http://localhost:8000");
    const url = new URL("/analyze", base).toString();
    const form = new form_data_1.default();
    form.append("file", fs_1.default.createReadStream(filePath), { filename: path_1.default.basename(filePath) });
    form.append("fileType", fileType);
    const res = await axios_1.default.post(url, form, { headers: form.getHeaders(), timeout: 300_000 });
    return res.data;
}
