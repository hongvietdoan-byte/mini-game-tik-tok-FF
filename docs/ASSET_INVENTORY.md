# Asset Inventory — Storm Arena

> STEP 1 audit đã được duyệt qua C-0042. C-0046 chốt ảnh nhân vật runtime: `assets-local/chibi/` và `assets-local/mc/kelly.png`; C-0049 duyệt thêm logo chính thức `assets-local/brand/logo.png`. Thẻ ở `assets-local/cards/` chỉ làm tham chiếu phong cách theo C-0050. Ảnh mẫu đầy đủ `Đấu Trường Bão Tố_ MC Kelly Live Quiz.png` do người dùng vừa gửi là visual target, không dùng runtime. Thư mục backup chibi cũ bị loại khỏi inventory/contact sheet; không truy cập nội dung backup.

## Phạm vi và kết quả quét

- Quét ảnh nguồn/tham chiếu trong checkout chính và các thư mục asset đã biết; bỏ `.git`, `node_modules`, `.claude`, `test-results`, build output và thư mục backup chibi cũ theo C-0046. Không đọc/listing `.xlsx`.
- Kết quả hiện tại: **238 ảnh** (`216 PNG`, `22 JPEG`). Không có SVG/GIF/WebP/video/audio trong bộ ảnh kiểm kê.
- 66 PNG alpha tại `assets-local/chibi/` khớp 66 mục trong manifest; không thiếu file, không thừa file. Đây là Character Pool runtime duy nhất được duyệt.
- `assets-local/mc/kelly.png`: PNG alpha 273×640. `assets-local/mc/kelly/` có thư mục trạng thái và `HUONG_DAN.txt`, nhưng chưa có manifest/frame PNG; McSequence cần fallback ảnh tĩnh.
- `assets-local/brand/logo.png`: PNG alpha 1089×1125; C-0049 duyệt dùng nguyên ảnh ở header. Logo chữ Storm Arena tiếp tục dựng bằng CSS.
- `assets-local/cards/the-chien-dau-ffvn-kelly.png`: PNG alpha 1107×1421; C-0050 chỉ duyệt làm tham chiếu cho viền neon và dải tên chéo, không dùng làm ảnh runtime cho người chơi.
- Ảnh `Đấu Trường Bão Tố_ MC Kelly Live Quiz.png` là screenshot target 9:16 do người dùng gửi; dùng để so bố cục/ánh sáng, không dùng runtime. `Screenshot 2026-11-02 103915.png` là thẻ MVP, không phải target.
- Ảnh gốc `Ảnh ChatGPT*`, `4.png`, `Screenshot*` chỉ tham khảo bố cục, không dùng runtime. Hai ảnh arena rộng 10_21_10 và 10_21_22 là bản trùng.
- Các nguồn local bị `.gitignore` loại khỏi repo public. Contact sheet dùng đường dẫn local tương đối; không copy ảnh vào Git.

## Tóm tắt theo nhóm

| Nhóm | Số ảnh | Dạng | Trạng thái |
|---|---:|---|---|
| Root references | 17 | Poster, logo sheet, arena/storm, cúp và screenshot target mới | Chỉ tham khảo |
| `2026-11-11_chibi_kho/` | 71 | 67 PNG nền đục + 4 JPEG sheet | Chỉ tham khảo/xử lý |
| `assets-local/chibi/` | 66 | PNG alpha, cao 360 px | Runtime được duyệt |
| `assets-local/chibi-clean/` | 68 | 66 chibi + Kelly + cúp | Không dùng theo C-0046 |
| `assets-local/chibi-clean/.preview/` | 11 | PNG/JPEG preview | Review only |
| `assets-local/mc/` + `assets-local/victory/` | 3 | Kelly + background/cúp chiến thắng | Kelly và VictoryStage đang dùng |
| `assets-local/brand/` + `assets-local/cards/` | 2 | Logo chính thức + thẻ FFVN.Kelly | Logo runtime; thẻ chỉ tham chiếu |

## Phân loại theo yêu cầu thiết kế

