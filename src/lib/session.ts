import { io, Socket } from 'socket.io-client'

// Resolves where the Socket.IO real-time service lives.
//
// - VPS deploy (Caddyfile + PM2, see deploy/DEPLOY.md): the service runs on
//   localhost:3003 behind Caddy, reached via the `?XTransformPort=3003`
//   query-string trick — no env var needed, this is the default.
// - Any deploy without that Caddy in front (Vercel, or the socket service
//   hosted on its own platform like Railway/Fly.io): set
//   NEXT_PUBLIC_SOCKET_URL to the service's full URL (e.g.
//   https://enade-quiz-realtime.up.railway.app) and the client connects
//   there directly instead.
export function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL || '/?XTransformPort=3003'
}

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      // Polling-only: confirmed root cause (2026-07-06) is that the
      // Railway edge negotiates HTTP/2 via ALPN with real browsers, but
      // returns NGHTTP2_PROTOCOL_ERROR on the WebSocket Extended CONNECT
      // (RFC 8441) that browsers use over an h2 connection — a Railway
      // edge limitation, not something fixable from our client/server
      // code. Node/curl tests "worked" only because neither negotiates
      // h2 by default, so they never hit this path. Revisit if the
      // socket service moves to a host with proper WS-over-h2 support.
      transports: ['polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Generate a random 6-character session code
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Format percentage
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

// Get percentage as number
export function getPercent(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}
