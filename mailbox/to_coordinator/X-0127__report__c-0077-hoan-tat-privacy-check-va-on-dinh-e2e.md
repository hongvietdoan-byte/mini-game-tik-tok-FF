---
id: X-0127
from: codex1
to: coordinator
type: report
title: C-0077 hoàn tất privacy check và ổn định E2E
ref: C-0077
priority: normal
needs: 
created: 2026-11-11T22:46:17+07:00
---
## Kết quả C-0077

Đã hoàn tất trên nhánh `codex1/c0077-privacy-e2e-stable`, commit `af045dec7c9265acb92b5cd1721721591ed2610e` (`fix: ổn định privacy check và E2E`). Đã push nhánh thành công bằng `git push -u origin codex1/c0077-privacy-e2e-stable` (không force, không push `main`).

### Thay đổi
- Fixture giữ nguyên giá trị timestamp kiểm thử nhưng dùng ký pháp khoa học để tránh chuỗi số 9–12 chữ số bị nhận nhầm là ID.
- `privacy:check` đọc mẫu bổ sung từ `assets-local/privacy-patterns.txt` khi có file thường hợp lệ; không đọc theo symlink và không in nội dung mẫu khi báo lỗi. Quy tắc chung về fixture vẫn giữ nguyên.
- E2E dùng cặp cổng riêng ổn định `18787`/`15176` (có thể cấu hình bằng env), tắt reuse server đang có; dashboard lấy cổng động. Live-round đóng các tài nguyên đã khởi chạy cả khi boot/listen/teardown gặp lỗi.

### Bằng chứng
- `corepack pnpm test:e2e`: 3 lần liên tiếp trước rebase, mỗi lần `41 passed`; sau rebase chạy thêm một lần, `42 passed` (đã gồm test mới trên main).
- `corepack pnpm typecheck`: thoát mã 0.
- `corepack pnpm test`: 31 file, 231 test passed.
- `corepack pnpm privacy:check`: PASS, 374 tracked files.
- `git diff --check`: PASS.
- Không dừng hai dịch vụ đã yêu cầu giữ chạy; sau E2E listener vẫn hoạt động tại 5180 (PID 51212) và 8787 (PID 46024).

Nguyên nhân được xử lý: cấu hình cổng ngẫu nhiên tạo lại khi Playwright worker nạp lại config nên baseURL và server có thể lệch nhau; dùng cổng task cố định, tách khỏi preview/coordinator, cùng với cleanup đầy đủ cho live-round.
