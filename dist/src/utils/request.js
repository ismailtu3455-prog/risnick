"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClientIp = void 0;
const parseClientIp = (headers, fallbackIp) => {
    const forwarded = headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0].trim();
    }
    const realIp = headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.length > 0) {
        return realIp.trim();
    }
    return fallbackIp;
};
exports.parseClientIp = parseClientIp;
