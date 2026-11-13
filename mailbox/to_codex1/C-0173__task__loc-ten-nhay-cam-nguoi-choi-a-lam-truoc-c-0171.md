---
id: C-0173
from: coordinator
to: codex1
type: task
title: Lọc tên nhạy cảm người chơi → A*** (làm trước C-0171)
ref: 
priority: high
needs: 
created: 2026-11-13T15:11:13+07:00
---
## Yêu cầu người dùng (13/11)
Lọc tên nhạy cảm của người chơi. Phát hiện tên nhạy cảm → hiển thị kiểu "A***********" (giữ ký tự đầu, phần còn lại thành `*`).

## Làm TRƯỚC C-0171 (an toàn LIVE quan trọng hơn HUD). Nhánh `codex1/name-filter`.

### 1. Thư viện thuần TypeScript (`packages/...` dùng chung, chạy offline, không gọi API ngoài)
- `normalizeForMatch(name)`: NFKC, chữ thường, bỏ dấu tiếng Việt (đ→d), leetspeak (0→o, 1/!/|→i, 3→e, 4/@→a, 5/$→s, 7→t, 8→b), bỏ ký tự ngăn cách (. _ - space, ký tự zero-width, emoji chen giữa), gộp ký tự lặp (looonnn→lon).
- Khớp từ khoá theo 2 kiểu: `word` (khớp trọn từ sau khi tách, tránh bắt nhầm như "Kelly" chứa "ell") và `substring` (cho từ dài, rõ ràng). Có whitelist để gỡ bắt nhầm.
- `maskName(name)`: grapheme đầu + `*` cho phần còn lại, tối đa 16 grapheme tổng (khớp giới hạn hiển thị hiện tại). Ký tự đầu cũng nhạy cảm/emoji → dùng "N".
- Danh sách mặc định trong repo (`packages/.../name-filter/default-list.ts` hoặc json): tục tĩu tiếng Việt + teencode (dm, vcl, cc, clgt, đụ/địt, lồn, buồi, cặc, đĩ…), tục tĩu tiếng Anh cơ bản, xúc phạm/phân biệt, chính trị/khủng bố nhạy cảm cơ bản, mạo danh (admin, garena, moderator, BTC, ban tổ chức). Ghi chú: repo public — chỉ để từ chung, không ghi tên người thật.
- Danh sách tuỳ chỉnh của người dùng: `data/name-filter.json` (ngoài git): thêm từ chặn, whitelist, danh sách user bị ẩn tên thủ công (theo id nội bộ, không ghi username ra log).

### 2. Server
- Áp dụng ở MỘT chỗ khi tạo/cập nhật người chơi từ sự kiện LIVE (audience/runtime) → mọi nơi hiển thị (BXH, Top 10, Victory, toast trả lời đúng…) đều dùng tên đã lọc. Overlay KHÔNG BAO GIỜ nhận tên gốc khi bị gắn cờ.
- Dashboard (role quản trị) được thấy tên gốc + cờ `flagged` + lý do (nhóm từ, không cần in từ) để duyệt.
- API quản trị: GET/PUT danh sách tuỳ chỉnh; `POST` ẩn/hiện tên thủ công 1 người chơi; áp dụng lại ngay cho người đang chơi (overlay đổi không cần F5).
- Log/backup không ghi tên gốc bị gắn cờ.

### 3. Test
Bảng ca: có dấu/không dấu, leetspeak (d1t, l0n), chen ký tự (đ.ị.t, d m), lặp chữ, emoji chen giữa, tên sạch không bị bắt nhầm (Kelly, Hải Đăng, Thắng, Cường, Lộc, Dung, Bích, Phúc, Scunthorpe-kiểu tiếng Việt), whitelist, mask đúng 16 grapheme, emoji đầu, chữ Hàn/Thái. Đo tốc độ: 10.000 tên < 200 ms.

### 4. Báo cáo
Liệt kê tỉ lệ bắt nhầm trên bộ tên sạch mẫu (tự sinh ~500 tên Việt phổ biến) và các ca đã biết KHÔNG bắt được. Phần giao diện trang dashboard để codex2 làm sau — gửi codex2 note mô tả API khi push.
