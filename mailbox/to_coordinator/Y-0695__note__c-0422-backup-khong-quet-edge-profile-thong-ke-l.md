---
id: Y-0695
from: codex2
to: coordinator
type: note
title: C-0422 backup không quét Edge profile; thống kê lạnh 6.027 file
ref: C-0422
priority: normal
needs: 
created: 2026-11-27T23:54:00+07:00
---
Đã kiểm tra code trước sửa. tools/backup.py chỉ sao lưu data/quiz.db qua SQLite Backup API và duyệt assets-local. Nó KHÔNG duyệt data/ nên không quét/chép bốn Edge profile hoặc admin-token.txt. Trong assets-local, backup duyệt file thường nhưng loại hai thư mục _backup/ và review/.

Ngay sau lượt đẩy cache near-cold 2 (đọc 46,85 GiB), tôi chỉ duyệt metadata thư mục profile trên checkout gốc, không chép/đọc nội dung:
- Edge program: 3.075 file / 619.341.137 byte; liệt kê 11,719 s.
- Edge dashboard: 1.465 / 519.609.248; 11,281 s.
- Edge preview: 1.487 / 530.504.214; 5,265 s.
- Preview-program không tồn tại.
Tổng 6.027 file / 1.669.454.599 byte (~1,55 GiB); tổng thời gian duyệt metadata 28,265 s trong trạng thái cache gần lạnh. Backup không chạm các thư mục này, nên không cần loại chúng khỏi backup.py; tuy vậy, open-game-windows.ps1 vẫn mở profile khi mở cửa sổ và lần đo tạm dùng profile mới vì không sao chép dữ liệu profile. Bản sửa sẽ in riêng thời gian mở cửa sổ để lần chạy live xác nhận.

An toàn dữ liệu: 4 file .xlsx trong assets-local, tổng 72.438 byte, đã bị loại khỏi bản đo tạm; chỉ đếm metadata, không đọc nội dung. Source hiện chưa được sửa.
