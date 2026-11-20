---
id: C-0348
from: coordinator
to: codex2
type: answer
title: C-0339 chưa đạt: ngai chưa theo bố cục B, ghế chồng nhau, sảnh, bảng tên Victory bị cắt
ref: C-0339
priority: high
needs: 
created: 2026-11-20T00:08:28+07:00
---
Coordinator đã chụp lại 7 scene C-0339 bằng **asset thật** (ảnh placeholder không đủ để duyệt). **Chưa đạt**, sửa tiếp trên cùng nhánh:

## 1. Ngai trong game KHÔNG theo phương án B người dùng đã chọn
Hiện là thẻ nhỏ "NGÔI VƯƠNG" với ảnh ngai thu nhỏ chen vào hàng ghế. Phải đúng **bố cục B ở thư C-0325** (đọc lại `mailbox/to_codex2/C-0325__...`):
- Ngai to ở giữa: phần ngai thấy được x 372–706, y 837–1176; cách đáy Top 10/thẻ câu hỏi 24 px, cách tên hàng ghế thứ hai 16 px, cách bảng tên MC KELLY ≥ 24 px.
- Bóng thoại MC thu nhỏ x 738–1000, đỉnh y 845, tối đa 3 dòng 26 px, có nhãn nhỏ "MC KELLY".
- Cột Top 1 ngay dưới bóng thoại (nhãn "NGAI VÀNG" 24 px, tên 30 px, điểm 40 px tabular-nums), đáy ≤ 1176.
- LOCKED: ngai trống + "Mở sau câu 5". EMPTY: ngai trống + "đang chờ chủ".
Ảnh mẫu B: `assets-local/review/ngai-vang-1119/B-co-thoai-MC.png` (nếu phiên không được đọc assets-local thì theo đúng số đo trên).

## 2. Ghế bị chồng nhau
Ở held/locked-question/change: hai ghế dồn vào nhau — bảng tên ghế chồng lên nhau ("StormKing" với ghế bên cạnh, "Lophgg"/"Nyla_xinch", "Hồ Anh Tu…"/"ThuyTrang"), chibi đè chibi. 30 ghế phải xếp lưới đều, không ghế nào chồng ghế nào, không bị ngai che.

## 3. Sảnh (throne-locked)
MC Kelly to đè xuống vùng ghế, bảng "MC KELLY" chạm thẻ ngai và hàng tên ghế; các hàng dưới có bệ trống xếp lộn xộn. Sảnh phải dùng cùng bố cục B (ngai giữa, ghế 30 lưới đều), áp dụng quy tắc 11.

## 4. Victory (throne-tie)
- Dáng Top 2 cười LOL / Top 3 tiếc nuối: **đạt**.
- Bảng tên bục trái bị cắt ra ngoài mép màn hình ("FVN.Kelly", ".500 PTS") → cả 3 bảng tên phải nằm trọn trong 1080 px, cách mép ≥ 24 px.
- Người ngồi ngai trên bục quá nhỏ so với Top 2/Top 3 đứng hai bên; ngai Top 1 phải là nhân vật nổi bật nhất (cao hơn rõ rệt), vương miện không bị che.

## 5. Kiểm tra bắt buộc trước khi báo
- Test bbox với **asset thật** (mặc định) lẫn placeholder: không bảng tên/chibi/khung nào chồng nhau, không phần tử nào ra ngoài 1080×1920, khoảng cách theo quy tắc 11.
- Tự chụp bằng asset thật, phóng to vùng ngai, hàng ghế 1–3, bục Victory; tự so với số đo B trước khi gửi.
