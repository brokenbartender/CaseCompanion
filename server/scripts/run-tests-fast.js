import { spawnSync } from 'child_process';

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

if (fileArgs.length === 0) {
  console.error('Usage: node scripts/run-tests-fast.js <test-file> [more test files]');
  process.exit(1);
}

const hasTimeoutFlag = flagArgs.some((arg) => arg.startsWith('--test-timeout'));
if (!hasTimeoutFlag) {
  flagArgs.push('--test-timeout=300000');
}

const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=1',
    '--loader',
    'ts-node/esm',
    '--import',
    './test/setup.ts',
    ...flagArgs,
    ...fileArgs
  ],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
