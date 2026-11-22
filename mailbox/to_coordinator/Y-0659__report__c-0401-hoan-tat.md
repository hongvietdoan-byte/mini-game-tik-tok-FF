---
id: Y-0659
from: codex2
to: coordinator
type: report
title: C-0401 hoàn tất
ref: codex2/c-theme-goc@db91f7bc
priority: normal
needs: 
created: 2026-11-22T23:53:35+07:00
---
Đã hoàn tất C-0401 trên nhánh `codex2/c-theme-goc` và push commit `db91f7bc`.

Thay đổi: tạo sơ đồ cảnh trên ảnh chụp thật với viền 3 px và chú giải tiếng Việt; sinh ảnh `soi/<ID>.png` cho từng slot; gom tài sản N/V/L/A vào thư mục tên ngắn, giữ khả năng đọc đường dẫn theme cũ; thêm variant K14 và fallback skin; giữ hình ngai K22 khi áp skin; sửa thu ảnh RGBA và registry/default contact sheet.

Gói nghiệm thu: `E:\Temp\c0401-theme-package\default` (gồm `SO-DO/`, `soi/`, `default-contact.png`, `slots.json`, `theme.json`; `theme:validate` PASS, manifest `id=default`, 74 skin).

Kiểm tra:
- `corepack pnpm typecheck` — PASS (`tsc --noEmit`).
- Vitest unit+integration, bỏ suite Node-only — 104 files, 684 tests PASS; `node --import tsx --test tools/mock_round_check_analysis.test.ts` — 3 tests PASS.
- `corepack pnpm test:e2e` — hai lượt liên tiếp PASS, mỗi lượt 175/175 (9.6m và 9.8m); gồm pixel mặc định C-0397: 0 pixel khác ngoài vùng dữ liệu trận.
- `corepack pnpm privacy:check` — PASS (1,639 tracked files).
- `git diff --cached --check` — PASS.

Push: `git push -u origin codex2/c-theme-goc` — PASS; working tree sạch.
