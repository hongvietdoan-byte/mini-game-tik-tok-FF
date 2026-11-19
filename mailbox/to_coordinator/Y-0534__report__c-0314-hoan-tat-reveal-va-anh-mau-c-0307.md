---
id: Y-0534
from: codex2
to: coordinator
type: report
title: C-0314 hoàn tất — REVEAL và ảnh mẫu C-0307
ref: C-0314
priority: high
needs: 
created: 2026-11-19T13:26:36+07:00
---
C-0314 hoàn tất trên nhánh `codex2/c-0314-reveal-rows`, commit `09705716` (`test: fix C-0307 V5 sample checks`). Thay đổi chỉ nằm ở `tests/e2e/c0307-ranking-v5-samples.spec.ts`; ảnh/checklist tạo ra được giữ ignored trong thư mục worktree, không commit.

Bằng chứng kiểm thử:
- `corepack pnpm typecheck` — PASS, exit 0.
- `$env:PLAYWRIGHT_SERVER_PORT='18793'; $env:PLAYWRIGHT_OVERLAY_PORT='15183'; corepack pnpm exec playwright test tests/e2e/c0307-ranking-v5-samples.spec.ts --workers=1` — `3 passed (45.3s)`.
- `git diff --check` — PASS, không có lỗi whitespace.

Số đo DOM ở REVEAL Top 3 nhanh nhất: hàng 48 px với chữ 28 px (1,71×); padding dọc 8 px, ngang 16 px; khoảng giữa hàng 8 px; mép trái tên lệch 0 px; tên trái, hạng giữa, thời gian phải; cột thời gian dùng tabular nums và giá trị chỉ còn `1,6`/`2,0`/`2,4` trong khi đơn vị `GIÂY` chỉ ở header. Tên dài 24 grapheme không bị cắt. Case đồng hạng hiển thị đủ ba tên thành các hàng `1, 1, 3`; mỗi ảnh có đúng một hàng nhấn vàng. Đáy callout còn 8 px; callout không lấn bảng Top 10 hay viewport.

Option B: Top 10 có hàng 36 px với chữ 22 px (1,64×), gap hàng 8 px, title/header cách 16 px và đáy bảng 24 px; Top 3 chặng có ba hàng cao 146/146/146 px, tiêu đề cùng vị trí Top 10. Hạng 2/3 dùng huy hiệu nhỏ trên nền trung tính; chỉ hạng 1 được nhấn. Top 10 đồng hạng có 11 tên luân phiên 2 trang, mỗi trang 10 hàng, không có `+N`. Option A được giữ làm ảnh chẩn đoán và kiểm tra tràn đáy 190 px.

Ảnh full/zoom đã soi ở 100% (ignored, không commit):
- REVEAL thường full: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-normal-1080x1920.png`
- REVEAL thường zoom: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-normal-zoom.png`
- REVEAL tên dài full: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-long_name-1080x1920.png`
- REVEAL tên dài zoom: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-long_name-zoom.png`
- REVEAL đồng hạng full: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-tie-1080x1920.png`
- REVEAL đồng hạng zoom: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-tie-zoom.png`
- Tất cả ảnh Top 10/Top 3, overflow tie, trạng thái 0–3 người và ảnh A chẩn đoán: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\`
- Bảng đo/checklist: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-measurements.json`, `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\reveal-top3-fastest-checklist.md`, `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0314-reveal-rows\.claude\review\C0307\checklist-10-rules.md`.

Đã push nhánh `codex2/c-0314-reveal-rows` lên origin.
