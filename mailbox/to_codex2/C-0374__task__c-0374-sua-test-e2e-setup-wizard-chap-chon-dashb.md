---
id: C-0374
from: coordinator
to: codex2
type: task
title: C-0374: sửa test E2E Setup Wizard chập chờn (dashboard.test.ts)
ref: C-0374
priority: high
needs: 
created: 2026-11-20T19:46:48+07:00
---
## Việc
Ca Playwright `tests/e2e/dashboard.test.ts:231` — `Setup Wizard giữ trạng thái Overlay ${PASS|FAIL|NOT_TESTED} khi tiếp tục` (3 biến thể) **chập chờn**, chủ yếu ở lượt `QUIZ_ASSETS_DIR=fixtures/assets-placeholder` và khi máy tải nặng. Làm cho nó tất định. Codex 1 đã được báo KHÔNG đụng file này (C-0373), nên bạn là người duy nhất sửa `tests/e2e/dashboard.test.ts`.

## Nhánh
`codex2/c-0374-dashboard-wizard-flaky` tách từ `origin/main` mới nhất (đã có C-0335, `b196f922`+).

## Brief 6 mục
1. **Ảnh mẫu / số đo:** không áp dụng. Đây là việc sửa test, không đổi giao diện. Không được đổi bố cục, vị trí hay cỡ chữ Dashboard.
2. **Quy tắc khoảng cách:** không áp dụng, vì không có thay đổi UI. Nếu buộc phải sửa code Dashboard (lỗi thật) thì dừng lại và gửi `question` trước khi làm.
3. **Ca biên phải tái hiện:**
   - Trước khi sửa: chạy `--repeat-each=10` với cả 2 bộ asset, báo số lần fail và thông báo lỗi.
   - Phải có đủ 3 biến thể PASS / FAIL / NOT_TESTED.
   - Phải thử thêm khi máy tải nặng: `--workers=4` hoặc chạy song song với vitest.
4. **Cách sửa và test bắt buộc:**
   - Chờ đúng sự kiện hoặc trạng thái thay cho chờ theo thời gian: `expect(...).toHaveAttribute`, chờ request API mock đã trả, chờ `data-*` state.
   - Không tăng timeout, không thêm `retries`, không bỏ hoặc nới assertion.
   - Nếu nguyên nhân là race thật trong code Dashboard thì báo `question` trước.
   - Sau khi sửa:
     - ca đó `--repeat-each=20` đạt 20/20 với cả 2 bộ asset;
     - `corepack pnpm typecheck`;
     - `corepack pnpm privacy:check`;
     - `vitest run --project unit --project integration --pool=forks --maxWorkers=2`;
     - **toàn bộ** Playwright 2 lượt (asset thật và placeholder), dùng `PLAYWRIGHT_SERVER_PORT=18932 PLAYWRIGHT_OVERLAY_PORT=15332` để không đụng cổng của coordinator.
   - Báo số passed / failed / skipped của từng lượt.
5. **Không commit ảnh chụp hay `test-results/`.** Chỉ sửa `tests/e2e/dashboard.test.ts`, cùng helper test nếu thật cần (nêu tên file).
6. **Merge `origin/main` mới nhất trước khi report.** Ưu tiên: làm ngay, đây là việc duy nhất của bạn. Báo cáo gồm commit, nguyên nhân gốc, lệnh đã chạy và kết quả. Mục tiêu xong trước 21:00.
