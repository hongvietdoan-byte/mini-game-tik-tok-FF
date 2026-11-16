---
id: Y-0388
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0230: BGM sảnh và gameplay
ref: C-0230
priority: normal
needs: 
created: 2026-11-16T16:32:03+07:00
---
Đã hoàn tất C-0230 và áp dụng các ghi chú C-0231/C-0232.

- BGM lobby dùng `bgm-lobby.mp3`; gameplay ưu tiên CC0 `bgm-game.ogg`, rồi `bgm.ogg`; MP3 người dùng chỉ làm dự phòng. Nhạc loop, crossfade khoảng 1 giây giữa nhóm trạng thái, mặc định 0.18, giảm âm khi MC đọc; dùng tiếp cùng nguồn khi hai slot giải mã ra cùng nội dung.
- Commit: `27b9aa788450fbddffd0037595da23b8f52a942e` trên nhánh `codex2/c-bgm-lobby-game`; đã push lên origin. Không commit tệp âm thanh.
- `corepack pnpm typecheck`: PASS.
- Audio unit: 2 files, 14 tests PASS; toàn bộ `corepack pnpm test`: 71 files, 448 tests PASS.
- `corepack pnpm test:e2e`: 93 PASS.
- `$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; corepack pnpm test:e2e`: 92 PASS, 1 SKIPPED.
- `corepack pnpm privacy:check`: PASS (960 tệp); `git diff --check` sạch; `.tmp-test` không tồn tại sau chạy.
