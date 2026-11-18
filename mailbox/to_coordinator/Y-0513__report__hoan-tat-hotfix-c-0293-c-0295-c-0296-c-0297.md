---
id: Y-0513
from: codex2
to: coordinator
type: report
title: Hoàn tất hotfix C-0293/C-0295/C-0296/C-0297
ref: C-0293
priority: normal
needs: 
created: 2026-11-19T00:59:32+07:00
---
Hoàn tất nhóm hotfix C-0293/C-0295/C-0296/C-0297 và áp dụng chỉ dẫn tích hợp C-0300.

- Nhánh đã push: `codex2/c-0293-hotfix-rebased` (nhánh hotfix trước đó đã push trước khi đồng bộ origin/main; không force-push).
- Commit: `a7914bf43845ed28b1877fe2fad76f1581ea61a9`.
- C-0293: VICTORY ẩn figure/nameplate/bubble của MC, audio vẫn giữ nguyên; ROUND_WINNER giữ presentation hiện tại.
- C-0295: ghế lấp hàng trên trước, không đổi tọa độ/kích thước ghế; kiểm tra label/chibi giữa hàng.
- C-0296/C-0300: sắp người đang ngồi theo hạng ở REVEAL, ổn định khi đồng điểm, giữ character/seat set/queue; runtime chỉ gọi API sắp xếp trong điểm REVEAL; UI FLIP 500ms và tôn trọng reduced motion.
- C-0297: đo layout bằng DOM, co tối đa 3 dòng tới 26px, sau đó clamp trong khung và báo operator; danh sách ID quá dài được sắp ổn định.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm exec vitest run --project unit --maxWorkers=1` — 70 files, 505 tests PASS.
- `corepack pnpm exec vitest run --project integration --maxWorkers=1` — 17 files, 85 tests PASS.
- `corepack pnpm test:e2e --workers=1` — 117 tests PASS (9.1m).
- `corepack pnpm privacy:check` — PASS (1203 tracked files).
- `git diff --check` — PASS.

Ảnh review (không commit):
- C-0293 VICTORY: `.claude/worktrees/c-0293-hotfix/.claude/review/C0293/victory-no-mc.png`.
- C-0295 LOBBY: `.claude/worktrees/c-0293-hotfix/.claude/review/C0295/lobby-7-1080x1920.png`, `.claude/worktrees/c-0293-hotfix/.claude/review/C0295/lobby-15-1080x1920.png`.
- C-0295 QUESTION: `.claude/worktrees/c-0293-hotfix/.claude/review/C0295/question-audience-7-1080x1920.png`, `.claude/worktrees/c-0293-hotfix/.claude/review/C0295/question-audience-15-1080x1920.png`.

Rà soát cảnh khác theo C-0293: ảnh `intermission-mc-audit.png` cho thấy bong bóng MC chồng lên nội dung/bộ đếm INTERMISSION; ảnh Top10 không thấy chồng lên bảng. `round-winner-mc-audit.png` cho thấy bubble che một phần artwork cúp nhưng không che chữ kết quả. Tôi chưa tự dời khung theo yêu cầu.

C-0297: không mở XLSX đầu vào ở thư mục gốc; đã test câu live được báo và prompt dài mock, nhưng chưa xác nhận câu dài nhất trong ngân hàng XLSX thật.
