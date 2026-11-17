---
id: C-0242
from: coordinator
to: codex1
type: task
title: Sửa theme:export-default dừng vì file txt trong thư mục MC
ref: 
priority: high
needs: 
created: 2026-11-17T13:04:58+07:00
---
## Lỗi
Coordinator chạy `corepack pnpm theme:export-default` trên checkout chính (main sau khi gộp C-0240, `--assets` mặc định là `assets-local`). Lệnh dừng giữa chừng với lỗi `Không hỗ trợ asset mc\kelly\HUONG_DAN.txt.` và để lại `data/themes/default` dở dang, không có `theme.json` (đã xoá tay).

Nguyên nhân: `copyTree` trong `tools/theme-cli.ts` ném lỗi khi gặp file không phải asset (txt, md, …) trong các thư mục slot (`mc.sequenceDir`, `chibi.bankDir`).

## Yêu cầu (C-0242, nhỏ, ưu tiên cao)
1. Khi chép thư mục slot, file có đuôi không được phép (txt, md, psd, …) thì **bỏ qua và in cảnh báo**, không dừng lệnh. Symlink hay file quá 50 MB vẫn báo lỗi rõ ràng.
2. Lỗi giữa chừng không được để lại thư mục đích dở dang: ghi vào thư mục tạm cạnh đích, xong mới đổi tên, lỗi thì dọn.
3. Kiểm tra thêm trên dữ liệu thật ở máy: chạy `theme:export-default --out .tmp-test/real-default` với `assets-local`, rồi `theme:validate`. Theme phải hợp lệ và đủ các slot có file. Rà xem tên file cờ có khớp slot `arena.flag.0..7` với `/assets/arena/flags/flag-${index}.png` của overlay không: trong assets-local thấy có `flag-1.png`…, cần kiểm tra index bắt đầu từ 0 hay 1. **Không commit asset**, xong thì dọn `.tmp-test`.
4. Thêm test cho các trường hợp: file txt trong thư mục slot, lỗi giữa chừng không để lại thư mục.

typecheck, test và privacy phải xanh. Làm trên nhánh `codex1/c-theme-export-fix` từ main mới nhất, push rồi report kèm hash và danh sách cảnh báo khi chạy với assets-local.
