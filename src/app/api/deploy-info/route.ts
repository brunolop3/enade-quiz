/**
 * Deploy info endpoint — returns build-time + runtime info so we can verify
 * which version is actually running on the Z.ai platform.
 *
 * This is intentionally PUBLIC (no auth) and contains no secrets.
 * It helps answer: "did the platform pick up my latest fix?"
 */
import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

// Build-time constants (evaluated when this route is compiled)
const BUILD_EPOCH = Date.now()
const BUILD_ISO = new Date(BUILD_EPOCH).toISOString()
const NODE_VERSION = process.version
const PLATFORM = process.platform
const ARCH = process.arch

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const cwd = process.cwd()
  const dbUrl = process.env.DATABASE_URL || '(not set)'

  // Resolve the actual DB file path (mirror db-ensure logic)
  let dbInfo: Record<string, unknown> = { raw: dbUrl }
  try {
    const match = dbUrl.match(/^file:(.+)$/)
    if (match) {
      const raw = match[1]
      const abs = path.isAbsolute(raw) ? raw : path.resolve(cwd, raw)
      const exists = fs.existsSync(abs)
      const size = exists ? fs.statSync(abs).size : 0
      dbInfo = {
        raw: dbUrl,
        resolved: abs,
        exists,
        sizeBytes: size,
        sizeKB: Math.round(size / 1024),
      }
    }
  } catch (e) {
    dbInfo.error = e instanceof Error ? e.message : String(e)
  }

  // Check standalone layout
  const isStandalone = fs.existsSync(path.join(cwd, 'server.js')) ||
                       fs.existsSync(path.join(cwd, '.next', 'standalone', 'server.js'))

  // ─── List available Prisma query-engine binaries ─────────────────────────
  // This is CRITICAL for diagnosing the "HTTP 500 on every route" issue:
  // if the runtime platform doesn't match any of the shipped binary engines,
  // every Prisma query throws "Query engine library failed to load".
  const engines: string[] = []
  try {
    // Prisma client binaries live in node_modules/.prisma/client/
    const prismaClientDir = path.join(cwd, 'node_modules', '.prisma', 'client')
    if (fs.existsSync(prismaClientDir)) {
      const files = fs.readdirSync(prismaClientDir)
      for (const f of files) {
        if (f.startsWith('libquery_engine-') && f.endsWith('.so.node')) {
          // Extract the target name: libquery_engine-<target>.so.node
          const target = f.replace(/^libquery_engine-/, '').replace(/\.so\.node$/, '')
          engines.push(target)
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // ─── Probe the actual DB connection ──────────────────────────────────────
  // This tells us definitively whether Prisma + DB file are both working.
  let probe: { ok: boolean; error?: string; latencyMs?: number } = { ok: false, error: 'not run' }
  try {
    const { probeDatabase } = await import('@/lib/db')
    probe = await probeDatabase()
  } catch (e) {
    probe = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  // ─── OS release info (helps identify the runtime platform) ───────────────
  let osInfo: Record<string, unknown> = { platform: PLATFORM, arch: ARCH }
  try {
    const os = await import('node:os')
    osInfo = {
      platform: PLATFORM,
      arch: ARCH,
      hostname: os.hostname(),
      type: os.type(),
      release: os.release(),
      endianness: os.endianness(),
    }
    // Try to read /etc/os-release for Linux distro info
    if (PLATFORM === 'linux') {
      try {
        const content = fs.readFileSync('/etc/os-release', 'utf8')
        const distro: Record<string, string> = {}
        for (const line of content.split('\n')) {
          const m = line.match(/^(\w+)=(?:"([^"]*)"|([^"#]*))$/)
          if (m) distro[m[1]] = m[2] || m[3] || ''
        }
        osInfo.distro = distro
      } catch {
        osInfo.distroError = 'Could not read /etc/os-release'
      }
      // OpenSSL version (from ldd or openssl binary if available)
      try {
        const { execSync } = await import('node:child_process')
        try {
          osInfo.openssl = execSync('openssl version 2>/dev/null', { encoding: 'utf8' }).trim()
        } catch {
          osInfo.openssl = '(openssl binary not found)'
        }
        try {
          osInfo.ldd = execSync('ldd --version 2>&1 | head -1', { encoding: 'utf8' }).trim()
        } catch {
          osInfo.ldd = '(ldd not found)'
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    status: 'ok',
    build: {
      iso: BUILD_ISO,
      epoch: BUILD_EPOCH,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    runtime: {
      node: NODE_VERSION,
      platform: PLATFORM,
      arch: ARCH,
      cwd,
      isStandalone,
      nextRuntime: process.env.NEXT_RUNTIME || '(not set)',
      nodeEnv: process.env.NODE_ENV || '(not set)',
      bunVersion: typeof Bun !== 'undefined' ? Bun.version : '(not bun)',
    },
    database: {
      ...dbInfo,
      probe,
    },
    prisma: {
      engineType: 'library',
      availableEngines: engines,
      engineCount: engines.length,
    },
    os: osInfo,
    env: {
      ADMIN_SECRET_KEY_SET: !!process.env.ADMIN_SECRET_KEY,
      PRESENTER_KEY_SET: !!process.env.PRESENTER_KEY,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
