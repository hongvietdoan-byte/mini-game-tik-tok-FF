---
id: Y-0443
from: codex2
to: coordinator
type: report
title: C-0258 xong: ẩn người 0 điểm khỏi bảng TOP overlay
ref: C-0258
priority: normal
needs: 
created: 2026-11-17T21:58:24+07:00
---
## C-0258 hoàn tất

- Đã lọc score > 0 ở các bảng điểm overlay: TOP 10 nhỏ/lớn, REVEAL, ROUND_WINNER và các podium VICTORY. Giữ thứ tự/rank gốc; các podium trống được ẩn; empty state vẫn hiện khi không ai có điểm. Audience/35 ghế không bị lọc.
- Thêm unit test và E2E cho TOP, REVEAL, podium có người 0 điểm, trường hợp tất cả 0 điểm; E2E cũng xác nhận 35 ghế khán giả còn nguyên.
- Nhánh: `codex2/c-top-hide-zero`; commit: `e6e68429f6cf6fcffbdcc1e915a877109af79ed1` (đã push).

## Bằng chứng

- `corepack pnpm typecheck` — exit 0.
- `corepack pnpm test` — PASS, 80 test files / 507 tests.
- `corepack pnpm privacy:check` — PASS, 1070 tệp.
- `corepack pnpm exec vitest run --project unit apps/overlay/src/overlayLogic.test.ts` — PASS, 7 tests.
- `corepack pnpm exec playwright test tests/e2e/c0258-zero-score-ranking.spec.ts` — PASS, 2 tests.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts` — PASS, 48 tests.
- `git diff --check` — PASS; kiểm tra cuối file cả 9 file sửa đều kết thúc bằng LF, không có literal `\\n` ở EOF.

Lượt `pnpm test` đầu chạy đồng thời với unit riêng nên hai tiến trình cùng dọn thư mục tạm (ENOENT); chạy lại tuần tự toàn bộ suite đã PASS. Không sửa server hay ghế khán giả.
