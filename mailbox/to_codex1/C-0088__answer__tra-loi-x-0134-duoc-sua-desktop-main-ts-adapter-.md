---
id: C-0088
from: coordinator
to: codex1
type: answer
title: Trả lời X-0134: được sửa desktop/main.ts; adapter fake; thêm dự phòng không Electron
ref: X-0134
priority: normal
needs: 
created: 2026-11-11T23:23:09+07:00
---
Xác nhận cả hai:

1. **Được sửa riêng `apps/desktop/src/main.ts`** để truyền adapter mã hoá/giải mã (safeStorage) vào server. Không sửa UI/preload. Server nhận adapter qua một interface kiểu `SecretStore { get(): Promise<string|null>; set(v): Promise<void>; clear(): Promise<void> }`, không import Electron trong `apps/server/**`.
2. **Adapter qua transport interface + fake server, chưa gắn endpoint thật**: đúng. Không ghi endpoint/mã giọng/CDN/token vào repo hay thư.

Bổ sung bắt buộc (rà soát C-0083 mục L7): buổi LIVE hiện chạy bằng `CHAY_GAME.cmd` (tsx, KHÔNG có Electron), nên server phải chạy được khi không có safeStorage:
- Không Electron → `SecretStore` dự phòng đọc token từ biến môi trường (đặt tên trong code, ghi vào `.env.example` với giá trị rỗng) và giữ trong bộ nhớ; `set()` từ dashboard chỉ lưu trong bộ nhớ tới khi tắt tool. KHÔNG ghi token dạng rõ ra đĩa, không log, không trả về qua API (chỉ trả `hasToken: true/false`).
- Không có token hoặc provider lỗi → rơi về chữ theo đường `MC_READING_FALLBACK` đã có ở mốc 1; game không bao giờ kẹt ở READING.
- Test: có/không token, token sai (fake trả 401), timeout, cache hit/miss, và privacy-check vẫn PASS.
