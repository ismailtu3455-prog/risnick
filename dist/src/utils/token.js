"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOfferToken = void 0;
const node_crypto_1 = require("node:crypto");
const generateOfferToken = () => (0, node_crypto_1.randomBytes)(6).toString("base64url");
exports.generateOfferToken = generateOfferToken;
