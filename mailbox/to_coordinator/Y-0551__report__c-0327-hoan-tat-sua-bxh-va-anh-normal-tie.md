---
id: Y-0551
from: codex2
to: coordinator
type: report
title: C-0327 hoàn tất: sửa BXH và ảnh normal/tie
ref: C-0327
priority: high
needs: 
created: 2026-11-19T16:57:02+07:00
---
# Báo cáo C-0327 — chỉnh mẫu BXH V5

Đã sửa mẫu kiểm thử trong `tests/e2e/c0307-ranking-v5-samples.spec.ts`; không thay đổi runtime sản phẩm.

- Bỏ chấm/huy hiệu cạnh số hạng; số 1/2/3 vẫn thẳng tâm cột, chỉ hạng 1 dùng nền nhấn.
- Top 3 chặng: khoảng cách header cột đến hàng 1 là 8 px. Cân nhóm header cột + 3 hàng trong vùng nội dung sau tiêu đề; phép đo mới dùng đúng vùng này, khoảng trống trên/dưới lệch 0 px ở normal và tie. Soi lại ảnh sau khi phát hiện phép đo cũ bị false positive.
- Tiêu đề Top 10 và Top 3 đều căn trái, dòng phụ căn phải, padding ngang 24 px.
- Mock bóng thoại Top 3 chặng dùng câu `Vinh danh Top 3 chặng này!`; đưa nguyên câu này vào danh sách câu thoại cần rà của C-0325.

## Ảnh gửi duyệt

Thư mục: `E:\Ai\2026\Trend mini game tiktok\.claude\review\C0327` (ignored, không commit). Mỗi cảnh có ảnh full và zoom, cả normal lẫn tie:

- Top 10: `option-b-rotate-overall-normal-1080x1920.png`, `option-b-rotate-overall-normal-table-zoom.png`, `option-b-rotate-overall-tie-1080x1920.png`, `option-b-rotate-overall-tie-table-zoom.png`.
- Top 3 chặng: `option-b-rotate-stage-normal-1080x1920.png`, `option-b-rotate-stage-normal-table-zoom.png`, `option-b-rotate-stage-tie-1080x1920.png`, `option-b-rotate-stage-tie-table-zoom.png`.

## Kiểm tra

- `PLAYWRIGHT_SERVER_PORT=18789 PLAYWRIGHT_OVERLAY_PORT=15178 corepack pnpm exec playwright test tests/e2e/c0307-ranking-v5-samples.spec.ts --workers=1` → 4 passed (1.2m).
- `corepack pnpm typecheck` → exit 0.
- `git diff --check` → pass.
