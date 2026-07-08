/**
 * Admin authentication helpers.
 *
 * Strategy:
 *   - On successful login (`/api/admin/auth` POST) we mint a
 *     cryptographically-random token (crypto.randomUUID + HMAC over a
 *     server secret) and store it in the `AdminToken` Postgres table
 *     with a 24h expiry.
 *   - Every admin-only API route calls `await verifyAdminAuth(request)`
 *     which checks the `x-admin-token` header against that table.
 *
 * Tokens used to live in an in-memory Map. That worked on a single
 * long-running process (VPS/PM2) but broke on Vercel: each serverless
 * invocation can run on a different instance with its own isolated
 * memory, so a token minted on one instance was invisible to a request
 * that happened to land on another — the admin panel would randomly
 * 401 ("session expired") on commands that hit a different instance,
 * most visibly on the stress-test route (long-running, more likely to
 * cross an instance boundary). Moving the store to Postgres (shared
 * across all instances) fixes this.
 *
 * The HMAC binds the random portion to the server secret so that
 * swapping the secret (e.g. rotating `ADMIN_SECRET_KEY`) invalidates
 * all previously issued tokens even if their random portion leaked.
 */
import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/* ── Secret ──────────────────────────────────────────────────────── */

/**
 * Server secret used to bind tokens to this deployment. Falls back to
 * the same default password that the project ships with so existing
 * setups keep working, but operators are strongly encouraged to set
 * `ADMIN_SECRET_KEY` to a long random string in production.
 */
function getServerSecret(): string {
  return process.env.ADMIN_SECRET_KEY || 'enade2024'
}

/* ── Token minting ───────────────────────────────────────────────── */

/**
 * Mint a fresh admin token. The token has two parts joined by '.':
 *   <randomUUID>.<hmac>
 * where the HMAC is SHA-256(randomUUID, serverSecret). This makes the
 * token unforgeable without the server secret, while still being
 * stateless to verify in principle (we still keep an in-memory
 * allow-list for revocation + expiry).
 *
 * Stores the token in `ADMIN_TOKENS` with a 24h expiry and returns it.
 */
export async function generateAdminToken(): Promise<string> {
  const random = crypto.randomUUID()
  const hmac = crypto
    .createHmac('sha256', getServerSecret())
    .update(random)
    .digest('hex')
  const token = `${random}.${hmac}`

  const now = Date.now()
  await db.adminToken.create({
    data: {
      token,
      issuedAt: new Date(now),
      expiresAt: new Date(now + TOKEN_TTL_MS),
    },
  })

  return token
}

/* ── Token verification ──────────────────────────────────────────── */

/**
 * Verify the `x-admin-token` header on an incoming request.
 *
 * Returns `true` only when:
 *   1. The header is present and well-formed.
 *   2. The HMAC portion matches a recomputation over the random
 *      portion using the current server secret.
 *   3. The token exists in the `AdminToken` table.
 *   4. The token has not expired.
 *
 * Expired tokens are deleted on access (lazy expiry).
 */
export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const header = request.headers.get('x-admin-token')
  if (!header) return false

  // Quick shape check.
  const dot = header.indexOf('.')
  if (dot <= 0 || dot >= header.length - 1) return false
  const random = header.slice(0, dot)
  const hmac = header.slice(dot + 1)

  // Recompute HMAC to defend against tampering AND against a token
  // that was issued under a different (rotated) secret.
  const expected = crypto
    .createHmac('sha256', getServerSecret())
    .update(random)
    .digest('hex')

  // Use timingSafeEqual to avoid leaking the HMAC via timing.
  try {
    const a = Buffer.from(hmac)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    if (!crypto.timingSafeEqual(a, b)) return false
  } catch {
    return false
  }

  // Must also exist in the shared (Postgres) allow-list — this is what
  // gives us revocation + expiry, and what makes auth work consistently
  // across serverless instances.
  const record = await db.adminToken.findUnique({ where: { token: header } })
  if (!record) return false

  if (record.expiresAt.getTime() <= Date.now()) {
    await db.adminToken.delete({ where: { token: header } }).catch(() => {})
    return false
  }

  return true
}

/* ── Password check ──────────────────────────────────────────────── */

/**
 * Constant-time password comparison. Defends against timing attacks
 * even before the per-IP rate limit kicks in.
 */
export function verifyAdminPassword(candidate: string): boolean {
  const expected = getServerSecret()
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/* ── Revocation ──────────────────────────────────────────────────── */

/**
 * Revoke a single token (logout). No-op if the token is unknown.
 */
export async function revokeAdminToken(token: string | null | undefined): Promise<void> {
  if (!token) return
  await db.adminToken.delete({ where: { token } }).catch(() => {})
}
