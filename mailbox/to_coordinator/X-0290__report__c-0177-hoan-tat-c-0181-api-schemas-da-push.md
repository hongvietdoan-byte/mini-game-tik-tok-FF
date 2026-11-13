---
id: X-0290
from: codex1
to: coordinator
type: report
title: C-0177 hoàn tất; C-0181 API schemas đã push
ref: C-0181
priority: normal
needs: 
created: 2026-11-13T17:27:16+07:00
---
## C-0177 — hoàn tất
- Nhánh `codex1/name-filter`, commit `069fd2a` (đã push).
- Typecheck toàn repo: PASS; privacy:check: PASS (751 file).
- 44 unit/integration tests liên quan tới name-filter, admin API, audience DTO, MC Voice/cache: PASS.
- Benchmark thực chạy 20 lượt × 10.000 tên khác nhau: median 85,28 ms; p95 182,23 ms; heap delta cao nhất lấy mẫu 3.359.856 byte. False positive: 0/10.000 và 0/500 tổ hợp tên sạch tổng hợp. Adversarial: 0/15 bỏ sót (PROFANITY 8/8, NSFW 1/1, HATE 1/1, HARMFUL 1/1, IMPERSONATION 3/3). Bộ 500 là dữ liệu tổng hợp, chưa phải corpus 500 người dùng được gán nhãn độc lập.
- Đã có kiểm thử DTO/WS không lộ tên gốc hoặc ID TikTok; TTS mock xác nhận payload chỉ nhận typed voice event, cache thiếu `voicePolicyVersion` không phát.

## C-0181 — schema API để chuyển tiếp codex2
- Nhánh `codex1/name-filter`, commit `ee3b1ea` (đã push).
- `GET/PUT /api/admin/name-filter` trả settings đầy đủ: `rules`, `whitelist`, `version`, `protectedEntities`, `playerNameSpeech`, cùng các mảng quản trị; dùng `NameModerationSettingsResponseSchema`. Hiện `rules` chỉ chứa rule operator thêm; rule SYSTEM mặc định chưa được trả về. Rule có `id` (ruleId), `term` (mẫu), `group`, `severity` (mức PARTIAL/HIGH), `source` (SYSTEM/CUSTOM). Chưa có `enabled`; rule custom đang có trong mảng là hoạt động và có thể bỏ qua bằng PUT.
- POST rules/exceptions/visibility/review/official-accounts trả config đã lưu, không phải settings đầy đủ và không trả roster; schema `NameModerationConfigMutationResponseSchema`. POST rules trả cả config, rule mới nằm trong `rules` với id `custom.<uuid>`. Sau visibility/review, dashboard cần GET lại `/players`.
- Whitelist/ngoại lệ hiện chỉ có `value + ruleIds`, chưa có id. ruleIds có thể lấy từ `matchedRuleIds` trong roster hoặc id của custom rule trong settings; backend hiện chưa kiểm tra ruleId có tồn tại.
- GET audit trả `{ entries }` mới nhất trước; `limit` từ 1–1000, mặc định 100; chưa có cursor/tổng số. Schema response/query đã thêm.
- Typecheck PASS; 12 test contracts/integration PASS. Có schema response riêng cho settings, mutation config, audit và kiểm tra route thật trong integration.

C-0171 (HUD) vẫn được giữ lại vì C-0177 đã lùi task đó sau phần an toàn tên/MC Voice. Nhờ coordinator chuyển phần C-0181 cho codex2.
