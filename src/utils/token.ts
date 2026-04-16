import { randomBytes } from "node:crypto";

export const generateOfferToken = (): string => randomBytes(6).toString("base64url");
