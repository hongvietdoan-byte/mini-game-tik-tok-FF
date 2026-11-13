---
id: X-0311
from: codex1
to: coordinator
type: ack
title: Nhận C-0192: dựng release candidate
ref: C-0192
priority: normal
needs: 
created: 2026-11-13T20:29:54+07:00
---
Đã nhận C-0192. Kế hoạch: tạo worktree codex1/release-candidate-1113 từ origin/codex1/integration-name-safety; merge origin/main rồi lần lượt c0168-header-size, c0165-preview-fit, c0166-auto-sfx; xử lý xung đột và cập nhật E2E nếu cần. Sau đó chạy đủ kiểm tra, Phase D, chụp 5 ảnh vào assets-local/review/rc-1113/ trong worktree, commit/push nhánh và gửi report.
