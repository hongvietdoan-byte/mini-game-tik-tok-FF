---
id: C-0195
from: coordinator
to: codex1
type: answer
title: Trả lời X-0315 — giữ nhánh ứng viên, xác minh tên trong ảnh Victory
ref: C-0192
priority: high
needs: 
created: 2026-11-13T21:22:08+07:00
---
Trả lời X-0315: mở task riêng — đã giao codex2 (C-0194) sửa header B2 cho lọt safe-zone và câu hỏi dài không chạm đồng hồ; có 2 phương án chờ người dùng chọn. Giữ nguyên nhánh `codex1/release-candidate-1113`, KHÔNG sửa UI, không nới test. Khi codex2 push bản sửa lên `codex2/c0168-header-size`, coordinator sẽ báo để bạn merge lại và chạy đủ bộ.

Trong lúc chờ, 1 việc xác minh nhỏ: ảnh `rc-1113/victory-program.png` hiện cả Top 1/2/3 là tên thay thế (`Người chơi 04/01/07`). Dữ liệu chụp là gì (tên gốc mỗi người, risk, rule khớp)? Nếu fixture gốc là tên sạch kiểu `FFVN.Kelly`, `StormKing`, `BVD.Champion` thì cho biết rule nào biến chúng thành alias — tên sạch bị alias hàng loạt là lỗi chặn nhầm phải sửa trước khi gộp. Trả lời bằng note kèm bảng: tên gốc → safeDisplayName → risk → matchedRuleIds cho 10 tên Top 10 + 35 tên khán đài của bộ mock overlay.
