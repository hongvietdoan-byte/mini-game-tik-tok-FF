---
id: Y-0349
from: codex2
to: coordinator
type: report
title: C-0207 hoàn tất: bố cục cố định trên ba nhánh
ref: C-0207
priority: high
needs: 
created: 2026-11-14T13:20:43+07:00
---
## Đã làm
- Hoàn nguyên bố cục cố định và giới hạn header A/B đúng phạm vi event/round/count/pill; nền dùng nguyên ảnh cờ, bỏ mask.
- Push ba nhánh:
  - `codex2/c0168-header-size` — `2e59764e9deae08d3439cae7e81db95d131b23d3`
  - `codex2/hud-settings` — `c293762312a48e966f1ce0473753193ba884a4a2`
  - `codex2/c0197-fastest-correct` — `11d1d66732fba81b133064efd937b63fc15600a0`

## Số đo main · nhánh (px)
| Khung | main | c0168 | hud-settings | c0197 |
|---|---:|---:|---:|---:|
| Top 10 | 98,345 · 300×466 | khớp | khớp | khớp |
| Bảng câu hỏi | 416,345 · 567×470 | khớp | khớp | khớp |
| Nội dung câu hỏi | 436,492 · 527×160 | khớp | khớp | khớp |
| Đáp án | 438,667 · 512×136 | khớp | khớp | khớp |
| Đồng hồ (không ở READING) | 409,0 · 138×138 | khớp | khớp | khớp |
| Khung MC | 0,760 · 1080×470 | khớp | khớp | khớp |
| Chân dung Kelly | 108,760 · 280×390 | khớp | khớp | khớp |
| Bảng tên MC | 100,1152 · 280×56 | khớp | khớp | khớp |
| Bong bóng MC | 410,844 · 568×220 | khớp | khớp | khớp |
| 35 ghế khán giả | 5 cột × 7 hàng; y=1860,1771.67,1683.33,1595,1506.67,1418.33,1330 | khớp | khớp | khớp |

Nền `/assets/arena/bg-question-user.jpg`: 1080×1920, `cover`, `center`, không transform; không còn `v3-question-banner-mask`. Các frame và ghế được đo so với main; sai lệch tối đa 0px. Fastest A/B nằm trong bong bóng MC cố định.

## Bằng chứng
- Mỗi worktree: `corepack pnpm typecheck` — đạt; `corepack pnpm build:web` — đạt; `corepack pnpm exec vitest run --project unit apps/overlay/src/v3/arenaLogic.test.ts apps/overlay/src/v3/participantCount.test.ts --maxWorkers=1` — 2 file, 11 test đạt.
- `corepack pnpm test:e2e`: c0168 **69 passed**; hud-settings **76 passed**; c0197 **76 passed**. Test C-0207 chụp question/reveal/fastest A/B/top10 với header A/B và kiểm tra khung, ghế, mask, nền; targeted chạy **2 passed mỗi nhánh**.
- Ảnh local (không commit):
  - HUD, A: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\.claude\review\C0207\header-A\` (question, reveal, fastest-a, fastest-b, top10-mid-round).
  - HUD, B: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\.claude\review\C0207\header-B\` (cùng 5 ảnh).
  - c0197 cũng có đủ 5 ảnh trong hai thư mục `header-A` và `header-B` dưới `.claude/review/C0207/`.
  - c0168 chưa có mock fastest; có question/reveal/top10 ở hai header.

## Còn lại
- Không còn việc C-0207. C-0205 được thay thế bởi C-0207. C-0209 đã được nhận và sẽ làm tiếp sau khi đóng C-0207.
