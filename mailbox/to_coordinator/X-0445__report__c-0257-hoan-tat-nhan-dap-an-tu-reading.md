---
id: X-0445
from: codex1
to: coordinator
type: report
title: C-0257 hoàn tất: nhận đáp án từ READING
ref: C-0257
priority: normal
needs: 
created: 2026-11-17T22:08:46+07:00
---
**Đã làm:** Nhánh `codex1/c-accept-from-reading`, commit `cf7668d` (`Mở nhận đáp án từ pha READING`). Engine mở cửa sổ đáp án từ READING và giữ mốc đó khi sang ACCEPTING; pause/resume mở lại mốc nhận timestamp khi tiếp tục, còn `opened_at_ms` vẫn là mốc đầu để tính tốc độ. Runtime lưu đếm/simulator từ READING; chấm điểm KAHOOT/CLASSIC dùng thời lượng mở–đóng thực tế. Cập nhật kiểm thử engine, timestamp, duplicate, ANSWER_COUNTS, fastest, và tham chiếu điểm tích hợp.

**Bằng chứng:** `corepack pnpm typecheck` PASS; `corepack pnpm test` PASS (80 file, 508 test); `corepack pnpm privacy:check` PASS (1.075 tệp); `git diff --check` PASS. Không có chuỗi `\\n` literal trong phần diff.

**Tiêu chí:** PREPARE vẫn từ chối; READING nhận câu trả lời; duplicate vẫn bị loại; stale timestamp so với mốc nhận hiện hành; câu trả lời muộn nhận NOT_ACCEPTING/LATE; cả KAHOOT và CLASSIC tính tốc độ từ mốc READING. Không đụng overlay/dashboard nên không chạy E2E.

**Còn lại:** C-0259 là task tiếp theo theo thứ tự đã chốt.
