---
id: Y-0353
from: codex2
to: coordinator
type: report
title: C-0210 hoàn tất — sửa ô VÒNG trên ba nhánh
ref: C-0210
priority: normal
needs: 
created: 2026-11-14T14:09:25+07:00
---
C-0210 đã hoàn thành trên cả ba nhánh, chỉ thay đổi kích thước/nội dung ô VÒNG, giữ nguyên các khung đã duyệt.

Thay đổi và số đo:
- `codex2/c0168-header-size` (`262d23a`): Header A cao 108→128 px; neo trên y=16, đáy y=144. Header B giữ 108 px.
- `codex2/hud-settings` (`59a4ae8`): Header A cao 108→128 px; neo trên y=16, đáy y=144. Header B giữ 108 px.
- `codex2/c0197-fastest-correct` (`2e8298f`): Header A cao 99→128 px; neo trên y=16, đáy y=144. Header B giữ 108 px.
- Cả ba nhánh giữ cỡ chữ A 36/52/24 và B 24/34/18; hàng tiêu đề/số/nhãn không giao nhau. Header B chuẩn hóa roundLabel `VONG` thành `VÒNG`. Kiểm tra số 57, 9.999, 10,5K, 1,2M đều vừa ô.
- Các phép đo ngoài ô VÒNG vẫn như trước: logo 172.8×178.5, pill 325.2×53, Top 10 300×466, bảng câu hỏi 567×470. Card VÒNG x=760, y=16, w=220; A h=128, B h=108.

Kiểm chứng trên cả ba worktree:
- `corepack pnpm build:web`: pass.
- `corepack pnpm typecheck`: pass.
- `corepack pnpm test:unit`: pass — C0168 281 test/44 files; C0172 và C0197 287 test/45 files mỗi nhánh.
- Playwright dùng `msedge`: chạy `tests/e2e/c0194-geometry.spec.ts` + `tests/e2e/c0210-round-card.spec.ts` với `C0194_OPTION=A` và `B`: 6/6 pass mỗi nhánh (18/18 tổng).
- `corepack pnpm test` (unit + integration) chưa xanh: trên C0168/C0172, test không liên quan `tests/integration/simulator-restart.test.ts` vượt timeout 60 giây. Unit và E2E mục tiêu bên trên đều pass.

Ảnh xem lại:
- C0168 A: `.claude/worktrees/c0168-header-size/.claude/review/C0210/header-A/question.png`
- C0168 B: `.claude/worktrees/c0168-header-size/.claude/review/C0210/header-B/question.png`
- C0172 A/B: `.claude/worktrees/c0172-hud-settings/.claude/review/C0210/header-A/question.png`, `header-B/question.png`
- C0197 A/B: `.claude/worktrees/c0197-fastest-correct/.claude/review/C0210/header-A/question.png`, `header-B/question.png`

Đã push ba nhánh lên origin; không đưa `.tmp-test/` phát sinh sẵn ở worktree C0168 vào commit.
