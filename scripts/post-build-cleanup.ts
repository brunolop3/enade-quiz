/**
 * Post-build cleanup script for the standalone bundle.
 *
 * This script is run AFTER `next build` but BEFORE copying to next-service-dist/.
 * It removes heavy/unnecessary files from .next/standalone/ to keep the
 * Z.ai artifact tarball under the platform's size limit.
 *
 * CRITICAL: This script is designed to NEVER fail the build. Every operation
 * is wrapped in try/catch. If a file doesn't exist or can't be removed, we
 * just log a warning and continue. A failed cleanup should NOT prevent the
 * deploy — a slightly larger bundle is always better than a failed build.
 *
 * Usage: bun scripts/post-build-cleanup.ts
 */
import fs from 'node:fs'
import path from 'node:path'

const standaloneDir = path.join(process.cwd(), '.next', 'standalone')

if (!fs.existsSync(standaloneDir)) {
  console.warn(`[post-build-cleanup] Standalone dir not found: ${standaloneDir}`)
  console.warn('[post-build-cleanup] Skipping cleanup (build may have failed)')
  process.exit(0) // EXIT 0 — don't fail the build
}

// Directories/files to remove from the standalone bundle.
// Each entry is a path relative to .next/standalone/.
const TARGETS = [
  // TypeScript compiler — not needed at runtime (we already transpiled)
  'node_modules/typescript',

  // sharp + native image libs — we use images.unoptimized: true
  'node_modules/sharp',
  'node_modules/@img/sharp-libvips-linux-x64',
  'node_modules/@img/sharp-libvips-linuxmusl-x64',
  'node_modules/@img/sharp-linux-x64',
  'node_modules/@img/sharp-linuxmusl-x64',
  'node_modules/@img/sharp-linux-arm64',
  'node_modules/@img/sharp-linuxmusl-arm64',
  'node_modules/@img/sharp-darwin-x64',
  'node_modules/@img/sharp-darwin-arm64',
  'node_modules/@img/sharp-wasm32',
  'node_modules/@img/colour',

  // Prisma engines for platforms we don't target (keep debian-3.0 + musl-3.0)
  'node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node',
  'node_modules/.prisma/client/libquery_engine-linux-musl.so.node',
  'node_modules/.prisma/client/libquery_engine-rhel-openssl-1.1.x.so.node',
  'node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
  'node_modules/.prisma/client/libquery_engine-darwin.so.node',
  'node_modules/.prisma/client/libquery_engine-windows.so.node',

  // Build artifacts that leaked into the bundle
  'node_modules/.cache',
  '.next/cache',

  // ─── Prisma runtime: engines for DBs we don't use ─────────────────────────
  // We only use SQLite. Prisma ships WASM engines for postgresql, mysql,
  // sqlserver, cockroachdb — each ~3 MB. Removing them saves ~25 MB.
  'node_modules/@prisma/client/runtime/query_engine_bg.postgresql.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.postgresql.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_engine_bg.postgresql.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.postgresql.mjs',
  'node_modules/@prisma/client/runtime/query_engine_bg.mysql.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.mysql.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_engine_bg.mysql.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.mysql.mjs',
  'node_modules/@prisma/client/runtime/query_engine_bg.sqlserver.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.sqlserver.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_engine_bg.sqlserver.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.sqlserver.mjs',
  'node_modules/@prisma/client/runtime/query_engine_bg.cockroachdb.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.cockroachdb.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_engine_bg.cockroachdb.js',
  'node_modules/@prisma/client/runtime/query_engine_bg.cockroachdb.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.mysql.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.mysql.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.mysql.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.mysql.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.sqlserver.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.sqlserver.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.sqlserver.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.sqlserver.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.cockroachdb.wasm-base64.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.cockroachdb.wasm-base64.mjs',
  'node_modules/@prisma/client/runtime/query_compiler_bg.cockroachdb.js',
  'node_modules/@prisma/client/runtime/query_compiler_bg.cockroachdb.mjs',

  // Edge runtime variants — we use the Node.js runtime exclusively
  'node_modules/@prisma/client/runtime/edge.js',
  'node_modules/@prisma/client/runtime/edge-esm.js',

  // Browser build — we never import Prisma from the browser
  'node_modules/@prisma/client/runtime/index-browser.js',
  'node_modules/@prisma/client/runtime/index-browser.mjs',
  'node_modules/@prisma/client/index-browser.js',

  // React Native build — not applicable
  'node_modules/@prisma/client/react-native.js',

  // ─── Project-only directories that leaked into standalone ────────────────
  // These are NOT app code — they're sandbox tooling/docs/assets. Next's
  // tracer sometimes copies them anyway. Belt-and-suspenders removal in
  // case outputFileTracingExcludes didn't catch them.
  'skills',
  'upload',
  'tool-results',
  'docs',
  'examples',
  'mini-services',
  'agent-ctx',
  'k8s',
  'deploy',
  'download',
  '.github',
  'scripts',
  'prisma',
  '.zscripts',
  '.git',

  // ─── Dev-only files that leaked into standalone ──────────────────────────
  'dev.log',
  'worklog.md',          // 180 KB worklog — not needed at runtime
  'watchdog.sh',         // dev-only watchdog script
  'start-dev-daemon.sh', // dev-only daemon
  'restart.log',         // dev-only restart log
  'ecosystem.config.cjs',
  'Dockerfile',
  'Caddyfile',
  'tsconfig.json',
  'eslint.config.mjs',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'components.json',
  'bun.lock',

  // ─── .env file — NOT used at runtime ─────────────────────────────────────
  // The standalone server.js does NOT load .env files. Environment variables
  // are set by start.sh (export DATABASE_URL=...). Removing .env saves a few
  // bytes and prevents confusion about which config is used at runtime.
  '.env',
]

