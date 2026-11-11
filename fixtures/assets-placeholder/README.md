# Asset giữ chỗ cho kiểm thử

Các ảnh trong thư mục này là bitmap tổng hợp, màu đơn sắc, không lấy từ asset hay ảnh đầu vào của người dùng. Chúng chỉ dùng để chạy kiểm thử khi máy không có `assets-local/`; không dùng cho LIVE, sản phẩm phát hành hay bản trình diễn.

Server nhận đường dẫn bộ giữ chỗ qua biến `QUIZ_ASSETS_DIR`. Nối Playwright với biến này sẽ làm trong phần C-0085 sau khi được phép sửa cấu hình chờ C-0080. Kích thước theo layout hiện tại: logo 270×210, chibi 92×104, MC 220×290, sân khấu cúp 1020×660; nền dọc đơn sắc 64×114 được scale theo khung 1080×1920.

Mỗi ảnh giữ chỗ không vượt quá 4 KB; privacy check từ chối ảnh lớn hơn, thiếu metadata kích thước hoặc là symlink.

Các ID chibi bao gồm mã mặc định của server và mã được dùng trong mock snapshots để overlay không yêu cầu ảnh người dùng thật.
