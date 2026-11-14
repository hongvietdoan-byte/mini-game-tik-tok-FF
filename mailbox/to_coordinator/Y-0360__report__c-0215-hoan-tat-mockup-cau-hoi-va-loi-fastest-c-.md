---
id: Y-0360
from: codex2
to: coordinator
type: report
title: C-0215 hoàn tất: mockup câu hỏi và lỗi fastest C-0220
ref: C-0215
priority: high
needs: 
created: 2026-11-14T17:18:20+07:00
---
## Đã làm
- Dựng giao diện QUESTION theo ảnh mẫu và các số đo C-0216, giữ nguyên nền `bg-question-user.jpg`; dịch đồng bộ mục 6–13 lên 180px và dàn 35 ghế thành lưới 5×7.
- Sửa lỗi C-0220: nhãn StormKing hiển thị trọn và nằm trên avatar; nhãn hàng 2 nằm trên ghế vàng theo lớp vẽ. Bục cuối nằm tại y=1793–1845, trong dung sai 5px.
- Bảng `measurements.md` chỉ có một dòng cho mỗi phần, có cột pha; 13 phần chính lệch 0px theo số đo khung (ghế cuối lệch tối đa 5px).
- Nhánh `codex2/c0214-user-mockup`, commit `96ae0af` (đã push).

## Bằng chứng
- `corepack pnpm typecheck` — đạt.
- `corepack pnpm build:web` — dashboard và overlay build đạt.
- `corepack pnpm test` — 428 test / 67 file đạt.
- `corepack pnpm exec playwright test tests/e2e/c0207-fixed-layout.spec.ts tests/e2e/c0214-user-reference.spec.ts` — 3/3 đạt.
- `corepack pnpm test:e2e` — 90/90 đạt (3.9 phút, Playwright dùng msedge).
- `git diff --check` — đạt.

Ảnh 1080×1920 (không commit):
- QUESTION: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\question.png`
- REVEAL: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\reveal.png`
- FASTEST: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\fastest.png`
- Top 10 giữa vòng: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\top10-mid-round.png`
- Sảnh: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\lobby.png`
- Ghép mẫu | bản dựng FASTEST: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\fastest-side-by-side.png`
- Ghép mẫu | bản dựng QUESTION: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\question-side-by-side.png`
- Số đo: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0214-user-mockup\.claude\review\C0214\measurements.md`

## Giới hạn / rà duyệt
- Giữ nền theo xác nhận C-0217; khung bắt đầu ở y=528 nên che khoảng 86px đáy cờ, đúng phần người dùng cho phép.
- Một số vùng header giao vùng HUD TikTok giả lập; bảng số đo ghi rõ các phần giao nhau. Cần coordinator/người dùng duyệt ảnh trước khi gộp main theo quy trình UI.
- `.tmp-test` không tồn tại sau khi chạy test.
