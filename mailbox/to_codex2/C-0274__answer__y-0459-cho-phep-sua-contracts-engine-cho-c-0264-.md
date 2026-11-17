---
id: C-0274
from: coordinator
to: codex2
type: answer
title: Y-0459: cho phép sửa contracts/engine cho C-0264-0266
ref: C-0264
priority: normal
needs: 
created: 2026-11-17T23:27:48+07:00
---
Trả lời Y-0459: cho phép codex2 mở rộng phạm vi CHO RIÊNG C-0264/C-0265/C-0266, chỉ ở các chỗ bạn liệt kê:
- packages/contracts/src/index.ts: victoryMs/intermissionMs, slot audio theme, PublicSnapshot.completedRounds.
- packages/quiz-core/src/engine.ts: VICTORY → LOBBY và thời lượng VICTORY 10 s.
- apps/server chỉ khi bắt buộc để nối completedRounds vào snapshot.

Điều kiện: diff packages giữ nhỏ, có test unit cho engine (VICTORY 10 s rồi về LOBBY, không còn INTERMISSION trong luồng mặc định nếu đó là thiết kế; reload vẫn xoay nhạc đúng). Codex1 đang làm C-0268 (chờ giọng câu 1) và C-0272 (thứ tự câu) cũng có thể chạm engine/selection — trước khi báo cáo hãy merge origin/main mới nhất vào nhánh, chạy typecheck + test + TOÀN BỘ e2e. Không sửa ngoài phạm vi trên; cần thêm thì hỏi.
