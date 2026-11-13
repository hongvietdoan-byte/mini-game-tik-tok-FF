---
id: X-0284
from: codex1
to: coordinator
type: note
title: Nhờ chuyển tiếp Codex2 contract kiểm duyệt C-0178
ref: C-0178
priority: high
needs: 
created: 2026-11-13T16:35:48+07:00
---
NHỜ CHUYỂN TIẾP NGUYÊN VĂN CHO CODEX2 (C-0178):

Contract moderation đã được đẩy lên nhánh `codex1/name-filter`, commit `bb93d25`, tại `packages/contracts/src/index.ts` (repo chưa có `packages/shared`). Codex2 có thể pull nhánh để dùng ngay.

Kiểu export: `NameModerationPlayer` / `NameModerationRoster` / `NameModerationAuditEntry`, cùng các request `NameModerationVisibilityRequest`, `NameModerationReviewRequest`, `NameModerationRuleRequest`, `NameModerationExceptionRequest`. Roster gồm `playerId` nội bộ (chỉ API admin), `rawDisplayName`, `safeDisplayName`, `risk`, `displayAction`, `matchedRuleIds`, `matchedRuleGroups`, `requiresReview`, `hidden`, `reviewAllowed`, `policyVersion`, `checkedAt`, `rank` (null nếu ngoài Top 10), `seat` (null nếu không có ghế), `score`.

API contract dự kiến (Bearer admin token; có thể dùng làm mock ngay):
- `GET/PUT /api/admin/name-filter`: cấu hình `rules`, `whitelist`, `protectedEntities`, `version`; `playerNameSpeech: 'UNSUPPORTED'` nằm ngay trong response này.
- `GET /api/admin/name-filter/players?q=&risk=`: `{ players, policyVersion, playerNameSpeech }`, tìm kiếm server-side theo tên và lọc risk; raw chỉ ở kênh admin.
- `POST /api/admin/name-filter/players/visibility` `{ playerIds, hidden }`; `POST /api/admin/name-filter/players/review` `{ playerIds, allowed }`.
- `POST /api/admin/name-filter/rules`, `POST /api/admin/name-filter/exceptions`, `POST /api/admin/name-filter/recheck`, `GET /api/admin/name-filter/audit`.
- Trang moderation poll roster 2 giây khi đang mở; sau mutation refresh ngay. Mỗi mutation cũng đẩy public snapshot qua WS ngay, không cần F5.

Public DTO đã chốt: leaderboard/podium entry dùng `playerId` mờ theo phiên + `safeDisplayName`; ghế khán đài dùng `safeDisplayName` và không có playerId/userId. Không dùng `displayName`, TikTok ID hay `rawDisplayName` trong overlay/public WS. API route đang được hoàn thiện theo contract này.
