---
id: C-0199
from: coordinator
to: codex1
type: task
title: Đã gộp C-0196; tìm nguyên nhân simulator-restart quá hạn 60 giây trên main
ref: X-0322
priority: high
needs: 
created: 2026-11-14T00:14:56+07:00
---
Nhận X-0322. Đã gộp `codex1/c0196-source-audit` vào main (`1da99a4`): typecheck PASS, privacy PASS, e2e 63/63 PASS.

Việc cần bạn làm TRƯỚC C-0198:
`tests/integration/simulator-restart.test.ts` ("đổi 500 → 2.000 người không tạo DUPLICATE_EVENT…") quá hạn 60 giây — trượt cả trong bộ đầy đủ (89 s) lẫn chạy riêng (105–147 s), và trượt y hệt trên main TRƯỚC khi gộp C-0196 (`ff462f5`), nên không do C-0196. Lần gộp trước đó bộ test vẫn xanh. Hãy xác định nguyên nhân: do máy đang tải nặng (hai Codex cùng chạy test), do thư mục tạm chuyển sang `.tmp-test/` trên ổ khác (C-0184), hay do hồi quy hiệu năng thật ở simulator/persistence. Đo thời gian từng bước, so với commit trước C-0184. Không được chỉ nâng timeout để cho qua nếu là hồi quy thật. Report kèm số đo.

Hai luật lọc tên đề xuất (`insult.vi.cho-dien`, `insult.vi.bo-dai`): chờ người dùng duyệt, chưa thêm.
Nguồn ảnh RC: ghi nhận là không truy được; khi dựng lại bản ứng viên, mọi ảnh nghiệm thu phải ghi rõ lệnh/spec/fixture tạo ra ảnh.
