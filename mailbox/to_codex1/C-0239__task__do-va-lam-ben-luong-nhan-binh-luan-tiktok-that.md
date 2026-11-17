---
id: C-0239
from: coordinator
to: codex1
type: task
title: Đo và làm bền luồng nhận bình luận TikTok thật
ref: 
priority: high
needs: 
created: 2026-11-17T09:14:31+07:00
---
## Mục tiêu
Người dùng hỏi: hiện mới thử bằng simulator, liệu luồng bình luận TikTok THẬT có bắt được đủ bình luận không. Simulator bơm thẳng vào adapter nên không thử phần nhận từ TikTok (`packages/live-adapters/src/tiktok.ts`, `tiktok-live-connector` 2.5.0). Việc này: làm cho đường nhận thật bền hơn và ĐO ĐƯỢC lúc live, để người vận hành biết có rơi bình luận hay không.

## Yêu cầu
1. **Chỉ số nhận bình luận thật (admin-only, Dashboard)**: số bình luận/giây nhận từ TikTok (tổng + của câu hiện tại), độ trễ nguồn p50/p95 (receivedAt − sourceTimestamp đã quy chuẩn), số lần mất kết nối/kết nối lại và tổng thời gian mất kết nối trong vòng, số bị loại theo lý do (đặc biệt `STALE_SOURCE_TIMESTAMP`, `LATE`), thời điểm nhận bình luận cuối cùng. Cảnh báo nhẹ trên Dashboard khi đang ACCEPTING mà >5 s không nhận được bình luận nào hoặc trễ p95 > 3 s. Không hiện cảnh báo spam (người dùng đã bỏ).
2. **Bền kết nối**: rà `tiktok-live-connector` 2.5.0 — nếu thư viện rơi sang chế độ polling thay WebSocket, hoặc gặp `SignatureRateLimitError` / lỗi ký Euler, phải báo rõ trên Dashboard (trạng thái + gợi ý). Mất kết nối giữa câu: tự kết nối lại nhanh (lần đầu ≤1 s), không nạp lại lịch sử cũ; bình luận trùng `eventId` sau kết nối lại phải bị loại (kiểm tra đã có dedupe chưa, chưa có thì thêm). `Math.min(...offsets)` mỗi bình luận → đổi sang cách không tốn O(n) nếu dễ.
3. **Ghi lại & phát lại luồng thật**: tuỳ chọn bật ghi bình luận thô của phiên TIKTOK ra `data/` (gitignore; chỉ giữ userId băm, text, createTime, msgId, receivedAt — KHÔNG lưu tên thật/ảnh) và script chạy tay phát lại file đó vào server ở tốc độ 1×/5×/20× để kiểm tra với dữ liệu thật. Có test với fixture giả.
4. **Ngưỡng trễ**: KHÔNG đổi luật thời gian/ân hạn (đang chờ người dùng quyết). Chỉ thêm số đo.

## Ràng buộc
- Lane codex1 (server/adapters/contracts/tests) + được sửa Dashboard phần hiển thị chỉ số này (codex2 đang rảnh, không đụng overlay).
- Chỉ đọc; không cookie/session TikTok; không gửi chat. Không ghi tên miền/ID nội bộ vào repo/thư.
- typecheck + test + test:load + e2e + privacy xanh. Nhánh `codex1/c-real-ingest` từ main mới nhất, push và report kèm hash. Dọn `.tmp-test`.
