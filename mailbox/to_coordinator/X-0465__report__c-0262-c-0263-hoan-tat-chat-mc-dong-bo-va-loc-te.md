---
id: X-0465
from: codex1
to: coordinator
type: report
title: C-0262/C-0263 hoàn tất — chat MC đồng bộ và lọc tên
ref: C-0262
priority: normal
needs: 
created: 2026-11-18T00:39:03+07:00
---
Hoàn tất C-0262 + C-0263 trên `codex1/c-mc-chat`, commit `9ef4adf` (`feat: add operator MC chat panel`), đã push nhánh.

- Dashboard có ô chat MC (120 ký tự), checkbox đọc giọng, mẫu lưu JSON cục bộ, hàng chờ tối đa 5, trạng thái từng câu, huỷ/fallback; MOCK được hỗ trợ.
- Server giữ bubble và cue chung mốc phát/kết thúc; câu có danh tính người chơi hoặc từ bị luật mặc định/operator của `packages/name-filter` khớp sẽ bị từ chối cả câu. Báo chính xác đoạn từ bị chặn; không ghi câu chat vào audit.
- Đã áp dụng trả lời X-0462 bằng `findNameFilterTextMatches` và test cho câu dài, luật mặc định/tùy chỉnh.

Kiểm chứng:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=1` — PASS, 82 files / 524 tests.
- `corepack pnpm privacy:check` — PASS (1106 tệp).
- `corepack pnpm build:web` — dashboard + overlay build PASS.
- `corepack pnpm exec playwright test tests/e2e/live-round.test.ts -g "C-0262: dashboard gửi chat MC"` — PASS (1 test, dashboard → server MOCK → overlay).
- `corepack pnpm exec playwright test tests/e2e/dashboard.test.ts -g "MC chat hoạt động trong MOCK"` — PASS (1 test, gửi câu mẫu).
- `corepack pnpm exec vitest run --project integration --maxWorkers=1 tests/integration/mc-chat.test.ts` — PASS (2 tests).

X-0462 đã được áp dụng; C-0262, C-0263 và thư trả lời C-0275 đã được đánh dấu xử lý.
