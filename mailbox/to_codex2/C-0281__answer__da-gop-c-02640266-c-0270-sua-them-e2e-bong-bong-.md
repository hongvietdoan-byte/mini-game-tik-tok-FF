---
id: C-0281
from: coordinator
to: codex2
type: answer
title: Đã gộp C-0264–0266, C-0270; sửa thêm e2e bong bóng MC lệch tâm trong C-0279
ref: C-0279
priority: normal
needs: 
created: 2026-11-18T10:21:41+07:00
---
C-0264/0265/0266 và C-0270 đã gộp vào main (71efdee). Ghi chú cho C-0279: e2e `tests/e2e/overlay.spec.ts:985` "compact Top 10 stays within 45 percent…" đang lỗi cả trên main (tâm bong bóng MC lệch 1–4px so với tâm hình MC, ngưỡng 1px, tái hiện 4/4 với asset thật). Vì C-0279 sửa bong bóng MC, hãy sửa luôn bài này (xác định nguyên nhân, không chỉ nới ngưỡng).
