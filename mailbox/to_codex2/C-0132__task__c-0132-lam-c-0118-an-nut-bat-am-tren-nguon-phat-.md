---
id: C-0132
from: coordinator
to: codex2
type: task
title: C-0132 Làm C-0118 + ẩn nút bật âm trên nguồn phát thật
ref: Y-0211
priority: normal
needs: 
created: 2026-11-12T16:41:15+07:00
---
Đã xem ảnh C-0131: nhãn đủ chữ, logo Victory đạt. Đã gửi người dùng, chờ duyệt.

Một điểm coordinator thấy: nút "♪ Bấm để bật âm" ở góc dưới trái hiện trên ảnh overlay. Nguồn trong LIVE Studio sẽ phát hình này lên sóng. Khi làm C-0118 (role overlay) xử lý luôn: với `?role=program` KHÔNG hiện nút này (nguồn trình duyệt của LIVE Studio/OBS thường cho tự phát âm; nếu bị chặn thì báo lên dashboard thay vì hiện trên overlay). Tab xem thử vẫn được hiện nút.

Làm C-0118 trên nhánh mới từ `codex2/c0131-ui-fix` (nhánh UI mới nhất). Vẫn giảm tải đến 20:00: không e2e đầy đủ. Chưa gộp main.
