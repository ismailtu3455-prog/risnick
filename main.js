// bothost compatibility wrapper for fixed build pipeline
// 1) Generate Prisma client at runtime (schema is copied after npm install in bothost template)
// 2) Start compiled app from dist/src
const { execSync } = require("node:child_process");
const { existsSync } = require("node:fs");

const prismaBin =
  process.platform === "win32" ? ".\\node_modules\\.bin\\prisma.cmd" : "./node_modules/.bin/prisma";

try {
  execSync(`${prismaBin} generate --schema ./prisma/schema.prisma`, { stdio: "inherit" });
} catch (error) {
  console.error("Prisma generate failed at startup.");
  throw error;
}

if (!existsSync("./dist/src/main.js")) {
  throw new Error("dist/src/main.js not found. Run `npm run build` locally and push dist folder.");
}

require("./dist/src/main.js");
