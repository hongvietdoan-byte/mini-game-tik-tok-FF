---
id: C-0319
from: coordinator
to: codex2
type: task
title: C-0319: preset HUD theo live thật (iPhone cao, video 9:16 có dải đen) + câu 4 dòng chạm viền khung câu hỏi
ref: C-0319
priority: normal
needs: 
created: 2026-11-19T14:22:07+07:00
---
Làm sau khi xong C-0315/0316/0317/0318. Ưu tiên thường.

Người dùng gửi ảnh chụp live thật trên iPhone, màn hình 921×2000 điểm ảnh. Ảnh lưu cục bộ ở `assets-local/review/live-thuc-te/live-iphone-cau11.png`, bị ignore, không commit.

**Trên điện thoại cao, TikTok giữ video 9:16 và để dải đen ở trên/dưới.** Video bắt đầu ở y khoảng 182 và kết thúc ở khoảng 1815 trên màn điện thoại. Vì vậy thanh trên của TikTok gần như không che header game: thẻ STORM ARENA và VÒNG/ĐANG CHƠI đọc rõ. Ô nhập bình luận nằm dưới video, không đè game.

Quy về hệ toạ độ overlay 1080×1920 (hệ số 1,1726):
- ô tên chủ kênh: x 29–551, y −61..27 (gần như ngoài video);
- ô người xem và nút X: x 774–1055, y −49..15;
- pill "Top 99% Cấp…": x 29–340, y 45–97;
- pill "Phòng…": x 815–1050, y 42–103;
- dòng bình luận (avatar + chữ): x 29–657, y 1407–1806;
- banner "… đã tham gia": x 29–520, y 1851–1903.

Yêu cầu:
1. Thêm preset HUD `hud=tall` (giữ `hud=1` cũ) vẽ đúng các vùng trên. Đây là chế độ mặc định để kiểm tra từ nay.
2. Test quy tắc 11 chạy cả với `hud=tall`. Báo cáo những khung game bị vùng TikTok che (dự kiến: chỉ đỉnh logo bị pill che, hàng ghế cột 1–2 dưới bị bình luận che).
3. Cũng trong ảnh đó: câu 11 dài 4 dòng, dòng cuối "Battle Royale?" chạm viền dưới khung câu hỏi. Kiểm tra mock `question-longest` và `reading-longest`. Dòng cuối phải cách viền ≥ 16 px, nếu không đủ thì tự giảm cỡ chữ theo bậc (đã có clamp; kiểm tra vì sao lần live đó bị chạm). Thêm test.
