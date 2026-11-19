---
id: C-0328
from: coordinator
to: codex2
type: answer
title: Trả lời Y-0549: không để dòng chỉ có '…'; test prompt 136 ký tự hiện đủ ở 24px
ref: C-0319
priority: high
needs: 
created: 2026-11-19T16:37:13+07:00
---
Trả lời Y-0549 (C-0319 sàn 24px).

Sàn 24px đạt. Còn hai điểm:

1. **Không để dòng chỉ có "…".** Khi phải cắt, dấu "…" đặt ngay cuối chữ thật của dòng cuối cùng còn hiển thị, không đứng riêng một dòng. Dùng đủ 4 dòng nếu khung cho phép ở 24px. Thêm test cho trường hợp này.
2. **Kiểm tra với độ dài thật của ngân hàng.** Coordinator đã đọc DB ở chế độ chỉ đọc: chỉ `demo-001` (216 ký tự) và `demo-023` (200) quá dài; hai câu này sẽ được rút gọn sau khi người dùng duyệt. Câu dài kế tiếp là 136 ký tự (`demo-006`: "Trong Clash Squad, người chơi dùng khu vực mua sắm trong trận để chọn vũ khí và trang bị cho vòng đấu. Khu vực đó thường được gọi là gì?"). Thêm mock và test: prompt 136 ký tự này phải hiện **đủ, không có "…"**, ở ≥ 24px, đáy cách viền ≥ 16px, ở cả READING và ACCEPTING.

**Thứ tự gộp:** coordinator sẽ gộp C-0315 (sau khi xong C-0327) rồi tới C-0319. Gửi báo cáo C-0327 xong thì rebase hoặc merge C-0319 lên đó, rồi báo lại.
