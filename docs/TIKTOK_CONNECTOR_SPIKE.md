# Khảo sát khả thi TikTok LIVE connector (11/11/2026)

Trạng thái: **BLOCKED — người dùng chọn hỏi kênh chính thức (11/11)**; thư nháp `docs/TIKTOK_OFFICIAL_REQUEST.md`. Không dùng repo/dịch vụ không chính thức. Chưa viết dòng code connector nào.
Nguồn: khảo sát web (danh mục TikTok for Developers, ToS TikTok, README các repo). Mục ghi "chưa xác minh" là chưa đối chiếu được.

## 1. Kênh chính thức
- **Không tìm thấy API công khai chính thức để đọc bình luận LIVE theo thời gian thực.** Danh mục sản phẩm TikTok for Developers
  (Login Kit, Share Kit, Content Posting, Embed, Research, Display, Data Portability, Green Screen, Commercial Content, Minis) không có API LIVE/Webcast/bình luận
  — https://developers.tiktok.com/products/
- TikTok LIVE Studio là phần mềm phát sóng, không phải SDK; không thấy plugin/extension SDK công khai (chưa xác minh với kênh nội bộ/đối tác).
- Chưa thấy chương trình đối tác LIVE công khai. Crowd Control có tích hợp TikTok LIVE, chưa rõ có phải hợp tác chính thức (chưa xác minh).
- ToS TikTok (ROW, mục 5) cấm "reverse engineer…", "automated scripts to collect information…", "bypass any measures we may use to prevent or restrict access"
  — https://www.tiktok.com/legal/page/row/terms-of-service/en

## 2. Repo / công cụ cộng đồng (tất cả KHÔNG chính thức)
| Phương án | Ngôn ngữ | ID ổn định | Reconnect | Phụ thuộc | License | Bảo trì |
|---|---|---|---|---|---|---|
| [zerodytrash/TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector) (~2.3k★) | Node/TS | `user.userId` (số) + `uniqueId` | Tự viết (có sự kiện DISCONNECTED, `waitUntilLive`) | **Sign server Euler Stream** (gói free giới hạn); đọc chat không cần đăng nhập; `authenticateWs` gửi cookie cho bên thứ ba | AGPL-3.0 có sửa đổi (cho nhúng vào app, cấm relay/SaaS đóng) | Còn hoạt động |
| [isaackogan/TikTokLive](https://github.com/isaackogan/TikTokLive) (~1.6k★) | Python | `unique_id` (ID số: chưa xác minh) | Tự viết | Euler mặc định (đổi được), cookie tuỳ chọn | AGPL sửa đổi | Còn hoạt động |
| [frankvHoof93/TikTokLiveSharp](https://github.com/frankvHoof93/TikTokLiveSharp) (~216★) | C#/Unity | chưa xác minh | chưa xác minh | signing (chưa xác minh) | chưa xác minh | 39 issue mở |
| [jwdeveloper/TikTokLiveJava](https://github.com/jwdeveloper/TikTokLiveJava) (~212★) | Java | chưa xác minh | có retry/onReconnecting | sessionId tuỳ chọn | MIT | Còn hoạt động |
| [steampoweredtaco/gotiktoklive](https://github.com/steampoweredtaco/gotiktoklive) (~45★) | Go | `User.ID` int64 | không rõ | Euler, 5 lần ký/phút | MIT | Ít hoạt động |
| [jwdeveloper/TikTokLiveRust](https://github.com/jwdeveloper/TikTokLiveRust) | Rust | — | — | khoá Euler bắt buộc | MIT | **Archive 14/7/2025** |
| [Euler Stream](https://www.eulerstream.com/) | dịch vụ WS | chưa xác minh | phía server | chính nó là bên ký request; có bán "Captcha API" | điều khoản riêng; free / từ $50/tháng | Còn hoạt động |
| [TikFinity](https://tikfinity.zerody.one/tiktok/dapi) desktop | WS cục bộ | chưa xác minh | chưa xác minh | cùng hệ sinh thái Connector | độc quyền | Còn hoạt động |
| [Social Stream Ninja](https://socialstream.ninja/docs/tiktok-guide.html) | extension/app | chưa xác minh | WS → polling | Local Signer / Euler; chế độ Standard cần đăng nhập | chưa xác minh | Còn hoạt động |
| Streamer.bot | — | — | — | nhận qua TikFinity | — | — |

Chính các maintainer ghi: dự án reverse engineering, "not a production-ready API", TikTok có thể đổi giao thức bất kỳ lúc nào, reconnect dồn dập dễ bị giới hạn.

## 3. Đánh giá theo luật của dự án ("không vượt cơ chế xác thực / bảo vệ")
- **Chấp nhận được rõ ràng:** API chính thức (không có cho bình luận LIVE); nhập thủ công; Mock.
- **Nhiều khả năng bị coi là vượt cơ chế bảo vệ:** dùng sign server (Euler/Local Signer) để tạo chữ ký TikTok dùng để hạn chế client lạ; gửi cookie phiên cho bên thứ ba; giải CAPTCHA.
  → Toàn bộ repo cộng đồng ở §2 đều thuộc nhóm này. TikFinity / Social Stream / Streamer.bot chỉ **chuyển** rủi ro sang công cụ khác.
- **Vùng xám:** extension đọc DOM trang LIVE trong trình duyệt của chính streamer — không phá chữ ký/đăng nhập nhưng vẫn là "automated scripts to collect information" theo ToS.

## 4. Đề xuất
1. **Hỏi kênh chính thức trước** (dự án do đơn vị phát hành game tổ chức giải): liên hệ đầu mối TikTok/đối tác LIVE để xin API/công cụ được phép hoặc văn bản chấp thuận.
2. Nếu người dùng + pháp lý **chấp thuận rủi ro**: spike nội bộ bằng `tiktok-live-connector` (Node) với tài khoản test của mình, **không** bật `authenticateWs`, không gửi cookie;
   khoá người chơi = `user.userId` (số), khử trùng theo `msgId`, reconnect backoff + `waitUntilLive`; adapter ghi rõ "không chính thức". Ước lượng spike 3–4 giờ + 1 buổi LIVE thử thật.
3. Dù chọn gì, giữ **phương án dự phòng offline**: Mock/nhập tay của operator, phát lại file sự kiện; tất cả đi qua cùng `LiveAdapter`.
4. Pháp lý cần xem: ToS mục 5, điều khoản Euler/TikFinity, license AGPL sửa đổi, quyền riêng tư khi lưu ID người xem.
