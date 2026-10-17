// Keeps offscreen.wtf up when the pages Worker runs out of its free daily requests (error 1027).
// Runs on the API server under pm2:  pm2 start server/watchdog.mjs --name offscreen-watchdog
//
// Every 2 minutes:
//  - Worker attached: fetch the site through it. If Cloudflare answers 1027, detach the Worker from
//    both routes, so requests go straight to this server (which serves the same site).
//  - Worker detached: once a new UTC day has started (the limit resets at 00:00 UTC), attach it
//    again. If it's still limited, the next check detaches it again.
//
// The routes' own "fail open" setting should do this, but it didn't when the limit was hit on
// 17 Oct 2026, so this does it instead.
//
// Needs a Cloudflare API token with Zone › Workers Routes › Edit on offscreen.wtf, in
// ~/.config/offscreen-watchdog/token (chmod 600). Without it, it only logs what it would do.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ZONE = 'e707fe47a5b1181d25c5f2f6d9c71651'; // offscreen.wtf
const SCRIPT = 'offscreen';
const PATTERNS = ['offscreen.wtf/*', 'www.offscreen.wtf/*'];
const PROBE = 'https://offscreen.wtf/robots.txt';
const EVERY_MS = 2 * 60 * 1000;
const DIR = join(homedir(), '.config', 'offscreen-watchdog');
const STATE = join(DIR, 'state.json');

const log = (...a) => console.log(new Date().toISOString(), ...a);
const today = () => new Date().toISOString().slice(0, 10); // UTC date, the limit's day
const token = () => { try { return readFileSync(join(DIR, 'token'), 'utf8').trim(); } catch { return ''; } };
const readState = () => { try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return {}; } };
const writeState = (s) => { mkdirSync(DIR, { recursive: true }); writeFileSync(STATE, JSON.stringify(s)); };

async function api(method, path, body) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/workers/routes${path}`, {
    method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`${method} routes${path}: ${JSON.stringify(j.errors)}`);
  return j.result;
}

const siteRoutes = async () => (await api('GET', '')).filter((r) => PATTERNS.includes(r.pattern));

// both routes to the Worker (attach) or to no Worker, i.e. straight to this server (detach)
async function setRoutes(attach) {
  for (const r of await siteRoutes()) {
    await api('PUT', `/${r.id}`, attach ? { pattern: r.pattern, script: SCRIPT, request_limit_fail_open: true } : { pattern: r.pattern });
  }
}

// is the Worker turning people away with 1027? (a cache-busting query so it really runs)
async function limited() {
  const r = await fetch(`${PROBE}?watchdog=${Date.now()}`, { signal: AbortSignal.timeout(15000) });
  return r.status === 429 && (await r.text()).includes('1027');
}

async function check() {
  if (!token()) { log('no token yet at', join(DIR, 'token'), '- not checking'); return; }
  const routes = await siteRoutes();
  const attached = routes.some((r) => r.script === SCRIPT);
  const state = readState();

  if (attached) {
    if (await limited()) {
      await setRoutes(false);
      writeState({ detachedOn: today() });
      log('Worker hit its daily limit (1027): routes now go straight to this server');
    }
    return;
  }
  // detached: wait for the next UTC day (detached by hand with no state = today)
  const since = state.detachedOn || (writeState({ detachedOn: today() }), today());
  if (today() > since) {
    await setRoutes(true);
    writeState({});
    log(`new day (${today()}): Worker attached again, fail open on`);
  }
}

const run = () => check().catch((e) => log('check failed:', e.message));
log('watchdog started, every', EVERY_MS / 1000, 's');
run();
setInterval(run, EVERY_MS);
