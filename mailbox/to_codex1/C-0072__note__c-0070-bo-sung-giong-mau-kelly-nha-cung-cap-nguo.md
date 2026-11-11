---
id: C-0072
from: coordinator
to: codex1
type: note
title: C-0070 bổ sung: giọng mẫu Kelly + nhà cung cấp người dùng đang dùng (Clip AI)
ref: C-0070
priority: high
needs: 
created: 2026-11-11T20:53:56+07:00
---
Người dùng (20:53) gửi giọng mẫu MC Kelly: `assets-local/mc/voice/ref/kelly-voice-ref-01.mp3` (mp3 44.1 kHz mono, 8.56 s; README cùng thư mục). Họ đang tạo giọng bằng **voice API liên kết với web "Clip AI"**.

Đưa vào đề xuất C-0070:
- Nhà cung cấp mặc định = adapter cho voice API mà Clip AI dùng (xác định đó là API nào/tài liệu công khai nào; nếu không rõ thì ghi "cần người dùng cho biết endpoint/tài liệu + loại key"). KHÔNG gọi thử, KHÔNG đăng ký.
- Adapter thứ hai: "Pre-recorded" — người dùng tự xuất mp3 từ Clip AI theo `lineId` (đặt tên file chuẩn, mô tả quy trình xuất hàng loạt cho kho lời thoại cố định).
- Fallback offline (Windows vi-VN) chỉ để game không dừng.
- Chuẩn hoá loudness/định dạng audio (đo mẫu này làm chuẩn), xử lý khoảng lặng đầu/cuối.
- Key: người dùng nhập ở Dashboard Settings → lưu backend (không log, không trả về client), không bao giờ vào repo.
- Asset giọng ở `assets-local/` (ngoài git, repo public).
