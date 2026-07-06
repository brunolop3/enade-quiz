#!/bin/sh

# ⚠️ Critical: redirect stderr to stdout so Z.ai deploy console captures ALL logs.
# Without this, any error from bun/caddy/prisma goes to stderr and is LOST —
# which is exactly why the deploy console was showing nothing.
exec 2>&1

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"

# 存储所有子进程的 PID
pids=""

# 清理函数：优雅关闭所有服务
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."

    # 发送 SIGTERM 信号给所有子进程
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            service_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            echo "   Stopping process $pid ($service_name)..."
            kill -TERM "$pid" 2>/dev/null
        fi
    done

    # 等待所有进程退出（最多等待 5 秒）
    sleep 1
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            # 如果还在运行，等待最多 4 秒
            timeout=4
            while [ $timeout -gt 0 ] && kill -0 "$pid" 2>/dev/null; do
                sleep 1
                timeout=$((timeout - 1))
            done
            # 如果仍然在运行，强制关闭
            if kill -0 "$pid" 2>/dev/null; then
                echo "   Force killing process $pid..."
                kill -KILL "$pid" 2>/dev/null
            fi
        fi
    done

    echo "✅ All services stopped"
    exit 0
}

echo "🚀 Starting all services..."
echo ""
echo "=== Environment ==="
echo "  SCRIPT_DIR: $SCRIPT_DIR"
echo "  BUILD_DIR:  $BUILD_DIR"
echo "  PWD:        $(pwd)"
echo "  PORT:       ${PORT:-unset}"
echo "  DATABASE_URL: ${DATABASE_URL:-unset}"
echo ""

# 切换到构建目录
cd "$BUILD_DIR" || { echo "❌ Cannot cd to $BUILD_DIR"; exit 1; }

echo "=== Build directory contents ==="
ls -lah
echo ""

# Use a dynamic DB path relative to BUILD_DIR so it works regardless of where
# Z.ai extracts the tarball (previously hardcoded /app/db/custom.db which only
# worked if Z.ai extracted to /app/).
DEFAULT_PACKAGED_DB_PATH="$BUILD_DIR/db/custom.db"
DEFAULT_PACKAGED_DATABASE_URL="file:$DEFAULT_PACKAGED_DB_PATH"

# 启动 Next.js 服务器
if [ -f "./next-service-dist/server.js" ]; then
    echo "🚀 Starting Next.js server..."
    cd next-service-dist/ || { echo "❌ Cannot cd to next-service-dist"; exit 1; }

    # 设置环境变量
    export NODE_ENV=production
    export PORT="${PORT:-3000}"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    export DATABASE_URL="${DATABASE_URL:-$DEFAULT_PACKAGED_DATABASE_URL}"

    echo "  NODE_ENV: $NODE_ENV"
    echo "  PORT: $PORT"
    echo "  HOSTNAME: $HOSTNAME"
    echo "  DATABASE_URL: $DATABASE_URL"

    if [ "$DATABASE_URL" = "$DEFAULT_PACKAGED_DATABASE_URL" ]; then
        if [ ! -f "$DEFAULT_PACKAGED_DB_PATH" ]; then
            echo "❌ Packaged DB file not found at $DEFAULT_PACKAGED_DB_PATH"
            echo "   Listing parent dir for diagnostics:"
            ls -lah "$BUILD_DIR/db/" 2>/dev/null || echo "   (db dir does not exist)"
            echo "   Aborting to avoid starting against an empty database."
            exit 1
        fi
        echo "🗄️  Using packaged DB: $DEFAULT_PACKAGED_DB_PATH"
    else
        echo "🗄️  Using external DB: $DATABASE_URL"
    fi
    echo ""

    # 后台启动 Next.js
    echo "  Running: bun server.js"
    bun server.js &
    NEXT_PID=$!
    pids="$NEXT_PID"

    # 等待检查进程是否成功启动 (give it more time — 3s instead of 1s)
    sleep 3
    if ! kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "❌ Next.js server process died within 3s"
        echo "   Exit code: $(wait $NEXT_PID 2>/dev/null; echo $?)"
        exit 1
    fi
    echo "✅ Next.js server started (PID: $NEXT_PID, Port: $PORT)"

    # Probe the HTTP endpoint to confirm it's actually serving
    echo "  Probing http://localhost:$PORT/ ..."
    probe_ok=0
    for attempt in 1 2 3 4 5; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null | grep -qE "^(200|307|404)$"; then
            echo "  ✓ Probe attempt $attempt: server responding"
            probe_ok=1
            break
        fi
        echo "  ... attempt $attempt: not ready yet, waiting 1s"
        sleep 1
    done
    if [ "$probe_ok" = "0" ]; then
        echo "⚠️  Server process is alive but HTTP probe failed after 5 attempts"
        echo "    (continuing anyway — may still be warming up)"
    fi

    cd ../
else
    echo "⚠️  Next.js server file not found: ./next-service-dist/server.js"
    echo "    Listing next-service-dist if it exists:"
    ls -lah next-service-dist/ 2>/dev/null || echo "    (next-service-dist does not exist)"
fi

# 启动 mini-services
if [ -f "./mini-services-start.sh" ]; then
    echo "🚀 Starting mini-services..."
    sh ./mini-services-start.sh &
    MINI_PID=$!
    pids="$pids $MINI_PID"

    sleep 1
    if ! kill -0 "$MINI_PID" 2>/dev/null; then
        echo "⚠️  mini-services may have failed to start, continuing..."
    else
        echo "✅ mini-services started (PID: $MINI_PID)"
    fi
elif [ -d "./mini-services-dist" ]; then
    echo "⚠️  mini-services-start.sh not found but mini-services-dist exists"
else
    echo "ℹ️  No mini-services directory, skipping"
fi

echo ""
echo "🎉 All services started!"
echo ""

# Start Caddy if available, otherwise keep Next.js in foreground.
# Previously this was `exec caddy run` unconditionally — if caddy wasn't
# installed on the Z.ai runtime, the script would die with exit 127 and the
# Next.js background process would become orphaned.
if command -v caddy >/dev/null 2>&1; then
    echo "🚀 Starting Caddy (foreground, main process)..."
    echo "  Caddy path: $(command -v caddy)"
    echo "  Caddy version: $(caddy version 2>&1 || echo 'unknown')"
    echo ""
    echo "💡 Press Ctrl+C to stop all services"
    echo ""
    exec caddy run --config Caddyfile --adapter caddyfile
else
    echo "⚠️  caddy not found in PATH — keeping Next.js as main process"
    echo "    (Next.js PID $NEXT_PID will run in foreground via wait)"
    echo ""
    # Wait on the Next.js process so this script stays alive as PID 1
    wait "$NEXT_PID"
fi