| Loại | Asset tìm thấy | Trạng thái | Component |
|---|---|---|---|
| Logo Storm Arena | Không có file riêng | Dựng chữ bằng CSS; không dùng ảnh poster | Header |
| Logo Bá Vương Đại Chiến | `assets-local/brand/logo.png` 1089×1125 alpha | Đang dùng nguyên ảnh theo C-0049; fallback CSS/SVG khi tải lỗi | Header + Victory |
| Background đấu trường | Hai ảnh arena ngang là reference phẳng, trùng nhau; screenshot target mới thể hiện khán đài neon | Screenshot chỉ tham khảo; background live được dựng nhiều lớp CSS/SVG, không dùng ảnh poster runtime | Background/Arena |
| Background bão tố | Screenshot target mới + ảnh bão 9:16 là reference; Victory bg dành riêng scene thắng | Tham khảo; live scene dựng bão, sét và truss bằng SVG/CSS; không dùng screenshot làm runtime | Background/Victory |
| Khung câu hỏi/đáp án | Không có bitmap frame | `MISSING_ASSET`; CSS/SVG được duyệt | Quiz UI |
| Khung bảng xếp hạng/nền tên | Không có bitmap frame độc lập | `MISSING_ASSET`; dựng bằng CSS/SVG động | Leaderboard/nameplates |
| Thẻ chiến đấu FFVN.Kelly | `assets-local/cards/the-chien-dau-ffvn-kelly.png` 1107×1421 alpha | Chỉ tham chiếu màu neon hồng–tím–xanh, góc vát, sét và dải tên chéo; không dùng runtime | Visual reference cho Top 3/nameplates |
| MC Kelly | `assets-local/mc/kelly.png` 273×640 alpha | Đang dùng làm ảnh tĩnh và McSequence fallback | MC Character Layer |
| Nhân vật chibi | 66 PNG alpha + manifest tại `assets-local/chibi/` | Nguồn runtime duy nhất được duyệt; random theo pool | Audience + podium |
| Ghế/khán đài | Không có asset tách lớp | `MISSING_ASSET`; dựng CSS/SVG theo C-0042 | Arena Environment |
| Cúp/sân khấu chiến thắng | `victory/trophy-stage.png` 1408×900 alpha + `victory/bg.jpg` 1080×1920 | Đang dùng trong VictoryStage | Victory |
| Lightning/VFX | Không có file VFX riêng | `MISSING_ASSET`; dựng nhẹ bằng CSS/SVG | Decorative VFX |
| PNG Sequence | Có spec + thư mục rỗng theo state; không có manifest/frame | Chưa có sequence; dùng McSequence fallback Kelly tĩnh | MC animation |
| Phụ trợ | 2 manifest chibi, `cutout-sheet.html`, `HUONG_DAN.txt`, spec sequence | Có; không phải runtime bitmap | Asset review / sequence |

## Chi tiết từng ảnh

Mỗi hàng ghi đường dẫn, file, định dạng, kích thước pixel, alpha, vai trò, trạng thái và component. “Đang dùng” chỉ áp cho source được duyệt; poster/reference và bộ chibi thay thế không được đánh dấu runtime.

### Ảnh tham chiếu ở thư mục gốc (17)

