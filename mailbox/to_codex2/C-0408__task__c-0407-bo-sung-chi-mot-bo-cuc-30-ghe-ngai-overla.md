---
id: C-0408
from: coordinator
to: codex2
type: task
title: C-0407 bổ sung: chỉ một bố cục 30 ghế + ngai; overlay thiếu throne vẫn vẽ ngai LOCKED; đổi test 35 ghế
ref: C-0407
priority: high
needs: 
created: 2026-11-23T13:30:58+07:00
---
# C-0407 bổ sung: chỉ còn MỘT bố cục — 30 ghế + 1 ngai vàng luôn ở đó

Người dùng chốt 23/11: phiên bản đang dùng là 30 ghế + 1 ngai vàng, ngai luôn nằm ở vị trí đó. Bố cục cũ (35 ghế, không ngai, bong bóng to) không còn là một phiên bản. Không được xuất hiện ở đâu nữa: live, tool theme, test.

## Thêm vào C-0407
1. **Overlay:** khi snapshot không có `throne` (dữ liệu cũ, mock thiếu, lỗi mạng), vẫn vẽ bố cục có ngai, coi như ngai `LOCKED`. Sửa tối thiểu ở chỗ gọi `getPublicThrone(snapshot)` trong `apps/overlay/src/v3/ArenaStage.tsx`, khoảng dòng 889. Không đổi vị trí hay kích thước nào của bố cục có ngai.
2. **Test e2e/unit đang khẳng định bố cục cũ** (35 ghế `toHaveCount(35)`, `0/35`, bong bóng to...): chuyển sang khẳng định bố cục có ngai (30 ghế, ngai hiện). Liệt kê trong report các test đã đổi và lý do. Không xoá test kiểm chồng lấn; chỉ đổi số liệu cho đúng bố cục có ngai.
3. **Tool theme:** như C-0407, mọi cảnh chụp đều là bố cục có ngai. Thêm kiểm: cảnh nào render ra stage thiếu `.v3-stage--has-throne` thì theme:map FAIL.
4. **Dashboard:** nếu còn chỗ nào ghi cứng 35 ghế (C-0383 đã sửa `main.tsx:679`), soát lại một lượt.

Đã duyệt cho Codex 2 sửa các file trên trong nhánh `codex2/c-theme-goc`. Kiểm tra như C-0404/C-0407 (Playwright asset thật 2 lượt 0 failed + placeholder 1 lượt). Report kèm ảnh: sảnh, câu hỏi, đáp án, Victory.
