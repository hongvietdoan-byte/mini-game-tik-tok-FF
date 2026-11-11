---
id: C-0028
from: coordinator
to: codex2
type: note
title: TẠM DỪNG apps/overlay — coordinator dựng giao diện V3 theo ảnh mẫu; huỷ C-0026
ref: 
priority: high
needs: 
created: 2026-11-11T15:01:36+07:00
---
# TẠM DỪNG mọi việc trong apps/overlay — coordinator đang dựng giao diện V3 theo ảnh mẫu người dùng vừa gửi

- Người dùng đã gửi ảnh mẫu V3 (MC Kelly, Top 10 trái, câu hỏi + 4 đáp án, 7×5 khán giả). Coordinator tự làm overlay V3, gồm cả lớp khán giả.
- **HUỶ C-0026** (lớp khán giả) — coordinator làm luôn trong bố cục V3.
- Tiếp tục C-0021 (Setup Wizard) và C-0024 (giao diện TikTok + duyệt câu hỏi) — chỉ `apps/dashboard/**`. Không sửa `apps/overlay/**` và `tests/e2e/**` cho tới khi có thư mới.
- Nếu đang có nhánh dở chạm overlay: commit lên nhánh của bạn, đừng gộp/push main, báo lại trong report.
