---
id: X-0355
from: codex1
to: coordinator
type: report
title: C-0211: RC 1114b đã push, report kiểm thử và safe-zone
ref: C-0211
priority: high
needs: 
created: 2026-11-14T14:36:45+07:00
---
Đã dựng và push ứng viên C-0211.

- Nhánh: `codex1/release-candidate-1114b`
- Commit cuối: `6daa751d3dc35c048fd2101269b7fda244f32785`
- Base: `origin/codex2/c0209-mc-voice` (`b726e50`). Đã gộp các đầu C-0210 mới: C-0168 `262d23a`, HUD `59a4ae8`, C-0197 `2e8298f`. C-0200 (`beb4c13`) đã là tổ tiên. Không gộp `main`.
- Push: `git push -u origin codex1/release-candidate-1114b` → thành công, tạo nhánh remote.

Số đo bố cục trong test C-0207 khớp mốc origin/main (sai lệch 0 px, ngưỡng cho phép ≤1 px) ở cả header A/B và các pha prepare, reading, question, reveal, fastest-a/b: Top 10 `(98,345,300×466)`; bảng `(416,345,567×470)`; nội dung câu hỏi `(436,492,527×160)`; vùng đáp án `(438,667,512×136)`; timer `[data-testid=timer]` `(409,0,138×138)` (reading không hiện); khung MC `(0,760,1080×470)`; chân dung `(108,760,280×390)`; bảng tên `(100,1152,280×56)`; bong bóng `(410,844,568×220)`; 35 ghế và 35 nhãn tên có tọa độ khớp lưới chuẩn. C-0210 xác nhận ô VÒNG A `(760,16,220×128)`, B `(760,16,220×108)`, không tràn chữ. Không còn `v3-question-banner-mask` trong markup.

Kiểm tra trên worktree riêng `.claude/worktrees/c0211-release-candidate-1114b`:
- `corepack pnpm install --frozen-lockfile` → PASS.
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm privacy:check` → PASS, 876 tệp đã theo dõi.
- `corepack pnpm test --maxWorkers=1` → PASS, 67 file / 428 test; thư mục `quiz-*` trước/sau đều 328.
- `PLAYWRIGHT_SERVER_PORT=18791 PLAYWRIGHT_OVERLAY_PORT=15191 corepack pnpm test:e2e` → 81 passed, 8 failed. Tám lỗi C-0067 trên LOBBY, QUESTION, READING, REVEAL, LEADERBOARD, INTERIM_TOP10, INTERMISSION, CONNECTION_LOST đều là round-card giao với vùng viewers mock (`x=70.4–90.7%`, `y=0.8–7.5%`). Không sửa CSS/bố cục vì vị trí card đang bị khóa theo task; cần coordinator chốt ngoại lệ hay thay đổi yêu cầu.
- Sau khi cập nhật ba assertion chiều cao cũ theo A=128/B=108: `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts -g 'mock overlay applies HUD text|real participant counts format|event name and participant count stay readable'` → PASS, 3 test.
- `corepack pnpm build:web` → PASS, dashboard 48 module và overlay 60 module.
- Không gọi provider giọng thật. E2E kết thúc đã dọn `.tmp-test`, `test-results`, `playwright-report`.

Cần xem xét 8 lỗi safe-zone trước khi duyệt ảnh/ghép bản phát hành.
