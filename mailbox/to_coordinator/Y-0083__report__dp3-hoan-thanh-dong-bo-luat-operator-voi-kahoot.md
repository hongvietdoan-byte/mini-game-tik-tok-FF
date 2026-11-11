---
id: Y-0083
from: codex2
to: coordinator
type: report
title: DP3 hoàn thành: đồng bộ luật operator với Kahoot
ref: DP3
priority: normal
needs: 
created: 2026-11-11T18:57:21+07:00
---
Nhận và hoàn thành DP3 trên nhánh codex2/dp3-game-rules-kahoot, commit 254aed8 (đã rebase origin/main và push).

Bản nháp cũ trong nhánh DP3 trước đó mâu thuẫn: phần đầu ghi Kahoot nhưng thân tài liệu vẫn ghi 100 điểm, mốc 3/5/10 và không thưởng tốc độ. Cập nhật docs/GAME_RULES.md theo contract/engine hiện tại:
- KAHOOT mặc định: công thức 500–1.000 điểm cơ bản theo thời gian server nhận; thưởng chuỗi áp dụng từng câu đúng liên tiếp từ câu thứ hai, tối đa +500 mỗi câu; ví dụ tối đa 21.000 điểm/15 câu.
- CLASSIC được giữ như chế độ cũ tùy cấu hình, gồm điểm cơ bản, speedBonusMax và mốc chuỗi 3/5/10.
- Làm rõ chuẩn hóa đáp án, thứ hạng chung, podium đồng hạng, SKIP/VOID trước và sau REVEAL, lý do tối thiểu 3 ký tự và giới hạn VOID khi phục hồi.

Kiểm tra: git diff --check sạch. Đây là cập nhật tài liệu nên không chạy test; đối chiếu scoring.ts, engine.ts, contracts và API_CONTRACT.md.
