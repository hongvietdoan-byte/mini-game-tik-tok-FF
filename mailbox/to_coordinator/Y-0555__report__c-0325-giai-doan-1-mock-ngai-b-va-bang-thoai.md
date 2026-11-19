---
id: Y-0555
from: codex2
to: coordinator
type: report
title: C-0325 giai đoạn 1: mock ngai B và bảng thoại
ref: C-0325
priority: high
needs: 
created: 2026-11-19T18:32:25+07:00
---
# C-0325 — Giai đoạn 1: mock ngai vàng phương án B

Đã hoàn thành bộ **mock-only** để coordinator duyệt; không sửa runtime sản phẩm. 13 ảnh full 1080×1920 đều dùng `hud=1`, `role=program`. Bảng rà thoại 26 nguồn/biến thể và số đo bbox đầy đủ đi kèm trong `c0325-throne-bubble-inventory.md` và `c0325-throne-bubble-measurements.json`.

## Kết quả hình học

- Crop ngai thực tế: x=372–706, y=837–1176; xác định bằng alpha pixel của ảnh ngai, không lấy bbox container.
- Bóng MC: x=738, y=845, rộng 262px; nhãn 14px; nội dung 26px, tối đa 3 dòng. Khoảng hở ngai–bóng tối thiểu 24px, đo được 27px.
- Cột Top 1 nằm dưới bóng, cách tối thiểu 16px và đáy không quá y=1176. Tên dài `Nguyễn Bảo Minh Tường Vi` vẫn trong 2 dòng, cột kết thúc ở y=1145. Cảnh không bóng căn cột giữa vùng ngai.
- Ảnh MC thật được đo theo pixel alpha hiển thị; khoảng hở nhỏ nhất tới mỗi khung Top10/câu hỏi/bóng/tên ghế đều trên 16px. Bảng Top10 mock được thu/đẩy lên để giữ khoảng cách mà không thay bố cục sản phẩm.
- Rà 26 dòng gồm `mcFor`, `bubbleText`, `lobbyMessage`, fallback `ArenaStage`/`AuxiliaryStages`, audio-only cues và preset chat. Mỗi chuỗi hiển thị có số dòng, dòng dài nhất, kiểm tra ngắt xấu và đề xuất. Bản nhắc luật đề xuất rút xuống `1 đáp án/người. / Lượt đầu tính!`; voice-only giữ nguyên. `SPAM_REMINDER_TEXT` đang dùng chung cho voice và bubble nên nếu câu hiển thị được duyệt, phải tách `bubbleText` riêng, giữ nguyên TTS/cache. Chat vận hành được kiểm tra ở giới hạn 120 ký tự: mock co chữ về 22px, tối đa 3 dòng rồi cắt `…`.

## Ảnh full B

Tất cả file ở thư mục này; tên file ghi rõ cảnh, `hud=1`, độ phân giải 1080×1920:

- `lobby-hud-1-1080x1920.png`
- `prepare-hud-1-1080x1920.png`
- `reading-hud-1-1080x1920.png`
- `accepting-hud-1-1080x1920.png`
- `accepting-t-n-d-i-hud-1-1080x1920.png` — tên Top 1 dài
- `reveal-hud-1-1080x1920.png`
- `leaderboard-hud-1-1080x1920.png`
- `round-winner-kh-ng-b-ng-hud-1-1080x1920.png` — không bóng
- `victory-hud-1-1080x1920.png`
- `intermission-hud-1-1080x1920.png`
- `paused-hud-1-1080x1920.png`
- `connection-lost-hud-1-1080x1920.png`
- `operator-chat-120-hud-1-1080x1920.png`

## Kiểm tra

- `PLAYWRIGHT_SERVER_PORT=18790 PLAYWRIGHT_OVERLAY_PORT=15179 corepack pnpm exec playwright test tests/e2e/c0325-throne-b-samples.spec.ts --workers=1` → **1 passed**; sinh 13 ảnh và kiểm tra bbox, pixel alpha, khoảng hở, dòng dài/ngắt, cỡ chữ và 3 dòng tối đa.
- `corepack pnpm typecheck` → **exit 0**.
- Rà whitespace bằng PowerShell → `No trailing whitespace.`; `git diff --cached --check` sẽ xác nhận lại sau khi stage.

## Thay đổi mã nguồn

- Chỉ thêm `tests/e2e/c0325-throne-b-samples.spec.ts` trên nhánh `codex2/c-0325-throne-b`; đây là test tạo mock review, không thay đổi layout runtime.
- Ảnh và bảng đo là review artifacts bị ignore, không commit.

Đề nghị coordinator duyệt bộ ảnh/bảng trước khi có bất kỳ thay đổi UI sản phẩm nào.
