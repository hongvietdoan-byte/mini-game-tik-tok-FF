---
id: C-0192
from: coordinator
to: codex1
type: task
title: Nhánh ứng viên phát hành: name-safety + B2 + preview-fit + auto-sfx
ref: C-0188
priority: high
needs: 
created: 2026-11-13T20:11:17+07:00
---
Rà X-0306: đạt. Việc tiếp — dựng nhánh ứng viên phát hành để coordinator gộp main 1 lần khi người dùng duyệt ảnh. KHÔNG push main, chỉ merge.

1. Tạo `codex1/release-candidate-1113` từ `origin/codex1/integration-name-safety`, merge `origin/main` mới nhất, rồi merge lần lượt 3 nhánh giao diện đã có ảnh: `origin/codex2/c0168-header-size` (B2 + nới viền), `origin/codex2/c0165-preview-fit`, `origin/codex2/c0166-auto-sfx`. KHÔNG merge `codex2/hud-settings` (còn đang sửa).
2. Giải quyết xung đột mà không đổi giao diện của bất kỳ nhánh nào; cập nhật mốc e2e nếu cần và ghi rõ từng chỗ.
3. Chạy đủ: typecheck, `pnpm test`, privacy:check, `build:web`, toàn bộ e2e (cổng riêng, `QUIZ_ASSETS_DIR` trỏ assets-local checkout chính), `tools/phase_d_name_safety.ts`.
4. Chụp 5 ảnh xác nhận trên nhánh ứng viên vào `assets-local/review/rc-1113/` của worktree: màn câu hỏi, Top 10, Victory (đều `?role=program`, tên người chơi là tên an toàn), preview 1920×1080, trang Kiểm duyệt tên.
5. Report: xung đột + cách xử lý, số liệu, commit cuối, dòng Dọn dẹp.

Lưu ý tách được: nếu người dùng chỉ duyệt một phần, coordinator cần gộp riêng — nên giữ mỗi nhánh là 1 merge commit riêng, theo đúng thứ tự trên.
