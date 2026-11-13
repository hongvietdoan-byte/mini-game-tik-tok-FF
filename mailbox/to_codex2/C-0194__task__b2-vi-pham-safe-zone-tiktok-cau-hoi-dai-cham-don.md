---
id: C-0194
from: coordinator
to: codex2
type: task
title: B2 vi phạm safe-zone TikTok + câu hỏi dài chạm đồng hồ — sửa, đưa 2 phương án
ref: C-0174
priority: high
needs: 
created: 2026-11-13T21:21:46+07:00
---
Ưu tiên CAO, làm trước C-0193 (gộp chung số đo của C-0193 vào report này).

codex1 dựng nhánh ứng viên `codex1/release-candidate-1113` (main + name-safety + c0168 B2 + c0165 + c0166) và chạy ĐỦ e2e: 58 đạt / 11 trượt, đều do header B2 + nới viền (C-0174/C-0175). Trên nhánh nền không có B2: 9/9 safe-zone và 3/3 long-content đạt. Các lượt trước bạn chỉ chạy `overlay.spec.ts` nên không thấy — từ nay mọi thay đổi overlay phải chạy cả `tests/e2e/safe-zone.test.ts` và bộ long-content.

## Lỗi thật cần sửa (không nới mốc test)
1. **Safe-zone TikTok (8 case: LOBBY, QUESTION, READING, REVEAL, LEADERBOARD, INTERIM_TOP10, INTERMISSION, CONNECTION_LOST):** ô vòng B2 (3 dòng 36/52/24) đè vùng số người xem/banner sự kiện của TikTok; pill tiêu đề vượt mốc safe-zone.
2. **Nội dung dài (3 case: prepare, question-longest, reveal):** chữ câu hỏi chạm đồng hồ ~6px sau khi nới đệm C-0175.

## Yêu cầu
- Làm trên `codex2/c0168-header-size` (rồi merge sang `codex2/hud-settings`). Giữ đúng tinh thần B2 người dùng đã duyệt: pill 1 dòng, ô 3 dòng, số vàng nổi bật, đủ quy tắc số (9.876 / 10,5K / 1,2M).
- Đưa ô vòng và pill vào trong safe-zone bằng cách ít đổi nhất. Đề xuất 2 phương án kèm ảnh để người dùng chọn: (A) giữ cỡ chữ 36/52/24, dời/thu khung cho lọt safe-zone; (B) giảm cỡ chữ vừa đủ (ghi rõ cỡ mới) và giữ vị trí. Mỗi phương án: ảnh màn câu hỏi + Top 10 + ảnh có vẽ lớp phủ safe-zone TikTok.
- Câu hỏi dài: khung câu hỏi không được chạm đồng hồ (≥ 8px) ở cả 3 case; giữ đệm C-0175 ở mức đạt được.
- Chạy ĐỦ `pnpm test:e2e` (mọi file) trên từng phương án và báo số liệu. Dọn dẹp theo C-0185.
- Ghi chú ảnh HUD: `custom-victory.png` hiện thay cả nền Victory bằng ảnh thử phẳng làm người dùng tưởng mất màn Victory. Chụp lại minh họa Victory tùy chỉnh chỉ đổi logo/tiêu đề, GIỮ nền Victory mặc định; ảnh đổi nền để riêng và ghi rõ tên "nen-thu".
