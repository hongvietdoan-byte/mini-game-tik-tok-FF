# Thư đề nghị gửi kênh chính thức TikTok — truy cập bình luận LIVE theo thời gian thực

Trạng thái: **bản nháp chờ người dùng gửi** (coordinator không tự liên hệ bên ngoài).
Điền các chỗ `[…]`. Gửi qua đầu mối đối tác TikTok / TikTok LIVE / TikTok for Business mà đơn vị đang làm việc, hoặc kênh hỗ trợ TikTok for Developers.
Đính kèm tuỳ chọn: ảnh chụp overlay (không có dữ liệu người thật), `docs/DATA_PRIVACY.md` (bản rút gọn).

---

## Bản tiếng Việt

**Tiêu đề:** Đề nghị hướng dẫn / cấp quyền đọc bình luận TikTok LIVE theo thời gian thực cho mini game Quiz trong giải [Bá Vương Đại Chiến]

Kính gửi [Tên đầu mối / Đội TikTok LIVE Partnerships],

[Tên đơn vị] là đơn vị tổ chức/sản xuất giải đấu Free Fire **[Bá Vương Đại Chiến]**, phát sóng trên tài khoản TikTok **[@tài_khoản]**.
Lịch dự kiến: tổng duyệt **12/11/2026**, thi đấu **13–14/11/2026** (GMT+7).

Chúng tôi xây dựng một **mini game Quiz** chạy trong chính buổi LIVE của tài khoản trên: người xem trả lời câu hỏi về Free Fire bằng cách **bình luận A, B, C hoặc D**; phần mềm chấm điểm và hiển thị bảng xếp hạng trên màn hình phát. Không có quà tặng, thanh toán hay phần thưởng tiền mặt gắn với điểm.

Để vận hành, phần mềm cần **đọc (chỉ đọc)** bình luận của buổi LIVE do chính tài khoản của chúng tôi phát, gần thời gian thực. Hiện chúng tôi **không tìm thấy API công khai chính thức** cho việc này trong danh mục TikTok for Developers, và **không muốn dùng các phương thức không chính thức** (ký request qua dịch vụ bên thứ ba, đọc dữ liệu ngoài cơ chế được phép) vì có thể trái Điều khoản dịch vụ.

Chúng tôi xin được hướng dẫn một trong các phương án sau:
1. API / SDK / chương trình đối tác chính thức cho phép đọc sự kiện bình luận LIVE của tài khoản mình (kể cả bản beta hoặc giới hạn);
2. Tính năng / tiện ích trong **TikTok LIVE Studio** (hoặc công cụ tương tác chính thức) có thể xuất sự kiện bình luận cho phần mềm cục bộ;
3. Nếu chưa có kênh kỹ thuật chính thức: văn bản xác nhận phương thức nào được phép sử dụng cho trường hợp này.

**Dữ liệu cần tối thiểu** cho mỗi bình luận: nội dung, mã người dùng ổn định (không cần thông tin cá nhân khác), tên hiển thị, thời điểm, mã sự kiện (để chống trùng).
**Quy mô dự kiến:** [vài trăm – vài nghìn] bình luận/phút trong khung giờ phát.
**Cam kết xử lý dữ liệu:** chỉ xử lý trên máy phát của đơn vị; không bán/chia sẻ; chỉ lưu mã người chơi + tên hiển thị + đáp án để chấm điểm và bảng xếp hạng; mã sự kiện chống trùng tự xoá sau 7 ngày; có thể xoá toàn bộ dữ liệu người chơi theo yêu cầu; không đăng bình luận thay người dùng, không tự động tương tác.

Chúng tôi mong nhận được phản hồi trước **[ngày — đề xuất 12/11/2026]** để kịp tổng duyệt. Đầu mối kỹ thuật: [Họ tên, email, điện thoại].

Trân trọng,
[Họ tên] — [Chức vụ], [Tên đơn vị]

---

## English version

**Subject:** Request for guidance / access — reading TikTok LIVE comments in real time for an on-stream Quiz during [Bá Vương Đại Chiến]

Dear [Contact name / TikTok LIVE Partnerships team],

[Organization] organizes and produces the Free Fire esports tournament **[Bá Vương Đại Chiến]**, streamed on our TikTok account **[@account]**.
Schedule: rehearsal **12 Nov 2026**, match days **13–14 Nov 2026** (GMT+7).

We have built an **on-stream Quiz mini game** that runs inside our own LIVE: viewers answer Free Fire questions by **commenting A, B, C or D**; our software scores answers and shows a leaderboard on the broadcast. There are no gifts, payments or cash prizes tied to scores.

To operate it, the software needs **read-only** access, in near real time, to the comments of LIVE sessions broadcast by **our own account**. We could not find an **official public API** for this in the TikTok for Developers catalog, and we **do not want to use unofficial methods** (third-party request-signing services, or access outside permitted mechanisms), as they may conflict with the Terms of Service.

We would appreciate guidance on any of the following:
1. An official API / SDK / partner program that allows reading LIVE comment events for our own account (including beta or limited access);
2. A feature or extension of **TikTok LIVE Studio** (or another official interactive tool) that can expose comment events to local software;
3. If no official technical channel exists: written confirmation of which method, if any, is permitted for this use case.

**Minimum data per comment:** text, a stable user identifier (no other personal data needed), display name, timestamp, event/message ID (for de-duplication).
**Expected volume:** [a few hundred – a few thousand] comments per minute during broadcasts.
**Data handling:** processed only on our broadcast machine; never sold or shared; we keep only player ID + display name + answers for scoring and the leaderboard; de-duplication IDs are deleted after 7 days; all player data can be deleted on request; we never post comments or automate interactions on users' behalf.

We would be grateful for a reply by **[date — suggested 12 Nov 2026]** so we can include it in the rehearsal. Technical contact: [name, email, phone].

Best regards,
[Name] — [Title], [Organization]

---

## Ghi chú cho người dùng
- Nếu TikTok cung cấp API/công cụ chính thức: gửi tài liệu cho coordinator → làm adapter theo `LiveAdapter` (ước lượng 0.5–1 ngày + 1 buổi LIVE thử).
- Nếu TikTok chỉ **cho phép bằng văn bản** một phương thức cụ thể: lưu văn bản vào hồ sơ dự án (không đưa vào repo public), rồi coordinator làm spike theo phương thức đó.
- Nếu chưa có phản hồi trước giải: game vẫn chạy được ở chế độ Mock để tổng duyệt kỹ thuật, nhưng **không thể nhận đáp án thật từ khán giả TikTok** — cần quyết định phương án dự phòng cho buổi phát (xem `docs/TIEN_DO.md` M11).