| Đường dẫn | Tên file | Định dạng | Pixel | Alpha | Vai trò | Trạng thái | Component |
|---|---|---|---:|---|---|---|---|
| 4.png | 4.png | PNG | 438×580 | không (alpha toàn đục) | Ảnh portrait tuyển thủ; chỉ tham khảo bố cục, không runtime. | THAM CHIẾU — không dùng runtime | Reference only |
| Screenshot 2026-11-02 103915.png | Screenshot 2026-11-02 103915.png | PNG | 652×449 | không (alpha toàn đục) | Thẻ MVP Free Fire hậu trận; không phải scene Storm Arena. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_19_37 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_19_37 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_19_46 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_19_46 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_19_52 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_19_52 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_19_59 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_19_59 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_20_08 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_20_08 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_20_14 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_20_14 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_20_20 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_20_20 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_20_37 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_20_37 11 thg 11, 2026.jpg | JPEG | 2048×2048 | không | Poster sự kiện, người chơi và nhãn hiệu ghép phẳng; chỉ tham khảo. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_20_42 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_20_42 11 thg 11, 2026.jpg | JPEG | 1680×840 | không | Sheet logo/nhãn đội ghép phẳng; chỉ tham khảo nhận diện. | THAM CHIẾU — không dùng runtime | Reference only |
| Ảnh ChatGPT 10_21_04 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_21_04 11 thg 11, 2026.jpg | JPEG | 1152×512 | không | Lineup chibi tham khảo, nền đặc; không dùng runtime. | THAM CHIẾU — không dùng runtime | Audience reference |
| Ảnh ChatGPT 10_21_10 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_21_10 11 thg 11, 2026.jpg | JPEG | 2048×1152 | không | Reference arena rộng, banner/logo ghép phẳng; hai file trùng nhau. | THAM CHIẾU — không dùng runtime | Visual reference only |
| Ảnh ChatGPT 10_21_22 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_21_22 11 thg 11, 2026.jpg | JPEG | 2048×1152 | không | Reference arena rộng, banner/logo ghép phẳng; hai file trùng nhau. | THAM CHIẾU — không dùng runtime | Visual reference only |
| Ảnh ChatGPT 10_21_34 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_21_34 11 thg 11, 2026.jpg | JPEG | 1536×1024 | không | Reference cúp/sân khấu, nền sáng. | THAM CHIẾU — không dùng runtime | Victory reference |
| Ảnh ChatGPT 10_21_39 11 thg 11, 2026.jpg | Ảnh ChatGPT 10_21_39 11 thg 11, 2026.jpg | JPEG | 1152×2048 | không | Reference background bão 9:16; chỉ tham khảo bố cục. | THAM CHIẾU — không dùng runtime | Visual reference only |
| Đấu Trường Bão Tố_ MC Kelly Live Quiz.png | Đấu Trường Bão Tố_ MC Kelly Live Quiz.png | PNG | 937×1639 | không | Screenshot target đầy đủ do người dùng gửi; tham chiếu bố cục, ánh sáng, khán đài và góc crop nhân vật. | THAM CHIẾU — không dùng runtime | Visual target only |

### Kho nhân vật nguồn 2026-11-11_chibi_kho (71)

