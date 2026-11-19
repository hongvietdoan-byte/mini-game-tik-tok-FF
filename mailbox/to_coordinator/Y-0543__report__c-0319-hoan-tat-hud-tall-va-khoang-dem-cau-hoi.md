---
id: Y-0543
from: codex2
to: coordinator
type: report
title: C-0319 hoàn tất: HUD tall và khoảng đệm câu hỏi
ref: C-0319
priority: normal
needs: 
created: 2026-11-19T16:13:49+07:00
---
# C-0319 — HUD tall theo ảnh live iPhone

## Kết quả

- Thêm preset `?hud=tall`; `?hud=1` giữ nguyên layout cũ. Thông số HUD tall được đo đúng theo khung 1080×1920: host x29–551/y−61–27; viewers x774–1055/y−49–15; pill cấp x29–340/y45–97; pill phòng x815–1050/y42–103; bình luận x29–657/y1407–1806; banner tham gia x29–520/y1851–1903.
- Rule 11 chạy cùng `hud=tall`. Các khung câu hỏi, Top 10, timer, MC và nameplate không bị che.
- Sai khác cần lưu ý so với dự kiến ban đầu: pill cấp **không giao logo** (logo đang x400–655/y30–240, pill x29–340/y45–97); khung bình luận giao 15 ghế phía dưới, các hàng `data-row-index` 0–4 và cột 1–3. Vì thế ảnh game thực tế sẽ mất nhiều ghế hơn dự kiến “hàng 1–2/cột 1–2”. Không dịch game layout để ép kết quả; cần coordinator chốt nếu muốn thay vùng HUD đã cho.
- Câu hỏi mock được đổi để tái hiện dòng cuối `Battle Royale?`. Lỗi clamp cũ dùng sàn 26px dù CSS đặt chữ dài nhỏ hơn; 3 dòng ở 26px chỉ còn 15.45px mép dưới và bị cắt. Clamp giờ cho tối đa 4 dòng, giảm tới 19px, giữ đầy đủ prompt và đạt khoảng cách đáy 17.73px cho cả `question-longest` và `reading-longest`.

## Ảnh

`hud-tall-question.png` là ảnh kiểm tra 1080×1920. Input gốc trong `assets-local/review/live-thuc-te/` không được sửa hoặc commit.

## Kiểm tra

- `PLAYWRIGHT_SERVER_PORT=18788 PLAYWRIGHT_OVERLAY_PORT=15177 corepack pnpm exec playwright test tests/e2e/c0319-hud-tall.spec.ts tests/e2e/safe-zone.test.ts tests/e2e/overlay.spec.ts --grep 'C-0319|TikTok safe-zone|C-0279 keeps the approved fixed question frame' --workers=1` — **14 passed**.
- `corepack pnpm typecheck` — **exit 0**.
- `git diff --check` — **pass**.
