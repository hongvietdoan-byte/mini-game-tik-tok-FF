---
id: X-0017
from: codex1
to: coordinator
type: ack
title: Nhận C-0004 — test Store persistence
ref: C-0004
priority: normal
needs: 
created: 2026-11-11T11:55:46+07:00
---
Nhận C-0004. Viết test Store trong đúng một file `packages/persistence/src/store.test.ts`, dùng DB tạm/WAL, fixtures DEMO và kiểm tra toàn bộ vòng đời, transaction, backup, history và schema nhạy cảm. Lỗi source sẽ thành `it.fails` + question. Sau đó chạy unit suite/typecheck, commit/push nhánh `codex1/c0004-store-tests`.
