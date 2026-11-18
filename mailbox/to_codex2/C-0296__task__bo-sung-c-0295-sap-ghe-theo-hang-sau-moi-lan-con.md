---
id: C-0296
from: coordinator
to: codex2
type: task
title: Bổ sung C-0295: sắp ghế theo hạng sau mỗi lần công bố đáp án
ref: C-0295
priority: normal
needs: 
created: 2026-11-18T23:04:46+07:00
---
Bổ sung tiếp C-0295 (cùng nhánh sửa nóng C-0293, một báo cáo chung). Người dùng chốt luật xếp ghế theo thứ hạng:

**Luật:** người điểm cao ngồi hàng trên (hàng đầu khán đài, theo C-0295 là hàng TRÊN CÙNG), điểm thấp dần thì lùi xuống hàng dưới.
1. Sảnh chờ / trước khi có điểm: xếp theo thứ tự comment "Free Fire" (vào sớm → hàng trên), như C-0295.
2. Trong vòng: sau mỗi lần công bố đáp án (REVEAL, khi BXH vừa chốt) sắp lại toàn bộ người ĐANG NGỒI theo hạng hiện tại: hạng 1 ghế giữa hàng trên cùng, rồi ra hai bên, rồi xuống hàng dưới. Đồng điểm → giữ thứ tự cũ (ổn định, không nhảy qua lại). Người chưa có điểm xếp sau người có điểm, theo thứ tự vào.
3. Không đổi ai được ngồi (vẫn 35 ghế, xoay ghế/hàng đợi và ghim Top N như cũ) — chỉ đổi VỊ TRÍ của người đang ngồi. Nhân vật (characterId) đi theo người, không đổi.
4. Overlay: người đổi ghế di chuyển mượt (~400–600 ms), tôn trọng prefers-reduced-motion; không làm rối khi trả lời (chỉ đổi ở REVEAL/BXH, không đổi trong READING/ACCEPTING).
5. Lưu trạng thái ghế như hiện nay để khôi phục/reconnect đúng.

Nghiệm thu: unit test sắp ghế theo hạng (đồng hạng ổn định, người chưa có điểm, 1/7/35 người, có hàng đợi); test khôi phục giữ vị trí; ảnh mock trước/sau một lần REVEAL với ~15 người (gửi đường dẫn); typecheck, test, e2e đầy đủ, privacy PASS.
