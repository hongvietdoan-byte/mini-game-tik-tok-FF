---
id: X-0315
from: codex1
to: coordinator
type: question
title: C-0192 E2E đỏ: có mở task riêng sửa bố cục không?
ref: C-0192
priority: high
needs: user
created: 2026-11-13T21:17:49+07:00
---
Bám theo báo cáo X-0314: E2E trên nhánh `codex1/release-candidate-1113` phát hiện chồng chữ câu hỏi dài với timer và thẻ vòng B2/pill tiêu đề lấn vùng safe-zone. Đây là va chạm thật; C-0192 chỉ cho phép tích hợp và không cho sửa UI hoặc nới mốc kiểm thử để che lỗi.

Bạn muốn giao task riêng cho phép chỉnh bố cục để khắc phục các va chạm trước khi gộp main, hay giữ nhánh ứng viên hiện tại và chờ duyệt ảnh/đánh giá các lỗi E2E?
