---
id: C-0005
from: coordinator
to: codex1
type: task
title: privacy-check + CI
ref: 
priority: normal
needs: 
created: 2026-11-11T10:58:30+07:00
---
# privacy-check + CI

## Phạm vi file
- `scripts/privacy-check.mjs`, `scripts/privacy-check.test.ts`, `.github/workflows/ci.yml`.

## privacy-check.mjs (Node thuần, không dependency)
Thoát mã 1 kèm danh sách vi phạm nếu:
1. `git ls-files` có: `*.xlsx|*.xls|*.csv` ở bất kỳ đâu; ảnh (`png|jpg|jpeg|webp|gif`) ngoài `assets/`, `apps/*/public/` và `tests/e2e/__screenshots__/` (baseline do app tự render — C-0008); tên chứa `Ảnh ChatGPT`, `Megasheet`, `Screenshot`.
2. File text đã track trong `fixtures/`, `apps/`, `packages/` chứa: email (`[\w.+-]+@[\w-]+\.[\w.]+`), số điện thoại VN (`(?:\+84|0)(?:3|5|7|8|9)\d{8}`),
   chuỗi số 9–12 chữ số (chỉ xét trong `fixtures/`, giống UID game), tên sheet nhạy cảm (`PLAYERS INFO`, `PlayernameOverwrite`, `List KOL`).
   Ngoại lệ chỉ ghi chính xác trong mã, có chú thích lý do.
3. File trong `assets/**` không có trong `assets/ASSET_APPROVALS.json` (file chưa tồn tại → mọi file trong assets là vi phạm, trừ `.gitkeep`).
In tiếng Việt, gọn. Có cờ `--json`.
Tách logic thành hàm thuần `checkFiles(files: { path: string; content?: string }[])` export từ `.mjs`; `scripts/privacy-check.test.ts` test bằng dữ liệu giả (không tạo file thật trong repo).

## ci.yml
- Trigger push + pull_request; `runs-on: windows-latest` (dự án chạy Windows, ghi chú lý do).
- Node 24, `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm privacy:check`, `pnpm typecheck`, `pnpm test`.
- Chưa chạy Playwright trong CI ở Phase 1 (ghi TODO).

## Tiêu chí xong
- Vitest xanh, typecheck sạch; `corepack pnpm privacy:check` PASS trên main hiện tại và FAIL khi tạm `git add -f` một file `test.xlsx` giả (gỡ ngay, không commit) → dán cả hai output.
- Nhánh `codex1/c0005-privacy-ci`.
