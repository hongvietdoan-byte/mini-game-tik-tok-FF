# Visual Gap Analysis — Storm Arena

> STEP 2 đã được duyệt qua C-0042. Baseline hiện gồm `test-results/e2e/screenshots/question.png` (1080×1920), brief C-0032 và screenshot target đầy đủ `Đấu Trường Bão Tố_ MC Kelly Live Quiz.png` do người dùng vừa gửi. C-0046 chốt ảnh nhân vật runtime: chỉ dùng `assets-local/chibi/` và `assets-local/mc/kelly.png`; screenshot mẫu là tham chiếu, không runtime.

| Component | Hiện trạng sau refresh V3 | Asset/source được duyệt | Thay đổi cần thực hiện | Ưu tiên |
|---|---|---|---|---|
| Header/logo | Logo Storm Arena vẫn là chữ CSS; logo Bá Vương Đại Chiến dùng ảnh chính thức với nguyên tỉ lệ/tagline và CSS fallback. | C-0049 duyệt `assets-local/brand/logo.png` (1089×1125, alpha). | Giữ glow/tagline nguyên vẹn; logo chữ Storm Arena và dữ liệu vòng/người chơi vẫn tách lớp. | P0 |
| Background/Arena | Trước đó phẳng và thiếu nhận diện. Đã thêm xoáy bão xanh tím, tia điện, giàn truss, cờ khiên vương miện, sàn đấu và khán đài nhiều lớp bằng SVG/CSS. | Screenshot target người dùng gửi dùng để so bố cục/ánh sáng; không làm background runtime. | Soát cường độ neon, độ sâu tầng và khả năng đọc trên preview 1080×1920. | P0 |
| Quiz frame/timer | Câu hỏi/timer/4 đáp án dynamic; khung CSS đã có nhưng cần soát hierarchy/spacing với brief. | Không có frame bitmap; C-0042 chấp thuận CSS/SVG. | Tinh chỉnh khung lục giác, viền có kiểm soát, bảo toàn safe zone/reveal. | P1 |
| Leaderboard Top 10 | Top 10 + điểm dynamic, huy hiệu x2/x3 đã có; tên dài dùng ellipsis và cột điểm riêng. | Không có frame/medal bitmap riêng. | Soát typography, rank 1–3 và 6 chữ số trên ảnh 1080×1920. | P1 |
| MC Kelly | `McSequence` tích hợp theo `snapshot.mc.state`; ảnh static được crop bán thân từ mép trên. Sequence chưa có manifest/frame. | Chỉ `assets-local/mc/kelly.png` (273×640 alpha) được duyệt; fallback ảnh tĩnh. | Kiểm tra điểm crop và không cắt mặt/biểu cảm ở các state. | P0 |
| Audience 7×5 | 35 chibi được crop bán thân từ mép trên; ghế có mặt trước vát và bậc neon phối cảnh. | Character Pool 66 PNG alpha tại `assets-local/chibi/`, manifest khớp; đây là nguồn chibi runtime duy nhất. | Kiểm tra phần đầu/vai và tên ở cả 7 hàng, không dùng bộ cũ. | P0 |
| Nameplates | Tên khán giả giữ pill sáng có viền neon; podium dùng khung vát gradient và dải chéo CSS. | Thẻ `assets-local/cards/the-chien-dau-ffvn-kelly.png` là tham chiếu C-0050, không dùng làm asset runtime. | Giữ truncate/độ đọc; không ghép thẻ Kelly vào người chơi khác. | P2 |
| Victory | `VictoryStage` dùng trophy-stage alpha + background Victory. | `assets-local/victory/trophy-stage.png` và `bg.jpg` có sẵn. | Giữ cúp/tên/điểm là các lớp riêng; kiểm tra safe zone. | P1 |
| Lightning/VFX | Hiệu ứng sét CSS; chưa có VFX rời. | C-0042 chấp thuận CSS/SVG nhẹ. | Giữ một lớp trang trí, tránh glow động trên từng ghế. | P2 |
| PNG Sequence | McSequence có loader/cache/fallback; thư mục state có nhưng chỉ HUONG_DAN, chưa có manifest/frame. | Ảnh Kelly tĩnh được duyệt; sequence chưa có. | Không dựng frame giả; graceful fallback tới Kelly tĩnh. | P2 |
| Vite/E2E assets | Vite trước đây chỉ proxy `/api`, `/ws`, nên browser screenshot fallback dù server có `/assets`. | Backend static route `/assets/*`; local `assets-local` ngoài Git. | Thêm proxy `/assets`, Playwright khởi chạy/reuse server và truyền asset root; thêm test kiểm naturalWidth với local asset bank. | P0 |
| TikTok HUD simulator | HUD demo có LIVE header, nút tương tác bên phải, bình luận và thanh nhập; ẩn khi không bật. Safe-zone guide đọc giá trị chỉnh qua query. | Không cần bitmap; HUD là CSS/HTML, không gọi giao diện TikTok thật. | `?hud=1&safeTop=...&safeRight=...&safeBottom=...&safeLeft=...&safeRightFromY=...`; E2E kiểm tra hiển thị và biến safe-zone. | XONG |

## Tình trạng xác nhận

- C-0042 duyệt CSS/SVG cho branding, quiz frames, khán đài và VFX; ảnh trọn scene không có, tiếp tục theo mô tả.
- C-0046 thay chỉ dẫn C-0039 về `chibi-clean`: nhân vật runtime dùng `assets-local/chibi/` (66 PNG alpha) và Kelly tại `assets-local/mc/kelly.png`; bộ backup cũ không được scan/dùng.
- C-0049 cho phép logo chính thức `assets-local/brand/logo.png`; C-0050 cho thẻ FFVN.Kelly làm tham chiếu phong cách khung, không dùng làm ảnh nhân vật runtime.
- Audit source paths đang bị `.gitignore`; không đưa ảnh input vào commit/public repo.
