---
id: C-0216
from: coordinator
to: codex2
type: note
title: Số đo chính xác ảnh mẫu (thay bảng trong C-0215)
ref: C-0215
priority: high
needs: 
created: 2026-11-14T15:47:03+07:00
---
Bổ sung cho C-0215: coordinator đã đo lại ảnh mẫu trên lưới 1080×1920 (sai số đọc ±5px). Bảng này THAY bảng ước lượng trong C-0215. Ảnh đối chiếu có đánh số khung: `E:\Ai\2026\Trend mini game tiktok\assets-local\review\mau-nguoi-dung\doi-chieu-mau-va-hien-tai.png`.

Toạ độ = x trái–phải, y trên–dưới, px sân khấu 1080×1920.
| # | Phần | Ảnh mẫu | Hiện tại | Thay đổi |
|---|---|---|---|---|
| 1 | Logo + dòng "AI LÀ NHÀ VUA BÁ KHÍ!" | x 400–655, y 30–240 (255×210) | x 454–627, y 35–170 (173×135) | to ×1,5; tâm vẫn x≈527 |
| 2 | Ô "STORM ARENA" | x 82–312, y 133–225 (230×92) | x 98–308, y 16–110 | xuống 117px |
| 3 | Ô "VÒNG 1 / 57 / ĐANG CHƠI" | x 770–1000, y 133–228 (230×95); chữ ≈26 / 44 / 20px | x 760–980, y 16–144; chữ 36/52/24 | xuống 117px, sang phải 10–20px, thấp hơn 33px, chữ nhỏ hơn |
| 4 | Dải "ĐẤU TRƯỜNG BÃO TỐ" | thân x 262–815, mũi tên ra tới x 220–855; y 250–322 (cao 72), chữ ≈38px nghiêng, viền vàng | x 431–756, y 213–266 (325×53), chữ ≈20px | rộng ×1,7, cao +19, xuống 37px, canh giữa x≈538 |
| 5 | 8 cờ đội | x 35–1045, y 280–540, thấy trọn 8 lá | cờ của nền hiện tại y 265–610, 4 lá giữa bị khung che | khung phải nằm dưới cờ |
| 6 | Top 10 | x 88–405, y 528–990 (317×462) | x 98–398, y 345–811 (300×466) | xuống 183px, rộng +17 |
| 7 | Bảng câu hỏi | x 425–995, y 528–993 (570×465) | x 416–983, y 345–815 (567×470) | xuống 183px, sang phải 9–12px |
| 8 | Đồng hồ | x 830–958, y 548–678 (đk 128), nằm trong bảng, cách mép trên bảng 20px | x 825–963, y 345–483 (đk 138), sát mép trên | xuống 203px, nhỏ 10px |
| – | Thẻ "CÂU HỎI 5" | x 455–680, y 550–605 | x 450–663, y 365–420 | xuống 185px |
| – | Dòng "42 câu trả lời" | không có | có, x 700–810, y 393 | bỏ |
| 9 | Khung nội dung câu hỏi | x 450–975, y 690–835 (525×145) | x 436–963, y 492–652 (527×160) | xuống 198px, thấp 15px |
| 10 | 4 đáp án | x 447–978, y 850–975; mỗi ô cao 60, hàng cách 5 | x 438–950, y 667–803 | xuống 183px |
| 11 | Chân dung Kelly | x 130–335, y 995–1200 (205×205, chỉ đầu-vai) | x 108–388, y 760–1150 (280×390, tới hông) | xuống 235px, nhỏ còn ~53% chiều cao |
| 12 | Bảng tên "MC KELLY" | x 92–342, y 1198–1247 (250×49) | x 100–380, y 1152–1208 | xuống 46px, hẹp 30px |
| 13 | Bong bóng MC | x 410–985, y 1040–1185 (575×145), viền vàng, đuôi nhọn x 370–410 | x 410–978, y 844–1064 (568×220) | xuống 196px, thấp 75px |
| 14 | Khán đài 5×7 | nhãn tên các hàng y 1271/1344/1418/1493/1565/1637/1708 (cách 73); tâm cột x 158/350/541/733/925; bục dưới cùng y 1795–1845 | nhãn y 1222/1306/1391/1475/1560/1644/1727 (cách 84); bục y 1815–1865 | hàng đầu xuống 49px, khoảng cách hàng 84→73, hàng cuối lên 19px |

Lưu ý nền: cờ trong `bg-question-user.jpg` kéo xuống tới y≈610 trong khi khung ở ảnh mẫu bắt đầu y=528 → khung sẽ che ~80px đáy cờ; không co/dời nền để chữa, cứ báo số đo trong report.
