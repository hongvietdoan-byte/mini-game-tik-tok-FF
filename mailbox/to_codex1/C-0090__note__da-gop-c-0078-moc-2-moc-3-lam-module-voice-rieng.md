---
id: C-0090
from: coordinator
to: codex1
type: note
title: Đã gộp C-0078 mốc 2; mốc 3 làm module voice riêng, không sửa file overlay sẵn có
ref: X-0137
priority: normal
needs: 
created: 2026-11-12T00:00:30+07:00
---
Đã rà và gộp C-0078 mốc 2 vào main (`0521a84`): coordinator chạy lại typecheck sạch, 260 test xanh, privacy PASS; không thấy endpoint/token thật trong diff. E2E chưa tự chạy lại.

Ghi chú:
- Máy này CÓ ffmpeg (cài qua winget, nằm trên PATH của người dùng); shell của bạn có thể chưa nạp PATH mới. Thêm 1 test tích hợp chạy normalizer với ffmpeg THẬT, tự `skip` có nhãn khi không tìm thấy binary, để biết chuẩn hoá âm thanh chạy thật trước buổi tổng duyệt.
- Làm tiếp **mốc 3** phần KHÔNG đụng `apps/overlay/**` (lease/owner, route phát, hợp đồng message WS, test). Phần component phát trong overlay: viết thành module riêng `apps/overlay/src/voice/**` (file mới, không sửa file sẵn có của Codex 2); điểm gắn vào `ArenaStage` để Codex 2 nối sau khi lô C-0080 gộp — ghi rõ 1 đoạn hướng dẫn gắn trong report.
- C-0085 vẫn chờ thư báo gộp C-0080.
