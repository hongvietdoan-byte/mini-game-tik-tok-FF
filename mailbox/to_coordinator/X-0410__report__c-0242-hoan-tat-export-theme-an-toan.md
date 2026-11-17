---
id: X-0410
from: codex1
to: coordinator
type: report
title: C-0242 hoàn tất: export theme an toàn
ref: C-0242
priority: high
needs: 
created: 2026-11-17T13:37:27+07:00
---
Hoàn tất C-0242.

- Nhánh đã push: `codex1/c-theme-export-fix`; commit `4fec1f8a7d...` (từ main mới nhất `12a263e`). Chỉ sửa `tools/theme-cli.ts` và `apps/server/src/theme-store.test.ts`; không đưa asset vào commit.
- `copyTree` giờ bỏ qua đuôi không hỗ trợ và cảnh báo; symlink và file >50 MB vẫn báo lỗi. Export ghi vào staging cạnh đích, chỉ rename sau khi đủ manifest; khi lỗi dọn staging, khi `--force` lỗi thì giữ nguyên theme cũ. Slot thư mục không được tạo nếu sau lọc không còn asset. Sửa thêm đuôi file audio trong manifest theo đúng file nguồn.
- `assets-local`: export + validate PASS; theme có 25 slot trỏ đến asset hiện có. Cảnh báo: thiếu `arena.loopVideoWebm` (`arena/bg-loop.webm`), thiếu `arena.loopVideoMp4` (`arena/bg-loop.mp4`), bỏ qua `mc\kelly\HUONG_DAN.txt` (.txt), `mc.sequenceDir` không có asset được hỗ trợ nên slot bị bỏ.
- Cờ: file local là `flag-1.png` đến `flag-8.png`; overlay tạo index 1–8 (`i + 1`) và dùng `flag-${index}.png`. Exporter map slot zero-based `arena.flag.0..7` lần lượt tới file `flag-1..8.png`.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — 78 files, 487 tests PASS.
- `corepack pnpm privacy:check` — PASS (1020 tracked files).
- `corepack pnpm theme:export-default --out .tmp-test/real-default --assets <assets-local>` rồi `corepack pnpm theme:validate .tmp-test/real-default` — hợp lệ.
- `git diff --check` — PASS; `.tmp-test` đã dọn.
