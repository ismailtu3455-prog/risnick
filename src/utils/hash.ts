import { createHash } from "node:crypto";

export const hashString = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
