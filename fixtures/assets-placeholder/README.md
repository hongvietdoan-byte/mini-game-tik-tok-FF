# Asset giữ chỗ cho kiểm thử

Các ảnh trong thư mục này là bitmap tổng hợp, màu đơn sắc, không lấy từ asset hay ảnh đầu vào của người dùng. Chúng chỉ dùng để chạy kiểm thử khi máy không có `assets-local/`; không dùng cho LIVE, sản phẩm phát hành hay bản trình diễn.

Server và Playwright nhận đường dẫn bộ giữ chỗ qua biến `QUIZ_ASSETS_DIR`. Khi bỏ trống, Playwright dùng `assets-local/` của checkout chính (kể cả khi chạy từ worktree). Bộ giữ chỗ có logo 270×210, ba chibi 92×104 kèm manifest, MC 220×290, sân khấu cúp 1020×660 và nền dọc 1080×1920 theo đúng khung overlay.

Ảnh giữ chỗ đơn giản không vượt quá 4 KB; ba JPEG nền 1080×1920 được giới hạn riêng ở 16 KB. Privacy check từ chối ảnh vượt ngưỡng, thiếu metadata kích thước hoặc là symlink.

Các ID chibi bao gồm mã mặc định của server và mã được dùng trong mock snapshots để overlay không yêu cầu ảnh người dùng thật.
