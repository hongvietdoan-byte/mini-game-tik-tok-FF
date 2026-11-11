---
id: X-0118
from: codex1
to: coordinator
type: report
title: C-0067 hoàn tất — E2E safe-zone mọi scene
ref: C-0067
priority: normal
needs: 
created: 2026-11-11T21:39:44+07:00
---
C-0067 hoàn tất trên nhánh `codex1/c0067-safe-zone-e2e`, commit `d6f14ab` (`test: đo vùng an toàn TikTok qua mọi scene`), đã push.

File duy nhất: `tests/e2e/safe-zone.test.ts`. Test đo bounding box các phần tử gameplay trong khung 1080×1920, quy đổi crop-fill 9:19.5 (x=9–91%), comment rail (x<70%, y=73–92%), comment input (y≥92.5%), dải trên y<14%, và giao nhau với các blocker HUD theo testid. Bỏ ghế/chibi khỏi kiểm tra che. Theo C-0074, logo BVĐC được miễn giao nhau với host pill/viewers; vẫn kiểm live chips/event banner. Test fail bình thường nếu thiếu selector, blocker hoặc có lỗi runtime; chỉ đánh expected-fail khi có vi phạm hình học.

Bảng vi phạm còn lại sau khi rebase lên main có C-0065/C-0066:

| Scene | Vi phạm ghi nhận |
|---|---|
| LOBBY | Quiz HUD giao event banner; MC plate x=6.9–32.9% và bubble x=36.1–97.2% vượt crop ngang. |
| QUESTION / REVEAL / LEADERBOARD | Quiz HUD và timer giao event banner; MC plate/bubble vượt crop ngang như trên. |
| INTERIM_TOP10 | Khối Top10 x=3.9–86.1%, y bắt đầu 13.0%; giao live chips/event banner. Các hàng 1, 3, 5, 7, 9 bắt đầu x=7.0%. |
| VICTORY | Ribbon vòng ở y=12.8–14.9%, giao live chips; cúp x=3.7–96.3% và giao live chips; tên bục slot 1 bắt đầu x=6.5%. |
| INTERMISSION / CONNECTION_LOST | Không còn vi phạm. |

Kiểm tra:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 31 files, 227 tests passed.
- `corepack pnpm exec playwright test --grep-invert 'C-0062:'` → 40 passed; 6 ca safe-zone expected-fail đúng các vi phạm trong bảng.
- `corepack pnpm exec playwright test tests/e2e/live-round.test.ts` → 1 passed (FPS 109.5; 35 ghế).
- Lệnh đầy đủ `corepack pnpm test:e2e` từng gặp `ERR_CONNECTION_REFUSED` ở 127.0.0.1:5176 sau khi C-0062 kết thúc; chạy tách nhóm cho kết quả 40/40 và 1/1 như trên.
- `git diff --cached --check` → không có lỗi whitespace.

Push: `git push -u origin codex1/c0067-safe-zone-e2e` → thành công.
