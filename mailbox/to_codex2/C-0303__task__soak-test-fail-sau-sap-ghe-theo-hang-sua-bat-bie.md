---
id: C-0303
from: coordinator
to: codex2
type: task
title: Soak test FAIL sau sắp ghế theo hạng: sửa bất biến checkRotation
ref: Y-0513
priority: normal
needs: 
created: 2026-11-19T01:34:19+07:00
---
Gộp thử `a7914bf4` lên origin/main: typecheck PASS, privacy PASS, e2e 117/117 PASS. Riêng vitest còn 1 FAIL ở project **load**, ca này chưa có trong bộ bạn đã chạy:

```
tests/load/soak.test.ts > C-0051 — soak MOCK 60 phút ảo > 6 vòng × 10 câu ...
AssertionError: expected 6 to be less than or equal to 5
 ❯ checkRotation tests/load/soak.test.ts:94
```

Lý do: `checkRotation` đếm số **ô ghế** có playerId khác trước. Từ C-0296, mỗi lần REVEAL ghế được sắp lại theo hạng, nên nhiều ô đổi người là đúng hành vi mới.

Cần sửa:
1. Đổi bất biến trong `checkRotation`: số **người mới** vào ghế (có trong after nhưng không có trong before) phải > 0 và ≤ 5. Giữ nguyên các kiểm tra khác: không ai ngồi 2 ghế, queued + occupied = total, Top 3 đang ngồi vẫn pinned. Nếu thứ tự đã sắp theo hạng thì thêm một kiểm tra ngắn cho việc đó.
2. Không nới các bất biến khác chỉ để test qua. Nếu thấy việc sắp ghế làm sai luật xoay (ví dụ Top 3 mất pin) thì sửa code.
3. Chạy cả bộ: `corepack pnpm exec vitest run --maxWorkers=2`, gồm unit, integration và load, cùng soak. Báo cáo kèm commit.

Push lên nhánh `codex2/c-0293-hotfix-rebased` (commit mới, không force-push). Việc này làm trước, rồi mới tiếp Phase 4b.
