# Đặc tả Theme Pack

> **Bản nháp Phase 2 — chỉ đặc tả, chưa triển khai loader.** Theme Pack đổi giao diện và cung cấp mặc định phiên; Quiz Engine, câu hỏi, đáp án đúng và kết quả vẫn thuộc server. Giao diện hiện hành tiếp tục dùng token màu và CSS; chưa nạp ảnh tham chiếu.

## 1. Mục tiêu và nguyên tắc

Theme Pack là một gói dữ liệu có manifest đã kiểm tra, tài sản tĩnh, token bố cục/màu/chữ, mặc định phiên tùy chọn và tham chiếu đến bộ câu hỏi. Một pack không chứa mã có thể thực thi.

Các nguyên tắc bắt buộc:

1. **Manifest có phiên bản:** `schemaVersion` xác định cấu trúc manifest; `packVersion` xác định phiên bản nội dung theo SemVer. Không tự nâng schema cũ theo phỏng đoán.
2. **Chỉ dữ liệu khai báo:** cấm JavaScript, TypeScript, WebAssembly, HTML tùy biến, CSS tùy biến, script build, event handler và URL tải mã/tài sản từ xa. Renderer của ứng dụng tạo DOM và CSS; pack chỉ chọn token, asset và giá trị trong schema cho phép.
3. **Không điều khiển luật chấm:** pack không thể thay điểm đúng/sai, streak, tie-break, hạn nhận đáp án, state machine hoặc logic quyền operator. Engine và server là nguồn có thẩm quyền.
4. **Tải nguyên tử:** xác thực toàn bộ manifest và tài sản trước khi kích hoạt. Pack hợp lệ được dùng trọn vẹn; pack lỗi bị từ chối trọn vẹn, không trộn một phần tài sản với theme đang chạy.
5. **An toàn theo mặc định:** tên người chơi, câu hỏi, tên pack và metadata đều là dữ liệu không tin cậy; không render bằng HTML tùy ý.
6. **Có quyền sử dụng:** chỉ đóng gói asset có nguồn, giấy phép và quyền hiển thị LIVE đã xác nhận. Repo GitHub public không phải nơi lưu ảnh nguồn chưa được duyệt.

## 2. Cấu trúc gói

Một pack đã giải nén có dạng:

```text
storm-arena/
├── manifest.json
└── assets/
    ├── brand/
    ├── backgrounds/
    ├── stage/
    ├── characters/
    └── fonts/
```

Đường dẫn trong manifest luôn tương đối với thư mục pack. `manifest.json` tham chiếu mọi file được dùng; file thừa không được tự động tải. Bộ câu hỏi lưu riêng trong Question Bank — manifest chỉ liệt kê ID bộ câu hỏi.

## 3. Manifest v1 đề xuất

Ví dụ dưới đây mô tả hình dạng dữ liệu; đường dẫn trong ví dụ chỉ là placeholder, không khẳng định repo hiện đã có các asset đó.

```json
{
  "schemaVersion": 1,
  "packVersion": "1.0.0",
  "id": "storm-arena",
  "name": "Đấu Trường Bão Tố",
  "engineCompatibility": { "min": "0.1.0" },
  "canvas": { "width": 1080, "height": 1920 },
  "assets": {
    "brandLogo": { "path": "assets/brand/logo.webp", "kind": "image", "required": true },
    "arenaBackground": { "path": "assets/backgrounds/arena.webp", "kind": "image", "required": false },
    "trophy": { "path": "assets/stage/trophy.webp", "kind": "image", "required": false }
  },
  "tokens": {
    "colors": {
      "deepBlue": "#2D387F",
      "violet": "#7049F5",
      "gold": "#FFCC58",
      "coral": "#E47E5F",
      "pink": "#D24470",
      "electricBlue": "#8CC8FB"
    },
    "typography": {
      "display": { "family": "system-ui", "weight": 700 },
      "body": { "family": "system-ui", "weight": 500 }
    },
    "layout": { "headerHeight": 180, "contentGap": 24 }
  },
  "layers": {
    "background-storm": { "asset": "arenaBackground", "fit": "cover" },
    "brand-header": { "asset": "brandLogo", "fit": "contain" },
    "trophy": { "asset": "trophy", "fit": "contain" }
  },
  "safeZoneSuggestion": {
    "top": 230, "bottom": 690, "left": 0, "right": 130,
    "official": false, "basis": "initial-test-preset"
  },
  "ruleDefaults": {
    "questionsPerRound": 15,
    "leaderboardInterval": 5,
    "questionCollectionIds": ["storm-arena-approved"]
  },
  "credits": [
    { "asset": "brandLogo", "source": "approved source reference", "license": "approved for LIVE" }
  ]
}
```

### Trường và ràng buộc

