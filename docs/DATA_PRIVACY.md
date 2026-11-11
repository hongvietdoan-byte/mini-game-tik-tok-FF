# DATA_PRIVACY — Bản nháp chính sách dữ liệu

**Trạng thái:** bản nháp DP1, chờ người dùng duyệt. Phạm vi hiện tại là Phase 0–1: thử nghiệm ngoại tuyến, dữ liệu DEMO hư cấu và cơ sở dữ liệu SQLite chạy cục bộ. Tài liệu này ghi nhận quyết định sản phẩm; không xác nhận tuân thủ pháp luật hay chính sách nền tảng.

## 1. Kiểm kê đầu vào và quyết định sử dụng

| Nguồn | Điều đã biết | Cách xử lý |
|---|---|---|
| Bảng tính đầu vào | HANDOFF chỉ ghi nhận tên các sheet. Một số sheet chứa thông tin người chơi, ánh xạ tên, danh sách KOL và danh mục nội bộ. | Không nhập, sao chép, đọc nội dung hay đưa sheet/giá trị vào repository, fixtures, prompt AI, log hoặc bản demo. Chỉ dùng dữ liệu tổng hợp nếu cần kiểm thử. |
| Poster, ảnh chụp, logo và ảnh tham chiếu | HANDOFF cho biết có ảnh chân dung thật, logo đội và tài sản thiết kế chưa xác minh quyền sử dụng. | Không đưa vào Phase 0–1. Chỉ dùng sau khi người dùng xác nhận ánh xạ, quyền sử dụng và phê duyệt từng tài sản; lưu danh sách phê duyệt cùng asset. |
| Fixtures | Câu hỏi và người chơi giả phục vụ kiểm thử engine. | Không dùng tên người thật, tài khoản, ID nền tảng hoặc dữ liệu lấy từ bảng tính. Câu hỏi Free Fire trong fixtures mang nhãn DEMO; trạng thái APPROVED chỉ phục vụ engine MOCK, không thay thế việc người dùng duyệt nội dung. |
| TikTok LIVE | Kết nối thật chỉ được thử trong môi trường được phép và sau khi hoàn tất khảo sát connector. | Phase 1 dùng MOCK. Không thu thập dữ liệu LIVE thật, cookie, token hay payload tài khoản để phát triển connector; không vượt cơ chế bảo vệ của nền tảng. |

## 2. Dữ liệu có thể lưu và mục đích

Schema hiện tại chỉ lưu các trường tối thiểu cần thiết để quản lý phiên, chấm điểm, khôi phục sau crash và tránh xử lý trùng. Dữ liệu định danh nền tảng vẫn là dữ liệu nhạy cảm dù không có tên thật.

| Trường / nhóm | Mục đích | Quy tắc |
|---|---|---|
| `source`, `sourceUserId` trong `players` | Ghép cùng một tài khoản của cùng nguồn vào một `playerId`; hỗ trợ chống chấm trùng. | `sourceUserId` là định danh ổn định do nguồn cấp, không phải dữ liệu vô danh. Chỉ dùng cho chức năng game, không đưa ra overlay, URL, log hoặc báo cáo công khai. Xóa cùng hồ sơ người chơi khi có quy trình purge. |
| `displayName` | Hiển thị bảng điểm và tên người chơi trong phiên. | Là nội dung người dùng cung cấp, có thể chứa tên thật. Chạy qua `sanitizeDisplayName`; giới hạn hiển thị không làm dữ liệu trở thành ẩn danh. Không nhập tên từ sheet người chơi. |
| `answers`: `playerId`, `optionId`, thời điểm nhận, `sourceEventId` | Tính điểm và bảo đảm một đáp án đầu tiên cho mỗi người/câu. | Chỉ giữ lựa chọn A/B/C/D đã được chấp nhận cùng metadata tối thiểu. Không lưu nguyên văn comment, tin nhắn hay payload LIVE. |
| `processed_events`: `source`, `eventId`, câu hỏi, thời điểm | Ngăn phát lại cùng sự kiện hợp lệ sau reconnect hoặc restart. | Chỉ ghi sự kiện đã được xem là đáp án trong cửa sổ nhận; không dùng bảng này làm kho lưu lịch sử comment. |
| Phiên, vòng, snapshot, bảng điểm, operator actions | Khôi phục trạng thái, giải thích kết quả và truy vết thao tác vận hành. | `configJson`, `state`, `engineJson`, `entriesJson`, `payloadJson`, `resultJson`, `requestJson` và `detail` phải được xem như vùng có thể vô tình chứa dữ liệu nhạy cảm. Không đưa raw payload, cookie, token hoặc thông tin liên hệ vào các trường JSON/log. |
| Câu hỏi, đáp án, nguồn và phiên bản pack | Lưu nội dung quiz và snapshot bất biến để kết quả vòng không đổi khi pack được sửa. | Chỉ dùng nguồn đã được duyệt; không lưu nội dung từ sheet nhạy cảm hoặc tài sản không có quyền sử dụng. |

## 3. Trường và nội dung bị cấm

