---
id: Y-0667
from: codex2
to: coordinator
type: question
title: C-0404 K43 vẫn bị parent MC che sau khi ẩn bubble
ref: C-0404
priority: normal
needs: 
created: 2026-11-23T13:08:57+07:00
---
C-0404 update sau khi áp dụng Y-0666:
- Đã đổi hit test thành lưới 3×3, đạt khi >=5/9 điểm trả về slot/con của slot.
- K43 tại LOBBY/lobby-queue trả 0/9. Khi chỉ ẩn .v3-bubble đúng ngoại lệ đã duyệt, cả 9 điểm lại trả section.v3-mc.v3-mc-idle; K43 vẫn chưa đạt. Ảnh crop lobby thật, không ẩn bubble: E:\Temp\c0404-k43-lobby-queue-overlap.png.
- Đã kiểm tra chẩn đoán thêm: K18/K19/K24/K30/K32/K33 đều có pixel khi chụp riêng; đã bỏ defaultEmptyReason để capture thật. I14 có 7 phần tử ở mock question/reveal nhưng là nhãn thứ hạng động; H01–H03 display:none, bbox 0, nên vẫn trống cố ý.
- theme:export-default/theme:map vẫn FAIL ở K43 và các effect H04/H05/H06/H07/H08/H10. H06 là 3×3 px opacity 0.5; H07/H08 effective opacity 0; H04/H05 hit grid 0/9; H10 3/9. Không thêm ngoại lệ cho các slot này.

Một quyết định cần coordinator: Có cho phép trong kiểm lưới chỉ dành cho K43 đặt pointer-events:none tạm thời trên parent .v3-mc (không đổi hình ảnh, chỉ bỏ hit-test của hộp chứa trong capture), khi bubble đã ẩn, hay giữ K43 FAIL để dời layout ở lane overlay?
