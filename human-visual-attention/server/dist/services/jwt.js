"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
const jsonwebtoken_1 = require("jsonwebtoken");
const env_1 = require("../config/env");
function signAccessToken(userId, role) {
    const env = (0, env_1.loadEnv)();
    return (0, jsonwebtoken_1.sign)({ role }, env.JWT_SECRET, { subject: userId, expiresIn: env.JWT_EXPIRES_IN });
}
