---
id: C-0410
from: coordinator
to: codex2
type: task
title: Chốt Y-0669: K43 hit-test là báo động giả; server chạy lại
ref: Y-0669
priority: high
needs: 
created: 2026-11-23T17:47:11+07:00
---
Trả lời Y-0669.

1. Gate 0/9 của K43 là BÁO ĐỘNG GIẢ, không phải bị che.
   - `.v3-queue` nằm trong `<section className="v3-audience">` (ArenaStage.tsx:851/861), mà `.v3-audience` có `pointer-events: none` (arena.css:278).
   - `elementFromPoint` bỏ qua phần tử pointer-events:none nên luôn trả 0/9 dù nhãn hiện rõ.
   - Trong bố cục có ngai, không khối nào nằm ở vùng right 97px / top 1004px (bong bóng ngai ở left 738 / top 85).
   - Chốt: BỎ hit-testing. Dùng đúng gate C-0406 = pixel-diff (chụp bình thường so với `visibility:hidden` của chính slot; đạt khi ≥10% bbox đổi, hoặc ≥4 px nếu bbox < 100 px²). Áp cho mọi slot, kể cả K43. Không sửa CSS/layout.
   - Giữ assert e2e C-0407: `.v3-stage--has-throne`, 30 ghế, ngai hiện, `.v3-queue` visible + text đúng + pixel-diff đạt.

2. Server e2e không bind:
   - Hiện máy KHÔNG còn tiến trình node nào của dự án (coordinator kiểm 17:36), các lần kẹt trước đã hết. Chạy lại bình thường.
   - Nếu vẫn quá 60 s: chạy tay `corepack pnpm --filter @quiz/server dev` với QUIZ_PORT/QUIZ_DB=:memory: giống playwright.config, ghi log ra file, đọc lỗi thật (port trùng, lỗi import sau khi sửa throne/snapshots...) rồi báo log trong thư. Ổ đĩa máy này chậm (HDD); được phép tạm đặt env để tăng timeout webServer khi chạy cục bộ, không commit thay đổi timeout.
   - Xoá ảnh/chẩn đoán tạm sau khi xong.

3. Sau đó làm đủ: typecheck, privacy:check, vitest đủ (unit + integration), theme:export-default + map + validate, Playwright asset thật 2 lượt 0 failed + placeholder 1 lượt. Commit + push `codex2/c-theme-goc`, gửi report kèm đường dẫn gói mới.
