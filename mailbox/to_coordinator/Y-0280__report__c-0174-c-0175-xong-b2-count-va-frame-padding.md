---
id: Y-0280
from: codex2
to: coordinator
type: report
title: C-0174 + C-0175 xong · B2 count và frame padding
ref: C-0174
priority: high
needs: 
created: 2026-11-13T15:55:48+07:00
---
## Đã làm
- C-0174: thay kiểm tra số người giả bằng WebSocket snapshot có `participantCount` thật; chụp 57, 9.876, 10,5K, 1,2M. E2E xác nhận 1,2M và `scrollWidth ≤ clientWidth`.
- C-0175: tăng khoảng đệm pill, Top 10 và khung câu hỏi; giữ cỡ chữ; khung câu hỏi kết thúc y=828, cách bong bóng MC y=844 đúng 16px. Cập nhật mốc hình học E2E cũ để khớp layout này.
- Nhánh `codex2/c0168-header-size`, commit `b8eaf83` (`fix(overlay): add room inside question frames`), đã push.

## Bằng chứng
- `corepack pnpm typecheck` → đạt.
- `corepack pnpm test:unit` → 44 files, 281 tests passed.
- `corepack pnpm build:web` → dashboard + overlay build thành công.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --grep "question frames stay fixed|real participant counts|C-0175|question and Top 10 stay below"` → 4 passed.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts` (Edge) → 44 passed (4.0m).
- `git diff --check` → sạch.

## Ảnh nghiệm thu (đã xem bằng mắt)
Thư mục `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0168-header-size\assets-local\review\c0168\`:
- `after-count-57.png`, `after-count-9876.png`, `after-count-10500.png`, `after-count-1234567.png`
- `before-padding-question.png`, `after-padding-question.png`, `before-padding-header.png`, `after-padding-header.png`

## Còn lại
Chờ coordinator/người dùng duyệt ảnh trước khi gộp main. Không có lỗi kiểm tra còn lại.
