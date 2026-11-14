---
id: C-0215
from: coordinator
to: codex2
type: task
title: Dựng màn câu hỏi GIỐNG ảnh mẫu người dùng gửi 14/11
ref: C-0210
priority: high
needs: 
created: 2026-11-14T15:43:45+07:00
---
NGƯỜI DÙNG VỪA GỬI ẢNH MẪU và nói nguyên văn: "Đây mới là giao diện tôi mong muốn". Từ giờ ảnh này là chuẩn duy nhất cho màn câu hỏi; nó thay cho mọi mô tả bố cục trước đây (kể cả C-0207). Không tự diễn giải, không "cải tiến": dựng cho GIỐNG ẢNH.

(Thư gửi Codex 1 gọi việc này là "C-0214"; nhánh vẫn đặt tên `codex2/c0214-user-mockup`.)

Ảnh mẫu (cục bộ, không commit): `E:\Ai\2026\Trend mini game tiktok\assets-local\review\mau-nguoi-dung\mau-1114.png` (941×1672, cùng tỉ lệ 9:16 với sân khấu 1080×1920; nhân 1,148 để đổi sang px sân khấu).

Số đo coordinator đọc từ ảnh, đã đổi sang 1080×1920 (ước lượng ±10px — hãy tự đo lại trên ảnh, ảnh là chuẩn chứ không phải bảng này):
| Phần | Vị trí trong ảnh mẫu (px sân khấu) | Hiện tại (sau C-0210) |
|---|---|---|
| Logo sự kiện + dòng "AI LÀ NHÀ VUA BÁ KHÍ!" | giữa, y≈34–235, rộng ≈290 | y≈40–170, rộng 173 |
| Ô "STORM ARENA" | x≈80–310, y≈132–224 | y≈16–110 |
| Ô "VÒNG 1 / 57 / ĐANG CHƠI" (3 dòng, số vàng) | x≈770–1000, y≈132–224 | x=760, y=16–144 |
| Dải "ĐẤU TRƯỜNG BÃO TỐ" (to, có mũi tên hai bên) | x≈220–860, y≈250–321 | x≈430–755, y≈213–266 |
| 8 cờ đội | y≈287–540, thấy trọn cả 8 lá | bị khung che phần giữa |
| Top 10 | x≈90–404, y≈528–987 | 98,345 · 300×466 |
| Bảng câu hỏi (đồng hồ nằm trong bảng, góc phải trên; KHÔNG có dòng "42 câu trả lời") | x≈425–993, y≈528–990 | 416,345 · 567×470 |
| Chân dung Kelly (bán thân, nhỏ hơn) | x≈120–330, y≈995–1195 | 108,760 · 280×390 |
| Bảng tên "MC KELLY" | x≈92–342, y≈1200–1246 | 100,1152 |
| Bong bóng MC | x≈410–985, y≈1039–1183 | 410,844 · 568×220 |
| Khán đài 5×7 | nhãn hàng trên cùng y≈1271, bục hàng dưới cùng y≈1791–1849 | hàng trên y≈1222, dưới ≈1860 |
| Người đúng nhanh nhất | kiểu A: 3 dòng trong bong bóng ("NHANH NHẤT" vàng / tên to nghiêng / "1,2 giây"), ghế người đó sáng vàng | — |

Ghi chú:
- Bố cục này gần với bản bạn đã làm trước C-0207 (khung nằm dưới dải cờ, MC bán thân, khán đài dồn xuống) — có thể lấy lại từ lịch sử nhánh thay vì viết mới, rồi chỉnh cho khớp ảnh.
- Nền: tạm giữ `/assets/arena/bg-question-user.jpg` nguyên ảnh, không lớp che. Nền trong ảnh mẫu tối hơn (trời bão, xoáy) — coordinator đang hỏi người dùng có file nền sạch không; KHÔNG tự vẽ/tạo nền mới.
- Cỡ chữ ô VÒNG, dải tiêu đề, logo: theo ảnh mẫu. Mặc định = như ảnh mẫu (header 3 dòng, fastest kiểu A); có thể giữ tham số URL cũ nếu không tốn công.
- Các màn khác (sảnh chờ, Top 10 giữa vòng, nghỉ giữa vòng, Victory, mất kết nối): KHÔNG đổi bố cục thân màn; chỉ phần đầu dùng chung (logo/2 ô/dải tiêu đề) thì theo ảnh mẫu.
- Test safe-zone C-0067 và test đo khung C-0207/C-0210 sẽ lệch: cập nhật mốc theo bố cục mới, liệt kê rõ trong report từng luật đã đổi và phần nào của giao diện nằm trong vùng HUD TikTok giả lập (để coordinator báo người dùng). Không xoá test.

Làm trên MỘT nhánh mới `codex2/c0214-user-mockup`, gốc `origin/codex1/release-candidate-1114b` (6daa751 — đã gồm mọi thứ + phát giọng MC).

Bằng chứng bắt buộc:
1. Ảnh `question.png`, `reveal.png`, `fastest.png`, `top10-mid-round.png`, `lobby.png` (1080×1920) dùng đúng dữ liệu mock như ảnh mẫu (Câu hỏi 5, 00:12, StormKing 1,2 giây).
2. Ảnh ghép cạnh nhau "mẫu | bản dựng" cho pha fastest, và bảng số đo từng phần so với ảnh mẫu (lệch mục tiêu ≤12px).
3. typecheck, build:web, unit, e2e đầy đủ. Dọn `.tmp-test` sau khi chạy.
Đặt ảnh ở `.claude/review/C0214/` trong worktree. Không gọi dịch vụ giọng thật.
