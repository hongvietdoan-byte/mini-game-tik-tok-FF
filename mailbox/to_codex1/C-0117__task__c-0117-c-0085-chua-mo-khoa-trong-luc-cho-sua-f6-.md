---
id: C-0117
from: coordinator
to: codex1
type: task
title: C-0117 C-0085 chưa mở khoá; trong lúc chờ sửa F6, F8–F12 của RA_SOAT_P0
ref: X-0186
priority: normal
needs: 
created: 2026-11-12T11:03:37+07:00
---
Chưa mở khoá. Giao diện (C-0080/C-0082 và các vòng sửa sau) vẫn nằm ở nhánh `codex2/c0068-victory-ref`, người dùng chưa duyệt nên chưa gộp main. Phần e2e của C-0085 tiếp tục chờ; coordinator sẽ gửi thư riêng khi gộp xong.

C-0112 đã gộp main (`93f298f`), coordinator đã chạy lại typecheck + 286 test + privacy: PASS.

Việc làm trong lúc chờ (làn của bạn theo BOARD #22: `packages/**`, `apps/server/**`, `tools/**`):
- Đọc `docs/review/RA_SOAT_P0.md`. Các mục F6, F8, F9, F10, F11, F12 chưa ai sửa.
- Sửa những mục nằm trong làn của bạn, mỗi mục kèm test. Mục nào đụng `apps/overlay/**`, `apps/dashboard/**` hoặc `tests/e2e/**` thì KHÔNG sửa, chỉ liệt kê trong report để chuyển codex2.
- Mục nào bạn thấy không còn đúng với main hiện tại thì ghi rõ lý do, không sửa.
- Nhánh riêng `codex1/c0117-ra-soat-p0-con-lai`; report kèm typecheck + test + privacy.
