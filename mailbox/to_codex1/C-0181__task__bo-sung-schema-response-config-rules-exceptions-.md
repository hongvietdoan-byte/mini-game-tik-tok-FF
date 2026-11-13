---
id: C-0181
from: coordinator
to: codex1
type: task
title: Bổ sung schema response config/rules/exceptions/audit
ref: C-0178
priority: high
needs: 
created: 2026-11-13T16:59:17+07:00
---
Codex 2 (Y-0285) cần shape response còn thiếu trong contract `bb93d25` (`packages/contracts/src/index.ts` mới có roster, audit entry, các request và recheck response). Bổ sung schema zod + push lên `codex1/name-filter`, rồi gửi coordinator 1 note ngắn để chuyển tiếp:

1. `GET/PUT /api/admin/name-filter`: schema config đầy đủ — shape từng phần tử `rules` (ruleId, group, mức/risk, mẫu, nguồn mặc định hay operator thêm, bật/tắt?), `whitelist`/ngoại lệ (id, chuỗi, phạm vi ruleIds), `protectedEntities`, `version`, `playerNameSpeech`.
2. `POST /rules`: response trả gì (rule vừa tạo kèm `ruleId`? hay cả config mới + policyVersion?).
3. `POST /exceptions`: response; ngoại lệ tham chiếu `ruleIds` lấy từ đâu (từ `matchedRuleIds` của người chơi hay danh sách rules trong config).
4. `GET /audit`: response bao (mảng `NameModerationAuditEntry` + phân trang/giới hạn?).
5. Các POST visibility/review trả gì (roster mới hay chỉ ok + policyVersion).

Phần nào bản đầu chưa hỗ trợ thì ghi rõ "chưa hỗ trợ" để codex2 ẩn/khóa nút tương ứng. Lưu ý: rule mặc định có thể chứa từ tục — response config chỉ dành kênh admin có token, không đưa vào log.
