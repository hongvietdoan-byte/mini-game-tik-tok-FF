> **Luật đang áp dụng:** phiên mới mặc định dùng KAHOOT; CLASSIC là chế độ cũ vẫn có thể chọn theo cấu hình phiên. Phần dưới đây mô tả cả hai chế độ theo contract và engine hiện tại.

# Luật chơi dành cho operator

> **Bản nháp vận hành — TikTok LIVE Quiz.** Tài liệu mô tả luật chấm điểm và xử lý tình huống của engine hiện tại. Nếu giao diện hoặc câu dẫn khác tài liệu, hãy theo snapshot server và lịch sử phiên; không tự sửa điểm thủ công.

## 1. Tóm tắt một lượt chơi

- Người xem trả lời bằng một bình luận có nội dung chính xác `A`, `B`, `C` hoặc `D` sau khi chuẩn hóa NFKC, trim và chuyển chữ hoa. Câu trả lời chỉ được nhận trong khoảng `[openAtMs, deadlineMs)`.
- Server dùng thời điểm nhận bình luận ở server để chấm. Bình luận đến trước khi mở, từ deadline trở đi, sai định dạng, trùng người chơi/câu hỏi hoặc quá ngưỡng trễ nguồn của phiên sẽ không được tính.
- Mỗi người chỉ có một câu trả lời được nhận cho mỗi câu hỏi; câu trả lời được nhận đầu tiên thắng. Bình luận sau không đổi đáp án và không cộng thêm điểm.
- Điểm mặc định là KAHOOT: câu đúng được 500–1000 điểm theo tốc độ nhận ở server, cộng thưởng chuỗi nếu có. Sai hoặc bỏ lỡ câu đã chốt được 0 điểm và ngắt chuỗi.
- Đáp án đúng chỉ được công bố ở REVEAL; trước trạng thái đó, overlay không nhận đáp án đúng và operator không tự suy đoán hoặc bật mí.
- Bảng xếp hạng dùng hạng chung khi hòa tuyệt đối. Không tự chọn một người thắng trong nhóm đồng hạng.

## 2. Điểm và chuỗi trả lời đúng

### Chế độ mặc định: KAHOOT

Với câu đúng, `t` là thời gian từ lúc server mở câu đến lúc server nhận câu trả lời; `T` là thời lượng nhận đáp án. Điểm cơ bản được tính bằng `round(1000 × (1 − (t/T)/2))`: trả lời ngay khi mở được 1.000 điểm, giảm tuyến tính đến 500 điểm khi hết thời gian. Giá trị `t` được chặn trong khoảng 0…T.

Mỗi câu đúng liên tiếp từ câu thứ hai được cộng thêm `min(500, 100 × (n − 1))`, trong đó `n` là độ dài chuỗi sau khi tính câu hiện tại. Vì vậy câu đúng thứ nhất trong chuỗi không có thưởng; câu thứ hai +100; thứ ba +200; thứ tư +300; thứ năm +400; từ câu thứ sáu trở đi +500 cho từng câu đúng tiếp theo. Nếu không có timestamp nhận hợp lệ để tính thời gian, engine chấm điểm cơ bản 500.

| Kết quả | Điểm KAHOOT | Ảnh hưởng đến chuỗi |
|---|---:|---|
| Đáp án đúng | 500–1.000 điểm cơ bản, cộng thưởng chuỗi nếu đủ điều kiện | Tăng chuỗi đúng thêm 1 |
| Đáp án sai | 0 | Đặt chuỗi về 0 |
| Không có đáp án được nhận khi câu đã chốt | 0 | Đặt chuỗi về 0 |
| Câu bị void | 0 | Không tăng, không ngắt chuỗi; câu bị loại khi tính lại |

Ví dụ tối đa: ở vòng 15 câu, người chơi trả lời đúng ngay khi mở mọi câu được 15.000 điểm cơ bản và 6.000 điểm chuỗi, tổng 21.000. Mốc thưởng chuỗi là **mỗi câu** từ câu đúng liên tiếp thứ hai, không phải chỉ trả một lần tại câu đạt mốc 500.

Người tham gia giữa vòng bắt đầu từ câu trả lời được server nhận đầu tiên; các câu trước đó không tính là bỏ lỡ. Câu void bị loại khỏi điểm và chuỗi khi engine tính lại, kể cả khi đã có câu trả lời trước lúc void.

### Chế độ cũ: CLASSIC

CLASSIC cho 100 điểm mỗi câu đúng, cộng thưởng tốc độ tùy cấu hình (`speedBonusMax`, mặc định 50; đặt 0 để tắt; giới hạn cấu hình 0–500). Thưởng tốc độ giảm tuyến tính theo thời điểm server nhận câu trả lời, từ mức tối đa lúc mở đến 0 khi hết giờ. Chuỗi đúng thưởng một lần khi chạm mốc 3/5/10: lần lượt +30/+50/+100. Sai hoặc bỏ lỡ câu đã chốt đặt chuỗi về 0; có thể nhận lại từng mốc sau khi lập chuỗi mới.

Quà tặng, lượt thích và lượt theo dõi không tham gia chấm điểm ở cả hai chế độ. Độ trễ đường truyền có thể khác nhau giữa người xem; điểm tốc độ căn cứ giờ server nhận, không phải giờ người xem gửi bình luận.

## 3. Bảng xếp hạng và đồng hạng

Thứ tự xếp hạng:

1. Tổng điểm giảm dần.
2. Nếu tổng điểm bằng nhau, số câu trả lời đúng giảm dần.
3. Nếu cả hai bằng nhau, người chơi **đồng hạng**. Hạng hiển thị dùng kiểu cạnh tranh: `1, 1, 3`.

