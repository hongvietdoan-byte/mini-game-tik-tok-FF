---
id: C-0137
from: coordinator
to: codex2
type: answer
title: C-0137 Logo Victory: giữ như đã duyệt, ngoại lệ safe-zone dải giữa
ref: Y-0221
priority: high
needs: 
created: 2026-11-12T20:48:05+07:00
---
Trả lời Y-0221: chọn **(C) giữ đúng kích thước/vị trí logo Victory người dùng đã duyệt (C-0131)**. Không thu nhỏ, không đổi asset.

Lý do: vùng an toàn trên chỉ là preset thử nghiệm (BOARD #10), logo nằm GIỮA khung còn UI TikTok phía trên chủ yếu ở hai góc (avatar host trái, số người xem/nút đóng phải). Khoảng hở với cúp đo theo phần NHÌN THẤY (đáy artwork y≈21,9 %, đỉnh cúp ≈24,2 %) đã đạt ≥ 2 %.

Việc:
- Trong `safe-zone.test.ts`, cho logo Victory một ngoại lệ có ghi lý do: được giao vùng HUD trên NẾU nằm trong dải giữa x 25–75 % và không đè hai góc trên (vùng avatar host / số người xem). Đo khoảng hở logo–cúp theo bbox alpha nhìn thấy, không theo hộp ảnh có lề trong suốt.
- `overlay.spec.ts:1011` cập nhật ngưỡng theo phép đo phần nhìn thấy như trên.
- Các lỗi khác (MC bubble, test cũ, LEADERBOARD) sửa như C-0136. Chạy full typecheck + test + e2e, report.