| Đường dẫn | Tên file | Định dạng | Pixel | Alpha | Vai trò | Trạng thái | Component |
|---|---|---|---:|---|---|---|---|
| 2026-11-11_chibi_kho/002_A124.png | 002_A124.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/004_ALVARO.png | 004_ALVARO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/005_ANDREW.png | 005_ANDREW.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/006_ANTONIO.png | 006_ANTONIO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/007_CAROLINE.png | 007_CAROLINE.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/008_CLU.png | 008_CLU.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/009_D_BEE.png | 009_D_BEE.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/010_DASHA.png | 010_DASHA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/011_DIMITRI.png | 011_DIMITRI.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/012_FORD.png | 012_FORD.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/013_HAYATO.png | 013_HAYATO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/014_HOMER.png | 014_HOMER.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/015_IGNIS.png | 015_IGNIS.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/016_IRIS.png | 016_IRIS.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/017_JOSEPH.png | 017_JOSEPH.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/018_JOTA.png | 018_JOTA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/019_K.png | 019_K.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/020_KAIROS.png | 020_KAIROS.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/021_KAPELLA.png | 021_KAPELLA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/022_KASSIE.png | 022_KASSIE.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/024_KENTA.png | 024_KENTA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/025_KLA.png | 025_KLA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/026_KODA.png | 026_KODA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/027_LAURA.png | 027_LAURA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/028_LEON.png | 028_LEON.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/029_LILA.png | 029_LILA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/030_LUNA.png | 030_LUNA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/031_LUQUETA.png | 031_LUQUETA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/032_MARO.png | 032_MARO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/034_MIGUEL.png | 034_MIGUEL.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/035_MISHA.png | 035_MISHA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/036_MOCO.png | 036_MOCO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/037_MORSE.png | 037_MORSE.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/038_NAIRI.png | 038_NAIRI.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/039_NERO.png | 039_NERO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/040_NIKITA.png | 040_NIKITA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/041_NOTORA.png | 041_NOTORA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/042_OLIVIA.png | 042_OLIVIA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/043_ORION.png | 043_ORION.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/044_OSCAR.png | 044_OSCAR.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/045_OTHO.png | 045_OTHO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/046_PALOMA.png | 046_PALOMA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/047_RAFAEL.png | 047_RAFAEL.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/048_RIN.png | 048_RIN.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/049_RYDEN.png | 049_RYDEN.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/050_SANTINO.png | 050_SANTINO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/051_SHANI.png | 051_SHANI.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/052_SHIROU.png | 052_SHIROU.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/054_SONIA.png | 054_SONIA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/055_STEFFIE.png | 055_STEFFIE.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/056_SUZY.png | 056_SUZY.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/057_TATSUYA.png | 057_TATSUYA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/058_THIVA.png | 058_THIVA.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/059_WOLFRAHH.png | 059_WOLFRAHH.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/060_WUKONG.png | 060_WUKONG.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/061_XAYNE.png | 061_XAYNE.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/062_ANDREW_thuc_tinh.png | 062_ANDREW_thuc_tinh.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/299_Ray.png | 299_Ray.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/377_Kenta_ở_OB55.png | 377_Kenta_ở_OB55.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/418_YÊU_NỮ_TÀ_LINH_DẠNG_1.png | 418_YÊU_NỮ_TÀ_LINH_DẠNG_1.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/419_YÊU_NỮ_TÀ_LINH_DẠNG_2.png | 419_YÊU_NỮ_TÀ_LINH_DẠNG_2.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/425_LÍNH_ĐỊCH_ÁO_CHOÀNG.png | 425_LÍNH_ĐỊCH_ÁO_CHOÀNG.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/_bang_duyet_1.jpg | _bang_duyet_1.jpg | JPEG | 2304×2168 | không | Bảng duyệt/style/lineup; không phải sequence. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/_bang_duyet_2.jpg | _bang_duyet_2.jpg | JPEG | 2304×2168 | không | Bảng duyệt/style/lineup; không phải sequence. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/_mau_chibi_EP.jpg | _mau_chibi_EP.jpg | JPEG | 1152×512 | không | Bảng duyệt/style/lineup; không phải sequence. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/_mau_style.jpg | _mau_style.jpg | JPEG | 576×512 | không | Bảng duyệt/style/lineup; không phải sequence. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/_thu_v1_004_ALVARO.png | _thu_v1_004_ALVARO.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/HẮC ẢNH.png | HẮC ẢNH.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/Kelly.png | Kelly.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/maxim.png | maxim.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |
| 2026-11-11_chibi_kho/TINH VÂN.png | TINH VÂN.png | PNG | 1152×2048 | không | Ảnh nguồn nhân vật nền đục; không dùng runtime. | NGUỒN THAM KHẢO — không dùng runtime | Reference/processing source only |

### Chibi đã tách nền — nguồn runtime được duyệt (66)

