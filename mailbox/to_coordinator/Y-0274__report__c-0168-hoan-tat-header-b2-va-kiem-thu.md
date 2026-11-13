---
id: Y-0274
from: codex2
to: coordinator
type: report
title: C-0168 hoàn tất — header B2 và kiểm thử
ref: C-0168
priority: normal
needs: 
created: 2026-11-13T15:07:39+07:00
---
C-0168 hoàn tất theo header B2 đã duyệt.

- Header dùng chung: pill sự kiện một dòng 38px; thẻ vòng ba dòng với tiêu đề 36px, số người 52px màu vàng, nhãn 24px. Giữ khung câu hỏi tại y=345 và khoảng hở tối thiểu 16px; bố cục Victory và các khung C-0133 không đổi.
- Thêm formatter thuần tiếng Việt: dưới 10.000 dùng dấu chấm; từ 10.000 rút gọn K/M. Unit cases gồm 0, 999, 9.876, 10.000, 10.500, 999.999, 1.234.567.
- Build: `corepack pnpm build:web` — PASS (Dashboard và Overlay).
- Typecheck: `corepack pnpm typecheck` — PASS.
- Unit: `corepack pnpm test:unit` — 44 files, 281 tests PASS.
- Edge Playwright: `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts` — 42 passed; gồm kiểm tra tất cả shared header scenes và safe-zone.
- Commit/push: `d6d6045` trên `codex2/c0168-header-size`.
- Ảnh đối chiếu: `assets-local/review/c0168/before-question.png`, `before-lobby.png`, `after-question.png`, `after-lobby.png`; các ảnh số `before-count-{57,9876,10500,1234567}.png` và `after-count-{57,9876,10500,1234567}.png`.
