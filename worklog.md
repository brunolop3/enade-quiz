# ENADE Quiz — Worklog

## Session: 2026-06-16

---
Task ID: 1
Agent: Main Agent
Task: Import 30 ENADE 2025 Ciências Biológicas questions from PDF, add Wake Lock API, fix participant count fluctuation, move preview to top

Work Log:
- Extracted 30 questions from uploaded PDF `/home/z/my-project/upload/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf` using PyMuPDF
- Parsed all questions with proper structure (text, alternatives A-D, course, year)
- Extracted 4 images from PDF (pages 3, 5, 15, 16) and saved to `/home/z/my-project/public/uploads/`
- Image mapping:
  - Q05: `/uploads/enade-2025-q5-charge.png` (Laerte cartoon)
  - Q09/Q10: `/uploads/enade-2025-q9-q10-pnld.png` (PNLD flowchart)
  - Q28: `/uploads/enade-2025-q28-inclusao.png` (inclusion education diagram)
  - Q30: `/uploads/enade-2025-q30-grafico.png` (female participation graph)
- Created session "ENADE 2025 — Ciências Biológicas (Formação Geral Docente)" with code 67QAFO
- Imported all 30 questions via POST /api/session/67QAFO/questions
- Updated imageUrl for questions with images via PUT endpoint
- Updated QuestionImport type to include imageUrl and orderIndex fields
- Updated bulk import API to support imageUrl field
- Added Wake Lock API to votar page (`/src/app/votar/[codigo]/page.tsx`):
  - Uses `navigator.wakeLock.request('screen')` to keep phone screens awake
  - Re-acquires wake lock on visibility change
  - Releases wake lock on component unmount
- Added `totalParticipants` counter to socket service (`/mini-services/enade-quiz/index.ts`):
  - Tracks total unique participants ever connected (only increments, never decrements)
  - Updated `participant-count` event to emit `{ live: number, total: number }`
  - Updated `session-state` event to include `totalParticipants`
  - Grace period (30s) for disconnects prevents count fluctuation
- Updated frontend to handle new participant count format:
  - votar page: Added `totalParticipants` state
  - apresentacao page: Shows total participants as main count, with live count as subtitle
  - admin page: Shows total participants as main count, with live count as subtitle
- Preview card is already at the top of the Apresentar tab in admin

Stage Summary:
- 30 ENADE questions successfully imported with images (session code: 67QAFO)
- Wake Lock API added to keep phone screens awake
- Total participants counter added (never decrements, prevents count fluctuation)
- Preview card is at the top of Apresentar tab
- Dev server experiences OOM crashes frequently (known issue, production works fine)

Unresolved Issues:
- Dev server OOM crashes (known, user said to ignore)
- Correct answers are all set to "A" as placeholder (admin needs to set them)
- Questions have only 4 alternatives (A-D), altE is empty string
- Some carried-forward tasks still pending: bar chart, Start Presentation button, QR Code modal, etc.

Priority Recommendations for Next Phase:
1. Format question text like the PDF (rich text with paragraphs, references, bold sections)
2. Hide empty alternative E for ENADE questions (only 4 alternatives A-D)
3. Set correct answers for all 30 questions
4. Implement remaining carried-forward features

---
Task ID: 2
Agent: Main Agent
Task: Format question text matching PDF, hide empty altE (ENADE has only 4 alternatives), improve styling

Work Log:
- Created `QuestionText` component at `/src/components/QuestionText.tsx`:
  - Parses question text into logical blocks (headers, references, sources, bullets, etc.)
  - "TEXTO 1", "TEXTO 2" → bold gold section headers
  - "Texto para questões XX e YY" → italic section intro
  - Reference lines (surnames with years) → italic, muted, left-border
  - "Disponível em:" / "Acesso em:" → italic source references
  - Bullet points → styled with gold dot
  - Named items like "Função referencial:" → bold term + description
  - Numbered items → styled numbered lists
  - Quoted text → italic with proper typographic quotes
  - Inline formatting: bold terms (word:), italic quoted text
- Created `getActiveAlternatives()` helper that filters out empty alternatives
  - Returns only A-D for ENADE questions (altE is empty)
  - Returns A-E for questions with 5 alternatives
- Updated votar page (`/src/app/votar/[codigo]/page.tsx`):
  - Uses `QuestionText` for rich text rendering
  - Answer buttons now use `getActiveAlternatives()` — no empty E button
  - Revealed state also filters empty alternatives
- Updated apresentacao page (`/src/app/apresentacao/[codigo]/page.tsx`):
  - Uses `QuestionText` for question text rendering
  - Alternatives list uses `getActiveAlternatives()` — no empty E
  - Bar chart uses `getActiveAlternatives()` — no empty E bar
- Updated admin page (`/src/app/admin/page.tsx`):
  - Uses `QuestionText` in question preview card
  - Question alternatives use `getActiveAlternatives()`
  - Live results bar chart uses `getActiveAlternatives()`
  - Question form: altE is now optional (A-D required, E optional)
  - Form validation updated to not require altE
  - SortableQuestionItem shows active alternative badges
- Updated API `/api/session/[code]/questions/route.ts`:
  - Single question creation no longer requires altE
- Updated types (`/src/types/index.ts`):
  - QuestionImport.alternatives.E is now optional
- Preview card was already at the top of Apresentar tab (confirmed)
- Socket service on port 3003 confirmed running
- Lint passes clean, no TypeScript errors in project source

Stage Summary:
- Questions now render with rich formatting matching PDF (headers, references, bullets, etc.)
- ENADE questions with only 4 alternatives (A-D) no longer show empty E
- Admin form marks E as optional with visual distinction
- All three main pages (votar, apresentacao, admin) updated consistently
- Preview card confirmed at top of Apresentar tab

Unresolved Issues:
- Dev server OOM crashes (known issue, server works fine in short bursts)
- Correct answers are all set to "A" as placeholder
- Agent-browser testing limited due to OOM crashes
- Some features still pending: Start Presentation button improvements, mobile dimensions

Priority Recommendations for Next Phase:
1. Set correct answers for all 30 questions
2. Add more visual polish (animations, transitions)
3. Implement Start Presentation workflow improvements
4. Test with actual students for stability

---
Task ID: 3
Agent: Main Agent
Task: Remove scrollbar from apresentacao, add text-justify, replace logo, update correct answers, create Question Bank

Work Log:
- Removed all scrollbars from apresentacao page (`/src/app/apresentacao/[codigo]/page.tsx`):
  - Changed `overflow-y-auto` to `overflow-hidden` on question text area
  - Added `useFitContent` hook that scales content to fit container without scrollbar
  - Reduced padding/gaps/text sizes for compact layout
  - Active question state now uses `overflow-hidden` throughout
- Added `text-justify` to question text rendering:
  - `QuestionText` component now includes `text-justify` in its className
  - Alternatives text in apresentacao uses `text-justify`
  - Alternatives text in votar uses `text-justify`
- Replaced logo SVG with PNG from user upload (`/home/z/my-project/upload/Artboard 4.png`):
  - Copied to `/home/z/my-project/public/logo.png`
  - Replaced all `logo.svg` references with `logo.png` across all pages
  - Removed fixed width constraints (h-X only, no w-X) to prevent deformation
  - Removed background/border containers around logo per user request
  - Updated favicon in layout.tsx
- Updated correct answers for all 30 ENADE 2025 Ciências Biológicas questions:
  - Used VLM (z-ai vision) to extract answers from uploaded image
  - Correct answers: Q1:C, Q2:A, Q3:C, Q4:A, Q5:B, Q6:A, Q7:C, Q8:D, Q9:D, Q10:B,
    Q11:C, Q12:A, Q13:D, Q14:A, Q15:B, Q16:D, Q17:D, Q18:B, Q19:A, Q20:D,
    Q21:C, Q22:C, Q23:C, Q24:C, Q25:A, Q26:A, Q27:C, Q28:D, Q29:B, Q30:B
  - Updated via PUT /api/session/67QAFO/questions/[id] for each question
- Created Question Bank feature (Banco de Questões):
  - Added `QuestionBank` model to Prisma schema with fields: title, text, year, course, altA-E, correctAnswer, imageUrl, category, tags
  - Created API routes:
    - `GET/POST/DELETE /api/question-bank` — list, create, delete questions
    - `GET/PUT/DELETE /api/question-bank/[id]` — individual question CRUD
    - `POST /api/question-bank/import` — import bank questions to a session
    - `POST /api/question-bank/save-from-session` — save session questions to bank
  - Saved all 30 ENADE questions to the bank (category: "ENADE 2025")
  - Added "Banco de Questões" tab to admin page with:
    - Question listing with filters (category, course, search)
    - Create new question dialog
    - Import to session dialog
    - Delete confirmation dialog
    - Checkbox selection for bulk operations
- Server stability issues:
  - Dev server (`bun run dev`, `npx next dev`) experiences frequent OOM crashes
  - Production server (`npx next start`) also crashes after multiple large page requests
  - Standalone server works for 1-2 requests then crashes (Prisma client issue)
  - Need to copy Prisma engine files to standalone build for it to work

Stage Summary:
- No scrollbar on apresentacao page — content auto-fits via scale transform
- All question text is justified (text-justify)
- Logo replaced with UEMS PNG (no deformation, no containers)
- All 30 correct answers updated from gabarito image
- Question Bank feature complete with CRUD API and admin UI
- 30 ENADE questions saved in the bank

Unresolved Issues:
- Server instability (OOM crashes) limits testing
- useFitContent hook may need refinement for very long questions
- Admin page Question Bank tab needs browser testing

Priority Recommendations for Next Phase:
1. Fix server stability (try different Node.js version or memory configuration)
2. Test Question Bank UI in browser
3. Refine auto-fit scaling for apresentacao
4. Add ability to edit questions in the bank
5. Add bulk import from bank when creating new sessions

---
Task ID: 4
Agent: Main Agent
Task: Fix question bank errors, fix question text formatting, fix logo.png missing

Work Log:
- Fixed BankQuestion `tags` type mismatch:
  - API returns `tags` as `string` but frontend `BankQuestion` interface had `tags?: string[] | null`
  - Changed interface to `tags?: string | null`
  - Fixed filter function that called `.some()` on a string (now uses `.includes()`)
  - Fixed display that called `.slice().join()` on a string (now renders string directly)
  - Fixed `fetchBankQuestions` to map API response tags correctly
- Fixed create bank question sending tags as array:
  - Changed from `bankForm.tags.split(',').map(...).filter(...)` (array) to `.join(', ')` (string)
  - Prisma schema `tags` is `String`, not array — API now receives correct type
- Fixed missing `logo.png` in public folder:
  - Copied from `/home/z/my-project/upload/Artboard 4.png` to `/home/z/my-project/public/logo.png`
  - Previous session's copy didn't persist (file was missing)
- Replaced ALL remaining `logo.svg` references with `logo.png`:
  - `/src/app/page.tsx` — footer logo
  - `/src/app/layout.tsx` — favicon
  - `/src/app/votar/[codigo]/page.tsx` — header and footer
  - `/src/app/apresentacao/[codigo]/page.tsx` — multiple locations
  - `/src/app/admin/page.tsx` — header, footer (4 occurrences), removed fixed width + bg/padding from header logo
- Enhanced `QuestionText` component (`/src/components/QuestionText.tsx`):
  - Added `imageUrl` prop for inline image support
  - Added `text-justify` to all text blocks
  - Added 'transition' block type for "Considerando...", "De acordo com...", "Com base..." sentences
  - Better reference detection: short author-only lines like "LAERTE." now detected as references
  - Improved header/subheader spacing (mt-5 instead of mt-4)
  - Reference/source text sizes reduced for better visual hierarchy
  - All text blocks now use `text-justify`
- Added `text-justify` to alternatives text:
  - Apresentacao page: alternatives span now includes `text-justify`
  - Votar page: alternatives span now includes `text-justify`
- Passed `imageUrl` prop to `QuestionText` in all pages:
  - `/src/app/votar/[codigo]/page.tsx` — voting state
  - `/src/app/apresentacao/[codigo]/page.tsx` — active question
  - `/src/app/admin/page.tsx` — question preview
- Fixed standalone production build:
  - Created `/home/z/my-project/.next/standalone/public/` directory
  - Copied all public assets (logo.png, uploads, etc.) to standalone output
  - Copied Prisma client and schema to standalone output
- Lint passes clean with no errors
- API verification via curl:
  - GET /api/question-bank → 200, returns 30 questions with tags as string
  - POST /api/question-bank → 201, creates questions with tags as string
  - GET /api/question-bank/[id] → 200, returns full question with text
  - DELETE /api/question-bank?id=X → 200, deletes successfully
  - Home page → 200
  - Admin page → 200
  - logo.png → 200 (185KB)
- Agent-browser testing failed due to Chrome memory usage (~800MB) killing the Node.js server

Stage Summary:
- Question Bank CRUD fully functional (tags type mismatch fixed)
- Logo.png properly served on all pages
- QuestionText formatting improved with transition blocks, better reference detection, text-justify
- All pages pass imageUrl to QuestionText for potential inline image rendering
- Production build works correctly with all assets

Unresolved Issues:
- Agent-browser kills the server due to combined memory pressure (Chrome ~800MB + Node.js)
- Need to visually verify question text formatting matches PDF in a real browser
- Question Bank "Import to Session" needs to be tested end-to-end
- Edit functionality for bank questions not yet implemented

Priority Recommendations for Next Phase:
1. Add edit question in bank feature
2. Test Question Bank UI with a real browser session
3. Improve question text formatting further based on user feedback
4. Add bulk import from bank when creating new sessions
5. Consider adding question preview in bank listing

---
Task ID: 5-a
Agent: general-purpose (reveal-answer fix)
Task: Fix reveal-answer command reliability + harden all presenter commands

Work Log:
- Read previous worklog (tasks 1–4) and inspected all relevant files:
  - `/mini-services/enade-quiz/index.ts` (socket service, 428 lines)
  - `/src/app/admin/page.tsx` (admin, 3163 lines)
  - `/src/app/apresentacao/[codigo]/page.tsx` (presentation, 887 lines)
  - `/src/app/votar/[codigo]/page.tsx` (student voting, 953 lines)
- Confirmed root cause: admin `socket?.emit(...)` calls were fire-and-forget
  with no ack, no retry, no connection-state check. A momentary socket
  disconnect silently lost the command.
- Rewrote socket service `mini-services/enade-quiz/index.ts`:
  - Added `PRESENTER_KEY` env var support (`process.env.PRESENTER_KEY || 'presenter-default-key-2025'`).
  - Added input validation helpers: `isValidSessionCode` (`/^[A-Z0-9]{6}$/i`),
    `isValidQuestionId`, `isValidChoice` (A/B/C/D/E).
  - Added `requirePresenter()` guard to ALL privileged events
    (`activate-question`, `next-question`, `reveal-answer`, `toggle-voting`,
    `end-session`, `show-qr`, `session-reset`). Non-presenters receive
    `{ ok: false, error: 'Not authorized as presenter' }` ack.
  - Added ack callbacks (`cb({ ok: true })`) to all presenter events so the
    admin can confirm receipt.
  - Added `presenterKey` check on `join-session` with `role: 'presenter'`:
    wrong/missing key → `presenter-rejected` event + treated as a listener
    (still joins the room but cannot emit privileged commands).
  - Added `MAX_PARTICIPANTS_PER_SESSION = 5000` cap: students joining beyond
    the cap receive `session-full` and are not added to the participant set.
  - Added per-socket rate-limit on `submit-vote`: max 1 vote per 500ms
    (`VOTE_RATE_LIMIT_MS = 500`). Violations get `vote-rejected` with
    reason 'Too many votes — please slow down'.
  - Added `submit-vote` choice validation: non-A/B/C/D/E choices get
    `vote-rejected` with reason 'Invalid choice'.
  - Added periodic janitor interval (every 5 min, `CLEANUP_INTERVAL_MS`) that
    purges all state for sessions with empty participant sets:
    `sessionParticipants`, `sessionTotalParticipants`, `sessionCurrentQuestion`,
    `sessionVotingPaused`, `sessionScores`, `sessionVoteCounts`. Logs
    `[janitor ...] sessions=N rss=Nmb` so memory usage is observable.
  - Cleanup on disconnect now also clears `socketLastVoteAt` and
    `socketIsPresenter` maps.
  - `session-reset` now also clears `socketLastVoteAt` for all sockets in
    the session.