| Đường dẫn | Tên file | Định dạng | Pixel | Alpha | Vai trò | Trạng thái | Component |
|---|---|---|---:|---|---|---|---|
| assets-local/chibi/chibi-002-a124.png | chibi-002-a124.png | PNG | 154×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-004-alvaro.png | chibi-004-alvaro.png | PNG | 154×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-005-andrew.png | chibi-005-andrew.png | PNG | 152×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-006-antonio.png | chibi-006-antonio.png | PNG | 152×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-007-caroline.png | chibi-007-caroline.png | PNG | 165×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-008-clu.png | chibi-008-clu.png | PNG | 152×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-009-d-bee.png | chibi-009-d-bee.png | PNG | 148×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-010-dasha.png | chibi-010-dasha.png | PNG | 145×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-011-dimitri.png | chibi-011-dimitri.png | PNG | 141×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-012-ford.png | chibi-012-ford.png | PNG | 153×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-013-hayato.png | chibi-013-hayato.png | PNG | 162×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-014-homer.png | chibi-014-homer.png | PNG | 168×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-015-ignis.png | chibi-015-ignis.png | PNG | 168×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-016-iris.png | chibi-016-iris.png | PNG | 161×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-017-joseph.png | chibi-017-joseph.png | PNG | 137×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-018-jota.png | chibi-018-jota.png | PNG | 137×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-019-k.png | chibi-019-k.png | PNG | 175×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-020-kairos.png | chibi-020-kairos.png | PNG | 157×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-021-kapella.png | chibi-021-kapella.png | PNG | 167×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-022-kassie.png | chibi-022-kassie.png | PNG | 172×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-024-kenta.png | chibi-024-kenta.png | PNG | 160×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-025-kla.png | chibi-025-kla.png | PNG | 161×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-026-koda.png | chibi-026-koda.png | PNG | 146×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-027-laura.png | chibi-027-laura.png | PNG | 143×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-028-leon.png | chibi-028-leon.png | PNG | 173×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-029-lila.png | chibi-029-lila.png | PNG | 193×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-030-luna.png | chibi-030-luna.png | PNG | 201×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-031-luqueta.png | chibi-031-luqueta.png | PNG | 158×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-032-maro.png | chibi-032-maro.png | PNG | 148×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-034-miguel.png | chibi-034-miguel.png | PNG | 153×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-035-misha.png | chibi-035-misha.png | PNG | 141×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-036-moco.png | chibi-036-moco.png | PNG | 170×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-037-morse.png | chibi-037-morse.png | PNG | 175×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-038-nairi.png | chibi-038-nairi.png | PNG | 147×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-039-nero.png | chibi-039-nero.png | PNG | 159×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-040-nikita.png | chibi-040-nikita.png | PNG | 137×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-041-notora.png | chibi-041-notora.png | PNG | 143×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-042-olivia.png | chibi-042-olivia.png | PNG | 139×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-043-orion.png | chibi-043-orion.png | PNG | 169×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-044-oscar.png | chibi-044-oscar.png | PNG | 147×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-045-otho.png | chibi-045-otho.png | PNG | 139×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-046-paloma.png | chibi-046-paloma.png | PNG | 162×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-047-rafael.png | chibi-047-rafael.png | PNG | 136×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-048-rin.png | chibi-048-rin.png | PNG | 140×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-049-ryden.png | chibi-049-ryden.png | PNG | 136×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-050-santino.png | chibi-050-santino.png | PNG | 187×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-051-shani.png | chibi-051-shani.png | PNG | 144×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-052-shirou.png | chibi-052-shirou.png | PNG | 146×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-054-sonia.png | chibi-054-sonia.png | PNG | 128×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-055-steffie.png | chibi-055-steffie.png | PNG | 159×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-056-suzy.png | chibi-056-suzy.png | PNG | 143×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-057-tatsuya.png | chibi-057-tatsuya.png | PNG | 155×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-058-thiva.png | chibi-058-thiva.png | PNG | 134×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-059-wolfrahh.png | chibi-059-wolfrahh.png | PNG | 150×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-060-wukong.png | chibi-060-wukong.png | PNG | 155×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-061-xayne.png | chibi-061-xayne.png | PNG | 169×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-062-andrew-thuc-tinh.png | chibi-062-andrew-thuc-tinh.png | PNG | 168×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-299-ray.png | chibi-299-ray.png | PNG | 151×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-377-kenta-o-ob55.png | chibi-377-kenta-o-ob55.png | PNG | 162×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-418-yeu-nu-ta-linh-dang-1.png | chibi-418-yeu-nu-ta-linh-dang-1.png | PNG | 209×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-419-yeu-nu-ta-linh-dang-2.png | chibi-419-yeu-nu-ta-linh-dang-2.png | PNG | 197×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-425-linh-dich-ao-choang.png | chibi-425-linh-dich-ao-choang.png | PNG | 154×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-hac-anh.png | chibi-hac-anh.png | PNG | 144×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-maxim.png | chibi-maxim.png | PNG | 146×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-thu-v1-004-alvaro.png | chibi-thu-v1-004-alvaro.png | PNG | 157×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |
| assets-local/chibi/chibi-tinh-van.png | chibi-tinh-van.png | PNG | 151×360 | có | PNG chibi toàn thân alpha, 360 px cao; nguồn Character Pool runtime đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | Audience + Victory podium (`/assets/chibi/{id}.png`) |

