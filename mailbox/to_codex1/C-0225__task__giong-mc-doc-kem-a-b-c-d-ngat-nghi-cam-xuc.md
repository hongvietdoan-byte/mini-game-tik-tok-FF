---
id: C-0225
from: coordinator
to: codex1
type: task
title: Giong MC: doc kem A/B/C/D, ngat nghi, cam xuc
ref: C-0204
priority: high
needs: 
created: 2026-11-15T13:56:59+07:00
---
Từ main `f5c7c81` (đã gộp bản C-0214…C-0224 + giọng MC). Nhánh mới `codex1/c0225-mc-reading`.

Người dùng xem video vòng thử 10 câu có giọng MC và nhận xét: "Giọng MC không đọc có cảm xúc, chưa có ngắt nghỉ, chưa đọc kèm A là gì, B là gì".

Hiện trạng đo từ video: mỗi câu phát 5 cue QUESTION (đề + 4 đáp án) gần như dính liền (các cue cách nhau 0,3–0,9 s, không khoảng lặng); text đáp án chỉ là nội dung, không có chữ cái.

## Việc
1. **Đọc kèm chữ cái đáp án**: text gửi TTS cho đáp án thành `A: <nội dung>.` / `B: …` / `C: …` / `D: …` (giữ nguyên nội dung đã duyệt, chỉ thêm tiền tố chữ cái + dấu chấm cuối nếu thiếu). Đề bài kết thúc bằng dấu câu (thêm `?`/`.` nếu thiếu). Áp dụng cả pre-generate (`/api/mc-voice/pre-generate`) và luồng runtime; câu công bố giữ dạng "Đáp án đúng là B: …".
2. **Ngắt nghỉ**: chèn khoảng lặng giữa các cue khi xếp lịch đọc: sau đề ~700 ms, giữa các đáp án ~400 ms (hằng số đặt tên rõ, có test). Tính khoảng lặng vào thời lượng READING (vẫn ≤ MAX_MC_READING_MS; nếu vượt thì giảm khoảng lặng theo bậc trước khi bỏ đọc). Không dồn đè cue đếm ngược/công bố.
3. **Cảm xúc**: cho phép profile cục bộ khai báo `voiceSettings` theo loại sự kiện (ví dụ mặc định + ghi đè cho `COUNTDOWN`, `ANSWER_REVEAL`, `VICTORY_GENERIC`, `WELCOME`) để giọng hào hứng hơn ở các câu này; schema profile mở rộng có kiểm tra, profile cũ (chỉ 1 bộ `voiceSettings`) vẫn chạy. Cache key phải gồm bộ settings thực dùng. KHÔNG ghi giá trị profile/thông tin provider vào repo, test dùng giá trị giả.
4. Bump `MC_VOICE_POLICY_VERSION` nếu cần để không dùng nhầm cache cũ có text khác.
5. Kiểm tra vì sao câu chào sảnh chờ (WELCOME) không phát trong video thử (cue WELCOME không xuất hiện trong 111 cue; vòng mở sảnh 12 s rồi START_ROUND). Sửa nếu là lỗi.

## Ràng buộc
- KHÔNG gọi provider thật, không dùng token thật (coordinator sẽ tự sinh mẫu ≤12 câu sau khi gộp). Test bằng fake provider.
- Không đọc tên/ID người chơi (giữ validator).
- typecheck, test, e2e, privacy:check. Không gộp main.

## Nộp
Report: danh sách text gửi TTS cho 1 câu mẫu (đề + 4 đáp án + công bố), lịch phát (offset/khoảng lặng) cho câu đó, schema profile mới (chỉ tên trường), kết quả kiểm tra WELCOME.