let removedCount = 0
let removedBytes = 0
let notFoundCount = 0
let errorCount = 0

function dirSize(p: string): number {
  try {
    if (!fs.existsSync(p)) return 0
    let total = 0
    const stack = [p]
    while (stack.length > 0) {
      const cur = stack.pop()!
      const stat = fs.statSync(cur)
      if (stat.isFile()) {
        total += stat.size
      } else if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(cur)) {
          stack.push(path.join(cur, entry))
        }
      }
    }
    return total
  } catch {
    return 0
  }
}

for (const target of TARGETS) {
  try {
    const fullPath = path.join(standaloneDir, target)
    if (!fs.existsSync(fullPath)) {
      notFoundCount++
      continue
    }
    const size = dirSize(fullPath)
    fs.rmSync(fullPath, { recursive: true, force: true })
    removedCount++
    removedBytes += size
    if (size > 100 * 1024) {
      // Only log removals > 100 KB to reduce noise
      console.log(`[post-build-cleanup] removed ${target} (${(size / 1024 / 1024).toFixed(1)} MB)`)
    }
  } catch (err) {
    errorCount++
    console.warn(`[post-build-cleanup] WARNING: could not remove ${target}: ${(err as Error).message}`)
    // CONTINUE — don't let one failure kill the cleanup
  }
}

try {
  const beforeSize = dirSize(standaloneDir)
  console.log('')
  console.log(`[post-build-cleanup] Removed ${removedCount} paths (${(removedBytes / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`[post-build-cleanup] ${notFoundCount} targets not found (already minimal)`)
  if (errorCount > 0) {
    console.log(`[post-build-cleanup] ${errorCount} warnings (non-fatal)`)
  }
  console.log(`[post-build-cleanup] Standalone bundle now: ${(beforeSize / 1024 / 1024).toFixed(1)} MB`)
} catch (err) {
  console.warn(`[post-build-cleanup] WARNING: could not compute final size: ${(err as Error).message}`)
}

// ALWAYS exit 0 — this script must NEVER fail the build.
// A larger bundle is always preferable to a failed deploy.
process.exit(0)
