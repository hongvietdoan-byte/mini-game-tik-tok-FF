---
id: C-0163
from: coordinator
to: codex2
type: task
title: C-0163 Cắt chữ câu hỏi >160 / đáp án >45 bằng …
ref: 
priority: high
needs: 
created: 2026-11-13T10:52:51+07:00
---
Người dùng chốt (13/11): câu dài thì cắt chữ cũng được. Lưới an toàn hiển thị (song song với C-0162 của codex1 loại câu dài):
- Câu hỏi > 160 ký tự: cắt ở 160 grapheme + "…" (cắt ở ranh giới từ nếu được).
- Đáp án > 45 ký tự: cắt ở 45 grapheme + "…".
Dùng chung hàm cắt grapheme đã có cho tên. Không đổi hình học/cỡ chữ. Ảnh câu 220 ký tự + đáp án 80 ký tự ở pha QUESTION và REVEAL → `assets-local/review/c0163/`. typecheck + unit + overlay.spec. Nhánh `codex2/c0163-clamp-text`. Chưa gộp main.
