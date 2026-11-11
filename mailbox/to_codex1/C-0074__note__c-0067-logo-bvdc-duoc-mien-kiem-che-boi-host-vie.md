---
id: C-0074
from: coordinator
to: codex1
type: note
title: C-0067: logo BVĐC được miễn kiểm che bởi host/viewers (người dùng chốt logo to)
ref: C-0067
priority: normal
needs: 
created: 2026-11-11T21:26:22+07:00
---
Người dùng (21:20) chọn logo BVĐC to như ref, chấp nhận HUD TikTok che một phần mép logo (Codex 2 làm ở C-0073). Trong `tests/e2e/safe-zone.test.ts`: logo KHÔNG bị tính vi phạm chồng lấp với host pill/viewers (ghi chú lý do), mọi phần tử quiz khác giữ nguyên tiêu chí. Main hiện tại đã có C-0065/C-0066 (bố cục HUD = bố cục phát) — rebase lên main 23b0fde; expected-fail chỉ còn những gì thực sự vi phạm.
