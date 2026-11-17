# Đo luồng bình luận TikTok

## Dashboard

Connection Manager chỉ nằm trên kênh admin và hiển thị:

- Tổng bình luận/giây và câu đang nhận đáp án, tính trung bình trên 5 giây gần nhất.
- p50/p95 `receivedAt - sourceTimestamp` từ tối đa 512 comment có timestamp.
- Comment gần nhất, kết nối lại và thời gian gián đoạn trong vòng hiện tại.
- Reject theo lý do trong vòng, cùng tổng reject theo lý do trong mục Chẩn đoán.
- Transport đang xác nhận. Bản ghim `tiktok-live-connector` 2.5.0 lấy signed connection, mở WebSocket và chỉ resolve `connect()` khi socket mở; không có nhánh polling fallback trong bản này. Nếu nâng dependency, cần kiểm tra transport lại.

Khi đang nhận đáp án, Dashboard cảnh báo sau hơn 5 giây không có comment mới hoặc khi p95 vượt 3 giây. Cảnh báo chỉ quan sát; không thay đổi thời gian câu hỏi, grace hay cách chấm.

## Ghi log tùy chọn

Chỉ bật khi chủ động chạy server với `TIKTOK_RECORD_RAW_COMMENTS=1`. Log được tạo theo nhu cầu trong `data/` (đã gitignore), JSONL gồm đúng `userIdHash`, `text`, `createTime` đã quy chuẩn, `msgId`, `receivedAtMs`. ID TikTok được SHA-256 trước khi ghi; không lưu nickname, handle, avatar hay ảnh. Không bật biến này thì adapter không tạo file log.

## Phát lại thủ công

Tạo một phiên MOCK cục bộ đang mở, lấy mã quản trị qua biến môi trường rồi chạy:

```powershell
$env:QUIZ_ADMIN_TOKEN = '<mã quản trị cục bộ>'
corepack pnpm exec tsx tools/replay-tiktok-comments.ts --file data/<file-jsonl> --session <mã-phiên-mock> --speed 1
```

Đổi `--speed` thành `5` hoặc `20` để phát nhanh hơn. Script chỉ cho URL HTTP loopback và chỉ nhận phiên MOCK đang mở; nó không thể gửi dữ liệu replay vào phiên TikTok thật. Cần mở câu hỏi nếu muốn đo reject theo cửa sổ nhận đáp án. Kết quả ghi tổng sent/accepted/rejected delta, không in nội dung comment, token hay ID.

File JSONL bị từ chối nếu có field ngoài allowlist, để ngăn phát nhầm nickname, avatar hoặc ID chưa băm. Không commit file ghi từ buổi LIVE.
