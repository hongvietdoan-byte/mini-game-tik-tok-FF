---
id: C-0060
from: coordinator
to: codex2
type: task
title: C-0060: LÀM GIỐNG ẢNH MẪU — đã có ảnh mẫu trọn cảnh assets-local/ref/storm-arena-ref.png
ref: C-0032
priority: high
needs: 
created: 2026-11-11T19:20:42+07:00
---
Người dùng (bức xúc): "background của live còn không giống ref của tôi. HÃY LÀM HUD, PHONG CÁCH, BACKGROUND giống mẫu!"
Ảnh mẫu trọn cảnh trước đây bạn báo thiếu NAY ĐÃ CÓ: `assets-local/ref/storm-arena-ref.png` (941×1672, 9:16). Đây là tiêu chí nghiệm thu chính. Ưu tiên cao nhất, trước C-0055 (Victory) — C-0056/58 (HUD LIVE) làm song song được vì chỉ là lớp mô phỏng.
So với bản hiện tại phải sửa (đối chiếu từng vùng, chụp so le trái/phải trong report):
1. NỀN: xoáy bão tím–xanh ở đỉnh giữa sau logo; sét xanh lam/tím bắn ngang hai bên; dải đèn chấm sáng chéo trên cao; ở ~40–58% cao hai bên là SÂN VẬN ĐỘNG: khán đài có đám đông mờ, cụm đèn pha vuông, cờ treo tím có huy hiệu vương miện (trái + phải). Dùng `Ảnh ChatGPT 10_21_39…jpg` (bão 9:16) / `10_21_10…jpg` (đấu trường) làm lớp nền nếu khớp, cắt/ghép + CSS; không để nền chỉ là gradient + sét vẽ tay.
2. NỬA DƯỚI: KHÁN ĐÀI BẬC THANG phối cảnh nhìn từ trên xuống — 7 bậc ghế, mỗi bậc là bệ tím có viền sáng, ghế có huy hiệu vương miện, các bậc thu hẹp dần lên trên; tay vịn/cột sáng hai bên. Bảng tên trắng bo tròn trên đầu mỗi nhân vật. Nhân vật trong mẫu QUAY LƯNG nhìn lên sân khấu (chưa có asset quay lưng → tạm dùng chibi hiện tại crop đầu-vai, đặt THẤP sau lưng ghế như đang ngồi, chừa chỗ thay bộ quay lưng sau).
3. HUD/khung: viền neon mảnh tím + xanh cyan, góc vát, có vạch sáng ngắn ở góc; panel câu hỏi lớn, thẻ "CÂU HỎI 3" tab tím góc trái trên, vạch vàng dưới tab; TIMER vòng tròn vàng to chồng lên góc phải trên panel; 4 đáp án dạng lục giác dẹt viền neon (đáp án được chọn/đúng viền vàng); bong bóng MC có biểu tượng sét hồng, chữ nghiêng, A/B/C/D màu vàng.
4. Header: "STORM ARENA" chữ nghiêng trong khung vát trái; logo `brand/logo.png` giữa + băng "ĐẤU TRƯỜNG BÃO TỐ"; khung "VÒNG 3 / 10 · 1.248 Đang chơi" phải. Top 10 trái: huy hiệu khiên 1/2/3 vàng–bạc–đồng, tên đủ dài (không cắt "Chiến ..."), điểm căn phải.
5. MC Kelly bán thân lớn đè lên mép panel, bảng "👑 MC KELLY" vát dưới.
Giữ ràng buộc safe zone C-0058 (nội dung chính trong x 9–91%; tránh 14% trên) — nếu xung đột với mẫu, báo coordinator kèm 2 phương án ảnh chụp, đừng tự bỏ mẫu.
Report: ảnh `question.png` đặt cạnh ảnh mẫu (cùng tỉ lệ) + danh sách điểm còn khác và lý do.
