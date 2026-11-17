---
id: C-0264
from: coordinator
to: codex2
type: task
title: Overlay: % đáp án tổng đúng 100% + nhạc nền vinh danh VICTORY
ref: 
priority: normal
needs: 
created: 2026-11-17T21:58:15+07:00
---
## Việc 1 — % đáp án luôn tổng đúng 100% (người dùng yêu cầu)
`apps/overlay/src/v3/ArenaStage.tsx` (~dòng 174) làm tròn từng ô `Math.round(count/total*100)` → tổng có thể 99%/101%. Đổi sang **phương pháp phần dư lớn nhất** (largest remainder): lấy phần nguyên, chia số % còn thiếu cho các ô có phần dư lớn nhất (hoà thì theo thứ tự A→D). total = 0 → tất cả 0%. Ô có 0 người luôn 0%. Thanh `--answer-share` có thể dùng cùng số đã làm tròn để khớp chữ. Áp dụng cho mọi nơi hiện % (overlay, dashboard nếu có). Unit test: (1,1,1,0)→34/33/33/0; (1,2,0,2)→20/40/0/40; (2,1,0,0)→67/33/0/0; tổng luôn 100 với 1.000 bộ ngẫu nhiên.

## Việc 2 — Nhạc vinh danh cho màn VICTORY (top 3)
Hiện VICTORY chỉ phát jingle `victory` ở đầu, rồi im (BGM tắt ở VICTORY từ C-0230). Cần thêm **nhạc nền vinh danh** lặp trong suốt màn VICTORY:
- Slot âm thanh mới `bgm-victory` (asset `bgm-victory.ogg|mp3` trong thư mục asset như các bgm khác; theme có slot tương ứng). Phát sau jingle `victory` (hoặc crossfade 1 s khi jingle kết thúc), lặp, âm lượng theo cùng cơ chế `bgm`, tắt/fade khi rời VICTORY.
- Không có file `bgm-victory` thì im lặng như hiện nay (không lỗi; preflight chỉ WARN).
- Giọng MC ở VICTORY vẫn nghe rõ: ducking nhạc khi MC nói như bgm khác (nếu đã có cơ chế duck).
- Asset thật do coordinator/người dùng đặt vào `assets-local/audio/` (ignore) — **không commit file nhạc**; test dùng placeholder.
- Cập nhật docs âm thanh/THEME nếu có liệt kê slot.

## Tiêu chí xong
- Unit test % như trên; test audio: vào VICTORY → jingle rồi bgm-victory lặp; rời VICTORY → dừng.
- typecheck, test, privacy:check, e2e overlay PASS. Kiểm tra cuối file không có `\n` literal.
- Làm sau các việc đang xếp hàng (C-0258, C-0260, C-0261). Nhánh `codex2/c-percent-victory-music`, báo lại bằng thư.
