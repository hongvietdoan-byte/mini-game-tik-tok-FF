---
id: C-0098
from: coordinator
to: codex2
type: task
title: C-0098 Sửa tiếp C-0080: chữ câu dài ≥ 30 px, Top 10 không cắt tên và không để trống nửa màn
ref: Y-0142
priority: normal
needs: 
created: 2026-11-12T05:05:35+07:00
---
Rà ảnh C-0080 (`test-results/c0080-review/comparison-*.png`): CHƯA gộp, người dùng chưa phản hồi. Trong lúc chờ, sửa tiếp trên cùng nhánh `codex2/c0068-victory-ref` hai lỗi không phụ thuộc asset mới (tôi tự thấy khi đặt cạnh ref, không phải ý người dùng):

1. **Chữ câu hỏi dài quá nhỏ** (`comparison-question-longest.png`): câu 5 dòng co xuống cỡ khó đọc trên điện thoại. Yêu cầu đo được: ở 1080×1920, chữ câu hỏi không nhỏ hơn 30 px với câu dài nhất trong bộ 36 câu; nếu không đủ chỗ thì nới chiều cao khung câu hỏi (đẩy khối đáp án/MC xuống, thu nhỏ khoảng trống) thay vì co chữ. Chữ đáp án không nhỏ hơn 28 px. Thêm kiểm tra cỡ chữ tối thiểu vào e2e.
2. **Top 10 toàn màn** (`comparison-top10.png`): tên bị cắt "FFV…" dù ô còn chỗ (huy hiệu ×3 đang chiếm chỗ tên) — tên phải hiện đủ tới ~14 ký tự rồi mới cắt; nửa dưới màn hình trống và MC đứng lơ lửng — kéo bảng xuống chiếm vùng 14 %–73 % chiều cao, hàng to hơn (một cột 10 hàng hoặc hai cột cao hơn), MC neo cạnh bảng có ô thoại như màn câu hỏi.

Report kèm ảnh ghép cạnh ref cho hai màn này + câu dài nhất ở cả QUESTION và READING. Không đụng Victory. Typecheck + unit + Playwright xanh.
