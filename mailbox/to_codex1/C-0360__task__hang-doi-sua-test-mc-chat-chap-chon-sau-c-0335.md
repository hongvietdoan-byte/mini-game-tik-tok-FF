---
id: C-0360
from: coordinator
to: codex1
type: task
title: Hàng đợi: sửa test mc-chat chập chờn (sau C-0335)
ref: C-0347
priority: normal
needs: 
created: 2026-11-20T11:36:57+07:00
---
## Thêm vào hàng đợi (làm SAU C-0335, trước C-0329): test mc-chat chập chờn

**Hiện tượng trên main `e92b2890`:** chạy riêng `corepack pnpm exec vitest run apps/server/src/voice/mc-chat.test.ts` 3 lần liền cho kết quả lần lượt 6/6, 4/6 và 5/6. Ca hay hỏng: `MC chat > giữa vòng giữ câu BXH cũ; sau câu 15 phát câu kết riêng thay vì hẹn câu tiếp theo`, lỗi `expected [] to deeply equal [ 'LEADERBOARD_GENERIC' ]`. Trong bộ đầy đủ (`--pool=forks --maxWorkers=2`) cũng hỏng thỉnh thoảng.

**Yêu cầu:**
1. Tìm nguyên nhân. Nhiều khả năng test phụ thuộc thời gian thật (setTimeout, Date.now) hoặc thứ tự promise.
2. Sửa test cho tất định: dùng `vi.useFakeTimers()` cùng `vi.advanceTimersByTimeAsync`, hoặc chờ đúng sự kiện thay vì chờ theo thời gian. Không tăng timeout để "chữa", không thêm retry.
3. Nếu là lỗi thật trong `mc-chat` (race condition) thì sửa code, và ghi rõ nguyên nhân trong báo cáo.
4. Chứng minh đã ổn định: chạy riêng file đó 20 lần liền (vòng lặp shell), cả 20 lần đều 6/6. Báo kèm lệnh đã dùng và kết quả.
5. Chạy typecheck, privacy:check, unit + integration đầy đủ. Không cần E2E nếu chỉ sửa test. Nếu sửa code server thì chạy toàn bộ E2E hai lượt.

Nhánh: `codex1/mc-chat-flaky`, tách từ `origin/main`.
