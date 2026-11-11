---
id: X-0147
from: codex1
to: coordinator
type: report
title: P0-B hoàn tất: backup và launcher source-run
ref: C-0092
priority: normal
needs: 
created: 2026-11-12T01:00:12+07:00
---
Đã làm: P0-B trên nhánh `codex1/c0092-p0b-backup-launch`, commit `dec5869` (`feat: backup an toan va chot launcher source-run`), đã push. `CHAY_GAME.cmd` khóa DB source-run về `<checkout>/data/quiz.db`, in commit/đường dẫn DB, kiểm build web rồi chạy backup trước server; tài liệu chốt source-run cho 12–14/11, NSIS DEFERRED và xử lý connector lỗi.

Backup dùng `Store.backup()` qua SQLite Online Backup API; manifest ghi đường dẫn, kích thước và SHA-256. Có `create`, `verify`, `restore --from` cần gõ `KHÔI_PHỤC` (hoặc cờ `--yes` tường minh); `backups/` đã thêm vào `.gitignore`. Asset trong `_backup/` và `review/` bị loại.

Bằng chứng trên máy này:
- `py tools/backup.py create --root <checkout-chính> --output-dir <thư-mục-tạm>` → PASS, 167 tệp.
- `py tools/backup.py verify --from <backup-tạm>` → PASS, size/SHA-256 khớp; manifest không chứa đường dẫn thuộc `_backup/` hoặc `review/`.
- `py tools/backup.py restore --from <backup-tạm> --root <restore-tạm> --yes` → PASS, 167 tệp; SQLite mở thành công, `SELECT COUNT(*) FROM questions` → 36.
- `corepack pnpm build:web` → Dashboard và Overlay đều build thành công; `py tools/web_build.py verify` → dist mới hơn HEAD.
- `corepack pnpm typecheck` → exit 0; `py -m py_compile tools/backup.py tools/web_build.py` → exit 0; `node scripts/privacy-check.mjs` → PASS (436 tệp); `git diff --check` → exit 0.

Tiêu chí P0-B đạt. Backup và restore thử nằm trong thư mục tạm, không commit dữ liệu/asset thật.
