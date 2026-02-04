import { prisma } from "../lib/prisma.js";
import { VectorStorageService } from "../services/VectorStorageService.js";

const BENCH_QUERIES = Number(process.env.BENCH_QUERIES || 20);
const BENCH_TOPK = Number(process.env.BENCH_TOPK || 5);

async function run() {
  const workspace = await prisma.workspace.findFirst({ select: { id: true } });
  const matter = await prisma.matter.findFirst({ select: { id: true, workspaceId: true } });

  if (!workspace || !matter) {
    console.error("Vector benchmark requires at least one workspace + matter.");
    process.exit(1);
  }

  const vector = new VectorStorageService();
  const prompt = "test benchmark query";
  const timings: number[] = [];

  for (let i = 0; i < BENCH_QUERIES; i += 1) {
    const start = Date.now();
    await vector.queryCaseMemory(prompt, workspace.id, "", matter.id, BENCH_TOPK);
    timings.push(Date.now() - start);
  }

  timings.sort((a, b) => a - b);
  const p50 = timings[Math.floor(timings.length * 0.5)] ?? 0;
  const p95 = timings[Math.floor(timings.length * 0.95)] ?? 0;
  const avg = Math.round(timings.reduce((sum, v) => sum + v, 0) / timings.length);

  console.log(JSON.stringify({
    provider: String(process.env.VECTOR_PROVIDER || "pgvector"),
    queries: BENCH_QUERIES,
    topK: BENCH_TOPK,
    avgMs: avg,
    p50Ms: p50,
    p95Ms: p95
  }, null, 2));
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
