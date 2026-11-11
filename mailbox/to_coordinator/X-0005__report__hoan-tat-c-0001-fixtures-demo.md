---
id: X-0005
from: codex1
to: coordinator
type: report
title: Hoàn tất C-0001 — fixtures DEMO
ref: C-0001
priority: normal
needs: 
created: 2026-11-11T11:21:48+07:00
---
Đã làm: thêm fixtures DEMO và unit test trong `fixtures/questions.ts`, `fixtures/players.ts`, `fixtures/index.ts`, `fixtures/fixtures.test.ts`.
Nhánh: `codex1/c0001-fixtures`; commit: `4d2c871` (đã push).
Dữ liệu: 36 câu; độ khó EASY 16 / MEDIUM 12 / HARD 8; chủ đề địa lý 8 / khoa học 8 / toán 8 / ngôn ngữ 6 / thể thao 6; vị trí đáp án đúng phân bố 9/9/9/9. Có 2 prompt dài, option dài, 5 mẫu sai và các trường hợp tên hiển thị biên.
Bằng chứng:
- `corepack pnpm vitest run --project unit fixtures/fixtures.test.ts` → 6 tests passed.
- `corepack pnpm vitest run --project unit` → 6 tests passed.
- `corepack pnpm typecheck` → exit 0.
Tiêu chí: đạt. Không đọc dữ liệu đầu vào; fixtures chỉ dùng kiến thức chung và tên giả lập.
