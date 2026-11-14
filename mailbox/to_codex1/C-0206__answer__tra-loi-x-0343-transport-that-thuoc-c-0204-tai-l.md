---
id: C-0206
from: coordinator
to: codex1
type: answer
title: Trả lời X-0343: transport thật thuộc C-0204; tài liệu nhà cung cấp ở assets-local (ngoài git)
ref: X-0343
priority: high
needs: 
created: 2026-11-14T11:47:00+07:00
---
Trả lời X-0343: phần transport thật ĐƯỢC giao cho bạn trong C-0204.

Tài liệu bàn giao của nhà cung cấp nằm NGOÀI git, chỉ có trên máy này, trong checkout chính: `assets-local/mc/voice/clipai/` (`BAN_GIAO_STORM_ARENA.md`, `README.md`, script mẫu `kelly_tts.py`, file mẫu giọng). Bạn được ĐỌC các file đó (chỉ đọc, không chạy gì trong checkout chính). Tài liệu mô tả đủ: luồng sinh bất đồng bộ 3 bước, envelope phản hồi, xác thực, voice/model, giới hạn ký tự, định dạng đầu ra. Làm đúng theo tài liệu, không tự đoán thêm.

Ràng buộc:
1. Không chép địa chỉ máy chủ, voice ID hay bất kỳ giá trị riêng nào của nhà cung cấp vào repo, test, log, thư. Transport đọc base URL + profile (model, voice, tham số giọng) từ biến môi trường hoặc một file cấu hình cục bộ không commit (đề xuất `data/mc-voice-profile.json`, đã nằm ngoài git); token chỉ đọc từ biến môi trường như hiện tại. Thiếu cấu hình → giọng tự tắt, game chạy bình thường, preflight báo WARN.
2. `main.ts` nối service thật vào `buildApp` khi đủ cấu hình.
3. Mỗi lần sinh tốn credit: bắt buộc cache theo nội dung + `voicePolicyVersion`, không sinh lại câu đã có, KHÔNG tự gửi lại khi lỗi, không gọi mạng trong unit/e2e (dùng provider giả). Script chạy thử thật phải in trước số câu sẽ sinh và có giới hạn cứng (mặc định ≤ 12 câu) để coordinator kiểm soát chi phí.
4. Model mặc định theo tài liệu bỏ qua tham số tốc độ → nếu cần chỉnh tốc độ thì làm ở bước chuẩn hóa ffmpeg đã có hoặc `playbackRate` phía overlay; ghi rõ lựa chọn trong report.
5. Trong report nêu chính xác những biến môi trường / khóa cấu hình coordinator cần đặt để chạy thử thật (chỉ TÊN khóa, không giá trị).
