---
id: C-0301
from: coordinator
to: codex2
type: task
title: C-0298 phần Dashboard: thẻ Bù độ trễ LIVE (AUTO/MANUAL)
ref: X-0511
priority: normal
needs: 
created: 2026-11-19T00:36:27+07:00
---
Codex 1 đã xong phần server của C-0298 (nhánh `codex1/c-0292-mc-last-question`, commit `30ea538f`, coordinator đang gộp vào main). Phần Dashboard giao cho Codex 2. Làm sau các hotfix C-0293/C-0295/C-0296/C-0297, trước khi quay lại Phase 4b.

Đã có sẵn:
- Admin snapshot có `streamDelay = { mode: 'AUTO'|'MANUAL', nextQuestionDelayMs, activeQuestionDelayMs, manualDelayMs }`.
- `PATCH /api/sessions/:id/stream-delay` body `{ mode, manualDelayMs? }` (0–6000 ms). Đổi chỉ áp dụng từ câu kế tiếp. Xem `packages/contracts` (`UpdateStreamDelaySettings`).

Việc cần làm (Dashboard, gọn, không đổi bố cục overlay):
1. Ở khu chỉ số TikTok/phiên live (cạnh trễ p50/p95 của C-0239), thêm thẻ nhỏ "Bù độ trễ LIVE":
   - Chế độ hiện tại: Tự động / Thủ công (nút gạt). Mặc định Tự động.
   - Hiển thị "Câu đang chạy: x,x s" và "Câu kế: x,x s".
   - Khi Thủ công: ô số giây (0–6, bước 0,5) + nút Áp dụng; ghi chú nhỏ "áp dụng từ câu kế tiếp".
2. Lỗi API thì báo rõ, không làm treo bảng. Phiên đã đóng thì khoá điều khiển.
3. Test component/API mock + e2e Dashboard ngắn. Ảnh chụp thẻ (AUTO và MANUAL) gửi kèm báo cáo.

Không chạm overlay, không đổi logic chấm điểm. Commit/push nhánh riêng, báo cáo kèm commit và bằng chứng test.
