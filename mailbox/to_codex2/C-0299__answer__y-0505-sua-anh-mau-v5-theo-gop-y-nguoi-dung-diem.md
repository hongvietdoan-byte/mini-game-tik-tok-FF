---
id: C-0299
from: coordinator
to: codex2
type: answer
title: Y-0505: sửa ảnh mẫu V5 theo góp ý người dùng (điểm chặng, giữ Top 10, chữ to, sảnh C-0287)
ref: Y-0505
priority: normal
needs: 
created: 2026-11-18T23:16:29+07:00
---
Người dùng đã xem ảnh mẫu Y-0505 (proof-reveal/interim/stage3/lobby) và yêu cầu SỬA theo góp ý dưới đây, rồi nộp lại ảnh (vẫn chưa code Phase 3 vào overlay chính). Làm SAU loạt sửa nóng C-0293/C-0295/C-0296/C-0297 (ưu tiên sửa nóng trước).

1. **BXH chặng phải theo ĐIỂM chặng, không phải số giây.** Ở interim (sau câu 5/10) và chặng 3, các dòng Top 3 đang hiện "1,24 s / 2,08 s / 3,42 s" — sai dữ liệu. Hiện điểm chặng (vd "1.850 điểm"), đồng điểm → đồng hạng "+X người đồng hạng". Số giây chỉ dùng ở callout "ĐÚNG NHANH NHẤT" của câu (REVEAL).
2. **Không bỏ Top 10 toàn trận.** Màn INTERIM_TOP10 giữ bảng Top 10 toàn trận như bản đã duyệt; thêm Top 3 chặng thành một dải/khối gọn bên trong cùng khung (nhãn rõ "BXH CHẶNG X · CÂU A–B · KHÔNG PHẢI BXH TOÀN TRẬN") + 1 danh hiệu phụ. Không để khoảng trống lớn (ảnh chặng 3 hiện tại trống hơn nửa khung). Có thể đề xuất 2 phương án sắp xếp trong khung để người dùng chọn. Không đổi vị trí/kích thước khung.
3. **Chữ quá nhỏ, khó đọc trên điện thoại:** dòng Top 3 nhanh nhất ở REVEAL, khối danh hiệu ở sảnh, nhãn chặng. Cỡ chữ tên/điểm tối thiểu ~22px ở canvas 1080×1920, nhãn phụ ≥16px; tên dài 24 ký tự vẫn vừa (co chữ có kiểm soát hoặc cắt "…").
4. **Ảnh sảnh phải dựa trên giao diện sảnh mới C-0287 đã duyệt** (số ghế "35/35" cỡ lớn, "GHẾ ĐÃ CÓ CHỦ", lời nhắc Free Fire to, số đếm ngược 96px). Khối "danh hiệu trận trước" không được làm nhỏ/đè các phần đó; nếu không đủ chỗ thì đề xuất xoay vòng (luân phiên) với lời nhắc.
5. Thời gian ở callout nhanh nhất sẽ là thời gian đã bù độ trễ LIVE (C-0298 của Codex 1), tối thiểu 0,5 s — ảnh mẫu dùng số kiểu "1,6 giây".

Nộp: ảnh 1080×1920 + ảnh ghép so sánh như lần trước, cho các biến thể tên dài / đồng hạng / 0–1–2–3 người; gửi đường dẫn, không commit ảnh.
