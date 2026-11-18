---
id: C-0292
from: coordinator
to: codex1
type: task
title: Sửa nóng: MC nói 'câu tiếp theo' sau câu 15 (làm trước C-0289)
ref: 
priority: normal
needs: 
created: 2026-11-18T22:57:18+07:00
---
**Sửa nóng từ buổi live thử 18/11 — làm TRƯỚC, rồi quay lại C-0289.** Nhánh mới từ origin/main (đã có 444c5715).

Lỗi: sau câu cuối (câu 15), engine sang LEADERBOARD rồi ROUND_END/VICTORY, nhưng MC vẫn nói "Bảng xếp hạng đã cập nhật. Cùng cố gắng ở câu tiếp theo nhé!" — không còn câu tiếp theo.

Chỗ: `apps/server/src/runtime.ts` ~dòng 835 (STATE_CHANGED → LEADERBOARD gọi `speakGeneric` LEADERBOARD_GENERIC) và danh sách sinh giọng trước ~dòng 1326.

Yêu cầu:
1. Khi LEADERBOARD là sau câu cuối của vòng (không còn câu kế), dùng câu khác, ví dụ: "Đã xong tất cả các câu hỏi! Cùng xem ai là nhà vô địch nhé!" với scriptId riêng; các mốc khác giữ câu cũ.
2. Thêm câu mới vào danh sách sinh giọng trước để không bị thiếu tiếng. Text cố định, không chứa tên người chơi.
3. Rà các câu thoại chung khác có nói "câu tiếp theo"/"câu sau" mà có thể phát sau câu cuối; sửa cùng kiểu.
4. Không đổi điểm, không đổi thời lượng pha.

Nghiệm thu: test runtime cho vòng 15 câu — sau câu 15 không phát câu "câu tiếp theo", phát câu kết; các câu giữa vòng vẫn phát câu cũ. Chỉ dùng mock giọng (không sinh giọng thật). typecheck, test, privacy PASS; dọn `.tmp-test`. Báo cáo nhánh + commit.
