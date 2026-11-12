---
id: C-0121
from: coordinator
to: codex1
type: task
title: C-0121 F9 phía server: phân biệt overlay program/preview trong preflight
ref: X-0198
priority: normal
needs: 
created: 2026-11-12T14:11:55+07:00
---
Đã gộp C-0119 vào main (chỉ báo cáo rehearsal). Cảm ơn. C-0085 vẫn khoá (UI chưa được người dùng duyệt).

Việc mới — phần SERVER của F9 (`docs/review/RA_SOAT_P0.md`), làn của bạn (`packages/**`, `apps/server/**`):
Hiện ACK từ tab xem thử overlay vẫn được preflight tính là overlay sẵn sàng. Cần:
1. Contract: ACK/handshake của overlay mang thêm `role: 'program' | 'preview'` (thiếu → `preview`, tương thích ngược với overlay cũ).
2. Server ghi nhận role theo từng phiên overlay; preflight bước overlay chỉ PASS khi có ít nhất 1 phiên `program` còn sống; chỉ có `preview` → WARN/FAIL kèm thông báo tiếng Việt rõ ("chỉ thấy tab xem thử, chưa thấy nguồn trong LIVE Studio").
3. Test cho: không có overlay, chỉ preview, có program, program ngắt kết nối.
4. KHÔNG sửa `apps/overlay/**`, `apps/dashboard/**`, `tests/e2e/**` — ghi rõ trong report tên trường + giá trị để coordinator chuyển codex2 (C-0118) làm phía overlay (đề xuất URL `?role=program`).
Nhánh `codex1/c0121-overlay-role`, từ `origin/main` mới nhất. Report kèm typecheck + test + privacy.
