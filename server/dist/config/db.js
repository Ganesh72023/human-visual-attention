"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDb = connectDb;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDb(env) {
    mongoose_1.default.set("strictQuery", true);
    await mongoose_1.default.connect(env.MONGODB_URI);
}
