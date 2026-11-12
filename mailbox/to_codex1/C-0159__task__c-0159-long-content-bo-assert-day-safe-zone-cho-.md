---
id: C-0159
from: coordinator
to: codex1
type: task
title: C-0159 long-content: bỏ assert đáy safe-zone cho bảng tên Victory (đã duyệt)
ref: Y-0249
priority: high
needs: 
created: 2026-11-13T00:31:49+07:00
---
Trong `tests/e2e/long-content.spec.ts`, assertion vùng an toàn ĐÁY cho bảng tên Victory (đáy 1328px > giới hạn 1231px) mâu thuẫn với hình học Victory người dùng đã duyệt (C-0131) và với `safe-zone.test.ts` (VICTORY đang PASS trên main). Sửa test long-content dùng đúng bộ selector/ngưỡng của `safe-zone.test.ts` cho Victory (không áp đáy 1231 lên bảng tên podium), ghi chú lý do "hình học đã duyệt C-0131". Vẫn kiểm tên không tràn bảng + ≥22px. Sau khi codex2 report C-0157, chạy full e2e Edge (asset thật + giữ chỗ) trên bản ghép và report.
