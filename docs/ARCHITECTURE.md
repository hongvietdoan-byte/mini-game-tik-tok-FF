# Kiến trúc — TikTok LIVE Quiz (Phase 0/1)

## Thành phần

```
          TikTok LIVE (Phase 4, đang BLOCKED)        MockAdapter + MockSimulator (Phase 1)
                         │                                       │
                         └──────── LiveAdapter.onComment ────────┘
                                             │  RawComment (server đóng dấu receivedAtMs)
                                             ▼
┌──────────────────────── apps/server (Fastify, 127.0.0.1:8787) ─────────────────────────┐
│  SessionRuntime                                                                         │
│   ingest(): Zod → decideComment (A|B|C|D, cửa sổ [open, deadline)) → khử eventId          │
│             → transaction{ resolvePlayer, INSERT answer ON CONFLICT DO NOTHING }          │
│   dispatch(): idempotency(commandId) → chọn vòng (seed) → apply()                         │
│   apply():  transition() thuần → transaction{ hiệu ứng, game_snapshot, operator_action,   │
│             outbox } → commit → phát WS từ outbox → đặt lại timer                         │
│   đồng hồ:  Scheduler (Real / Manual) — deadline tuyệt đối, heartbeat 1 s                 │
│  Routes HTTP (docs/API_CONTRACT.md) · WS /ws: HELLO overlay | admin(token)                │
└───────────────────────────────┬─────────────────────────────────────┬───────────────────┘
                                │ PublicSnapshot (không đáp án)        │ AdminSnapshot
                                ▼                                     ▼
                  apps/overlay (1080×1920, :5174)        apps/dashboard (Live Control, :5173)
```

| Package | Vai trò | Phụ thuộc |
|---|---|---|
| `packages/contracts` | Zod schema, DTO, kiểu WS — nguồn sự thật duy nhất | zod |
| `packages/quiz-core` | Thuần: parse đáp án, cửa sổ, chấm điểm, xếp hạng, podium, chọn câu có seed, reducer | contracts |
| `packages/persistence` | SQLite (WAL) + migration Drizzle + `Store` (prepared statements) | contracts, quiz-core (kiểu) |
| `packages/live-adapters` | `LiveAdapter`, `MockAdapter`, `TikTokAdapterBlocked`, `Scheduler`, `MockSimulator` | contracts |
| `packages/theme-core`, `ai-core` | Stub — Phase 2 / 3 | — |
| `apps/server` | `SessionRuntime`, Fastify, WS | tất cả ở trên |
| `apps/overlay`, `apps/dashboard` | React + Vite, chỉ phụ thuộc contracts | contracts |

## Máy trạng thái

```
IDLE → LOBBY → PREPARE → ACCEPTING → REVEAL ─┬─(mốc 5/10/15)→ LEADERBOARD ─┬→ PREPARE
                ▲                            └─(không mốc)───→ PREPARE      └─(câu cuối)→ ROUND_END → VICTORY → INTERMISSION → LOBBY
                │
 PAUSED (PAUSE / RECOVERY) ◄── trạng thái hoạt động; CONNECTION_INTERRUPTED ◄── ACCEPTING; ERROR ◄── bất kỳ (FATAL)
```
Trạng thái treo lưu `suspended.from`; scene suy từ trạng thái hiệu lực. Chi tiết luật: `docs/DECISIONS.md`.

## Dòng dữ liệu một câu hỏi
1. `PREPARE` hết giờ → `ACCEPTING`: `QUESTION_OPENED` → `round_questions.status=OPEN`, simulator lên lịch comment.
2. Comment hợp lệ → `answers` (UNIQUE câu+người) → đếm A–D trong bộ nhớ → `ANSWER_COUNTS` (gộp 250 ms, chỉ tổng).
3. Hết giờ → `REVEAL`: `QUESTION_CLOSED` → tính lại toàn vòng → sổ cái (idempotent) → `round_players` → đối chiếu → `leaderboard_snapshots`.
4. Mọi thay đổi trạng thái đều lưu `game_snapshots(session, stateVersion)` để khôi phục.

## Bảng dữ liệu
`theme_packs, subtopics, questions, question_versions, question_sources, generation_jobs, live_sessions, rounds, round_questions, players,
round_players, answers, score_events, leaderboard_snapshots, game_snapshots, operator_actions, outbox_events, settings, connection_events`
(migration `packages/persistence/migrations/0000_*.sql`). Không có cột email / điện thoại / ngày sinh / UID game.

## Kiểm thử
| Lớp | Vị trí | Chạy |
|---|---|---|
| Unit (thuần) | `packages/*/src/**/*.test.ts`, `fixtures/`, `apps/*/src/**/*.test.ts` | `corepack pnpm test:unit` |
| Tích hợp (đồng hồ ảo `ManualScheduler`) | `tests/integration` | `corepack pnpm test:integration` |
| Tải | `tests/load` | `corepack pnpm test:load` |
| E2E overlay (Edge) | `tests/e2e` | `corepack pnpm test:e2e` |
| Mô phỏng một vòng | `scripts/simulate-round.ts` | `corepack pnpm simulate -- --players 100` |

## Rủi ro (sổ rủi ro rút gọn — chi tiết `docs/IMPLEMENTATION_BACKLOG.md`)
TikTok không có kết nối được phép (BLOCKED tới Phase 4) · comment trễ/mất trên kết nối thật · vùng an toàn thay đổi theo thiết bị ·
bản quyền font GFF/asset cúp-chibi-logo · ô lỗi/placeholder trong Megasheet · AI bịa dữ kiện (Phase 3) · Facebook không đọc được (Phase 3).
