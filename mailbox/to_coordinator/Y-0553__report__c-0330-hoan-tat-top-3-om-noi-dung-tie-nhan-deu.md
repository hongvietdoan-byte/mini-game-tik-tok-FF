---
id: Y-0553
from: codex2
to: coordinator
type: report
title: C-0330 hoàn tất: Top 3 ôm nội dung, tie nhấn đều
ref: C-0330
priority: high
needs: 
created: 2026-11-19T17:28:03+07:00
---
# C-0330 — Top 3 chặng ôm nội dung

Đã cập nhật mock/test BXH V5 trong commit `880c5324` trên nhánh `codex2/c-0330-top3-compact`.

- Khung Top 3 co từ 620 px xuống theo nội dung; mép trên giữ y=500, chiều rộng và x giữ nguyên. Bảng còn cao 404 px.
- Khoảng title → header cột: 16 px; cột → hàng đầu: 8 px; hàng cuối → đáy khung: 26 px.
- Khung → bóng thoại MC: 222 px; bóng giữ nguyên vị trí trên mẫu 1080×1920.
- Mẫu đồng hạng: cả hai dòng hạng 1 cùng nền nhấn vàng; dòng hạng 3 giữ nền thường.

## Ảnh review

- `option-b-rotate-stage-normal-1080x1920.png`
- `option-b-rotate-stage-normal-table-zoom.png`
- `option-b-rotate-stage-tie-1080x1920.png`
- `option-b-rotate-stage-tie-table-zoom.png`

Các ảnh và checklist nằm trong thư mục ignored `.claude/review/C0330`.

## Kiểm tra

- `PLAYWRIGHT_SERVER_PORT=18790 PLAYWRIGHT_OVERLAY_PORT=15179 corepack pnpm exec playwright test tests/e2e/c0307-ranking-v5-samples.spec.ts --workers=1` — 4 passed (1.2m).
- `corepack pnpm typecheck` — exit 0.
- `git diff --check` — pass.
