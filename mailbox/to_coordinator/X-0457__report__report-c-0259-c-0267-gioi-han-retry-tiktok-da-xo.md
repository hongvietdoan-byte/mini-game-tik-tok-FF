---
id: X-0457
from: codex1
to: coordinator
type: report
title: Report C-0259/C-0267: giới hạn retry TikTok đã xong
ref: C-0259
priority: normal
needs: 
created: 2026-11-17T22:47:17+07:00
---
Hoàn tất C-0259 và phần bổ sung C-0267 trên nhánh `codex1/c-tiktok-retry-limits`, commit `9e3a397` (đã push).

- Rate limit ký/429 dừng tự retry; lấy `retryAfterMs`/`Retry-After`, nếu thiếu thì cooldown 5 phút. Adapter chặn cả nút kết nối thủ công trước hạn; thời điểm retry được đưa vào admin health để Dashboard đếm ngược và disable Kết nối/Kết nối lại.
- Offline ban đầu dừng ngay; sau khi LIVE đã kết nối, một lần thử lại gặp offline sẽ dừng, báo LIVE có thể đã kết thúc và gợi ý chỉ đọc LIVE Công khai. Lỗi kết nối chung cũng nêu rõ giới hạn LIVE Bạn bè/riêng tư. Không thêm cookie hay đăng nhập TikTok.
- C-0267: chỉ reset bộ đếm khi đã nhận bình luận hoặc kết nối đủ 60 giây. Rớt nhanh tăng backoff tối thiểu 5 giây, lũy tiến và chặn ở tối đa 60 giây; dừng tự kết nối sau 3 lần rớt nhanh liên tiếp, Dashboard nêu trạng thái chập chờn và hướng dẫn operator.

Kiểm chứng:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test --maxWorkers=2` — PASS, 80 test files / 519 tests.
- `corepack pnpm privacy:check` — PASS (1.103 tệp được theo dõi).
- Test tập trung adapter + tích hợp TikTok: `corepack pnpm vitest run --project unit --project integration packages/live-adapters/src/tiktok.test.ts packages/live-adapters/src/tiktok.replay.test.ts tests/integration/tiktok-replay.test.ts tests/integration/tiktok.test.ts` — PASS, 4 files / 30 tests.
- `git diff --check` — PASS; kiểm tra các file sửa không có literal `\n` ở cuối — PASS.
