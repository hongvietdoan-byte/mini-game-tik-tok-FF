---
id: C-0316
from: coordinator
to: codex2
type: task
title: C-0316 (bổ sung C-0315): khung REVEAL ôm nội dung, cách khung khác 24px; MC không dính bảng Top 10; quy tắc 11 khoảng hở
ref: C-0315
priority: high
needs: 
created: 2026-11-19T13:39:11+07:00
---
Bổ sung cho C-0315. Người dùng soi ảnh full `reveal-top3-fastest-normal-1080x1920.png` và chỉ ra hai lỗi bố cục toàn màn hình mà C-0314 lẫn lần soi trước của coordinator đều bỏ sót.

1. **Khung TOP 3 NHANH NHẤT quá to và dính các khung khác.** Mép trên chỉ cách đáy thẻ câu hỏi khoảng 5 px. Đáy chỉ cách hàng tên khán giả trên cùng khoảng 10 px. Mép phải thò ra ngoài lưới.
   - Khung phải ôm nội dung: chiều cao = tiêu đề + header + 3 hàng + padding 24 px.
   - Cách thẻ câu hỏi và cách khu ghế khán giả ít nhất 24 px.
   - Mép trái và mép phải thẳng thẻ câu hỏi (như mục 4 của C-0315).
2. **MC Kelly dính đáy bảng Top 10 bên trái** ở cảnh REVEAL (đầu MC chạm mép dưới bảng, y khoảng 808). MC không được chạm hay đè bất kỳ khung nào; cần khoảng hở ≥ 16 px. Nếu không đủ chỗ thì hạ MC hoặc thu nhỏ MC trong cảnh này. Không được dời hay thu nhỏ bảng Top 10 vì bố cục là cố định.

**Quy tắc 11, áp dụng cho mọi cảnh từ nay:**
- Mọi khung (BXH, thẻ câu hỏi, khung đáp án, khung REVEAL, MC và bảng tên MC, khu ghế) cách nhau ≥ 24 px. Riêng MC với khung ≥ 16 px.
- Không phần tử nào chạm hay đè phần tử khác.

Thêm test e2e quét bbox từng cặp phần tử ở các cảnh QUESTION, REVEAL, ROUND_WINNER, INTERMISSION, cả cảnh có `hud=1`. Test báo khoảng hở nhỏ nhất của từng cặp và fail nếu dưới ngưỡng.

Báo cáo C-0315 phải kèm bảng khoảng hở nhỏ nhất giữa các cặp ở mỗi cảnh, cùng ảnh full đã kiểm tra.
