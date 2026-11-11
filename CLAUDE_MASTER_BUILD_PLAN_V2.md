# MASTER BUILD PLAN V2.0 — TIKTOK LIVE QUIZ / BA VUONG DAI CHIEN

**Date:** 2026-11-11  | **Target:** Claude Code | **Platform:** Windows local-first | **Language:** Vietnamese UI

> IMPLEMENTATION CONTRACT: Build a real, testable application, not a static image or an unverified TikTok integration. Work phase-by-phase, report test results, and obtain approval at the architecture gate. Do not invent tournament facts or expose private spreadsheet fields.

## 0. Decision record and scope

Build one reusable **TikTok LIVE comment-driven Quiz Engine**, with interchangeable **Theme Packs**, an **AI Question Studio**, a local operator dashboard, a 9:16 stream overlay, automatic rounds, leaderboard and a semi-3D victory ceremony. First pack: **Đấu Trường Bão Tố / Bá Vương Đại Chiến**. Future packs use the same core engine.

**Source hierarchy:** (1) approved user-supplied assets and verified public event information; (2) approved public tournament references; (3) AI draft only. Never treat AI generation as factual verification. The supplied Megasheet is an internal production source, **not** a distributable app asset. Import only explicitly approved, public-facing facts; never bundle emails, phone numbers, dates of birth, UID, credentials, contact sheets, internal operational notes, or unapproved roster details. Preserve source provenance privately, with source-level access controls.

**Verified workbook anchors:** sheet `1. Wiki` identifies Bá Vương Đại Chiến, abbreviation BVĐC, Clash Squad, domestic competition, 8 teams and GMT+7. `Project Timeline` lists rehearsal 12 Nov and match days 13–14 Nov 2026. `RUNDOWN 13.11` and `RUNDOWN 14.11` contain broadcast segments; treat planned timings as schedules, not results. Team/player graphics provided by user are visual references, not permission to infer match outcomes. The workbook contains inconsistent placeholder/error cells; flag them rather than guessing.

**MVP must:** run offline in simulator; load theme and approved questions; score A/B/C/D comments; persist games; run auto rounds; render 9:16; show Top 10; animate a winner scene; optionally connect to TikTok only after a real supported integration has been verified. No gifts, payments, SaaS, mobile app, gameplay shooter or automated Facebook login.

## 1. Hard architecture rules

Recommended monorepo:

```text
apps/dashboard/        React + Vite + TypeScript operator UI
apps/overlay/          React + Vite + TypeScript browser source
apps/server/           Node.js + Fastify + WebSocket
packages/contracts/    Zod schemas, DTOs, event types
packages/quiz-core/    pure state machine, scoring, selection
packages/theme-core/   pack loader, asset manifest validation
packages/live-adapters/ mock and TikTok adapters
packages/ai-core/      AI provider adapters, source extraction
packages/persistence/  SQLite + migrations + repositories
assets/storm-arena/    approved sanitized visual assets
fixtures/              fictional test players and questions
tests/                 unit, integration, e2e, load
scripts/ docs/
```

Use pnpm workspaces, strict TypeScript, Zod, Vitest, Playwright, SQLite (Drizzle or Prisma, justify choice), backend-owned monotonic timer, server-owned scores. Electron packaging is **later**, after localhost version passes. Bind server to `127.0.0.1` by default; protect admin APIs even on localhost. Overlay must not expose correct answer before reveal or admin secrets. No runtime JS embedded in theme packs. The overlay may use CSS 3D transforms, layered PNG/WebP, sprite animation, Canvas/Pixi for particles; **do not require Three.js** for MVP. If real 3D is justified, make it an optional isolated renderer.

## 2. User journeys and pages

**Operator pages:** Home; Live Setup; Live Control; Theme Library; Theme Preview; Question Bank; AI Question Studio; Sources & Review; Session History; Leaderboards; Settings; Diagnostics. Live Control includes Start, Pause, Resume, Skip, Void Question, Stop, Next Round, Auto toggle, connection status, timer, accepted answers, participants, and current pack. Dangerous actions require confirmation, reason and audit event.

