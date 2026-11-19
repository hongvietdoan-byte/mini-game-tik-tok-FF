---
id: Y-0531
from: codex2
to: coordinator
type: report
title: C-0307 hoàn tất bộ ảnh BXH V5 và REVEAL Top 3
ref: C-0307
priority: normal
needs: 
created: 2026-11-19T11:49:52+07:00
---
C-0307 đã có bộ mẫu mới trong worktree `c-0307-ranking-v5`, nhánh `codex2/c-0307-ranking-v5`. Chưa sửa overlay sản phẩm; chỉ thêm E2E tạo mẫu/đo DOM. Ảnh và checklist nằm trong `.claude/review/C0307/` (ignored, không commit).

**Đề xuất B — luân phiên Top 10 và Top 3 chặng, mỗi bảng 5 giây.** Cả 6 mẫu chính (thường / tên 24 grapheme / đồng hạng cho Top 10 và Top 3) cùng 4 số lượng người chặng 0–3 đều đạt 10/10 quy tắc trong DOM. Khung vẫn `x=112, y=500, w=856, h=620`; gap tên–điểm tối thiểu 24 px; hàng cách 8 px; đáy khung B tối thiểu 29 px; tương phản thấp nhất 10.47:1; mỗi bảng dùng tối đa 3 cỡ chữ. Điểm chặng hiển thị dạng số, đơn vị ở tiêu đề cột. Mẫu 0 người không giả hàng.

Phương án A (Top 10 + Top 3 chặng cùng khung) được giữ làm ảnh chẩn đoán, **không đạt quy tắc 4**: nội dung tràn đáy khung 158 px. Vì vậy không coi A là phương án dùng được.

Ảnh ngữ cảnh: REVEAL có thêm mẫu danh sách **Top 3 nhanh nhất** trong callout MC, gồm bản thường, tên 24 grapheme và đồng hạng; thời gian tốt nhất hiển thị `1,6 s`. Cả 3 mẫu đều qua 10/10 quy tắc trên DOM; tên dài không bị cắt, header không tràn cột, khung Top 10 nền giữ nguyên. Vẫn giữ ảnh callout một người với `1,6 giây` để đối chiếu ngữ cảnh. Sảnh cho thấy 35/35, `GHẾ ĐÃ CÓ CHỦ`, lời nhắc lớn và countdown 96 px; Victory có đồng hạng. Đã soi collage và ảnh toàn khung/zoom; nội dung đọc được, không chạm lề viewport.

Ảnh chính và tự kiểm:
- `.claude/review/C0307/option-comparison-collage.png`
- `.claude/review/C0307/option-b-player-counts-0-3-collage.png`
- `.claude/review/C0307/checklist-10-rules.md` (13 mẫu, số đo DOM chi tiết)
- `.claude/review/C0307/reveal-top3-fastest-collage.png` và `.claude/review/C0307/reveal-top3-fastest-checklist.md` (3 mẫu REVEAL Top 3, 10 quy tắc)
- `.claude/review/C0307/reveal-top3-fastest-normal-1080x1920.png`, `reveal-top3-fastest-long_name-1080x1920.png`, `reveal-top3-fastest-tie-1080x1920.png` và ảnh zoom tương ứng
- `.claude/review/C0307/reveal-fastest-long-name-1_6s-1080x1920.png` và `reveal-fastest-long-name-zoom.png`
- `.claude/review/C0307/lobby-35-of-35-countdown-96px-1080x1920.png`
- `.claude/review/C0307/victory-tie-context-1080x1920.png`
- Mỗi mẫu Top 10 / Top 3 cũng có ảnh toàn khung 1080×1920 và ảnh zoom; mẫu tên dài / đồng hạng đã được tự soi.

Kiểm tra:
- `corepack pnpm exec tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --skipLibCheck --strict --noUncheckedIndexedAccess --types node tests/e2e/c0307-ranking-v5-samples.spec.ts` → PASS.
- `corepack pnpm exec playwright test --config .claude/review/C0307/playwright-local.config.ts --workers=1 tests/e2e/c0307-ranking-v5-samples.spec.ts` (server và Vite được khởi động riêng với cổng 18986/15386) → 3/3 PASS, 41.8 giây; gồm 13 mẫu BXH, 35/35 sảnh, Victory đồng hạng và 3 mẫu REVEAL Top 3.
- Lệnh E2E mặc định `corepack pnpm test:e2e --workers=1 tests/e2e/c0307-ranking-v5-samples.spec.ts` dừng ở khởi động webServer: `Timed out waiting 60000ms from config.webServer`; không có assertion test nào chạy ở lần đó. Chạy lại với server/Vite đã sẵn sàng thì cả 3 test đều xanh.
- `git diff --check` → PASS.

Ảnh không được commit. B là phương án đề xuất; tiếp tục Phase 4b trên nhánh riêng theo C-0290 trong lúc chờ duyệt hình.
