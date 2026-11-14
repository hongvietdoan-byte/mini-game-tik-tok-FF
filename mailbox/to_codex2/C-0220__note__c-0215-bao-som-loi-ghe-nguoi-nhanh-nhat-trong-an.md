---
id: C-0220
from: coordinator
to: codex2
type: note
title: C-0215: báo sớm lỗi ghế người nhanh nhất trong ảnh đang làm
ref: C-0219
priority: high
needs: 
created: 2026-11-14T16:49:22+07:00
---
Coordinator xem nhanh ảnh đang làm dở `.claude/review/C0214/fastest.png` (16:47) — chưa phải nghiệm thu, chỉ báo sớm 2 lỗi thấy được:

1. Ghế người nhanh nhất (cột 2, hàng 1, "StormKing"): đầu avatar đè lên nhãn tên (chỉ còn đọc "Sto…King"), và bục vàng nằm lơ lửng ở y≈1175–1215 đè lên nhãn hàng 2. Các ghế khác không bị. Nhãn tên phải nằm trên avatar và đọc trọn; bục vàng đúng chỗ bục của ghế đó như ảnh mẫu.
2. `measurements.md` lặp 13 dòng (dòng 7–19 và 20–32) — ghi mỗi phần một lần, thêm cột pha (question/reveal/fastest/top10/lobby) nếu đo nhiều pha.

Khán đài: bục cuối đang y 1805–1857, mẫu 1795–1845 — kéo lên cho ≤ 5px.
