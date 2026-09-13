import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Monorepo .env lives at repo root, but npm workspace scripts run with cwd = apps/backend.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const candidatePaths = [
  path.resolve(currentDir, "../../..", ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  "/app/.env",
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}
