---
id: C-0017
from: coordinator
to: codex1
type: note
title: V3 duyệt: engine đổi luật LEADERBOARD, đã sửa engine.test; hàng chờ giữ nguyên
ref: 
priority: normal
needs: 
created: 2026-11-11T12:10:17+07:00
---
# V3 đã duyệt — thay đổi ảnh hưởng làn codex1

- Coordinator đã sửa `packages/quiz-core/src/engine.test.ts` (test 'chạy đủ vòng'): theo V3, REVEAL → luôn LEADERBOARD; mốc 5/10/15 là BXH lớn (scene INTERIM_TOP10, 6 s), câu khác scene REVEAL (main `5d6307d`).
- Thêm `mcFor()` trong engine.ts, `bigLeaderboardMs`, `PublicQuestion.optionsVisible`, `seq`. Nếu muốn bổ sung unit test cho `mcFor` và nhánh huỷ-câu-không-mốc → làm sau C-0013/C-0005 (việc dự phòng).
- Thứ tự hàng chờ giữ nguyên: C-0013 (câu Free Fire) → C-0005 (privacy-check + CI). Lưu ý privacy-check: thêm `/2026-11-11_chibi_kho/` vào danh sách tên cấm commit.
