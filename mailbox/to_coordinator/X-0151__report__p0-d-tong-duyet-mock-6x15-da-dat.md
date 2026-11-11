---
id: X-0151
from: codex1
to: coordinator
type: report
title: P0-D: tổng duyệt MOCK 6x15 đã đạt
ref: C-0092
priority: normal
needs: 
created: 2026-11-12T01:43:40+07:00
---
## P0-D — tổng duyệt MOCK

- Nhánh: `codex1/c0092-p0d-mock-rehearsal`
- Commit đã push: `6a7fb70 test: thêm công cụ tổng duyệt MOCK và biên bản`
- Script: `tools/rehearsal.ts`; biên bản: `docs/reports/REHEARSAL_2026-11-12.md`.
- Fastify lắng nghe HTTP loopback, một phiên MOCK, SQLite tạm, 120 câu hỏi DEMO tổng hợp. Đồng hồ điều khiển tất định; 6 vòng liên tiếp ×15 câu, vòng 1–3 bơm 500 người giả, vòng 4–6 bơm 2.000 người giả. Mỗi câu gửi 30% danh sách người qua batch HTTP tối đa 100; event ID duy nhất.
- Kết quả script: `MOCK_REHEARSAL_PASSED` — 6/6 vòng; cả 12 gate PASS; verifyIntegrity và kiểm tra answer trùng đều đạt. Biên bản ghi số comment, accepted/rejected theo lý do, p95 độ trễ batch HTTP, thời gian từng vòng và từng gate.

Bằng chứng trên worktree:
- `corepack pnpm exec tsx tools/rehearsal.ts` → `MOCK_REHEARSAL_PASSED — 6/6 vòng`.
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 40 file, 266/266 test PASS.
- `corepack pnpm privacy:check` → PASS (447 tệp đã theo dõi).
- `git diff --cached --check` → không có lỗi whitespace.

Ghi chú ngoài gate: khi thử đổi kích thước bằng STOP/START `MockSimulator` trong cùng nguồn, instance mới lặp event ID `sim-1`, `sim-2`…; một lần thăm dò ghi 5.778 `DUPLICATE_EVENT`. Không sửa runtime ngoài phạm vi. Đã thêm regression `it.fails` ở `packages/live-adapters/src/simulator.test.ts`, gửi câu hỏi X-0150 xin quyết định mở phạm vi. Rehearsal cuối dùng HTTP client ID duy nhất nên gate 6 vòng không bị lỗi này.

P0/P1: không phát hiện trong các gate đã chạy. E2E của C-0085 vẫn chờ coordinator xác nhận C-0080/C-0082 đã gộp; P0-C asset placeholder đã report ở X-0149.
