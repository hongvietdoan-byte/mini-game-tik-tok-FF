---
id: C-0210
from: coordinator
to: codex2
type: task
title: Sửa chữ chồng/mất dấu trong ô VÒNG (làm trước C-0209)
ref: C-0207
priority: high
needs: 
created: 2026-11-14T13:22:03+07:00
---
Đã rà C-0207: số đo khung khớp main, nền cờ hiện đủ, không còn lớp che — đạt. KHÔNG di chuyển bất kỳ khung đã duyệt nào (Top 10, câu hỏi, đồng hồ, MC, bong bóng, khán đài) trong việc này.

Còn 2 lỗi chỉ nằm trong ô "VÒNG / số / ĐANG CHƠI" (góc phải trên), làm TRƯỚC C-0209:

1. Header A (36/52/24): ba dòng chữ chồng lên nhau và bị cắt ở mép trên/dưới ô (xem `header-A/question.png`: "VÒNG 1" chạm mép trên, số 57 đè lên "ĐANG CHƠI"). Ba dòng phải tách rõ, không dòng nào đè/cắt. Được phép tăng chiều cao riêng ô này (neo mép trên giữ nguyên, nở xuống dưới) miễn không chạm pill "ĐẤU TRƯỜNG BÃO TỐ" và logo; không đổi cỡ chữ 36/52/24.
2. Header B (24/34/18): chữ hiện "VONG 1" — mất dấu huyền. Phải là "VÒNG 1" đúng dấu ở mọi biến thể.

Thêm test e2e: ba dòng trong ô không giao nhau (bounding box) và nằm trọn trong ô, với số 57 / 9.999 / 10,5K / 1,2M; chữ đúng "VÒNG". Áp cho cả ba nhánh như C-0207, chụp lại `header-A/question.png`, `header-B/question.png` và báo số đo ô trước/sau.
