---
id: X-0330
from: codex1
to: coordinator
type: report
title: Báo cáo C-0198 — timer overlay và fastest correct
ref: C-0198
priority: normal
needs: 
created: 2026-11-14T01:55:15+07:00
---
C-0198 hoàn tất.

### Nhánh
`codex1/c0198-fastest-correct`, commit `bedd9ea` (`feat: cong thoi gian va cong bo nguoi dung nhanh nhat`) đã push. Base đúng theo yêu cầu: `codex1/integration-name-safety` tại `f36fa67`. C-0200 đã push riêng trên `codex1/c0200-safe-name-rules` để coordinator ghép cả hai candidate.

### A. Thời lượng mặc định và đồng hồ overlay
| Pha / cấu hình | Cũ | Mới | Overlay đếm giây |
|---|---:|---:|---|
| `lobbyMs` — sảnh | 30 s | 30 s | Không |
| `prepareMs` — chuẩn bị câu | 3 s | 8 s | Có |
| `answerMs` — nhận đáp án | 15 s | 20 s | Có |
| `revealMs` — công bố đáp án | 4 s | 9 s | Có |
| `leaderboardMs` — BXH ngắn | 4 s | 9 s | Có |
| `bigLeaderboardMs` — BXH lớn | 6 s | 6 s | Không |
| `roundEndMs` — kết thúc vòng | 2 s | 2 s | Không |
| `victoryMs` — vinh danh | 18 s | 18 s | Không |
| `intermissionMs` — nghỉ giữa vòng | 25 s | 30 s | Có |
| `MAX_MC_READING_MS` — MC đọc câu | 20 s | 20 s | Không |

Rà `ArenaStage`/`AuxiliaryStages`: PREPARE, ACCEPTING, REVEAL, BXH ngắn và INTERMISSION có đồng hồ; sảnh, BXH lớn, ROUND_END, VICTORY và READING không hiện đồng hồ. Tài liệu hợp đồng có bảng này. Schema kiểm tra phiên lưu đủ giá trị cũ vẫn giữ nguyên; trường bị thiếu dùng default mới. Test oracle `referenceScores` cũng được cập nhật từ 15 s lên 20 s để khớp default scoring.

### B. Hợp đồng public snapshot cho Codex 2
Thống nhất trường `fastestCorrectAnswer: FastestCorrectAnswer | null`, chỉ có dữ liệu trong REVEAL và BXH ngắn ngay sau câu; null khi không có đáp án đúng. Object gồm:
- `questionInstanceId`
- `publicPlayerId`: mã opaque dùng cùng giá trị với `leaderboard.entries[].playerId`
- `seatId`: `audience.seats[].slotId`, hoặc null nếu người chơi chưa có ghế
- `safeDisplayName`
- `responseMs`: thời gian từ `opened_at_ms` tới thời điểm server nhận đáp án

Khi nhiều đáp án có cùng timestamp, thứ tự insert của DB giữ người server nhận trước. Snapshot không chứa player ID nội bộ/ID nguồn; kiểm thử xác nhận người bị ẩn chỉ hiện alias và JSON không có ID nguồn hay tên gốc. Đây là tên trường để coordinator chuyển tiếp cho Codex 2 theo C-0197 mục B.

### Kiểm thử
- `corepack pnpm exec vitest run --project unit packages/contracts/src/timings.test.ts --reporter=verbose`: 1 file, 2 test PASS.
- `corepack pnpm exec vitest run --project integration tests/integration/round.test.ts tests/integration/name-filter.test.ts --reporter=verbose`: 2 file, 19 test PASS.
- `corepack pnpm exec vitest run --project integration tests/integration/v3-acceptance.test.ts --reporter=verbose`: 1 file, 7 test PASS.
- `corepack pnpm exec tsc --noEmit -p tsconfig.json`: exit 0.
- `corepack pnpm exec node scripts/privacy-check.mjs`: PASS (801 tệp).
- `git diff --check`: sạch.

Lượt integration đầu tiên bắt đúng 4 assertion sai vì helper tham chiếu vẫn mặc định 15 s; sau khi đồng bộ helper với default 20 s, toàn bộ lượt cuối vượt qua. Bộ test dùng vùng `.tmp-test/`; kiểm tra dọn tạm báo before=57, after=57.
