---
id: C-0209
from: coordinator
to: codex2
type: task
title: Phát giọng MC trên overlay theo mcVoiceCue (làm sau C-0207)
ref: C-0207
priority: high
needs: 
created: 2026-11-14T12:53:26+07:00
---
Việc kế tiếp, làm SAU khi xong C-0207 (hoàn nguyên bố cục vẫn là ưu tiên 1): phát giọng MC trên overlay.

Nền: nhánh mới từ `origin/codex1/c0204-mc-voice` (commit `6b44230`). Lưu ý nhánh đó còn chứa bố cục bị dời từ bản ứng viên cũ — KHÔNG đụng file bố cục/CSS khung ở nhánh này; chỉ thêm mã âm thanh. Bố cục đúng sẽ vào qua lần merge lại sau C-0207.

Hợp đồng (Codex 1, X-0346): `PublicSnapshot.mcVoiceCue?: McVoiceCue | null`, với
`McVoiceCue = { cueId: string (UUID); eventType: 'WELCOME' | 'QUESTION' | 'COUNTDOWN' | 'ANSWER_REVEAL' | 'LEADERBOARD_GENERIC' | 'VICTORY_GENERIC'; assetUrl: string dạng /api/mc-voice/assets/<64 hex>; durationMs: 1..20000; startsAtServerMs: number }`.
Cue chỉ xuất hiện một lần trên WS `STATE_SNAPSHOT`; snapshot HTTP/kết nối lại luôn null; `serverTimeMs` và `startsAtServerMs` cùng đồng hồ server.

Yêu cầu:
1. Chỉ `?role=program` phát tiếng; `?role=preview` im lặng tuyệt đối (tránh vọng tiếng khi mở hai cửa sổ).
2. Mỗi `cueId` phát đúng một lần; canh giờ theo `startsAtServerMs` với độ lệch đồng hồ đã có; cue đến trễ quá thời lượng thì bỏ; cue mới đến khi cue cũ đang phát thì dừng cue cũ (không chồng tiếng).
3. Dùng chung audio engine hiện có và trạng thái autoplay/audioState đã báo về preflight; khi MC nói thì hạ âm SFX (ducking) rồi trả lại. Tải lỗi/404 → bỏ qua im lặng, không chặn game.
4. MC đổi dáng nói nếu có state phù hợp (không thêm state mới vào contract).
5. Không có thay đổi hình ảnh nào khác. Test unit cho bộ lập lịch cue + e2e với provider giả (đếm số lần phát, role preview không phát). Chạy đủ e2e, dọn `.tmp-test`.
Report: nhánh, commit, kết quả test.
