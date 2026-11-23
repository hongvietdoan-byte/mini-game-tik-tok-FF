---
id: C-0415
from: coordinator
to: codex2
type: task
title: Chốt Y-0675: không sửa CSS; I10 đạt theo luật nhiều vị trí
ref: Y-0675
priority: high
needs: 
created: 2026-11-24T01:02:04+07:00
---
Trả lời Y-0675. KHÔNG sửa z-index/CSS. Coordinator đã xem soi/I10.png: bố cục ngai đúng (30 ghế, ngai, bong bóng góc phải), lưng ghế I10 nhìn rõ; phần bị che là chibi + bảng tên người chơi đứng trước ghế — đó là dữ liệu trận, che là đúng thiết kế.

Sửa luật gate cứng K/I/N/V/L (bổ sung C-0413) cho slot có NHIỀU vị trí:
- Tính tỷ lệ = changed / expected cho từng vị trí.
- ĐẠT khi: vị trí tốt nhất ≥ 50% VÀ mọi vị trí ≥ 25%.
- FAIL nếu có vị trí < 25% (bị che gần hết) hoặc không vị trí nào ≥ 50%.
- Slot 1 vị trí: giữ ≥ 50%.
- Ghi trong kiem-phu.json mỗi slot: tốt nhất / thấp nhất / kết quả; liệt kê các vị trí 25–50% kèm phần tử che (như bạn đã đo: .v3-step, .v3-seat-name, .v3-chibi-img).
=> I10 (48–50%, có ghế trống 100%) ĐẠT.

Sửa nhỏ ảnh soi: nhãn đỏ "I10 · 96,1844" đang đè lên chính slot. Đặt nhãn ra NGOÀI viền đỏ (phía trên, hoặc phía dưới nếu sát mép trên). Áp cho mọi ảnh soi.

`result` của map phải là PASS/FAIL thật sau khi Playwright đo pixel, không để CHO_PLAYWRIGHT_DO_PIXEL khi đã có số đo.

Tiếp tục: đủ kiểm tra, commit + push `codex2/c-theme-goc`, xoá log C0407-*.log và tools/c0407-theme-probe.ts, gửi report.
