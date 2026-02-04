import { spawnSync } from "node:child_process";
import path from "node:path";

const isRender = Boolean(process.env.RENDER);
const vectorDisabled = String(process.env.VECTOR_STORAGE_DISABLED || "").trim() === "true";
const useDisable = isRender || vectorDisabled;
const fileName = useDisable ? "disable_vector.sql" : "enable_vector.sql";
const filePath = path.join("prisma", fileName);
const pgcryptoPath = path.join("prisma", "enable_pgcrypto.sql");

const pgcryptoResult = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--yes", "prisma", "db", "execute", "--file", pgcryptoPath],
  { stdio: "inherit" }
);

if (pgcryptoResult.status && pgcryptoResult.status !== 0) {
  process.exit(pgcryptoResult.status);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--yes", "prisma", "db", "execute", "--file", filePath],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
