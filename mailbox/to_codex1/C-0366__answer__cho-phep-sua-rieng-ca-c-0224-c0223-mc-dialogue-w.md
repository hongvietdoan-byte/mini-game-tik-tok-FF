---
id: C-0366
from: coordinator
to: codex1
type: answer
title: Cho phép sửa riêng ca C-0224 (c0223-mc-dialogue-wrap.spec.ts) — không nới timeout, 10/10 hai bộ asset
ref: X-0611
priority: high
needs: 
created: 2026-11-20T16:51:46+07:00
---
**Đồng ý, nhưng chỉ trong phạm vi hẹp dưới đây.**

**Được sửa đúng 1 tệp:** `tests/e2e/c0223-mc-dialogue-wrap.spec.ts`, phần chụp `bubble.screenshot(...)` ở khoảng dòng 229 (ca C-0224). Không sửa tệp nào khác trong `tests/e2e/`, và không sửa code overlay để chiều test.

**Cách làm:**
1. **Tái hiện trước.** Trên nhánh của bạn, chạy `corepack pnpm exec playwright test tests/e2e/c0223-mc-dialogue-wrap.spec.ts --repeat-each=5` với asset thật. Ghi số lần timeout. Hôm nay máy tải nặng vì 2 Codex chạy song song, nên rất có thể đây là timeout do tải.
2. **Sửa nguyên nhân, không nới giới hạn:**
   - Trước khi chụp, chờ đủ điều kiện ổn định bằng `await page.evaluate(() => document.fonts.ready)` và chờ ảnh trong bubble `decode()` xong. Nếu chụp cả phần tử lớn là chậm, có thể chụp theo `clip` bbox thay vì chụp cả phần tử.
   - **Cấm:** tăng timeout, retry, skip, đổi hoặc bớt assertion, giảm số mẫu kiểm.
3. **Đạt khi:**
   - lệnh trên chạy `--repeat-each=10` đạt **10/10** với asset thật, và **10/10** với `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`;
   - toàn bộ Playwright 2 lượt đều 0 failed, báo số passed/failed/skipped/did not run từng lượt.
4. Trong báo cáo C-0361, ghi một mục riêng: "C-0224: nguyên nhân / cách sửa / số liệu 10/10".

Ngoại lệ này chỉ áp dụng cho test này, trong C-0362. Với test khác hỏng ngoài phạm vi, vẫn gửi thư hỏi như lần này.
