import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health — Health check leve.
 *
 * Retorna 200 se o servidor está vivo e o DB responde, 503 caso contrário.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      db: 'connected',
      ts: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        db: 'error',
        error: msg,
        ts: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
