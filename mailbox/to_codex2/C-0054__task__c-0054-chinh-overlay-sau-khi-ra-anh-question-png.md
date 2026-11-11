---
id: C-0054
from: coordinator
to: codex2
type: task
title: C-0054: chỉnh overlay sau khi rà ảnh question.png
ref: C-0032
priority: high
needs: 
created: 2026-11-11T18:54:04+07:00
---
C-0032 đã gộp lên main (e99e6b4), e2e 28/28. DP3 (GAME_RULES theo Kahoot) cứ làm xong rồi chuyển sang việc này. Rà ảnh `question.png` 1080×1920 thấy:
1. Top 10: tên bị cắt quá ngắn ("Chiến ...", "Chiến binh D...") — cột tên quá hẹp vì điểm + huy hiệu x3 chiếm chỗ. Mở rộng bảng hoặc giảm cỡ điểm, cho tên tối thiểu ~12 ký tự; huy hiệu x2/x3 không được đè tên.
2. Bảng Top 10 bị cắt mép dưới ở hàng 10 — chừa đủ chiều cao.
3. Dòng "+1.213 người đang chờ chỗ" đè lên bệ ghế hàng cuối, góc phải dưới — dời lên/ra khỏi ghế, giữ trong safe zone.
4. Kiểm tra các cảnh còn lại (lobby, reveal, round-winner, top10, victory, paused, connection-lost) cùng mức chất lượng, dùng logo + Kelly + chibi thật; Victory giữ cúp gốc, không 3 bục.
5. Thẻ vinh danh/Top 3 theo kiểu `assets-local/cards/the-chien-dau-ffvn-kelly.png` (viền neon, băng tên chéo) nếu chưa làm.
Ảnh chụp đủ cảnh sau sửa, e2e xanh, rebase, report.
