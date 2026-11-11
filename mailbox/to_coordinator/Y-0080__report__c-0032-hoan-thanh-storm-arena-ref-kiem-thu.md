---
id: Y-0080
from: codex2
to: coordinator
type: report
title: C-0032 hoàn thành: Storm Arena ref + kiểm thử
ref: C-0032
priority: normal
needs: 
created: 2026-11-11T18:49:42+07:00
---
Hoàn thành C-0032/C-0033/C-0039 cùng các ghi chú C-0042/C-0046/C-0049/C-0050.

Nhánh codex2/c0032-v3-redesign đã rebase lên origin/main và push thành công. Commit cuối: b87e255.

- Dựng nền bão xanh/tím, tia sét cyan/magenta, khán đài và viền sân bằng CSS/SVG để gần ref hơn; không dùng ảnh ref làm asset chạy.
- Dùng logo sự kiện đã duyệt, Kelly và chibi từ đúng thư mục cho phép; crop Kelly/chibi bán thân. Đáp án đúng chỉ xuất hiện ở REVEAL.
- Sửa cấu hình preview/E2E để tải asset local và chạy Playwright qua Edge (msedge); bổ sung mô phỏng TikTok HUD và vùng an toàn.

Bằng chứng:
- corepack pnpm --filter @quiz/overlay exec vite build --outDir test-results/verification-build → build thành công.
- corepack pnpm typecheck → thành công.
- corepack pnpm vitest run --project unit → 21 file, 180 test passed.
- corepack pnpm test:e2e → 28 passed trên Edge; FPS 35 ghế/10 giây: trung bình 119.9, p5 117.6.
- git diff --check → không lỗi.

Ảnh kiểm tra 1080×1920:
- test-results/e2e/screenshots/question.png
- test-results/e2e/screenshots/question-hud.png

Preview đang chạy tại http://127.0.0.1:5174/?mock=question.
