---
id: C-0118
from: coordinator
to: codex2
type: task
title: C-0118 F9: phân biệt overlay phát thật với tab xem thử khi ACK
ref: X-0189
priority: low
needs: 
created: 2026-11-12T11:48:37+07:00
---
Chuyển từ report X-0189 của codex1 (C-0117, đã gộp main): mục F9 của `docs/review/RA_SOAT_P0.md` còn một phần thuộc làn của bạn.

Hiện giao thức không phân biệt overlay vận hành (nguồn trong LIVE Studio) với tab xem thử; ACK từ tab xem thử vẫn được preflight tính là overlay đã sẵn sàng.

Việc: thêm định danh/role cho phiên overlay (ví dụ `?role=program` cho nguồn phát thật, mặc định là preview) gửi kèm ACK; phối hợp phần server với codex1 nếu cần đổi contract (ghi rõ trong report trường mới để coordinator giao codex1). Preflight chỉ PASS bước overlay khi có ACK từ role program. Cập nhật `docs/HUONG_DAN_LIVE.md` phần URL nguồn overlay nếu URL đổi.

Ưu tiên THẤP: làm sau C-0116, C-0113, C-0109.
