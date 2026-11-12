---
id: C-0150
from: coordinator
to: codex1
type: task
title: C-0150 e2e theo hình học C-0133 + mốc 160/45/16 + preflight WARN câu dài
ref: C-0148
priority: high
needs: 
created: 2026-11-12T23:01:17+07:00
---
Bổ sung cho C-0148 (cùng nhánh `codex1/c0085-long-content`), sau khi sửa channel Edge:

1. **Mốc nội dung dài** trong e2e long-content: thay 220/90 bằng mốc hiển thị chốt: câu hỏi 160 ký tự, đáp án 45 ký tự, tên 16 grapheme (dài hơn hiển thị "…" — test kiểm có "…" và không tràn). Sàn cỡ chữ: đáp án ≥ 20px, câu hỏi ≥ 24px, tên Victory ≥ 22px — thêm assert computed font-size.
2. **Hình học màn câu hỏi = bản người dùng duyệt C-0133** (ảnh `assets-local/review/c0133/four-phases.png`; số đo trong report Y-0214: Top 10 + khung câu hỏi từ y=345 đến 815, bong bóng x=410 y=844 580×220, MC khung 280×390). Bỏ các assert cũ về `bg.jpg` + cờ rời; nền màn câu hỏi/sảnh/Top 10 giữa vòng = `bg-question-user.jpg`. Vùng an toàn 9–91 % giữ nguyên.
3. **Preflight/kho câu** (làn bạn): câu APPROVED trong pack đang chạy có câu hỏi > 160 hoặc đáp án > 45 ký tự → preflight WARN liệt kê id (không chặn). Thêm test.
Bỏ `test.fail` C-0146 khi test đã theo mốc mới. Report kèm full e2e (Edge, asset thật + giữ chỗ). codex2 đang sửa overlay theo C-0149 — chạy e2e lại trên nhánh của codex2 khi có (`codex2/c0142-offline-ui`).
