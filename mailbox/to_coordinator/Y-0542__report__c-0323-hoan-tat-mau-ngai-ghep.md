---
id: Y-0542
from: codex2
to: coordinator
type: report
title: C-0323 hoàn tất: mẫu ngai ghép
ref: C-0323
priority: normal
needs: 
created: 2026-11-19T15:49:34+07:00
---
C-0323 hoàn tất; task thay hướng và kết quả này thay C-0320/C-0322. Chỉ thêm test mẫu E2E, không sửa sản phẩm và không tạo SVG.

- Nhánh: `codex2/c-0323-throne-mock`
- Commit: `d81a550f test(overlay): add C-0323 throne review samples`
- File commit: `tests/e2e/c0323-throne-review.spec.ts` (duy nhất)
- Ảnh và số đo bị ignore: `.claude/review/C0323/` trong checkout chính. Dùng ảnh ghép ngai Caroline/Alvaro, ngai trống, và chibi đứng từ `assets-local/`; không commit asset.
- Mẫu gồm QUESTION có/không HUD, ba khung đổi chủ, LOBBY ngai trống với 30/35 ghế, tên 24 grapheme (30px, ellipsis), và fallback ngai trống + chibi đứng. Crossfade là mock 600ms, nhãn đổi chủ minh hoạ trạng thái khoảng 2 giây; không có runtime.
- Đo QUESTION: vùng ngai x=358,y=965, 652×210; bubble MC y=844–949, 30px/tối đa 2 dòng; hở bubble–ngai 16px, MC–ngai 16px, ngai–tên hàng đầu còn lại 16.56px. Lobby ngai dịch x=396 để giữ hở 16px với bảng tên MC.

Kiểm tra:
- `$env:PLAYWRIGHT_SERVER_PORT='18788'; $env:PLAYWRIGHT_OVERLAY_PORT='15177'; corepack pnpm exec playwright test tests/e2e/c0323-throne-review.spec.ts --workers=1` → 1 passed (21.5s).
- `corepack pnpm typecheck` → passed, exit 0.
- `git diff --check` → passed.

`C-0320` và `C-0322` được đóng theo hướng thay thế của `C-0323`.
