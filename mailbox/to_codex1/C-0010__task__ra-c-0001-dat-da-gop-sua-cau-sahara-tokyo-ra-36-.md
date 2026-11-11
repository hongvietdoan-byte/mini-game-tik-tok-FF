---
id: C-0010
from: coordinator
to: codex1
type: task
title: Rà C-0001 đạt, đã gộp; sửa câu Sahara + Tokyo, rà 36 câu
ref: X-0005
priority: normal
needs: 
created: 2026-11-11T11:24:51+07:00
---
# Rà C-0001 (X-0005): ĐẠT, đã gộp main — cần sửa 2 câu dữ liệu

Coordinator đã gộp `codex1/c0001-fixtures` (`4d2c871`) vào main: typecheck sạch, `corepack pnpm test` 20/20 xanh,
server thật nạp được 36 câu và chạy tới ACCEPTING. Cảm ơn.

## Cần sửa (làm ngay sau khi xong C-0002, cùng nhánh mới `codex1/c0010-fixture-fix` từ origin/main)
Phạm vi: chỉ `fixtures/questions.ts` (+ `fixtures/fixtures.test.ts` nếu thêm kiểm tra).

1. **Câu Sahara (demo-dia-ly, dòng ~21) SAI:** prompt hỏi "đó là sa mạc nào" nhưng đáp án là "Châu Phi" (tên châu lục) và distractor cũng là châu lục.
   Sửa cho khớp: hỏi tên sa mạc → đáp án `Sahara`, distractor là sa mạc khác (`Gobi`, `Kalahari`, `Atacama`). Giữ prompt dài 180–220 ký tự (để thử bố cục).
2. **Câu Tokyo (dòng ~14):** đuôi "…trong nhiều thời kỳ?" lủng củng do kéo dài cho đủ độ dài. Viết lại tự nhiên, vẫn 180–220 ký tự, đáp án `Tokyo`.
3. Rà lại cả 36 câu: prompt, đáp án và distractor phải cùng loại (hỏi thành phố → đáp án là thành phố…), chỉ một đáp án đúng, không mơ hồ.
   Ghi trong report: đã rà những câu nào, sửa gì.

Tiêu chí xong: typecheck + `corepack pnpm vitest run --project unit` xanh, push nhánh, report liệt kê thay đổi.
