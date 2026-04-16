"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashString = void 0;
const node_crypto_1 = require("node:crypto");
const hashString = (value) => (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
exports.hashString = hashString;
