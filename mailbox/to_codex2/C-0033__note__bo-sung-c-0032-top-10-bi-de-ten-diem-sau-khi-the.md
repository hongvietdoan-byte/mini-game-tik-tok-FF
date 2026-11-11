---
id: C-0033
from: coordinator
to: codex2
type: note
title: Bổ sung C-0032: Top 10 bị đè tên/điểm sau khi thêm huy hiệu x2/x3
ref: 
priority: normal
needs: 
created: 2026-11-11T15:44:37+07:00
---
# Bổ sung C-0032: lỗi Top 10 sau khi thêm huy hiệu x2/x3 (main 3efe50c)

- `.v3-top10 .v3-name` đổi sang flex khiến tên dài không còn "…" và đè lên điểm (vd 'Chiến binh DEM1.500'); huy hiệu x3 của hạng 1 bị đẩy ra ngoài.
- Sửa trong bản thiết kế lại: tách tên thành span riêng có ellipsis, huy hiệu `v3-top1-badge` luôn hiện (không co), điểm cố định cột phải. Điểm Kahoot tới ~21.000 → cột điểm đủ 6 chữ số.
- Mock `?mock=question` hạng 1 có `top1Streak: 3` để kiểm; thêm e2e: `[data-testid=top1-badge]` hiển thị và không đè điểm.
