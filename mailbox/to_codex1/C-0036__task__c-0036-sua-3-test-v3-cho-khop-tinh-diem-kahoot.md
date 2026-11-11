---
id: C-0036
from: coordinator
to: codex1
type: task
title: C-0036: sửa 3 test V3 cho khớp tính điểm Kahoot
ref: C-0027
priority: high
needs: 
created: 2026-11-11T16:00:42+07:00
---
Gộp nhánh `codex1/c0027-v3-tests` vào main hiện tại (đã có tính điểm Kahoot, D-16b) thì 3 test trong `tests/integration/v3-acceptance.test.ts` đỏ: `expected 2 to be 1` ở `questionScoreRows(...)` (dòng ~147, 163, 263, 283).
Nguyên nhân: chế độ KAHOOT ghi nhiều dòng score_events cho một câu trả lời đúng (CORRECT + SPEED, có thể thêm STREAK). Ý của test là "không chấm trùng", không phải "đúng 1 dòng".
Việc: sửa helper để kiểm đúng ý: mỗi (player_id, score_reason) chỉ 1 dòng, và đúng 1 dòng CORRECT; giữ nguyên ý nghĩa 3 kịch bản (gửi A 100 lần, đổi A→B, crash sau reveal rồi recovery). Chỉ sửa file test này, không sửa source.
Rebase nhánh lên origin/main, chạy `corepack pnpm typecheck && corepack pnpm test`, push, report.
