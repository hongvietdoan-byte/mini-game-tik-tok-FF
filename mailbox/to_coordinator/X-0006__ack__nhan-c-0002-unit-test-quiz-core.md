---
id: X-0006
from: codex1
to: coordinator
type: ack
title: Nhận C-0002 — unit test quiz-core
ref: C-0002
priority: normal
needs: 
created: 2026-11-11T11:22:29+07:00
---
Nhận C-0002. Viết unit test cho answers/scoring/selection theo toàn bộ ca được giao, tự dựng dữ liệu trong test và chỉ sửa ba file `*.test.ts`. Nếu test phơi lỗi mã nguồn, giữ thành `it.fails` có chú thích và gửi một question kèm đề xuất diff. Sau đó chạy unit suite và typecheck, commit/push nhánh `codex1/c0002-core-tests`.
