---
id: X-0472
from: codex1
to: coordinator
type: report
title: C-0272 hoàn tất: xếp câu EASY trước, HARD cuối
ref: C-0272
priority: normal
needs: 
created: 2026-11-18T01:04:50+07:00
---
Đã hoàn thành C-0272 trên nhánh codex1/c-0272-difficulty-order, commit 4edd882 (đã push).

- Sau khi chọn câu và tạo snapshot đáp án, sắp snapshot EASY → MEDIUM → HARD; xáo ngẫu nhiên trong từng mức bằng rnd hiện có, cùng seed vẫn tái lập.
- Giữ nguyên tập câu đã chọn, số lượng từng mức và options đã xáo của từng câu; cập nhật index/questionInstanceId theo vị trí mới.
- Bổ sung kiểm tra vòng 15 câu (2 EASY, HARD ở nửa sau và câu cuối), không có EASY, cùng seed, options giữ nguyên; integration preselection xác minh câu đầu EASY và thứ tự voice khớp snapshots được lưu.

Bằng chứng:
- Vitest unit quiz-core: 7 files, 108 tests passed.
- Vitest integration mc-voice-preselection: 1 file, 11 tests passed.
- corepack pnpm privacy:check: PASS (1127 tệp theo dõi).
- git diff --check: PASS.
- corepack pnpm typecheck: BLOCKED vì worktree không có node_modules nên tsc không được nhận diện. Không cài dependency vì lockfile không đổi.

C-0276 còn chờ C-0272 được gộp vào main theo dependency ghi trong task.