### Bộ chibi thay thế khác — không dùng theo C-0046 (68)

| Đường dẫn | Tên file | Định dạng | Pixel | Alpha | Vai trò | Trạng thái | Component |
|---|---|---|---:|---|---|---|---|
| assets-local/chibi-clean/chibi-002-a124.png | chibi-002-a124.png | PNG | 154×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-004-alvaro.png | chibi-004-alvaro.png | PNG | 154×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-005-andrew.png | chibi-005-andrew.png | PNG | 152×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-006-antonio.png | chibi-006-antonio.png | PNG | 152×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-007-caroline.png | chibi-007-caroline.png | PNG | 165×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-008-clu.png | chibi-008-clu.png | PNG | 152×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-009-d-bee.png | chibi-009-d-bee.png | PNG | 148×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-010-dasha.png | chibi-010-dasha.png | PNG | 145×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-011-dimitri.png | chibi-011-dimitri.png | PNG | 141×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-012-ford.png | chibi-012-ford.png | PNG | 153×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-013-hayato.png | chibi-013-hayato.png | PNG | 162×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-014-homer.png | chibi-014-homer.png | PNG | 168×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-015-ignis.png | chibi-015-ignis.png | PNG | 168×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-016-iris.png | chibi-016-iris.png | PNG | 161×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-017-joseph.png | chibi-017-joseph.png | PNG | 137×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-018-jota.png | chibi-018-jota.png | PNG | 137×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-019-k.png | chibi-019-k.png | PNG | 175×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-020-kairos.png | chibi-020-kairos.png | PNG | 157×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-021-kapella.png | chibi-021-kapella.png | PNG | 167×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-022-kassie.png | chibi-022-kassie.png | PNG | 172×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-024-kenta.png | chibi-024-kenta.png | PNG | 160×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-025-kla.png | chibi-025-kla.png | PNG | 161×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-026-koda.png | chibi-026-koda.png | PNG | 146×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-027-laura.png | chibi-027-laura.png | PNG | 143×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-028-leon.png | chibi-028-leon.png | PNG | 173×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-029-lila.png | chibi-029-lila.png | PNG | 193×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-030-luna.png | chibi-030-luna.png | PNG | 201×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-031-luqueta.png | chibi-031-luqueta.png | PNG | 158×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-032-maro.png | chibi-032-maro.png | PNG | 148×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-034-miguel.png | chibi-034-miguel.png | PNG | 153×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-035-misha.png | chibi-035-misha.png | PNG | 141×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-036-moco.png | chibi-036-moco.png | PNG | 170×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-037-morse.png | chibi-037-morse.png | PNG | 175×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-038-nairi.png | chibi-038-nairi.png | PNG | 147×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-039-nero.png | chibi-039-nero.png | PNG | 159×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-040-nikita.png | chibi-040-nikita.png | PNG | 137×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-041-notora.png | chibi-041-notora.png | PNG | 143×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-042-olivia.png | chibi-042-olivia.png | PNG | 139×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-043-orion.png | chibi-043-orion.png | PNG | 169×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-044-oscar.png | chibi-044-oscar.png | PNG | 147×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-045-otho.png | chibi-045-otho.png | PNG | 139×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-046-paloma.png | chibi-046-paloma.png | PNG | 162×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-047-rafael.png | chibi-047-rafael.png | PNG | 136×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-048-rin.png | chibi-048-rin.png | PNG | 140×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-049-ryden.png | chibi-049-ryden.png | PNG | 136×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-050-santino.png | chibi-050-santino.png | PNG | 187×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-051-shani.png | chibi-051-shani.png | PNG | 144×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-052-shirou.png | chibi-052-shirou.png | PNG | 146×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-054-sonia.png | chibi-054-sonia.png | PNG | 128×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-055-steffie.png | chibi-055-steffie.png | PNG | 159×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-056-suzy.png | chibi-056-suzy.png | PNG | 143×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-057-tatsuya.png | chibi-057-tatsuya.png | PNG | 155×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-058-thiva.png | chibi-058-thiva.png | PNG | 134×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-059-wolfrahh.png | chibi-059-wolfrahh.png | PNG | 150×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-060-wukong.png | chibi-060-wukong.png | PNG | 155×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-061-xayne.png | chibi-061-xayne.png | PNG | 169×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-062-andrew-thuc-tinh.png | chibi-062-andrew-thuc-tinh.png | PNG | 168×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-299-ray.png | chibi-299-ray.png | PNG | 151×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-377-kenta-o-ob55.png | chibi-377-kenta-o-ob55.png | PNG | 162×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-418-yeu-nu-ta-linh-dang-1.png | chibi-418-yeu-nu-ta-linh-dang-1.png | PNG | 209×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-419-yeu-nu-ta-linh-dang-2.png | chibi-419-yeu-nu-ta-linh-dang-2.png | PNG | 197×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-425-linh-dich-ao-choang.png | chibi-425-linh-dich-ao-choang.png | PNG | 154×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-hac-anh.png | chibi-hac-anh.png | PNG | 144×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-maxim.png | chibi-maxim.png | PNG | 146×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-thu-v1-004-alvaro.png | chibi-thu-v1-004-alvaro.png | PNG | 157×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/chibi-tinh-van.png | chibi-tinh-van.png | PNG | 151×360 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/mc-kelly.png | mc-kelly.png | PNG | 274×640 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |
| assets-local/chibi-clean/trophy-stage.png | trophy-stage.png | PNG | 1408×900 | có | Bản thay thế ngoài nguồn runtime được duyệt; không dùng theo C-0046. | KHÔNG DÙNG — C-0046 chỉ định assets-local/chibi/ | Không dùng theo C-0046 |

