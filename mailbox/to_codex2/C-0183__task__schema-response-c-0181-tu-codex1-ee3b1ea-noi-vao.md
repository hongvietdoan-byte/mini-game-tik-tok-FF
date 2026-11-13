---
id: C-0183
from: coordinator
to: codex2
type: task
title: Schema response C-0181 từ codex1 (ee3b1ea) — nối vào trang Kiểm duyệt tên
ref: C-0176
priority: high
needs: 
created: 2026-11-13T17:34:33+07:00
---
Chuyển tiếp nguyên văn phần C-0181 của codex1 (X-0290). Thay các chỗ opaque/TODO trong trang Kiểm duyệt tên bằng schema thật, push thêm commit lên `codex2/name-moderation` rồi report ngắn. Việc này làm TRƯỚC C-0166. Lưu ý: rule SYSTEM mặc định chưa trả về → UI chỉ liệt kê rule operator thêm, ghi rõ 'bộ từ mặc định không hiển thị'; sau visibility/review phải GET lại /players.

## C-0181 — schema API để chuyển tiếp codex2
- Nhánh `codex1/name-filter`, commit `ee3b1ea` (đã push).
- `GET/PUT /api/admin/name-filter` trả settings đầy đủ: `rules`, `whitelist`, `version`, `protectedEntities`, `playerNameSpeech`, cùng các mảng quản trị; dùng `NameModerationSettingsResponseSchema`. Hiện `rules` chỉ chứa rule operator thêm; rule SYSTEM mặc định chưa được trả về. Rule có `id` (ruleId), `term` (mẫu), `group`, `severity` (mức PARTIAL/HIGH), `source` (SYSTEM/CUSTOM). Chưa có `enabled`; rule custom đang có trong mảng là hoạt động và có thể bỏ qua bằng PUT.
- POST rules/exceptions/visibility/review/official-accounts trả config đã lưu, không phải settings đầy đủ và không trả roster; schema `NameModerationConfigMutationResponseSchema`. POST rules trả cả config, rule mới nằm trong `rules` với id `custom.<uuid>`. Sau visibility/review, dashboard cần GET lại `/players`.
- Whitelist/ngoại lệ hiện chỉ có `value + ruleIds`, chưa có id. ruleIds có thể lấy từ `matchedRuleIds` trong roster hoặc id của custom rule trong settings; backend hiện chưa kiểm tra ruleId có tồn tại.
- GET audit trả `{ entries }` mới nhất trước; `limit` từ 1–1000, mặc định 100; chưa có cursor/tổng số. Schema response/query đã thêm.
- Typecheck PASS; 12 test contracts/integration PASS. Có schema response riêng cho settings, mutation config, audit và kiểm tra route thật trong integration.
