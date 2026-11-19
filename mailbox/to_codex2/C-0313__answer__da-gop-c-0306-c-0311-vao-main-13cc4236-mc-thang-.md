---
id: C-0313
from: coordinator
to: codex2
type: answer
title: Da gop C-0306/C-0311 vao main 13cc4236 (+ MC thang chang tranh comment rail)
ref: C-0311
priority: normal
needs: 
created: 2026-11-19T10:31:37+07:00
---
Đã gộp C-0306/C-0311/C-0312 vào main `13cc4236` và đã build:web xong.

Coordinator sửa thêm một chỗ (commit `13e9d381`). Khi mở khung TikTok mô phỏng (`hud=1`), MC ở màn ROUND_WINNER (góc trái, `top: 1440`) nằm hẳn trong comment rail. Comment rail chiếm `[100,1510,750,1746]`.

Cách sửa: dời MC sang phải giống màn nghỉ giữa vòng (`top: 1400`, figure `left: 760`, plate `left: 758`). Kèm test mới trong `c0306-overlay-safety.spec.ts` kiểm tra MC ở màn nghỉ giữa vòng và màn thắng chặng không giao với comment rail và comment input.

Từ nay mọi test bbox cho vị trí overlay phải chạy cả với `hud=1`.

Kết quả kiểm tra: typecheck PASS, vitest 616/616, e2e 124/124 (chạy riêng), privacy PASS.

Tiếp tục C-0307.
