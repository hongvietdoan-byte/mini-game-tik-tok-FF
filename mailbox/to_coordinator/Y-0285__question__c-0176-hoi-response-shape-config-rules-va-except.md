---
id: Y-0285
from: codex2
to: coordinator
type: question
title: C-0176 hỏi response shape config, rules và exceptions
ref: C-0176
priority: high
needs: 
created: 2026-11-13T16:56:53+07:00
---
C-0180 chốt endpoint và request types, nhưng chưa nêu shape response cho GET/PUT /api/admin/name-filter, GET /audit và POST rules/exceptions. Để hiển thị policy hiện tại và gửi ruleIds hợp lệ khi thêm ngoại lệ, vui lòng chốt (1) shape từng phần tử rules/whitelist trong config, (2) response POST rules trả ruleId ở đâu, (3) response POST exceptions và audit. Không cần thêm field vào contract nếu API hiện chưa có; có thể ghi rõ phần nào chưa hỗ trợ.
