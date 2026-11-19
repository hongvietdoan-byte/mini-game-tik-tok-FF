---
id: C-0320
from: coordinator
to: codex2
type: task
title: C-0320: ảnh mẫu Ngai vàng Top 1 thay hàng ghế đầu (SVG nhìn thẳng 2 lớp, nhân vật ngồi) — chỉ mẫu để duyệt
ref: C-0320
priority: high
needs: 
created: 2026-11-19T14:44:04+07:00
---
**Giai đoạn 1: chỉ dựng ảnh mẫu để người dùng duyệt, chưa đưa vào sản phẩm.** Làm ngay sau C-0315 đến C-0318 (BXH), trước C-0319.

## Ý tưởng (người dùng đề xuất)
Bỏ hàng ghế đầu tiên. Thay vào đó là **một ngai vàng cho người đang Top 1**, để tăng cạnh tranh cho ngôi đầu. Người dùng muốn **ngai nhìn thẳng, có nhân vật ngồi trên ngai**.

## Vẽ ngai bằng SVG (không dùng ảnh hay mô hình bên ngoài)
- **Phong cách:** khung vàng kim nhiều tầng, lưng ghế cao có hai "cánh" vàng xoè chữ V ở đỉnh, nệm và thảm đỏ chạy từ lưng xuống trước ghế. Hai bên lưng có các khẩu súng trường vàng xếp xoè. Tay vịn khối vàng/xám thép, có đèn xanh nhỏ. Bệ vàng.
- **Không sao chép y hệt** ngai FFWC của Free Fire; vẽ bản riêng cùng tinh thần.
- **Tách 2 lớp SVG:**
  - Lớp sau: lưng ghế, cánh, súng, nệm.
  - Lớp trước: hai tay vịn, mặt trước ghế và bệ, che phần chân nhân vật.
- **Nhân vật Top 1:** dùng ảnh chibi đứng toàn thân hiện có của người đó, đặt kẹp giữa hai lớp. Chân bị lớp trước che nên nhìn như đang ngồi (tham khảo dáng ngồi ngai trong emote FFWC).
- Có hào quang vàng hoặc ánh đèn từ trên rọi xuống.

## Bố cục (coordinator đã đo trên main)
- Bỏ toàn bộ hàng ghế trên cùng: cả 5 ghế (ghế, tên, lưng ghế) và cơ chế ghim Top 3 ở hàng này.
- **Rút bóng thoại MC** ở các cảnh QUESTION/READING/PREPARE/REVEAL **còn tối đa 2 dòng**. Đáy hiện tại ở y 1005, cần lên khoảng 950. Chữ vẫn ≥ 30 px; câu nào dài thì viết lại cho gọn và ghi rõ trong báo cáo.
- **Vùng ngai:** từ đáy bóng thoại + 16 px đến đỉnh tên hàng ghế thứ hai − 16 px (tên hàng 2 bắt đầu ở y 1192), tức khoảng y 966–1176, cao khoảng 210 px. Không chạm bảng tên MC KELLY (x 92–342, y 1018–1068); mép trái ngai ≥ 358.
- **Ngai** đặt giữa hoặc lệch trái vùng trống. Nhân vật trên ngai to khoảng 1,4 lần chibi ghế thường.
- **Bên phải ngai:** nhãn nhỏ "NGAI VÀNG", tên Top 1 (≥ 28 px, tên dài thì "…"), điểm (≥ 32 px, màu vàng, số đều độ rộng). Không lặp chữ "điểm" nếu đã có nhãn rõ.
- Áp dụng quy tắc 11 (các khung cách nhau ≥ 24 px, MC ≥ 16 px) và 10 quy tắc BXH.

## Ảnh mẫu cần gửi (không commit ảnh)
1. QUESTION có Top 1 trên ngai: full + zoom vùng 760–1300, có và không có `hud=1`.
2. REVEAL khi ngai đổi chủ: 2–3 khung hình của hiệu ứng "cướp ngai" (người cũ mờ đi, người mới vào, ánh vàng loé).
3. LOBBY chưa có ai: ngai trống với dòng "NGAI VÀNG ĐANG CHỜ CHỦ", sảnh còn 30 ghế.
4. Tên dài 24 grapheme trên ngai.
5. Ngai SVG riêng ở 2 lớp và ở dạng ghép, phóng to.
Kèm số đo khoảng hở các cặp quanh ngai.

## Luật dự kiến (chưa làm ở giai đoạn 1, chỉ để thiết kế đúng)
- Ngai chỉ đổi chủ khi công bố đáp án mỗi câu.
- Ghế cũ của người ngồi ngai vẫn giữ chỗ, có dấu vương miện.
- MC nói "Ngai vàng đã đổi chủ!" và không đọc tên người chơi.
- Top 2/3 bỏ ghế ghim riêng.

Chỉ làm trong `apps/overlay` (mock, CSS, SVG) và test e2e mẫu.
