---
id: C-0295
from: coordinator
to: codex2
type: task
title: Bổ sung C-0293: người vào sớm ngồi hàng trên (lấp ghế từ trên xuống)
ref: C-0293
priority: normal
needs: 
created: 2026-11-18T23:01:13+07:00
---
Bổ sung vào cùng nhánh sửa nóng C-0293 (một báo cáo chung).

Phản hồi live 18/11: phiên chỉ có ~7–15 người, mọi người (kể cả người comment "Free Fire" sớm nhất ở sảnh) đều bị xếp ở hàng DƯỚI CÙNG, phía trên là 4–5 hàng ghế trống → khán đài trông trống và người chơi bị dồn sát mép dưới. Người dùng muốn người vào sớm được ngồi hàng trên.

Chỗ: `packages/audience-engine/src/index.ts` `orderedSlotIds` đang sắp `a.row - b.row` (row 0 = hàng trước/dưới cùng, `createSlots`). 

Yêu cầu:
1. Đổi thứ tự lấp ghế: hàng TRÊN CÙNG (rowIndex lớn nhất) trước, xuống dần hàng dưới; trong mỗi hàng vẫn giữ giữa trước rồi ra hai bên như hiện tại.
2. Áp dụng thống nhất cho ghế ở sảnh (giành bằng "Free Fire") và người vào trong vòng; xoay ghế giữa câu và ghim Top N vẫn đúng.
3. Không đổi toạ độ/kích thước ghế, không đổi bố cục.
4. Kiểm tra trường hợp hàng trên có chibi nhỏ hơn: tên và nhân vật vẫn đọc được, bảng tên không đè lên nhân vật hàng trên/dưới (trong ảnh live, bảng tên một người hàng dưới bị chồng lên nhân vật hàng trên — rà luôn).

Nghiệm thu: unit test audience-engine thứ tự mới (1, 5, 6, 35 người; hàng đợi khi đầy); ảnh mock 1080×1920 với 7 người và 15 người ở sảnh và trong câu hỏi (gửi đường dẫn, không commit ảnh); typecheck, test, e2e đầy đủ, privacy PASS.
