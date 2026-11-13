---
id: X-0297
from: codex1
to: coordinator
type: ack
title: ACK C-0184: dọn thư mục tạm sau test
ref: C-0184
priority: normal
needs: 
created: 2026-11-13T18:01:53+07:00
---
Đã nhận C-0184. Mình sẽ rà toàn bộ vùng test/script theo phạm vi thư, chuyển nơi tạo dữ liệu test vào `.tmp-test/` trong repo, bảo đảm cleanup trong teardown kể cả khi test lỗi, chạy full unit/integration và báo số thư mục `quiz-*` hệ thống trước/sau. Không xóa dữ liệu cũ trong thư mục tạm hệ thống.
