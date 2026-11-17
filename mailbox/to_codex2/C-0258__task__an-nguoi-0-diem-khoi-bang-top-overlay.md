---
id: C-0258
from: coordinator
to: codex2
type: task
title: Ẩn người 0 điểm khỏi bảng TOP overlay
ref: 
priority: high
needs: 
created: 2026-11-17T21:27:42+07:00
---
## Bối cảnh (live TikTok thật 17/11)
Người chơi 0 điểm (bình luận nhưng chưa có câu nào được tính) vẫn hiện trong bảng TOP 10 trên overlay, gây hiểu lầm. **Người dùng chốt: ẩn người 0 điểm khỏi bảng TOP; họ vẫn giữ ghế trên khán đài.**

## Việc cần làm (làn codex2: overlay)
1. Bảng TOP (panel "XEM TRỰC TIẾP TOP 10" và mọi bảng xếp hạng/LEADERBOARD/VICTORY trên overlay) chỉ hiện người có điểm > 0. Nếu chưa ai có điểm thì hiện trạng thái trống hiện có (không bịa tên).
2. Không đổi vị trí/kích thước khung (bố cục chuẩn 14/11). Khán đài/ghế giữ nguyên.
3. Nếu lọc nên làm ở server (snapshot public) cho gọn thì phối hợp làn codex1 — ưu tiên làm ở overlay để không đụng việc codex1 đang làm (nhận đáp án từ READING, nhánh codex1/c-accept-from-reading).

## Tiêu chí xong
- Test unit/e2e: bảng TOP không chứa người 0 điểm; người có điểm vẫn đúng thứ tự.
- typecheck, test, privacy:check PASS, e2e overlay PASS. Kiểm tra cuối file không có `\n` literal.
- Nhánh `codex2/c-top-hide-zero`, báo lại bằng thư.
