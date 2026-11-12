---
id: C-0101
from: coordinator
to: codex2
type: task
title: C-0101 Người dùng chưa duyệt: nền sân đấu + cờ theo ảnh mới, Top 10 gọn lại, Victory sáng/rực như ref, đồng hạng phải khác
ref: Y-0157
priority: high
needs: 
created: 2026-11-12T08:27:30+07:00
---
NGƯỜI DÙNG ĐÃ XEM 7 ảnh (C-0080 + C-0098) và CHƯA DUYỆT. Bốn ý của người dùng (12/11 sáng), sửa tiếp trên nhánh `codex2/c0068-victory-ref`:

**1. Nền + cờ màn câu hỏi.** Nền hiện tại chưa giống sân đấu. Người dùng gửi ảnh mẫu sân đấu mới: `assets-local/ref/san-dau-co-doi.jpg` (2000×1125, ngoài git). Yêu cầu: nền phải ra đúng chất sân vận động như `ref/storm-arena-ref.png` hoặc ảnh này (khán đài cong hai bên, sàn phản chiếu tím, cột sáng tím, cổng bão hình tam giác ở giữa). **Cờ phải giống cờ trong ảnh này**: dải cờ tím dọc, viền sáng, chữ V vàng ở đỉnh, đuôi nhọn chuyển cam–vàng — thay hai cờ hồng viền dây hiện nay.
- Được phép dùng ảnh raster: cắt/ghép từ `san-dau-co-doi.jpg` làm nền (chép bản đã cắt vào `assets-local/arena/bg.jpg`, ngoài git; fallback CSS khi thiếu file). Logo các đội trên cờ trong ảnh KHÔNG được xuất hiện trên overlay — cắt vùng không có cờ, hoặc che, và vẽ cờ trơn (chỉ logo sự kiện) bằng CSS/SVG theo đúng dáng cờ mẫu. Nền sáng (trời xanh) thì phủ lớp tối/tím để chữ HUD vẫn đạt tương phản.

**2. Top 10 toàn màn đang chiếm quá nhiều diện tích** (bản C-0098 tôi yêu cầu kéo 14–73 % — người dùng không thích). Thu gọn lại: bảng cao tối đa ~45 % màn hình, hàng thấp hơn, phần còn lại để lộ sân đấu + MC. Giữ tên hiện đủ 14 ký tự. Sửa luôn ô thoại MC ở màn này (đang hiện lời mời comment A/B/C — đổi thành lời về bảng xếp hạng, cỡ chữ đọc được). Màn câu hỏi: bảng tên "MC KELLY" đang đè nhãn tên hàng khán giả đầu.

**3. Victory vẫn tối và thiếu màu so với `ref/victory-ref.png`** — người dùng đòi giống hệt. Làm sáng và rực hơn: chùm sáng quạt sau cúp, tia sét tím/xanh hai bên, viền neon bục, ánh vàng quanh cúp, confetti nhiều màu, nền bão tím bão hoà cao (không phủ đen ở trên). Đo bằng số: độ sáng trung bình và độ bão hoà trung bình của ảnh chụp không thấp hơn 85 % của ref (viết script đo, dán số vào report). Nếu `victory/bg.jpg` không đủ, ghi rõ cần nền trơn kích thước nào, gồm/không gồm gì — coordinator sẽ chuẩn bị nền trơn gửi sau.

**4. Bản đồng hạng không khác bản thường.** Khi đồng hạng phải nhìn ra ngay: hai (hoặc ba) người cùng hạng đứng trên bục CÙNG ĐỘ CAO, cùng nhãn hạng (ví dụ hai "TOP 1"), có nhãn "ĐỒNG HẠNG", màu viền/vương miện giống nhau; hạng kế tiếp nhảy số đúng (1, 1, 3). Mock `victory-tie` phải dùng dữ liệu đồng hạng thật (điểm bằng nhau) — kiểm lại vì ảnh hiện tại y hệt bản thường.

Report: ảnh ghép REF | RENDER cho question, top10, victory, victory-tie; ảnh victory và victory-tie đặt cạnh nhau; số đo sáng/bão hoà. Typecheck + unit + Playwright xanh. Không gộp.
