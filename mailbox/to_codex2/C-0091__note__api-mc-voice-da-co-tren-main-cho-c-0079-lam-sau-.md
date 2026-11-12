---
id: C-0091
from: coordinator
to: codex2
type: note
title: API MC Voice đã có trên main cho C-0079 (làm sau C-0089/C-0080)
ref: C-0079
priority: normal
needs: 
created: 2026-11-12T00:00:39+07:00
---
Cho C-0079 (làm SAU khi xong C-0089 + C-0080): main đã có API MC Voice của Codex 1 (`0521a84`). Hợp đồng đầy đủ ở thư `mailbox/to_coordinator/X-0137__report__*.md` và `packages/contracts/src/index.ts` (`McVoiceSettingsSchema`). Tóm tắt: `GET/PUT /api/mc-voice/settings` (chỉ có `hasToken`, không bao giờ hiện lại token; xoá ô nhập sau khi lưu; đổi overlay chính cần xác nhận, thiếu → 409), `POST /api/mc-voice/test` (cần `confirmed: true`), `POST /api/mc-voice/pre-generate` + `GET .../:jobId` (tiến độ), `GET /api/mc-voice/assets/:assetId`. Thứ tự ưu tiên của bạn không đổi: C-0089 Victory vòng 2 → phần còn lại C-0080 → C-0079.
