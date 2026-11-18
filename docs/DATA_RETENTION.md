# Chính sách lưu dữ liệu LIVE

- Chỉ dọn các phiên đã đóng, đã quá số ngày do người vận hành chọn và không còn vòng đang chạy/chưa kết thúc trong thời hạn đó. Phiên đang mở luôn được giữ.
- `pnpm data:prune --older-than <ngày>` chỉ đọc và in số dòng dự kiến theo từng bảng; không có thời hạn mặc định để tránh tự ý xoá dữ liệu vận hành.
- Khi được chạy với `--apply`, toàn bộ DB được sao lưu trước vào `backups/` cạnh DB. Backup là bản lưu trữ kiểm toán điểm/danh hiệu trước khi dữ liệu phiên cũ bị xoá khỏi DB hoạt động.
- Sau backup, bản DB hoạt động xoá dữ liệu phiên/vòng cùng đáp án, sổ cái điểm, Top 3, danh hiệu, trạng thái khán giả và bản chụp runtime liên quan. Nội dung câu hỏi/theme dùng chung không bị xóa. Người chơi chỉ bị xóa khi đã quá hạn và không còn tham chiếu nào.
- `connection_events` chỉ xóa khi có `session_id`; sự kiện không gắn phiên được giữ. Bình luận thô nằm ngoài DB này và không bị lệnh prune đụng tới.
- Báo cáo cohort chỉ dùng quan hệ người chơi–câu trả lời; tổng đáp án của một câu không được dùng thay cho retention.

Người vận hành cần chọn `--older-than` phù hợp với nhu cầu kiểm toán và thời gian lưu backup của đơn vị trước khi áp dụng.
