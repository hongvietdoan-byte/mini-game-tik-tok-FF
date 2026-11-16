---
id: C-0230
from: coordinator
to: codex2
type: task
title: Nhạc chờ ở sảnh và nhạc lúc chơi riêng
ref: 
priority: normal
needs: 
created: 2026-11-16T15:05:30+07:00
---
## Mục tiêu
Người dùng muốn mini game có **nhạc chờ** ở sảnh và **nhạc lúc chơi** riêng. Hiện `apps/overlay/src/audio/audio-engine.ts` chỉ có 1 slot `bgm` lặp, âm lượng mặc định 0. Người dùng tự bấm bắt đầu vòng, KHÔNG cần đếm người ở sảnh.

## File âm thanh (đã có, CC0, chỉ nằm ở máy — `assets-local/audio/`, bị ignore, KHÔNG commit)
`question-enter.ogg`, `countdown-tick.ogg`, `timeout.ogg`, `correct-answer.ogg`, `top10.ogg`, `victory.ogg`, `transition.ogg`, `bgm.ogg`, **`bgm-lobby.mp3`**, **`bgm-game.ogg`**. Overlay tải qua `/assets/audio/<slot>.<mp3|ogg>`.

## Yêu cầu
1. Thêm 2 slot `bgm-lobby` và `bgm-game` (giữ `bgm` làm fallback khi thiếu file riêng; thiếu hết thì dùng vòng tự tổng hợp như cũ).
2. Chọn bản theo trạng thái snapshot: LOBBY (và khi chưa có vòng) → `bgm-lobby`; PREPARE/READING/ACCEPTING/REVEAL/LEADERBOARD → `bgm-game`; VICTORY → hạ nhỏ/tắt nhạc nền để jingle chiến thắng nổi. Chuyển bản bằng crossfade ~1 s, không khởi động lại bản đang phát khi trạng thái đổi trong cùng nhóm.
3. Âm lượng nhạc nền mặc định khoảng 0,25 (vẫn chỉnh được qua tham số `bgm` hiện có, `bgm=0` tắt hẳn); giữ ducking khi MC đọc.
4. Trình duyệt chưa mở khoá âm thanh thì không lỗi; destroy dừng hết nguồn.
5. Test unit cho việc chọn slot theo trạng thái + fallback; e2e/placeholder không cần file thật (chạy được với `fixtures/assets-placeholder`).

## Ràng buộc
- Lane codex2 (overlay). Không sửa server trừ khi bắt buộc — nếu cần thì hỏi trước.
- typecheck + test + e2e (có và không có `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) + privacy xanh. Không commit file âm thanh.
- Nhánh `codex2/c-bgm-lobby-game` từ main mới nhất, push và report kèm hash. Dọn `.tmp-test` sau khi chạy.
