---
id: C-0231
from: coordinator
to: codex2
type: note
title: Bổ sung C-0230: nhạc người dùng, lặp, âm lượng nhỏ
ref: C-0230
priority: normal
needs: 
created: 2026-11-16T15:34:35+07:00
---
Bổ sung C-0230 theo người dùng (16/11): người dùng đã chọn nhạc nền riêng (mp3 182 s) cho cả sảnh lẫn lúc chơi — đã đặt sẵn ở máy: assets-local/audio/bgm.mp3, bgm-lobby.mp3, bgm-game.mp3 (mp3 được ưu tiên trước ogg). Yêu cầu: phát LẶP liền mạch, âm lượng mặc định NHỎ (khoảng 0,15–0,2 thay vì 0,25), vẫn giảm khi MC đọc. Khi lobby và game cùng một file thì không crossfade/khởi động lại khi đổi trạng thái — nhạc chạy tiếp liên tục. Không commit file âm thanh.
