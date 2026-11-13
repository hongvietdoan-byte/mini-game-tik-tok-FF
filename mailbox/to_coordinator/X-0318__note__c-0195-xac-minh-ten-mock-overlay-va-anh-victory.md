---
id: X-0318
from: codex1
to: coordinator
type: note
title: C-0195: xác minh tên mock overlay và ảnh Victory
ref: C-0195
priority: high
needs: 
created: 2026-11-13T23:06:47+07:00
---
C-0195 — Đã rà nguồn của bộ mock overlay và ảnh nghiệm thu.

Nguồn: `apps/overlay/src/mock/snapshots.ts:11-26` tạo 35 ghế `MOCK_NAMES` và gán chuỗi trực tiếp vào `safeDisplayName`; `:35-41` gán 10 tên Top 10 vào `safeDisplayName`. Snapshot mock không có `rawDisplayName`, `risk` hay `matchedRuleIds`. `useSnapshot.ts:50-53` gọi thẳng `makeMockSnapshot` khi có `?mock=...`, không chạy NameFilterStore. Với mock fixture, tên gốc được xem là chuỗi nguồn trong bảng dưới và tên hiển thị an toàn bằng nguyên văn. Tôi chạy 45 chuỗi qua default name-filter (`DEFAULT_NAME_FILTER_RULES` và `DEFAULT_PROTECTED_ENTITIES`): cả 45 đều risk `NONE`, matchedRuleIds `[]`.

Điểm cần tách riêng: `victory-program.png` không phải đầu ra của static `?mock=victory`: fixture Victory chỉ có ba tên `FFVN.Kelly`, `StormKing`, `BVD.Champion`, và `audience: null`; ảnh lại có alias `Người chơi 04/01/07`. Tương tự `question-program.png` hiển thị alias ở Top 10 và 35 ghế, trái với mock static. Ảnh chỉ chứa public display name, không có session ID/admin roster nên không thể truy ra tên gốc, risk hoặc rule IDs của lần chụp này. Như vậy không có bằng chứng default rule đổi những tên sạch trong fixture thành alias; ảnh đã chụp từ một nguồn/session khác (hoặc payload đã có sẵn alias). Chưa sửa UI/test.

| Nhóm | Vị trí | Tên gốc trong mock fixture | safeDisplayName | risk (default filter) | matchedRuleIds |
|---|---:|---|---|---|---|
| Top 10 | 1 | FFVN.Kelly | FFVN.Kelly | NONE | [] |
| Top 10 | 2 | StormKing | StormKing | NONE | [] |
| Top 10 | 3 | BVD.Champion | BVD.Champion | NONE | [] |
| Top 10 | 4 | Choco.M | Choco.M | NONE | [] |
| Top 10 | 5 | Hami | Hami | NONE | [] |
| Top 10 | 6 | Nyla_xinch | Nyla_xinch | NONE | [] |
| Top 10 | 7 | Lophgg | Lophgg | NONE | [] |
| Top 10 | 8 | my.mitmeo | my.mitmeo | NONE | [] |
| Top 10 | 9 | coheo246 | coheo246 | NONE | [] |
| Top 10 | 10 | Diemmy | Diemmy | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 1 | StormKing | StormKing | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 2 | Rồng Lửa | Rồng Lửa | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 3 | BoomBoom | BoomBoom | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 4 | Choco.M | Choco.M | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 5 | Hami | Hami | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 6 | Nyla_xinch | Nyla_xinch | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 7 | Lophgg | Lophgg | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 8 | my.mitmeo | my.mitmeo | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 9 | coheo246 | coheo246 | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 10 | Diemmy | Diemmy | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 11 | ThuyTrang | ThuyTrang | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 12 | Hồ Anh Tuấn | Hồ Anh Tuấn | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 13 | Mai Linh | Mai Linh | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 14 | kho kho | kho kho | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 15 | TEENHAYQUAYCUOP | TEENHAYQUAYCUOP | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 16 | Nhân cách | Nhân cách | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 17 | Tú Toàn | Tú Toàn | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 18 | Huy Vũ | Huy Vũ | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 19 | thảo cute | thảo cute | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 20 | Bé cua 2k | Bé cua 2k | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 21 | Phươngg | Phươngg | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 22 | Xunx | Xunx | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 23 | Trần Khoa | Trần Khoa | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 24 | sóng chó điên 99 | sóng chó điên 99 | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 25 | 34a. | 34a. | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 26 | LMHxr76 | LMHxr76 | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 27 | Muốn học giỏi | Muốn học giỏi | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 28 | Lananh | Lananh | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 29 | nguyenhuyen | nguyenhuyen | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 30 | Mai Trí Đức | Mai Trí Đức | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 31 | Hoài Thương | Hoài Thương | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 32 | Choco Mutt | Choco Mutt | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 33 | `<b>bó đái</b>` | `<b>bó đái</b>` | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 34 | LNH 👨‍👩‍👧 | LNH 👨‍👩‍👧 | NONE | [] |
| Khán đài (thứ tự mảng fixture) | 35 | Misu | Misu | NONE | [] |
