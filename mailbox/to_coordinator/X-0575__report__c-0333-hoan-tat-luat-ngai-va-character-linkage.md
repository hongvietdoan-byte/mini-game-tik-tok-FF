---
id: X-0575
from: codex1
to: coordinator
type: report
title: C-0333 hoàn tất — luật ngai và character linkage
ref: codex1/c-0333-throne-server@577f8a1b
priority: high
needs: 
created: 2026-11-19T23:50:52+07:00
---
C-0333 hoàn tất.

Nhánh: codex1/c-0333-throne-server
Commit: 577f8a1ba8c566dd7ff63487904de3053eb60dfd
Field ID công khai cuối cùng: throne.holder.playerId — dùng cùng opaque playerId công khai như leaderboard; không đưa ID nội bộ/provider ra public payload.

Đã làm:
- Server phát throne LOCKED trước khi chốt câu 5, sau đó HELD/EMPTY; holder đổi tại thời điểm chốt câu.
- Replay holder từ câu hỏi/đáp án đã lưu sau restart hoặc VOID; tie-break theo streak, giữ incumbent khi bằng streak, sau đó elapsed hiệu chỉnh theo stream delay và join order.
- Liên kết characterId ổn định giữa throne, ghế, Top 10, Top 3/podium; giữ 30 ghế và khôi phục assignment cũ.
- Cập nhật ngai theo câu vừa chốt theo đường incremental; replay toàn vòng chỉ dùng khi recovery/VOID/ledger mismatch.

Kiểm tra:
- corepack pnpm typecheck — PASS.
- corepack pnpm exec vitest run apps/server/src/throne.test.ts tests/integration/throne.test.ts apps/server/src/lobby.test.ts tests/integration/audience.test.ts — PASS, 4 file / 13 tests.
- corepack pnpm exec vitest run --project unit --project integration --pool=forks --maxWorkers=1 — PASS, 95 files / 619 tests; test-temp trước/sau 329/329.
- corepack pnpm privacy:check — PASS, 1316 tracked files.
- QUIZ_ASSETS_DIR=fixtures/assets-placeholder corepack pnpm test:e2e — PASS, 123 passed / 1 skipped (124 tổng).
- corepack pnpm bench:simulator-20k — scoreAndRank 456.6 ms wall / 438 ms CPU ở lượt mới nhất. Sau tối ưu incremental, đây giảm so với lượt đo trước đó của cùng task 809/1048 ms; số đo lịch sử C-0237 dao động từ 271/281 đến 387/438 ms, nên kết quả phụ thuộc tải máy và chưa khẳng định non-regression so với lượt tốt nhất. Không chạy E2E với assets-local vì đó là ảnh đầu vào cục bộ; chỉ chạy placeholder.
- git diff --check — PASS.

Đã push nhánh codex1/c-0333-throne-server.
