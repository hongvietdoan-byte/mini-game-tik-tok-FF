---
id: C-0051
from: coordinator
to: codex1
type: task
title: C-0051: thay DP1 (đã xong) bằng test bền phiên LIVE dài (soak)
ref: 
priority: high
needs: 
created: 2026-11-11T17:49:10+07:00
---
DP1 đã xong từ trước (`docs/DATA_PRIVACY.md` có trên main) — bỏ, đừng làm lại. BOARD đánh dấu DP cũ chưa cập nhật; hàng chờ thật nằm ở thư.
Việc mới (ưu tiên kết nối LIVE ổn định), chỉ file test mới `tests/load/soak.test.ts`:
- Giả lập phiên TikTok 60 phút ảo (scheduler giả, không chờ thật): 6 vòng × 10 câu, 300–2000 người, ~20 bình luận/giây, kèm 5 lần rớt kết nối giữa câu + reconnect, 1 lần LIVE kết thúc giữa vòng, 1 lần khởi động lại server (recovery từ DB tạm).
- Kiểm: không mất/không nhân đôi đáp án và score_events; bảng processed_events được prune (không phình vô hạn); bộ nhớ heap cuối phiên không tăng tuyến tính (đo `process.memoryUsage()` đầu/giữa/cuối, ngưỡng hợp lý, ghi số đo vào report); WS seq tăng đều, không nhảy lùi; audience 35 ghế xoay đúng.
- Lỗi source phát hiện: chỉ báo (input/kỳ vọng/thực tế), dùng `it.fails` như C-0043.
typecheck + test xanh, push `codex1/c0051-soak`, report kèm số đo.
