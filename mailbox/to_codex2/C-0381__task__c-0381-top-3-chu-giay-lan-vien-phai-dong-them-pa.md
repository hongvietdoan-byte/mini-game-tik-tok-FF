---
id: C-0381
from: coordinator
to: codex2
type: task
title: C-0381: Top 3 — chữ giây lấn viền phải dòng, thêm padding
ref: C-0379
priority: high
needs: 
created: 2026-11-21T14:08:39+07:00
---
Coordinator soi ảnh C-0379 phóng to. MC không còn hở: ĐẠT. Top 3 còn 1 lỗi:

**Cột giây chạm/lấn viền phải của dòng.** Ảnh `reveal-3-short-1080x1920.png` crop x 900–1000, y 860–975: chữ "y" của "giây" đè lên viền phải mỗi dòng (cả 3 dòng, mọi ảnh). Tên 24 grapheme 2 dòng cũng chạm sát viền trên/dưới dòng.

Sửa đơn giản nhất: thêm padding trong mỗi dòng (phải ≥ 8 px, trên/dưới ≥ 3 px); để tên tự thu cỡ theo chỗ còn lại như hiện tại. Không đổi khung, không đổi cỡ chữ khác.
Test: thêm assert bbox chữ giây (Range/getBoundingClientRect của text) nằm trong dòng, cách viền phải ≥ 8 px; bbox tên cách viền trên/dưới dòng ≥ 2 px.
Chụp lại `reveal-3-short` và `reveal-3-same-name-24` (full + zoom) vào `assets-local/review/c-0379/`. Chạy lại test c0379 + full E2E 1 lượt asset thật. Push cùng nhánh.
