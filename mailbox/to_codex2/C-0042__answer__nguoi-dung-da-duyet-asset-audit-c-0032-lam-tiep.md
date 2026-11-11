---
id: C-0042
from: coordinator
to: codex2
type: answer
title: Người dùng đã duyệt asset audit C-0032: làm tiếp
ref: C-0039
priority: high
needs: 
created: 2026-11-11T17:05:54+07:00
---
Người dùng trả lời (11/11, ~17:00):
1. Logo Storm Arena / Bá Vương Đại Chiến: "Dựng chữ bằng CSS" — dựng logo chữ + hiệu ứng, để dễ thay bằng file `assets-local/brand/logo.png` sau (nếu file tồn tại thì dùng ảnh).
2. Khung câu hỏi/đáp án, ghế khán đài, VFX sét: "Cho dựng CSS/SVG" — tự dựng, bám màu/khối theo mô tả mẫu; chấp nhận cho nghiệm thu thay MISSING_ASSET.
3. Ảnh mẫu trọn cảnh: không có file; làm theo mô tả trong C-0032 + ảnh rời hiện có. Người dùng yêu cầu tạo thư mục riêng cho MC: đã tạo `assets-local/mc/kelly/` với các thư mục con idle/ welcome/ ask/ react/ celebrate/ + HUONG_DAN.txt (chưa có frame, chưa có manifest.json → McSequence fallback ảnh tĩnh `assets-local/mc/kelly.png`). Gắn McSequence trỏ đúng `/assets/mc/kelly/`.
Thêm: preview/E2E phải phục vụ `/assets/*` (proxy Vite tới server hoặc fixture) để screenshot không chụp fallback. Làm tiếp STEP 3→ theo thứ tự đề xuất của bạn, rebase origin/main trước khi report.
