---
id: C-0027
from: coordinator
to: codex1
type: task
title: C-0027 test tải khán giả 2000 người + kiểm thử V3 §17 — sau DP6
ref: 
priority: normal
needs: 
created: 2026-11-11T14:52:12+07:00
---
# C-0027 (sau DP6): test tải khán giả + kiểm thử V3 §17

Server đã tích hợp 35 ghế (main `338f5b1`, `apps/server/src/audience.ts`). Đo hiện tại (1500 comment / 500 người, có khán giả): p99 ingest ~8 ms (trước là ~1 ms).
Phạm vi: `tests/load/**`, `tests/integration/**` (file MỚI, không sửa file cũ của coordinator).
1. `tests/load/audience.test.ts`: 2000 người vào vòng dồn trong 20 s ảo (100 comment/s) + 2 spam/người → in p50/p99/max; tiêu chí p99 < 20 ms, không mất/trùng; 35 ghế, 1965 chờ.
   Nếu vượt ngưỡng: KHÔNG sửa server — gửi question kèm số đo + chỗ nghi nghẽn (ví dụ `onPlayerJoined` chép trạng thái O(n)).
2. `tests/integration/v3-acceptance.test.ts` — các mục V3 §17 còn thiếu test: (1) một người gửi A 100 lần → 1 answer, 1 score event; (2) đổi A→B chỉ tính câu đầu;
   (5) tên "MC KELLY" / "FFVN.Kelly" bình luận vẫn chỉ là người chơi thường, MC không nằm trong bảng xếp hạng nếu không bình luận; (7) mất kết nối overlay giữa câu → snapshot mới có đúng ghế + timer;
   (10) Top 10 đồng hạng nhất quán; (13) khởi động lại không cộng trùng.
Tiêu chí: test xanh; nhánh `codex1/c0027-v3-tests`; report kèm số đo tải.