| Trường | Quy tắc |
|---|---|
| `schemaVersion` | Bắt buộc; số nguyên dương được loader hỗ trợ. Schema lạ → từ chối pack. |
| `packVersion` | Bắt buộc; SemVer. Bản sửa nội dung tăng phiên bản, không ghi đè phiên bản đang được phiên dùng. |
| `id`, `name` | Bắt buộc; ID ổn định, không rỗng; tên hiển thị là text thuần. |
| `engineCompatibility` | Bắt buộc; phiên bản engine tối thiểu (và tối đa nếu khai báo). Không tương thích → không kích hoạt. |
| `canvas` | Bắt buộc cho overlay; logical canvas cố định 1080×1920, ứng dụng tự scale đồng nhất. |
| `assets` | Bản đồ ID ổn định → file tương đối, loại media đã khai báo và cờ bắt buộc. Mọi layer chỉ tham chiếu ID trong bản đồ này. |
| `tokens` | Chỉ chứa các khóa màu, typography, spacing và layout đã allowlist. Không nhận CSS, selector, markup hay biểu thức. |
| `layers` | Chỉ dùng các layer ID và cách fit/transform do ứng dụng hỗ trợ; không định nghĩa layer chạy mã. |
| `safeZoneSuggestion` | Gợi ý ban đầu tùy chọn; luôn `official: false`. Operator có thể chỉnh và lưu preset kiểm thử riêng. Không được quảng bá số đo là chuẩn TikTok chính thức. |
| `ruleDefaults` | Tùy chọn, chỉ là giá trị khởi tạo được schema cho phép (ví dụ số câu, nhịp BXH, bộ câu hỏi). Không chứa công thức chấm hoặc luật tùy ý. |
| `credits` | Bắt buộc với asset thương hiệu/nhân vật: nguồn và giấy phép/quyền sử dụng. Thiếu phê duyệt thì không đưa asset đó vào pack phát hành. |

## 4. Token Storm Arena

Các màu từ Visual Guide là token cơ sở; ý nghĩa cụ thể được ánh xạ vào khóa CSS do ứng dụng định nghĩa:

| Token | Giá trị | Vai trò gợi ý |
|---|---|---|
| `deepBlue` | `#2D387F` | nền xanh đậm, bề mặt chính |
| `violet` | `#7049F5` | màu nhận diện/phụ |
| `gold` | `#FFCC58` | điểm nhấn, vị trí dẫn đầu |
| `coral` | `#E47E5F` | điểm nhấn ấm |
| `pink` | `#D24470` | điểm nhấn phụ |
| `electricBlue` | `#8CC8FB` | viền/điểm nhấn sáng |

Không dùng màu nhấn làm nền chữ dài nếu tương phản không đạt. Câu hỏi, timer, đáp án, tên và điểm phải ưu tiên độ đọc; validator/preview cần kiểm tra tương phản của cặp foreground/background. Màu của pack không được ghi đè trạng thái ngữ nghĩa do ứng dụng kiểm soát (ví dụ đúng, sai, cảnh báo hoặc mất kết nối) nếu làm mất phân biệt.

Font GFF Latin Black/Bold/Medium chỉ là tham chiếu thị giác, không tự đóng gói hay phân phối file font. Trước khi nhúng font cần xác minh quyền nhúng và đủ glyph tiếng Việt; nếu không, dùng font sans-serif có giấy phép phù hợp và fallback hệ thống. Không tải font từ URL ngoài.

## 5. Tài sản, hoạt ảnh và quyền sử dụng

- V1 chỉ nhận asset tĩnh PNG, WebP hoặc JPEG; SVG, HTML, video, executable, file archive lồng nhau và font chưa được phê duyệt bị từ chối. Nếu cần hoạt ảnh nhân vật, dùng manifest PNG Sequence theo schema riêng: frame `0001.png` trở đi, số frame/FPS/loop rõ ràng, kích thước canvas và anchor nhất quán, cùng fallback poster tĩnh.
- Asset nền, logo, sân khấu, cúp, nhân vật, khung và font là lớp riêng. Không gộp câu hỏi, đáp án, timer, tên, điểm hoặc thứ hạng vào một ảnh nền.
- Chỉ dùng logo giải đấu/đội được duyệt; không tự tạo logo Free Fire. Giữ nguyên hình học cúp/sân khấu được phê duyệt, không thay bằng ba khối bục đánh số.
- Nếu chưa có file đã duyệt hoặc alpha đúng, dùng renderer CSS/placeholder được gắn nhãn. Không giả vờ rằng asset tham chiếu đã được đóng gói.
- Manifest giữ nguồn và quyền; pack có thể kèm `ASSET_APPROVALS.json` ngoài phạm vi schema nếu quy trình phát hành cần chứng từ chi tiết. Asset chưa duyệt không được đưa vào archive public.

## 6. Kiểm tra trước khi kích hoạt

Loader Phase 2 phải từ chối pack khi có bất kỳ lỗi bắt buộc nào sau đây:

