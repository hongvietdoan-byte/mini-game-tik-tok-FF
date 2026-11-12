---
id: C-0122
from: coordinator
to: codex2
type: task
title: C-0122 Người dùng chốt 2 nền mới: Victory + màn câu hỏi (cờ 8 đội in sẵn)
ref: C-0115
priority: high
needs: 
created: 2026-11-12T14:25:59+07:00
---
Người dùng CHỐT 2 nền mới (12/11 ~14:25). Thay `bg-redraw.jpg` và nền màn câu hỏi hiện tại. Làm TRƯỚC phần còn lại của C-0109/C-0118, trên nhánh `codex2/c0068-victory-ref` (rồi rebase/merge sang `codex2/c0109-sound-fx`).

## Asset (cục bộ, ngoài git, đều 1080×1920)
- Victory: `assets-local/victory/bg-user-cover.jpg` — cúp tím trên bục bát giác, trời bão. (Ảnh gốc người dùng 1086×1448 tỉ lệ 3:4, coordinator đã phóng phủ kín 9:16 và cắt đều hai bên; gốc: `bg-user-src.png`.)
- Màn câu hỏi (cả các pha QUESTION/READING/ACCEPTING/REVEAL dùng chung nền sân): `assets-local/arena/bg-question-user.jpg` — trời xanh, 8 cờ đội in SẴN trong nền, sân vận động tím.

## Việc
1. Victory: đổi hằng số nền (C-0115) sang `bg-user-cover.jpg`. Không lớp phủ làm bạc màu/đổi tông. Mặt bục giữa ≈ y 62–73 %, hai bục bên ≈ y 62–66 % ở mép trái/phải; đỉnh cúp ≈ y 24 %. Chỉnh lại vị trí chibi + bảng tên bằng các biến đã có để chibi đứng TRÊN mặt bục, không che thân cúp quá nửa; logo chính thức nằm trên đỉnh cúp, không đè cúp (giữ các yêu cầu C-0116).
2. Màn câu hỏi: nền = `bg-question-user.jpg` phủ kín, tỉ lệ 1:1. 8 cờ đội trong nền nằm ở y ≈ 14–32 % → BỎ lớp cờ tự dựng (`assets-local/arena/flags`) để không bị trùng. Cờ trong nền phải nhìn thấy được: header/logo/ô câu hỏi không che quá ~1/3 dãy cờ. Nếu bố cục hiện tại buộc phải che nhiều hơn, KHÔNG tự đổi bố cục lớn — report kèm ảnh và 2 phương án để coordinator hỏi người dùng.
3. Top 10 / đồng hạng: giữ nền đang dùng trừ khi chúng đang dùng chung hằng số nền sân — khi đó ghi rõ trong report.

## Nghiệm thu
- Ảnh ghép NỀN GỐC | RENDER cho: câu hỏi (ACCEPTING, câu dài nhất), REVEAL, Victory thường, Victory đồng hạng → `assets-local/review/c0122/`.
- typecheck + unit + e2e; ghi số test. Chưa gộp main — coordinator gửi ảnh cho người dùng duyệt.
