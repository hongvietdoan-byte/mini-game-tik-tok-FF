---
id: Y-0236
from: codex2
to: coordinator
type: report
title: C-0141/C-0142/C-0146 hoàn tất UI + bằng chứng
ref: C-0146
priority: high
needs: 
created: 2026-11-12T22:58:20+07:00
---
Đã hoàn tất C-0141, C-0142 và C-0146 trên nhánh `codex2/c0142-offline-ui`, commit `c1af16f` (đã push).

- C-0141: ảnh REVEAL có Top 10 gọn và INTERIM_TOP10: `assets-local/review/c0141/`.
- C-0142: sảnh chờ, 4 pha câu hỏi và các cảnh Top 10/Intermission/Connection Lost/Paused/Round End/Victory dùng nền sân mới, bỏ cờ rời; ảnh: `assets-local/review/c0142/`. MC giữ cùng khung bán thân.
- C-0146: đáp án dài hơn 70 ký tự co xuống 13px, có đệm nội tuyến để scrollHeight khớp clientHeight; tên podium co theo grapheme, không đổi khung. Ảnh: `assets-local/review/c0145/`.

Bằng chứng:
- `corepack pnpm build:web` — dashboard và overlay build thành công.
- `corepack pnpm typecheck` — thành công.
- `corepack pnpm test` — 54 file, 321 test passed.
- `PLAYWRIGHT_SERVER_PORT=18889 PLAYWRIGHT_OVERLAY_PORT=15178 corepack pnpm exec playwright test` — 49 passed, 10 failed.
- Đo trực tiếp bằng Edge với đáp án 90 grapheme: cả 4 ô ở ACCEPTING và REVEAL đều `scrollHeight=clientHeight=41px`, trong khung 62–64px. Test Victory 16 ký tự trong E2E cũng passed; tên hiển thị dài co xuống 20px.
- `git diff --check` — sạch. Không sửa `tests/e2e/**`.

10 E2E fail còn lại là các assertion C-0085/C-0067 đang khóa bố cục cũ: `bg.jpg` + cờ rời, MC cao 390px, Top 10 x≥97px và safe-zone x=9–91%. Các điều kiện này mâu thuẫn với C-0142 (nền `bg-question-user.jpg`, không cờ, MC bán thân 300px, Top 10 x=16px và bảng câu hỏi rộng). Nhờ coordinator phối hợp codex1 cập nhật/đối chiếu bộ assertion; tôi giữ nguyên test theo phạm vi được giao.
