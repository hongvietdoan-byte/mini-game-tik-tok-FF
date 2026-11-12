---
id: C-0142
from: coordinator
to: codex2
type: task
title: C-0142 Chạy thử offline: sảnh chờ + Top 10 giữa vòng còn nền cũ, MC pha nhận đáp án bị lệch
ref: C-0141
priority: high
needs: 
created: 2026-11-12T21:29:13+07:00
---
Coordinator đã chạy thử offline 1 vòng MOCK 10 câu trên main `4b1eebc` (server thật, overlay `?role=program`, 120 người giả lập). Luồng chạy trọn tới VICTORY, nút bật âm không hiện trên program — tốt. Ảnh: `assets-local/review/offline-1/` (01 sảnh, 02 nhận đáp án, 03 công bố, 04 câu 2, 05 Top 10 giữa vòng, 06 Victory).

Lỗi cần sửa (ưu tiên CAO, gộp chung với C-0141 — chụp Top 10 SAU khi sửa):
1. **Sảnh chờ (LOBBY, ảnh 01)** vẫn là giao diện cũ: nền bão cũ, cờ dựng hai bên, MC bị cắt, chữ "Bình luận / A, B, C / hoặc / D" vỡ thành 4 dòng. Dùng nền sân mới `bg-question-user.jpg`, bỏ cờ dựng, giữ khung cố định như màn câu hỏi đã duyệt (Top 10 trống, ô câu hỏi hiện "SẮP BẮT ĐẦU", MC bán thân + ô thoại).
2. **Top 10 giữa vòng (INTERIM_TOP10, ảnh 05)** — và mọi scene bảng xếp hạng/INTERMISSION khác — vẫn nền bão cũ + cờ dựng hai bên. Đổi sang nền sân mới, bỏ cờ dựng; giữ Top 10 ≤ 45 % chiều cao.
3. **MC ở pha nhận đáp án (ảnh 02, 04)** dùng ảnh tư thế khác, bị lệch/cắt, nửa mặt bị ô thoại che; pha công bố (ảnh 03) thì đúng. Mọi tư thế MC phải cùng khung bán thân đã duyệt (đủ đầu → ngang bụng, không bị che), căn theo cùng điểm neo.
4. Kiểm luôn các scene còn lại chưa có trong ảnh (ROUND_END, INTERMISSION, CONNECTION_LOST, PAUSED) — scene nào còn nền cũ thì đổi.

Nghiệm thu: ảnh từng scene đã sửa + 4 pha câu hỏi (để chắc không vỡ bố cục đã duyệt) vào `assets-local/review/c0142/`; typecheck + unit + e2e full. codex1 đang giữ `tests/e2e/**` cho C-0085 — nếu cần sửa e2e thì ghi rõ trong report, coordinator phối hợp. Không gộp main.
