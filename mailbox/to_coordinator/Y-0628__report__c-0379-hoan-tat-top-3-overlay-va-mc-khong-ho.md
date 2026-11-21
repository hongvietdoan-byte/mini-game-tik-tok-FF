---
id: Y-0628
from: codex2
to: coordinator
type: report
title: C-0379 hoàn tất: Top 3 overlay và MC không hở
ref: C-0379
priority: normal
needs: 
created: 2026-11-21T14:06:38+07:00
---
C-0379 hoàn tất trên nhánh codex2/c-nhanh-nhat-bubble.

## Mã nguồn
- Đã merge origin/main mới nhất trước bàn giao: origin/main 37d26713, merge commit 1bc61470.
- Commit task: 0d66c900 feat(overlay): render question top 3 in MC bubble.
- Top 3 dùng đúng vùng MC x=740..998, bubble cao 168 px; questionTop3 chỉ dùng trong REVEAL/LEADERBOARD đúng questionInstanceId, trường hợp server cũ vẫn dùng fastestCorrectAnswer.
- MC sửa CSS đơn giản: vùng ảnh 210 px ở QUESTION/REVEAL/LEADERBOARD, 218 px ở LOBBY; ảnh bỏ giới hạn max-height ở các cảnh này; giữ nguyên vị trí mặt và bảng tên, ảnh z-index 0, bảng tên z-index 1.

## Đo bbox bằng Playwright (asset thật 1080×1920)
Mọi ca có bubble x=740..998, y=825..993 (258×168); đáp án kết thúc y=798 nên cách bubble 27 px. Tên bảng ngai nằm phía dưới bubble:
- Reveal, ngai trống, tên ngắn: art ngai x=372..708/y=837..1177; gap bubble-ngai 32 px; gap bubble-title 30 px.
- Reveal, ngai trống, 24 grapheme: cùng bbox/gap như trên.
- Reveal, ngai trống, đồng hạng +X: cùng bbox/gap; 3 dòng hạng 1 và “+3 người đồng hạng”.
- Reveal, ngai trống, 0 người: cùng bbox/gap; hiện “Chưa có người trả lời đúng”.
- Reveal, ngai có người, 1 người: art x=371.5..708.5/y=836.5..1177.5; gap ngai 31.5 px; gap title 22 px.
- Leaderboard, ngai có người, 2 người: cùng bbox/gap trên; hiện đúng 2 dòng.
- Leaderboard, ngai có người, 3 người ngắn: cùng bbox/gap trên; hiện đúng 3 dòng.
- Viền trong 8 px. Tên 1 grapheme: 20 px/1 dòng; tên 9–10 grapheme: 20 px/1 dòng; 12 grapheme: 19 px/1 dòng; tên 24 grapheme: 15 px/2 dòng. Cỡ chữ giây tabular, căn phải.

MC thật (kelly.png 273×640): đo 11 mẫu/scene ở LOBBY, QUESTION, REVEAL, LEADERBOARD; overlap nhỏ nhất lần lượt 12 px, 23 px, 23 px, 23 px. Độ lệch đỉnh ảnh qua các mẫu 0 px; z-index ảnh 0 < bảng tên 1. Theme font thay thế, câu bị huỷ, fallback server cũ cũng được E2E kiểm tra.

Ảnh review (đủ 8 cảnh, mỗi cảnh full + zoom; không commit): assets-local/review/c-0379/ gồm reveal 0/1/3 tên ngắn/3 tên 24 grapheme/đồng hạng +3 và leaderboard 2/3 người cùng ảnh MC zoom.

## Kiểm tra
- corepack pnpm typecheck — PASS.
- corepack pnpm privacy:check — PASS (1458 tệp theo dõi).
- corepack pnpm exec vitest run --project unit --project integration --maxWorkers=2 --minWorkers=2 — PASS, 98 files / 650 tests.
- corepack pnpm exec playwright test tests/e2e/c0379-top3-throne-and-mc.spec.ts --reporter=line — PASS, 11 tests.
- corepack pnpm exec playwright test --reporter=line (asset thật) — PASS, 168 tests.
- $env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm exec playwright test --reporter=line — PASS, 167 passed / 1 skipped (C-0062 chỉ chạy với asset thật).
- git diff --check — PASS.

Lưu ý kiểm thử: 2 lần chạy corepack pnpm test mặc định đều gặp cùng 1 race ngoài phạm vi sửa ở apps/server/src/voice/mc-chat.test.ts (trông đợi QUEUED, nhận GENERATING); chạy riêng file đó được 6/6, và toàn bộ 650 test được chạy sạch với 2 worker, không bật retry.
