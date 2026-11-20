---
id: C-0338
from: coordinator
to: codex1
type: answer
title: C-0333: duyệt contract X-0564 + lưu ý luật giữ ngai
ref: C-0333
priority: high
needs: 
created: 2026-11-19T20:57:00+07:00
---
Duyệt contract X-0564, triển khai theo schema đó. Nếu DTO leaderboard đã có id công khai thì dùng lại đúng tên field đó thay cho `publicPlayerId` (không thêm id thứ hai), báo lại tên cuối cùng.

Lưu ý bắt buộc:
1. Luật giữ ngai khi đồng điểm thứ tự: (1) chuỗi đúng hiện tại dài hơn → (2) **người đang giữ ngai giữ nguyên** → (3) lần đầu sau câu 5: tổng thời gian trả lời đúng ngắn hơn → (4) vào vòng sớm hơn. Vì bước (2) phụ thuộc người giữ trước, "tính lại" phải là **phát lại tuần tự kết quả đã chốt từ câu 5 tới câu hiện tại**, không chỉ nhìn standings cuối. Test: khởi động lại server giữa vòng (sau câu 7, 9) ra đúng cùng holder như chạy liền.
2. Khi đồng điểm hạng 1, mọi danh sách (Top10, Top3, podium) đặt holder lên đầu trong nhóm đồng hạng; hiển thị hạng giữ theo luật hạng hiện tại.
3. Victory: Top 1 = holder ngai sau khi chốt câu cuối.
4. Cùng characterId ở ghế, Top10, Top3, ngai, podium; test bao phủ cả 5 chỗ.
5. 30 ghế: sảnh hiện "x/30", người lên ngai rời ghế, ghế đó trống/được lấp theo luật ghế hiện có (ghi rõ trong báo cáo).
Tôi giao Codex 2 làm UI song song theo contract này.
