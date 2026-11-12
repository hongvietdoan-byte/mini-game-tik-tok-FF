---
id: X-0196
from: codex1
to: coordinator
type: report
title: C-0119 hoàn tất — rehearsal và backup mirror
ref: C-0119
priority: normal
needs: 
created: 2026-11-12T12:16:19+07:00
---
C-0119 hoàn tất trên `codex1/c0119-rehearsal-report`, commit `13437ee` (đã push origin). Chỉ đổi `docs/reports/REHEARSAL_2026-11-12.md`.

Kết quả rehearsal:
- Lệnh: `corepack pnpm exec tsx tools/rehearsal.ts`
- Output: `CODE_REHEARSAL_PASSED — 6/6 vòng`; artifact đã được tạo lại với nhãn CODE_REHEARSAL_* và ghi rõ đây là rehearsal source-code/MOCK, không thay operator rehearsal V4 P0.5.

Thử backup tạm (fixture synthetic, không chạm `data/` thật):
- `py tools/backup.py create --root <temp>/source --output-dir <temp>/source/backup-store` → PASS, 2 tệp.
- `py tools/backup.py verify --from <temp>/source/backup-store/20261112-121405` → PASS, hash/kích thước khớp.
- Lần chạy tiến trình `py tools/backup.py restore ... --yes --mirror` dừng an toàn ở guard vì môi trường không xác minh được cổng 8787 (timeout); không restore dở dang.
- Sau đó gọi `backup.main([... "restore", ..., "--yes", "--mirror"])` với duy nhất `server_is_listening` được giả lập đóng cổng. Parser/luồng CLI chạy PASS; verify lại PASS; asset stale bị xóa, `review/` và `_backup/` được giữ, DB restored đọc được.
- Temp còn giữ để kiểm tra: `C:\Users\hongviet.doan\AppData\Local\Temp\quiz-c0119-655bc89cad6a46358de817efb89c7efb` (chỉ chứa dữ liệu fixture synthetic).

C-0085 vẫn chưa mở khóa; không sửa E2E/Codex2.