**Overlay scenes:** Lobby; Question; Reveal; Interim Top 10; Round Winner; Victory Ceremony; Intermission; Connection Lost. Overlay is separate from dashboard; no admin controls appear on stream. All scenes subscribe to the same versioned backend state snapshot; on reconnect, request latest snapshot rather than replaying animations blindly.

**Question Studio:** prompt or subtopic → attach permitted source text/PDF/images/accessible URLs → extraction → evidence snippets → generate batches (10–20) → structural/semantic validation → duplicate check → human review/edit → approve → publish to bank. Never auto-approve AI output.

## 3. Authoritative state machine

States: `IDLE`, `LOBBY`, `PREPARE`, `ACCEPTING`, `REVEAL`, `LEADERBOARD`, `ROUND_END`, `VICTORY`, `INTERMISSION`, `PAUSED`, `CONNECTION_INTERRUPTED`, `ERROR`.

Transitions:

```text
IDLE -> LOBBY -> PREPARE -> ACCEPTING -> REVEAL -> LEADERBOARD
LEADERBOARD -> PREPARE (if questions remain)
LEADERBOARD -> ROUND_END -> VICTORY -> INTERMISSION -> LOBBY
any active state -> PAUSED -> previous state (explicit resume)
ACCEPTING -> CONNECTION_INTERRUPTED -> (operator resume/void/stop)
any active state -> ERROR (fatal, stop timers, preserve snapshot)
```

Implement transition reducer as pure function `(state, command, now) => result/events`, with exhaustive state/command guards. Commands carry idempotency key, expected `stateVersion`, operator identity and request timestamp. Backend transaction commits state and outbox events before WebSocket broadcasts. Reject stale commands with conflict response; no duplicated transitions on retries. Timers are server-authoritative and reconstructible from remaining milliseconds. Pause freezes remaining time; restart must **never auto-resume a live question**.

**Default timings** configurable: lobby 30s; prepare 3s; answer 15s; reveal 4s; leaderboard 4s; victory 15–20s; intermission 20–30s. A round has 15 questions. Operator can choose 10/15/20. Auto mode requires preflight checks before each round and pauses on integrity/connection failure. In mock mode, manual speed multiplier is allowed but never for real LIVE.

## 4. Comment ingestion — exact algorithm

`LiveAdapter` interface: `connect`, `disconnect`, `status`, `onComment`, `onStatus`, `healthCheck`. Implement `MockAdapter` first; TikTok adapter behind feature flag. Do not assert an official API exists without evidence. TikTok feasibility gate must verify actual permitted connection, stable user identifier, message delivery and reconnect on the target account/environment. If impossible, mark `LIVE_CONNECTOR_BLOCKED` and ship mock-ready build only.

Normalized event:

```ts
type CommentEvent = {
  source: 'MOCK'|'TIKTOK'; eventId?: string;
  userId: string; displayName: string;
  text: string; receivedAtMs: number;
  sourceTimestampMs?: number;
};
```

Process sequentially per active question or through transactional unique constraints:

1. Receive and stamp `receivedAtMs` at server boundary; validate required stable `userId`.
2. Normalize Unicode NFKC, trim, uppercase; accept **exactly** `A|B|C|D` (configurable optional `!A` later). Do not parse arbitrary messages containing a letter.
3. Validate active state `ACCEPTING`, question instance and `openAtMs <= receivedAtMs < deadlineMs` (end-exclusive). Never attribute buffered events from previous question to new one; during prepare/reveal, ignore answers. If adapter cannot guarantee event freshness, conservatively quarantine delayed events.
4. Deduplicate source `eventId` if present. Use database `UNIQUE(questionInstanceId, playerId)` as final authority: **first accepted answer wins**. No answer changes; spam cannot earn extra points.
5. Create/resolve session player from stable source+userId; nickname is display-only. Store minimal player data; sanitize text for overlay.
6. Atomically persist answer, scoring event and updated totals (or queue deterministic score calculation on reveal). Send aggregate counts; never send correct answer to public overlay during `ACCEPTING`.
7. Keep rejection reason in bounded diagnostics, not unbounded raw comment logs. Maintain metrics accepted/duplicate/late/invalid.

