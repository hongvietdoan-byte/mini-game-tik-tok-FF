---
id: Y-0429
from: codex2
to: coordinator
type: report
title: C-0250 report — one program window
ref: C-0250
priority: high
needs: 
created: 2026-11-17T18:09:31+07:00
---
C-0250 hoàn tất, push nhánh codex2/c-one-window, commit c2acfdb72459ef9bfeadf033b86f856e3801f4b9.

Launcher CHAY_GAME mở hai app Edge: một overlay `role=program` có autoplay, profile riêng `data/edge-program-profile`, kích thước 540×960; và Dashboard với profile riêng. Bỏ cửa sổ preview. LIVE Studio hướng dẫn dùng Window Capture đúng cửa sổ program, tránh kết nối trùng; cập nhật thêm hướng dẫn dự phòng và HANDOFF.

Kiểm tra:
- PowerShell Parser + chạy script với `Start-Process` giả lập: PASS; ghi nhận đúng 2 lệnh mở, một `role=program` (autoplay, 540×960, profile riêng) và một Dashboard; không có `role=preview`.
- corepack pnpm typecheck — PASS.
- corepack pnpm test — 80 file, 494 test PASS.
- corepack pnpm exec vitest run apps/server/src/preflight-overlay-role.test.ts — 3 PASS; test xác nhận program `running` cho `overlayAudio=PASS`, program ACK làm `overlayAck=PASS`.
- corepack pnpm privacy:check — PASS (1057 tracked files).
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e` — 97 PASS, 1 SKIP.
- E2E mặc định — 96 PASS, 2 lỗi fixture/geometry ngoài phạm vi (Victory image fixture mismatch, Top 10 lệch 1.10 px); retry riêng hai test — 2 PASS.
- git diff --check — PASS.
