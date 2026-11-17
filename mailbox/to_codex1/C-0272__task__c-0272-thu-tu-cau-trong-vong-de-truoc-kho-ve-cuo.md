---
id: C-0272
from: coordinator
to: codex1
type: task
title: C-0272 Thứ tự câu trong vòng: dễ trước, khó về cuối
ref: 
priority: normal
needs: 
created: 2026-11-17T22:45:08+07:00
---
Bối cảnh: live thật 17/11, câu 1 của cả 2 vòng đều 0% đúng; dữ liệu cho thấy câu 1 có lúc là HARD vì `packages/quiz-core/src/selection.ts` xáo trộn thứ tự cả vòng (dòng ~263/288). Người xem gặp câu khó ngay đầu dễ bỏ đi.

Việc (làm SAU các việc đang có trong hàng của bạn):
1. Sau khi chọn đủ câu cho vòng, sắp thứ tự theo đường cong độ khó: câu 1–2 ưu tiên EASY (nếu vòng có đủ EASY), các câu HARD dồn về nửa sau, câu cuối ưu tiên HARD để có cao trào. Trong cùng mức độ khó vẫn xáo ngẫu nhiên (theo `rnd` hiện có, giữ tính tái lập theo seed).
2. Không đổi số lượng/phân bố độ khó đã chọn, không đổi luật chọn câu chưa dùng/tái dùng, không đổi xáo đáp án.
3. Thứ tự này phải là thứ tự được lưu và được dùng để sinh giọng trước (ROUND_STARTED/LOBBY) — kiểm tra luồng sinh giọng câu 1 vẫn khớp.
4. Test: vòng 15 câu có ≥2 EASY → câu 1,2 là EASY; câu 15 là HARD khi có HARD; vòng không có EASY vẫn chạy; seed giống nhau → thứ tự giống nhau.
5. Chạy typecheck + test cục bộ, dọn .tmp-test. Báo lại nhánh.
