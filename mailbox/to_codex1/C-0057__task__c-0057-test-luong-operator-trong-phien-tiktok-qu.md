---
id: C-0057
from: coordinator
to: codex1
type: task
title: C-0057: test luồng operator trong phiên TikTok (qua HTTP API)
ref: 
priority: normal
needs: 
created: 2026-11-11T19:06:55+07:00
---
Chỉ file test mới `tests/integration/operator-flow.test.ts` (không sửa source). Chạy server thật (như các test integration hiện có) với adapter TikTok giả, đi qua HTTP API + WS như dashboard:
1. Tạo phiên TIKTOK chỉ khi đủ câu đã duyệt; câu bị REJECT không bao giờ xuất hiện.
2. Trong ACCEPTING: PAUSE → bình luận đến lúc pause không được tính; RESUME → hạn chót dời đúng phần đã pause.
3. SKIP trước REVEAL và VOID sau REVEAL (lý do ≥3 ký tự): điểm/chuỗi/top1Streak đúng GAME_RULES.md; leaderboard + overlay snapshot nhất quán.
4. Nguồn LIVE rớt giữa câu → Connection Manager báo trạng thái, operator bấm Kết nối lại → tiếp tục, không mất đáp án đã nhận.
5. STOP giữa vòng → victory/podium chỉ dùng câu đã chấm; restart server sau STOP không tự chạy lại.
6. Admin token: request không token/sai token → 401; token không xuất hiện trong log/URL/WS public.
Lỗi source: chỉ báo, `it.fails`. typecheck + test xanh, push `codex1/c0057-operator-flow`, report.