Fairness: score by server receipt time; no speed bonus in MVP due to unpredictable TikTok latency. On lost connection during question, freeze clock and require operator to resume, void or stop; never silently score missed messages. A real connector may miss comments; report that limitation. Treat all names as untrusted strings.

## 5. Score calculation and leaderboard

Per answer: correct +100, incorrect/unanswered +0. Correct streak milestones at 3 +30, 5 +50, 10 +100 **once when reached**, resetting streak on wrong or missed question. A player joining mid-round starts at zero; no penalty for prior unanswered questions. At reveal, finalize scores in a single transaction; recomputing the same question must be idempotent. Score ledger has unique `(roundId, questionInstanceId, playerId, scoreReason)`.

Ranking: total score descending, correct answers descending, then **shared rank for exact ties**; deterministic display ordering by stable player ID, without breaking rank equality. Save Top 10 snapshots after each question. Never fabricate Top 10 if fewer than ten players. During active question, show a **compact or hidden leaderboard**; show full Top 10 on a dedicated interim screen (default every 5 questions) and at end. Winner scene uses Top 3 only, with ties handled by explicit UI rule: if a tied group spans a podium cutoff, show `ĐỒNG HẠNG` / a tie presentation instead of falsely labeling distinct ranks; operator can choose an announced tie-break rule before the round, never after.

## 6. Question selection

Question fields: `id`, `packId`, `subtopicId`, `prompt`, `options[4]`, `correctOptionId`, `explanation`, `difficulty`, `tags`, `sourceRefs`, `verificationStatus`, `approvalStatus`, `version`, `media`, `validFrom/validUntil`, `lastUsedAt`. Only `APPROVED + VERIFIED` (or explicit operator-verified) can enter a public round. Four nonempty, unique answers, one correct, image asset resolvable, display length within safe limits.

Modes: `RANDOM`, `SMART_RANDOM` (default), `MANUAL_PLAYLIST`. SMART_RANDOM selects 7 easy, 5 medium, 3 hard for 15 questions, balancing subtopics, prioritizing unused in the **current LIVE session**, then least-recently-used across sessions. Pre-generate entire round with seeded PRNG and store `seed`, selected question IDs, **immutable question snapshots**, and shuffle mapping. Shuffle option positions with correct-answer remapping. If quotas cannot be met, use configured redistribution; if total bank insufficient, **pause and prompt** for reduce length, allow reuse, or switch collection. Never repeat silently. Warn when remaining approved unused pool < next round requirement. For 100 questions, six 15-question rounds without repeat are possible only if filters/quotas permit.

## 7. AI Question Studio and factual provenance

Inputs: typed prompt, pasted text, PDF/TXT, JPG/PNG/WebP, accessible public URL. Parse documents locally when possible; OCR/vision only for supplied images; extraction results are **candidate evidence**, not automatic fact certification. URL importer must block SSRF (private IP, localhost, DNS rebinding, unsafe redirects), enforce timeouts/size/type limits and respect access restrictions. No bypass of Facebook login/CAPTCHA. If Facebook cannot be read, show actionable `SOURCE_UNAVAILABLE`, allow user to upload screenshots/caption.

AI provider interface with `generateDrafts`, `rewrite`, `validate`, `explain`; API key server-side only, configurable provider, JSON-schema output, bounded retries, cancellation, per-job estimated cost and logs excluding secrets. Validate generated JSON, exactly 4 options, one correct, evidence support, no duplicate/similar questions, no time-sensitive unverified assertion. Distinguish `DRAFT`, `NEEDS_EVIDENCE`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `ARCHIVED`. Editing an approved question creates a new version and reverts to review. Evidence should store source ID, exact supporting excerpt/asset page, observed date, confidence **as an internal signal only**. Do not generate answers from private spreadsheet credentials or sensitive columns.

