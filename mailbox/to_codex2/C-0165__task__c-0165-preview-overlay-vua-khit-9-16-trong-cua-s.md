---
id: C-0165
from: coordinator
to: codex2
type: task
title: C-0165 Preview overlay vừa khít 9:16 trong cửa sổ ngang
ref: 
priority: high
needs: 
created: 2026-11-13T14:06:32+07:00
---
Người dùng mở `/overlay/?role=preview` trên cửa sổ trình duyệt NẰM NGANG thì chỉ thấy một phần giữa màn hình bị phóng to (mất đầu/đuôi khung 9:16). Nguyên nhân: `useStageScale` trong `apps/overlay/src/main.tsx:21` dùng `Math.max(widthScale, heightScale)` (phủ kín = cắt).
Sửa (làm SAU C-0164, cùng ưu tiên cao):
- `role=preview` (và khi không có role): **vừa khít** — `Math.min(...)`, khung 1080×1920 nằm giữa, phần thừa hai bên tô nền tối; luôn thấy trọn 9:16 ở mọi kích thước cửa sổ.
- `role=program` (nguồn LIVE Studio 1080×1920): giữ nguyên như hiện tại (ở đúng 1080×1920 thì min = max, không đổi gì); nền ngoài khung trong suốt.
- Thêm tham số tuỳ chọn `?fit=contain|cover` để ép kiểu nếu cần.
Ảnh: preview ở 1920×1080, 1366×768, 390×844 và program ở 1080×1920 → `assets-local/review/c0165/`. typecheck + unit + overlay.spec + safe-zone. Nhánh `codex2/c0165-preview-fit` từ main. Chưa gộp main.
