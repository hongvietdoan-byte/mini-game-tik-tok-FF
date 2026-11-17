---
id: C-0259
from: coordinator
to: codex1
type: task
title: TikTok: ngừng tự kết nối khi bị giới hạn lượt ký / LIVE đã tắt; báo rõ LIVE Bạn bè
ref: 
priority: normal
needs: 
created: 2026-11-17T21:32:20+07:00
---
## Bối cảnh (live thật 17/11)
Sau khi người dùng End LIVE lúc 21:19, connector (packages/live-adapters/src/tiktok.ts) tự kết nối lại 5–6 lần trong ~11 phút, cộng vài lần người dùng bấm "Kết nối" → dịch vụ ký miễn phí trả rate limit ("Dịch vụ ký kết nối đang giới hạn lượt…"). Sự kiện `streamEnd` có vẻ không tới (ngắt WebSocket thường), nên `manualStop` không bật. Người dùng sau đó LIVE ở chế độ **Bạn bè** — connector ẩn danh không đọc được LIVE này, nhưng thông báo lỗi không nói rõ.

## Việc cần làm (làm SAU C-0257, cùng làn codex1)
1. Khi lỗi là rate limit ký (SignatureRateLimitError / 429): **dừng tự kết nối lại**; nếu lỗi có thời gian retry thì lưu `retryAfterMs`, hiện trên Dashboard "Thử lại được sau mm:ss" và chặn/disable nút Kết nối đến lúc đó (hoặc cảnh báo). Không có thời gian retry thì mặc định chờ 5 phút.
2. Khi lấy phòng LIVE thất bại kiểu chưa LIVE / offline sau khi đã từng kết nối: dừng tự kết nối sau tối đa 2 lần thử (không tiêu lượt ký), thông báo "LIVE có thể đã kết thúc — bấm Kết nối khi LIVE lại".
3. Thông báo lỗi cho trường hợp LIVE riêng tư/chỉ bạn bè (nếu thư viện có tín hiệu/ thông điệp nhận biết được): "LIVE đang để chế độ Bạn bè/riêng tư — game chỉ đọc được LIVE Công khai". Nếu không nhận biết chắc chắn được thì thêm câu gợi ý này vào thông báo chung khi kết nối thất bại.
4. Không dùng cookie/đăng nhập TikTok (giữ nguyên nguyên tắc chỉ đọc ẩn danh).

## Tiêu chí xong
- Test unit với scheduler giả: rate limit → không còn retry tự động, có retryAfter; offline sau khi từng kết nối → tối đa 2 lần thử.
- typecheck, test, privacy:check PASS. Kiểm tra cuối file không có `\n` literal.
- Nhánh `codex1/c-tiktok-retry-limits`, báo lại bằng thư.
