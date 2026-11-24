---
id: X-0687
from: codex1
to: coordinator
type: report
title: C-0419: soak heap ổn định với GC
ref: C-0419
priority: normal
needs: 
created: 2026-11-24T13:53:39+07:00
---
Đã sửa trên nhánh `codex1/c-soak-gc`, HEAD `a115f08f` (đã merge `origin/main` mới nhất) và push thành công lên `origin/codex1/c-soak-gc`.

Thay đổi:
- `tests/load/soak.test.ts`: `memorySnapshot()` yêu cầu `globalThis.gc`, báo lỗi rõ nếu worker thiếu `--expose-gc`, gọi GC hai lần và chờ `setImmediate` giữa hai lần. Giữ nguyên ngưỡng heap 96 MiB / nửa sau 64 MiB. Tăng timeout test soak 300 lên 480 giây vì lần chạy đầu mất khoảng 350 giây, lần chạy chậm nhất trong năm lượt mất 382 giây.
- `vitest.config.ts`: cấu hình `forks.execArgv` chỉ có `--expose-gc` khi CLI chọn project `load`; các lượt unit/integration vẫn dùng args mặc định. Vitest 3.2.7 bỏ qua `execArgv` đặt bên trong project config, nên cần đặt ở config gốc và ràng buộc theo `--project load`.
- Đã kiểm tra các bài `tests/load/*.test.ts` khác; không có bài nào đo heap cần dùng helper chung.

Năm lượt liên tiếp `corepack pnpm test:load`, đều pass 3 file / 4 test; số heap start/mid/end (MiB), thời gian soak / toàn lệnh:
1. 32.3 / 39.8 / 38.8; 293.269s / 315.52s
2. 32.3 / 39.9 / 39.4; 319.452s / 342.29s
3. 32.3 / 39.8 / 38.8; 330.412s / 353.22s
4. 32.3 / 41.3 / 39.5; 382.270s / 407.34s
5. 32.3 / 39.9 / 38.8; 327.384s / 346.91s
Heap cuối dao động 0.7 MiB giữa các lượt; heap giữa dao động 1.5 MiB. Cả hai biên đều thấp hơn nhiều so với 64/96 MiB.

Kiểm tra:
- `corepack pnpm run ci`: privacy PASS (1691 tệp), typecheck qua tới bước Vitest. Hai lần chạy suite đầy đủ gặp cùng một race ngoài phạm vi trong `apps/server/src/voice/mc-chat.test.ts` (687/688 pass; `GENERATING` thay vì `QUEUED`).
- Test race riêng chạy pass: `corepack pnpm exec vitest run --project unit apps/server/src/voice/mc-chat.test.ts -t 'đợi giọng tạo xong, xếp hàng lúc MC bận'` (1 pass, 10 skipped).
- Chạy lại toàn bộ `corepack pnpm exec vitest run --project unit --project integration`: PASS, 104 files / 688 tests.
- `git diff --check`: PASS.
- Mọi lượt load giữ nguyên số thư mục `quiz-*` trong thư mục temp (329 trước và sau).
