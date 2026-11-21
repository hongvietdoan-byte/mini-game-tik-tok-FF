# Tạo và đổi giao diện theo sự kiện

Theme chỉ thay diện mạo: asset ảnh/video/âm thanh, màu, font, ảnh MC/chibi, chữ thương hiệu và danh hiệu. Bố cục V3 ngày 14/11 là cố định: theme không được đổi vị trí hoặc kích thước khung. Theme không chứa bộ câu hỏi hay giọng đọc MC.

## Tạo theme mới

Từ thư mục dự án:

```powershell
pnpm theme:export-default
pnpm theme:new tet-2027 --name "Tết 2027"
```

`theme:export-default` tạo `data/themes/default` từ `QUIZ_ASSETS_DIR` hoặc `assets-local`; nó không ghi đè thư mục sẵn có nếu thiếu `--force`. `theme:new` sao chép theme mặc định sang `data/themes/<id>`, cập nhật id/tên và tạo `CAN-CHUAN-BI.md` liệt kê toàn bộ slot cùng thông số. Id chỉ gồm chữ thường, số và dấu gạch ngang; thư mục đích phải chưa tồn tại.

Làm theo thứ tự:

1. Chạy `pnpm theme:new <id> --name "<Tên>"`.
2. Thay file trong `assets/` theo bảng `CAN-CHUAN-BI.md`, hoặc sửa đường dẫn tương đối trong `theme.json`.
3. Chạy `pnpm theme:validate data/themes/<id>`.
4. Mở Dashboard → **Giao diện / Theme** → **Tải lại danh sách theme**.
5. Kiểm tra ảnh xem trước và chọn **Dùng theme này**. Nếu chữ HUD đã được điều hành viên sửa, Dashboard hỏi **“Dùng chữ của theme mới?”** trước khi ghi đè.

Không cần khởi động lại server. Theme đang dùng được lưu lại sau khi server khởi động lại. Chỉ đổi theme khi phiên ở `IDLE` hoặc `LOBBY`; trong vòng, nút bị khóa và nêu rõ lý do. Theme lỗi hiển thị thông báo tiếng Việt và không thể áp dụng.

## Cấu trúc gói

```text
data/themes/tet-2027/
├── theme.json
├── CAN-CHUAN-BI.md
├── assets/
└── fonts/
```

Mỗi tệp tối đa 50 MB. Định dạng được hỗ trợ: PNG, JPG/JPEG, WebP, GIF, SVG, WebM, MP4, MP3, OGG, WAV và WOFF2. Đường dẫn asset/font trong JSON dùng dấu `/`, tương đối từ thư mục theme; không dùng `..`, đường dẫn tuyệt đối hoặc symlink. Slot bị bỏ trống tiếp tục dùng asset dự phòng hiện có trong ứng dụng.

## Slot asset đang dùng ở overlay

Kích thước dưới đây là khung CSS cố định trên stage 1080 × 1920; ảnh `contain`/`cover` có thể có vùng trong suốt hoặc bị crop bên trong khung. Không đổi khung để ép ảnh vừa.

