---
id: C-0075
from: coordinator
to: codex1
type: task
title: C-0075: C-0070 cập nhật — người dùng gửi tài liệu tích hợp ClipAI (giọng Kelly) — đọc trước khi viết đề xuất
ref: C-0070
priority: high
needs: 
created: 2026-11-11T21:27:11+07:00
---
Người dùng (21:22) gửi gói bàn giao giọng MC Kelly qua ClipAI. Đã chép (NGOÀI git, repo public) vào:
`assets-local/mc/voice/clipai/` — `BAN_GIAO_STORM_ARENA.md` (đọc HẾT: API 3 bước bất đồng bộ, lỗi 1130/401/hết credit, 12 yêu cầu chức năng, kiểm thử, phân vai), `README.md`, `kelly_tts.py` (mã tham chiếu đã chạy thật), `mau_giong_kelly.mp3` (mẫu giọng).

Thay đổi so với C-0070/C-0072:
1. **Nhà cung cấp đã chốt**: ClipAI (voice 70, model eleven_v3). Adapter TTS = ClipAI theo đúng mục 3 tài liệu (submit → quét audio-list → tải CDN không kèm Authorization). Giữ interface adapter để thay được; fallback = cache → không giọng (hiện chữ). Không cần so sánh nhà cung cấp nữa.
2. **Phân vai (người dùng chốt)**: Codex KHÔNG có token, KHÔNG gọi API thật — chỉ code + test với API giả (mock đủ nhánh: success, processing→success, failed, 1130 retry-after, 401, hết credit, timeout). Mọi lần gọi thật (Test Voice, gen trước bộ câu) do coordinator chạy sau khi người dùng đồng ý.
3. **Repo PUBLIC — bắt buộc**: KHÔNG commit hostname nội bộ (chuỗi `ingarena`), voice id/tài liệu ClipAI nguyên văn, token, url CDN. Endpoint + key nhập ở Voice Settings, lưu backend (thư mục dữ liệu app, ngoài repo); mặc định endpoint để trống/đọc từ biến môi trường `CLIPAI_API_BASE`, token từ `CLIPAI_TOKEN` hoặc settings. Settings chỉ trả `••••` + 4 ký tự cuối. Bổ sung `scripts/privacy-check.mjs`: chặn `ingarena`, `Bearer ` + chuỗi dài, `waicdn`. Cache mp3 ở thư mục dữ liệu, không commit.
4. **Đồng bộ game** (mục 4 yêu cầu 7–9 + spec `docs/specs/MC_VOICE_SPEC.md`): timer trả lời chỉ chạy sau khi MC đọc xong câu + 4 đáp án (backend điều khiển, có trần thời gian đọc); Skip/Pause/Stop huỷ audio + xoá hàng đợi; MC idle↔talking theo `play`/`ended`; một nguồn phát duy nhất (overlay), dashboard tắt tiếng.
5. Gen trước toàn bộ bộ câu đã duyệt (tuần tự hoặc ≤ 2–3 song song) có tiến độ; lúc LIVE chỉ phát từ cache; câu động gen trước ≥ 1 nhịp.

**Vẫn là BƯỚC 0**: nộp `docs/review/MC_VOICE_DE_XUAT.md` (danh sách file định thêm/sửa, điểm nối engine/overlay/dashboard, cách kiểm thử theo mục 5, chia mốc, phần nào cần Codex 2 làm UI Settings). Không viết code tới khi coordinator + người dùng duyệt. Đề xuất cũng không được chứa hostname/voice id nội bộ (viết "ClipAI endpoint", "voice đã chốt").
