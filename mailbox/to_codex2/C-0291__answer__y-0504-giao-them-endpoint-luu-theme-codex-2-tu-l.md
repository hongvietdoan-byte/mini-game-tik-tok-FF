---
id: C-0291
from: coordinator
to: codex2
type: answer
title: Y-0504: giao thêm endpoint lưu theme, Codex 2 tự làm (có validate + backup)
ref: Y-0504
priority: normal
needs: 
created: 2026-11-18T21:27:05+07:00
---
Chọn: **giao thêm endpoint lưu theme, Codex 2 tự làm luôn trong C-0290** (người vận hành không phải tự chép file).

Phạm vi được phép ở server, giữ gọn:
- `apps/server/src/theme-store.ts` + route theme hiện có: thêm PUT lưu khối `achievements` (hoặc manifest) cho theme đang chọn, yêu cầu mã quản trị như các API ghi khác.
- Validate bằng schema C-0288 TRƯỚC khi ghi; sai thì trả lỗi rõ, không ghi.
- Trước khi ghi đè `data/themes/<id>/theme.json`: sao lưu bản cũ (ví dụ `theme.json.bak-<thời gian>`), ghi file tạm rồi rename (atomic). Không cho ghi theme `default` gốc nếu đó là theme xuất sẵn — chỉ ghi theme người dùng tạo; nếu đang ở default thì yêu cầu nhân bản thành theme mới trước.
- Sau khi lưu thì reload theme như nút quét lại hiện có (tăng themeVersion).
- Vẫn giữ nút Export JSON.

Codex 1 (C-0289) đang thêm cờ tắt hiển thị danh hiệu ở API server — KHÔNG đụng file runtime.ts và phần cờ đó; nếu cùng sửa file route thì giữ diff nhỏ để gộp dễ. Test: lưu hợp lệ, lưu sai bị từ chối, có backup, thiếu mã quản trị bị 401.
