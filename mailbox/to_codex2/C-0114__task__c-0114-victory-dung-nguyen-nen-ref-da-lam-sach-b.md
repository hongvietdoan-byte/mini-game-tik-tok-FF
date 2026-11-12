---
id: C-0114
from: coordinator
to: codex2
type: task
title: C-0114 Victory: dùng nguyên nền ref đã làm sạch, bỏ 2 cột hai bên
ref: 
priority: high
needs: 
created: 2026-11-12T10:03:24+07:00
---
Người dùng xem ảnh Victory của C-0101 và CHƯA duyệt: nền bị bạc màu, tự dưng có 2 cột dọc hai bên. Yêu cầu: "bê y nguyên BG từ ref sang".

## Asset mới (cục bộ, ngoài git)
`assets-local/victory/bg-ref-clean.jpg` (1080×1920) = chính ảnh `assets-local/ref/victory-ref.png` phóng lên 1080×1920, đã xoá chữ Free Fire, logo cũ, 3 nhân vật, 3 bảng tên và bóng phản chiếu của bảng tên. Cúp, bục, khán đài, trời bão, sàn bóng giữ nguyên từng pixel của ref.
Ảnh đối chiếu: `assets-local/review/victory-bg-ref-vs-clean.jpg`.

Lưu ý: chỗ 3 nhân vật và dải bảng tên đã xoá hiện là vệt MỜ (không tái tạo được chi tiết bục). Chibi và bảng tên thật phải đặt đúng vị trí để che kín các vệt này.

## Việc cần làm (nhánh `codex2/c0068-victory-ref`, làm TRƯỚC C-0113/C-0109)
1. Nền màn Victory = đúng 1 ảnh `bg-ref-clean.jpg`, phủ kín 1080×1920, tỉ lệ 1:1, không crop lệch, không lớp phủ làm sáng/bạc màu, không gradient che. Bỏ `victory/bg.jpg` và `victory/trophy-stage.png` khỏi màn này (cúp + bục đã nằm trong nền).
2. Xoá hẳn 2 cột dọc hai bên và mọi lớp trang trí tự vẽ chồng lên nền (tia sáng, vòng tròn, khung). Hiệu ứng động chỉ được là lớp nhẹ phía trên: confetti, chớp sáng — không đổi màu tổng thể.
3. Vị trí theo ref (tính trên khung 1080×1920):
   - Logo chính thức `/assets/brand/logo.png`: tâm x 50 %, khoảng y 2–22 %, rộng ≥ 40 % khung.
   - Chibi hạng 2 (trái): tâm x ≈ 21 %, đầu y ≈ 51 %, chân y ≈ 71 %.
   - Chibi hạng 1 (giữa): tâm x ≈ 51 %, đầu y ≈ 48 %, chân y ≈ 71,5 %, to hơn 2 bên ~15 %.
   - Chibi hạng 3 (phải): tâm x ≈ 78 %, đầu y ≈ 51,5 %, chân y ≈ 71 %.
   - Bảng tên: 3 ô lục giác tâm x ≈ 22 % / 50 % / 78 %, y ≈ 70,5–78,5 %, mỗi ô rộng ≈ 26–28 %; xanh (hạng 2) – vàng (hạng 1) – đỏ (hạng 3), có vương miện phía trên, tên + điểm "1.500 PTS" như ref.
   - Chibi phải đủ to để che kín vệt mờ trên nền; nếu chibi nhỏ hơn vệt thì thêm bóng đổ/quầng tối mềm dưới chân và sau lưng, KHÔNG thêm khối sáng.
4. Bản đồng hạng giữ logic hiện có (C-0101), cùng nền này.
5. MC Kelly: ẩn ở màn Victory (ref không có MC).

## Nghiệm thu
- Ảnh ghép REF | RENDER cùng cỡ cho Victory thường và Victory đồng hạng, lưu `assets-local/review/c0114/`.
- Tự soát trước khi report: phần nền ngoài vùng logo/chibi/bảng tên phải trùng ref (màu, độ tối, tia sáng sau cúp, sàn phản chiếu). Còn thấy vệt mờ lộ ra thì chỉnh vị trí/kích thước chibi, bảng tên.
- typecheck + unit + e2e xanh; ghi rõ số test.
- Chưa gộp main; coordinator gửi ảnh cho người dùng duyệt trước (BOARD #19).
