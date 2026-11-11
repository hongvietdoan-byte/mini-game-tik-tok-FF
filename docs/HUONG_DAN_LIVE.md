# Hướng dẫn chạy LIVE — Bá Vương Đại Chiến

Ba bước: **bật game → đưa overlay vào LIVE Studio → điều khiển trên Dashboard**.

## 1. Bật tool game (mỗi lần LIVE)
1. Nhấp đúp `CHAY_GAME.cmd` ở thư mục dự án.
2. Một cửa sổ đen hiện ra. **Không tắt cửa sổ này trong lúc LIVE**: tắt cửa sổ là tắt game.
3. Trình duyệt tự mở Dashboard `http://127.0.0.1:8787/dashboard/`.
4. Ở ô "Mã quản trị", bấm **Ctrl+V** rồi đăng nhập. Mã đã được chép sẵn vào clipboard; file gốc nằm ở `data/admin-token.txt`.
5. Lần đầu sẽ có trình hướng dẫn (Setup Wizard): bấm kiểm tra System → Database → Mock. Bước TikTok điền **@username** kênh LIVE.

## 2. Đưa overlay vào TikTok LIVE Studio (làm 1 lần, LIVE Studio nhớ cảnh)
1. Mở LIVE Studio và chọn bố cục **dọc (Portrait 9:16)**.
2. Thêm nguồn **Link / Web (Browser)** như sau:
   - Vào **Sources → + (Add source) → Link**.
   - URL: `http://127.0.0.1:8787/overlay/`
   - Kích thước: **1080 × 1920**.
3. Kéo nguồn cho phủ kín khung hình và đặt nó trên cùng.
4. Nếu bản LIVE Studio không có nguồn Link, dùng cách thay thế:
   - Mở `http://127.0.0.1:8787/overlay/` bằng Edge hoặc Chrome, cửa sổ dọc.
   - Trong LIVE Studio, thêm nguồn **Window capture** và chọn cửa sổ đó.
5. Âm thanh (giọng MC, hiệu ứng) phát từ overlay. Bật "phát âm thanh / audio" của nguồn đó nếu LIVE Studio có tuỳ chọn này.

## 3. Chạy một vòng trên Dashboard
1. **Tạo phiên**:
   - Nguồn **TikTok** dùng cho LIVE thật, cần @username và kênh phải đang LIVE.
   - Nguồn **Mô phỏng** dùng để tập dượt.
2. Chọn bộ câu: chỉ câu **đã duyệt**. Câu DEMO chỉ dùng để thử.
3. Bấm **Mở sảnh**. Khán giả comment để tham gia.
4. Bấm **Bắt đầu vòng**. Game tự chạy các bước: đọc câu → nhận đáp án A/B/C/D → công bố → bảng xếp hạng Top 10 → Victory.
5. Có thể bấm **Tạm dừng / Dừng phiên** bất cứ lúc nào.

## Trước giờ LIVE — checklist
- [ ] `CHAY_GAME.cmd` đang chạy, Dashboard đăng nhập được.
- [ ] Overlay trong LIVE Studio thấy nền sân đấu + logo.
- [ ] Đã tập 1 vòng bằng **Mô phỏng**.
- [ ] Tài khoản TikTok có **quyền LIVE**. Nếu LIVE Studio báo "No access", tài khoản chưa đủ điều kiện LIVE trên máy tính và phải xin quyền với TikTok. Tool game không xử lý được việc này.
- [ ] Bấm **Go LIVE** trong LIVE Studio, **sau đó** mới tạo phiên nguồn TikTok trên Dashboard. Kênh chưa LIVE thì không đọc được comment.

## Sự cố thường gặp
| Hiện tượng | Cách xử lý |
|---|---|
| Dashboard trắng / 404 | Xoá `apps/dashboard/dist` và `apps/overlay/dist`, chạy lại `CHAY_GAME.cmd` (nó sẽ build lại) |
| "Failed to retrieve Room ID" | Kênh chưa LIVE: Go LIVE trước rồi kết nối lại |
| Overlay đứng hình | Trong LIVE Studio, bấm chuột phải vào nguồn → Refresh/Reload |
| Quên mã quản trị | Mở `data/admin-token.txt` |
