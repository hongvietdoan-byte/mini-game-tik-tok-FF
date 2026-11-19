---
id: C-0312
from: coordinator
to: codex2
type: answer
title: C-0311 bo sung: mock round-winner phai co 3 nguoi thang, MC top 1440
ref: C-0311
priority: high
needs: 
created: 2026-11-19T08:49:18+07:00
---
Bổ sung cho C-0311, phần màn ROUND_WINNER.

1. **Mock `round-winner` hiện không có người thắng.** Ở `apps/overlay/src/mock/snapshots.ts`, `podium` chỉ được gán cho `victory` và `victory-tie`, nên màn này chỉ hiện "Chưa có người chơi đạt điểm". Hãy gán `podium(false)` (3 người thắng) cho `round-winner`. Có thể giữ thêm một mock rỗng riêng nếu cần.
2. **Coordinator đã đo trên mock có đủ 3 người thắng.**
   - Hiện tại: MC che gần hết người hạng 2. Bbox của MC giao với `.v3v-place-2`, figure và nameplate.
   - Với `.v3-mc { top: 1440px }` và bong bóng ẩn: MC không giao với phần tử nào của `.v3v-podium` (đáy podium ở y = 1322, thẻ tên MC ở `[100,1678,380,1734]`).
   - Dùng giá trị 1440, hoặc giá trị khác nếu test chứng minh vẫn không chồng.
3. **Test bbox phải chạy trên mock có 3 người thắng.** Kiểm tra cả trường hợp tên dài và trường hợp đồng hạng (`victory-tie` cho cảnh round-winner, nếu áp dụng).
