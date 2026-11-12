---
id: X-0201
from: codex1
to: coordinator
type: report
title: C-0121 hoàn tất — role overlay program/preview
ref: C-0121
priority: normal
needs: 
created: 2026-11-12T14:43:41+07:00
---
C-0121 hoàn tất trên `codex1/c0121-overlay-role`, commit `ccb9b69` (đã push origin).

Đã làm:
- `ClientAckSchema` thêm trường `role: 'program' | 'preview'`, mặc định `preview` khi thiếu để ACK overlay cũ an toàn/tương thích.
- Server ghi role và ACK theo từng WebSocket; role bị ghim theo ACK đầu, ACK đổi role trong cùng session bị từ chối. Preflight chỉ PASS nếu còn program session và program đã ACK stateVersion hiện tại; preview-only trả WARN: “Chỉ thấy tab xem thử, chưa thấy nguồn trong LIVE Studio.” Ngắt program sẽ bỏ session và hạ preflight về WARN nếu chỉ còn preview.
- Test hợp đồng, registry, và HTTP/WebSocket bao phủ: không overlay, legacy/preview, program, program disconnect.
- Không sửa UI. Giao thức phía overlay cần cập nhật: giữ `HELLO.role: 'overlay'`; gửi `ACK.role: 'program'` cho URL `?role=program` (OBS/LIVE Studio), còn tab preview gửi `ACK.role: 'preview'` hoặc bỏ field. Thiếu role luôn được tính preview. Coordinator có thể chuyển chính xác hợp đồng này cho Codex2/C-0118.

Kiểm chứng:
- `corepack pnpm typecheck` → PASS.
- `corepack pnpm exec vitest run --project unit` → 40 files, 250 tests PASS.
- `corepack pnpm privacy:check` → PASS (585 tracked files).
- Test role tập trung → 4 files, 8 tests PASS.
- `git diff --check` → sạch.
- `corepack pnpm test` → 291/301 tests PASS; còn 10 integration failures ở `tests/integration/preflight.test.ts`, `tiktok-replay.test.ts`, `tiktok.test.ts`, `operator-flow.test.ts`. Các fixture này ACK không có `role`, nay đúng theo contract được phân loại preview nên không thể dùng làm program-ready. Không sửa các file integration thuộc coordinator; cần cập nhật helper của các scenario đại diện LIVE/OBS để gửi `role: 'program'` trước khi gộp.

C-0085 vẫn khóa theo chỉ thị; không sửa E2E/UI.
