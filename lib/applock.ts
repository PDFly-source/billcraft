/**
 * Phase 4 — optional App Lock (PIN).
 *
 * Honest security model — stated up front:
 *  - The PIN is a PRIVACY BARRIER, not device-level encryption. It stops
 *    casual snooping on an unlocked device.
 *  - A technically capable attacker with access to the browser's storage
 *    can always remove or replace the stored lock configuration. We do not
 *    pretend otherwise (and the Settings UI says so).
 *  - The PIN is never stored in plaintext or in any reversible form. We
 *    store only a random 16-byte salt and PBKDF2-SHA256 derived bits
 *    (Web Crypto), plus the iteration count.
 *  - PINs are never logged.
 *  - Forgetting the PIN never deletes business data: the lock can be reset
 *    (disabled), which keeps every record. This is the documented,
 *    deliberate security-vs-recovery trade-off.
 *  - This is a local-first app: NO server is involved at any point.
 *
 * Throttling: repeated incorrect attempts earn an increasing delay
 * (15s after 3 fails, 60s after 6, 5min after 9) tracked in sessionStorage.
 * Failure messages are generic — they never reveal which digits matched.
 */

export interface AppLockConfig {
  enabled: boolean;
  salt: string;            // base64, 16 random bytes
  hash: string;           // base64 PBKDF2-SHA256 derived bits (32 bytes)
  iterations: number;
  createdAt: string;       // ISO
  timeoutMinutes: number;  // 0 = never auto-lock (manual lock only)
  lockOnStart: boolean;
}

export const LOCK_CONFIG_KEY = 'bc-app-lock-config';
const LOCKED_FLAG = 'bc-app-locked';
const THROTTLE_KEY = 'bc-lock-throttle';
const THROTTLE_WINDOW_MS = 15 * 60 * 1000; // failures age out after 15 min

const PBKDF2_ITERATIONS = 210_000; // OWASP-2023 range for PBKDF2-SHA256

// ---- Web Storage with graceful fallbacks (private mode, non-browser envs) ----
// Browsers always have Web Storage; when it is unavailable (or throws, e.g.
// fully-blocked privacy modes) an in-memory store keeps the lock usable for
// the current session. Note: a memory-backed lock state does not survive a
// refresh in those exotic environments — the same is true of any client-side
// lock and is covered by the honest limitations text in Settings.

const memSession = new Map<string, string>();
const memLocal = new Map<string, string>();

function webStore(store: 'session' | 'local'): Storage | null {
  try {
    const s = store === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
    // touch it — some privacy modes throw on access
    s.getItem('bc-probe');
    return s as Storage;
  } catch { return null; }
}

function storageGet(store: 'session' | 'local', key: string): string | null {
  const s = webStore(store);
  if (s) { try { return s.getItem(key); } catch { /* fall through */ } }
  const mem = store === 'session' ? memSession : memLocal;
  return mem.has(key) ? (mem.get(key) as string) : null;
}

function storageSet(store: 'session' | 'local', key: string, value: string): void {
  const s = webStore(store);
  if (s) { try { s.setItem(key, value); return; } catch { /* fall through */ } }
  const mem = store === 'session' ? memSession : memLocal;
  mem.set(key, value);
}

function storageRemove(store: 'session' | 'local', key: string): void {
  const s = webStore(store);
  if (s) { try { s.removeItem(key); } catch { /* ignore */ } }
  const mem = store === 'session' ? memSession : memLocal;
  mem.delete(key);
}

// ---- encoding helpers ----

function bytesToB64(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const byte of b) bin += String.fromCharCode(byte);
  return (typeof btoa === 'function' ? btoa(bin) : Buffer.from(b).toString('base64'));
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function webCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.getRandomValues === 'function';
}

/** PBKDF2-SHA256(pin, salt) -> raw bits. Throws when Web Crypto is unavailable. */
async function derivePinBits(pin: string, saltB64: string, iterations: number): Promise<Uint8Array> {
  if (!webCryptoAvailable()) {
    throw new Error('App lock needs Web Crypto (HTTPS or localhost). This page does not provide it.');
  }
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64ToBytes(saltB64), iterations },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

