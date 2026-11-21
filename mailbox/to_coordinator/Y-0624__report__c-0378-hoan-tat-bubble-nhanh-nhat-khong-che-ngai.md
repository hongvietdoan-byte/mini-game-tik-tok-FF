---
id: Y-0624
from: codex2
to: coordinator
type: report
title: C-0378 hoàn tất: bubble NHANH NHẤT không che ngai
ref: C-0378
priority: high
needs: 
created: 2026-11-21T08:34:03+07:00
---
C-0378 hoàn tất, đã push nhánh `codex2/c-nhanh-nhat-bubble`. Commit sửa code: `bc57c377`; nhánh đã gộp `origin/main` mới nhất (`5a74630d`) qua merge `e48b1d42` trước khi push.

**Kết quả layout thật (1080×1920):** cả 12 trường hợp (ngai trống/có người × tên 1/12/24 grapheme × REVEAL/LEADERBOARD) giữ bubble `x=740, y=845, w=258, h=154` (mép phải 998, đáy 999). Với ngai trống, art alpha `x=372..708, y=837..1177`, gap bubble–art 32 px, bubble–nhãn 24 px (`NGAI VÀNG` bắt đầu y=1023). Với ngai có người, art alpha `x=371.5..708.5, y=836.5..1177.5`, gap 31.5 px, bubble–nhãn 16 px (nhãn bắt đầu y=1015). Padding 8 px mỗi cạnh; kiểm tra scroll/client width và height đều không tràn. Tên 1 grapheme dùng 34 px; tên 12 grapheme 28 px trên một dòng; tên 24 grapheme 27 px trên hai dòng. Theme Georgia dùng 24 px, hai dòng, vẫn vừa. Ca không có người trả lời đúng giữ nguyên chính xác bbox của bubble ở QUESTION.

**Kiểm tra cuối:**
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm privacy:check` — PASS (1.451 tệp theo dõi).
- `corepack pnpm test` — PASS lần chạy cuối: 97 file, 644/644 test. Một lượt trước có race đơn lẻ `mc-chat` (`GENERATING`/`QUEUED`); test mục tiêu chạy riêng PASS và chạy lại toàn bộ PASS.
- `corepack pnpm exec playwright test` (asset thật) — PASS, 157/157, 0 failed.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm exec playwright test` — PASS, 156 passed, 1 skipped, 0 failed (C-0062 được skip trong chế độ placeholder).
- `git diff --check` — PASS.

Các mock riêng cho C-0378 vẫn mở được bằng URL, nhưng đã loại khỏi vòng `mock=cycle`; nhờ đó bộ asset placeholder không tạo 404 `ngai-trong.png` cho test chu kỳ audio hiện hữu.

Ảnh review (không commit):
- `E:\Ai\2026\Trend mini game tiktok\assets-local\review\c-0378\reveal-empty-name24-1080x1920.png`
- `E:\Ai\2026\Trend mini game tiktok\assets-local\review\reveal-held-name24-1080x1920.png`
- `E:\Ai\2026\Trend mini game tiktok\assets-local\review\c-0378\leaderboard-empty-name24-1080x1920.png`
- `E:\Ai\2026\Trend mini game tiktok\assets-local\review\c-0378\leaderboard-held-name24-1080x1920.png`

Ảnh được lưu local để coordinator/user duyệt hình; chưa đánh dấu là duyệt hình.
