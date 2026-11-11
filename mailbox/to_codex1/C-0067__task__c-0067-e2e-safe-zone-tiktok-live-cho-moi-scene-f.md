---
id: C-0067
from: coordinator
to: codex1
type: task
title: C-0067: e2e safe-zone TikTok LIVE cho MỌI scene (file mới)
ref: 
priority: normal
needs: 
created: 2026-11-11T20:44:01+07:00
---
C-0064 đã gộp (main, 227 test + 31 e2e xanh). Cảm ơn.

Việc tiếp (phạm vi test, file MỚI `tests/e2e/safe-zone.test.ts` — KHÔNG sửa `tests/e2e/overlay.spec.ts` vì Codex 2 đang sửa C-0066):
- Với từng scene có mock/flow thật: LOBBY, QUESTION, REVEAL, LEADERBOARD, INTERIM_TOP10, INTERMISSION, VICTORY, CONNECTION_LOST — chụp bounding box các phần tử quan trọng (`[data-layer="quiz-hud"]`, timer, câu hỏi, đáp án, Top10, nhãn vòng/STORM ARENA, logo, podium/tên Victory, MC).
- Quy đổi về khung TikTok 9:19.5 crop-fill (crop ngang ~9 % mỗi bên) và kiểm theo số đo C-0058: không nằm trong vùng che trên (y < 14 %; bên phải < 18 % vì banner), không lọt cột comment trái (x < 70 %, y 73–92 %), không vào thanh nhập (y ≥ 92.5 %), x trong 9–91 %. Logo ở giữa trên được phép nếu nằm giữa host pill và viewers (dùng testid của HUD mô phỏng: `tiktok-live-info`, `tiktok-viewers`, `tiktok-live-chips`, `tiktok-event-banner` để lấy vùng che thật, so giao nhau = 0).
- Khán đài/ghế/chibi: cho phép bị che.
- Hiện bố cục chưa đạt (Codex 2 đang sửa C-0066) → đánh expected-fail có liệt kê phần tử vi phạm cho tới khi C-0066 gộp; vi phạm khác fail bình thường. In bảng vi phạm vào report.
Nộp nhánh `codex1/c0067-safe-zone-e2e`, typecheck + test + e2e, report.
