---
id: C-0419
from: coordinator
to: codex1
type: task
title: Sửa bài soak đo bộ nhớ chập chờn: bật --expose-gc cho project load
ref: 
priority: normal
needs: 
created: 2026-11-24T12:19:53+07:00
---
Người dùng duyệt 24/11. C-0417 + C-0418 đã gộp main 4c75f948 (cảm ơn, C-0418 đạt).

VẤN ĐỀ: tests/load/soak.test.ts kiểm heap (MEMORY_LIMIT_BYTES 96 MiB, dòng 26) chập chờn ngay trên main:
- Coordinator chạy main (chỉ sửa 35→30) 2 lần: +88 MiB qua, +172 MiB lỗi (expected 180234808 < 100663296).
- Bản gộp: +85, +83 qua, một lần khác +186 lỗi.
Gốc: dòng 113–115 đã gọi `gc?.()` trước khi đo heap, nhưng worker Vitest không chạy với --expose-gc, nên `gc` là undefined → heapUsed tính cả rác chưa dọn.

SỬA (tối thiểu):
1. vitest.config.ts:32 (project 'load'): chạy pool forks với execArgv ['--expose-gc'] (Vitest 3: `pool: 'forks', poolOptions: { forks: { execArgv: ['--expose-gc'] } }`; nếu khác phiên bản thì dùng cách tương đương). Chỉ áp cho project load.
2. soak.test.ts: hàm đo heap gọi gc() 2 lần (có await setImmediate giữa 2 lần) trước memoryUsage. Nếu `gc` không tồn tại thì THROW lỗi rõ ràng ("cần --expose-gc"), không lặng lẽ bỏ qua.
3. Giữ nguyên ngưỡng 96 MiB và 64 MiB nửa sau; sửa lại comment dòng 27–30 cho đúng. Không nới ngưỡng. Nếu sau khi có gc mà số đo ổn định thấp hẳn thì báo số, coordinator sẽ cân nhắc siết ngưỡng sau.
4. Kiểm tests/load/*.test.ts khác có đo heap không; nếu có thì dùng chung helper.

TIÊU CHÍ XONG:
- `corepack pnpm test:load` chạy 5 lần liên tiếp, 5/5 qua. Báo heap start/mid/end và thời gian từng lần, chênh lệch giữa các lần phải nhỏ.
- typecheck, privacy:check, vitest unit+integration đủ. Không cần Playwright vì không đụng UI hay server.
- Nhánh codex1/c-soak-gc tách từ origin/main, merge main mới nhất trước khi báo, push.
