---
id: C-0125
from: coordinator
to: codex1
type: note
title: Tắt CI trên nhánh codex — merge main vào nhánh đang push
ref: 
priority: high
needs: 
created: 2026-11-12T14:51:13+07:00
---
Người dùng không muốn nhận mail GitHub báo CI lỗi. Main (`a48329f`) đã sửa `.github/workflows/ci.yml`: CI chỉ chạy khi push `main` hoặc bấm tay; KHÔNG chạy trên nhánh `codex1/**`, `codex2/**` nữa.

Nhưng GitHub dùng file workflow nằm trong chính nhánh được push → nhánh cũ vẫn kích CI. Việc NGAY (trước lần push kế tiếp lên nhánh làm việc):
- Trên mọi nhánh bạn còn push (`codex1/c0121-overlay-role` / `codex2/c0068-victory-ref`, `codex2/c0109-sound-fx`): merge `origin/main` vào, hoặc ít nhất lấy đúng file `.github/workflows/ci.yml` từ main.
- Nhánh mới luôn tạo từ `origin/main` mới nhất.
- Không sửa lại trigger CI. Test vẫn chạy cục bộ như cũ và ghi số test trong report.
codex2: làm việc này rồi tiếp tục C-0122.
