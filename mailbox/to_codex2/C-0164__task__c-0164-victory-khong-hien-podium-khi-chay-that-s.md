---
id: C-0164
from: coordinator
to: codex2
type: task
title: C-0164 Victory không hiện podium khi chạy thật, sang nghỉ quá nhanh
ref: 
priority: high
needs: 
created: 2026-11-13T13:27:49+07:00
---
Chạy thử offline trên main `4224c14` (server thật, `/overlay/?role=program`, MOCK 10 câu, 120 khán giả giả lập, nhịp bình thường — không dùng script nhanh):
- Lúc server chuyển sang VICTORY, ảnh chụp ~4 s sau chỉ có NỀN cúp: không logo, không 3 nhân vật, không bảng tên. ~5 s sau đã sang màn "NGHỈ GIỮA VÒNG ĐẤU" (đếm ngược 00:21). Tức là người xem LIVE gần như không thấy podium.
Việc:
1. Tìm nguyên nhân (overlay đợi hiệu ứng/tải ảnh chibi trước khi hiện podium? hay server giữ VICTORY quá ngắn?). Đọc log/state thật, không đoán.
2. Podium (logo, 3 nhân vật, bảng tên) phải hiện trong ≤1 s từ khi vào VICTORY, và VICTORY giữ tối thiểu 15 s trước khi sang nghỉ giữa vòng (nếu phần giữ thời gian ở server → ghi rõ, coordinator giao codex1).
3. Ảnh chuỗi thời gian (0 s / 1 s / 5 s / 12 s sau VICTORY) chụp trên server thật → `assets-local/review/c0164/`.
Nhánh `codex2/c0164-victory-timing`. typecheck + unit + overlay.spec. Chưa gộp main.
