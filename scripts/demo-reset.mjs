import path from "node:path";
import { execSync } from "node:child_process";

const repoRoot = process.cwd();
const serverDir = path.join(repoRoot, "server");

const run = (cmd, opts = {}) => {
  execSync(cmd, { stdio: "inherit", ...opts });
};

run("npx prisma db execute --file prisma/reset_schema.sql", { cwd: serverDir });
run("npx prisma db push --accept-data-loss", { cwd: serverDir });
run("npx tsx demo/scripts/seed_golden_demo.ts", { cwd: serverDir });
