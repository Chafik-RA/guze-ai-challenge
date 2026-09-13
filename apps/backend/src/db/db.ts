import { Pool, type PoolConfig } from "pg";

function getPoolConfig(): PoolConfig {
  const url = process.env.DATABASE_URL || "";
  const isLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("@postgres:5432");

  if (isLocal) {
    return { connectionString: url, ssl: false };
  }

  // Strip sslmode from URL query so pg driver doesn't override with strict validation
  const cleanUrl = url
    .replace(/([?&])sslmode=[^&]+(&|$)/, "$1")
    .replace(/[?&]$/, "");

  return {
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

export const pool = new Pool(getPoolConfig());