Không thêm cột, JSON, log hoặc fixture chứa:

- email, số điện thoại, địa chỉ, ngày sinh, mật khẩu, giấy tờ định danh, cookie, access token, thông tin thanh toán hoặc dữ liệu liên hệ;
- UID game, URL hồ sơ, tên tài khoản/thật, comment nguyên văn, tin nhắn riêng, ảnh đại diện, giọng nói hoặc video của người chơi;
- nội dung từ sheet thông tin người chơi (gồm bản raw/final), bảng ghi đè tên, danh sách KOL hoặc `_Lists` trong bộ đầu vào;
- dữ liệu nhận dạng cá nhân đặt trong các cột tự do như `reason`, `detail`, `operatorId`, `requestJson`, `resultJson`, `payloadJson` hoặc `engineJson`.

`players.sourceUserId` là ngoại lệ chức năng được schema Phase 1 mô tả rõ ở bảng trên; chỉ giữ vì cần ghép tài khoản để chấm điểm. Trường này không được coi là dữ liệu công khai hoặc vô hại. Nếu người dùng không chấp thuận lưu định danh ổn định, cần thiết kế lại cách chống trùng trước khi kết nối LIVE thật.

## 4. Luồng, quyền truy cập và hiển thị

- Khi nhận comment, chỉ chuỗi đáp án hợp lệ A/B/C/D trong cửa sổ nhận mới có thể ảnh hưởng đến điểm. Comment khác không được dùng làm dữ liệu sản phẩm hoặc đưa vào fixture/log.
- SQLite chạy trên máy operator. Server chỉ bind `127.0.0.1`; token admin không đặt trong URL và không được ghi vào log, screenshot hoặc tài liệu chia sẻ.
- Overlay công khai không gửi `sourceUserId` hoặc token. Trong lúc nhận đáp án chỉ công bố tổng số trả lời; phân bố lựa chọn và đáp án đúng chỉ xuất hiện ở scene được phép sau khi reveal.
- Câu hỏi DEMO chưa được người dùng duyệt không được dùng cho LIVE. Sửa hoặc chọn câu trong tài liệu đề xuất không tự động biến fixtures thành nội dung được duyệt.
- Bản backup có cùng mức nhạy cảm với cơ sở dữ liệu gốc; không đính kèm vào email/chat, không đưa lên kho công khai. Xóa cả bản backup khi xóa dữ liệu tương ứng.

## 5. Lưu giữ, xóa và sự cố

Thời hạn lưu giữ chưa được người dùng chốt. Schema hiện có thể giữ `sourceUserId`, tên hiển thị, đáp án và sự kiện hợp lệ qua nhiều phiên; không được mô tả là tự xóa theo phiên. Purge/export và lịch xóa backup vẫn là backlog Phase 6. Trước khi dùng LIVE thật, cần chốt thời hạn, phạm vi export, cách xóa cả dữ liệu dẫn xuất/snapshot/backup và xác nhận operator có thể thực hiện mà không sửa code.

Trong Phase 1, nếu cần xóa dữ liệu thử nghiệm, dừng ứng dụng, xác định đúng database do operator cấu hình, xóa database cùng các backup của nó và xác nhận không còn bản sao trong thư mục chia sẻ. Không xóa asset hay dữ liệu khác ngoài phạm vi đã xác định.

Nếu phát hiện dữ liệu nhạy cảm trong repository hoặc log: dừng thu thập/chia sẻ, gỡ dữ liệu khỏi nguồn phát sinh và bản sao do nhóm kiểm soát, bảo vệ database/backup, thay token đã lộ, rồi báo người phụ trách để đánh giá ảnh hưởng. Không sao chép nguyên dữ liệu vào báo cáo sự cố.

## 6. Kiểm tra trước khi dùng thật

- Privacy check phải chặn spreadsheet/CSV, ảnh đầu vào sai thư mục, tên asset nhạy cảm, đường dẫn kho chibi, thông tin liên hệ và tên sheet nhạy cảm trong nội dung đã track.
- Test schema xác nhận không có cột đặt tên email/phone/birth/DOB/password/address; kiểm tra đó không chứng minh rằng JSON hoặc log không chứa dữ liệu nhạy cảm.
- Test fixtures chỉ dùng người chơi giả. Câu hỏi DEMO giữ nhãn DEMO trên overlay và chỉ chạy với chế độ MOCK.
- Chỉ đánh giá connector LIVE bằng tài khoản và môi trường được phép. Không coi kết quả MOCK là xác nhận đã kết nối LIVE.

## Cần người dùng chốt trước LIVE

1. Có chấp thuận lưu `sourceUserId` ổn định và `displayName` đã làm sạch để ghép người chơi giữa các phiên không?
2. Thời hạn lưu dữ liệu người chơi, đáp án, sự kiện chống trùng và backup là bao lâu?
3. Ai được phép xem/export bảng điểm có tên hiển thị, và dữ liệu nào phải ẩn ở overlay công khai?
4. Người dùng duyệt nguồn câu hỏi và từng asset nào trước khi đưa khỏi MOCK?