1. JSON lỗi, trường bắt buộc thiếu, khóa lạ trong schema nghiêm ngặt, ID trùng hoặc phiên bản không hỗ trợ.
2. Đường dẫn tuyệt đối, `..`, ký tự null, dấu phân cách không chuẩn, link ngoài, symlink hoặc đường dẫn thoát khỏi thư mục pack (bao gồm Zip Slip khi giải nén).
3. File không được manifest tham chiếu, sai đuôi so với nội dung thực, MIME không hỗ trợ, file hỏng, asset bắt buộc thiếu hoặc font/logo cần thiết không có.
4. Kích thước archive/từng file, số lượng file, kích thước ảnh, số frame hoặc thời lượng vượt ngưỡng cấu hình validator. Đề xuất khởi đầu: manifest ≤256 KiB, archive đã giải nén ≤250 MiB, file ≤20 MiB, ảnh tối đa 4096 px mỗi chiều và 16 megapixel; phải benchmark và có thể điều chỉnh trước khi chốt.
5. Tham chiếu asset không tồn tại, giá trị token ngoài schema, màu không hợp lệ, layout vượt canvas, text thiết yếu rơi ngoài vùng đã kiểm tra, font thiếu glyph tiếng Việt hoặc tương phản nội dung thiết yếu quá thấp.
6. Có JS/TS/WASM, CSS/HTML tùy biến, event handler, import, URL `http(s):`, data URL thực thi, hoặc trường không được schema cho phép nhằm chạy lệnh.
7. Thiếu nguồn/quyền sử dụng cho tài sản có bản quyền hoặc nhãn duyệt bắt buộc.

Validator trả lỗi có mã, đường dẫn manifest và giải thích thao tác sửa; không chạy hoặc “thử render” nội dung không tin cậy để phát hiện mã độc.

## 7. Safe zone và bố cục

Canvas chuẩn là 1080×1920, nhưng safe zone thay đổi theo thiết bị và chế độ LIVE. Gợi ý `top=230`, `bottom=690`, `right=130` là preset thử nghiệm ban đầu, không phải thông số chính thức. Không cố định những số đo này như quy tắc chung trong pack.

Operator có thể chỉnh preset qua dashboard/HUD Simulator. Câu hỏi, timer, lựa chọn, thứ hạng, tên và điểm phải nằm trong vùng đã kiểm tra; phần khán giả/trang trí có thể bị che một phần. Nếu thiếu chỗ, giảm trang trí/branding hoặc ẩn Top 10 gọn trước; không thu nhỏ chữ câu hỏi đến mức khó đọc. Chỉ dùng hướng dẫn safe-zone trong preview; không hiện đường guide trong luồng phát.

## 8. Chọn, đổi và fallback

- Khi bắt đầu phiên/vòng, server ghim `packId` và `packVersion` vào snapshot. Không đổi theme, question collection hoặc rule defaults giữa một câu hỏi đang hoạt động.
- Muốn đổi pack đang dùng, operator xác nhận transition ở trạng thái cho phép (ví dụ Lobby); ứng dụng validate và nạp trọn pack mới trước, sau đó mới chuyển.
- Pack lỗi trước khi bắt đầu: từ chối Start, nêu lý do và dùng generic theme để operator vẫn có dashboard/preview sửa cấu hình.
- Pack hỏng hoặc thiếu asset trong khi phiên đang chạy: giữ state, timer, câu hỏi, điểm và kết nối server; renderer có thể chuyển sang generic theme an toàn để tiếp tục phát hình. Ghi cảnh báo và yêu cầu operator xử lý sau câu hiện tại. Không đổi pack/gameplay rules âm thầm.
- Generic theme là tài nguyên tích hợp sẵn, không cần network hay Theme Pack khác; phải hiển thị câu hỏi, đáp án, timer, trạng thái kết nối và BXH bằng CSS/text cơ bản.
- Fallback hình ảnh: poster tĩnh → asset nền/placeholder an toàn → nền CSS; fallback font: font pack được cấp phép → font sans-serif có hỗ trợ tiếng Việt do ứng dụng chọn → sans-serif hệ thống.

## 9. Phạm vi triển khai đề xuất

DP4 chỉ chốt đặc tả. Loader, validator, import/export, gallery và bước kiểm Theme Pack thuộc Phase 2 và cần task riêng. Không thêm code hoặc đưa ảnh đầu vào vào overlay trong phạm vi tài liệu này.

### Nguồn

- `CLAUDE_MASTER_BUILD_PLAN_V2.md` mục 8 — Theme Pack contract, tài sản, token Storm Arena và nguyên tắc không có script.
- `STORM_ARENA_CLAUDE_BUILD_SPEC_V3.md` mục 3, 4, 7, 8, 9, 11 — layer, asset, PNG Sequence, safe zone và visual design.
- `docs/V3_AUDIT.md` — trạng thái theme-core và quyền/tình trạng asset.
- `packages/theme-core/src/index.ts` — xác nhận loader hiện vẫn là stub Phase 2.
- `packages/contracts/src/index.ts` — safe-zone preset thử nghiệm hiện hành.