### Ảnh thử và contact sheet nội bộ (11)

| Đường dẫn | Tên file | Định dạng | Pixel | Alpha | Vai trò | Trạng thái | Component |
|---|---|---|---:|---|---|---|---|
| assets-local/chibi-clean/.preview/alvaro-trial.png | alvaro-trial.png | PNG | 157×360 | có | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/chibi-002-a124.png | chibi-002-a124.png | PNG | 154×360 | có | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/chibi-004-alvaro.png | chibi-004-alvaro.png | PNG | 154×360 | có | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/chibi-005-andrew.png | chibi-005-andrew.png | PNG | 152×360 | có | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/contact-1.jpg | contact-1.jpg | JPEG | 950×1100 | không | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/contact-2.jpg | contact-2.jpg | JPEG | 950×1100 | không | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/contact-3.jpg | contact-3.jpg | JPEG | 950×880 | không | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/extras-sheet.png | extras-sheet.png | PNG | 840×520 | không | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/kelly-preview.png | kelly-preview.png | PNG | 274×640 | có | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/sheet.png | sheet.png | PNG | 660×420 | không | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |
| assets-local/chibi-clean/.preview/trophy-preview.png | trophy-preview.png | PNG | 1408×900 | có | Ảnh thử/collage; chỉ review, không runtime. | PREVIEW — không dùng runtime | Review only |

### MC Kelly và asset chiến thắng (3)

| Đường dẫn | Tên file | Định dạng | Pixel | Alpha | Vai trò | Trạng thái | Component |
|---|---|---|---:|---|---|---|---|
| assets-local/mc/kelly.png | kelly.png | PNG | 273×640 | có | Cutout MC Kelly PNG alpha; nguồn ảnh tĩnh/fallback đã duyệt. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | MC Character Layer + McSequence fallback |
| assets-local/victory/bg.jpg | bg.jpg | JPEG | 1080×1920 | không | Background scene chiến thắng; đang dùng riêng VictoryStage. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | VictoryStage background |
| assets-local/victory/trophy-stage.png | trophy-stage.png | PNG | 1408×900 | có | Cúp/sân khấu PNG alpha; đang dùng riêng VictoryStage. | SỬ DỤNG ĐƯỢC — nguồn runtime được duyệt | VictoryStage trophy |

### Logo sự kiện và thẻ tham chiếu (2)

