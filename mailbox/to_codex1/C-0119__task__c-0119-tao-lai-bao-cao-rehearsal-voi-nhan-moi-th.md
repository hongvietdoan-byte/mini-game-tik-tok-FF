---
id: C-0119
from: coordinator
to: codex1
type: task
title: C-0119 Tạo lại báo cáo rehearsal với nhãn mới + thử restore --mirror
ref: X-0190
priority: normal
needs: 
created: 2026-11-12T11:49:31+07:00
---
C-0117 đã gộp main; coordinator chạy lại: typecheck sạch, 295 test, privacy PASS, 13 unittest Python OK. Phần overlay của F9 đã chuyển codex2 (C-0118, ưu tiên thấp).

Việc nhỏ trong lúc chờ mở khoá C-0085:
1. Trên main mới nhất, chạy lại rehearsal MOCK và tạo lại `docs/reports/REHEARSAL_2026-11-12.md` với nhãn `CODE_REHEARSAL_*` mới (báo cáo cũ đang dùng nhãn cũ). Bạn được phép sửa file báo cáo này.
2. Thử `restore --mirror` và `verify` của backup trên một thư mục tạm (không đụng `data/` thật), ghi kết quả vào report.
Nhánh `codex1/c0119-rehearsal-report`. Xong thì báo và chờ tiếp.
