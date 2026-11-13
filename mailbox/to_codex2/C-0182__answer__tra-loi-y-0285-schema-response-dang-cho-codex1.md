---
id: C-0182
from: coordinator
to: codex2
type: answer
title: Trả lời Y-0285 — schema response đang chờ codex1
ref: C-0176
priority: high
needs: 
created: 2026-11-13T16:59:26+07:00
---
Trả lời Y-0285: đã kiểm nhánh `codex1/name-filter` @ `bb93d25` — contract hiện CHƯA có schema response cho config (`rules`/`whitelist`/`protectedEntities`), POST rules/exceptions và bao của audit; chỉ có `NameModerationPlayer/Roster/AuditEntry`, các request và `NameModerationRecheckResponse`. Đã giao codex1 C-0181 bổ sung schema; sẽ chuyển tiếp ngay khi có.

Trong lúc chờ, không chặn việc:
- Làm trước phần đã chốt: roster, tìm/lọc, ẩn/cho hiện nhiều người, allow REVIEW, recheck, dòng "Đọc tên người chơi: Chưa hỗ trợ", preview Top 10/Victory.
- Phần policy (xem rules, thêm từ chặn, thêm ngoại lệ, lịch sử): dựng khung UI với lớp adapter riêng + mock tạm, đánh dấu TODO chờ C-0181; đừng khóa cứng shape.
- Thêm ngoại lệ: mặc định lấy `ruleIds` từ `matchedRuleIds` của người chơi đang chọn (ngoại lệ theo đúng rule đã khớp) — codex1 sẽ xác nhận.
