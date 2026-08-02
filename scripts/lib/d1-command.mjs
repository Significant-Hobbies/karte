import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const DATABASE = 'linkchat-auth';
const LOCAL_CONFIG = join(ROOT, 'wrangler.local.jsonc');
const REMOTE_CONFIG = join(ROOT, 'wrangler.jsonc');

export function parseD1TargetArgs(args) {
  const target = { remote: false, persistTo: undefined };
  const remaining = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') continue;
    if (arg === '--remote') {
      target.remote = true;
      continue;
    }
    if (arg === '--persist-to') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--persist-to requires a directory');
      }
      target.persistTo = value;
      index += 1;
      continue;
    }
    remaining.push(arg);
  }

  if (target.remote && target.persistTo) {
    throw new Error('--persist-to cannot be combined with --remote');
  }

  return { target, remaining };
}

export function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('SQL numbers must be finite');
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `'${text.replaceAll("'", "''")}'`;
}

export function bindSql(sql, args = []) {
  let bound = '';
  let argIndex = 0;
  let quote = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (quote) {
      bound += char;
      if (char === quote) {
        if (next === quote) {
          bound += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      bound += char;
      continue;
    }

    if (char === '?') {
      if (argIndex >= args.length) {
        throw new Error('SQL has more placeholders than arguments');
      }
      bound += sqlValue(args[argIndex]);
      argIndex += 1;
      continue;
    }

    bound += char;
  }

  if (argIndex !== args.length) {
    throw new Error('SQL has fewer placeholders than arguments');
  }
  return bound;
}

function wranglerArgs(target, operationArgs) {
  const args = [
    'exec',
    'wrangler',
    'd1',
    'execute',
    DATABASE,
    ...operationArgs,
    target.remote ? '--remote' : '--local',
    '--config',
    target.remote ? REMOTE_CONFIG : LOCAL_CONFIG,
  ];
  if (target.persistTo) args.push('--persist-to', target.persistTo);
  return args;
}

function runWrangler(target, operationArgs) {
  const result = spawnSync('pnpm', wranglerArgs(target, operationArgs), {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      [result.stdout, result.stderr].filter(Boolean).join('\n').trim() ||
        `wrangler d1 execute failed with exit code ${result.status}`,
    );
  }
  return result.stdout;
}

export function queryD1(target, statement) {
  const sql =
    typeof statement === 'string'
      ? statement
      : bindSql(statement.sql, statement.args);
  const output = runWrangler(target, ['--command', sql, '--json']);
  const parsed = JSON.parse(output);
  const result = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!result?.success) throw new Error('D1 query did not report success');
  return { rows: result.results ?? [], meta: result.meta ?? {} };
}

export async function executeD1Statements(target, statements) {
  if (!statements.length) return;
  const tempDirectory = await mkdtemp(join(tmpdir(), 'karte-d1-command-'));
  const sqlFile = join(tempDirectory, 'statements.sql');
  try {
    const sql = statements
      .map((statement) =>
        typeof statement === 'string'
          ? statement
          : bindSql(statement.sql, statement.args),
      )
      .map((statement) => `${statement.trim().replace(/;$/, '')};`)
      .join('\n');
    await writeFile(sqlFile, sql, { mode: 0o600 });
    runWrangler(target, [`--file=${sqlFile}`]);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
