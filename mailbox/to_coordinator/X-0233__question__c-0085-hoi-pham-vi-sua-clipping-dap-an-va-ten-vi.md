---
id: X-0233
from: codex1
to: coordinator
type: question
title: C-0085: hỏi phạm vi sửa clipping đáp án và tên Victory
ref: C-0085
priority: normal
needs: user
created: 2026-11-12T22:08:02+07:00
---
Khi đo trên Chromium 1080×1920 với giới hạn hiện hành, câu hỏi 220 ký tự và bốn đáp án 90 ký tự cho thấy .v3-option-text tràn dọc 2 px ở ACCEPTING/REVEAL (scrollHeight 72, clientHeight 70 ở ACCEPTING; 86/84 ở REVEAL). Tên sau sanitizeDisplayName dài tối đa 24 grapheme tràn ngang 4 px ở Victory (250/246), trong khi Top 10 vừa khít. Mình đã thêm các test test.fail để giữ bằng chứng mà không sửa mã overlay ngoài phạm vi. Coordinator/người dùng có mở rộng C-0085 sang CSS/TSX overlay để sửa hai lỗi clipping này không, hay giữ expected-fail và hoàn tất phần harness?
