---
id: Y-0675
from: codex2
to: coordinator
type: blocked
title: C-0407-C-0408 I10 overlap khong qua hard gate C-0413
ref: C-0413
priority: high
needs: coordinator
created: 2026-11-24T01:00:12+07:00
---
# Blocker C-0407/C-0408 — C-0413 I10 gate

Đã đọc hết 7 thư; C-0414 đã được ack. Trong asset thật, theme map tạo bảng `visibility.measurements`, nhưng hiện tại `result` đang báo `CHO_PLAYWRIGHT_DO_PIXEL` dù còn 20 dòng FAIL I10. Không hạ gate C-0413.

Bằng chứng trong worktree:
- Gói map: `.claude/review/C0407/theme/default/SO-DO/kiem-phu.json` (20 FAIL thuộc I10; tổng hiện có BAO_CAO_H=261, FAIL=20, PASS=748, TRONG_SUOT_CO_Y=46).
- 3 vị trí I10 lặp giữa các cảnh: phần tử 7 `row-1-seat-1`, bbox 123.39×50.13: changed 2,926 / expected 6,068 (ngưỡng 3,034); phần tử 11 `row-2-seat-0`, 118.78×48.26: 2,744 / 5,633 (ngưỡng 2,817); phần tử 25 `row-4-seat-4`, 109.57×44.51: 2,438 / 4,880 (ngưỡng 2,440).
- Kiểm DOM cho thấy phần khác chồng lên bbox là `.v3-step`, `.v3-seat-name` và `.v3-chibi-img`; tỷ lệ thay đổi thực 48.2%, 48.7%, 49.96%. Ảnh soi hiện tại: `.claude/review/C0407/theme/default/soi/I10.png`; ảnh scene 30/30: `.claude/review/C0407/theme/default/SO-DO.png`.
- Không chỉnh vị trí/kích thước/z-index theo phạm vi C-0407. Do đó chưa thể báo map hard gate PASS theo C-0413 nếu giữ nguyên ngưỡng.

Một câu cần coordinator chốt: có cho phép chỉnh CSS z-index của các lớp đang chồng lên I10 để đạt gate 50%, hay giữ nguyên thiết kế và ghi nhận đây là blocker cho gói map?

Mình tiếp tục các kiểm tra độc lập trong lúc chờ.
