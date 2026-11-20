# Báo cáo độ dài câu hỏi

Chạy `corepack pnpm report:question-length` để đo các câu đã duyệt bằng overlay thật tại viewport 1080×1920. Thêm `--json` để xuất cả JSON. Báo cáo và JSON được ghi vào `.claude/review/C0310/` (thư mục bị ignore); ảnh kiểm chứng dấu được ghi vào `test-results/c0310/`.

Công cụ tạo bản sao SQLite qua backup API từ kết nối nguồn chỉ đọc, sau đó mở bản sao readonly. Nó chỉ lấy câu `APPROVED`, không ghi nội dung câu hỏi và không sinh âm thanh. Cảnh QUESTION/REVEAL được nạp bằng mock WebSocket; ảnh giao diện thật được dùng để đo.

“Đáp án bị cắt nội dung” chỉ tính dấu ellipsis, text hiển thị khác bản gốc, số dòng Range vượt line clamp hoặc tràn chiều ngang. Chênh `scrollHeight` đơn lẻ được báo riêng là tràn line-box; không dùng nó để đề xuất sửa text. Báo cáo cũng so Range bbox của dấu tiếng Việt với content box và lưu ảnh crop DPR 3 để kiểm tra pixel bằng mắt.

Các cách rút gọn được ghi nhãn **ĐỀ XUẤT — chờ người dùng duyệt**. Công cụ không sửa DB hay file câu hỏi.
