/** Colored terminal logs + file mirror (so bat/concurrently can't hide them) */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TAG = '[resonance]';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'resonance.log');

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  /* ignore */
}

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  bgRed: '\x1b[41m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

function stamp() {
  return new Date().toISOString().slice(11, 23);
}

function fullStamp() {
  return new Date().toISOString();
}

function fmt(obj) {
  if (obj == null || obj === '') return '';
  if (typeof obj === 'string') return obj;
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function flatArgs(args) {
  return args.map((a) => {
    if (a instanceof Error) {
      return `${a.message}${a.stack ? `\n${a.stack}` : ''}`;
    }
    return typeof a === 'object' ? fmt(a) : a;
  });
}

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}

function writeFile(level, text) {
  try {
    fs.appendFileSync(LOG_FILE, `${fullStamp()} ${level.padEnd(5)} ${stripAnsi(text)}\n`, 'utf8');
  } catch {
    /* ignore disk errors */
  }
}

export function logInfo(...args) {
  const body = flatArgs(args).join(' ');
  console.log(`${c.dim}${stamp()}${c.reset} ${c.cyan}${TAG}${c.reset} ${body}`);
  writeFile('INFO', `${TAG} ${body}`);
}

export function logOk(...args) {
  const body = flatArgs(args).join(' ');
  console.log(`${c.dim}${stamp()}${c.reset} ${c.green}${TAG} OK${c.reset} ${body}`);
  writeFile('OK', `${TAG} OK ${body}`);
}

export function logWarn(...args) {
  const body = flatArgs(args).join(' ');
  console.warn(
    `${c.dim}${stamp()}${c.reset} ${c.yellow}${c.bold}${TAG} WARN${c.reset} ${c.yellow}${body}${c.reset}`
  );
  writeFile('WARN', `${TAG} WARN ${body}`);
}

/** Bright red banner — AI / fatal failures stand out in the bat window */
export function logError(...args) {
  const body = flatArgs(args).join(' ');
  const bar = `${c.bgRed}${c.white}${c.bold}${'═'.repeat(56)}${c.reset}`;
  console.error(bar);
  console.error(
    `${c.dim}${stamp()}${c.reset} ${c.bgRed}${c.white}${c.bold} ★ ERROR ★ ${c.reset} ${c.brightRed}${c.bold}${c.underline}${TAG}${c.reset}`
  );
  console.error(`${c.brightRed}${c.bold}  → ${body}${c.reset}`);
  console.error(bar);
  writeFile('ERROR', `${TAG} ERROR ${body}`);
}

export function logAi(step, detail = {}) {
  const line = `[ai:${step}]`;
  const msg = detail.message || '';
  const rest = { ...detail };
  delete rest.message;
  delete rest.level;
  if (rest.extra && typeof rest.extra === 'object') {
    Object.assign(rest, rest.extra);
    delete rest.extra;
  }
  const extra = Object.keys(rest).length ? fmt(rest) : '';

  if (detail.level === 'error') {
    logError(line, msg, extra);
  } else if (detail.level === 'warn') {
    logWarn(line, msg, extra);
  } else if (detail.level === 'ok') {
    logOk(line, msg, extra);
  } else {
    logInfo(line, msg, extra);
  }
}

export function logReq(req, res, next) {
  const start = Date.now();
  const id = Math.random().toString(36).slice(2, 8);
  req._logId = id;
  const auth = req.headers.authorization ? 'auth=yes' : 'auth=no';
  logInfo(`[http:${id}] → ${req.method} ${req.originalUrl || req.url}`, { auth });
  res.on('finish', () => {
    const ms = Date.now() - start;
    const code = res.statusCode;
    if (code >= 500) {
      logError(`[http:${id}] ← ${code} ${req.method} ${req.originalUrl || req.url} (${ms}ms)`);
    } else if (code >= 400) {
      logWarn(`[http:${id}] ← ${code} ${req.method} ${req.originalUrl || req.url} (${ms}ms)`);
    } else {
      logOk(`[http:${id}] ← ${code} (${ms}ms)`);
    }
  });
  next();
}

export function logPath() {
  return LOG_FILE;
}
