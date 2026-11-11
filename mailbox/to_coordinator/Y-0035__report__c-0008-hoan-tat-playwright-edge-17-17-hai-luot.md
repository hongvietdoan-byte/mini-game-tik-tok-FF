---
id: Y-0035
from: codex2
to: coordinator
type: report
title: C-0008 hoàn tất Playwright Edge, 17/17 hai lượt
ref: C-0008
priority: normal
needs: 
created: 2026-11-11T13:39:51+07:00
---
## C-0008 — Playwright smoke + ảnh overlay (Edge)

- **Nhánh/commit:** `codex2/c0008-e2e` / `21b190b` (`test(overlay): add Edge mock scene smoke coverage`), đã push lên origin.
- **Phạm vi commit:** `playwright.config.ts`, `tests/e2e/overlay.spec.ts`. Không sửa app, packages hoặc server.
- **Cấu hình:** Edge cài sẵn qua `channel: msedge`; viewport 1080×1920, deviceScaleFactor 1; Vite overlay ở cổng 5174 với reuseExistingServer; output `test-results/e2e`.
- **E2E:** 17/17 pass trên mỗi lượt; hai lượt `corepack pnpm test:e2e` liên tiếp:
  ```
  Lượt 1: 17 passed (38.4s)
  Lượt 2: 17 passed (41.7s)
  ```
  Bộ test bao phủ 12 cảnh mock, so ảnh, kiểm tra console/pageerror, không lộ đáp án ở PREPARE/QUESTION, đúng một đáp án ở REVEAL, vùng an toàn, tên XSS hiển thị như chữ, top10-short chỉ có 3 hàng thật và thứ tự bục victory-tie là 2→1→3 kèm nhãn ĐỒNG HẠNG.
- **Vùng an toàn:** cảnh sát mép nhất là `prepare`, còn 24 px.
- **Ảnh chụp local:** `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0008-e2e\test-results\e2e\screenshots\` (12 PNG; ví dụ `prepare.png`, `reveal.png`, `victory-tie.png`).
- **Baseline:** sinh local tại `tests/e2e/__screenshots__/`; không commit theo chỉ đạo mới hơn C-0016 vì bố cục V3 còn thay đổi. Commit chỉ có hai file source nêu trên. Trace Playwright tắt để tránh EBUSY khi Windows đóng context với trace đang mở.
- **Build:** `corepack pnpm --filter @quiz/dashboard build` và `corepack pnpm --filter @quiz/overlay build` đều thành công.
- **Typecheck:** `corepack pnpm typecheck` thành công.
- **Vitest:** `corepack pnpm test` thành công — 11 file, 128 tests.
- **Ghi chú build:** thử script gốc `corepack pnpm build:web` nhưng script gọi `vite` từ root (không có trên PATH), nên lệnh đó lỗi; build từng package dashboard/overlay thành công như trên.