| Slot | Kích thước hiển thị / định dạng | Dùng ở đâu |
|---|---|---|
| `arena.background` | 1080 × 1920 px; JPG/PNG/WebP | Nền sảnh và đấu trường, cover toàn stage |
| `arena.questionBackground` | 1080 × 1920 px; JPG/PNG/WebP | Nền câu hỏi và công bố đáp án, cover toàn stage |
| `arena.flag.0`…`arena.flag.7` | Rộng 70 px ở cờ 1/8; 58 px ở cờ 2–7, cao theo tỉ lệ ảnh; PNG/JPG/WebP/SVG | Tám cờ hai bên sân khấu |
| `arena.loopVideoWebm`, `arena.loopVideoMp4` | Vùng 1080 × 1920 px, cover; WebM/MP4 | Video nền lặp ở câu hỏi, REVEAL và Victory; WebM được thử trước MP4 |
| `brand.logo` | Header 255 × 210 px; header QUESTION/REVEAL 172.8 × 178.5 px; Victory 502.2 × 501.1 px; PNG/WebP/SVG | Logo header và Victory, object-fit contain |
| `chibi.bankDir` | Khung thường 92 × 104 px; khung có ngai 70 × 78 px; PNG/JPG/WebP/GIF/SVG | Chibi ở các ghế; mỗi file con theo `characterId` |
| `chibi.podiumDir` | Khung Top 2/3: 240 × 420 px; PNG/JPG/WebP/GIF/SVG | `top2/top2-<characterId>.png` và `top3/top3-<characterId>.png` trong Victory |
| `throne.bankDir` | Ngai ghế 400 × 400 px; ảnh Top 1 Victory 440 × 520 px; PNG/JPG/WebP/GIF/SVG | Ngai trống và ngai của từng `characterId`; cùng slot chứa dáng Top 1 dùng trên podium Victory |
| `mc.static` | Khung cơ sở 250 × 290 px; compact 180 × 208 px; question/reveal 280 × 390 px hoặc 205 × 158 px theo bố cục; PNG/JPG/WebP/GIF/SVG | Ảnh tĩnh dự phòng của MC |
| `mc.sequenceDir` | Cùng khung MC theo cảnh; thư mục ảnh PNG/JPG/WebP/GIF/SVG và `manifest.json` | Pose idle/welcome/ask/react/celebrate; thiếu hoặc lỗi sequence dùng `mc.static` |
| `victory.background` | 1080 × 1920 px; JPG/PNG/WebP | Nền Victory, cover toàn stage |
| `victory.userCover` | 1080 × 1920 px; JPG/PNG/WebP | Nền bìa Victory; được ưu tiên hơn `victory.background` |
| `victory.trophyStage` | 1080 × 1920 px trong lớp nền; JPG/PNG/WebP/SVG | Dự phòng nền Victory khi không có hai slot nền trên |
| `audio.question-enter`, `audio.countdown-tick`, `audio.timeout`, `audio.correct-answer`, `audio.top10`, `audio.victory`, `audio.transition` | MP3/OGG/WAV, tối đa 50 MB | Hiệu ứng âm thanh theo sự kiện |
| `audio.victory-music-1`, `audio.victory-music-2` | MP3/OGG/WAV, tối đa 50 MB | Nhạc vinh danh sau jingle Victory; vòng chọn luân phiên, slot 2 tùy chọn |
| `audio.bgm-lobby`, `audio.bgm-game`, `audio.bgm` | MP3/OGG/WAV, tối đa 50 MB | Nhạc nền sảnh, trong lượt và slot dự phòng |

Ảnh nền phải là **lớp riêng, không có chữ hoặc khung UI**. Không dùng ảnh mẫu đã dựng cả giao diện làm nền. Logo và chibi nên có nền trong suốt. MC/chibi phải có đủ file cho các nhân vật được dùng; sequence MC phải có đủ pose trong `manifest.json`; danh sách chibi Top 2 và Top 3 phải đủ cho từng nhân vật có thể thắng.

Màu/font khai báo trong `tokens` và `fonts`. `ThemeStore` từ chối token điều khiển vị trí/kích thước (như `width`, `height`, `top`, `left`, `x` hoặc `y`), để giữ nguyên hình học. Logo/nền riêng đã tải lên ở phần HUD vẫn là cấu hình operator; asset cùng slot trong theme được ưu tiên, rồi HUD tùy chỉnh, rồi asset dự phòng của ứng dụng.

## Chữ và danh hiệu

Trường tùy chọn `texts` trong `theme.json` nhận các giá trị: `brandTitleLine1`, `brandTitleLine2`, `brandTagline`, `legacyBrandTitle`, `arenaWelcome`, `kicker`, `arenaTitle`, `playingLabel`, `roundLabel`, `leaderboardTitle`, `victoryTitle`. Giới hạn 200 ký tự; các chữ khác `victoryTitle` không được để trống. Giá trị mặc định được giữ nguyên để theme mặc định không làm thay đổi bố cục hoặc cỡ chữ. Chữ dài dùng `fitHudTextStyle` trong khung cố định.

Theme có thể khai báo `achievements` để thay nội dung, màu, icon và vị trí danh hiệu; cấu hình event riêng vẫn được ưu tiên hơn. Dashboard cho phép sửa danh hiệu của theme đang chọn, validate, xem trước, lưu hoặc xuất JSON. Không đổi luật/điểm khi đổi theme.

## Phần cố định và lý do

Các khung, seat, câu hỏi/đáp án, đồng hồ, bảng xếp hạng, podium, nhãn trạng thái, biểu tượng TikTok và hiệu ứng SVG/CSS được vẽ trong ứng dụng. Chúng không có file ảnh riêng để thay; giữ cố định để bảo toàn bố cục đã duyệt và khả năng đọc nội dung. Chữ nội dung câu hỏi, bình luận TikTok và giọng đọc MC không thuộc theme vì theme chỉ là lớp diện mạo.

## Ví dụ và kiểm tra

Manifest mẫu: [`theme.example.json`](./theme.example.json). Kiểm tra theme trước khi dùng:

```powershell
pnpm theme:validate data/themes/tet-2027
```

Lỗi sẽ nêu slot/path cần sửa bằng tiếng Việt. Theme không hợp lệ không thể áp dụng; theme hợp lệ được tải lại từ Dashboard và áp dụng trực tiếp mà không reload overlay.