**First pack subtopics:** tournament overview; format and schedule; eight teams and public rosters; publicly announced creators/players; Storm Arena event mechanics; visuals and logos; approved post-event results (only once verified). Separate `scheduled` from `completed` facts. No fabricated winner, score, match result, prize amount or roster substitution. Require explicit source approval for all player facts. Sample questions used in previews must be labeled FICTIONAL/DEMO until reviewed.

## 8. Theme Pack contract and visual design

Theme Pack = validated manifest + assets + layout tokens + optional rule defaults + question collection references. No arbitrary scripts. Schema version and pack version required; reject invalid paths, huge assets, unsupported formats, missing fonts or missing required logos. Load theme atomically; if broken, fall back to generic theme without interrupting active round. Never change pack in middle of an active question without an explicit operator transition.

**Storm Arena tokens from user Visual Guide:** `#2D387F` deep blue, `#7049F5` violet, `#FFCC58` gold, `#E47E5F` coral, `#D24470` pink, `#8CC8FB` electric light blue. GFF Latin Black/Bold/Medium are **visual references**; do not redistribute font files, verify licensing and Vietnamese glyph coverage, fall back to a licensed Vietnamese-supporting sans font. Use provided logo, angular frames, energy portal, trophy, chibi references and approved team logos. Do not replace original trophy shape with three generic numbered cubes.

**Visual language:** premium **semi-3D** via layered parallax, bevels, realistic shadows, restrained glow, metallic textures and a 2.5D stage. Avoid clutter, lightning behind text, busy full-screen effects and tiny leaderboard text. Prioritize readability over effects. Animate transitions at 30–60fps target; add reduced-motion setting. Do not flatten entire overlay into a single background image: question, timer, answers, names, score, rank, UI frames must be independent DOM/Canvas layers. Use supplied source art as references and separate assets, not AI-generated replacement of the trophy.

## 9. TikTok LIVE safe-zone system — critical

Output 1080×1920 (9:16). **Do not equate aspect ratio with safe-zone compliance.** TikTok HUD differs across devices and LIVE modes; implement an adjustable `SafeZonePreset` (top, bottom, left, right, comment region) in dashboard and a HUD Simulator. Conservative **initial test preset**, NOT official TikTok specification: top 230px, bottom 690px, right 130px; these must be tunable per test device and content scene. Do not hard-code these as universal. Add overlay guides that are visible only in preview.

**Question scene:** reserve upper usable area for question and 4 answers; if space insufficient, hide mini leaderboard, shrink branding, reflow answers to one column if it improves legibility. Ensure all four options are fully readable, not behind chat, right icons or controls. Do not put mandatory instructions or player names in bottom chat region. Question and timer are the highest priority; Top 10 belongs on a separate scene. If chat overlap occurs in real testing, operator adjusts safe zone preset and saves it.

**Victory scene:** trophy and original stage geometry are hero elements; three chibi stand on the **lower foreground floor in front of the stage**, never on top of or obscuring trophy silhouette. Left = Top 2, center = Top 1, right = Top 3. Nameplates should be directly above or adjacent to each avatar and must remain within calibrated safe region; if chat covers lower nameplates, shift all nameplates upward while keeping characters and trophy separate. The trophy may occupy decorative region; **rank/name/score must not**. Remove the FREE FIRE logo from the top; use only approved Bá Vương Đại Chiến branding. Preserve stage outline and trophy proportion from `IMG_2125.jpeg` / `IMG_2125(1).jpeg`, not substitute podium cubes. Background can reference `IMG_2124.jpeg`, `IMG_2141.jpeg`, `IMG_2142.jpeg` and chibi reference `IMG_2134.jpeg`. These file names are design input references, not files to ship without asset rights confirmation.

