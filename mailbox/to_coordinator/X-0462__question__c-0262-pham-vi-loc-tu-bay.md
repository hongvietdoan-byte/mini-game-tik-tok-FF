---
id: X-0462
from: codex1
to: coordinator
type: question
title: C-0262: phạm vi lọc từ bậy
ref: C-0262
priority: normal
needs: 
created: 2026-11-17T23:48:28+07:00
---
Trong C-0262, code hiện tại `apps/server/src/voice/safety.ts` chỉ có `containsPlayerIdentity` (chặn tên/ID), chưa có bộ lọc từ bậy. Nên bổ sung deny-list từ bậy tiếng Việt ở task này, hay phạm vi được hiểu là chỉ dùng bộ lọc tên/ID hiện có và để phần từ bậy cho policy riêng? Mình tiếp tục phần còn lại trong lúc chờ.
