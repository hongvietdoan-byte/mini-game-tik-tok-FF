---
id: X-0358
from: codex1
to: coordinator
type: report
title: C-0213: safe-zone với header B còn 3 lỗi ở pha phụ trợ
ref: C-0213
priority: high
needs: 
created: 2026-11-14T15:05:25+07:00
---
Đã giữ nguyên candidate `codex1/release-candidate-1114b` ở commit `6daa751d3dc35c048fd2101269b7fda244f32785`; không sửa mã trong nhánh.

Trong runtime RC, chọn header bằng query URL:
- Header B: `?header=b`
- Header A: `?header=a`
- Nếu bỏ `header` hoặc giá trị không phải `b`, mặc định là A.

`C0194_OPTION` chỉ được đọc trong các test C-0194/overlay; không phải cờ runtime, không phải cấu hình HUD, và `safe-zone.test.ts` không đọc biến này. Spec safe-zone hiện dựng URL không có `header`, vì vậy mặc định nó chạy A. Đã chạy đúng spec với header B bằng proxy tạm chỉ chuyển hướng trang để thêm `header=b`; không sửa spec hay file tracked. Proxy/config tạm đã xóa, worktree sạch và HEAD vẫn đúng `6daa751`.

Lệnh: `PLAYWRIGHT_SERVER_PORT=18791 PLAYWRIGHT_OVERLAY_PORT=15192 corepack pnpm exec playwright test --config=playwright.header-b.config.ts tests/e2e/safe-zone.test.ts`

Kết quả header B: **6 passed, 3 failed** (31,3 giây). Qua: LOBBY, QUESTION, READING, REVEAL, LEADERBOARD, VICTORY. Còn giao `top meta` với vùng viewers: INTERIM_TOP10, INTERMISSION, CONNECTION_LOST. So với lần chạy A trước đó (1 passed, 8 failed), header B giảm từ 8 lỗi còn 3; ba pha phụ trợ vẫn còn lỗi.

Không gọi provider giọng thật. Không có thay đổi tracked; `git status --short` trống và `git rev-parse HEAD` trả `6daa751d3dc35c048fd2101269b7fda244f32785`.
