import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

process.env.CI = 'true';

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

if (!process.env.DEMO_MODE) {
  process.env.DEMO_MODE = '1';
}

const testDir = path.resolve(process.cwd(), 'test');

function collectTests(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTests(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      out.push(fullPath);
    }
  }
}

if (!fs.existsSync(testDir)) {
  console.error(`Test directory not found: ${testDir}`);
  process.exit(1);
}

const repoRoot = path.resolve(process.cwd(), '..');
const demoResetScript = path.join(repoRoot, 'scripts', 'demo-reset.mjs');
if (fs.existsSync(demoResetScript)) {
  const reset = spawnSync(process.execPath, [demoResetScript], { stdio: 'inherit', cwd: repoRoot });
  if (reset.status !== 0) {
    process.exit(reset.status ?? 1);
  }
}

const testFiles = [];
collectTests(testDir, testFiles);

if (testFiles.length === 0) {
  console.error('No test files found under server/test.');
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
const flagArgs = [];
const fileArgs = [];

for (const arg of extraArgs) {
  if (arg.startsWith('-')) {
    flagArgs.push(arg);
  } else {
    fileArgs.push(arg);
  }
}

const targets = fileArgs.length ? fileArgs : testFiles;
const hasTimeoutFlag = flagArgs.some((arg) => arg.startsWith('--test-timeout'));
if (!hasTimeoutFlag) {
  flagArgs.push('--test-timeout=300000');
}
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=1',
    '--experimental-test-coverage',
    '--loader',
    'ts-node/esm',
    '--import',
    './test/setup.ts',
    ...flagArgs,
    ...targets
  ],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
