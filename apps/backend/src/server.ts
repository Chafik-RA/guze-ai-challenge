import dns from "node:dns";
// บังคับให้ Node.js ใช้ IPv4 ก่อน IPv6 แก้ปัญหา ENETUNREACH บน Render
dns.setDefaultResultOrder("ipv4first");

import type { HttpError } from "@ai-challenge/shared/error-codes";
import app from "./app.js";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

// Handle Unhandled Promise Rejections
process.on("unhandledRejection", (err: HttpError) => {
  console.error("💥 Unhandled Rejection:", err.message);
  process.exit(1);
});
