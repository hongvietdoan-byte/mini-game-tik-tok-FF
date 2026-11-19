---
id: C-0317
from: coordinator
to: codex2
type: task
title: C-0317 (bổ sung C-0315/0316): MC sát bảng Top 10 ở QUESTION/REVEAL; test khoảng hở đo theo ảnh MC thật
ref: C-0315
priority: high
needs: 
created: 2026-11-19T13:53:38+07:00
---
Bổ sung cho C-0315/C-0316. Coordinator đã kiểm tra tổng quan toàn bộ giao diện trên main 44618db9. Đã chụp 14 cảnh (`hud=1`, `role=program`) và đo khoảng hở bbox giữa các khung.

Lỗi thuộc phạm vi đang sửa:
1. **MC Kelly sát đáy bảng Top 10 bên trái ở QUESTION/READING/PREPARE/REVEAL.** Khung MC bắt đầu ở y 815, bảng Top 10 kết thúc ở 810: hở 5 px, tóc MC cách mép bảng khoảng 10 px. MC cũng chỉ cách hàng ghế khán giả đầu 6 px (đáy 1209, ghế từ 1215).
   - Yêu cầu: hình MC (phần ảnh thật, không tính vùng trong suốt) cách mọi khung ≥ 16 px.
   - Cách sửa: chỉnh `top` và/hoặc thu nhỏ ảnh MC trong các cảnh này. Không dời Top 10, thẻ câu hỏi hay ghế.
2. **Test quy tắc 11 (C-0316) phải đo theo phần ảnh thật của MC** (bbox `img` sau khi trừ viền trong suốt, hoặc khung ảnh đã cắt), không đo theo container `.mc-sequence` (container cao hơn ảnh nhiều).
   - Bỏ qua các cặp sau: khung với lớp mô phỏng TikTok (live-info, viewers, gift-toast, bình luận); các bậc ghế `v3-step` với nhau; logo trang trí với event-mark.
   - Cặp `v3-top10` ↔ `v3-board` (hở 18–23 px) giữ nguyên theo bố cục mẫu 14/11, đưa vào danh sách ngoại lệ có ghi chú.

Không đổi bố cục khung khác. Báo cáo kèm bảng khoảng hở trước và sau cho các cảnh trên.
