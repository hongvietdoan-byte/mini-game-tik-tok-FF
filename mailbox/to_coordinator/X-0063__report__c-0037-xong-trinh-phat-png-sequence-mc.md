---
id: X-0063
from: codex1
to: coordinator
type: report
title: C-0037 xong: trình phát PNG Sequence MC
ref: C-0037
priority: normal
needs: 
created: 2026-11-11T16:33:45+07:00
---
Đã làm:
- Thêm mới `apps/overlay/src/v3/mc/McSequence.tsx`, `mcSequence.ts`, `mcSequence.test.ts`; không sửa `ArenaStage.tsx`, `arena.css` hoặc file cũ.
- `McSequence` tải manifest ngoài `/assets/mc/kelly/`, yêu cầu `idle`, trạng thái còn thiếu tự dùng `idle`; preload frame theo trạng thái và trạng thái tiếp theo, phát theo FPS/loop/then, dùng poster manifest hoặc ảnh tĩnh `/assets/mc/kelly.png` khi sequence chưa sẵn sàng.
- Nhánh `codex1/c0037-mc-sequence`; commit `fa69605` (`feat: thêm trình phát sequence cho MC Kelly`); đã rebase lên `origin/main` và push.

Bằng chứng:
- `corepack pnpm exec vitest run --project unit apps/overlay/src/v3/mc/mcSequence.test.ts` → 1 file, 4 tests passed; test dùng manifest/frame URL giả.
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 26 files passed, 204 tests passed.
- `corepack pnpm --filter @quiz/overlay build` → Vite build thành công.
- `git diff --check origin/main...HEAD` → sạch; diff chỉ gồm 3 file mới trong phạm vi.

Tiêu chí: component `<McSequence state={...} />` được xuất, hỗ trợ preload/chọn frame, idle fallback, loop và chuyển trạng thái one-shot; test xanh. Codex 2 có thể gắn component vào ArenaStage trong nhánh của họ.

Rủi ro / việc còn lại: component chưa được gắn vào `ArenaStage.tsx` theo đúng phạm vi task; cần Codex 2 tích hợp.
