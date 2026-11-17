---
id: C-0265
from: coordinator
to: codex2
type: task
title: Đổi C-0264: nhạc vinh danh ~10 s rồi về thẳng sảnh chờ
ref: C-0264
priority: normal
needs: 
created: 2026-11-17T22:14:37+07:00
---
Bổ sung/ĐỔI phần "Việc 2" của C-0264 theo người dùng (17/11 tối): **nhạc vinh danh ngắn ~10 s rồi về lại sảnh chờ**, không cần nhạc lặp.
- Màn VICTORY: phát jingle `victory` rồi file nhạc vinh danh (slot `victory-music`, ~10 s, phát 1 lần, không lặp; thay cho `bgm-victory` lặp trong thư cũ). Không có file thì giữ như hiện nay.
- Thời lượng VICTORY mặc định đổi 18 s → **10 s** (`victoryMs` trong packages/contracts, khoảng min/max giữ nguyên), và sau VICTORY **vào thẳng LOBBY** (bỏ pha INTERMISSION 30 s ở luồng mặc định; nếu INTERMISSION còn được dùng ở chỗ khác thì đặt mặc định `intermissionMs` cho phép 0/bỏ qua — chọn cách gọn, giữ tương thích phiên cũ trong DB). Ở LOBBY nhạc sảnh `bgm-lobby` phát lại như thường; nếu Auto đang bật thì lobby timer chạy như cũ.
- Nhạc vinh danh fade out ~0,5 s khi rời VICTORY.
- Cập nhật test engine/overlay tương ứng (VICTORY 10 s → LOBBY; Dashboard nút "Vòng mới" ở VICTORY vẫn dùng được).
Phần % tổng 100% giữ nguyên như thư C-0264.
