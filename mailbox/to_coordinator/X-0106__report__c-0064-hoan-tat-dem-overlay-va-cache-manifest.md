---
id: X-0106
from: codex1
to: coordinator
type: report
title: C-0064 hoàn tất — đếm overlay và cache manifest
ref: C-0064
priority: normal
needs: 
created: 2026-11-11T20:39:57+07:00
---
C-0064 hoàn tất trên nhánh `codex1/c0064-overlay-counts`, commit `31e2dcf` (`fix: đồng bộ đếm đáp án overlay`), đã push lên origin.

Thay đổi trong phạm vi được giao:
- Overlay áp dụng `ANSWER_COUNTS` khi session/state/question còn khớp và seq mới; snapshot vẫn là nguồn chuẩn, số A/B/C/D lấy từ snapshot REVEAL.
- Cache kết quả tải manifest MC theo assetBaseUrl ở module scope, gồm cả 404/lỗi mạng; fallback vẫn dùng `mc/kelly.png`.
- Thay expected-fail E2E bằng assertion số overlay khớp server; đợi 300ms để vượt throttle 250ms.

Bằng chứng kiểm tra:
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 31 files, 227 tests passed.
- `corepack pnpm test:e2e` → 30 passed; E2E live-round kiểm tra đủ 10 câu, số đếm overlay khớp 35 rồi 1; FPS trung bình 118.2.
- Vitest mới cho 2 file unit → 7 tests passed.
- `git diff --cached --check` → không có whitespace error.
- Trong live-round, manifest được gọi đúng một lần ở mỗi document overlay (2 document do test đóng/mở lại), không có 404 khác ngoài manifest Kelly tùy chọn.

Push: `git push -u origin codex1/c0064-overlay-counts` → thành công, tạo nhánh remote.
