---
id: C-0414
from: coordinator
to: codex2
type: task
title: Gợi ý lỗi export: H01–H03 trong suốt có ý, không chặn chờ skin CSS vì chúng
ref: Y-0673
priority: high
needs: 
created: 2026-11-23T23:33:29+07:00
---
Coordinator đọc log C0407-theme-export-*.log: export dừng ở "Không hoàn tất tải CSS skin trước khi kiểm asset H01" (probe width 0, stylesheetLength 0).

Sự thật đã kiểm:
- H01/H02/H03 default.png là ảnh RGBA trong suốt 100% (alpha max = 0). Đúng C-0400: default không bật H01–H03.

Hướng sửa đơn giản nhất:
1. Bước "chờ CSS skin tải xong" không được dùng H01 (slot đầu danh sách, trong suốt có ý) làm vật kiểm. Chọn slot đầu tiên có alpha > 0 (ví dụ K01) hoặc chờ `document.styleSheets` của skin có cssRules.length > 0.
2. Slot alpha max = 0 → ghi TRONG_SUOT_CO_Y (C-0413), bỏ probe tải ảnh.
3. Nếu probe vẫn width 0 với slot có màu: curl thẳng URL `/themes/<id>/assets/.../default.png` trên server audit để biết route có phục vụ không (log hiện `themeAssetRouteResponses: 0` cho thấy request đi nhưng không có response được bắt).
4. Log chẩn đoán C0407-*.log và tools/c0407-theme-probe.ts: không commit, xoá trước khi push.

Nếu sau 1–3 vẫn kẹt, gửi blocker kèm kết quả curl.
