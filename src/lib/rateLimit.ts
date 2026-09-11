// A minimal in-memory fixed-window rate limiter. Good enough for a single
// SQLite-backed instance guarding against spam bots on public write
// endpoints — not meant to survive multiple server instances, which would
// need a shared store (Redis, etc.) instead.

const windows = new Map<string, { count: number; resetAt: number }>();

// Prevents unbounded growth if the process runs for a long time with many
// distinct keys (e.g. IPs) hitting rate-limited routes.
const MAX_TRACKED_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) windows.clear();
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

/** Best-effort client identifier from proxy headers — good enough to key a rate limit, not for anything security-sensitive. */
export function clientKeyFrom(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
