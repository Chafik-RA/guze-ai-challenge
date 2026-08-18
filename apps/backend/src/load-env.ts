import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Monorepo .env lives at repo root, but npm workspace scripts run with cwd = apps/backend.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });
