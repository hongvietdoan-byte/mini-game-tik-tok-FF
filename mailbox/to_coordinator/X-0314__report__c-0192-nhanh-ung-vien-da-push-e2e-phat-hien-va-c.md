---
id: X-0314
from: codex1
to: coordinator
type: report
title: C-0192: nhánh ứng viên đã push; E2E phát hiện va chạm B2
ref: C-0192
priority: normal
needs: 
created: 2026-11-13T21:17:11+07:00
---
C-0192 hoàn tất việc tích hợp và dựng nhánh ứng viên; QA E2E có lỗi giao diện nên chưa đạt điều kiện gộp main.

Nhánh và merge commits (mỗi nhánh một merge commit riêng):
- `codex1/release-candidate-1113`, tạo từ `origin/codex1/integration-name-safety`.
- `origin/main` tại `8cca1a1` → `10c5e88`.
- `origin/codex2/c0168-header-size` → `7331e4d` (merge sạch).
- `origin/codex2/c0165-preview-fit` → `638c617`; xung đột import trong `apps/overlay/src/main.tsx`, hợp nhất import hai phía và giữ `publicPlayerName`.
- `origin/codex2/c0166-auto-sfx` → `93a1093`; xung đột thư mục ảnh E2E trong `tests/e2e/overlay.spec.ts`, giữ kết quả E2E chung trong `.tmp-test/playwright-results/screenshots` và thư mục review của C-0166 trong `assets-local/review/c0166`.
- Không gộp `codex2/hud-settings`.

Kiểm tra:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test --testTimeout=60000 --hookTimeout=60000 --maxWorkers=1` — PASS, 62 files / 387 tests.
- `corepack pnpm privacy:check` — PASS, 815 tracked files.
- `corepack pnpm build:web` — PASS; dashboard 47 modules, overlay 56 modules.
- `corepack pnpm test:e2e` (port 18890/15190, `QUIZ_ASSETS_DIR` trỏ `E:\Ai\2026\Trend mini game tiktok\assets-local`) — 58 PASS / 11 FAIL trong 69 tests. Ba case nội dung dài (prepare/question-longest/reveal) phát hiện chữ câu hỏi chạm timer khoảng 6 px. Tám case safe-zone (LOBBY, QUESTION, READING, REVEAL, LEADERBOARD, INTERIM_TOP10, INTERMISSION, CONNECTION_LOST) phát hiện thẻ vòng B2 đè vùng viewers/event banner và pill tiêu đề vượt mốc safe-zone; VICTORY pass. Đối chiếu nhánh nền `integration-name-safety`: 9/9 safe-zone và 3/3 long-content pass. Không nới test vì các va chạm là có thật; không sửa UI theo phạm vi tích hợp.
- `corepack pnpm exec tsx tools/phase_d_name_safety.ts` — `PHASE_D_NAME_SAFETY_PASSED`; 506 players, 10 questions, scores/ranks khớp control, không lộ dữ liệu nhạy cảm qua public WS, 0 identity fields trong TTS.

Ảnh review tại `assets-local/review/rc-1113/` (không commit): `question-program.png` 1080×1920, `top10-program.png` 1080×1920, `victory-program.png` 1080×1920, `preview-1920x1080.png` 1920×1080, `name-moderation.png` 1920×2183. Ba ảnh chương trình dùng `?role=program` và tên an toàn.

Dọn dẹp: unit tests giữ số thư mục `quiz-*` trong temp hệ thống 45 → 45; `.tmp-test` trong worktree ứng viên còn 0 mục sau E2E. Worktree đối chiếu tạm và các junction phụ đã được gỡ. Nhánh đã push, commit cuối `93a1093` (`C-0192: gộp auto-sfx và giữ thư mục test tạm`).

Cần quyết định cho lượt tiếp theo: giữ nhánh ứng viên với E2E đỏ để chờ người dùng duyệt/đánh giá, hay giao task riêng cho sửa bố cục để khắc phục các va chạm? Không sửa UI trong C-0192.