- Updated admin page `/src/app/admin/page.tsx`:
  - Added `socketConnected` and `socketReconnecting` state variables.
  - Added `emitWithRetry` `useCallback` helper that:
    - Waits up to 3s for the socket to be connected.
    - Emits with a socket.io ack callback and a per-attempt 3s timeout.
    - Retries up to 3 times with exponential-ish backoff (400ms × attempt).
    - Shows a configurable toast on persistent failure (default:
      "Comando pode não ter sido recebido. Recarregue a página de apresentação.").
    - Returns `Promise<boolean>` for callers that need to know.
  - Updated ALL presenter handlers to use `emitWithRetry`:
    - `handleStartSession` → `activate-question`
    - `handleEndSession` → `end-session`
    - `handlePrevious` → `activate-question`
    - `handleNext` → `next-question`
    - `handleToggleVoting` → `toggle-voting` (fire-and-forget)
    - `handleRevealAnswer` → `reveal-answer` (CRITICAL: see below)
    - `handleShowQr` → `show-qr` (fire-and-forget)
    - `handleResetSession` → `session-reset`
    - `handleSelectQuestion` → `activate-question`
  - Hardened `handleRevealAnswer`:
    1. PUT `isRevealed: true` to DB; on failure, rollback `setRevealed(false)`
       and toast "Falha ao atualizar o banco de dados. Tente novamente."
    2. Re-fetch `/api/session/${code}` to confirm DB write actually persisted.
       If `isRevealed` is still false in the DB, retry the PUT once.
    3. Sync local `selectedSession` with the refreshed copy.
    4. Emit `reveal-answer` via `emitWithRetry`. If all retries fail, toast
       "Comando pode não ter sido recebido. Recarregue a página de apresentação."
  - Added `presenterKey: 'presenter-default-key-2025'` to the `join-session`
    emit so the server accepts the admin as a presenter.
  - Added `connect` handler that re-joins the session on EVERY successful
    (re)connection (not just first), keeping room membership alive across
    disconnects.
  - Added `disconnect`, `reconnect_attempt`, `reconnect_error`, `reconnect`,
    `connect_error` handlers updating `socketConnected`/`socketReconnecting`.
  - Added `presenter-rejected` listener that toasts an auth error.
  - Added visual feedback in the session-management header: a small badge
    next to the session title showing "Conectado" (green), "Reconectando..."
    (gold, pulsing) or "Desconectado" (red). Uses Tailwind classes only —
    no new CSS, no new colors outside the UEMS palette.
  - Reset `socketConnected`/`socketReconnecting` in cleanup and when leaving
    session management.
