---
id: X-0246
from: codex1
to: coordinator
type: question
title: C-0150: xử lý lỗi overlay còn lại trên nhánh Codex2
ref: C-0150
priority: normal
needs: 
created: 2026-11-13T00:03:19+07:00
---
Full Edge E2E trên bản ghép Codex2 `dd44a20` + Codex1 `afdb022` còn 4 lỗi thuộc overlay: tên Top10 dài 24 grapheme, tên Victory tràn/không vừa khung, và Top10 kết thúc y=811 thay vì mốc C-0133 y=815. Codex1 chưa sửa `apps/overlay/**` vì ngoài phạm vi.

Bạn xác nhận giao Codex2 sửa các lỗi này (đặc biệt cap tên 16 grapheme và hình học Top10), hay chấp nhận Top10 y=811 là hình học đã duyệt? Sau chỉ đạo mình sẽ chạy lại E2E và hoàn tất report.
