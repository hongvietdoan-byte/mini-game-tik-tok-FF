> **Cập nhật 11/11 (người dùng chốt): tính điểm KIỂU KAHOOT là mặc định.** Câu đúng 500–1000 điểm (1000 nếu trả lời ngay, giảm đều về 500 khi hết giờ, theo giờ server nhận); đúng liên tiếp từ câu thứ 2 cộng +100, +200… tối đa +500; sai/không trả lời 0 điểm và mất chuỗi. Vòng 15 câu tối đa 21.000 điểm. Cách tính cũ (CLASSIC) vẫn chọn được theo phiên.

> **Cập nhật 11/11 (người dùng chốt):** có **thưởng tốc độ** cho câu đúng — tối đa +50, giảm đều từ lúc mở câu tới hết giờ (theo giờ server nhận bình luận); cấu hình `speedBonusMax` theo phiên (0 = tắt). Phần "không thưởng tốc độ" bên dưới đã lỗi thời.

# Luật chơi dành cho operator

> **Bản nháp vận hành — TikTok LIVE Quiz.** Tài liệu mô tả luật chấm điểm và xử lý tình huống của engine hiện tại. Nếu giao diện hoặc câu dẫn khác tài liệu, hãy theo snapshot server và lịch sử phiên; không tự sửa điểm thủ công.

## 1. Tóm tắt một lượt chơi

- Người xem trả lời bằng một bình luận đúng một ký tự `A`, `B`, `C` hoặc `D` khi câu hỏi đang nhận đáp án.
- Server chấm theo thời điểm nhận bình luận ở server. Bình luận đến trước khi mở, sau hạn, sai định dạng hoặc bị đánh dấu nguồn quá trễ sẽ không được tính.
- Mỗi người chỉ có một câu trả lời được nhận cho mỗi câu hỏi. Bình luận lặp không cộng thêm điểm.
- Trả lời đúng được 100 điểm. Trả lời sai hoặc bỏ lỡ được 0 điểm; chuỗi đúng sẽ bị ngắt.
- Bảng xếp hạng dùng hạng chung khi hòa tuyệt đối. Không tự chọn một người thắng trong nhóm đồng hạng.

## 2. Điểm và chuỗi trả lời đúng

| Kết quả | Điểm câu hỏi | Ảnh hưởng đến chuỗi |
|---|---:|---|
| Đáp án đúng | +100 | Tăng chuỗi đúng thêm 1 |
| Đáp án sai | 0 | Đặt chuỗi về 0 |
| Không có đáp án được nhận khi câu đã chốt | 0 | Đặt chuỗi về 0 |
| Câu bị hủy (void) | 0 | Không tăng, không ngắt chuỗi |

Thưởng chuỗi được cộng **một lần tại đúng câu đạt mốc**:

| Chuỗi liên tiếp | Thưởng thêm | Tổng điểm nếu tất cả câu từ đầu chuỗi đều đúng |
|---:|---:|---:|
| 3 | +30 | 330 |
| 5 | +50 | 580 |
| 10 | +100 | 1.180 |

Ví dụ: người chơi đạt 10 câu đúng liên tiếp nhận 1.000 điểm cơ bản và 180 điểm thưởng. Sau mốc 10, chuỗi vẫn tiếp tục đếm nhưng engine hiện không có mốc thưởng cao hơn. Nếu sai hoặc bỏ lỡ một câu đã chốt, chuỗi bắt đầu lại từ 0; các mốc 3/5/10 có thể nhận lại khi đạt lần nữa.

Người tham gia giữa vòng bắt đầu tính từ câu trả lời được server nhận đầu tiên; các câu trước đó không tính là bỏ lỡ. Câu đã void được bỏ khỏi phép tính điểm và chuỗi, kể cả khi trước lúc void đã có câu trả lời.

Không có thưởng tốc độ: độ trễ bình luận khác nhau giữa người xem nên thời điểm đến sớm hơn không làm tăng điểm. Quà tặng, lượt thích và lượt theo dõi không tham gia chấm điểm.

## 3. Bảng xếp hạng và đồng hạng

Thứ tự xếp hạng:

1. Tổng điểm giảm dần.
2. Nếu tổng điểm bằng nhau, số câu trả lời đúng giảm dần.
3. Nếu cả hai bằng nhau, người chơi **đồng hạng**. Hạng hiển thị dùng kiểu cạnh tranh: `1, 1, 3`.

Trong cùng một nhóm đồng hạng, hệ thống sắp thứ tự hiển thị ổn định theo mã người chơi. Thứ tự này chỉ để danh sách không nhảy; nó **không** phá hòa và không tạo ra người thắng riêng.

Trong lúc chơi, overlay dùng Top 10 gọn và cập nhật khi câu được chốt. Sau mỗi câu có bảng ngắn; bảng lớn mặc định xuất hiện mỗi 5 câu và sau câu cuối. Thời lượng do cấu hình phiên quyết định. Không thêm hàng giả khi có dưới 10 người chơi.

### Bục và hạng nhất đồng hạng

