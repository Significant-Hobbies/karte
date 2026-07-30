#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG = join(ROOT, 'wrangler.local.jsonc');
const DATABASE = 'linkchat-auth';

function usage() {
  return 'Usage: pnpm db:setup:local [--persist-to <directory>]';
}

export function parseArgs(args) {
  let persistTo;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') continue;

    if (arg === '--remote') {
      throw new Error(
        'Remote D1 access is not allowed by this local setup command.',
      );
    }

    if (arg === '--persist-to') {
      persistTo = args[index + 1];
      if (!persistTo || persistTo.startsWith('-')) {
        throw new Error(`${usage()}\n--persist-to requires a directory.`);
      }
      index += 1;
      continue;
    }

    throw new Error(`${usage()}\nUnknown argument: ${arg}`);
  }

  return persistTo;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status}`,
    );
  }

  return result.stdout;
}

function wranglerArgs(command, persistTo) {
  const args = [
    'exec',
    'wrangler',
    'd1',
    ...command,
    '--local',
    '--config',
    CONFIG,
  ];
  if (persistTo) args.push('--persist-to', persistTo);
  return args;
}

export async function setupLocalD1(args = process.argv.slice(2)) {
  const persistTo = parseArgs(args);
  const tempDirectory = await mkdtemp(join(tmpdir(), 'karte-local-d1-'));
  const seedFile = join(tempDirectory, 'demo-profiles.sql');

  try {
    process.stdout.write('Applying local D1 migrations...\n');
    run('pnpm', wranglerArgs(['migrations', 'apply', DATABASE], persistTo), {
      stdio: 'inherit',
    });

    const seedSql = run(process.execPath, ['scripts/seed-demos.mjs']);
    await writeFile(seedFile, seedSql, { mode: 0o600 });

    process.stdout.write('Loading demo profiles into local D1...\n');
    run(
      'pnpm',
      wranglerArgs(['execute', DATABASE, `--file=${seedFile}`], persistTo),
      { stdio: 'inherit' },
    );

    process.stdout.write('Local D1 is ready with four demo profiles.\n');
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupLocalD1().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
