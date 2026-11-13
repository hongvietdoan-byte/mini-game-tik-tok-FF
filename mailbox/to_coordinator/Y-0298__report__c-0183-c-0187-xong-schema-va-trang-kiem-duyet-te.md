---
id: Y-0298
from: codex2
to: coordinator
type: report
title: C-0183/C-0187 xong — schema và trang kiểm duyệt tên
ref: C-0183
priority: high
needs: 
created: 2026-11-13T18:26:10+07:00
---
Đã làm trên nhánh `codex2/name-moderation`, commit `929a8a0`.

- C-0183: trang dùng cấu trúc settings đầy đủ, mutation config và audit của C-0181; chỉ liệt kê quy tắc CUSTOM và ghi rõ bộ từ SYSTEM mặc định không có trong response. Visibility/review tải lại `/players`; các thao tác chính sách tải lại settings + audit.
- C-0187: tên risk NONE hiện đúng tên gốc; bộ đếm tính mức HIGH, REVIEW chưa cho phép và ẩn tay; sau khi ẩn hai tên, thông báo là 2, có đúng hai dòng ẩn tay mới và bộ đếm tăng theo định nghĩa. Thay iframe overlay cũ bằng preview chữ Top 10/Top 3 từ tên an toàn trong roster; preview cập nhật tức thời và luôn có trạng thái rỗng. Nhãn đã Việt hóa, lịch sử đặt cạnh preview và rút gọn để giảm khoảng trống.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm exec vitest run --project unit apps/dashboard/src/nameModerationData.test.ts` — 9 tests PASS.
- `corepack pnpm --filter @quiz/dashboard exec vite build` — PASS.
- `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts --grep 'kiểm duyệt tên'` — 2 tests PASS (Playwright cấu hình channel `msedge`).
- `corepack pnpm build:web` — dashboard build PASS, bước overlay bị `EPERM` khi Vite dọn `apps/overlay/dist/assets`; build riêng dashboard PASS.

Ảnh mới (trong worktree):
- `assets-local/review/name-moderation/flagged-list.png`
- `assets-local/review/name-moderation/live-before-hide.png`
- `assets-local/review/name-moderation/live-after-hide.png`
- `assets-local/review/name-moderation/preview-top10.png`
- `assets-local/review/name-moderation/preview-victory.png`

Giới hạn: commit C-0181 chưa có trên `origin/main`; adapter sẽ dùng schema chuẩn của `@quiz/contracts` khi export được merge. Trên nhánh hiện tại có validator nghiêm ngặt khớp đúng cấu trúc C-0181 để giữ typecheck và E2E xanh, không sửa `packages/**`.

Dọn dẹp: đã xóa profile tạm `.tmp`, `test-results/e2e`, `apps/dashboard/dist` và ba ảnh overlay preview cũ. E2E server đã dừng; cổng 5173, 15176 và 18787 không còn listener.
