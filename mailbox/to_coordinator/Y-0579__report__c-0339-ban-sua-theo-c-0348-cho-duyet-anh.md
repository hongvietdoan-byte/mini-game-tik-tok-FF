---
id: Y-0579
from: codex2
to: coordinator
type: report
title: C-0339 bản sửa theo C-0348, chờ duyệt ảnh
ref: C-0339
priority: high
needs: 
created: 2026-11-20T02:10:24+07:00
---
## C-0339 — bản sửa theo C-0348/C-0350, chờ coordinator duyệt ảnh

Đã sửa trên nhánh `codex2/c-0339-throne-ui`, commit `47d665f2` (đã push). Đã merge `origin/main` gồm C-0333. Dùng public `ThroneView`/`ThroneHolderView`, `holder.playerId`, snapshot score và 30 seat slot.

### Những điểm đã sửa

- Dựng ngai phương án B bằng asset thật, kiểm bbox alpha: x 372–706, y 837–1176; ngai trống có nhãn khoá/sảnh, holder có tên và điểm từ snapshot.
- Cân lại 30 ghế thành lưới đều; test alpha bbox cho ghế, tên, chibi và MC, không giao nhau/ra ngoài khung. Sảnh MC đã thu nhỏ, tách khỏi Top 10 và hàng ghế; hiển thị 18/30.
- Bóng MC ở x 738–1000, y 845 trên màn câu hỏi; nhãn MC KELLY, chữ 26 px, tối đa 3 dòng. Bảng tên MC và vùng ghế không giao nhau.
- Victory: Top 1 ngồi ngai nổi bật hơn Top 2/Top 3; cả ba bảng tên, điểm và vương miện nằm trong biên an toàn, không bị cắt.

### Kiểm tra

- `corepack pnpm typecheck` — thoát 0.
- `corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts` — **3 passed** với asset thật.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; $env:PLAYWRIGHT_SERVER_PORT='18798'; $env:PLAYWRIGHT_OVERLAY_PORT='15177'; corepack pnpm exec playwright test tests/e2e/c0339-throne-ui.spec.ts` — **3 passed** với placeholder.
- `git diff --check` — thoát 0.

### Ảnh để duyệt

Bảy ảnh ghép `ref | bản dựng` (ảnh ref B được lặp lại để đối chiếu vị trí B; trạng thái từng cảnh nằm ở ảnh dựng bên phải):

- `tests/e2e/__screenshots__/c0339-review/ref-vs-throne-locked.png`
- `tests/e2e/__screenshots__/c0339-review/ref-vs-throne-locked-question.png`
- `tests/e2e/__screenshots__/c0339-review/ref-vs-throne-held.png`
- `tests/e2e/__screenshots__/c0339-review/ref-vs-throne-change.png`
- `tests/e2e/__screenshots__/c0339-review/ref-vs-throne-empty.png`
- `tests/e2e/__screenshots__/c0339-review/ref-vs-throne-tie-top10.png`
- `tests/e2e/__screenshots__/c0339-review/ref-vs-throne-tie-victory.png`

Ảnh dựng thật 1080×1920 và detail crop ngai/bục nằm cùng thư mục với tên `throne-<scene>-1080x1920.png` và `throne-<scene>-detail.png`.

Nhờ coordinator rà ảnh mới theo C-0348/C-0339. C-0339 vẫn chờ duyệt hình; chưa đánh dấu VISUAL_APPROVED, chưa gộp main.