| Đường dẫn | Tên file | Định dạng | Pixel | Alpha | Vai trò | Trạng thái | Component |
|---|---|---|---:|---|---|---|---|
| assets-local/brand/logo.png | logo.png | PNG | 1089×1125 | có | Logo chính thức “Bá Vương Đại Chiến — Ai là nhà vua bá khí”; dùng nguyên ảnh, giữ tỉ lệ, glow và tagline. | SỬ DỤNG ĐƯỢC — C-0049 | Header + Victory |
| assets-local/cards/the-chien-dau-ffvn-kelly.png | the-chien-dau-ffvn-kelly.png | PNG | 1107×1421 | có | Thẻ Kelly chỉ làm visual reference cho viền neon và dải tên chéo. | THAM CHIẾU — C-0050, không runtime | Top 3/nameplates |

### Âm thanh tùy chọn

Các file âm thanh có thể đặt trong `assets-local/audio/`; mỗi slot hỗ trợ `.mp3` hoặc `.ogg` và thay thế âm tổng hợp có cùng tên.

| Slot | File tùy chọn | Sự kiện |
|---|---|---|
| `question-enter` | `question-enter.mp3` / `.ogg` | Câu hỏi mới xuất hiện |
| `countdown-tick` | `countdown-tick.mp3` / `.ogg` | Mỗi giây trong 5 giây cuối |
| `timeout` | `timeout.mp3` / `.ogg` | Hết thời gian trả lời |
| `correct-answer` | `correct-answer.mp3` / `.ogg` | Công bố đáp án đúng |
| `top10` | `top10.mp3` / `.ogg` | Mở bảng Top 10 |
| `victory` | `victory.mp3` / `.ogg` | Vinh danh chiến thắng |
| `transition` | `transition.mp3` / `.ogg` | Chuyển cảnh chung |
| `bgm` | `bgm.mp3` / `.ogg` | Nhạc nền lặp, mặc định tắt |

Hiện trạng xác minh C-0196: `countdown-tick.mp3` và `.ogg` là asset runtime tùy chọn ngoài Git; không có hai file này trong cây mã nguồn. Overlay yêu cầu đúng đường dẫn `/assets/audio/countdown-tick.{mp3,ogg}`, khớp với route `/assets/*` và thư mục `assets-local/audio/`. Nếu file không được cài ở thư mục asset runtime, hai phản hồi 404 là dự kiến; audio engine bỏ qua file thiếu và phát âm tổng hợp. Không cần sửa URL hay thêm file giả.

Điều khiển URL overlay: `sfx=0..1`, `bgm=0..1`, `volume=0..1` (master; SFX mặc định 0.6, BGM 0).

## Tài nguyên phụ trợ không phải ảnh

| Đường dẫn | Dạng | Vai trò | Trạng thái |
|---|---|---|---|
| `assets-local/chibi/manifest.json` | JSON | Manifest 66 ID/file; khớp kho ảnh runtime | Đang dùng |
| `assets-local/chibi-clean/manifest.json` | JSON | Bản thay thế ngoài nguồn đã duyệt | Không dùng theo C-0046 |
| `assets-local/review/cutout-sheet.html` | HTML | Sheet review chibi/Kelly/cúp | Review only |
| `assets-local/mc/kelly/HUONG_DAN.txt` | TXT | Hướng dẫn sequence; chưa có manifest/frame | Hướng dẫn |
| `docs/ASSET_SPEC_MC_SEQUENCE.md` | Markdown | Schema/FPS/anchor cho McSequence | Đặc tả |

## Runtime và preview

- Server Character Pool đọc `assets-local/chibi/manifest.json`; overlay render `/assets/chibi/{characterId}.png`. C-0046 xác nhận đây là 66 ảnh đã tách nền sạch và là nguồn được duyệt.
- MC dùng `<McSequence state={snapshot.mc.state} />`; khi thiếu `assets-local/mc/kelly/manifest.json` hoặc frame, component dùng `/assets/mc/kelly.png`.
- Vite proxy và Playwright cần phục vụ `/assets` từ server; asset bank nằm ngoài Git nên kiểm tra ảnh thật chỉ chạy khi local assets có mặt.
