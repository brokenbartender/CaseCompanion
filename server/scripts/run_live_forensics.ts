import fs from "fs";
import path from "path";
import { verifyGrounding } from "../services/HallucinationKiller.js";

type Anchor = { id: string; text?: string | null };

function readText(filePath: string) {
  return fs.readFileSync(path.resolve(filePath), "utf-8");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (!key.startsWith("--")) continue;
    out[key.slice(2)] = args[i + 1];
    i += 1;
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const responsePath = args.response;
  const anchorsPath = args.anchors;
  if (!responsePath || !anchorsPath) {
    process.stderr.write("Usage: tsx server/scripts/run_live_forensics.ts --response <file> --anchors <json>\n");
    process.exit(1);
  }
  const response = readText(responsePath);
  const anchorsRaw = JSON.parse(readText(anchorsPath)) as Anchor[] | string[];
  const result = await verifyGrounding(response, anchorsRaw);
  if (!result.approved) {
    process.stderr.write(`FAILED: ${result.reason}${"details" in result ? ` (${result.details})` : ""}\n`);
    process.exit(2);
  }
  process.stdout.write("PASSED: Grounding verification approved.\n");
}

main().catch((err) => {
  process.stderr.write(`ERROR: ${err?.message || String(err)}\n`);
  process.exit(1);
});
