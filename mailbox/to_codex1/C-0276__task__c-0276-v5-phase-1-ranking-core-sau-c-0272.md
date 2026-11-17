---
id: C-0276
from: coordinator
to: codex1
type: task
title: C-0276 V5 Phase 1: Ranking core (sau C-0272)
ref: 
priority: normal
needs: 
created: 2026-11-18T00:20:53+07:00
---
V5 Phase 1 — Ranking core. ĐÃ ĐƯỢC CHỦ DỰ ÁN DUYỆT. Làm SAU C-0272 (sau khi C-0272 đã gộp main), trước đó vẫn làm hàng hiện tại.

Đọc trước: `docs/V5_AUDIT_PLAN.md` (kế hoạch đã duyệt, mục 3–5, 7) và `docs/specs/NHA_THONG_THAI_V5_SPEC.txt` (§3, §8, §9).

Phạm vi Phase 1 (không làm Phase 2+):
1. `packages/quiz-core/src/rankings.ts` (mới, hàm thuần + test): questionTop3 (đáp án đầu tiên hợp lệ, đúng, responseMs = receivedAtMs − openedAtMs; cùng ms = đồng hạng, thứ tự hiển thị theo answers.id; "+X người đồng hạng"; 0–2 người đúng không bịa thêm), stageDefinitions theo leaderboardInterval (hỗ trợ số câu ≠ 15), stageScores từ score events (CORRECT+SPEED+STREAK của câu trong chặng), stageTop3 (stageScore → số câu đúng trong chặng → đồng hạng).
2. contracts: RankingScope, RankedEntry, StageDefinition; PublicSnapshot thêm `questionTop3` (REVEAL/LEADERBOARD của câu) và `stageTop3` (INTERIM_TOP10 sau câu 5/10/15). GIỮ `fastestCorrectAnswer` cũ song song.
3. runtime: dùng hàm mới, chỉ gửi Top N + safeDisplayName, không phát lặp sau reconnect/recovery, không lẫn round.
4. persistence: migration 0004 CHỈ THÊM — index score_events(round_id, question_instance_id) + bảng ranking_snapshots (round_id, scope, scope_id, achievement_id, revision, entries_json, finalized_at_ms; unique round_id+achievement_id+scope_id+revision). Không đổi unique hiện có.
5. KHÔNG đổi công thức Kahoot/streak, KHÔNG đổi engine phase/thời lượng, KHÔNG đụng overlay UI (Phase 3 của codex2).

Nghiệm thu (gửi bằng chứng): unit test các ca §7 của plan; test khẳng định tổng stageScore = điểm vòng mỗi người và điểm vòng không đổi so với trước; test reconnect không lặp; typecheck + toàn bộ test + privacy + toàn bộ e2e sau khi merge origin/main mới nhất; số đo thời gian tính stageTop3 ở 10.000 người.
