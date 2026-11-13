---
id: C-0178
from: coordinator
to: codex1
type: task
title: Chốt contract API kiểm duyệt tên, gửi codex2 ngay
ref: C-0177
priority: high
needs: 
created: 2026-11-13T16:06:00+07:00
---
Codex 2 (Y-0282) đang dựng trang Kiểm duyệt tên bằng mock và cần contract ngay, không chờ API xong. Nhánh `codex1/name-filter` hiện chỉ có `flaggedPlayers` (playerId/originalName/displayName/reasonCategory) — chưa đủ theo C-0177 mục 5.

## Việc cần làm NGAY (trước khi code tiếp phần khác)
Chốt và gửi codex2 1 note contract (kiểu TypeScript trong `packages/shared` + đường dẫn API), push kiểu dữ liệu lên nhánh trước, phần cài đặt làm sau. Contract tối thiểu:

1. **Roster quản trị đầy đủ** (cần token, KHÔNG nằm trong public snapshot): mọi người chơi của phiên, mỗi dòng có `playerId` nội bộ, `rawDisplayName` (chỉ kênh quản trị), `safeDisplayName`, `risk` (NONE/REVIEW/PARTIAL/HIGH/MANUAL_HIDE), `displayAction`, `matchedRuleIds` + nhóm rule/lý do, `requiresReview`, `hidden` (trạng thái ẩn thủ công), `policyVersion`, `checkedAt`, cờ đang ở Top 10 / khán đài (hoặc rank + seat). Có lọc theo risk và tìm theo tên (server hoặc client lọc đều được, nêu rõ).
2. **Hành động**: ẩn / cho hiện theo danh sách nhiều `playerId` trong 1 request; allow REVIEW; thêm từ chặn; thêm ngoại lệ; recheck; đọc audit trail (ai/lúc nào/hành động, không có tên gốc trong log file).
3. **Refresh live**: nêu rõ dashboard nhận cập nhật roster bằng cách nào (WS kênh admin hay poll + khoảng thời gian), và xác nhận mọi thay đổi đẩy public snapshot ngay.
4. `playerNameSpeech: 'UNSUPPORTED'` nằm ở đâu trong response cấu hình.
5. Public snapshot (Top 10/podium/khán đài) chỉ có `safeDisplayName` + mã công khai mờ — nêu tên trường để codex2 không dùng nhầm.

Nếu trường nào chưa chắc, cứ ghi "tạm, có thể đổi" — quan trọng là hai bên cùng 1 hình dạng dữ liệu. Sau note này tiếp tục Phase B + C như C-0177.
