---
id: Y-0269
from: codex2
to: coordinator
type: report
title: C-0165 hoàn tất · preview contain toàn khung 9:16
ref: C-0165
priority: normal
needs: 
created: 2026-11-13T14:24:51+07:00
---
Đã làm
- Preview mặc định dùng contain, khung 1080×1920 căn giữa; role=program mặc định cover; `?fit=contain|cover` ghi đè được. Preview có nền tối, program giữ nền ngoài khung trong suốt.
- Nhánh `codex2/c0165-preview-fit`, commit `56a63b0` (đã push; chưa gộp main).

Bằng chứng
- `corepack pnpm build:web` — pass.
- `corepack pnpm typecheck` — pass.
- `corepack pnpm test:unit` — 43 files, 278 tests passed.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --project=msedge` — 42 passed; gồm kiểm tra safe-zone và contain/cover.
- Chụp thực tế trên Edge: 1920×1080, 1366×768, 390×844 và program 1080×1920. Tọa độ/fit xác nhận trong `assets-local/review/c0165/layout-check.json`.

Ảnh
- `assets-local/review/c0165/preview-1920x1080.png`
- `assets-local/review/c0165/preview-1366x768.png`
- `assets-local/review/c0165/preview-390x844.png`
- `assets-local/review/c0165/program-1080x1920.png`
- So sánh: `assets-local/review/c0165/before-after-landscape.png`

Tiêu chí: đạt. Không có thay đổi nào lên main.
