# MCVoiceSystem — AI Voice MC Kelly (yêu cầu người dùng 11/11/2026 ~20:55)

> Nguyên văn yêu cầu của người dùng (đã sắp lại định dạng). Thay thế phần giọng đọc trong C-0069.

## 1. Mục tiêu
Bổ sung module `MCVoiceSystem` vào dự án Storm Arena hiện tại.
MC Kelly tự dẫn dắt trận Quiz bằng giọng nói tiếng Việt, đồng bộ với Quiz Engine và animation PNG Sequence.
Không thay đổi logic chấm điểm hiện tại.

## 2. Voice Engine
Hỗ trợ hai nguồn âm thanh:
- Pre-recorded Audio: lời thoại cố định.
- Text-to-Speech: nội dung câu hỏi, đáp án và thông tin động.

Thiết kế TTS Provider Adapter để có thể đổi nhà cung cấp. API key chỉ lưu ở backend.

## 3. Voice State Machine
Các trạng thái: IDLE, PREPARING, SPEAKING, FINISHED, INTERRUPTED, ERROR.
- Mỗi lời thoại có ID, gắn với `roundId`, `questionInstanceId` và `gameState`.
- Không phát lời thoại của câu trước sau khi game đã chuyển câu.

## 4. Question Reading
Quy trình:
1. Quiz Engine chọn câu hỏi.
2. Voice Controller chuẩn bị audio.
3. Overlay hiển thị câu hỏi.
4. Kelly chuyển sang animation Talking.
5. Phát audio đọc câu hỏi và bốn đáp án.
6. Kelly trở về Idle.
7. Mở giai đoạn nhận câu trả lời.
8. Timer bắt đầu đếm ngược.

Thời gian trả lời do backend điều khiển. Nếu audio không khả dụng, chuyển sang chế độ không giọng đọc và tiếp tục game.

## 5. Audio Queue
- Không phát chồng nhiều lời thoại.
- Hỗ trợ ưu tiên thông báo quan trọng.
- Hỗ trợ cancel khi Skip Question.
- Pause/Resume đồng bộ với game.
- Không phát lại audio khi Overlay reconnect nếu lời thoại đã kết thúc.
- Chỉ có một audio output chính để tránh phát trùng.

## 6. MC Animation Synchronization
PNG Sequence: idle, talking, excited, victory.
- MVP có thể chỉ dùng idle/talking.
- Nếu chưa có Talking Sequence: dùng chuyển động nhẹ của nhân vật hoặc ảnh tĩnh.
- Không yêu cầu lip-sync phức tạp trong MVP.

## 7. Dashboard Settings
Bật/tắt MC Voice · chọn TTS Provider · chọn giọng tiếng Việt · tốc độ đọc · âm lượng · đọc câu hỏi · đọc bốn đáp án · đọc giải thích · đọc bảng xếp hạng · Test Voice · Audio Output Status.

## 8. Performance
- Cache audio theo nội dung và voice settings.
- Pre-generate audio cho các câu hỏi đã chọn khi có thể.
- Không gọi TTS lại cho cùng nội dung nếu cache còn hợp lệ.
- Có timeout và fallback.
- Lỗi TTS không được làm dừng Quiz Engine.

## 9. Acceptance Criteria
- MC đọc đúng nội dung câu hỏi.
- Đọc đúng A/B/C/D.
- Không đọc nhầm câu khác.
- Không phát chồng âm thanh.
- Animation Talking đồng bộ với audio.
- Timer hoạt động theo cấu hình.
- Pause/Resume không gây phát trùng.
- Tắt Voice thì game vẫn chạy bình thường.
- Audio phát vào đúng nguồn âm thanh mà OBS/TikTok LIVE Studio thu.

## Bước 0 (bắt buộc trước khi code)
Kiểm tra hệ thống âm thanh hiện tại, xác định phần tái sử dụng được, đề xuất phương án triển khai → coordinator/người dùng duyệt rồi mới code.
