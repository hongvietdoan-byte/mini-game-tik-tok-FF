---
id: Y-0549
from: codex2
to: coordinator
type: report
title: C-0319 sửa theo sàn 24px, đã push
ref: C-0319
priority: high
needs: 
created: 2026-11-19T16:35:16+07:00
---
# C-0319 — HUD tall theo ảnh live iPhone

## Kết quả

- Thêm preset `?hud=tall`; `?hud=1` giữ nguyên layout cũ. Thông số HUD tall được đo đúng theo khung 1080×1920: host x29–551/y−61–27; viewers x774–1055/y−49–15; pill cấp x29–340/y45–97; pill phòng x815–1050/y42–103; bình luận x29–657/y1407–1806; banner tham gia x29–520/y1851–1903.
- Theo trả lời C-0326, 15 ghế dưới bên trái bị comment che là hành vi TikTok dự kiến; giữ nguyên layout game. Các khung câu hỏi, Top 10, timer, MC và nameplate không bị che.
- Sàn cỡ chữ câu hỏi là 24px. CSS không còn khởi tạo `.is-xlong` dưới 24px; bộ đo không co dưới sàn, hiển thị tối đa 4 dòng và cắt bằng `…` khi không vừa. `question-longest` và `reading-longest` đều hiển thị 3 dòng ở 24px, dòng cuối kết thúc `…`, khoảng trống dưới dòng cuối 19.56px.
- Trong ngân hàng demo TypeScript hiện có (`fixtures/questions.ts`), hai prompt vượt 160 ký tự và dùng lớp `.is-xlong` là `demo-001` (216 ký tự, 3 dòng ở 24px) và `demo-023` (200 ký tự, 3 dòng ở 24px). Cả hai bị cắt; dòng thứ ba hiện chỉ còn `…`, nên cần chuyển C-0310 để rút gọn. Không đọc workbook `.xlsx` đầu vào theo giới hạn an toàn, nên danh sách này chỉ khẳng định cho fixture demo đã kiểm tra.

## Ảnh

`hud-tall-question.png` là ảnh kiểm tra 1080×1920. Input gốc trong `assets-local/review/live-thuc-te/` không được sửa hoặc commit.

## Kiểm tra

- `PLAYWRIGHT_SERVER_PORT=18788 PLAYWRIGHT_OVERLAY_PORT=15177 corepack pnpm exec playwright test tests/e2e/c0319-hud-tall.spec.ts` — **4 passed** sau khi áp dụng sàn 24px.
- `corepack pnpm typecheck` — **exit 0**.
- `PLAYWRIGHT_SERVER_PORT=18788 PLAYWRIGHT_OVERLAY_PORT=15177 corepack pnpm exec playwright test tests/e2e/c0319-hud-tall.spec.ts tests/e2e/safe-zone.test.ts tests/e2e/overlay.spec.ts --grep 'C-0319|TikTok safe-zone|C-0279 keeps the approved fixed question frame' --workers=1` — **15 passed**.
- `corepack pnpm typecheck` — **exit 0**.
- `git diff --check` — **pass**.
