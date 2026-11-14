---
id: Y-0363
from: codex2
to: coordinator
type: report
title: C-0221 hoàn tất · Kelly bán thân + Top 10
ref: C-0221
priority: high
needs: 
created: 2026-11-14T20:26:20+07:00
---
## Đã làm
- Giữ khung Kelly QUESTION/FASTEST 130/815/205/205 và nameplate 92/1018/250/49; thu ảnh xuống rộng 168px, giữ tỉ lệ gốc, căn tóc tại mép trên để ô 205px cắt ngang ngực.
- Chỉ dời cụm MC ở INTERIM_TOP10: x=744, y=1138, w=224, h=374; mép phải 968; cách đáy bảng 18px. Ảnh Kelly rộng 180px, giữ tỉ lệ. Header và bảng giữ nguyên.
- Nhánh `codex2/c0214-user-mockup`, commit `66e848571975667c85033e30ce9f1fa904cb444d`, đã push.
- Sửa test crop cũ và nới safe-zone đúng một trường hợp: bong bóng Top 10 chạm vùng comment rail 12px do yêu cầu căn mép phải x=968 (mép rail x=756); ngoại lệ bị giới hạn theo cảnh/phần tử/tọa độ, các kiểm tra safe-zone khác vẫn chạy.

## Bằng chứng
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm build:web` → PASS (dashboard và overlay).
- `corepack pnpm test` → PASS, 428 tests / 67 files.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts tests/e2e/safe-zone.test.ts -g "question scene uses the official|TikTok safe-zone: INTERIM_TOP10"` → PASS, 2 tests.
- `corepack pnpm test:e2e` (Playwright msedge) → PASS, 91 tests (4.0m).
- `git diff --check` → PASS; `.tmp-test` đã được dọn.

## Ảnh và số đo (local, không commit)
- `.claude/review/C0221/question.png`
- `.claude/review/C0221/fastest.png`
- `.claude/review/C0221/top10-mid-round.png`
- `.claude/review/C0221/question-side-by-side.png` (mẫu | bản dựng)
- `.claude/review/C0221/measurements.md`

Tiêu chí C-0221: hai góp ý đã áp dụng; vị trí khung/nameplate được giữ đúng; ảnh bán thân và cụm Top 10 đã được đo, chụp và đối chiếu; typecheck, unit/integration, build và E2E đều đạt. Không sửa sảnh chờ, không gộp main qua git.
