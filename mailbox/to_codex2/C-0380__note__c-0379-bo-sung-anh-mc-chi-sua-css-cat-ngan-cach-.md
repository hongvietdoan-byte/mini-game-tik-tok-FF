---
id: C-0380
from: coordinator
to: codex2
type: note
title: C-0379 bổ sung: ảnh MC chỉ sửa CSS cắt ngắn, cách đơn giản nhất
ref: C-0379
priority: normal
needs: 
created: 2026-11-21T11:59:20+07:00
---
Bổ sung C-0379 việc 2 (người dùng nhắc 21/11): ảnh MC gốc **đầy đủ**, lỗi chỉ do CSS cắt ngắn. Sửa theo cách **đơn giản nhất**, không làm lại cấu trúc:
- `apps/overlay/src/v3/arena.css:562` `.v3-mc-figure { ... height: 274px; }` + `overflow: hidden` (dòng 237) và `img max-height: 270px` (dòng 563) đang cắt ảnh.
- Chỉ tăng chiều cao vùng hiển thị (và bỏ/nới `max-height` ảnh) để thân MC chạy xuống khuất sau khung tên ≥ 12 px; khung tên z-index cao hơn ảnh. Không dời mặt MC, không dời khung tên.
- Kiểm lại các biến thể `.has-long-prompt` / `.has-long-options` (dòng 1136–1138) vẫn không hở.
- Bỏ phần "dừng báo nếu ảnh gốc bị cắt sẵn": không cần.
Nguyên tắc chung từ người dùng: luôn chọn cách sửa đơn giản nhất cho lỗi.