- Bục chỉ dùng dữ liệu `podium` do server gửi. Mỗi slot là một hạng hoặc một nhóm người đồng hạng; không tự lấy ba dòng đầu rồi gán ba hạng khác nhau.
- Nếu nhóm đồng hạng đi qua ranh giới Top 3, server đặt `tieAcrossCutoff`. Overlay phải trình bày **ĐỒNG HẠNG** và không tuyên bố một người duy nhất thắng. Giữ toàn bộ thành viên của nhóm hòa trong dữ liệu hiển thị, kể cả khi số người nhiều hơn ba.
- Nếu có đủ ba hạng riêng, bố cục sân khấu chuẩn là hạng 2 bên trái, hạng 1 ở giữa, hạng 3 bên phải. Nếu có ít người hơn, không tạo thêm người chơi để lấp chỗ.
- Engine hiện không có lệnh phá hòa riêng. Operator không tự đặt thêm tiêu chí sau khi đã thấy kết quả.

## 4. Bỏ qua hoặc hủy câu

`SKIP_QUESTION` và `VOID_QUESTION` đều là thao tác nguy hiểm, bắt buộc operator ghi lý do (tối thiểu 3 ký tự). Không dùng chúng để sửa một câu trả lời riêng lẻ.

| Thao tác | Trước khi công bố đáp án | Sau khi công bố đáp án |
|---|---|---|
| **Bỏ qua câu** (`SKIP_QUESTION`) | Hủy câu hiện tại, không chấm điểm và chuyển tiếp. Nếu câu đó ở mốc bảng lớn, engine vẫn mở bảng theo lịch. Khi đang tạm dừng, câu kế tiếp tiếp tục ở trạng thái tạm dừng. | Không hợp lệ. |
| **Hủy câu** (`VOID_QUESTION`) | Hủy câu hiện tại, không chấm điểm và chuyển tiếp như bỏ qua. | Chỉ hợp lệ cho câu vừa công bố ở REVEAL hoặc màn LEADERBOARD ngay sau câu đó (bảng ngắn hay bảng mốc); chỉ được hủy một lần. Server thêm bút toán đảo, tính lại điểm và bảng xếp hạng. |

Khi void sau reveal, lịch sử sổ điểm cũ vẫn được giữ; bút toán âm mới cân bằng các điểm của câu đó. Không xóa hoặc sửa lịch sử bằng tay. Câu bị void không ảnh hưởng chuỗi đúng khi điểm được tính lại.

**Nên bỏ qua** khi câu không thể tiếp tục trước reveal (ví dụ câu bị lỗi dữ liệu). **Nên hủy** khi đáp án hoặc kết quả vừa công bố có sai sót cần loại khỏi điểm. Trước khi xác nhận, đọc lại câu đang hiển thị và nhập lý do rõ ràng để người xem có thể được giải thích.

## 5. Mất kết nối và phục hồi

- Nếu nguồn bình luận mất kết nối khi câu đang chạy, đồng hồ được đóng băng và phiên chuyển sang trạng thái gián đoạn; kết nối lại không tự chạy tiếp.
- Chỉ tiếp tục khi nguồn đã sẵn sàng. Nếu không thể tiếp tục câu đang mở, operator có thể hủy câu với lý do hoặc dừng phiên.
- Khi khởi động lại có phục hồi đang chờ, chọn rõ **Tiếp tục**, **Hủy câu** hoặc **Dừng**. Không bỏ qua bước phục hồi và không tự khởi chạy lại câu.

## 6. Câu dẫn gợi ý cho operator

- **Bỏ qua trước reveal:** “Câu này bị bỏ qua vì lỗi nội dung; câu trả lời cho câu này không tính điểm. Mình chuyển sang câu tiếp theo.”
- **Hủy sau reveal:** “Đáp án câu vừa rồi có sai sót nên câu được hủy. Điểm và bảng xếp hạng đang được tính lại.”
- **Đồng hạng:** “Các người chơi này có cùng điểm và cùng số câu đúng nên hệ thống ghi nhận đồng hạng.”
- **Mất kết nối:** “Nguồn bình luận đang gián đoạn. Đồng hồ đã tạm dừng; trò chơi chỉ tiếp tục sau khi kết nối được xác nhận.”

## 7. Checklist nhanh

- Xác nhận câu đang ở đúng trạng thái trước khi dùng Bỏ qua/Hủy câu.
- Mỗi lệnh Bỏ qua, Hủy câu hoặc Dừng phải có lý do cụ thể.
- Sau một câu bị hủy sau reveal, chờ snapshot và bảng điểm mới từ server.
- Giữ nguyên hạng chung và thông báo rõ **ĐỒNG HẠNG** khi server báo có hòa.
- Không tính tốc độ, quà tặng hoặc lượt thích vào điểm.

### Nguồn quy tắc

- `packages/quiz-core/src/scoring.ts` và `packages/quiz-core/src/scoring.test.ts` — điểm, chuỗi, thứ hạng, Top 10 và podium.
- `packages/quiz-core/src/engine.ts` và `packages/quiz-core/src/engine.test.ts` — chuyển trạng thái Skip/Void và phục hồi.
- `packages/contracts/src/index.ts` — lệnh operator, lý do bắt buộc, snapshot leaderboard/podium.
- `docs/API_CONTRACT.md` mục 7 — trạng thái, nhịp leaderboard và dữ liệu server.
- `CLAUDE_MASTER_BUILD_PLAN_V2.md` mục 9 — nguyên tắc chấm điểm và xử lý đồng hạng.
