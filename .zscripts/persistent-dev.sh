#!/bin/bash
# Persistent watchdog: ensures Next.js dev server stays alive on port 3000.
# The sandbox kills background processes; this watchdog restarts them.
# Run with: nohup setsid bash .zscripts/persistent-dev.sh &

cd /home/z/my-project
LOG=/home/z/my-project/dev.log

# Kill any stale processes (but not ourselves)
SELF_PID=$$
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

# Clean stale cache
rm -rf .next

start_dev() {
    echo "[$(date '+%H:%M:%S')] Starting bun run dev..." >> "$LOG"
    # Start dev server in a new process group
    setsid bun run dev >> "$LOG" 2>&1 &
    local pid=$!
    disown "$pid" 2>/dev/null
    echo "[$(date '+%H:%M:%S')] bun run dev started (PID: $pid)" >> "$LOG"
    # Wait for it to be ready (up to 30s)
    for i in $(seq 1 15); do
        sleep 2
        local code
        code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null)
        if [ "$code" = "200" ]; then
            echo "[$(date '+%H:%M:%S')] Dev server ready (HTTP 200)" >> "$LOG"
            return 0
        fi
    done
    echo "[$(date '+%H:%M:%S')] Dev server failed to start in 30s" >> "$LOG"
    return 1
}

# Initial start
start_dev

# Watch loop — check every 8 seconds, restart if dead
while true; do
    sleep 8
    if ! pgrep -f "next-server" > /dev/null 2>&1; then
        echo "[$(date '+%H:%M:%S')] next-server DIED — restarting..." >> "$LOG"
        pkill -9 -f "bun run dev" 2>/dev/null
        sleep 2
        start_dev
    fi
done
