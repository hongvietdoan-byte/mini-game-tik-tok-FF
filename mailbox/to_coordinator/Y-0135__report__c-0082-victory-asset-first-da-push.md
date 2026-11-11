---
id: Y-0135
from: codex2
to: coordinator
type: report
title: C-0082 Victory: asset-first đã push
ref: C-0082
priority: normal
needs: 
created: 2026-11-11T23:31:12+07:00
---
## Mốc C-0082 — Victory (tách báo cáo theo C-0087)

- Nhánh: `codex2/c0068-victory-ref`
- Commit đã push: `b55fd4b` — `feat(overlay): dựng Victory theo asset ref`
- Preview HMR đang mở: `http://127.0.0.1:5181/?mock=victory`

### Đã làm

- Thay cúp/sân khấu/bão vẽ tay bằng `/assets/victory/trophy-stage.png` và `/assets/victory/bg.jpg`; bỏ các lớp SVG cúp, tia sét, khán đài và bục vẽ CSS cũ.
- Bố trí logo, trophy-stage, ba chibi toàn thân, bảng tên hạng 2/1/3, confetti, phản chiếu sàn và Kelly celebration theo mốc 1080×1920 của C-0082. Chibi hiển thị ở kích thước gần nguồn (không quá 2×).
- Sửa mock hòa để mỗi bảng tên có một người chơi riêng, tránh lặp hai tên ở cả hai slot.
- Safe-zone E2E cho phép lớp sân khấu và bảng tên đi sát mép theo ref; vẫn kiểm tra vùng HUD thực tế không giao với bảng tên.

### Bằng chứng

- `corepack pnpm --filter @quiz/overlay build` → đạt, 49 modules.
- `corepack pnpm typecheck` → đạt.
- `corepack pnpm test:unit` → đạt, 23 files / 187 tests.
- `PLAYWRIGHT_OVERLAY_PORT=5182 corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --grep "mock scene: victory|mock scene: victory-tie|victory-tie labels|Victory matches the approved"` → đạt, 4 tests; cấu hình Playwright dùng `msedge`.
- `PLAYWRIGHT_OVERLAY_PORT=5183 corepack pnpm exec playwright test tests/e2e/safe-zone.test.ts --grep "TikTok safe-zone: VICTORY"` → đạt, 1 test.
- Ảnh E2E chụp ở 1080×1920 sau khi chờ animation 8,1 giây:
  - `test-results/c0082-victory/victory.png`
  - `test-results/c0082-victory/victory-tie.png`
  - Ảnh ghép `ref | Victory | Victory tie`: `test-results/c0082-victory/victory-reference-comparison.png`

### Điểm còn lệch so với `assets-local/ref/victory-ref.png`

1. Ảnh logo BVĐC hiện có không chứa dòng chữ FREE FIRE phía trên như ref; C-0082 không chỉ định asset logo riêng.
2. `bg.jpg` được yêu cầu dùng nguyên trạng, nhưng phân bố mây/sét và tông sáng khác ảnh ghép ref.
3. Bộ chibi hiển thị theo `characterId` trong snapshot/runtime nên ngoại hình và pose khác ba nhân vật trong ảnh ref; tăng kích thước thêm sẽ vượt mốc 19–21% hoặc làm ảnh nguồn mờ hơn.
4. Kelly celebration ở góc trái dưới được giữ theo C-0080; ảnh `victory-ref.png` không có nhân vật MC này.
5. Bảng tên dựng bằng CSS nên ít chi tiết phản sáng hơn bảng tên trong ảnh ghép ref.

C-0082 đã hoàn tất. C-0080 vẫn đang mở: xử lý state `READING` theo C-0087 và hoàn thiện bộ ảnh ghép các scene còn lại trước báo cáo toàn lô.
