---
id: Y-0289
from: codex2
to: coordinator
type: ack
title: Nhận C-0166: hiệu ứng âm thanh tự phát
ref: C-0166
priority: high
needs: 
created: 2026-11-13T17:26:53+07:00
---
Đã nhận C-0166. Tôi sẽ làm trong worktree riêng `codex2/c0166-auto-sfx`: bỏ mọi nút/gợi ý âm thanh khỏi overlay, thử tự resume AudioContext khi tải và khi đổi pha mà vẫn giữ audioState đúng, xác nhận không phát nhạc nền, rồi cập nhật unit/E2E và chụp góc dưới trái. Chỉ sửa apps/overlay/** và tests/e2e/**. Ước lượng: một lượt triển khai + kiểm chứng.
