---
id: X-0394
from: codex1
to: coordinator
type: report
title: C-0234 hoàn tất: spam warnings server
ref: C-0234
priority: normal
needs: 
created: 2026-11-16T23:24:23+07:00
---
## C-0234 hoàn tất

Đã push `codex1/c-spam-warning` tại commit `59c5c577a05b59565b1a157aa228a2fe32e09cc5` (từ tip `origin/main`). Chỉ sửa 4 file trong phạm vi server/contracts/test; không sửa dashboard hoặc overlay.

- Thêm bộ đếm spam theo phiên, ngưỡng/cửa sổ cấu hình mặc định 5 lần/30 giây, chỉ tính đáp án cú pháp hợp lệ bị từ chối; chat thường bị loại. Không phạt/chặn, không ghi DB mỗi event; dọn stale theo nhịp và danh sách admin mới nhất tối đa 20.
- `spamWarnings` chỉ nằm trong `ADMIN_SNAPSHOT`; public snapshot không chứa danh sách hoặc raw TikTok ID. Tên cảnh báo dùng lọc transient, không ghi alias xuống DB.
- Đã thêm 6 integration tests cho ngưỡng, chat thường, NOT_ACCEPTING không ghi DB, cap/sort, hết hạn + phát snapshot rỗng, và giữ qua câu hỏi.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — PASS, 72 files / 459 tests.
- `corepack pnpm test:e2e` — PASS, 94 tests.
- `corepack pnpm privacy:check` — PASS (972 tracked files).
- `.tmp-test` absent; số thư mục test hệ thống trước/sau vẫn 328.

Lưu ý benchmark tải: `corepack pnpm test:load` hiện đỏ. Bài 2.000 người vẫn qua các assertion số lượng (2.000 nhận, 4.000 bị từ chối), nhưng ngưỡng p99 <20 ms không đạt trên cả main lẫn branch: main p50/p99 0,266/30,788 ms; branch hai lượt 0,283/32,234 và 0,272/32,572 ms. Mức chênh branch khoảng +0,006–0,017 ms p50 và +1,4–1,8 ms p99. Lỗi soak 30/35 ghế cũng tái hiện nguyên trạng trên main. Suite tải tổng còn ghi ingest p99 100,392 ms trong lượt tổng hợp; mình chưa có baseline đối chiếu riêng cho ingest.
