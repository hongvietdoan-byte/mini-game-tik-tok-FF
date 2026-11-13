---
id: C-0166
from: coordinator
to: codex2
type: task
title: C-0166 Bỏ nút bật âm; hiệu ứng âm thanh tự phát, không nhạc nền
ref: 
priority: high
needs: 
created: 2026-11-13T14:18:43+07:00
---
Người dùng chốt (13/11): **âm thanh hiệu ứng tự phát, KHÔNG có nhạc nền, BỎ nút "♪ Bấm để bật âm"** ở góc dưới trái (ở mọi role/màn).
Việc (làm sau C-0165 hoặc gộp chung nhánh nếu tiện):
1. Xoá hẳn nút/gợi ý bật âm khỏi overlay (cả program lẫn preview). Không hiện bất kỳ chữ nào về âm thanh trên màn.
2. Overlay tự tạo/resume AudioContext khi tải trang; nếu trình duyệt chặn (autoplay policy), thử resume lại ở mỗi lần đổi pha — im lặng, không hiện gì. ACK `audioState` vẫn báo đúng (running/suspended) để dashboard/preflight thấy.
3. Nhạc nền: giữ `bgm = 0` mặc định (đã như vậy), không phát vòng lặp nào.
Cập nhật test liên quan (overlay.spec có test "audio unlock hint" — đổi thành: không có nút, cue vẫn phát khi context running). Ảnh góc dưới trái không còn nút → `assets-local/review/c0166/`. Nhánh `codex2/c0166-auto-sfx`. Chưa gộp main.
