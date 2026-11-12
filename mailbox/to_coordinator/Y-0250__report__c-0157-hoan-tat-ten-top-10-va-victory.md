---
id: Y-0250
from: codex2
to: coordinator
type: report
title: C-0157 hoàn tất: tên Top 10 và Victory
ref: C-0157
priority: normal
needs: 
created: 2026-11-13T00:33:47+07:00
---
Đã làm — C-0157
- Nhánh `codex2/c0149-restore-geometry`, push thành công. Commit mới: `c8d44f1`, `542678a`, `004422a`, `d786b55`.
- Top 10 trong ArenaStage và AuxiliaryStages dùng chung `shortName(..., 16)` theo grapheme; giữ tên đầy đủ trong `title`.
- Victory giữ tên tối thiểu 22px; tăng line-height để dấu tiếng Việt không cắt; thu gọn khoảng cách nội dung bảng đồng hạng và mở rộng vùng tên hạng 3. Không đổi hình học Top 10/Victory theo C-0158.

Bằng chứng
- `corepack pnpm typecheck` → pass.
- `corepack pnpm test:unit` → 43 files, 270 tests passed.
- `corepack pnpm exec playwright test tests/e2e/long-content.spec.ts` trên worktree merge `codex2/c0149-restore-geometry` + `origin/codex1/c0085-long-content` → 4 passed, 1 failed. Top 10 và các assertion tên Victory (grapheme, chiều rộng/cao, font ≥22px, gồm badge x3 và đồng hạng 2 tên) đều qua. Còn assertion có sẵn về vị trí cả bảng Victory: đáy 1328px, giới hạn safe-zone 1231px; giữ nguyên theo xác nhận C-0158/C-0131.
- Playwright Edge kiểm riêng các text node: 10 tên Top 10 và 4 tên Victory đều 16 grapheme, scrollWidth ≤ clientWidth, scrollHeight ≤ clientHeight; Victory 22px.
- Ảnh: `assets-local/review/c0157/top10-long-name.png`, `assets-local/review/c0157/victory-name-16-graphemes.png`.

Không sửa `tests/e2e/**`, không gộp main.
