---
id: Y-0677
from: codex2
to: coordinator
type: report
title: Hoàn tất C-0407/C-0408: theme map và ngai
ref: C-0407
priority: normal
needs: 
created: 2026-11-24T02:24:15+07:00
---
# Hoàn tất C-0407/C-0408 — theme map và bố cục ngai

**Branch:** `codex2/c-theme-goc`  
**Commit đã push:** `02f8e108 Complete throne seating and theme visibility map`  
**Worktree:** sạch; không sửa z-index/CSS/layout sau chỉ dẫn C-0415.

## C-0415 pixel gate

Lệnh:
```powershell
$env:QUIZ_ASSETS_DIR = 'E:\Ai\2026\Trend mini game tiktok\assets-local'
corepack pnpm theme:map default --themes .claude/review/C0407/theme
```

Output JSON: `.claude/review/C0407/theme/default/SO-DO/kiem-phu.json`

- Top-level `result: PASS`, không thiếu slot, không có slot FAIL.
- I10: 30 vị trí, `result: PASS`, tốt nhất 102.31%, thấp nhất 48.01%; 22 lần đo trong dải 25–50% (gồm biên 50%), liệt kê phần tử giao bbox: `.v3-step`, `.v3-seat-name`, `.v3-chibi-img`.
- Ảnh soi `.claude/review/C0407/theme/default/soi/I10.png`: nhãn đỏ nằm ngoài bbox, phía trên.
- `corepack pnpm theme:validate .claude/review/C0407/theme/default`: `Theme “Bá Vương Đại Chiến” (default) hợp lệ.`

## Kiểm tra

- `corepack pnpm typecheck`: PASS.
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=2 --no-file-parallelism`: **104 files, 685 tests passed**.
- `corepack pnpm test:e2e` với `QUIZ_DEFAULT_THEME_EXPORT=.claude/review/C0407/theme/default`, review dirs C0396/C0397: **asset thật clean-1 176 passed, 0 failed (9.0m); clean-2 176 passed, 0 failed (8.6m)**. C-0397 so pixel 0 lệch ở cả 11 cảnh; C-0386 ribbon 0 pixel lệch trong cả 4 cảnh.
- `corepack pnpm test:e2e` với `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`: **170 passed, 5 failed, 1 skipped (7.5m)**. Năm lỗi đều dính fixture thiếu `/assets/throne/ngai-trong.png`: C-0397 baseline, C-0407 sảnh, mock lobby, ảnh C-0279 lobby và test audio lobby. Fixture không chứa asset đó; hai lượt asset thật đều qua.
- `corepack pnpm privacy:check`: PASS (1,639 tracked files).
- `git diff --check`: PASS.

Đã dọn 52 log chẩn đoán C0407, file probe và các ghi chú tạm; giữ artifact nghiệm thu trong `.claude/review/C0407`.
