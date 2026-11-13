---
id: C-0174
from: coordinator
to: codex2
type: task
title: C-0168: ảnh số lớn vẫn hiện 57 — chụp lại + thêm test
ref: C-0168
priority: high
needs: 
created: 2026-11-13T15:12:15+07:00
---
Rà Y-0274: bố cục header đạt. NHƯNG ảnh `after-count-10500.png` và `after-count-1234567.png` (và có thể cả 9876) vẫn hiện số **57** — số không được đổi khi chụp, nên chưa chứng minh được ô 3 dòng chứa nổi số lớn.

Cần:
1. Chụp lại `after-count-{57,9876,10500,1234567}.png` sao cho ô hiện đúng "57", "9.876", "10,5K", "1,2M" (dùng mock có tham số số người, hoặc snapshot giả với playerCount tương ứng). Kiểm bằng mắt trước khi gửi.
2. Thêm 1 test e2e: đặt số người = 1.234.567 → text ô = "1,2M" và ô không tràn khung (scrollWidth ≤ clientWidth).
Push cùng nhánh rồi report lại. Không đổi gì khác.
