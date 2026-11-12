# Hướng dẫn chạy thử TikTok LIVE Quiz — Bá Vương Đại Chiến

## Đường chạy dùng ngày 12–14/11

Trong các buổi chạy thử 12–14/11, chỉ dùng source-run bằng `CHAY_GAME.cmd` ở checkout repo. Bộ cài Electron/NSIS đang **DEFERRED**, không dùng cho các buổi này.

`CHAY_GAME.cmd` cố định cơ sở dữ liệu tại `<checkout>/data/quiz.db`, in commit và đường dẫn DB, build lại Dashboard/Overlay nếu `dist/` thiếu hoặc cũ hơn commit `HEAD`, rồi tạo backup trước khi mở server. Dữ liệu ứng dụng Electron trong thư mục người dùng/AppData là một kho riêng; không dùng hoặc trộn kho đó trong các buổi này.

Backup mặc định nằm ở `backups/<yyyymmdd-hhmmss>/` và không được commit. Có thể xác minh hoặc khôi phục thủ công từ thư mục repo:

```powershell
py tools/backup.py verify --from "backups/<ten-thu-muc-backup>"
py tools/backup.py restore --from "backups/<ten-thu-muc-backup>"
```

Lệnh khôi phục yêu cầu gõ `KHÔI_PHỤC`; chỉ làm sau khi đã đóng `CHAY_GAME.cmd`/server. Khôi phục ghi đè `data/quiz.db` và các asset trong backup. Nếu cần xác nhận tự động, chỉ thêm `--yes` khi đã kiểm tra đúng thư mục backup và đích.

## 1. Bật tool game

1. Nhấp đúp `CHAY_GAME.cmd` ở thư mục dự án.
2. Không tắt cửa sổ đen khi server đang dùng; tắt cửa sổ sẽ dừng game.
3. Trình duyệt tự mở Dashboard `http://127.0.0.1:8787/dashboard/`.
4. Ở ô “Mã quản trị”, bấm **Ctrl+V** rồi đăng nhập. Mã được chép vào clipboard; file gốc nằm ở `data/admin-token.txt`.
5. Trình hướng dẫn kiểm tra Backend, Database và Mock. TikTok cần username của kênh đang LIVE.

## 2. Đưa overlay vào TikTok LIVE Studio

1. Chọn bố cục dọc (Portrait 9:16).
2. Thêm nguồn Link / Web (Browser) với URL `http://127.0.0.1:8787/overlay/`, kích thước 1080 × 1920.
3. Kéo nguồn phủ kín khung hình và đặt ở lớp trên cùng.
4. Nếu LIVE Studio không có nguồn Link, mở URL bằng Edge/Chrome rồi dùng Window capture.

## 3. Chạy một vòng

1. Tạo phiên **TikTok** cho LIVE thật hoặc **Mô phỏng (MOCK)** để tập dượt.
2. Với TikTok, chỉ dùng đủ câu đã APPROVED và không phải DEMO. Chờ kết nối TikTok và overlay đã ACK trạng thái mới nhất.
3. Bấm **Mở sảnh**, sau đó **Bắt đầu vòng**. Nếu server trả `PREFLIGHT_FAILED`, xử lý các mục FAIL rồi kiểm tra lại trước khi bắt đầu.
   Nếu cần xem đủ kết quả, gọi API preflight có admin token trong PowerShell (token chỉ nằm trong header, không đặt trong URL):

   ```powershell
   $adminToken = (Get-Content data/admin-token.txt -Raw).Trim()
   Invoke-RestMethod -Uri http://127.0.0.1:8787/api/preflight -Headers @{ Authorization = "Bearer $adminToken" }
   Remove-Variable adminToken
   ```
4. MOCK có thể chạy để diễn tập khi preflight còn FAIL; hãy nói rõ với người xem đây là mô phỏng.
5. Trong các buổi 12–14/11, không bật hoặc dựa vào giọng MC; dùng nội dung hiển thị trên overlay.

## 4. Khi TikTok connector lỗi giữa buổi

1. Bấm **Tạm dừng** ngay khi nhận ra connector mất kết nối; không để câu tiếp tục chạy.
2. Nếu câu hiện tại bị gián đoạn, dùng thao tác **Huỷ câu/VOID** và ghi lý do. Không tự tiếp tục câu cũ khi connector vừa reconnect.
3. Chỉ **Tiếp tục** phiên TikTok sau khi trạng thái kết nối ổn định và operator đã xác nhận.
4. Nếu connector không phục hồi, dừng phiên TikTok. Tạo phiên mới ở chế độ MOCK để tiếp tục diễn tập và thông báo rõ cho khán giả rằng nguồn đã chuyển sang mô phỏng; không mô tả đó là LIVE TikTok.

## Checklist trước buổi chạy

- [ ] `CHAY_GAME.cmd` đang chạy; dòng khởi động cho thấy commit và DB `<checkout>/data/quiz.db`.
- [ ] Backup trước khi server mở đã hoàn tất; backup mới nhất verify được.
- [ ] Dashboard đăng nhập được và overlay hiển thị đúng.
- [ ] Đã tập trọn một vòng MOCK.
- [ ] Với TikTok: tài khoản có quyền LIVE; bấm Go LIVE trước khi tạo phiên TikTok.
- [ ] Câu hỏi cho TikTok đã APPROVED, không DEMO; preflight không còn FAIL.

## Sửa câu hỏi

Mở `BO_CAU_HOI.xlsx`, chỉ sửa dữ liệu trong sheet `TAT_CA`, rồi lưu file. Chạy `py tools\question_bank.py import --from BO_CAU_HOI.xlsx --dry-run` để xem lỗi trước; khi đã kiểm tra, chạy lại bỏ `--dry-run` để sao lưu DB và nhập các dòng hợp lệ. `Dùng = KHÔNG` lưu câu ở trạng thái ARCHIVED, không xóa câu hay lịch sử; workbook được tạo bằng `py tools\question_bank.py export --out BO_CAU_HOI.xlsx` và không đưa vào Git.

## Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Dashboard trắng / 404 | `CHAY_GAME.cmd` tự build nếu dist thiếu/cũ. Nếu vẫn lỗi, kiểm tra output build rồi chạy lại launcher. |
| `PREFLIGHT_FAILED` | Mở GET `/api/preflight` bằng admin để xem lý do từng mục; xử lý pool câu hỏi, DB, asset, overlay ACK, nguồn hoặc dist. |
| “Failed to retrieve Room ID” | Kênh chưa LIVE hoặc connector lỗi: tạm dừng và làm theo mục 4. |
| Overlay đứng hình | Trong LIVE Studio, bấm chuột phải vào nguồn rồi Refresh/Reload; chờ overlay ACK trước khi bắt đầu. |
| Quên mã quản trị | Mở `data/admin-token.txt` trên máy chạy source-run. |
