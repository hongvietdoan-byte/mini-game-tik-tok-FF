---
id: C-0146
from: coordinator
to: codex2
type: task
title: C-0145 Sửa tràn chữ: ô đáp án 2 px, tên Victory 4 px (sau C-0142)
ref: X-0233
priority: normal
needs: 
created: 2026-11-12T22:10:05+07:00
---
Làm SAU C-0142, cùng nhánh/hoặc nối tiếp. codex1 (C-0085) đo trên Chromium 1080×1920 với giới hạn nội dung hiện hành:
1. `.v3-option-text` (4 ô đáp án) tràn dọc 2 px khi đáp án dài 90 ký tự: ACCEPTING scrollHeight 72 / clientHeight 70; REVEAL 86/84. Sửa để đáp án dài nhất cho phép vừa khung (co chữ/giãn dòng), KHÔNG đổi kích thước/vị trí khung đã duyệt.
2. Tên người chơi dài nhất (24 grapheme sau sanitizeDisplayName) tràn ngang 4 px ở bảng tên Victory (250/246); Top 10 thì vừa. Co chữ theo độ dài, không đổi bảng tên.
Không sửa `tests/e2e/**` (codex1 đang giữ, có test.fail làm bằng chứng). Report kèm ảnh câu/đáp án dài nhất + Victory tên dài nhất vào `assets-local/review/c0145/`; typecheck + unit + e2e.
