import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const isWindows = process.platform === 'win32';
const prismaCmd = isWindows
  ? 'node_modules\\.bin\\prisma.cmd'
  : 'node_modules/.bin/prisma';
const prismaFallback = ['node', ['node_modules/prisma/build/index.js', 'generate']];

const clientDir = path.resolve(process.cwd(), 'node_modules', '.prisma', 'client');
const clientHasTypes = fs.existsSync(path.join(clientDir, 'index.d.ts'));
const clientHasEngine = fs.existsSync(clientDir)
  ? fs.readdirSync(clientDir).some((name) => name.startsWith('query_engine'))
  : false;
const clientReady = clientHasTypes && clientHasEngine;

if (clientReady && process.env.FORCE_PRISMA_GENERATE !== '1') {
  process.exit(0);
}

const maxAttempts = 4;
let attempt = 0;

const cleanupEngineFiles = () => {
  if (!fs.existsSync(clientDir)) return;
  const entries = fs.readdirSync(clientDir);
  entries.forEach((name) => {
    if (name.startsWith('query_engine') || name.includes('.node.tmp')) {
      try {
        fs.unlinkSync(path.join(clientDir, name));
      } catch {
        // best-effort cleanup
      }
    }
  });
};

while (attempt < maxAttempts) {
  attempt += 1;
  const hasPrismaCmd = fs.existsSync(prismaCmd);
  const [fallbackExec, fallbackArgs] = prismaFallback;
  const result = hasPrismaCmd
    ? spawnSync(prismaCmd, ['generate'], { stdio: 'pipe', shell: isWindows })
    : spawnSync(fallbackExec, fallbackArgs, { stdio: 'pipe', shell: isWindows });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    console.error(`Prisma generate failed to start: ${result.error.message}`);
  }
  const stderrText = result.stderr ? result.stderr.toString() : '';
  if (isWindows && /EPERM: operation not permitted, rename.*query_engine/i.test(stderrText)) {
    cleanupEngineFiles();
  }
  if (result.status === 0) {
    process.exit(0);
  }
  if (attempt < maxAttempts) {
    const waitMs = 500 * attempt;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
  }
}

process.exit(1);
