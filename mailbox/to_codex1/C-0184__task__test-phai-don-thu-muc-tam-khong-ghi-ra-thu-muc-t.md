---
id: C-0184
from: coordinator
to: codex1
type: task
title: Test phải dọn thư mục tạm, không ghi ra thư mục tạm hệ thống
ref: 
priority: high
needs: 
created: 2026-11-13T17:46:28+07:00
---
Người dùng báo ổ hệ thống gần đầy. Đo thực tế: thư mục tạm hệ thống có ~6.700 thư mục `quiz-*` (~4,6 GB) do test của repo này để lại, cộng 1 bản sao `node_modules` dở (~0,75 GB) và ~150 thư mục `playwright*`. Nguyên nhân: test tạo thư mục bằng `mkdtemp(os.tmpdir())` mà không dọn.

## Việc cần làm (ưu tiên CAO NHẤT, trước mọi task khác) — nhánh `codex1/test-temp-cleanup` từ main
1. `tests/integration/helpers.ts:45` (`quiz-it-` — thủ phạm chính, mỗi test 1 thư mục, không bao giờ xóa) và `tests/integration/web.test.ts:16` (`quiz-web-*`): thêm dọn dẹp chắc chắn (afterEach/afterAll + `rmSync(..., { recursive: true, force: true, maxRetries })`, đóng DB trước khi xóa).
2. Rà MỌI chỗ `mkdtemp`/`tmpdir()` trong `tests/**`, `packages/**`, `apps/**`, `tools/**`, `scripts/**` (kể cả e2e, playwright config, mock_round_check, simulate-round, benchmark name-filter): chỗ nào có `rm` thì kiểm nó chạy cả khi test fail (finally/afterEach).
3. Chuyển gốc thư mục tạm của test vào trong repo: 1 helper chung (vd. `tests/support/tempRoot.ts`) trả về `<repo>/.tmp-test/` (đã gitignore), dùng thay `os.tmpdir()`; vitest globalSetup/teardown xóa `.tmp-test/` trước và sau mỗi lượt chạy. Playwright: `outputDir`/user-data-dir cũng đặt trong repo và dọn sau khi chạy.
4. Không sao chép `node_modules` hay artifact nặng ra thư mục tạm hệ thống. Ảnh review giữ trong `assets-local/review/` như cũ.
5. Thêm 1 test/kiểm tra bảo vệ: sau `pnpm test:unit` + integration, số thư mục `quiz-*` trong thư mục tạm hệ thống không tăng (đếm trước/sau, báo số trong report).
6. KHÔNG tự xóa rác cũ trong thư mục tạm hệ thống — người dùng tự quyết; chỉ báo số đo.

## Bàn giao
Typecheck + toàn bộ unit/integration PASS; report số thư mục tạm trước/sau 1 lượt chạy đầy đủ. Quy tắc này áp dụng cho mọi task từ nay: test xong phải dọn, không để dữ liệu nặng ngoài thư mục repo.
