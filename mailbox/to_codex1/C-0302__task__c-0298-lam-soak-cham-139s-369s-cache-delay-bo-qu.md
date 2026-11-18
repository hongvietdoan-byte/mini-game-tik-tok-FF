---
id: C-0302
from: coordinator
to: codex1
type: task
title: C-0298 làm soak chậm 139s→>369s: cache delay, bỏ query mỗi snapshot
ref: X-0511
priority: normal
needs: 
created: 2026-11-19T01:17:47+07:00
---
Chưa gộp được `30ea538f` vì phần bù độ trễ làm chậm hẳn server.

Kết quả đo (máy coordinator, cùng lệnh `corepack pnpm exec vitest run tests/load/soak.test.ts`):
- origin/main: soak 6 vòng × 10 câu, 20 comment/s **PASS sau 139 s**.
- main + nhánh `codex1/c-0292-mc-last-question`: **timeout 300 s**. Chạy riêng mất 369 s, chạy cả bộ mất 383 s.
- Các phần còn lại PASS: typecheck, privacy, e2e 111/111, vitest 596/597.

Nghi vấn chính:
- `snapshotAdmin` gọi `streamDelayAdminView()`, hàm này gọi `nextQuestionStreamDelayMs()` → `store.recentCorrectAnswerElapsedMs()`. Đây là JOIN answers + GROUP BY trên toàn phiên, chạy ở **mỗi lần emitAdmin**, mà lúc 20 comment/s thì emitAdmin rất dày.
- `streamDelayAdminView`, `publicRankingEntries` và `fastestCorrectAnswer` đều gọi `store.roundQuestions(roundId).find(...)` mỗi snapshot.

Yêu cầu:
1. Tính delay của câu kế **một lần** khi có mẫu mới (lúc đóng câu hoặc lúc QUESTION_OPENED), cache trong runtime. Admin view chỉ đọc giá trị đã cache, đổi cấu hình AUTO/MANUAL thì tính lại.
2. `streamDelayMs` của các câu đọc từ cache trong bộ nhớ (map theo questionInstanceId, nạp lại khi recovery), không query mỗi snapshot.
3. Nếu `recentCorrectAnswerElapsedMs` vẫn cần, kiểm tra index cho `answers(question_instance_id, option_id, received_at_ms)` hoặc viết cách khác cho rẻ.
4. Bằng chứng: soak trên nhánh phải ≤ khoảng 150 s, ghi số đo cả origin/main lẫn nhánh trên cùng máy. Giữ toàn bộ test hiện có PASS.

Rebase/merge lên origin/main mới nhất. Lưu ý: nhánh Codex 2 `codex2/c-0293-hotfix-rebased` đang được gộp trước, có đụng nhẹ runtime.ts ở điểm REVEAL. Push nhánh, báo cáo kèm commit và số đo.
