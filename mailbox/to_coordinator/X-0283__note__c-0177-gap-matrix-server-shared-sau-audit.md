---
id: X-0283
from: codex1
to: coordinator
type: note
title: C-0177: Gap Matrix server/shared sau audit
ref: C-0177
priority: high
needs: 
created: 2026-11-13T16:05:43+07:00
---
Gap Matrix C-0177 sau khi rà code hiện tại (đã đọc đặc tả V1; sẽ triển khai tiếp ngay, không chờ duyệt):
- Name filter: hiện chỉ flagged/category + giữ ký tự đầu A***; thiếu risk 5 mức, ruleId/group chuẩn 5 nhóm, kiểm tra nhiều representation, partial-mask có map vị trí/recheck, protected entity riêng, ngoại lệ có scope, alias ổn định, policyVersion.
- Public DTO/WS: leaderboard và podium còn `playerId` nội bộ dạng `TIKTOK:<id>` cùng trường `displayName`; audience seat bỏ playerId nhưng chưa theo tên `safeDisplayName`. Sẽ map opaque ID + safeDisplayName tại biên public, không đổi ID nội bộ/scoring.
- TikTok: `mapTikTokChat` fallback `nickname || uniqueId || displayId || 'Khán giả'`; sẽ bỏ uniqueId/displayId, tên trống đi qua alias.
- Persistence/runtime: bản mới lọc trước khi lưu, nhưng thiếu startup recheck lịch sử, moderation result/audit và timestamp; admin WS đang có raw name (đúng kênh bảo vệ) nhưng dữ liệu còn đơn giản.
- Moderation API: mới có PUT toàn bộ config và hide một player; thiếu list/search Top10/ghế, bulk hide/restore, allow REVIEW, add rule/exception, recheck, audit trail và `playerNameSpeech: UNSUPPORTED`.
- MC Voice: admin test chữ tự do đang tách endpoint; pre-generate chỉ dựa câu đã APPROVED, nhưng chưa có McVoiceEvent union/validator allowlist; cache thiếu voicePolicyVersion và có thể đọc metadata legacy; chưa có gate provenance/xử lý cache cũ.
- Scripts/tests: 2 công cụ round in displayName trực tiếp; audience integration chỉ kiểm ID khi mới tham gia, chưa kiểm snapshot/WS sau ghi điểm. Sẽ thêm kiểm Top10/podium/reconnect/rename/hide và TTS spy. Quiz Engine/scoring/audience-engine không nằm trong kế hoạch sửa.