Trong cùng một nhóm đồng hạng, hệ thống sắp thứ tự hiển thị ổn định theo mã người chơi. Thứ tự này chỉ để danh sách không nhảy; nó **không** phá hòa và không tạo ra người thắng riêng.

Trong lúc chơi, overlay dùng Top 10 gọn và cập nhật khi câu được chốt. Sau mỗi câu đã công bố có bảng ngắn; bảng lớn mặc định xuất hiện mỗi 5 câu và sau câu cuối. Thời lượng do cấu hình phiên quyết định. Không thêm hàng giả khi có dưới 10 người chơi.

### Bục và hạng nhất đồng hạng

- Bục chỉ dùng dữ liệu `podium` do server gửi. Mỗi slot là một hạng hoặc một nhóm người đồng hạng; không tự lấy ba dòng đầu rồi gán ba hạng khác nhau.
- Nếu một nhóm đồng hạng vượt qua ranh giới lấy ba slot podium, server đặt `tieAcrossCutoff`. Overlay phải trình bày **ĐỒNG HẠNG** và không tuyên bố một người duy nhất thắng. Giữ toàn bộ thành viên của nhóm hòa trong dữ liệu hiển thị, kể cả khi số người nhiều hơn ba.
- Nếu có đủ ba hạng riêng, bố cục sân khấu chuẩn là hạng 2 bên trái, hạng 1 ở giữa, hạng 3 bên phải. Nếu có ít người hơn, không tạo thêm người chơi để lấp chỗ.
- Engine hiện không có lệnh phá hòa riêng. Operator không tự đặt thêm tiêu chí sau khi đã thấy kết quả.

## 4. Bỏ qua hoặc hủy câu

`SKIP_QUESTION` và `VOID_QUESTION` đều là thao tác nguy hiểm, bắt buộc operator ghi lý do (tối thiểu 3 ký tự). Không dùng chúng để sửa một câu trả lời riêng lẻ.

| Thao tác | Trước khi công bố đáp án | Sau khi công bố đáp án |
|---|---|---|
| **Bỏ qua câu** (`SKIP_QUESTION`) | Khi câu đang PREPARE/ACCEPTING, loại câu hiện tại khỏi chấm điểm và chuyển tiếp. Nếu lệnh dùng khi đang tạm dừng, trạng thái tạm dừng được giữ. | Không hợp lệ. |
| **Hủy câu** (`VOID_QUESTION`) | Trước khi công bố đáp án, có cùng tác dụng chuyển tiếp như bỏ qua: câu không tính điểm hoặc chuỗi. | Chỉ hợp lệ cho câu vừa công bố khi server còn ở REVEAL/LEADERBOARD ngay sau câu đó; chỉ được void một lần. Server ghi sự kiện void, điều chỉnh sổ điểm và tính lại bảng xếp hạng. |

Khi void sau reveal, lịch sử sổ điểm cũ vẫn được giữ và có sự kiện điều chỉnh/audit; không xóa hoặc sửa lịch sử bằng tay. Câu bị void không ảnh hưởng chuỗi đúng khi điểm được tính lại. Nếu đã chuyển sang câu hoặc trạng thái không còn hỗ trợ void, engine từ chối lệnh.

**Nên bỏ qua** khi câu không thể tiếp tục trước reveal (ví dụ câu bị lỗi dữ liệu). **Nên hủy** khi đáp án hoặc kết quả vừa công bố có sai sót cần loại khỏi điểm. Trước khi xác nhận, đọc lại câu đang hiển thị và nhập lý do rõ ràng để người xem có thể được giải thích.

## 5. Mất kết nối và phục hồi

- Nếu nguồn bình luận mất kết nối khi câu đang chạy, đồng hồ được đóng băng và phiên chuyển sang trạng thái gián đoạn; kết nối lại không tự chạy tiếp.
- Chỉ tiếp tục khi nguồn đã sẵn sàng. Nếu không thể tiếp tục câu đang mở, operator có thể hủy câu với lý do hoặc dừng phiên.
- Khi khởi động lại có phục hồi đang chờ, chọn rõ **Tiếp tục**, **Hủy câu** hoặc **Dừng**. Lựa chọn Hủy chỉ hợp lệ khi câu đang phục hồi chưa công bố đáp án; nếu đã công bố, tiếp tục phục hồi rồi dùng VOID khi server vẫn cho phép. Không bỏ qua bước phục hồi và không tự khởi chạy lại câu.

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
- Kiểm tra phiên dùng KAHOOT hay CLASSIC trước khi giải thích điểm; đừng cộng tay thưởng tốc độ/chuỗi.
- Không tính quà tặng hoặc lượt thích vào điểm.

### Nguồn quy tắc

- `packages/quiz-core/src/scoring.ts` và `packages/quiz-core/src/scoring.test.ts` — điểm, chuỗi, thứ hạng, Top 10 và podium.
- `packages/quiz-core/src/engine.ts` và `packages/quiz-core/src/engine.test.ts` — chuyển trạng thái Skip/Void và phục hồi.
- `packages/contracts/src/index.ts` — lệnh operator, lý do bắt buộc, snapshot leaderboard/podium.
- `docs/API_CONTRACT.md` mục 7 — trạng thái, nhịp leaderboard và dữ liệu server.
- `mailbox/BOARD.md` quyết định 3–6 — luật Kahoot hiện hành, xếp hạng chung, đồng hạng và giới hạn công bố đáp án. Các mô tả tính điểm cũ trong kế hoạch build là legacy; khi khác nhau, theo contract và engine hiện tại.
