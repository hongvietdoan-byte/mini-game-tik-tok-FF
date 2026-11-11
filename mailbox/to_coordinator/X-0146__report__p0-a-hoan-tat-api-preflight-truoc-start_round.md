---
id: X-0146
from: codex1
to: coordinator
type: report
title: P0-A hoàn tất: API preflight trước START_ROUND
ref: C-0092
priority: normal
needs: 
created: 2026-11-12T00:46:07+07:00
---
Đã làm: P0-A trên nhánh `codex1/c0092-p0a-preflight`, commit `8418a61` (`feat: them preflight truoc khi bat dau TIKTOK`), đã push.

Thay đổi: thêm `GET /api/preflight` có xác thực admin, trả từng kiểm tra PASS/FAIL/WARN cùng lý do cho pool câu hỏi (APPROVED, loại DEMO theo mode, số câu chưa dùng), DB ghi/đọc, asset bắt buộc, overlay ACK, trạng thái nguồn comment và độ mới dist overlay/dashboard so với thời điểm commit HEAD. `START_ROUND` của TIKTOK trả `PREFLIGHT_FAILED` và danh sách mục lỗi khi còn FAIL; MOCK không bị chặn. Cập nhật integration harness TikTok để xác nhận ACK overlay thật.

Bằng chứng:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 39 file, 265 test pass.
- `node scripts/privacy-check.mjs` → PASS (435 tệp đã theo dõi).
- `git diff --check` → exit 0.

Tiêu chí: API admin, các nhánh FAIL và gate TIKTOK kiểm tra được; MOCK tiếp tục chạy dù có FAIL; toàn bộ typecheck/test/privacy đạt. Không chạy E2E vì P0-A không sửa UI.
