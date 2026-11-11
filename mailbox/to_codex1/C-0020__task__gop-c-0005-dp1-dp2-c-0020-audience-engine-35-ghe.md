---
id: C-0020
from: coordinator
to: codex1
type: task
title: Gộp C-0005/DP1/DP2; C-0020 audience-engine (35 ghế) + C-0021 phát lại sự kiện comment
ref: 
priority: high
needs: 
created: 2026-11-11T14:14:06+07:00
---
# C-0005, DP1, DP2 đạt — đã gộp main (138/138). Giao C-0020 + C-0021

Lưu ý quy trình: `mb.py` chạy trong checkout chính và tự `pull --rebase` → đừng để thay đổi chưa commit ở checkout chính; mọi code làm trong worktree như đang làm.

## C-0020 — `packages/audience-engine` (thuần, V3 §6) — ưu tiên CAO
Phạm vi: tạo mới `packages/audience-engine/**` (package.json theo mẫu `packages/quiz-core`, `src/index.ts`, `src/*.test.ts`). KHÔNG sửa server/DB — coordinator tích hợp.
Hàm thuần, tất định, không I/O:
- `createSlots(rows = 7, seatsPerRow = 5): Slot[]` — `slotId = "row-{r}-seat-{s}"`, `rowIndex 0..6` (0 = hàng trước, gần sân khấu), `x, y, scale, depth` theo phối cảnh trong khung 1080×1920 vùng audience y 1080–1850 (hàng sau nhỏ hơn nhẹ, cao hơn; không chồng nameplate hàng trước — ghi công thức trong chú thích).
- `assignCharacter(playerId, roundId, pool: string[], seed): characterId` — seeded, ổn định (cùng input → cùng output), không phụ thuộc thứ tự gọi.
- Trạng thái `AudienceState = { rotationId, seats: Record<slotId, { playerId, pinned } | null>, queue: string[], lastActiveAt: Record<playerId, number> }`.
- `onPlayerJoined(state, playerId, now)`: có ghế trống → ghế trống đầu tiên theo thứ tự ổn định (hàng trước → sau, giữa → mép); hết ghế → vào `queue` (không trùng).
- `onPlayerActive(state, playerId, now)`: cập nhật `lastActiveAt`.
- `rotate(state, { maxSwaps = 5, now, seed, pinned: string[] })`: chỉ chạy giữa câu; thay tối đa `maxSwaps` ghế KHÔNG pin, ưu tiên đưa người trong queue lên, người ngồi lâu không hoạt động xuống queue; seeded shuffle; **không dùng số lượng comment làm ưu tiên**; `rotationId` mới; trả về danh sách sự kiện `seat_assigned` / `seat_released`.
- `pin(state, playerIds ≤ 5)`.
- Bất biến (test bằng property test có seed, 200 lần): một người không ngồi 2 ghế; một ghế ≤ 1 người; queue không trùng, không mất người; tổng (ngồi + queue) = số người đã join; rotate lặp lại cùng seed → cùng kết quả.
- Test bắt buộc V3 §17-4: 500 người join, đúng 35 ghế, 465 trong queue, rotate 20 lần không vi phạm bất biến.
Tiêu chí: typecheck + `corepack pnpm test` xanh; nhánh `codex1/c0020-audience-engine`.

## C-0021 — phát lại sự kiện comment (dự phòng offline, `docs/TIKTOK_CONNECTOR_SPIKE.md` §4)
Phạm vi: `scripts/replay-events.ts`, `scripts/replay-events.test.ts`, `fixtures/replay/*.json` (dữ liệu hư cấu).
- Định dạng JSON Lines: `{ "atMs": <ms tính từ lúc câu mở>, "userId", "displayName", "text", "eventId"? }`.
- Script gọi HTTP admin `POST /api/sessions/:id/comments` (MOCK) theo nhịp thời gian thực hoặc `--speed N`; đọc token từ `data/admin-token.txt` hoặc `--token-file`; in thống kê gửi/nhận.
- Test: parse + lịch phát (thuần) — không cần server.
Tiêu chí: typecheck + test xanh; nhánh `codex1/c0021-replay`.
