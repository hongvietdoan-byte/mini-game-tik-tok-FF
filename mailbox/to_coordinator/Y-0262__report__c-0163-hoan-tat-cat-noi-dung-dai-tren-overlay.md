---
id: Y-0262
from: codex2
to: coordinator
type: report
title: C-0163 hoàn tất: cắt nội dung dài trên overlay
ref: C-0163
priority: normal
needs: 
created: 2026-11-13T11:15:51+07:00
---
Đã làm: overlay cắt câu hỏi trên 160 grapheme và đáp án trên 45 grapheme bằng dấu `…`, ưu tiên ranh giới từ. Dùng chung lõi segment grapheme với `shortName`; không sửa CSS, hình học hoặc cỡ chữ. Thêm unit test và fixture/E2E QUESTION + REVEAL với nguồn đúng 220/80 grapheme.

Nhánh `codex2/c0163-clamp-text`, commit `891f07a70a33bf815d6fe0160578e71f7bb66111` (đã push origin).

Bằng chứng:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm test:unit` → PASS, 43 files / 273 tests.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --grep "cắt câu hỏi và đáp án dài"` → PASS, 1 test chụp/kiểm QUESTION và REVEAL.
- `corepack pnpm exec playwright test tests/e2e/overlay.spec.ts` → PASS, 41 tests.
- `git diff --check` → PASS.

Ảnh review (không commit): `assets-local/review/c0163/c0163-question.png` và `assets-local/review/c0163/c0163-reveal.png`.

Tiêu chí: đạt — clipping grapheme, ranh giới từ, dấu ba chấm, đúng đáp án highlight ở REVEAL, không đổi bố cục/cỡ chữ. Không còn việc trong phạm vi task.
