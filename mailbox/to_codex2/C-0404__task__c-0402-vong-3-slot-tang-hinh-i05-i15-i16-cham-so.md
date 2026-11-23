---
id: C-0404
from: coordinator
to: codex2
type: task
title: C-0402 vòng 3: slot tàng hình I05/I15/I16 + chấm SO-DO 16/17 + kiểm phần tử hiện
ref: C-0402
priority: high
needs: 
created: 2026-11-23T11:40:47+07:00
---
# C-0402 vòng 3: slot "tàng hình" — ảnh soi chụp lúc phần tử đang ẩn

Người dùng soi bộ theme và báo: "16 nhìn như tàng hình". Coordinator đã kiểm tra và thấy đúng.

## Lỗi
1. **I05 / I15 / I16** (huy hiệu hạng 1/2/3 trong Top 3 nhanh nhất, `.v3-question-top3 .v3-top3-row[data-rank] .v3-top3-rank`):
   - `soi/I16.png` chụp màn REVEAL ở thời điểm bảng Top 3 nhanh nhất CHƯA hiện. Màn đang hiện bong bóng MC "Chính xác! Đáp án B", nên khung đỏ 24×17 tại (758, 945) chỉ vào giữa câu thoại, không có gì để thấy.
   - Ảnh `fastest-a` và `fastest-b` cũng chỉ hiện "NHANH NHẤT" 1 người, không có 3 hàng.
   - Hệ quả: `default.png` trống, contact ghi "TRỐNG (cố ý)" — sai, vì trên live huy hiệu này có hiện (C-0378/C-0381 `questionTop3`).
2. **Sơ đồ `SO-DO.png`, chấm 16 (`mc.static`)** nằm ở góc trên phải bong bóng thoại (stage ≈ x 900, y 790), không nằm trên ảnh MC Kelly (x ≈ 100–420). Người xem sẽ tưởng slot 16 không có hình. Chấm 17 (`mc.sequenceDir`) cũng đang nằm trên khung câu hỏi.

## Cách sửa (tối thiểu)
- I05/I15/I16: dựng cảnh REVEAL có `questionTop3` đủ 3 người (dữ liệu mock), chờ hàng Top 3 hiện rõ (opacity 1, đã hết animation), rồi mới chụp `soi/` và `default.png`. Đổi DOC-TOI/ghi chú: bỏ câu "Mặc định trống".
- Chấm SO-DO: đặt chấm theo bbox của **phần tử hiển thị thật** (ảnh `.v3-mc-figure img`), không theo container. Chấm 17 cũng vậy.
- **Thêm kiểm tự động chống lặp lại**: khi chụp mỗi slot (cả `soi/` lẫn `default.png`), kiểm phần tử đó thật sự hiện. Cụ thể: `getComputedStyle` không có `display:none`/`visibility:hidden`, opacity hiệu dụng (nhân cả cha) > 0.5, bbox ≥ 4×4 px, và `document.elementFromPoint(tâm bbox)` là chính nó hoặc con của nó. Slot không đạt mà không nằm trong danh sách "trống cố ý" có lý do thì theme:map phải FAIL, ghi rõ ID và cảnh.
- Soát lại toàn bộ 74 slot với kiểm trên. Các slot đang "TRỐNG (cố ý)" (K18, K19, K24, K30, K32, K33, I14, H01–H03) phải được kiểm lại xem có thật trống không; slot nào thực ra có hình thì chụp lại đúng cảnh.

## Ca biên
- Top 3 nhanh nhất chỉ có 1 hoặc 2 người: huy hiệu thiếu hàng thì không chụp ở cảnh đó. Luôn dùng cảnh đủ 3 người để chụp.
- Không đổi bố cục/CSS hiển thị của overlay. Chỉ sửa tool chụp/map và dữ liệu mock của tool.

## Kiểm tra trước khi báo
- `theme:export-default` + `theme:map` + `theme:validate` PASS. Kiểm "phần tử hiện" phải 0 lỗi.
- Gửi kèm đường dẫn: `soi/I05.png`, `soi/I16.png`, `SO-DO.png`, `default-contact.png`. Tự mở ảnh, phóng to các ô I05/I15/I16 và chấm 16/17 để xác nhận.
- vitest unit+integration đủ, typecheck, Playwright asset thật (`QUIZ_DEFAULT_THEME_EXPORT` trỏ gói mới) **2 lượt liên tiếp 0 failed**.
- Không commit ảnh review. Commit + push nhánh `codex2/c-theme-goc`, báo hash.
