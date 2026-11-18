---
id: C-0284
from: coordinator
to: codex1
type: task
title: V5 Phase 2: achievement evaluator (danh hiệu) — bắt đầu sau khi C-0276 vào main
ref: C-0276
priority: normal
needs: 
created: 2026-11-18T12:15:14+07:00
---
V5 **Phase 2 — Achievement evaluator**. Phase 1 (C-0276, `codex1/c-0276-ranking-core` 296b3e5) đã được coordinator nghiệm thu và đang gộp vào main cùng C-0279; tạo nhánh mới từ origin/main SAU khi thấy commit gộp C-0276 trên main (nếu chưa thấy thì chờ thư báo gộp).

Phạm vi theo `docs/V5_AUDIT_PLAN.md` §Phase 2 và §Danh hiệu (đọc kỹ, làm đúng các quy tắc đã chốt ở §9):
- Mới: `packages/quiz-core/src/achievements.ts` (+ test): registry ID cố định và evaluator THUẦN trên score_events / answers / leaderboard_snapshots / ranking snapshot của Phase 1.
- Danh hiệu: LONGEST_STREAK (toàn trận, Top 3, tối thiểu chuỗi 3), MOST_CORRECT (toàn trận, Top 5, nhãn "NHIỀU CÂU ĐÚNG NHẤT"), COMEBACK (chặng, Top 3; delta hạng snapshot cuối chặng trước − cuối chặng này; chỉ người có hạng ở cả hai mốc và trả lời ≥3 câu trong chặng; chặng 1 không xét), PERFECT_STAGE / FULL_PARTICIPATION / FIRST_CORRECT (chỉ đếm tổng số người đạt). STAGE_CHAMPION / FASTEST_CORRECT / ROUND_CHAMPION dùng lại dữ liệu Phase 1 + Victory, không tạo bảng trùng. Đồng giá trị → đồng hạng.
- Sửa: `runtime.ts` gọi evaluator ở mốc cuối chặng (INTERIM_TOP10) và cuối trận; `contracts` thêm trường achievement vào snapshot (optional, không đổi nghĩa trường cũ); `persistence` lưu snapshot achievement có `revision`, khoá idempotent `roundId + achievementId + scopeId + playerId`; câu void/regrade → tính lại với revision + 1; recovery/reconnect chỉ trả snapshot mới nhất. Nếu cần bảng mới thì migration additive (0005), không sửa dữ liệu cũ.
- KHÔNG làm UI (Phase 3 của Codex 2), KHÔNG rank/XP dài hạn, KHÔNG MC đọc tên, KHÔNG đổi công thức Kahoot.

Song song: Codex 2 đang làm C-0283 (sảnh chờ) có chạm `runtime.ts` phần LOBBY và `audience`. Giữ diff `runtime.ts` của bạn gọn ở các mốc chặng/cuối trận để gộp dễ; không sửa phần LOBBY.

Nghiệm thu:
- Unit test từng danh hiệu: ngưỡng (chuỗi 2 không vào bảng, COMEBACK người trả lời 2 câu bị loại, chặng 1 không xét), đồng hạng, người vào giữa vòng, câu void → revision + 1, idempotent khi gọi lặp.
- Integration: vòng MOCK 15 câu × 100 người — danh hiệu khớp bản tính tham chiếu độc lập; crash/recovery giữ đúng revision.
- Đo hiệu năng evaluator với 10.000 người / 150.000 events (mục tiêu < 200 ms mỗi mốc chặng), ghi số đo vào báo cáo.
- typecheck, test đầy đủ, e2e đầy đủ, privacy PASS; dọn `.tmp-test`. Báo cáo kèm danh sách file đổi và số đo.
