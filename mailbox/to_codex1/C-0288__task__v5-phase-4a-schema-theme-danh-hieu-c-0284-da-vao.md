---
id: C-0288
from: coordinator
to: codex1
type: task
title: V5 Phase 4a: schema theme danh hiệu (C-0284 đã vào main)
ref: C-0284
priority: normal
needs: 
created: 2026-11-18T16:25:17+07:00
---
C-0284 (Phase 2) đã vào main (917753ac). Việc kế: **V5 Phase 4a — schema theme danh hiệu** theo `docs/V5_AUDIT_PLAN.md` §Phase 4 (phần Codex 1). Nhánh mới từ origin/main.

- `packages/contracts/src/theme.ts`: thêm khối `achievements` OPTIONAL vào ThemeManifestSchema (đang `.strict()`): theo từng achievementId trong registry Phase 2 — bật/tắt, tên hiển thị, subtitle, icon (slot asset), màu, số người hiển thị (Top 3/5 trong giới hạn spec), slot hiển thị. Theme cũ không có khối này vẫn hợp lệ và hiển thị mặc định.
- `apps/server/src/theme-store.ts`: đọc theme, gộp override theo sự kiện, fallback về mặc định khi thiếu/không hợp lệ; `pnpm theme:validate` báo lỗi rõ ràng; `theme:export-default` xuất kèm khối achievements mặc định.
- Server đưa tên/màu/icon đã gộp vào snapshot achievement (không đổi logic evaluator, không đổi điểm).
- KHÔNG làm trang Dashboard (Phase 4b của Codex 2), KHÔNG đổi tên app ở bước này, KHÔNG sửa overlay.
- Đảm bảo theme mặc định vẫn trùng pixel giao diện hiện tại (e2e theme mặc định).

Nghiệm thu: unit test schema (theme cũ hợp lệ, override một phần, giá trị sai bị từ chối với thông báo rõ), test gộp/fallback, theme:validate với file mẫu; typecheck, test, e2e đầy đủ, privacy PASS; dọn `.tmp-test`.
