---
id: C-0311
from: coordinator
to: codex2
type: task
title: C-0311: MC xuong san o man nghi; man Top 3 bo bong bong, chi giu voice
ref: C-0306
priority: high
needs: 
created: 2026-11-19T08:36:54+07:00
---
Người dùng đã chốt vị trí MC cho 2 màn trong C-0306. Làm tiếp trên nhánh C-0306 của bạn: giữ phần sửa câu dài và lời thoại đúng ngữ cảnh, **bỏ cả 2 phương án A/B bong bóng cũ**.

## 1. INTERMISSION (nghỉ giữa vòng): đưa MC xuống sàn trống
- Coordinator đã dựng thử bằng CSS và đo trên mock `?mock=intermission`:
  ```css
  .v3-aux-stage[data-scene="INTERMISSION"] > .v3-mc { top: 1250px; }
  .v3-aux-stage[data-scene="INTERMISSION"] .v3-mc .v3-bubble { height: auto; min-height: 112px; padding: 16px 28px; }
  .v3-aux-stage[data-scene="INTERMISSION"] .v3-mc .v3-bubble p { font-size: 30px; line-height: 1.25; }
  ```
- Kết quả đo: figure ở `[115,1265,385,1539]`, bong bóng ở `[390,1500,970,1649]`. Không chồng lên thẻ "Nghỉ giữa vòng" hay đồng hồ.
- Lời thoại đúng ngữ cảnh ("Nghỉ giữa vòng nhé! Chặng tiếp theo sắp bắt đầu.") nằm gọn trong 2 dòng.

## 2. ROUND_WINNER (màn Top 3 cuối chặng)
- MC đứng ở một chỗ trống, **không che bất kỳ ai**: không che thẻ hay tên người thắng, không che bục, không che cúp. Gợi ý: sàn ngay dưới bục, `top` khoảng 1440 px. Phải đo lại khi có đủ 3 người thắng thật, không đo với mock rỗng.
- **Bỏ hẳn bong bóng chữ** ở màn này: không render `.v3-bubble`.
- Voice MC vẫn đọc bình thường; chỉ ẩn phần văn bản.

## 3. Test bắt buộc (DOM bbox, Playwright)
- INTERMISSION: bbox của MC (figure, thẻ tên, bong bóng) không giao với `.v3-intermission` (phần thẻ nhìn thấy), `.v3-aux-timer` hay header. Bong bóng cách mép dưới ≥ 24 px, chữ ≥ 28 px.
- ROUND_WINNER có 3 người thắng: bbox MC không giao với thẻ, tên hay điểm của từng người thắng, cũng như bục và cúp. Không có `.v3-bubble` trong DOM. Cue voice vẫn được phát (kiểm tra qua mock audio/cue).
- Chạy lại toàn bộ e2e.

## 4. Báo cáo
- Kèm ảnh chụp full 1080×1920 cho cả 2 màn (round-winner có đủ 3 người thắng), cộng ảnh phóng to vùng MC.
- Kèm số đo bbox.
- Không đổi bố cục các khung khác.