**Victory animation sequence:** 0–0.6s darkened arena/portal; 0.6–1.4s trophy light-up (trophy stays unobstructed); 1.4–2.3s three chibi enter lower foreground with depth/shadow; 2.3–3.0s Top 2/1/3 nameplates animate in; 3.0–5.0s restrained confetti/spotlight; hold 10–15s. No mandatory information below calibrated safe zone. If no character assets available, use transparent placeholder silhouettes rather than inventing licensed characters. Support mapping character skin to rank/player; default deterministic choices. The same three chibi can be reused with different nameplates for MVP.

**Top 10:** Full Top 10 scene must show rank, nickname and score (optional correct count) in two-column 1–5 and 6–10 layout only if readable at mobile size. If too small, paginate 1–5 then 6–10 or use sequential slides. Do not squeeze tiny type. When HUD preview is on, ensure no important text overlaps. During question scene use a compact Top 3 or no ranking; full Top 10 after Q5, Q10 and Q15.

## 10. Persistence schema and migrations

Tables minimum: `theme_packs`, `subtopics`, `questions`, `question_versions`, `question_sources`, `generation_jobs`, `live_sessions`, `rounds`, `round_questions`, `players`, `round_players`, `answers`, `score_events`, `leaderboard_snapshots`, `game_snapshots`, `operator_actions`, `settings`, `connection_events`. Foreign keys, indexes, unique constraints and migrations required. Keep sensitive data out of test fixtures. Player ID scoped by source+stable sourceUserId. Store only minimum necessary data and support purge/export. Snapshots store state version, scene, remaining timer, selected questions, scores and pack version. Restart to `RECOVERY_PENDING` (operator chooses resume/void/stop); never auto-resume a question. Use SQLite WAL, transaction boundaries and periodic backup.

## 11. APIs and real-time contracts

HTTP: `GET /health`, `GET /api/themes`, `POST /api/themes/import`, `GET /api/questions`, `POST /api/questions`, `POST /api/questions/generate`, `POST /api/questions/:id/approve`, `POST /api/sessions`, `POST /api/sessions/:id/commands`, `GET /api/sessions/:id/state`, `GET /api/sessions/:id/history`, `GET /api/diagnostics`. Require admin auth for mutations; localhost-only and CSRF/origin protections where applicable.

WebSocket messages versioned with `{type, sessionId, stateVersion, serverTimeMs, payload}`. Types: `STATE_SNAPSHOT`, `SCENE_CHANGED`, `TIMER_SYNC`, `QUESTION_OPENED_PUBLIC`, `ANSWER_COUNTS`, `ANSWER_REVEALED`, `LEADERBOARD_UPDATED`, `VICTORY_STARTED`, `CONNECTION_STATUS`, `ERROR_PUBLIC`. Never include `correctOptionId` in `QUESTION_OPENED_PUBLIC`. Client reconnection sends `HELLO` and requests snapshot; server handles out-of-order stateVersion.

## 12. Operator controls, audit and errors

`SKIP_QUESTION`: void question, no scoring, advance safely. `VOID_QUESTION`: if already revealed, reverse ledger via compensating events, recalculate standings, keep audit trail; do not mutate past ledger silently. `PAUSE`: freeze timer and visual countdown; `RESUME`: require valid source status. `STOP`: close session and archive results; `RESTART_ROUND`: new round ID and new question snapshots, never overwrite completed round. `MANUAL_NEXT`: only legal from defined states. `AUTO_MODE`: preflight check available approved question pool, theme assets, storage, connection and operator-selected failure policy. Every action records reason/time/version.

## 13. Performance and QA

Mock load targets (not TikTok delivery guarantees): 100 concurrent players baseline, 500 players stress, 100 incoming comments/s burst. Benchmark ingestion-to-ack latency, WebSocket fanout, SQLite contention and dropped events. Test answer spam, duplicate events, two simultaneous answers, late/early answers, disconnect/reconnect, backend crash, browser reload, invalid theme, invalid AI JSON, ambiguous answers, zero participants, ties at podium cutoff, exhausted pool, Vietnamese names and long nicknames, safe-zone at different devices, 6+ rounds. Test screenshot comparison for all overlay scenes, including HUD Simulator with dense comments. Validate Vietnamese glyph rendering.

