---
id: C-0177
from: coordinator
to: codex1
type: task
title: An toàn tên người chơi + rào MC Voice (đặc tả V1 đã duyệt) — thay C-0173
ref: C-0173
priority: high
needs: 
created: 2026-11-13T15:49:57+07:00
---
Người dùng DUYỆT đặc tả `docs/STORM_ARENA_PLAYER_NAME_SAFETY_MC_VOICE_SPEC_V1.md` (đọc HẾT, kể cả mục "Quyết định người dùng 13/11" ở cuối). Thay thế C-0173. Ưu tiên cao nhất; C-0171 (HUD) lùi lại sau.

## Gốc
Dùng tiếp bản dở trong worktree `.claude/worktrees/c0173-name-filter` (chưa commit) → commit vào `codex1/name-filter`, push, rồi nâng lên đúng đặc tả.

## Phạm vi (Phase B + C, phần server/shared)
1. `packages/name-filter`: mức rủi ro NONE/REVIEW/PARTIAL/HIGH/MANUAL_HIDE, rule ID + nhóm (5 nhóm taxonomy), nhiều representation (giữ dấu / bỏ dấu có word boundary / bỏ ngăn cách / leet có kiểm soát / gộp lặp / teencode liệt kê rõ), whitelist có phạm vi (không gỡ được HIGH khác), kiểm tra lại sau partial mask, `policyVersion`. Thứ tự: manual hide > full > partial > review > allow.
2. Alias ổn định `Người chơi <số>` (số không suy ra được mã TikTok; giữ nguyên suốt phiên). HIGH/MANUAL_HIDE/REVIEW → alias; PARTIAL → che phần vi phạm.
3. Protected entity registry tách riêng: Garena, Free Fire, Free Fire MAX, BTC/ban tổ chức, admin, moderator, support. Khớp đơn thuần → REVIEW, không tự chặn; ghép với tục/giả mạo (official, support, trao thưởng…) → HIGH. Tài khoản chính thức chỉ xác minh bằng source+stableUserId trong allowlist quản trị.
4. Không lộ danh tính ra màn LIVE:
   - Public snapshot/WS (Top 10, podium, khán đài) chỉ mang `safeDisplayName` + mã công khai mờ (KHÔNG còn `TIKTOK:<userId>`). Sửa test `tests/integration/audience.test.ts` để kiểm cả lúc đã có điểm.
   - `live-adapters/tiktok.ts`: bỏ fallback dùng uniqueId/@handle làm tên → nickname trống thì alias.
   - `leaderboard_snapshots`, `outbox_events`, `players.display_name` chỉ lưu tên an toàn; tên gốc bị gắn cờ chỉ trong RAM cho kênh quản trị (đúng như bản dở). Tên đổi giữa trận → lọc lại, giữ playerId.
   - Công cụ `tools/mock_round_check.ts`, `scripts/simulate-round.ts` in tên an toàn.
5. API quản trị (cần token) cho dashboard khi game đang chạy:
   - danh sách người chơi có cảnh báo (risk, nhóm rule, tên gốc, tên an toàn, thời gian) + tìm theo tên trong Top 10/khán đài;
   - ẩn / cho hiện **từng người hoặc nhiều người một lần** (kể cả tên không bị cảnh báo); cho phép (allow) REVIEW;
   - thêm từ chặn, thêm ngoại lệ, recheck; audit trail (ai/lúc nào/hành động, không ghi tên gốc ra log file);
   - mọi thay đổi áp ngay lên LIVE (đẩy snapshot), không cần F5.
   - Trường cấu hình `playerNameSpeech: 'UNSUPPORTED'` cố định để dashboard hiện "Chưa hỗ trợ".
6. MC Voice rào cứng (Phase C): kiểu `McVoiceEvent` đúng đặc tả mục 8 (không có trường danh tính), validator allowlist ở backend; luồng game chỉ tạo lời thoại từ các event này. Nút thử giọng chữ tự do giữ cho quản trị nhưng tách khỏi luồng game. Cache key thêm `voicePolicyVersion`; cache cũ không có version → không phát. Không đổi timing Quiz Engine.
7. KHÔNG sửa `quiz-core/engine.ts`, `scoring.ts`, audience-engine ngoài chỗ bắt buộc; nếu buộc phải chạm, nêu lý do trong report.

## Test (mục 11 đặc tả)
Unit bảng ca (gồm Classic, Dickens, tên Việt có dấu, thương hiệu đơn thuần không bị chặn, thương hiệu+tục, giả mạo chức danh), integration vòng đầy đủ không lộ tên gốc/mã TikTok trong mọi WS message, đổi tên giữa trận, ẩn giữa LIVE, reconnect, TTS mock spy = 0 trường danh tính. Benchmark 10.000 tên (median/p95/peak memory) + ~500 tên Việt gán nhãn tay (FP/FN theo nhóm) — chỉ báo số đo thật.

## Bàn giao
Push từng mốc. Khi API ổn định gửi codex2 1 note mô tả API + kiểu dữ liệu (codex2 làm trang Moderation). Report: gap đã đóng theo mục 12, bằng chứng DTO + TTS, file đã sửa. Không gộp main.