/** Constant-time equality — no early exit on first mismatch. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---- PIN validation ----

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// ---- config ----

export async function getLockConfig(): Promise<AppLockConfig | null> {
  const raw = storageGet('local', LOCK_CONFIG_KEY);
  if (!raw) return null;
  try {
    const cfg = JSON.parse(raw) as AppLockConfig;
    if (typeof cfg.hash !== 'string' || typeof cfg.salt !== 'string' || typeof cfg.iterations !== 'number') return null;
    return cfg;
  } catch { return null; }
}

/** Enable the lock with a fresh random salt. The PIN itself is never stored. */
export async function setupLock(pin: string, opts: { timeoutMinutes: number; lockOnStart: boolean }): Promise<AppLockConfig> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4 to 6 digits');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = bytesToB64(salt);
  const hash = bytesToB64(await derivePinBits(pin, saltB64, PBKDF2_ITERATIONS));
  const cfg: AppLockConfig = {
    enabled: true, salt: saltB64, hash, iterations: PBKDF2_ITERATIONS,
    createdAt: new Date().toISOString(),
    timeoutMinutes: Math.max(0, Math.round(opts.timeoutMinutes)),
    lockOnStart: !!opts.lockOnStart,
  };
  storageSet('local', LOCK_CONFIG_KEY, JSON.stringify(cfg));
  return cfg;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const cfg = await getLockConfig();
  if (!cfg || !cfg.enabled) return false;
  if (!isValidPin(pin)) { recordFailedAttempt(); return false; }
  const candidate = await derivePinBits(pin, cfg.salt, cfg.iterations);
  const stored = b64ToBytes(cfg.hash);
  return constantTimeEqual(candidate, stored);
}

/** Change the PIN after verifying the current one. */
export async function changePin(currentPin: string, newPin: string): Promise<AppLockConfig> {
  if (!(await verifyPin(currentPin))) throw new Error('Current PIN is incorrect');
  const cfg = await getLockConfig();
  if (!cfg) throw new Error('App lock is not enabled');
  const { timeoutMinutes, lockOnStart } = cfg;
  return setupLock(newPin, { timeoutMinutes, lockOnStart });
}

/** Disable the lock entirely. NEVER touches business data. */
export function resetLock(): void {
  storageRemove('local', LOCK_CONFIG_KEY);
  storageRemove('session', LOCKED_FLAG);
  clearThrottle();
}

// ---- throttle (increasing delay on repeated failures) ----

interface ThrottleState { fails: number[]; until?: number; }

function readThrottle(): ThrottleState {
  const raw = storageGet('session', THROTTLE_KEY);
  if (!raw) return { fails: [] };
  try { return JSON.parse(raw) as ThrottleState; } catch { return { fails: [] }; }
}

function writeThrottle(t: ThrottleState): void {
  storageSet('session', THROTTLE_KEY, JSON.stringify(t));
}

export function clearThrottle(): void {
  storageRemove('session', THROTTLE_KEY);
}

export function recordFailedAttempt(now = Date.now()): void {
  const t = readThrottle();
  t.fails = [...t.fails.filter((ts) => now - ts < THROTTLE_WINDOW_MS), now];
  writeThrottle(t);
}

/** Delay in ms the user must wait before the next attempt. 0 = no delay. */
export function throttleDelayMs(now = Date.now()): number {
  const t = readThrottle();
  if (t.until && t.until > now) return t.until - now;
  const recent = t.fails.filter((ts) => now - ts < THROTTLE_WINDOW_MS);
  if (recent.length >= 9) { writeThrottle({ fails: recent, until: now + 300_000 }); return 300_000; }
  if (recent.length >= 6) { writeThrottle({ fails: recent, until: now + 60_000 }); return 60_000; }
  if (recent.length >= 3) { writeThrottle({ fails: recent, until: now + 15_000 }); return 15_000; }
  return 0;
}

/** Used by tests and by the lock screen to show the remaining wait. */
export function throttleSecondsRemaining(now = Date.now()): number {
  return Math.ceil(throttleDelayMs(now) / 1000);
}

// ---- lock state ----

/**
 * Whether the app should present the lock screen on load.
 * - lock-on-start enabled: ALWAYS locked on a fresh session (a refresh must
 *   NOT bypass the lock — the flag below survives reloads per session).
 * - otherwise: locked only when explicitly locked (timeout / Lock Now).
 */
export function isLockedOnLoad(cfg: AppLockConfig | null): boolean {
  if (!cfg || !cfg.enabled) return false;
  return cfg.lockOnStart || storageGet('session', LOCKED_FLAG) === '1';
}

export function markLocked(): void {
  storageSet('session', LOCKED_FLAG, '1');
}

export function markUnlocked(): void {
  storageRemove('session', LOCKED_FLAG);
  clearThrottle();
}
