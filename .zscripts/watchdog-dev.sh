#!/bin/bash
# Watchdog: keeps the Next.js dev server alive by restarting it if it dies.
# Used because background processes in this sandbox can be killed unexpectedly.

cd /home/z/my-project

LOG=/home/z/my-project/dev.log

while true; do
    # Check if next-server is running
    if ! pgrep -f "next-server" > /dev/null 2>&1; then
        echo "[$(date '+%H:%M:%S')] next-server not running, starting..." >> "$LOG"
        # Kill any stale bun/next processes
        pkill -9 -f "bun run dev" 2>/dev/null
        pkill -9 -f "next dev" 2>/dev/null
        sleep 1
        # Start dev server
        nohup bun run dev >> "$LOG" 2>&1 &
        DEV_PID=$!
        disown "$DEV_PID" 2>/dev/null
        echo "[$(date '+%H:%M:%S')] Started bun run dev (PID: $DEV_PID)" >> "$LOG"
        # Wait for it to be ready
        for i in 1 2 3 4 5 6 7 8 9 10; do
            sleep 2
            if curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
                if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null)" = "200" ]; then
                    echo "[$(date '+%H:%M:%S')] Dev server is ready (HTTP 200)" >> "$LOG"
                    break
                fi
            fi
        done
    fi
    # Check every 10 seconds
    sleep 10
done
