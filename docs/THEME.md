# Tạo và đổi giao diện theo sự kiện

Theme là một thư mục chứa `theme.json` và các tệp hình, video, âm thanh hoặc font. Bạn có thể sao chép một theme, thay màu/chữ và thay tệp asset; không cần sửa mã nguồn. Theme chỉ thay diện mạo, không thay vị trí hoặc kích thước các khung trên màn hình.

## Thư mục theme gồm những gì?

Mỗi theme nằm trong một thư mục con của `data/themes` (hoặc thư mục đặt ở biến môi trường `QUIZ_THEMES_DIR`):

```text
data/themes/
└── tet-2027/
    ├── theme.json
    ├── assets/
    │   ├── arena/
    │   ├── audio/
    │   ├── brand/
    │   ├── chibi/
    │   ├── mc/
    │   └── victory/
    └── fonts/
```

Repo không chứa asset riêng của người dùng. Mỗi file tối đa 50 MB; hỗ trợ PNG, JPG/JPEG, WebP, GIF, SVG, WebM, MP4, MP3, OGG, WAV và WOFF2. Đường dẫn trong JSON dùng dấu `/`, tương đối từ thư mục theme; không dùng `..`, đường dẫn tuyệt đối hoặc symlink.

## Tạo bản mặc định để làm mẫu

Từ thư mục dự án, chạy:

```powershell
pnpm theme:export-default
```

Lệnh xuất vào `data/themes/default`, lấy asset từ `QUIZ_ASSETS_DIR` hoặc `assets-local`. Bạn cũng có thể chỉ định thư mục:

```powershell
pnpm theme:export-default --out data/themes/default --assets assets-local
```

Asset đang thiếu sẽ được bỏ qua và có cảnh báo. Lệnh không ghi đè thư mục đã tồn tại; chỉ dùng `--force` khi muốn cập nhật gói tại đúng đường dẫn đó. Sau khi xuất, hãy sao chép thư mục `default`, đổi tên thư mục và trường `id` (chỉ chữ thường, số, dấu gạch ngang), rồi sửa bản sao.

## Sửa màu và chữ

Trường `tokens` là các biến CSS dạng `--theme-<tên>`. Tên token chỉ gồm chữ thường, số và dấu gạch ngang; tên có sẵn trong giao diện hiện tại:

| Token | Dùng cho |
| --- | --- |
| `deep` | Nền xanh tím đậm |
| `violet` | Tím nhấn |
| `gold` | Vàng nhấn |
| `sky` | Xanh sáng |
| `pink` | Hồng |
| `coral` | San hô |
| `ink` | Chữ/nền tối |
| `neon` | Ánh sáng xanh |
| `paper` | Chữ sáng |
| `font-body` | Font chữ chung, ví dụ `'Segoe UI', sans-serif` |

Theme có thể thêm token mới, nhưng token chỉ có tác dụng khi giao diện sử dụng biến đó. Giá trị tối đa 200 ký tự; không nhập dấu `;`, `{`, `}`, `<`, `url(` hoặc `expression`.

## Asset theo slot

Tên slot là cố định. Nếu bỏ một slot, giao diện dùng asset mặc định của ứng dụng.

| Slot | Mặc định hiện tại / nội dung |
| --- | --- |
| `arena.background` | `assets/arena/bg.jpg`, nền đấu trường dọc (khuyến nghị 1080×1920) |
| `arena.questionBackground` | `assets/arena/bg-question-user.jpg`, nền khi hiện câu hỏi |
| `arena.flag.0` … `arena.flag.7` | Cờ đội 1–8; mỗi slot là một ảnh riêng |
| `arena.loopVideoWebm`, `arena.loopVideoMp4` | Video nền đấu trường lặp |
| `brand.logo` | Logo thương hiệu |
| `mc.static` | Ảnh tĩnh dự phòng cho MC |
| `mc.sequenceDir` | Thư mục sequence ảnh MC; nếu thiếu sequence, ảnh tĩnh được dùng |
| `chibi.bankDir` | Thư mục ảnh chibi theo mã nhân vật |
| `victory.background` | `assets/victory/bg.jpg`, nền chiến thắng |
| `victory.userCover` | `assets/victory/bg-user-cover.jpg`, nền bìa người chơi |
| `victory.trophyStage` | Ảnh cúp/sân khấu |
| `audio.question-enter`, `audio.countdown-tick`, `audio.timeout`, `audio.correct-answer`, `audio.top10`, `audio.victory`, `audio.transition` | Hiệu ứng âm thanh từng sự kiện |
| `audio.bgm-lobby`, `audio.bgm-game`, `audio.bgm` | Nhạc sảnh, nhạc trong lượt và nhạc dự phòng |

Các slot file trỏ tới tệp trong `assets/`; hai slot `chibi.bankDir` và `mc.sequenceDir` trỏ tới thư mục. Font khai báo riêng trong mảng `fonts` và tệp phải là WOFF2. Với `mc.sequenceDir`, server chỉ phục vụ thêm đúng file metadata `manifest.json` trong thư mục sequence để overlay tìm các frame; các JSON khác không được phục vụ.

## Kiểm tra và chọn theme

Trước khi dùng, chạy:

```powershell
pnpm theme:validate data/themes/tet-2027
```

Nếu có lỗi, lệnh sẽ chỉ rõ trường/path cần sửa bằng tiếng Việt. Khởi động lại server (hoặc dùng chức năng tải lại theme) sau khi chép theme mới. Mở Dashboard → phần **Theme** → chọn theme hợp lệ. Theme đang dùng được lưu lại khi server khởi động lại; theme thiếu hoặc hỏng sẽ tạm dùng giao diện mặc định.

Ví dụ cấu trúc JSON nằm tại [`theme.example.json`](./theme.example.json).