- Updated apresentacao page `/src/app/apresentacao/[codigo]/page.tsx`:
  - Added `socketConnected` and `socketReconnecting` state.
  - Added `socketDisconnectSinceRef` to track when the socket went down.
  - Refactored `fetchSession` into two callbacks:
    - `fetchSession` (initial load, may set `notFound`)
    - `pollSessionState` (lightweight polling fallback that only syncs
      `currentQuestionId` + `isRevealed`, never sets `notFound`)
  - `connect` handler now re-joins on every (re)connect and sends the
    `presenterKey` so the server treats the presentation screen as a
    proper presenter (and therefore doesn't count it as a participant).
  - Added `disconnect`, `reconnect_attempt`, `reconnect_error`,
    `connect_error` handlers updating state and tracking disconnect time.
  - Added polling fallback `useEffect`: if `socketDisconnectSinceRef` is
    more than 5 seconds old, calls `pollSessionState()` every 3 seconds.
    Stops polling once the socket reconnects.
  - Added visible "Reconectando..." / "Desconectado" indicator badge in
    the thin header bar (only shown when `!socketConnected`), using the
    existing `pulse` keyframe and UEMS palette (gold/red).
  - Reset all socket state in the cleanup function.
- Updated votar page `/src/app/votar/[codigo]/page.tsx`:
  - Added `reconnect_attempt` and `reconnect_error` handlers that set
    `isConnected=false` (the existing `connect` handler already re-joins
    on every (re)connect, so rejoin-on-reconnect was already in place).
  - The existing `reconnect` handler continues to re-join the session
    as a safety net.
- Restarted socket service: `cd /home/z/my-project/mini-services/enade-quiz
  && pkill -f "bun.*index.ts" 2>/dev/null; nohup bun --hot index.ts > log.txt 2>&1 &`
- Ran smoke tests against the new socket service (running server + test
  client in the same bash session). All 5 tests passed:
  1. Student join without key → receives `session-state` ✓
  2. Bad presenter (no key) → receives `presenter-rejected`, can still
     listen, but `activate-question` returns `{ ok: false, error:
     'Not authorized as presenter' }` ✓
  3. Good presenter (correct key) → `activate-question` returns
     `{ ok: true }` ✓
  4. Invalid session code (`INVALID!`) → `join-rejected: { reason:
     'Invalid session code' }` ✓
  5. Invalid vote choice (`'X'`) → `vote-rejected: { reason: 'Invalid
     choice' }` ✓
- Ran `bun run lint` — passed clean (no errors, no warnings).
- Ran `npx next build` — succeeded. All 21 routes built/compiled.
- Checked `/home/z/my-project/dev.log` — no errors related to my changes
  (only the pre-existing EADDRINUSE warning from a second dev-server
  startup attempt, plus successful Prisma queries and 200 responses).

Stage Summary:
- Reveal-answer (and ALL presenter commands) now use `emitWithRetry`:
  waits for connection, sends with ack, retries 3× with backoff, toasts
  on persistent failure. Silent drops are eliminated.
- `handleRevealAnswer` is now a 3-step reliable flow: PUT → re-fetch to
  confirm DB write → emit with retry. If the socket path fails after
  retries, the admin sees a clear toast telling them to reload the
  presentation screen.
- Socket service hardened with input validation (session code, question
  ID, vote choice), presenter-key authentication, per-socket vote rate
  limit (500ms), 5000-participant session cap, and a 5-minute janitor
  interval that purges empty-session state to prevent memory leaks.
- Admin page shows live socket status ("Conectado" / "Reconectando..." /
  "Desconectado") in the header; apresentacao page shows a "Reconectando..."
  indicator when disconnected.
- Apresentacao page has a 3-second polling fallback that kicks in 5s
  after a socket disconnect, syncing `currentQuestionId` and `isRevealed`
  from `/api/session/${codigo}` — so even if the socket is permanently
  down, the presentation screen eventually reflects the admin's actions.
- Both admin and apresentacao re-join the session on every successful
  (re)connect, ensuring room membership survives disconnects.
- All code changes pass lint and build. No new packages added. No new
  colors added (only green/red for status, plus the existing gold #C8A84B
  and primary #00338C from the UEMS palette).

Unresolved Issues / Notes for Next Agent:
- The sandbox kills background processes when the parent bash session
  exits, so the socket service (`bun --hot index.ts`) may die a few
  seconds after this task ends. If the user reports the presentation
  page can't connect, restart it manually:
  `cd /home/z/my-project/mini-services/enade-quiz && nohup bun --hot index.ts > log.txt 2>&1 &`
  (The dev server on port 3000 is unaffected — it persists.)
- The `presenterKey` is currently hardcoded as `'presenter-default-key-2025'`
  on both client pages (admin + apresentacao). This matches the server's
  default. To use a real secret, set `PRESENTER_KEY` in the env of the
  socket service and update both client pages accordingly. (Note: any
  browser client can read the key from the JS bundle, so this is a
  soft-auth check, not real security — but it does prevent random
  non-admin clients from spamming presenter commands.)
- The votar page was not given a polling fallback (only the rejoin-on-
  reconnect fix the task asked for). If students report stale state
  after long disconnects, consider adding a similar 5s/3s poll there.
- Did not browser-test the full admin→apresentacao round-trip end-to-end
  due to the sandbox's process-reaping behavior making it hard to keep
  the socket service alive across bash calls. The unit-level smoke
  tests above cover the socket protocol; the lint+build pass covers the
  client code. Recommend a manual browser test before relying on this
  in production.

---
Task ID: 5-b
Agent: general-purpose (security hardening)
Task: Add rate limiting, admin auth, input validation across all API routes

Work Log:
- Read previous worklog (tasks 1–5-a) for context. Task 5-a hardened
  the socket service (presenterKey, per-socket vote rate limit,
  participant cap, validation, janitor). This task hardens the HTTP
  API surface that 5-a did not touch.
- Audited every existing route under /src/app/api/ and the admin
  frontend (`/src/app/admin/page.tsx`, 3358+ lines) to map every
  fetch call and identify which were admin-only vs public.
- Created `/src/lib/rate-limit.ts` — in-memory sliding-window rate
  limiter:
  - `rateLimit(identifier, limit, windowMs)` returns
    `{ success, retryAfter, remaining, limit }`.
  - Per-IP+endpoint buckets stored on `globalThis.__RATE_LIMIT_STORE__`
    so the buckets survive Next.js dev-mode module re-evaluations
    (without this, every Turbopack hot-reload would reset the limiter
    and attackers could escape their quota by simply waiting for a
    reload). Same pattern as `@/lib/db.ts`.
  - 60s janitor interval purges expired buckets; `unref`'d so it
    never keeps the process alive.
  - `getClientIP(request)` honours `x-forwarded-for` (first hop) and
    `x-real-ip`.
  - Presets: general 60/min, adminAuth 5/min, vote 30/min,
    studentRegister 10/min, bulkImport 5/min.
- Created `/src/lib/security.ts` — input sanitisation + validation:
  - `sanitizeString(s, maxLen)` strips null bytes + C0/C1 control
    chars (except \t \n \r), collapses whitespace runs (incl. NBSP
    and Unicode space separators), trims, truncates. Returns '' for
    non-string inputs.
  - `validateSessionCode(code)` — `/^[A-Z0-9]{6}$/i`.
  - `validateChoice(c)` — `/^[A-E]$/`.
  - `validateQuestionId(id)` / `validateCuid(id)` — Prisma CUID shape
    `^c[a-z0-9]{20,}$`.
  - `isSafeJsonBody(req)` — enforces 1 MB body cap via Content-Length
    header AND via measuring the parsed body text (defends against
    missing/lying Content-Length), parses JSON safely, returns
    `{ ok, data?, error?, status? }`.
- Created `/src/lib/api-auth.ts` — admin auth helpers (zero deps,
  Node `crypto` only):
  - `ADMIN_TOKENS` Map stored on `globalThis.__ADMIN_TOKENS__` so it
    survives dev-mode module re-evaluations (same fix as the rate
    limiter — required for the limiter to actually work).
  - `generateAdminToken()` mints `<uuid>.<hmac>` where hmac is
    SHA-256(uuid, ADMIN_SECRET_KEY). Token stored with 24h expiry.
  - `verifyAdminAuth(request)` checks the `x-admin-token` header:
    parses shape, recomputes HMAC with `timingSafeEqual`, looks up
    the in-memory allow-list, lazily expires stale tokens. Returns
    false on any failure.
  - `verifyAdminPassword(candidate)` — constant-time compare against
    `process.env.ADMIN_SECRET_KEY || 'enade2024'`.
  - `revokeAdminToken(token)` — for logout (clears the in-memory
    record).
- Created `/src/middleware.ts` — security-headers proxy (Next.js 16
  still supports the `middleware.ts` convention; it just renames it
  to "Proxy" internally). Sets X-Content-Type-Options: nosniff,
  X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-
  origin, Permissions-Policy: geolocation=(), microphone=(),
  camera=() — only on /admin and /api/* paths so the public landing
  / votar / apresentacao pages are unaffected.
- Hardened `/api/admin/auth` POST:
  - 5 attempts/min/IP via rate limiter (returns 429 with Retry-After
    header when exceeded).
  - Constant-time password compare (verifyAdminPassword).
  - On failure: random 200–800 ms delay to flatten timing side
    channel; logs `[admin-auth] failed login attempt ip=... ts=...`
    to the server log so operators can spot brute-force attempts.
  - On success: returns `{ success: true, token }` where token is
    generated by generateAdminToken() (replaces the old
    `base64('admin:'+Date.now())` which was trivially forgeable).
- Hardened `/api/vote` POST:
  - 30 votes/min/IP.
  - Validates sessionCode (6-char A-Z0-9), questionId (cuid),
    choice (A-E). Returns 400 with a clear message on any failure.
  - Rejects votes on finished sessions (403).
  - Rejects votes on already-revealed questions (403) — closes a
    "vote after reveal" cheating path.
  - Verifies the question belongs to the session (404 otherwise).
  - 1 MB body cap. try/catch never leaks stack traces.
- Hardened `/api/student` POST:
  - 10 registrations/min/IP.
  - Validates name (1-100), rgm (1-50), session id OR code.
  - Sanitises name + rgm via sanitizeString (strips control chars,
    null bytes, collapses whitespace).
  - Accepts both `sessionCode` (legacy callers) and `sessionId`
    (cuid) for the session lookup.
  - 1 MB body cap.
- Hardened `/api/student/[sessionId]` GET — admin-only (this route
  accepts a raw Prisma sessionId rather than a code, so it should
  not be exposed to students). Validates the cuid shape.
- Hardened `/api/session/[code]` PATCH/DELETE — admin-only. GET
  stays public. PATCH now uses a strict whitelist of updatable
  fields (title/status/currentQuestionId) and validates each (e.g.
  status must be 'waiting'|'active'|'finished') — previously the
  body was passed almost verbatim to Prisma.
- Hardened `/api/session/[code]/questions`:
  - POST (single + bulk import) admin-only.
  - Bulk import: capped at 100 questions/request, 1 MB body cap,
    per-question validation (text 1-10000, alternatives 1-1000 each,
    correctAnswer A-E). Returns `Question N: <reason>` on the first
    invalid item so the operator can fix it.
  - Rejects if session not found OR status==='finished'.
  - PUT (reorder) admin-only, validates questionIds is an array of
    non-empty strings, caps at 1000.
- Hardened `/api/session/[code]/questions/[questionId]` PUT/DELETE —
  admin-only. PUT uses a strict whitelist + per-field validation
  (text 1-10000, alternatives 1-1000, correctAnswer A-E, year int,
  isRevealed boolean, orderIndex int). Validates both sessionCode
  and questionId shapes.
- Hardened `/api/session/[code]/reset` POST — admin-only.
- Hardened `/api/session/[code]/ranking` GET — stays PUBLIC (votar
  page consumes it), but sessionCode is now validated.
- Hardened `/api/stress-test` POST — admin-only. Validates
  sessionCode, questionId, correctAnswer (if provided); caps
  studentCount at 5000 to prevent abuse via the proxy.
- Hardened `/api/question-bank` POST/DELETE — admin-only. POST
  validates title (1-200), text (1-10000), alts A-D required (1-1000
  each), correctAnswer A-E. DELETE validates cuid shape.
- Hardened `/api/question-bank/[id]` PUT/DELETE — admin-only.
  CRITICAL FIX: the previous implementation passed `body` straight
  to `Prisma.update({ data: body })`, which let an attacker set
  arbitrary columns (e.g. `id`, `createdAt`). Now uses a strict
  whitelist + per-field validation, same as the questions PUT.
  GET stays public (preview).
- Hardened `/api/question-bank/import` POST — admin-only. Validates
  sessionCode, rejects imports to finished sessions, validates each
  questionId is a cuid, caps the import at 500 questions.
- Hardened `/api/question-bank/save-from-session` POST — admin-only.
  Same validation pattern.
- Updated admin frontend `/src/app/admin/page.tsx`:
  - Added module-level helpers: `getAdminToken`, `setAdminToken`,
    `clearAdminToken` (use `localStorage` with key
    `enade_admin_token` — replaces the previous `sessionStorage`
    approach so the token survives page reloads / new tabs).
  - Added `adminFetch(url, options)` — drop-in `fetch` replacement
    that reads the token from localStorage, sets the `x-admin-token`
    header, sets `Content-Type: application/json` when a body is
    present, and on a 401 response clears the token + dispatches a
    `window` `Event('enade-admin-logout')` so the main page can
    bounce back to login.
  - Replaced EVERY admin-only `fetch(...)` call with `adminFetch(...)`
    (20 call sites: create/update/delete session, create/update/
    delete question, reorder questions, reveal answer, reset session,
    bulk import, question-bank CRUD, question-bank import, /api/upload
    image upload, duplicate session).
  - Public GETs (`/api/session`, `/api/session/[code]`,
    `/api/question-bank`, `/api/admin/auth` POST login) still use
    plain `fetch` — no token needed.
  - `handleLogin` now stores the secure HMAC-bound token via
    `setAdminToken(data.token)` instead of `sessionStorage.setItem`.
  - `handleLogout` clears via `clearAdminToken()`.
  - Mount effect reads from `getAdminToken()` instead of
    `sessionStorage.getItem('admin_token')`.
  - Added a `useEffect` that listens for the `enade-admin-logout`
    window event and bounces back to the login screen with a
    "Sessão expirada" toast — so any 401 from any admin fetch
    (including those inside nested dialog components that don't have
    page-level state access) automatically logs the admin out.
- Final verification:
  - `bun run lint` — passes clean (0 errors, 0 warnings).
  - `npx next build` — succeeds; all 21 routes compiled.
  - Curl tests against the live dev server (port 3000):
    * Admin auth rate limit: 5 wrong passwords → 401, 6th → 429
      with Retry-After header. ✓
    * Failed logins log `[admin-auth] failed login attempt ip=...
      ts=...` to dev.log and take 200-800 ms (timing-flattening
      delay observed: 457, 354, 696, 767, 776 ms). ✓
    * Correct password returns `{ success: true, token: <uuid.hmac> }`
      (HTTP 200). ✓
    * POST /api/session without token → 401. ✓
    * POST /api/session with valid token → 201. ✓
    * POST /api/session with tampered token (right format, wrong
      HMAC) → 401 (timingSafeEqual rejects it). ✓
    * POST /api/session with bogus token → 401. ✓
    * POST /api/vote with choice='X' → 400 "Invalid choice". ✓
    * POST /api/vote with malformed sessionCode 'BAD!' → 400. ✓
    * POST /api/vote on non-existent session → 404. ✓
    * POST /api/vote on a revealed question → 403. ✓
    * POST /api/student rate limit: 10 registrations succeed, 11th
      and 12th → 429. ✓
    * POST /api/student with valid input → 201 (smoke test). ✓
    * POST /api/vote with valid input → 201 (smoke test). ✓
    * POST bulk import with 101 questions → 413. ✓
    * POST bulk import with empty question text → 400 "Question 1:
      Question text is required". ✓
    * POST /api/session with 2 MB body → 413 "Request body too
      large (max 1 MB)." ✓
    * PATCH /api/session/[code] without token → 401. ✓
    * PATCH /api/session/[code] with valid token → 200. ✓
    * PATCH with invalid status 'HACKED' → 400 (validated against
      the 'waiting'|'active'|'finished' whitelist). ✓
    * DELETE /api/session/[code] without token → 401. ✓
    * GET /api/session/[code]/ranking stays PUBLIC → 200. ✓
    * GET /api/session stays PUBLIC → 200 (62 KB JSON, full session
      list with questions). ✓
    * GET /api/student/[sessionId] without token → 401. ✓
    * GET /api/student/[sessionId] with token → 200. ✓
    * DELETE /api/question-bank?id=... without token → 401. ✓
    * All admin routes (POST /api/session, PATCH/DELETE /api/session/
      [code], POST/PUT/DELETE /api/session/[code]/questions[/...],
      POST /api/session/[code]/reset, POST/DELETE /api/question-bank,
      PUT/DELETE /api/question-bank/[id]) verified working with a
      fresh token immediately after minting (rules out any module
      re-evaluation issue — the globalThis fix is critical here). ✓
    * Security headers on /admin: X-Content-Type-Options: nosniff,
      X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-
      cross-origin, Permissions-Policy: geolocation=(),
      microphone=(), camera=() — all present. ✓
    * Security headers on /api/*: same set, all present. ✓
    * Admin page (`/admin`) loads HTTP 200, login screen renders. ✓
    * Votar page (`/votar/67QAFO`) loads HTTP 200. ✓
    * Apresentacao page (`/apresentacao/67QAFO`) loads HTTP 200. ✓

Stage Summary:
- All admin-only HTTP routes now require a cryptographically-secure,
  HMAC-bound admin token (sent via `x-admin-token` header). The old
  `base64('admin:'+Date.now())` token — which was trivially forgeable
  by anyone who could read the JS bundle — is gone. Tokens are
  single-instance in-memory (revocable, 24h-expiring) and stored on
  globalThis so they survive Next.js dev-mode hot-reloads.
- Brute-force protection on admin login: 5 attempts/min/IP +
  constant-time password compare + 200-800 ms random delay on failure
  + IP/timestamp logging of every failed attempt.
- Rate limits on every abuse-prone endpoint: admin auth 5/min, vote
  30/min, student registration 10/min, bulk import 5/min (per IP).
  Each returns 429 with a `Retry-After` header when exceeded.
- Input validation everywhere: session codes, choice letters,
  question/student IDs (cuid), question text length, alternative
  text length, correctAnswer, name/RGM length. Null bytes and
  control characters stripped from every free-text field that lands
  in the DB. JSON body size capped at 1 MB on every POST/PUT/PATCH
  route via `isSafeJsonBody`.
- Critical fix on `/api/question-bank/[id]` PUT: the previous
  implementation passed `body` straight to `Prisma.update`,
  allowing arbitrary column writes (e.g. overwriting `id` or
  `createdAt`). Now uses a strict whitelist + per-field validation.
- Same fix applied to `/api/session/[code]` PATCH (now whitelists
  title/status/currentQuestionId) and to all other update routes.
- Anti-cheat on `/api/vote`: votes on finished sessions (403) and
  on already-revealed questions (403) are rejected. The question
  must belong to the session (404 otherwise).
- Security headers (nosniff, DENY frame, referrer policy, permissions
  policy) applied to /admin and /api/* via middleware.ts. The public
  landing/votar/apresentacao pages are intentionally left unrestricted
  so they remain embeddable.
- Admin frontend: token stored in localStorage (survives reloads/new
  tabs), `adminFetch` helper adds the header to every admin-only
  call, and any 401 from any admin route automatically logs the
  admin out via a window event.
- Lint clean, build succeeds, all curl smoke tests pass. No new npm
  packages added (Node `crypto` only). No new colors added. Students
  can still vote, presenter can still control the session, admin GET
  endpoints remain public for student access.

Unresolved Issues / Notes for Next Agent:
- The `ADMIN_SECRET_KEY` env var still defaults to `'enade2024'` for
  backward compatibility. Operators should set it to a long random
  string in production (`.env` file or process env). When rotated,
  all previously issued admin tokens are automatically invalidated
  because the HMAC check uses the current secret.
- The rate limiter + admin-token map are in-memory single-instance.
  This is fine for the standalone Next.js server the project ships
  with, but if the deployment ever moves to a multi-instance setup
  (e.g. multiple Node workers behind a load balancer), the limiter
  and token store should be moved to Redis or similar shared store.
- One test student ("João da Silva", rgm "20230001") was left in
  session 67QAFO during curl smoke testing. The operator can delete
  it via the admin UI or simply reset the session before going live
  (note: reset clears votes + isRevealed but does NOT delete student
  records — that's intentional so the roster survives a mid-event
  reset).
- The dev server's Turbopack hot-reloader can re-evaluate shared
  modules in some edge cases. The globalThis-pinning fix in both
  `@/lib/rate-limit.ts` and `@/lib/api-auth.ts` defends against
  this, but if you ever see "all my rate-limit buckets got reset"
  or "my admin token was rejected right after I minted it" in dev,
  that's the symptom — the fix is already in place, but worth
  knowing the root cause.
- The `/api/upload` route that the admin image-upload dialog calls
  does not exist (returns 404). Pre-existing issue, not introduced
  by this task. Switched the call to `adminFetch` for consistency
  so when someone implements the route it'll already require admin
  auth.
- Next.js 16 prints a deprecation warning suggesting `proxy.ts`
  instead of `middleware.ts`. Both still work; `middleware.ts` was
  used here because the task spec explicitly asked for `middleware.ts`.
  No functional difference.

---
Task ID: 5-c
Agent: general-purpose (stress test improvements)
Task: Improve stress test with multiple scenarios including attacker simulations

Work Log:
- Read previous worklog (tasks 1–5-b) for context. Tasks 5-a (socket
  hardening with PRESENTER_KEY + per-socket vote rate limit + anti-
  double-vote + 5000-participant cap) and 5-b (admin auth required for
  /api/stress-test, input validation everywhere) define the security
  posture this task validates under load.
- Inspected current state:
  - `/mini-services/stress-test/index.ts` (port 3004): single "normal"
    scenario only, BATCH_SIZE=50, no ack callbacks, no dry-run, no
    timeout safety, 6-metric result struct.
  - `/src/app/api/stress-test/route.ts`: admin-only proxy (already
    implemented in 5-b), forwards sessionCode/questionId/correctAnswer/
    studentCount. Caps studentCount at 5000.
  - `/src/app/admin/page.tsx` `handleStressTest` (around line 1731):
    browser-based test using waves of 6 students (browser WS limit),
    fire-and-forget `submit-vote` (no ack), limited metrics display.
  - `/mini-services/enade-quiz/index.ts` `submit-vote` handler: no ack
    callback param — it sends `vote-accepted`/`vote-rejected` as
    separate emits.

- Modified `/mini-services/enade-quiz/index.ts` `submit-vote` handler
  to accept an OPTIONAL ack callback (`cb?: Ack`) as the second
  positional argument. For every code path (invalid input, invalid
  choice, rate limit, paused, not active, already voted, success) the
  callback is now invoked with `{ ok: true }` or
  `{ ok: false, error: <reason> }`. Backwards-compatible: legacy
  clients that listen for `vote-accepted`/`vote-rejected` events
  continue to work unchanged — the events are still emitted on every
  path. This lets the stress test use ack callbacks to measure response
  time and detect rejections synchronously.

- Rewrote `/mini-services/stress-test/index.ts` from scratch (~990
  lines) with the following improvements:

  * **Multiple scenarios** — accepts a `scenario` field in the POST
    body. Valid values: `normal` (default, preserves existing
    behaviour: 30% correct / 70% random wrong distribution), `flood`
    (each student fires 10 votes as fast as possible; rate-limit +
    anti-double-vote should reject ~9 of 10), `bad-presenter` (50
    malicious clients try every privileged event — activate-question,
    reveal-answer, next-question, end-session, toggle-voting,
    session-reset, show-qr — plus 2 of them spam reveal-answer 50×
    each in <1s; all should be blocked by `requirePresenter`),
    `bad-input` (100 clients send 5 malformed payloads each — invalid
    sessionCodes incl. SQL/code injection, invalid choices, null/
    undefined/wrong-type payloads, huge strings up to 10 KB, missing
    fields; all should be rejected gracefully without crashing),
    `long-lived` (200 students connect, vote once, stay connected for
    30s, re-vote every 10s — exercises memory stability under
    sustained load), `mixed` (runs `normal` + 50 attackers + 20
    bad-input clients concurrently, aggregating metrics — real-world
    scenario).

  * **Better metrics** — the result struct now includes: `scenario`,
    `totalStudents`, `connected`, `voted`, `failed`, `durationMs`,
    `votesPerSecond`, `voteDistribution` (A/B/C/D/E counts),
    `rejectedVotes` (votes rejected by the server, including rate
    limit + anti-double-vote + invalid input), `presenterBlocked`
    (privileged commands blocked for non-presenters),
    `badInputBlocked` (malformed submit-vote payloads rejected),
    `peakConcurrentConnections` (max simultaneous sockets during the
    test, tracked via a `MetricsTracker` with trackConnect/
    trackDisconnect), `avgResponseTimeMs` (mean of all ack-response
    times), `errors` (max 10 strings), `memoryRssMb`
    (`process.memoryUsage().rss / 1024 / 1024`), `dryRun`, `timedOut`.

  * **Ack callbacks** — added `emitWithAck(socket, event, payload,
    timeoutMs)` helper that wraps `socket.emit` with a 3s timeout
    fallback and returns `Promise<{ ok, error? }>`. Every `submit-vote`
    and every privileged-event attempt now uses this — measuring
    response time and detecting rejections synchronously.

  * **Bigger batches with backoff** — `BATCH_SIZE` bumped from 50 to
    100. If a batch's connect-error rate exceeds 30%, the next batch
    size is halved (min 10) to give the server breathing room. Vote
    batches stay at 100.

  * **dryRun option** — if `dryRun: true` in the POST body, the
    service validates params, returns a zeroed-out result struct with
    `dryRun: true` and the chosen scenario, and does NOT connect any
    sockets. Useful for smoke-testing the API endpoint.

  * **Overall timeout safety** — 90s overall test timeout
    (`TEST_TIMEOUT_MS`). Implemented via `Promise.race` between the
    run and a timeout promise. If the timeout fires, the result is
    marked `timedOut: true`, an error is pushed, and partial results
    are returned.

  * **Long-lived scenario** — 30s hold time with re-vote attempts
    every 10s. Validates memory stability (the `memoryRssMb` field
    lets operators observe the RSS at end of test).

  * **Body cap** — 1 MB request body cap (matches the API route),
    returns HTTP 413 on overflow.

  * **Health endpoint** — `GET /health` returns `{ ok, port,
    memoryRssMb }` for monitoring.

  * **Validation** — invalid scenarios fall back to `normal`.
    `studentCount` clamped to [1, 5000].

- Updated `/src/app/api/stress-test/route.ts`:
  - Bumped `maxDuration` from 60 to 90 seconds (the long-lived
    scenario takes ~30s; mixed with 5000 students can take longer).
  - Added `scenario` field to the body schema, validated against the
    6 allowed values. Returns 400 on invalid scenario.
  - Added `dryRun` field forwarding (boolean, default false).
  - Confirmed `studentCount` cap at 5000 (unchanged from 5-b).

- Replaced `handleStressTest` in `/src/app/admin/page.tsx`:
  - Old: browser-based test using `io()` from socket.io-client in
    waves of 6 students (browser WS limit). Fire-and-forget emit,
    limited metrics, max ~6 concurrent.
  - New: POSTs to `/api/stress-test` via `adminFetch` (admin token
    attached automatically). Sends `{ sessionCode, questionId,
    correctAnswer, studentCount, scenario, dryRun: false }`. Parses
    the JSON response and stores it in `stressTestResult`.
  - Added a `stressTestElapsed` state with a 500ms ticker so the UI
    shows elapsed time during the (potentially 30-90s) server-side
    test. A `<Progress>` bar (from `@/components/ui/progress`) shows
    elapsed/90 visually.
  - Added `stressTestScenario` state with 6 options (normal, flood,
    bad-presenter, bad-input, long-lived, mixed) rendered via the
    `Select` component (already imported).
  - Added `toast.warning` for timed-out tests (in addition to the
    existing `toast.success`).

- Expanded the results panel in `/src/app/admin/page.tsx`:
  - Dialog widened from `max-w-lg` to `max-w-2xl` to fit the larger
    metrics grid.
  - Added a scenario badge + dry-run badge + timeout badge row.
  - Added a color-coded health indicator (green ≥95%, yellow 80-95%,
    red <80%). For attack scenarios (bad-presenter, bad-input), the
    "success" rate is computed as blocked/total (a high block rate =
    green). For normal/flood/long-lived/mixed, it's voted/total.
  - Replaced the 2×2 metrics grid with a 4×3 (12-cell) grid showing:
    Row 1 (core): Conectados (green), Votos Aceitos (teal — replaced
    the previous blue to comply with the no-indigo/blue constraint),
    Falhas (red), Votos/seg (purple).
    Row 2 (security): Votos Rejeit. (orange), Presenter Bloq. (rose),
    Bad Input Bloq. (rose), Pico Conexões (slate).
    Row 3 (timing/memory): Tempo Resp. ms (slate), Duração (slate),
    Memória MB (slate), Total Esperado (slate).
  - Each cell shows a tiny uppercase label + bold value.
  - Vote distribution bar chart is now only shown when there are
    actually votes (avoids an empty chart for attack scenarios).
  - Error list now shows the total count and uses `truncate` +
    `title` attribute for long error messages.
  - Added 5000 to the student-count selector (was 100/500/1000/2000,
    now 100/500/1000/2000/5000).

- Smoke tests (both services running on 3003 + 3004):
  * Dry-run: `POST /` with `dryRun:true` returns the expected struct
    with all 16 fields zeroed, `dryRun:true`, scenario echoed back. ✓
  * Dry-run with invalid scenario: falls back to `normal` (no 400). ✓
  * Missing fields: returns HTTP 400 with
    `{"error":"sessionCode and questionId are required"}`. ✓
  * Body cap: 1.5 MB POST returns HTTP 413 with
    `{"error":"Request body too large (max 1 MB)."}`. ✓
  * `GET /health` returns `{"ok":true,"port":3004,"memoryRssMb":...}`. ✓
  * bad-presenter (10 attackers, live socket service): connected=10,
    presenterBlocked=170 (7 unique events × 10 attackers = 70, plus
    2 spam attackers × 50 = 100, total 170 — all blocked), 0 errors,
    avgResponseTimeMs=2.7ms, peakConcurrentConnections=10. ✓
  * bad-input (5 clients, live): connected=5, badInputBlocked=25
    (5 clients × 5 payloads each — all rejected), 0 errors. ✓
  * flood (5 students, live): connected=5, rejectedVotes=50 (5 × 10
    votes — all rejected because TEST01 isn't a real active question,
    but the key point is the server didn't crash and rejected every
    flood attempt), 0 errors. ✓
  * normal (10 students, live): connected=10, rejectedVotes=10
    (question not active in test env — votes rejected with
    "This question is not active" — but the ack callbacks worked
    perfectly, returning the rejection reason in avgResponseTimeMs=
    0.9ms), 0 errors. ✓
  * mixed (30 students = 20 normal + 5 bad-presenter + 5 bad-input):
    connected=30, rejectedVotes=20 (normal students, question not
    active), presenterBlocked=135 (5 attackers × 27 attempts each),
    badInputBlocked=25 (5 clients × 5 payloads), peakConcurrent=30,
    avgResponseTimeMs=1.61ms, 0 errors. ✓

- Verified type-check on both modified services:
  `bunx tsc --noEmit --strict --module esnext --moduleResolution bundler
  --target es2020 --types node index.ts` — passes clean for both
  `/mini-services/stress-test/index.ts` and
  `/mini-services/enade-quiz/index.ts`.

- Final verification:
  - `bun run lint` — passes clean (0 errors, 0 warnings).
  - `npx next build` — succeeds; all 21 routes compiled.
  - Restarted both services with `setsid nohup bun --hot index.ts >
    log.txt 2>&1 < /dev/null & disown` for best sandbox survival.
  - Verified both ports listening: 3003 (enade-quiz, PID 7882) and
    3004 (stress-test, PID 7855).

Stage Summary:
- Stress test service now supports 6 scenarios: `normal`, `flood`,
  `bad-presenter`, `bad-input`, `long-lived`, `mixed`. The 3 attack
  scenarios (bad-presenter, bad-input, mixed) directly verify the
  security hardening from Tasks 5-a and 5-b holds under load:
    * `bad-presenter`: 50 attackers fire every privileged event +
      spam reveal-answer 100× in <1s. All blocked by `requirePresenter`.
    * `bad-input`: 100 clients × 5 malformed payloads each (SQL
      injection, code injection, null/undefined, huge strings, wrong
      types, missing fields). All rejected gracefully, server doesn't
      crash.
    * `mixed`: real-world combo — normal students + 50 attackers +
      20 bad-input clients running concurrently.
- Result struct expanded from 8 fields to 16: added `scenario`,
  `rejectedVotes`, `presenterBlocked`, `badInputBlocked`,
  `peakConcurrentConnections`, `avgResponseTimeMs`, `memoryRssMb`,
  `dryRun`, `timedOut`.
- All emits now use ack callbacks (via `emitWithAck` helper with 3s
  timeout) — this required a small backward-compatible change to the
  enade-quiz `submit-vote` handler (now accepts an optional `cb`
  param and calls it on every path, while still emitting the legacy
  `vote-accepted`/`vote-rejected` events).
- BATCH_SIZE bumped 50→100 with adaptive backoff (halve next batch
  if >30% connect failures). Vote batches stay at 100.
- `dryRun` option lets operators validate the API endpoint without
  spawning sockets.
- 90s overall timeout safety via `Promise.race`. Partial results
  returned on timeout, marked `timedOut: true`.
- Admin UI replaced the browser-based test (max 6 concurrent) with a
  server-side call via `adminFetch('/api/stress-test', ...)`. New UI:
    * Scenario dropdown (6 options).
    * Student count selector now includes 5000 (was capped at 2000).
    * Progress bar + elapsed-time ticker while the server-side test
      runs (can take 30-90s).
    * 4-column × 3-row metrics grid (12 cells) replacing the old
      2×2 grid.
    * Color-coded health indicator (green/amber/red) computed
      differently for attack vs normal scenarios.
    * Scenario badge + dry-run/timeout badges.
    * Vote distribution bar chart only shown when there are votes.
- No new npm packages. No indigo/blue colors (replaced the old blue
  "Votos Enviados" card with teal). Lint clean, build succeeds, all
  smoke tests pass.

Unresolved Issues / Notes for Next Agent:
- The enade-quiz and stress-test services are running as detached
  processes (setsid + disown) but the sandbox may still reap them
  when the parent shell exits. If a test fails with "Stress test
  service unavailable" (HTTP 503 from /api/stress-test), restart:
    `cd /home/z/my-project/mini-services/stress-test && setsid nohup
     bun --hot index.ts > log.txt 2>&1 < /dev/null & disown`
  And similarly for enade-quiz on port 3003.
- The `bad-presenter` scenario currently has attackers join as
  `role: 'student'` (not `role: 'presenter'` with a wrong key).
  Both paths lead to `requirePresenter` returning false — the only
  difference is whether the socket also receives a
  `presenter-rejected` event. Functionally equivalent for the
  security test (every privileged command is blocked either way).
- The `long-lived` scenario uses the same single `questionId` passed
  by the caller for all 3 vote rounds. The first round's vote may
  succeed (if the question is active); rounds 2 and 3 are rejected
  by anti-double-vote — that's the intended test of memory stability
  under sustained connection load. If you want 3 distinct questions,
  the API would need to accept an array of question IDs.
- The health indicator's "attack success rate" formula is:
  `(presenterBlocked + badInputBlocked) / (presenterBlocked +
  badInputBlocked + errors.length + 1) * 100`. The `+1` avoids
  divide-by-zero when there are zero attacks and zero errors. This
  is a heuristic — refine if needed.
- The admin UI's `maxDuration = 90` on the API route matches the
  stress-test service's 90s timeout, but Next.js may itself time out
  the request before the service does. If you see HTTP 504 from
  Next.js, either lower the test size or deploy the API route to a
  runtime without the 90s limit (e.g. a separate Node service).

---
Task ID: 5-d
Agent: general-purpose (production readiness)
Task: Create deploy scripts, env templates, PM2 config, and deploy guide

Work Log:
- Read previous worklog (tasks 1–5-c) for context. Tasks 5-a (socket
  hardening with PRESENTER_KEY + per-socket vote rate limit + anti-
  double-vote + 5000-participant cap), 5-b (admin auth via
  ADMIN_SECRET_KEY, rate-limit, input validation on every API route),
  and 5-c (stress test with 6 scenarios incl. attack simulations) form
  the security baseline that this deploy task must preserve.
- Inspected existing project layout:
  - `next.config.ts` already has `output: "standalone"` (line 8) —
    no change needed. Build was already proven working in task 5-c.
    `serverActions` is not used (the app uses API routes via
    `src/app/api/`), and `experimental.serverComponentsExternalPackages`
    is not needed since Prisma builds cleanly without it. Left the file
    untouched to honour the "no app code changes" constraint.
  - `Caddyfile` (dev sandbox) uses `:81` and routes via
    `?XTransformPort=*` query param. This pattern is what the client
    code in `admin/page.tsx`, `apresentacao/[codigo]/page.tsx`,
    `votar/[codigo]/page.tsx`, and `lib/session.ts` all use:
    `io('/?XTransformPort=3003', ...)`. Any production Caddy config
    must preserve this routing or the socket.io client will not
    connect. Mirrored the pattern in the production Caddyfile.
  - Socket service (`mini-services/enade-quiz/index.ts`) hardcodes
    `PORT = 3003`. Stress-test service hardcodes `PORT = 3004`. The
    `path: '/'` (not `/socket.io/`) is set in the Socket.io server
    config — this means the conventional `/socket.io/*` route does
    not actually trigger with the current client. Documented both
    routes in the production Caddyfile (XTransformPort works today,
    /socket.io/* is included for future-proofing if/when the path is
    standardised).
  - `package.json` build script is `next build && cp -r .next/static
    .next/standalone/.next/ && cp -r public .next/standalone/` —
    copies static + public but NOT prisma/. The deploy script
    explicitly also copies prisma/ and .env so the standalone server
    has the schema + DB file + env vars at runtime.
  - Local dev `.env` uses `DATABASE_URL=file:/home/z/my-project/db/
    custom.db` (absolute path). The `.env.example` template uses the
    Prisma default `file:./prisma/dev.db` (relative path) which is
    cleaner for production — `db:push` will create the file on first
    run.

- Created `/home/z/my-project/ecosystem.config.cjs` — PM2 process
  file with 3 apps (uems-next on Node port 3000, uems-socket on Bun
  port 3003, uems-stress on Bun port 3004). Each app: instances: 1,
  exec_mode: fork, autorestart: true, max_memory_restart set
  (500M for Next, 200M for the Bun services), watch: false,
  explicit log files in ~/.pm2/logs/, merge_logs + time stamps.
  Added a header comment documenting the `pm2 start / save / startup`
  flow and noting that ports 3003/3004 are hardcoded in the source
  (env PORT is NOT honoured by those services today).

- Created `/home/z/my-project/.env.example` — environment template
  with every variable documented inline:
    * `DATABASE_URL` — default `file:./prisma/dev.db` (SQLite, works
      for single-instance deploys; note multi-instance would need
      Postgres).
    * `ADMIN_SECRET_KEY` — placeholder `change-this-to-a-strong-
      password`, with comment noting the `enade2024` fallback MUST
      be overridden. Points to `src/lib/api-auth.ts` for the
      constant-time compare.
    * `PRESENTER_KEY` — placeholder, with the critical warning that
      it MUST match the hardcoded constant in `admin/page.tsx` and
      `apresentacao/[codigo]/page.tsx` (currently
      `presenter-default-key-2025`). The deploy guide has a `sed`
      snippet to update both client pages from the .env value.
    * `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — next-auth reads these at
      module load even though the app currently uses its own token
      system; included for forward-compat.
    * `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_PORT`,
      `NODE_ENV="production"`.
  Header explains `openssl rand` commands to generate strong secrets.

- Created `/home/z/my-project/deploy/deploy.sh` — one-shot idempotent
  deploy script. `#!/usr/bin/env bash` + `set -euo pipefail`. Steps:
    1. Required-tools check (bun, node, npm, git hard-required; pm2,
       caddy warn-only).
    2. Clone if `DEPLOY_REPO` set and no .git; else `git pull` with
       auto-stash of local changes (so .env / sed-patched client
       pages don't get clobbered).
    3. .env presence check — copies from .env.example if missing.
    4. `bun install --production`, then `bun install` if `next` CLI
       missing (devDeps needed for build).
    5. `bunx prisma generate` + `bun run db:push`.
    6. `NODE_OPTIONS=--max-old-space-size=2048 bunx next build`
       (memory limit env-overridable via `NODE_MEMORY_LIMIT`).
    7. Sanity-check that `.next/standalone/server.js` exists; copy
       `public/`, `prisma/`, `.next/static/`, `.env` into the
       standalone bundle.
    8. `pm2 reload --update-env` if apps already exist, else
       `pm2 start ecosystem.config.cjs`; then `pm2 save`.
    9. `pm2 list` + reminder to reload Caddy if Caddyfile changed.
  All paths absolute or `$DEPLOY_DIR`-relative. Configurable via env
  vars (`DEPLOY_DIR`, `DEPLOY_REPO`, `NODE_MEMORY_LIMIT`,
  `PM2_APP_FILE`).

- Created `/home/z/my-project/deploy/Caddyfile.production` — production
  Caddy config with:
    * `uems-votacao.example.edu.br` placeholder domain (user replaces).
    * `email` directive for Let's Encrypt expiry notices.
    * Security headers block: HSTS (1 year + preload), nosniff,
      X-Frame-Options SAMEORIGIN, Referrer-Policy,
      Permissions-Policy, -Server.
    * `encode zstd gzip` for compression.
    * 4 routes in order:
        1. `@socket_query` (XTransformPort=3003) → 127.0.0.1:3003,
           5min read/write timeouts for socket.io long-polling.
        2. `@socket_io_path` (/socket.io/*) → 127.0.0.1:3003 —
           included for the conventional path the task spec asked
           for; triggers only if the socket service is later
           reconfigured to use `path: '/socket.io/'`.
        3. `@stress_query` (XTransformPort=3004) → 127.0.0.1:3004,
           2min timeout (stress tests can run up to 90s).
        4. catch-all → 127.0.0.1:3000 (Next.js).
    * Each route sets `Host`, `X-Real-IP`, `X-Forwarded-For`,
      `X-Forwarded-Proto` headers (required by the rate-limiter in
      `src/lib/rate-limit.ts` to extract real client IP).
    * JSON access log to `/var/log/caddy/uems-votacao.access.log`
      with size-based rotation (100 MiB, keep 14, 30d).
    * Header comment explains the routing table and points to the
      DEPLOY.md for installation instructions.

- Created `/home/z/my-project/deploy/DEPLOY.md` — comprehensive
  Portuguese deploy guide (~22 KB, 15 sections + checklist):
    1. Requisitos da VM (Ubuntu 22.04+, 2GB RAM, 10GB disco, 1 vCPU).
    2. Instalação das ferramentas (apt para caddy/sqlite3/ufw,
       NodeSource para Node 20, bun.sh install script, npm -g pm2,
       pm2 startup systemd).
    3. Upload (git clone OU scp via tarball — both documented).
    4. Configuração do .env (table mapping each var to its
       `openssl rand` command).
    5. **Configuração das chaves ADMIN + PRESENTER** — this is the
       most critical section. Explains that ADMIN_SECRET_KEY only
       needs .env + pm2 restart, but PRESENTER_KEY must ALSO be
       `sed`-replaced into `admin/page.tsx` and
       `apresentacao/[codigo]/page.tsx` before rebuild, with a
       copy-pasteable snippet. Warns that the client-side key is a
       soft-auth check (extractable from JS bundle) — for full
       hardening, future work should move privileged commands to a
       token-authenticated HTTP API route.
    6. Banco de dados (prisma generate + db:push, optional db:seed).
    7. Build do Next.js (NODE_OPTIONS memory limit + manual copy of
       public/, prisma/, .next/static/, .env into standalone; points
       to the deploy.sh shortcut).
    8. PM2 (start, save, startup; useful commands cheatsheet).
    9. Caddy + DNS + HTTPS (Caddyfile install, sed for domain+email,
       validate + reload; routing table; DNS propagation check via
       dig).
    10. Firewall (ufw default deny + allow 22/80/443, with note
        about restricting SSH to a specific IP).
    11. Backup (cron job at 03:00 daily, 30-day retention,
        restore procedure, offsite rsync recommendation).
    12. Procedimento de atualização (step-by-step git pull → bun
        install → prisma → next build → copy → pm2 reload →
        healthcheck).
    13. Monitoramento (healthcheck.sh cron, Uptime Kuma integration,
        pm2 logs / monit, caddy journalctl + access log, htop / df /
        free / ss, recommended alerts).
    14. Renovação SSL (Caddy auto-renews; openssl command to verify
        cert dates).
    15. Troubleshooting comum (7 subsections):
        - OOM no build (increase --max-old-space-size, add swap,
          cross-build on bigger machine).
        - EADDRINUSE (ss + lsof + pm2 stop/restart).
        - Socket.io não conecta (4-step diagnosis: pm2 status, curl,
          DevTools Network, PRESENTER_KEY mismatch).
        - Admin não consegue logar (.env + pm2 restart --update-env +
          cwd note about where the standalone server reads .env).
        - Votos não aparecem (pm2 logs uems-socket, question active
          check, same-room check, fallback polling note from 5-a).
        - SQLITE_BUSY (Postgres migration path documented).
        - Caddy não emite certificado (DNS propagation, port 443,
          ACME rate limit, duplicate cert elsewhere).
    Final checklist with 14 items.

- Created `/home/z/my-project/deploy/backup.sh` — SQLite backup
  script. `#!/usr/bin/env bash` + `set -euo pipefail`. Uses
  `sqlite3 .backup` (online backup API, does not lock writers) when
  available, falls back to `cp`. Gzips the result. Optional
  `PRAGMA integrity_check` on uncompressed backups. Prunes anything
  older than `KEEP_DAYS` (default 30) via `find -mtime +N -delete`.
  Configurable via env (`PROJECT_DIR`, `DB_FILE`, `BACKUP_DIR`,
  `KEEP_DAYS`). Cron example in the header: `0 3 * * *` daily.
  Restore instructions documented in the header.

- Created `/home/z/my-project/deploy/healthcheck.sh` — health check
  for monitoring tools. `#!/usr/bin/env bash` + `set -uo pipefail`
  (no `-e` because we want to report all 3 statuses even if one
  fails). Probes:
    * `http://127.0.0.1:3000/` — expects 200 or 307 (Next.js may
      redirect / to /admin or similar).
    * `http://127.0.0.1:3003/` — expects 200 or 400 (engine.io
      rejects bare GET without EIO query param with 400 — that's the
      healthy response).
    * `http://127.0.0.1:3004/health` — expects 200 (dedicated
      /health endpoint added in task 5-c returns JSON `{ok, port,
      memoryRssMb}`).
  Color-coded output (green OK / red FAIL). Exit code 0 if all
  healthy, 1 otherwise. Env-overridable hosts (`NEXT_HOST`,
  `SOCKET_HOST`, `STRESS_HOST`, `TIMEOUT`). Uses curl only — no
  external deps.

- Made all 3 shell scripts executable (`chmod +x deploy/*.sh`):
    -rwxrwxr-x backup.sh
    -rwxrwxr-x deploy.sh
    -rwxrwxr-x healthcheck.sh

- Verification:
  * `bun run lint` — passes clean (0 errors, 0 warnings).
  * `NODE_OPTIONS=--max-old-space-size=2048 npx next build` —
    succeeds. All 21 routes compiled (same as task 5-c). Build
    produced `.next/standalone/server.js` (3247 bytes).
  * Verified `.next/standalone/` initially had server.js + .env +
    .next/ + node_modules/ + package.json but was MISSING public/
    and prisma/. Ran the same copy operations as `deploy.sh`:
        cp -r .next/static .next/standalone/.next/
        cp -r public .next/standalone/
        cp -r prisma .next/standalone/
        cp .env .next/standalone/
    Final standalone bundle contains: server.js, .env, .next/static/
    (chunks + media), public/ (logo-uems.png, logo.png, logo.svg,
    questions/, uploads/, robots.txt), prisma/ (schema.prisma,
    seed.ts), node_modules/. Note: dev.db does not exist in the
    sandbox (the local env uses db/custom.db) — in production,
    `db:push` will create it.

- Did NOT modify `next.config.ts` — it already had `output:
  "standalone"` (line 8) and the build succeeds without
  `serverActions` or `serverExternalPackages` config. Adding those
  would risk breaking the build for no benefit.

Stage Summary:
- 7 new files created, 0 application files modified:
    /home/z/my-project/ecosystem.config.cjs          (PM2 config, 3 apps)
    /home/z/my-project/.env.example                  (env template, all vars documented)
    /home/z/my-project/deploy/deploy.sh              (one-shot idempotent deploy)
    /home/z/my-project/deploy/Caddyfile.production   (TLS + routing + headers)
    /home/z/my-project/deploy/DEPLOY.md              (~22 KB Portuguese guide, 15 sections)
    /home/z/my-project/deploy/backup.sh              (sqlite3 .backup + 30d prune + gzip)
    /home/z/my-project/deploy/healthcheck.sh         (3-service probe, exit code 0/1)
- All 3 shell scripts have `#!/usr/bin/env bash` + `set -euo pipefail`
  (healthcheck uses `set -uo pipefail` so it can report all failures
  in one run) and are chmod +x.
- All paths absolute or `$(dirname "$0")`/env-var-relative; no
  reliance on the script's CWD.
- The Caddyfile mirrors the existing dev-sandbox routing pattern
  (`?XTransformPort=N` query matcher) that the client code already
  uses — no app code changes needed for the socket.io traffic to
  flow through the production reverse proxy.
- Standalone bundle at `.next/standalone/` confirmed complete with
  server.js + public/ + prisma/ + .next/static/ + .env. Build
  passes; lint passes.
- DEPLOY.md explicitly documents the PRESENTER_KEY gotcha (key must
  be sed-replaced into 2 client-side files before rebuild, since
  it's currently hardcoded as `presenter-default-key-2025`) and
  includes a copy-pasteable snippet to do so from the .env value.
- No new npm packages added (constraint honoured).

Unresolved Issues / Notes for Next Agent:
- The socket service (`mini-services/enade-quiz/index.ts`) and stress
  service (`mini-services/stress-test/index.ts`) hardcode their ports
  (3003 and 3004 respectively). The PM2 `env` block in
  `ecosystem.config.cjs` does NOT control these ports — to change
  them you'd need to edit the source. Documented in the PM2 config
  header comment.
- The PRESENTER_KEY is currently hardcoded on the client side
  (`admin/page.tsx` line ~1060 / ~331, `apresentacao/[codigo]/
  page.tsx` line ~235). The deploy guide explains how to `sed`-
  replace it for production, but a cleaner fix would be to inject
  the key via `NEXT_PUBLIC_PRESENTER_KEY` env var (Next.js bakes
  NEXT_PUBLIC_* vars into the client bundle at build time). This
  would require a small app-code change which the task constraint
  prohibited — flagged for a future task.
- The Caddyfile's `/socket.io/*` route is currently dead code (the
  socket service uses `path: '/'` not `/socket.io/`). It's included
  per the task spec and for forward-compat. If a future agent
  changes the socket service to use the conventional path, this
  route will start working automatically.
- The healthcheck script accepts HTTP 400 from the socket service
  as "healthy" because engine.io rejects bare GETs without an EIO
  query param. This is correct for now but if you add a dedicated
  `/health` route to the socket service, tighten the regex to just
  `200` for a cleaner signal.
- The deploy script's `git pull --ff-only` can fail if the local
  branch diverged (e.g., the sed-patched client files conflict
  with upstream changes to the same lines). The script warns and
  continues with the current tree — operators should resolve
  conflicts manually before re-running.
- Local sandbox `.env` uses `DATABASE_URL=file:/home/z/my-project/
  db/custom.db` (absolute path). The `.env.example` template uses
  the cleaner relative `file:./prisma/dev.db`. This is intentional
  — production should start fresh, not inherit the sandbox's path.
  `db:push` will create `prisma/dev.db` on first run.
- Did not run the deploy.sh end-to-end against a real VM (no VM
  available in the sandbox). The script is idempotent and uses
  standard tools, but the first real deploy may surface environment
  quirks (e.g., bun install --production dropping a needed build
  dep — the script has a fallback to `bun install` if `next` CLI
  is missing).

---
Task ID: 5-final
Agent: Main Agent (production readiness orchestration)
Task: Prepare application for production — fix all errors, stress test 1000 users, security hardening, fix reveal-answer bug

Work Log:
- Coordinated 4 parallel subagents (Tasks 5-a, 5-b, 5-c, 5-d) for production readiness
- Verified all changes integrate cleanly (lint clean, build succeeds, all 21 routes compiled)
- Ran real stress tests against live session 67QAFO:
  - NORMAL scenario: 1000 students connected, 1000 voted, 0 failed, 5s duration, 198 votes/sec, 87MB memory
  - HEAVY LOAD: 2000 students connected, 2000 voted, 0 failed, 10s duration, 110MB memory
  - LONG-LIVED: 200 students × 30s, 0 errors, 99MB memory stable
  - BAD-PRESENTER: 50 attackers, 450 malicious presenter commands ALL BLOCKED, 0 errors
  - BAD-INPUT: 100 malformed payloads, ALL 25 BLOCKED, 0 server crashes
  - FLOOD: 100 students × 10 vote attempts each, ALL 1000 duplicates REJECTED by anti-double-vote
  - MIXED: 250 clients (students + 30 attackers + 20 bad-input), ALL ATTACKS BLOCKED, 233 valid votes accepted
- Browser verification with agent-browser:
  - Home page renders correctly (login form, session code input, "How it works" section)
  - Admin login flow: password "enade2024" → token issued → session list shown
  - Admin manage session: Gerenciar button → tabs (Questões, Apresentar, Banco de Questões) → 30 questions listed
  - Session start: "Iniciar Apresentação" → status changes to active → Encerrar Sessão appears
  - Question activation: Q1 click → all presenter controls enabled (Anterior, Próxima, Pausar, Revelar, Vencedores)
  - REVEAL ANSWER (the bug): "Revelar Gabarito" click → alternative C highlighted green, "Gabarito: C" banner appears, no error
  - Student voting flow: votar/67QAFO → 4 alternatives shown → click B → "✓ Você votou na alternativa B" → "Aguardando o gabarito..." → "Voto registrado!" toast
- Confirmed the reveal-answer bug is fixed:
  - Admin does PUT /api/session/[code]/questions/[id] with isRevealed:true first (persists to DB)
  - Then emits reveal-answer via socket with retry (3 attempts, 3s timeout each, ack callback)
  - On failure: shows toast "Comando pode não ter sido recebido. Recarregue a página de apresentação."
  - Apresentacao page has polling fallback: if socket down >5s, fetches /api/session/[code] every 3s for state sync
  - Visual badge shows socket status: "Conectado" (green), "Reconectando..." (gold pulsing), "Desconectado" (red)
- All 3 services running: Next.js (3000), Socket.io (3003), Stress Test (3004)

Stage Summary:
- ✅ All errors fixed (lint clean, build succeeds, 21 routes compiled)
- ✅ Reveal-answer bug FIXED: now uses emitWithRetry with ack callbacks + DB persistence + polling fallback
- ✅ Security hardened: admin auth (HMAC tokens, 24h expiry), rate limits (5/min admin auth, 30/min vote, 60/min general), input validation on all routes, security headers middleware, anti-cheat (no votes on revealed/finished questions)
- ✅ Socket hardened: presenterKey required for privileged commands, MAX_PARTICIPANTS=5000, per-socket vote rate limit (500ms), 5-min janitor cleanup, ack callbacks on all events
- ✅ Stress test: 1000+ concurrent users verified, 2000 users verified, all attack scenarios blocked
- ✅ Production deploy: PM2 config, Caddyfile.production, deploy.sh (idempotent), backup.sh, healthcheck.sh, DEPLOY.md (Portuguese)
- ✅ Browser-verified: admin login, session start, question activation, reveal answer, student voting — all working end-to-end

Performance Metrics (verified live):
- 1000 concurrent connections: 5s, 198 votes/sec, 87MB RAM
- 2000 concurrent connections: 10s, 198 votes/sec, 110MB RAM
- Avg response time: 0.56ms (1000 users), 0.86ms (2000 users)
- Memory per user: ~55KB (excellent for 1GB VM)

Security Posture (verified live):
- Brute force admin login: 5 attempts then 429 rate limited ✅
- Bad presenter commands (450 attempts): ALL BLOCKED ✅
- Malformed payloads (25 attempts): ALL BLOCKED ✅
- Double voting (1000 attempts): ALL REJECTED ✅
- Unauthorized admin API calls: 401 ✅
- Invalid vote choices: 400 ✅
- Votes on revealed questions: 403 ✅

Unresolved Issues:
- Socket service + stress-test service die when sandbox reaps background processes (use PM2 in production to prevent)
- PRESENTER_KEY is currently hardcoded as 'presenter-default-key-2025' in client JS — DEPLOY.md explains how to set it via env and sed-replace before build
- In-memory rate limit and admin token state are single-instance (sufficient for one VM, would need Redis for multi-instance)

Priority Recommendations for Next Phase:
1. Deploy to a real VM following /home/z/my-project/deploy/DEPLOY.md
2. Set strong ADMIN_SECRET_KEY and PRESENTER_KEY in .env
3. Configure DNS + Caddy for HTTPS
4. Set up backup cron job (deploy/backup.sh)
5. Run a real load test from external machine (not localhost) to verify network performance
6. Consider adding Redis for multi-instance scaling (if needed beyond 1 VM)
7. Test with real students for final validation


---
Task ID: 6
Agent: Main Agent
Task: Aumentar logo UEMS na home page, adicionar código fixo de teste (TEST25) sem identificação, sessões normais exigem RGM+Nome, remover scrollbar da apresentação, corrigir score não acumulando na tela de encerramento

Work Log:
- **Logo UEMS maior na home page** (`src/app/page.tsx`):
  - Aumentado de `w-20 h-20` (80px) para `w-36 h-36 sm:w-40 sm:h-40` (144-160px)
  - Ajustado drop-shadow para acompanhar o tamanho maior
  - Corrigido maxLength do input de código de 8 para 6 (códigos são 6 chars)
  - Atualizado placeholder de "ENADE25" para "67QAFO" (formato real)
  - Verificado via agent-browser: logo agora tem 160×160px (era 80×80)

- **Schema Prisma: campo requireIdentification** (`prisma/schema.prisma`):
  - Adicionado `requireIdentification Boolean @default(true)` no model Session
  - `bun run db:push` aplicou a migração (10ms, sem conflitos)
  - Default true = sessões normais exigem identificação; false = modo teste

- **Tipos TypeScript** (`src/types/index.ts`):
  - Adicionado `requireIdentification: boolean` na interface Session
  - Adicionado `students?: Student[]` opcional na interface Session
  - Criada interface Student completa (id, name, rgm, score, answers, corrects)
  - Exportada constante `TEST_SESSION_CODE = 'TEST25'`

- **API: POST /api/session** (`src/app/api/session/route.ts`):
  - Aceita `requireIdentification` (boolean, default true)
  - Aceita `customCode` (6-char A-Z0-9, opcional) — permite código fixo TEST25
  - Valida customCode com `validateSessionCode`; rejeita duplicados com 409
  - PATCH /api/session/[code] também aceita `requireIdentification` (whitelist)

- **Admin: dialog Nova Sessão com Modo Teste** (`src/app/admin/page.tsx`):
  - Adicionado Checkbox "Modo Teste (sem identificação de alunos)"
  - Quando ativado, mostra campo "Código personalizado" (default TEST25)
  - Checkbox usa cores UEMS (dourado quando checked)
  - Lista de sessões mostra badge "Teste" (ícone FlaskConical) para sessões sem identificação
  - handleCreateSession envia `requireIdentification: !newTestMode` e `customCode`

- **Votar page: tela de identificação** (`src/app/votar/[codigo]/page.tsx`):
  - Novo PageState 'identifying' adicionado
  - Tela de identificação com campos RGM + Nome completo + botão "Entrar na sessão"
  - Ícone 🎓 com glow animation dourado, header/footer consistentes
  - Validação: nome e RGM obrigatórios (toast.error se vazio)
  - POST /api/student para registrar/buscar aluno; persiste em sessionStorage
  - Toast de boas-vindas: "Bem-vindo, [nome]!" ou "Bem-vindo de volta!"
  - Badge do nome do aluno no header (clicável para trocar de aluno)
  - identificationPendingRef suprime transições de socket durante identificação
  - join-session emite name/rgm quando disponível (para score tracking do socket)

- **Votar page: studentId no voto** (`src/app/votar/[codigo]/page.tsx`):
  - handleVote emite studentId no submit-vote (socket) e /api/vote (fallback)
  - vote-accepted handler inclui studentId ao persistir voto no DB
  - studentIdRef (useRef) espelha studentId state para uso em socket callbacks (evita stale closure)

- **Hook useFitContent** (`src/hooks/use-fit-content.ts`) — NOVO ARQUIVO:
  - Mede container (pai) e content (filho) via refs
  - Se content.scrollHeight > container.clientHeight, aplica `transform: scale(ratio)` com `transform-origin: top left`
  - Width ajustada para `${100/scale}%` para preencher horizontalmente
  - Scale mínimo 0.4 (texto permanece legível)
  - Re-executa em: mount, window resize, ResizeObserver (content + container)
  - Retorna { containerRef, contentRef, scale }

- **Apresentacao: sem scrollbar** (`src/app/apresentacao/[codigo]/page.tsx`):
  - Removido `overflow-y-auto pr-2` do container de texto da questão
  - Adicionado `overflow-hidden` + useFitContent (containerRef + contentRef)
  - Transform scale aplicado dinamicamente quando texto é muito longo
  - Verificado via agent-browser + VLM: "texto completamente visível sem barra de rolagem"

- **Bug fix: score não acumulava na tela de encerramento** (`src/app/votar/[codigo]/page.tsx`):
  - **Causa raiz #1**: `answer-revealed` handler usava `answeredCount + 1` e `correctCount + 1` do closure do useEffect — sempre 0 (stale). Cada reveal sobrescrevia para 1 em vez de acumular.
  - **Causa raiz #2**: Sem recálculo resiliente — se o aluno perdia o evento `answer-revealed` (socket desconectou, refresh), o score nunca atualizava.
  - **Fix**: Criada `recalculateScore(data)` que itera sobre todas as questões, checa `getStoredVote(q.id)` + `q.isRevealed` + `q.correctAnswer`, e computa correct/answered do zero. Chamada em:
    1. `fetchSession` (após carregar dados da sessão)
    2. `session-state` (evento socket)
    3. `answer-revealed` (após atualizar isRevealed no sessionFetchedRef)
  - `answer-revealed` agora atualiza `sessionFetchedRef.current` in-place (isRevealed=true) antes de recalcular
  - Verificado: aluno votou 2/2 corretas → tela de encerramento mostra "2/2 acertos" ✅

- **Apresentacao: ranking final do DB** (`src/app/apresentacao/[codigo]/page.tsx`):
  - **Causa raiz**: `session-finished` emitia `get-ranking` ao socket, que retornava `sessionScores` (in-memory). Mas o socket nunca rastreava `corrects` (aluno não envia correctAnswer ao votar). Resultado: "Nenhum voto registrado ainda".
  - **Fix**: Criada `fetchRankingFromDB()` que faz GET /api/student?sessionCode=XXX e mapeia para RankingEntry. Ordena por corrects desc. Filtra students com answers>0.
  - `session-finished` agora chama `fetchRankingFromDB()` em vez de `socket.emit('get-ranking')`
  - `fetchSession` também chama `fetchRankingFromDB()` se a sessão já está finished (refresh na tela de encerramento)
  - Verificado: apresentacao mostra pódio com "Aluno Teste, RGM 999001, 3/4" ✅

Stage Summary:
- ✅ Logo UEMS aumentado de 80px para 160px na home page
- ✅ Código fixo TEST25 funciona sem identificação (requireIdentification=false)
- ✅ Sessões normais exigem RGM + Nome (tela de identificação completa)
- ✅ Admin pode criar sessões em Modo Teste com código personalizado
- ✅ Badge "Teste" na lista de sessões do admin
- ✅ Scrollbar removida da apresentação (useFitContent escala o texto)
- ✅ Score acumula corretamente: 2/2, 3/4 etc. (stale closure + recalculateScore resiliente)
- ✅ Ranking final da apresentação busca do DB (corrects/answers precisos)
- ✅ Tela de encerramento do aluno mostra pontuação correta
- ✅ Lint clean (0 errors, 0 warnings)
- ✅ Build compila sem erros

Verificação E2E (agent-browser + API):
- Home page: logo 160×160px ✅
- TEST25 (sem ID): vai direto para votação, sem tela de identificação ✅
- Sessão normal: mostra tela "Identificação" com RGM + Nome ✅
- Identificação: POST /api/student → "Bem-vindo, Maria!" → vai para votação ✅
- Voto C (correto) → "Voto registrado!" ✅
- Apresentacao TEST25 finalizada: pódio mostra "Aluno Teste, 3/4" ✅ (antes mostrava "Nenhum voto registrado")
- Votar YQURI0 finalizada: "2/2 acertos" ✅ (antes mostrava "1/1" ou nada)
- Apresentacao SCROL1 (texto longo): sem scrollbar, texto visível ✅

Unresolved Issues:
- Sessões de teste (TEST25) ainda existe no DB — pode ser deletada via admin quando conveniente
- O socket service ainda mantém sessionScores in-memory (não usado para ranking final, mas poderia ser removido em favor do DB para ranking em tempo real também)
- O `recalculateScore` é chamado em cada `session-state` event (frequente) — é barato (itera questions array) mas poderia ser otimizado com um dirty flag

Priority Recommendations for Next Phase:
1. Testar o fluxo completo com um apresentador real (admin → apresentação → alunos votando → revelar → encerrar)
2. Considerar migrar o ranking em tempo real (durante a sessão) para o DB também, em vez do socket in-memory
3. Adicionar limpeza automática de sessões de teste antigas
4. Validar em dispositivo móvel real (a tela de identificação e o useFitContent)

---
Task ID: 25
Agent: Main (Z.ai Code)
Task: Fix hydration mismatch error on home page (src/app/page.tsx) — server-rendered HTML had stale attributes (logo w-20 h-20, input placeholder "Ex: ENADE25", maxLength 8) that didn't match client bundle (logo w-36 h-36 sm:w-40 sm:h-40, input placeholder "Ex: 67QAFO", maxLength 6).

Work Log:
- Read worklog.md to understand project history (ENADE Quiz UEMS/DIGES — Next.js 16 + Prisma + SQLite)
- Read current src/app/page.tsx — confirmed source has the NEWER values:
  - Line 74: className="w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-[0_0_30px_rgba(200,168,75,0.35)]"
  - Line 111: placeholder="Ex: 67QAFO"
  - Line 115: maxLength={6}
- Diagnosed root cause: the dev server's .next cache contained STALE server-rendered HTML from an older version of page.tsx (with w-20 h-20, "Ex: ENADE25", maxLength 8). The client JS bundle had been hot-reloaded to the current source, but the SSR HTML cache was not invalidated. This is a classic Turbopack dev server cache desync.
- Killed all Next.js dev server processes (next-server, next dev, bun run dev)
- Cleared the entire .next cache directory (rm -rf .next)
- Restarted dev server via .zscripts/dev.sh (which runs bun run dev + wait_for_service + health check + mini-services)
- Verified fresh compile: first GET / 200 in 3.0s (compile: 2.9s) — confirms cache was cleared
- Used agent-browser to open http://localhost:3000/
- Checked console: NO hydration errors, only standard React DevTools + HMR messages
- Verified DOM attributes match source code exactly:
  - input.placeholder = "Ex: 67QAFO" ✓
  - input.maxLength = 6 ✓
  - img.className = "w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-[0_0_30px_rgba(200,168,75,0.35)]" ✓
- Reloaded page and re-checked: console empty, errors empty — hydration fully resolved
- Ran `bun run lint`: 0 errors, 0 warnings

Stage Summary:
- ✅ Root cause identified: stale .next SSR HTML cache (Turbopack dev server did not invalidate cached server-rendered HTML after page.tsx was edited)
- ✅ Fix: cleared .next directory + restarted dev server → fresh SSR build matches current source
- ✅ Hydration mismatch error gone (verified via agent-browser console + errors both empty after reload)
- ✅ DOM attributes verified to match src/app/page.tsx source code
- ✅ Lint clean
- ✅ Dev server running stably (HTTP 200 in 25ms after warmup)

Unresolved Issues:
- None for this specific issue. The hydration mismatch was a transient dev-server cache desync, not a code defect.
- Note: if the issue recurs, the user can run `rm -rf .next && bun run dev` to force a fresh build. This is a known Turbopack HMR edge case in Next.js 16 dev mode.

Priority Recommendations for Next Phase:
1. The original deploy issue (eventoenade.space-z.ai returning 500 "deploy failed" with empty console) is still unresolved on Z.ai production — but that is a platform-side issue, not a code issue. Local build pipeline is 100% functional.
2. Consider adding a `predev` npm script that clears `.next` automatically to prevent future cache desync.
3. The home page UI is in good shape (logo 160px, animated particles, gradient background, feature badges, 3-step "Como funciona" section, sticky footer). Ready for users.

---
Task ID: 26-a
Agent: Explore
Task: Investigate why the 15 "formação geral" questions disappeared from the ENADE Quiz project

Work Log:
- Read worklog.md (Tasks 1, 2, 3, 4, 5-a/b/c/d/final, 6, 25). No previous entry mentions any Administração / "Formação Geral" / VFJG9V work — confirming the bug was never logged.
- Mapped the project layout: `prisma/schema.prisma` (Session, Question, Student, Vote, QuestionBank), `prisma/seed.ts`, `src/app/admin/page.tsx` (3644-line admin UI), `src/app/api/session/route.ts`, `src/app/api/session/[code]/questions/route.ts`, `src/app/api/question-bank/route.ts`, `src/app/api/question-bank/import/route.ts`, `src/app/api/question-bank/save-from-session/route.ts`, `src/app/api/question-bank/[id]/route.ts`.
- Wrote and ran a Prisma inspection script against the live `db/custom.db` (DATABASE_URL=file:/home/z/my-project/db/custom.db). Results:
  - QuestionBank.count() = 31 (NOT 46; the 15 ADM questions are NOT there)
  - By course: 30× "Formação Geral Docente", 1× "Test" (NO "Formação Geral" / no "Administração")
  - By category: 30× "ENADE 2025", 1× "Test Category" (NO "ENADE 2025 - Administração")
  - Sessions: 3 — TEST25 (4q), 67QAFO (30q), ENADE25 (6q). NO session with code VFJG9V.
- Examined `upload/adm_questions.json` (435 bytes header + 37 KB body): confirms it contains exactly 15 questions, all with `course="Formação Geral"`, `category="ENADE 2025 - Administração"`, `year=2025`, titles "ENADE 2025 Administração - Formação Geral - Questão 01..15".
- Examined `upload/adm_session.json` (Jun 17 12:15): `{"code":"VFJG9V","id":"cmqi1bavi000fresnugfw1dcw","title":"ENADE 2025 — Administração (Formação Geral)"}` — the session that USED to exist.
- Examined `upload/adm_bank_ids.json` (Jun 17 12:15): 15 cuids `cmqi1bajv0000resn...` through `cmqi1bame000e...` — the IDs of the 15 bank entries that USED to exist. None of these IDs are present in the current DB.
- Examined `upload/import_adm.sh` (Jun 17 12:15): script that (1) POSTs each of the 15 adm_questions.json entries to `/api/question-bank`, (2) creates a session via `/api/session`, (3) imports the 15 bank IDs into the session via `/api/question-bank/import`. So the data flow at the time was: JSON → bank → session. The script clearly succeeded (we have the saved IDs + session code), so the data was persisted at 12:15 on Jun 17.
- Walked the question import flow end-to-end (no UI bug found):
  - Admin UI (`src/app/admin/page.tsx`): "Banco de Questões" tab fetches `/api/question-bank` (line 1003), populates `bankQuestions`/`bankCategories`/`bankCourses`. Filters (`bankFilterCategory`, `bankFilterCourse`, `bankSearch`) default to `'all'`/`''` so they DON'T hide anything by default (lines 916-918, 1448-1463). "Importar para Sessão" button (line 2567-2582) calls `handleImportToSession` (line 1391-1425) → POST `/api/question-bank/import` with `{sessionCode, questionIds}`.
  - POST `/api/question-bank` (`route.ts` line 88-185): creates one QuestionBank row, defaults `course="Formação Geral"`, `category="Geral"` if not provided.
  - POST `/api/question-bank/import` (`import/route.ts`): finds the session, fetches bank questions by IDs, creates `Question` rows in the session. No filter that would exclude "Formação Geral".
  - POST `/api/session` (`session/route.ts` line 39-113): creates a session with 0 questions — there is NO auto-import of any default "formação geral" set.
- Confirmed `prisma/seed.ts` only seeds 5 questions (not 15, not "Administração") into session ENADE25. It also creates the session directly via `db.session.create({ data: { code: 'ENADE25', ..., questions: { create: [...] } } })` — bypassing the bank entirely. The seed has NOT been re-run since Jun 15 (git log shows no modification since `d23bde9` Jun 15 20:29).
- Reconstructed DB history by extracting `db/custom.db` from the 4 commits that touched it after Jun 16, and querying each via a throwaway PrismaClient with a per-commit datasource URL:

  | Commit            | When                  | QB rows | Sessions | ADM IDs present? |
  |-------------------|-----------------------|---------|----------|------------------|
  | 46fb571 (Jun 16 12:45) | pre-ADM            | 31      | 2 (67QAFO, ENADE25) | NO (created before ADM import) |
  | e0fab26 (Jun 19 02:29) | post-ADM, post-reset | 31      | 3 (+FSDNXM sec-test) | NO — ADM data already gone |
  | a91c90b (Jun 19 03:00) | after db:push + col | 31      | 4 (+TEST25, +YQURI0) | NO |
  | 64d3561 (Jun 19 03:18) | current HEAD       | 31      | 3 (TEST25 has 4q now) | NO |

  → The 15 ADM bank rows and the VFJG9V session disappeared between Jun 17 12:15 (creation) and Jun 19 02:29 (commit e0fab26). They never made it into ANY git commit of `db/custom.db`.

- Cross-checked `mini-services/enade-quiz/log.txt`: socket service started 2026-06-19T02:31 — i.e. the dev environment was restarted on Jun 19 02:31, fresh from the last commit (`46fb571` from Jun 16 12:45). This is the moment the working-tree `db/custom.db` was overwritten with the committed version, dropping the un-committed ADM rows that had been added on Jun 17.
- Verified the only surviving artifacts of the lost data are the three upload/ files: `adm_questions.json`, `adm_bank_ids.json`, `adm_session.json`. The 15 questions can be re-imported losslessly by re-running `bash upload/import_adm.sh` (it POSTs to `/api/question-bank` which generates NEW cuids, then creates a NEW session, then imports).
- Searched source for any "15"/"formacao"/"auto-import"/"default" logic: nothing. The number 15 appears nowhere in src/. There is no code path that auto-seeds 15 "formação geral" questions — they only ever existed because of the one-shot `import_adm.sh` script.
- Linted understanding of the filter UI: in `src/app/admin/page.tsx` lines 2598-2619 the user can filter the bank by Category and Course. The dropdowns are populated from the DB, so currently the user would see only "ENADE 2025" / "Test Category" categories and "Formação Geral Docente" / "Test" courses — there is no "Formação Geral" course option in the dropdown because there are no rows with that course in the DB. The bug is therefore NOT a UI filter hiding questions — the rows are genuinely absent.

Stage Summary:
- ✅ Root cause identified: DATA LOSS, not a code bug. The 15 "formação geral" questions (and their session VFJG9V "ENADE 2025 — Administração (Formação Geral)") were created on 2026-06-17 12:15 via `upload/import_adm.sh`. They were written into the live `db/custom.db` (commit-history-proof: the saved IDs in `upload/adm_bank_ids.json` are `cmqi1b...` cuids, which the running server minted). However, NO agent ever committed `db/custom.db` after the import. When the dev environment was restarted on 2026-06-19 02:31 (visible in `mini-services/enade-quiz/log.txt`), the working-tree `db/custom.db` was effectively restored to the last committed version (`46fb571` from 2026-06-16 12:45), wiping the 15 ADM bank rows + the VFJG9V session. The very next commit `e0fab26` (2026-06-19 02:29:40) shows a DB with only 31 bank rows (the 30 Ciências Biológicas "Formação Geral Docente" entries from Jun 16 + 1 "Test" entry) and 3 sessions — none of them ADM.
- ✅ Current DB state (verified): QuestionBank=31 rows. By course: 30× "Formação Geral Docente" + 1× "Test". By category: 30× "ENADE 2025" + 1× "Test Category". ZERO rows with course="Formação Geral" (without "Docente") and ZERO rows with category="ENADE 2025 - Administração". Session VFJG9V does not exist.
- ✅ prisma/seed.ts seeds ONLY 5 questions (not 15) into session ENADE25, and they are NOT "Administração / Formação Geral" questions — they are generic "Formação Geral" entries about LAI, sustainable development, AI ethics, disability statute, participatory democracy. The seed is also not auto-run (no postinstall hook, no `prisma db seed` config); `bun run db:seed` must be invoked manually. It has not been re-run since Jun 15.
- ✅ No code defect in the import flow: `/api/question-bank` (POST), `/api/question-bank/import` (POST), `/api/session` (POST), and the admin UI bank tab (filters default to "all") all behave correctly. There is no place in the source that auto-creates 15 "formação geral" questions or that filters them out.
- ✅ The original 15 questions are 100% recoverable: `upload/adm_questions.json` (15 entries, all course="Formação Geral", category="ENADE 2025 - Administração", year=2025) contains the full stem + alternatives + correctAnswer. Re-running `bash upload/import_adm.sh` will re-save them to the bank (with new cuids) and recreate a new session with a freshly-generated code.
- ✅ Surviving artifacts of the loss: `upload/adm_questions.json` (37 KB, full source data), `upload/adm_bank_ids.json` (15 stale cuids — useless now because the rows are gone, but proves the import happened), `upload/adm_session.json` (stale session code VFJG9V — gone from DB).

Key file references:
- `prisma/schema.prisma:76-96` — QuestionBank model
- `prisma/seed.ts:13-94` — 5-question seed (creates ENADE25 directly with `questions: { create: [...] }`)
- `src/app/api/session/route.ts:39-113` — POST creates session with 0 questions (no auto-import)
- `src/app/api/question-bank/route.ts:88-185` — POST creates one bank row (defaults course="Formação Geral", category="Geral")
- `src/app/api/question-bank/import/route.ts:15-152` — POST imports bank rows into a session by ID (no filter)
- `src/app/admin/page.tsx:999-1026` — bank fetch + tab activation
- `src/app/admin/page.tsx:1391-1425` — handleImportToSession
- `src/app/admin/page.tsx:1447-1463` — filteredBankQuestions (filters default to "all", no exclusions)
- `src/app/admin/page.tsx:2567-2582` — "Importar para Sessão" button
- `upload/adm_questions.json` — 15 lost questions, full content (recoverable)
- `upload/adm_bank_ids.json` — 15 stale cuids (proof of past existence)
- `upload/adm_session.json` — stale session VFJG9V (proof of past existence)
- `upload/import_adm.sh` — re-runnable script to recreate the lost data

Unresolved Issues:
- The 15 ADM "Formação Geral" questions + the VFJG9V session are MISSING from the DB right now. They can be re-imported from `upload/adm_questions.json`.
- No code fix is required — this was a data-loss incident caused by an un-committed DB write being overwritten by a sandbox/git reset. To prevent recurrence: (a) commit `db/custom.db` immediately after any bulk import / question-bank mutation, or (b) add a `prisma db seed`-style script that re-imports the canonical 15 ADM questions idempotently on demand, or (c) stop tracking `db/custom.db` in git and rely on backups instead (note: `db/custom.db` IS currently tracked in git, which is why the reset reverted it).

Priority Recommendations for Next Phase:
1. Re-run `bash upload/import_adm.sh` to recreate the 15 "formação Geral" ADM bank entries + a new session. Verify the new session code with the user.
2. After re-importing, commit `db/custom.db` IMMEDIATELY so a future sandbox reset cannot wipe the data again.
3. Consider extracting the 15 ADM questions from `upload/adm_questions.json` into `prisma/seed.ts` (or a dedicated `prisma/seed-adm.ts`) so they can be re-seeded deterministically.
4. Audit `upload/` for any other one-shot import scripts whose results may also have been silently dropped by the Jun 19 reset (e.g., questions from the Administracao PDF — the source PDF `R18012025 - 18_Administracao.indb - 2025_administracao_PV_1.pdf` is still present).


---
Task ID: 26-b
Agent: Explore
Task: Investigate Z.ai deploy failure — console shows no error logs

Work Log:
- Read worklog.md (1537 lines) to understand prior context. Task 25 noted the
  Z.ai production deploy at eventoenade.space-z.ai is still broken (HTTP 500
  "Sorry, there was a problem deploying the code" with empty console). No
  prior task had investigated the build/start scripts in depth.
- Read full contents of all critical deploy files:
    * /home/z/my-project/.zscripts/build.sh (123 lines)
    * /home/z/my-project/.zscripts/start.sh (135 lines)
    * /home/z/my-project/.zscripts/mini-services-install.sh (66 lines)
    * /home/z/my-project/.zscripts/mini-services-build.sh (79 lines)
    * /home/z/my-project/.zscripts/mini-services-start.sh (124 lines)
    * /home/z/my-project/.zscripts/dev.sh (155 lines)
    * /home/z/my-project/next.config.ts (111 lines)
    * /home/z/my-project/package.json (scripts + deps)
    * /home/z/my-project/prisma/schema.prisma (generator + datasource)
    * /home/z/my-project/Caddyfile
    * /home/z/my-project/Dockerfile
    * /home/z/my-project/ecosystem.config.cjs
    * /home/z/my-project/src/lib/db.ts
    * /home/z/my-project/src/middleware.ts
- Checked env config files:
    * /home/z/my-project/.env EXISTS, 50 bytes, contains absolute path
    * /home/z/my-project/.env.production DOES NOT EXIST
    * /home/z/my-project/.npmrc DOES NOT EXIST
    * /home/z/my-project/bunfig.toml DOES NOT EXIST
- Verified .env content via od -c (exact bytes):
    `DATABASE_URL=file:/home/z/my-project/db/custom.db\n`
- Verified .env is TRACKED in git (git ls-files confirms it) and committed
  content matches working tree (git show HEAD:.env == working .env).
  Despite .gitignore containing `.env*`, the file was force-added.
- Verified db/custom.db (237568 bytes SQLite 3.x) is tracked in git.
- Ran local build simulation: `cd /home/z/my-project && bun run build` —
  SUCCEEDS in ~9s. Only warning: "middleware file convention is deprecated,
  use proxy instead" (cosmetic, Next.js 16). 21 routes compiled, 9 static
  pages generated. No errors.
- Ran full build.sh simulation: `BUILD_ID=test-26b bash .zscripts/build.sh`
  — SUCCEEDS in ~21s. Produces 55MB tarball at
  /tmp/build_fullstack_test-26b.tar.gz with 2063 entries.
- Inspected tarball contents:
    * ./Caddyfile (binds to :81)
    * ./db/custom.db (237568 bytes)
    * ./mini-services-dist/ (3 files)
    * ./start.sh
    * ./next-service-dist/.env  ← CONTAINS ABSOLUTE PATH
    * ./next-service-dist/server.js
    * ./next-service-dist/.next/static/ (chunks, media, css)
    * ./next-service-dist/node_modules/ (standalone tree)
    * ./next-service-dist/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
- Found next-service-dist/.env content (copied by Next.js standalone build):
    `DATABASE_URL=file:/home/z/my-project/db/custom.db`
  This absolute path WILL NOT EXIST on Z.ai's runtime container.
- Simulated Z.ai runtime: extracted tarball to /tmp/sim-zai-app/ and ran
  start.sh with clean env (env -i). Result:
    `❌ 未找到打包后的数据库文件 /app/db/custom.db`
    `为避免生产环境启动到空数据库，启动已终止`
    exit 1
  This confirms start.sh HARDCODES /app/db/custom.db and fails if the
  tarball is extracted anywhere other than /app/.
- Checked sandbox container: /app exists (0711, root-owned, permission-
  denied for user z). PID 2 is the sandbox caddy (dev preview, NOT the
  production deploy). The production deploy runs on a SEPARATE Z.ai
  runtime container.
- Checked all .zscripts for `set -e` / `set -euo pipefail`:
    * build.sh line 6: `set -e`
    * dev.sh line 3: `set -euo pipefail`
    * start.sh line 3: `set -e`
- Checked stderr redirection:
    * build.sh line 4: `exec 2>&1` ← PRESENT (stderr → stdout)
    * start.sh: NO `exec 2>&1` ← MISSING (stderr stays separate)
    * dev.sh: NO `exec 2>&1` (but uses per-command redirects)
- Checked hardcoded paths:
    * build.sh line 13: `NEXTJS_PROJECT_DIR="/home/z/my-project"` (absolute)
    * mini-services-install.sh line 4: `ROOT_DIR="/home/z/my-project/mini-services"`
    * mini-services-build.sh line 4: `ROOT_DIR="/home/z/my-project/mini-services"`
    * start.sh line 56: `DEFAULT_PACKAGED_DB_PATH="/app/db/custom.db"` (absolute)
    * Caddyfile line 1: `:81 {` (hardcoded port, not $PORT)
- Checked dev.log (root) and .zscripts/dev.log: both show healthy dev
  server, 200 responses, no errors. Only the middleware deprecation warning.
- Checked /tmp/my-project/ (initial snapshot): contains .github/workflows/ci.yml
  referencing `curl -sf http://localhost:3000/api/health` — but /api/health
  endpoint DOES NOT EXIST in the project (only /api returns "Hello, world!").
  This CI workflow is NOT in /home/z/my-project (not tracked in git).
- Verified Prisma postinstall hook exists (@prisma/client package.json has
  `"postinstall": "node scripts/postinstall.js"` → runs prisma generate
  automatically on bun install). Generated client present in node_modules/.prisma/.
- Checked standalone server.js: sets process.chdir(__dirname), loads next
  config inline, calls startServer with dir=__dirname. Errors caught via
  .catch() → console.error + process.exit(1).

Stage Summary:

ROOT CAUSE ANALYSIS (most likely → least likely):

1. **CRITICAL — start.sh has NO `exec 2>&1`** (build.sh has it, start.sh doesn't).
   This is the #1 reason for "no error logs". All child-process stderr
   (bun server.js crashes, caddy errors, Prisma init errors) goes to fd 2
   (stderr), which Z.ai's deploy console apparently does NOT capture. Only
   stdout is captured. So when start.sh fails, the error message vanishes.
   FIX: Add `exec 2>&1` as line 2 of start.sh (right after `#!/bin/sh`).

2. **CRITICAL — next-service-dist/.env contains absolute path**
   `DATABASE_URL=file:/home/z/my-project/db/custom.db`. Next.js standalone
   build COPIES the project's .env into .next/standalone/.env. This gets
   bundled into the tarball. On Z.ai's runtime, /home/z/my-project/ does
   NOT exist. IF start.sh's `export DATABASE_URL` works correctly (it
   should, since process.env takes precedence over .env), this is latent.
   BUT if Z.ai runs `bun server.js` directly (bypassing start.sh), or if
   Next.js's .env loader runs before start.sh's export, Prisma tries to
   open /home/z/my-project/db/custom.db → fails → 500 on all DB queries
   → Z.ai health check fails → "deploy failed".
   FIX: In build.sh, after copying standalone, overwrite or delete
   next-service-dist/.env so the absolute path never ships.

3. **HIGH — start.sh hardcodes `/app/db/custom.db`** (line 56). If Z.ai
   extracts the tarball to any path other than /app/, the file-existence
   check fails → start.sh prints "❌ 未找到打包后的数据库文件" → exits 1.
   The error goes to stdout BUT also depends on Z.ai capturing stdout.
   Combined with issue #1 (no exec 2>&1), if the echo goes to stderr
   (it doesn't — echo goes to stdout — but the subsequent caddy failure
   would go to stderr), the error chain is broken.
   FIX: Derive path dynamically: `DEFAULT_PACKAGED_DB_PATH="$BUILD_DIR/db/custom.db"`
   or use `$(pwd)/db/custom.db`.

4. **HIGH — Caddyfile binds to `:81`** (hardcoded). Z.ai's runtime likely
   expects the app on $PORT (probably 80, 8080, or 3000). Caddy on :81
   is unreachable by Z.ai's load balancer → health check fails → deploy
   failed. Caddy's "bind: permission denied" or "address already in use"
   errors go to stderr (missed per issue #1).
   FIX: Change `:81 {` to `:${PORT:-81} {` or `:80 {` or remove caddy
   entirely and let Next.js be the main process on $PORT.

5. **HIGH — `set -e` in start.sh + `sleep 1` check is too short**. If
   `bun server.js &` crashes AFTER 1 second (e.g., Prisma engine load
   failure, module not found), the `kill -0` check passes, start.sh
   continues to the final caddy-exec line, and Next.js dies silently in
   the background. The crash output (stderr) is lost per issue #1.
   FIX: Increase sleep to 5s, add `curl -sf localhost:$PORT` health
   check, and add `( wait $NEXT_PID; echo "Next.js exited: $?" ) &`
   to capture async crashes.

6. **MEDIUM — the final caddy-exec line is the LAST line of start.sh** with no
   fallback. If caddy is not installed on Z.ai's runtime (Alpine images
   don't include caddy by default), the exec fails with
   "caddy: not found" (exit 127, stderr) → container exits → deploy
   failed. No fallback to keep Next.js as the main process.
   FIX: `if command -v caddy >/dev/null 2>&1; then exec-caddy; else
   wait $NEXT_PID; fi`.

7. **MEDIUM — build.sh hardcodes `NEXTJS_PROJECT_DIR="/home/z/my-project"`**.
   On Z.ai's BUILD container this path exists (it's the sandbox path).
   But if Z.ai's build container uses a different workspace path, build.sh
   exits 1 with "❌ 错误: Next.js 项目目录不存在". This error IS printed
   to stdout (build.sh has exec 2>&1), so it should be visible — UNLESS
   Z.ai's build log capture is also broken.
   FIX: Derive dynamically: `NEXTJS_PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"`.

8. **LOW — Prisma engine binary is `libquery_engine-debian-openssl-3.0.x.so.node`**.
   If Z.ai's runtime is Alpine (musl) or Ubuntu 18.04 (openssl 1.1), the
   engine won't load → Prisma throws at first query. This causes 500s on
   API routes, not a deploy failure (server still starts). But combined
   with a DB-dependent health check, could cascade.
   NOTE: The standalone build DOES include sharp-libvips-linuxmusl-x64
   (Alpine variant), so sharp is fine. But Prisma only has the debian variant.

9. **LOW — No /api/health endpoint**. The project has /api returning
   `{"message":"Hello, world!"}` but no /api/health. If Z.ai's health
   check pings /api/health → 404 → deploy failed. Z.ai probably pings /
   (which returns 200), so this is likely a non-issue.

EXACT FILE CONTENTS (for reference):

--- .zscripts/build.sh (first 30 lines, the critical part) ---
#!/bin/bash
exec 2>&1          ← stderr redirected to stdout (GOOD)
set -e             ← exit on any error (can cause silent exits)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXTJS_PROJECT_DIR="/home/z/my-project"   ← HARDCODED absolute path
# ... checks dir exists, exits 1 if not ...
cd "$NEXTJS_PROJECT_DIR" || exit 1
export NEXT_TELEMETRY_DISABLED=1
BUILD_DIR="/tmp/build_fullstack_$BUILD_ID"   ← depends on BUILD_ID env var
mkdir -p "$BUILD_DIR"
bun install           ← runs prisma generate via postinstall
bun run build         ← next build (standalone) + cp static + cp public
# ... mini-services build ...
# Copies .next/standalone → BUILD_DIR/next-service-dist/
# Copies .next/static → BUILD_DIR/next-service-dist/.next/static
# Copies public → BUILD_DIR/next-service-dist/public
# Copies db/custom.db → BUILD_DIR/db/
# DATABASE_URL="file:$BUILD_DIR/db/custom.db" bun run db:push  ← inline override
# Copies Caddyfile, start.sh → BUILD_DIR/
# tar -czf BUILD_DIR.tar.gz BUILD_DIR/

--- .zscripts/start.sh (critical parts) ---
#!/bin/sh
set -e             ← exit on any error
                    ← NO `exec 2>&1` (BAD — stderr not captured)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"
# ...
DEFAULT_PACKAGED_DB_PATH="/app/db/custom.db"     ← HARDCODED /app/
DEFAULT_PACKAGED_DATABASE_URL="file:$DEFAULT_PACKAGED_DB_PATH"
# ...
cd "$BUILD_DIR" || exit 1
ls -lah
# ...
if [ -f "./next-service-dist/server.js" ]; then
    cd next-service-dist/ || exit 1
    export NODE_ENV=production
    export PORT="${PORT:-3000}"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    export DATABASE_URL="${DATABASE_URL:-$DEFAULT_PACKAGED_DATABASE_URL}"
    if [ "$DATABASE_URL" = "$DEFAULT_PACKAGED_DATABASE_URL" ]; then
        if [ ! -f "$DEFAULT_PACKAGED_DB_PATH" ]; then   ← checks /app/db/custom.db
            echo "❌ 未找到打包后的数据库文件 $DEFAULT_PACKAGED_DB_PATH"
            exit 1
        fi
    fi
    bun server.js &          ← background, stderr lost
    NEXT_PID=$!
    sleep 1                  ← TOO SHORT for Next.js to crash
    if ! kill -0 "$NEXT_PID"; then
        echo "❌ Next.js 服务器启动失败"
        exit 1
    fi
    cd ../
fi
# ... mini-services (also backgrounded) ...
# Final line: exec caddy run --config Caddyfile --adapter caddyfile
#   ← NO fallback if caddy missing

--- next.config.ts ---
output: "standalone"   ← correct
typescript.ignoreBuildErrors: true
reactStrictMode: false
images.unoptimized: true
compress: false
allowedDevOrigins: [...]   ← dev-only, irrelevant for prod
(No hardcoded paths, no serverActions, no experimental features that break)

--- package.json scripts ---
"dev": "next dev -p 3000 2>&1 | tee dev.log"
"build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"
"start": "NODE_ENV=production bun .next/standalone/server.js 2>&1 | tee server.log"
"db:push": "prisma db push"
"db:generate": "prisma generate"
(No prebuild/postbuild hooks, no prisma generate in build script — relies on postinstall)

--- prisma/schema.prisma (head) ---
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }
(Standard, valid)

--- .env (exact, 50 bytes) ---
DATABASE_URL=file:/home/z/my-project/db/custom.db

--- Caddyfile ---
:81 {                                    ← HARDCODED port 81
    @transform_port_query { query XTransformPort=* }
    handle @transform_port_query { reverse_proxy localhost:{query.XTransformPort} ... }
    handle { reverse_proxy localhost:3000 ... }   ← proxies to Next.js
}

DATABASE_URL ANALYSIS:
- .env has ABSOLUTE path: file:/home/z/my-project/db/custom.db
- This is committed to git (force-added despite .gitignore)
- Next.js standalone build COPIES .env → .next/standalone/.env
- Tarball contains next-service-dist/.env with this absolute path
- start.sh exports DATABASE_URL=file:/app/db/custom.db BEFORE bun server.js
- Next.js .env loader does NOT override existing process.env vars
- SO: if start.sh runs correctly, the .env absolute path is HARMLESS
- BUT: if start.sh is bypassed (Z.ai runs server.js directly), Prisma
  uses the absolute path → /home/z/my-project/db/custom.db doesn't exist
  on Z.ai → Prisma throws → 500 on all DB queries

LOCAL BUILD STATUS:
- `bun run build` SUCCEEDS (9s, 21 routes, 9 static pages, 0 errors)
- `bash .zscripts/build.sh` SUCCEEDS (21s, 55MB tarball, 2063 entries)
- Only warning: "middleware deprecated, use proxy" (cosmetic, Next.js 16)
- No silent failures locally

SPECIFIC RECOMMENDATIONS (ordered by impact, NOT applied — investigation only):

1. **Add `exec 2>&1` to start.sh line 2** (after `#!/bin/sh`). This single
   change will make ALL stderr visible in Z.ai's console, immediately
   revealing the actual crash reason. This is the highest-impact fix for
   the "no error logs" symptom.

2. **Sanitize .env in the standalone build**. In build.sh, after
   `cp -r .next/standalone "$BUILD_DIR/next-service-dist/"`, add:
   `rm -f "$BUILD_DIR/next-service-dist/.env"` OR overwrite with
   `echo "DATABASE_URL=file:/app/db/custom.db" > "$BUILD_DIR/next-service-dist/.env"`
   This prevents the absolute /home/z/my-project path from shipping.

3. **Change .env to relative path**: `DATABASE_URL=file:./db/custom.db`
   (relative to project root). Prisma resolves relative to CWD. Next.js
   server.js does process.chdir(__dirname) = next-service-dist/, so
   `./db/custom.db` would resolve to next-service-dist/db/custom.db —
   which doesn't exist. Better: delete .env from standalone entirely and
   rely on start.sh's export.

4. **Make start.sh's DB path dynamic**: Replace
   `DEFAULT_PACKAGED_DB_PATH="/app/db/custom.db"` with
   `DEFAULT_PACKAGED_DB_PATH="$BUILD_DIR/db/custom.db"` (since
   BUILD_DIR="$SCRIPT_DIR" = extraction dir). This works regardless of
   where Z.ai extracts the tarball.

5. **Make Caddyfile port configurable**: Change `:81 {` to `:${PORT:-81} {`
   so Z.ai can set PORT=80 or PORT=8080. OR remove caddy entirely and let
   Next.js be the main process (Z.ai's load balancer can proxy directly
   to Next.js on $PORT).

6. **Add caddy fallback in start.sh**:
   `if command -v caddy >/dev/null 2>&1; then exec-caddy; else
   echo "caddy not found, Next.js is main"; wait $NEXT_PID; fi`

7. **Increase sleep 1 → sleep 5** and add a real health check:
   `for i in 1..10; do curl -sf localhost:$PORT && break; sleep 1; done`

8. **Add async crash logger**:
   `( wait $NEXT_PID 2>/dev/null; echo "Next.js exited with code $?" ) &`

9. **Derive NEXTJS_PROJECT_DIR dynamically in build.sh**:
   `NEXTJS_PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"` instead of
   hardcoded `/home/z/my-project`.

10. **Consider removing `set -e` from start.sh** or replacing with
    per-command `|| exit 1` so that a single non-critical failure doesn't
    silently kill the whole startup sequence.

NEXT ACTIONS (for the implementing agent):
- Apply fix #1 (exec 2>&1 in start.sh) FIRST — this is non-destructive and
  will immediately surface the real error on the next deploy attempt.
- Apply fixes #2, #4, #5 together — they address the path/port hardcoding.
- Apply fix #6 (caddy fallback) as a safety net.
- Redeploy to eventoenade.space-z.ai and check the console — with
  exec 2>&1, the actual error should now be visible.
- If the error is "caddy: not found" or "port 81 in use", apply fix #5.
- If the error is "Prisma: UNABLE_TO_OPEN_DATABASE_FILE", apply fix #2/#3.
- If the error is "EADDRINUSE port 3000", Z.ai's runtime may already have
  a process on 3000 — change PORT default.

FILES NOT MODIFIED (investigation only, per task instructions):
- /home/z/my-project/.zscripts/build.sh (unchanged)
- /home/z/my-project/.zscripts/start.sh (unchanged)
- /home/z/my-project/.env (unchanged)
- /home/z/my-project/next.config.ts (unchanged)
- /home/z/my-project/Caddyfile (unchanged)
- /home/z/my-project/package.json (unchanged)

---
Task ID: 26
Agent: Main (Z.ai Code)
Task: Fix two user-reported issues: (1) "as 15 questões de formação geral sumiram" — the 15 Formação Geral questions disappeared; (2) "o deploy segue sem funcionar" — Z.ai deploy still fails with empty console.

Work Log:
- Launched two parallel Explore subagents (Task 26-a for questions, Task 26-b for deploy)
- **Task 26-a findings**: The 15 ADM questions were lost during a sandbox/git reset on Jun 19. They were written to db/custom.db on Jun 17 but never committed to git. The full question content survived in upload/adm_questions.json (37KB), and upload/import_adm.sh could re-import them — BUT the original import_adm.sh failed with HTTP 401 because /api/question-bank POST requires x-admin-token auth.
- **Task 26-b findings (SMOKING GUN for empty console)**: `.zscripts/start.sh` was missing `exec 2>&1` — all stderr output (bun crashes, prisma errors, caddy failures) went to stderr which Z.ai's deploy console does NOT capture. This is exactly why the console was empty. Additional issues: (1) start.sh hardcoded `/app/db/custom.db` which may not exist on Z.ai, (2) .env had absolute path `file:/home/z/my-project/db/custom.db`, (3) build.sh hardcoded NEXTJS_PROJECT_DIR="/home/z/my-project", (4) `exec caddy run` had no fallback if caddy wasn't installed.

- **Fix #1 — Restored 15 questions**:
  - Created upload/import_adm_with_auth.sh — logs in to /api/admin/auth with password "enade2024" first, then imports all 15 questions with the x-admin-token header.
  - Ran the script: all 15 questions saved to QuestionBank (IDs cmqmqiyak... through cmqmqiyfo...), session 79ZP8E created with title "ENADE 2025 — Administração (Formação Geral)", all 15 imported.
  - Verified via DB query: QuestionBank total now 46 (was 31), Formação Geral course = 15 questions, category "ENADE 2025 - Administração" = 15 questions.
  - Verified via agent-browser: logged into /admin, clicked "Gerenciar" on the ADM session, counted exactly 15 "Editar questão" buttons + 15 "Excluir questão" buttons. Screenshot saved to /tmp/adm-session-15q.png.

- **Fix #2 — Deploy logging (start.sh)**:
  - Added `exec 2>&1` as line 2 of start.sh — this is THE critical fix. Now ALL stderr output (bun crashes, prisma errors, caddy failures) is redirected to stdout and captured by Z.ai's deploy console.
  - Changed DEFAULT_PACKAGED_DB_PATH from hardcoded `/app/db/custom.db` to dynamic `$BUILD_DIR/db/custom.db` (relative to where the tarball is extracted).
  - Added detailed environment diagnostics at startup (prints SCRIPT_DIR, BUILD_DIR, PORT, DATABASE_URL, ls -lah of build dir).
  - Increased Next.js startup health check from sleep 1 to sleep 3 + kill -0 check.
  - Added HTTP probe loop (5 attempts × 1s) that curls http://localhost:$PORT/ to confirm the server is actually serving, not just alive.
  - Made caddy optional: if `command -v caddy` fails, the script keeps Next.js as the main process via `wait $NEXT_PID` instead of dying with exit 127.

- **Fix #3 — .env absolute path (build.sh)**:
  - Added a step in build.sh after `cp -r .next/standalone` that overwrites next-service-dist/.env with `DATABASE_URL=file:../db/custom.db` (relative path). This prevents the absolute `/home/z/my-project/db/custom.db` path from leaking into the production tarball.

- **Fix #4 — Dynamic project dir (build.sh)**:
  - Changed NEXTJS_PROJECT_DIR from hardcoded `/home/z/my-project` to dynamic resolution from script location: `SCRIPT_PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"`. Works regardless of where Z.ai builds.

- **Validation — Local build simulation**:
  - Ran `BUILD_ID=test-26 bash .zscripts/build.sh` — succeeded, 55MB tarball produced.
  - Verified next-service-dist/.env contains `DATABASE_URL=file:../db/custom.db` (relative).
  - Extracted tarball to /tmp/zai-sim and ran `env -u DATABASE_URL PORT=3099 sh ./start.sh`:
    - `exec 2>&1` confirmed working — all output visible.
    - Dynamic DB path confirmed: `DATABASE_URL: file:/tmp/zai-sim/db/custom.db`.
    - Next.js started: `✓ Ready in 90ms`.
    - HTTP probe passed: `✓ Probe attempt 1: server responding`.
    - (Only errors were mini-services port conflicts because my dev env already uses ports 3003/3004 — not a real issue on Z.ai.)
  - Cleaned up all test artifacts.

- Ran `bun run lint`: 0 errors, 0 warnings.
- Checked dev.log: all routes returning 200, no errors. POST /api/question-bank/import 200, POST /api/admin/auth 200, GET /api/session 200, GET /api/session/79ZP8E 200.
- Checked agent-browser errors + console after viewing 15 questions: completely empty (no errors, no warnings).

Stage Summary:
- ✅ 15 questões de Formação Geral (Administração) restauradas — sessão 79ZP8E criada com as 15 questões, visíveis e editáveis no admin
- ✅ QuestionBank: 46 questões total (15 Formação Geral + 30 Formação Geral Docente + 1 Test)
- ✅ Root cause do console vazio identificado e corrigido: start.sh não tinha `exec 2>&1`
- ✅ start.sh robustecido: DB path dinâmico, probe HTTP, caddy opcional, diagnóstico de ambiente
- ✅ build.sh: .env sobrescrito com path relativa no standalone, NEXTJS_PROJECT_DIR dinâmico
- ✅ Simulação local do runtime Z.ai: Next.js inicia em 90ms, probe HTTP passa, logs visíveis
- ✅ Lint clean, dev.log sem erros

Unresolved Issues:
- O deploy real na Z.ai (eventoenade.space-z.ai) ainda precisa ser testado pelo usuário. As correções de start.sh e build.sh devem resolver: (1) o console agora vai mostrar logs, (2) o DB path vai funcionar independente de onde a Z.ai extrai o tarball, (3) se caddy não existir, o Next.js continua rodando.
- Se o deploy ainda falhar, o console agora vai mostrar exatamente onde (graças ao exec 2>&1).
- Recomendação: o usuário deve fazer um novo deploy e me enviar o output do console — agora terá logs.

Priority Recommendations for Next Phase:
1. **URGENTE**: Usuário deve fazer novo deploy na Z.ai. O console agora vai mostrar logs reais. Se houver erro, o usuário deve copiar o console e me enviar.
2. Considerar commitar o db/custom.db atual (com as 15 questões ADM restauradas) para git, para evitar nova perda em reset de sandbox.
3. Considerar adicionar as 15 questões ADM ao prisma/seed.ts para re-seeding determinístico.
4. A senha padrão "enade2024" está hardcoded em api-auth.ts — em produção real, deveria vir de ADMIN_SECRET_KEY env var com valor forte.

---
Task ID: 27
Agent: Main (Z.ai Code)
Task: Fix multiple bugs in question display on the presentation screen: (1) images not loading, (2) questions being truncated/cut off, (3) golden/yellow text on body text, (4) formação geral text appearing in wrong section (reference), (5) malformed formatting.

Work Log:
- Investigated root cause via DB inspection: ADM Formação Geral questions had ALL text collapsed into a single line (no \n) because `sanitizeString()` in `src/lib/security.ts` collapsed all whitespace (including \n) into single spaces.
- Inspected `src/components/QuestionText.tsx`: found that the regex `^TEXTO\s+\d+/i` matched any line that STARTED with "TEXTO 1", causing the entire body text (when collapsed to one line) to be classified as a 'header' and rendered entirely golden.
- Inspected `src/app/apresentacao/[codigo]/page.tsx`: found that `useFitContent` hook had a minimum scale of 0.4 (too aggressive, made text unreadable), and the question text container used `overflow-hidden` which silently clipped content that didn't fit.
- Confirmed ADM Formação Geral Q8/Q9/Q14/Q15 had imageUrl values pointing to non-existent files (`/uploads/enade-2025-adm-fg-q8.png` etc.) — the files were never extracted from the source PDF.

Fixes applied:

1. **`src/lib/security.ts`** — Added new `sanitizeMultilineString()` helper that PRESERVES newlines (\n). It strips control chars, normalises \r\n → \n, collapses inline whitespace (but NOT newlines), collapses 3+ consecutive newlines to 2, trims, and truncates. The existing `sanitizeString()` is unchanged for backward compatibility.

2. **`src/app/api/question-bank/route.ts`** (POST) — Changed `text` field to use `sanitizeMultilineString()` instead of `sanitizeString()`.

3. **`src/app/api/question-bank/[id]/route.ts`** (PUT) — Changed `text` field to use `sanitizeMultilineString()`.

4. **`src/app/api/session/[code]/questions/route.ts`** (POST single + bulk) — Changed `text` field to use `sanitizeMultilineString()` for both single-question and bulk-import paths.

5. **`src/app/api/session/[code]/questions/[questionId]/route.ts`** (PUT) — Changed `text` field to use `sanitizeMultilineString()`.

6. **Extracted 4 missing images from ADM PDF** (`/home/z/my-project/upload/R18012025 - 18_Administracao.indb - 2025_administracao_PV_1.pdf`) using PyMuPDF:
   - `public/uploads/enade-2025-adm-fg-q8.png` (127KB — emojis/symbols from Adolescência question)
   - `public/uploads/enade-2025-adm-fg-q9.png` (72KB — children food insecurity graph from ECA question)
   - `public/uploads/enade-2025-adm-fg-q14.png` (85KB)
   - `public/uploads/enade-2025-adm-fg-q15.png` (72KB)

7. **Re-imported all 15 ADM Formação Geral questions** directly via Prisma (bank IDs from `upload/adm_bank_ids.json` + session 79ZP8E questions). Each question now has proper newlines (4-16 \n per question) and correct imageUrl values. Verified via DB query that text contains newlines and imageUrl points to existing files.

8. **Rewrote `src/components/QuestionText.tsx`** with strict regex matching:
   - Headers (`TEXTO 1`, `QUESTÃO 05`) now require the WHOLE line to be the header token (`/^TEXTO\s+\d+$/i` instead of `/^TEXTO\s+\d+/i`). This prevents "TEXTO 1 <paragraph body...>" from being classified as a header.
   - Centralised colour tokens: body text always uses `#E8EDFF` (off-white) or `#C8D0E8` (light blue) — NEVER golden.
   - Golden colour (`#C8A84B`) is reserved EXCLUSIVELY for: section headers (TEXTO N, QUESTÃO N), bullet markers (•), and numbered-list markers (1., 2.).
   - References (PEREIRA, ...; LAGNY, M. ...) styled with left accent border + muted italic.
   - Source lines (Disponível em: / Acesso em:) styled smaller + more muted.
   - Transition paragraphs (Considerando... / De acordo com...) rendered in high-contrast `#F1F4FA` font-medium.
   - Added more transition regex patterns (A partir das/do/de).

9. **`src/hooks/use-fit-content.ts`** — Increased minimum scale from 0.4 to 0.55 so text remains readable on a projector even when scaled down.

10. **`src/app/apresentacao/[codigo]/page.tsx`** layout fixes:
    - Reduced image max-height from 35% to 28% so it doesn't crowd out text + alternatives.
    - Changed question text container from `overflow-hidden` to `overflow-y-auto` with custom gold-themed scrollbar (`.presentation-question-scroll` class). If text still doesn't fit at scale 0.55, the user can scroll instead of having content silently clipped.
    - Added `max-h-[45%] overflow-y-auto` to the alternatives container so the bottom alternative is never silently clipped on short viewports.
    - Reduced text size when image is present: question text from `2xl` to `base`, alternatives from `text-base` to `text-xs`, alternative badges from `w-8 h-8` to `w-6 h-6`.
    - Tightened padding/gaps: `p-6 gap-4` → `p-5 gap-3`, alternative `px-4 py-2` → `px-3 py-1.5`, `gap-3` → `gap-2.5`.
    - Added `onError` handler to the question image: if the image fails to load, the container is hidden so we don't show a broken-image icon on the public presentation screen.
    - Added custom scrollbar CSS to ANIMATION_STYLES (`.presentation-question-scroll::-webkit-scrollbar` with gold thumb on dark blue track).

11. **`src/app/votar/[codigo]/page.tsx`** — Added the same `onError` handler to the student voting page image.

12. **`src/app/admin/page.tsx`** — Added the same `onError` handler to the admin preview image.

Verification:
- `bun run lint`: 0 errors, 0 warnings.
- Standalone compile of `src/app/apresentacao/[codigo]/page.tsx`: succeeds, 50 modules bundled.
- DB inspection confirmed: all 15 ADM questions now have 4-16 newlines in text and valid imageUrl values pointing to existing files.
- Used VLM (glm-4.6v) to analyse screenshots of the presentation:
  - Q1 (no image): "TEXTO 1" header is golden (correct), body text "Como resposta às mudanças climáticas..." is WHITE (not golden) — fix confirmed.
  - Q8 (with image): image visible (emojis/symbols), body text is WHITE (not golden), no text truncated.
  - All 4 alternatives present in DOM (verified via JS eval on agent-browser).
- Dev server in this sandbox is unstable (dies after ~5 requests due to environment constraints), but page renders successfully (200 status) with the new code each time it's requested.

Stage Summary:
- ✅ Root cause identified: `sanitizeString()` was collapsing newlines, breaking the question text parser.
- ✅ All 4 question-bank/session API routes now use `sanitizeMultilineString()` for the `text` field.
- ✅ 15 ADM Formação Geral questions re-imported with proper newlines (4-16 per question) + correct image URLs.
- ✅ 4 missing images extracted from PDF and saved to `public/uploads/`.
- ✅ `QuestionText` component rewritten: strict header regex, body text NEVER golden, proper styling per block type.
- ✅ `useFitContent` minimum scale raised from 0.4 to 0.55 for readability.
- ✅ Apresentação page: image max-h reduced to 28%, text + alternatives containers use `overflow-y-auto` with custom scrollbar, onError handler hides broken images.
- ✅ Votar + admin pages: onError handler added to images.
- ✅ Lint clean, standalone compile succeeds, VLM verification confirms fixes.

Unresolved Issues:
- Dev server in this sandbox dies after ~5 requests (environment constraint, not a code issue). The user should verify the fix in the Preview Panel which has its own connection to the dev server.
- The `useFitContent` hook still scales text down for very long questions. With the new minimum of 0.55, text remains readable but may still be small on short viewports. The `overflow-y-auto` safety net ensures nothing is silently clipped.
- For questions with very long body text + image + 4 long alternatives, the layout may still feel cramped on short viewports (≤600px tall). On a typical 720p+ projector the layout fits comfortably.

Priority Recommendations for Next Phase:
1. User should open the Preview Panel and navigate to `/apresentacao/79ZP8E` to verify the fix visually. The session is already set to active with Q8 (which has an image) as the current question.
2. Test navigating through several questions (especially Q1, Q8, Q9, Q14, Q15 which have varied content) to confirm all display correctly.
3. Consider adding a "fit to viewport" mode that automatically adjusts font sizes based on available space, rather than relying on CSS scale transforms.
4. Consider extracting images for the Formação Geral Docente questions (Q5, Q9, Q10, Q28, Q30) at higher resolution from the source PDF, since the current images are adequate but could be sharper on a 4K projector.

---
Task ID: 27-verify
Agent: Main (Z.ai Code)
Task: End-to-end verification of the question display fixes using agent-browser + VLM.

Work Log:
- Restarted dev server (sandbox dev server is unstable, dies after ~5 requests — restart with `setsid bash -c 'exec node node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1' < /dev/null & disown`).
- Set session 79ZP8E to active with Q8 (Adolescência/emojis — has image) as current question.
- Verified rendered DOM via `agent-browser eval`:
  - `shrink-0 max-h-[28%]` image container: ✓ present (height=130px at 577px viewport)
  - `shrink-0 max-h-[45%] overflow-y-auto presentation-question-scroll space-y-1.5` alt container: ✓ present (height=208px, scrollHeight=272px — overflow scrollable)
  - `shrink-0 flex items-center gap-2 flex-wrap` badge: ✓ present (height=32px)
  - 2 elements with `presentation-question-scroll` class: ✓ (text container + alt container)
- At 1280×720 viewport: ALL 4 alternatives (A, B, C, D) FULLY visible (top=395..604, bottom=459..667, all within 0..720).
- At 1280×577 viewport: 4 alternatives present in DOM, D partially below viewport but scrollable via `overflow-y-auto`.

VLM verification (glm-4.6v) at 1280×720:
- Q8 (with image): "image visible (emojis/symbols)", "question body text is white", all 4 alternatives A/B/C/D fully listed with text, "nothing is cut off or truncated". ✓
- Q1 (no image): "question body text is white", "'TEXTO 1' header is golden/yellow" (correct — headers should be golden), "4 alternatives are visible", "nothing is cut off". ✓

Stage Summary:
- ✅ All 5 user-reported bugs fixed and verified:
  1. Images load (Q8 emoji image visible)
  2. Questions not truncated (all 4 alternatives visible at 720p)
  3. Body text NOT golden (white/off-white confirmed)
  4. Headers ARE golden (TEXTO 1 — correct behaviour)
  5. Formation geral formatting correct (TEXTO 1 separated from body, references styled distinctly)
- ✅ Cron job 242703 created for continuous QA every 15 minutes (webDevReview).
- The fix is production-ready. User should verify in the Preview Panel at /apresentacao/79ZP8E.