**Definition of done:** real LIVE only if connector tested with real account in permitted environment; mock-ready alone is not LIVE-ready. All state/score tests pass; operator can run without editing code; overlays show no correct answer before reveal; Top 10 and victory scenes visually verified on phone; trophy unobstructed; rank/name/score outside calibrated HUD occlusion; backup and crash recovery tested; deployment guide written.

## 14. Build phases and approval gates

**Phase 0 (1–2 days):** audit inputs; map allowed/public assets; architecture, contracts, schema, repository, CI/test scaffold. Output architecture decision record, risk register and task dependency graph. STOP for approval.

**Phase 1 (3–5 days):** deterministic offline Quiz Engine, simulator, scoring, state machine, persistence, basic overlay; unit/integration tests. Acceptance: 15-question mock round, 100 simulated players, no double score, restart-safe.

**Phase 2 (3–5 days):** Theme Pack + Question Bank, import/export, approval, smart random, visual tokens, preview. Acceptance: swap two packs without code change; no question repeats in session while pool sufficient.

**Phase 3 (3–6 days):** AI Question Studio, evidence capture, review UI, duplicate detection, safe source importer. Acceptance: 20 drafts, 4 options each, editing, verification gate, approved-only publishing.

**Phase 4 (3–7+ days, uncertain):** TikTok adapter feasibility and implementation; status and reconnect. **Do a feasibility spike early in parallel** so access limitations are discovered before polish. Acceptance requires real permitted connection; otherwise clearly blocked.

**Phase 5 (4–7 days):** semi-3D Storm Arena overlay, calibrated HUD simulator, dedicated Top 10, 9:16 Victory scene, animation and original trophy/stage preservation. Acceptance: mobile screenshots/video at 9:16 with simulated and real HUD checks.

**Phase 6 (3–5 days):** auto mode, crash recovery, backup/restore, performance, Windows run/packaging, operator manual, live rehearsal. Acceptance: 6 consecutive mock rounds and one verified LIVE rehearsal when connector permits.

Estimates are planning ranges for one experienced developer with AI assistance, not guaranteed delivery dates. Asset preparation, permissions and TikTok restrictions may add time.

## 15. Exact instructions for Claude Code

1. First inspect repository, input files, existing code and assets; do not overwrite work blindly.
2. Produce `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DATA_PRIVACY.md`, `docs/THEME_PACK_SPEC.md`, `docs/GAME_RULES.md`, `docs/TEST_PLAN.md`, `docs/IMPLEMENTATION_BACKLOG.md` and `README.md`.
3. Identify input artifacts and permitted usage. **Never copy the whole Megasheet into public fixtures or production package.** Extract only explicitly approved public facts after field-by-field review.
4. Before coding, explain risks: TikTok connectivity, delayed comments, Facebook access, licensing, safe-zone variability, AI hallucinations, incorrect workbook cells.
5. Ask only blocking architectural questions. Otherwise use defaults in this plan.
6. Implement Phase 0 and Phase 1 first; show commands and tests, not just claims.
7. After each phase, report changed files, commands, test output, screenshots, known limitations, acceptance criteria and next phase dependencies.
8. Do not claim victory UI is complete until it preserves the user-supplied original trophy/stage, keeps avatars in lower foreground, excludes top Free Fire logo, and passes 9:16 HUD simulation.
9. Do not claim TikTok LIVE is complete until a real comment reaches the backend and affects a live round in a permitted test.
10. Preserve modularity: future Theme Packs must not require modifying the Quiz Engine.

**START NOW WITH: architecture audit + Phase 0 plan + Phase 1 implementation checklist. Do not code all phases at once.**
