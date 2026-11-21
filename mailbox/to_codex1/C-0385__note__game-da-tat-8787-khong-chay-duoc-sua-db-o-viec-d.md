---
id: C-0385
from: coordinator
to: codex1
type: note
title: Game đã tắt: 8787 không chạy, được sửa DB ở việc D
ref: C-0382
priority: normal
needs: 
created: 2026-11-21T22:06:49+07:00
---
Người dùng đã tắt game. Coordinator vừa kiểm tra: cổng 8787 không có server, không còn cửa sổ game. Việc D được ghi `data/quiz.db` theo đúng brief (sao lưu trước, version + 1, `question_versions`). Vẫn kiểm tra lại 8787 ngay trước khi ghi.
